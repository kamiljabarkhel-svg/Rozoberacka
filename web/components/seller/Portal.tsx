"use client";
import ConfirmDelete from "./ConfirmDelete";
import { OPERATOR } from "@/lib/operator";
// Portál predajcu: Nástenka, Moje inzeráty, Pridať/Upraviť, Import CSV, Správy, Profil.
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import type { Session } from "@supabase/supabase-js";
import { getCatalog, IS_DEMO } from "@/lib/data";
import type { Catalog, VehicleType } from "@/lib/types";
import { isUniversal, VEHICLE_TYPES } from "@/lib/types";
import { listingHref } from "@/lib/paths";
import { carName, sellerPath } from "@/lib/seo";
import Stars from "../Stars";
import { isAdminCandidate } from "@/lib/admin";
import { download, listingsCsv } from "@/lib/csvExport";
import { plural, price as fmtPrice } from "@/lib/format";
import {
  changePassword, confirmFresh, setPrices, deleteAccount, deleteListings, exportMyData, duplicate, ensureProfile, getSession, markRead, myListings, myMessages, onAuthChange, sellerReply,
  saveProfile, setStatus, setTop, signOut, skError, type Donor, type Message, type MyListing, type Profile, type Status,
} from "@/lib/seller";
import ListingForm from "./ListingForm";
import Donors from "./Donors";
import Cars from "./Cars";
import Requests from "./Requests";
import CsvImport from "./CsvImport";
import BulkPhotos from "./BulkPhotos";
import FromPhotos from "./FromPhotos";
import { CARS_ENABLED, EMAIL_REPLIES } from "@/lib/features";

type Tab = "home" | "list" | "donor" | "cars" | "form" | "csv" | "photos" | "addph" | "wheels" | "req" | "msg" | "prof";
const TABS: [Tab, string][] = [["home", "Nástenka"], ["list", "Moje inzeráty"], ["donor", "Z auta na diely"], ["form", "Jeden inzerát"], ["wheels", "Pneumatiky, disky, puklice"], ["csv", "Import z CSV"], ["photos", "Hromadne z fotiek"], ["req", "Dopyty na diely"], ["msg", "Správy od kupujúcich"], ["prof", "Profil a nastavenia"]];
const TAB_LABEL = Object.fromEntries(TABS) as Record<Tab, string>;
/** Menu v skupinách s nadpismi, aby predajca hneď videl, kde čo je. */
const NAV_GROUPS: [string, Tab[]][] = [
  ["Prehľad", ["home", "list"]],
  ["Pridať inzeráty", ["form", "wheels", "photos", "csv", "donor"]],
  ["Kupujúci", ["msg", "req"]],
  ["Môj účet", ["prof"]],
];
const ST: Record<Status, string> = { active: "Aktívny", paused: "Pozastavený", sold: "Predaný", blocked: "Skrytý správcom" };

export default function Portal() {
  const router = useRouter();
  const [session, setSession] = useState<Session | null>(null);
  const [ready, setReady] = useState(false);
  const [prof, setProf] = useState<Profile | null>(null);
  const [cat, setCat] = useState<Catalog | null>(null);
  const [items, setItems] = useState<MyListing[]>([]);
  const [msgs, setMsgs] = useState<Message[]>([]);
  const [tab, setTab] = useState<Tab>("home");
  const [edit, setEdit] = useState<MyListing | null>(null);
  const [donor, setDonor] = useState<Donor | null>(null);
  const [sellDonor, setSellDonor] = useState<Donor | null>(null);
  const [listF, setListF] = useState<{ f: F; n: number }>({ f: "all", n: 0 });
  const [toast, setToast] = useState("");
  const [err, setErr] = useState("");
  const [pwMode, setPwMode] = useState(false);
  const [adm, setAdm] = useState(false);
  useEffect(() => { isAdminCandidate().then(setAdm).catch(() => {}); }, []);

  const toastTimer = useRef<number | undefined>(undefined);
  const flash = (t: string) => { setToast(t); window.clearTimeout(toastTimer.current); toastTimer.current = window.setTimeout(() => setToast(""), 3200); };

  const reload = useCallback(async (s: Session) => {
    try {
      const [l, m] = await Promise.all([myListings(s.user.id), myMessages()]);
      setItems(l); setMsgs(m);
    } catch (e) { setErr(skError(e)); }
  }, []);

  useEffect(() => {
    if (IS_DEMO) { setReady(true); return; }
    if (new URLSearchParams(window.location.search).get("heslo") === "1") setPwMode(true);
    getCatalog().then(setCat).catch((e) => setErr(skError(e)));
    getSession().then(async (s) => {
      if (!s) { router.replace("/pre-predajcov"); return; }
      setSession(s);
      try { setProf(await ensureProfile(s)); } catch (e) { setErr(skError(e)); }
      await reload(s); setReady(true);
    });
    return onAuthChange((s) => { if (!s) router.replace("/pre-predajcov"); });
  }, [router, reload]);

  // záložka podľa adresy (#list, #msg…) aj pri tlačidle Späť
  useEffect(() => {
    const read = () => { const h = window.location.hash.replace("#", "") as Tab; if (TABS.some(([t]) => t === h) || h === "addph") setTab(h); };
    read(); window.addEventListener("hashchange", read);
    return () => window.removeEventListener("hashchange", read);
  }, []);
  // čerstvé čísla a správy, keď sa predajca vráti na kartu (najviac raz za 15 s)
  useEffect(() => {
    if (!session) return;
    let last = Date.now();
    const h = () => { if (document.visibilityState === "visible" && Date.now() - last > 15000) { last = Date.now(); reload(session); } };
    document.addEventListener("visibilitychange", h); window.addEventListener("focus", h);
    const t = window.setInterval(() => { if (document.visibilityState === "visible") { last = Date.now(); reload(session); } }, 120000);
    return () => { document.removeEventListener("visibilitychange", h); window.removeEventListener("focus", h); window.clearInterval(t); };
  }, [session, reload]);
  const go = (t: Tab, lf?: F) => { if (t === "list") setListF((o) => ({ f: lf || "all", n: o.n + 1 })); setTab(t); if (t !== "form") { setEdit(null); setDonor(null); } setSellDonor(null); history.replaceState(null, "", "#" + t); window.scrollTo({ top: 0 }); };

  if (IS_DEMO) return <div className="pp-auth"><h1>Portál predajcu</h1><p className="mute">V ukážkovej verzii bez databázy portál nefunguje. Pripojte Supabase.</p></div>;
  if (!ready || !session) return <div className="pp-auth"><p className="mute">Načítavam portál…</p>{err && <p className="pp-err">{err}</p>}</div>;

  const unread = msgs.filter((m) => !m.read).length;
  const act = async (fn: () => Promise<unknown>, done: string) => {
    try { await fn(); await reload(session); flash(done); } catch (e) { flash(skError(e)); }
  };

  return (
    <div className="pp">
      <aside className="pp-nav">
        <div className="pp-who"><b>{prof?.name || "Predajca"}</b><span className="mute">{prof?.email}</span></div>
        <nav aria-label="Portál predajcu">
          {NAV_GROUPS.map(([h, ts]) => (
            <div key={h} className="pp-grp" role="group" aria-label={h}>
              <span className="pp-grp-h">{h}</span>
              {ts.map((t) => (
                <button key={t} type="button" aria-current={tab === t || (t === "photos" && tab === "addph") ? "page" : undefined} onClick={() => go(t)}>
                  {t === "form" && edit ? "Upraviť inzerát" : TAB_LABEL[t]}{t === "msg" && unread > 0 && <span className="pp-badge">{unread}</span>}
                </button>
              ))}
            </div>
          ))}
        </nav>
        {adm && <a className="lnk pp-out" href="/admin">Administrácia portálu</a>}
        <button type="button" className="lnk pp-out" onClick={() => signOut()}>Odhlásiť sa</button>
      </aside>
      <section className="pp-body">
        {err && <div className="pp-box pp-errbox"><p className="pp-err">Niečo sa nenačítalo: {err}</p><button className="ubtn" onClick={() => window.location.reload()}>Skúsiť znova</button></div>}
        {(tab === "form" || tab === "csv" || tab === "cars" || tab === "donor" || tab === "photos" || tab === "wheels") && !cat && !err && <p className="mute">Načítavam katalóg áut…</p>}
        {pwMode && <NewPassword onDone={() => { setPwMode(false); flash("Heslo je zmenené."); }} />}
        {tab === "home" && <Dashboard cat={cat} prof={prof} items={items} msgs={msgs} go={go} />}
        {tab === "list" && <MyList key={listF.n} initial={listF.f} items={items} cat={cat}
          onPrices={(rows) => act(() => setPrices(rows), `Ceny zmenené: ${rows.length}`)}
          onFresh={(ids) => act(() => confirmFresh(ids), ids.length > 1 ? `Potvrdené ako aktuálne: ${ids.length}` : "Potvrdené ako aktuálne")}
          onEdit={(l) => { setEdit(l); setTab("form"); window.scrollTo({ top: 0 }); }}
          onStatus={(ids, s) => act(() => setStatus(ids, s), ids.length > 1 ? `Zmenené: ${ids.length}` : "Uložené")}
          onTop={(l) => act(() => setTop(l.id, !l.top), l.top ? "TOP zrušené" : "Inzerát je TOP na 30 dní")}
          onDup={(l) => act(() => duplicate(session.user.id, l), "Kópia je pozastavená – upravte ju, pridajte fotky a aktivujte")}
          onDelete={(ls) => act(() => deleteListings(ls), ls.length > 1 ? `Zmazané: ${ls.length}` : "Inzerát zmazaný")} />}
        {tab === "req" && cat && <Requests uid={session.user.id} cat={cat} prof={prof} items={items} onSent={flash} />}
        {tab === "donor" && cat && <Donors uid={session.user.id} cat={cat} prof={prof} items={items}
          onAddOne={(d) => { setEdit(null); setDonor(d); setTab("form"); window.scrollTo({ top: 0 }); }}
          onSellCar={CARS_ENABLED ? (d) => { setSellDonor(d); setTab("cars"); history.replaceState(null, "", "#cars"); window.scrollTo({ top: 0 }); } : undefined}
          onDone={async (m) => { flash(m); await reload(session); }} />}
        {CARS_ENABLED && tab === "cars" && cat && <Cars key={sellDonor?.id ?? "cars"} uid={session.user.id} cat={cat} prof={prof} fromDonor={sellDonor} onDone={(m) => { setSellDonor(null); flash(m); }} />}
        {tab === "form" && cat && <ListingForm key={edit?.id ?? "new-" + (donor?.id ?? "")} uid={session.user.id} cat={cat} prof={prof} edit={edit} donor={donor}
          onWheels={() => { setEdit(null); go("wheels"); }}
          onSaved={async (id) => { await reload(session); setEdit(null); go("list"); flash(edit ? "Zmeny uložené" : `Inzerát #${id} je zverejnený`); }} />}
        {tab === "wheels" && cat && <ListingForm key="wheels" wheelOnly uid={session.user.id} cat={cat} prof={prof} edit={null}
          onSaved={async (id) => { await reload(session); go("list"); flash(`Inzerát #${id} je zverejnený`); }} />}
        {tab === "csv" && cat && <CsvImport uid={session.user.id} cat={cat} prof={prof} onDone={async (n) => { await reload(session); flash(`Importované: ${n}`); go("list"); }} />}
        {(tab === "photos" || tab === "addph") && <div>
          <header className="pp-h"><h1>Hromadne z fotiek</h1></header>
          <div className="fp-mode" role="tablist" aria-label="Spôsob">
            <button type="button" role="tab" aria-selected={tab === "photos"} onClick={() => go("photos")}>Nové inzeráty z fotiek</button>
            <button type="button" role="tab" aria-selected={tab === "addph"} onClick={() => go("addph")}>Doplniť fotky k existujúcim inzerátom</button>
          </div>
          {tab === "photos" && cat && <FromPhotos uid={session.user.id} cat={cat} prof={prof} onDone={async (m) => { flash(m); await reload(session); }} />}
          {tab === "addph" && <BulkPhotos uid={session.user.id} items={items} onDone={async (m) => { flash(m); await reload(session); }} />}
        </div>}
        {tab === "msg" && <Messages msgs={msgs} onRead={(ids) => act(() => markRead(ids), "Označené ako prečítané")}
          onReply={async (id, body) => { try { await sellerReply(id, body); await reload(session); flash(EMAIL_REPLIES ? "Odpoveď odoslaná – kupujúcemu príde e-mailom" : "Odpoveď uložená"); return true; } catch (e) { flash(skError(e)); return false; } }} />}
        {tab === "prof" && prof && <><ProfileTab prof={prof} onSave={async (p) => { await saveProfile(p); setProf(p); flash("Profil uložený"); }} onPw={() => setPwMode(true)} /><MyData uid={session.user.id} /></>}
      </section>
      {toast && <div className="pp-toast" role="status">{toast}</div>}
    </div>
  );
}

// ---------- NÁSTENKA ----------
function Dashboard({ cat, prof, items, msgs, go }: { cat: Catalog | null; prof: Profile | null; items: MyListing[]; msgs: Message[]; go: (t: Tab, f?: F) => void }) {
  const a = items.filter((i) => i.status === "active"), s = items.filter((i) => i.status === "sold"), p = items.filter((i) => i.status === "paused");
  const views = items.reduce((x, i) => x + i.views, 0), calls = items.reduce((x, i) => x + i.calls, 0);
  const unread = msgs.filter((m) => !m.read).length;
  const top = [...items].sort((x, y) => y.views - x.views).slice(0, 5).filter((i) => i.views > 0);
  const max = Math.max(1, ...top.map((i) => i.views));
  const todo: [string, number, Tab, F?][] = [
    ["Neprečítané správy", unread, "msg"],
    ["Inzeráty skryté správcom", items.filter((i) => i.status === "blocked").length, "list", "blocked"],
    ["Aktívne inzeráty bez fotky (kupujúci ich obchádzajú)", items.filter((i) => !i.photos.length && i.status === "active").length, "list", "nophoto"],
    [`Neaktualizované viac ako ${STALE_DAYS} dní – potvrďte, že diel stále máte`, items.filter(isStale).length, "list", "stale"],
    ["Pozastavené inzeráty bez fotky – doplňte fotky hromadne", p.filter((i) => !i.photos.length).length, "addph"],
    ["Pozastavené inzeráty", p.length, "list", "paused"],
  ];
  const profMissing = !prof?.city || !prof?.phone;
  const traderMissing = prof?.type === "Firma" && (!prof.ico || !prof.address);
  const byVt = new Map<string, number>();
  a.forEach((i) => { const t = cat?.models.find((x) => x.id === i.modelId)?.vehicleType || i.vtype || "osobne"; byVt.set(t, (byVt.get(t) || 0) + 1); });
  const byCat = new Map<string, number>();
  a.forEach((i) => byCat.set(i.categoryId, (byCat.get(i.categoryId) || 0) + 1));
  const d0 = new Date().toLocaleDateString("sk-SK", { weekday: "long", day: "numeric", month: "long", year: "numeric" });
  const d = d0.charAt(0).toUpperCase() + d0.slice(1);
  return (
    <div className="pp-dash">
      <header className="pp-h"><div><h1>Dobrý deň{prof?.name ? ", " + prof.name : ""}</h1><p className="mute">{d}
          {prof && <> · <a className="lnk" href={sellerPath(prof.id, prof.name)} target="_blank" rel="noopener">Moja verejná stránka</a></>}
          {prof?.ratingCount ? <> · <Stars value={prof.ratingAvg ?? null} count={prof.ratingCount} small /></> : null}</p></div>
        <div className="pp-quick"><button className="btn" onClick={() => go("form")}>+ Pridať inzerát</button><button className="ubtn" onClick={() => go("wheels")}>Pneumatiky a disky</button><button className="ubtn" onClick={() => go("csv")}>Import CSV</button><button className="ubtn" onClick={() => go("photos")}>Hromadne z fotiek</button><button className="ubtn" onClick={() => go("list")}>Všetky inzeráty</button></div></header>
      <div className="pp-tiles">
        <Tile n={a.length} l="Aktívne inzeráty" s={fmtPrice(a.reduce((x, i) => x + i.price, 0)) + " hodnota"} />
        <Tile n={views} l="Zobrazenia" s="spolu za všetky inzeráty" />
        <Tile n={calls} l="Odkryté telefóny" s={views ? `${((calls / views) * 100).toFixed(1).replace(".", ",")} na 100 zobrazení` : "zatiaľ bez zobrazení"} />
        <Tile n={unread} l="Nové správy" s={`${msgs.length} spolu`} />
        <Tile n={s.length} l="Predané" s={fmtPrice(s.reduce((x, i) => x + i.price, 0))} />
        <Tile n={p.length} l="Pozastavené" s="nezobrazujú sa kupujúcim" />
      </div>
      <div className="pp-cols">
        <div className="pp-box"><h2>Najsledovanejšie inzeráty</h2>
          {top.length ? <ul className="pp-bars">{top.map((i) => <li key={i.id}><span className="pp-bl">{i.name}</span><span className="pp-bar"><i style={{ width: (i.views / max) * 100 + "%" }} /></span><b>{i.views}</b></li>)}</ul> : <p className="mute">Zatiaľ žiadne zobrazenia.</p>}
        </div>
        <div className="pp-box"><h2>Treba vybaviť</h2>
          <ul className="pp-todo">
            {todo.filter(([, n]) => n > 0).map(([l, n, t, lf]) => <li key={l}><button className="lnk" onClick={() => go(t, lf)}>{l}</button><b>{n}</b></li>)}
            {profMissing && <li><button className="lnk" onClick={() => go("prof")}>Doplňte mesto a telefón v profile</button><b>!</b></li>}
            {traderMissing && <li><button className="lnk" onClick={() => go("prof")}>Doplňte IČO a sídlo – bez nich nezverejníte inzerát</button><b>!</b></li>}
            {!todo.some(([, n]) => n > 0) && !profMissing && !traderMissing && <li className="mute">Všetko je vybavené.</li>}
          </ul>
        </div>
      </div>
      <div className="pp-box"><h2>Na aké vozidlá predávate</h2>
        {byVt.size ? <div className="pp-cats">{VEHICLE_TYPES.filter((t) => byVt.get(t.id)).map((t) => <span key={t.id} className="tg">{t.name}: <b>{byVt.get(t.id)}</b></span>)}</div> : <p className="mute">Zatiaľ žiadne aktívne diely.</p>}
        <p className="mute pp-hint">Druh vozidla určuje model auta v inzeráte. Kupujúci, ktorý hľadá diely na motorky, uvidí len diely na motorky.</p></div>
      <div className="pp-box"><h2>Aktívne inzeráty podľa kategórie</h2>
        {byCat.size ? <div className="pp-cats">{[...byCat].sort((x, y) => y[1] - x[1]).map(([c, n]) => <span key={c} className="tg">{cat?.categories.find((x) => x.id === c)?.name || c}: <b>{n}</b></span>)}</div> : <p className="mute">Zatiaľ nemáte aktívne inzeráty. <button className="lnk" onClick={() => go("form")}>Pridajte prvý diel</button></p>}
      </div>
    </div>
  );
}
function Tile({ n, l, s }: { n: number; l: string; s: string }) {
  return <div className="pp-tile"><b>{n.toLocaleString("sk-SK")}</b><span>{l}</span><small className="mute">{s}</small></div>;
}

// ---------- MOJE INZERÁTY ----------
type F = "all" | Status | "nophoto" | "nooem" | "nodesc" | "stale";
const STALE_DAYS = 60;
const isStale = (i: MyListing) => i.status === "active" && Date.now() - Date.parse(i.updatedAt) > STALE_DAYS * 86400000;
function MyList({ initial, items, cat, onEdit, onStatus, onTop, onDup, onDelete, onFresh, onPrices }: {
  initial: F; onFresh: (ids: number[]) => void; onPrices: (rows: { id: number; price: number }[]) => void; items: MyListing[]; cat: Catalog | null; onEdit: (l: MyListing) => void; onStatus: (ids: number[], s: Status) => void;
  onTop: (l: MyListing) => void; onDup: (l: MyListing) => void; onDelete: (l: MyListing[]) => void;
}) {
  const [q, setQ] = useState(""), [f, setF] = useState<F>(initial), [sort, setSort] = useState("new");
  const [vt, setVt] = useState<VehicleType | "">("");
  const vtOf = (l: MyListing): VehicleType => cat?.models.find((x) => x.id === l.modelId)?.vehicleType || l.vtype || "osobne";
  const vtCounts = VEHICLE_TYPES.map((t) => [t, items.filter((i) => vtOf(i) === t.id).length] as const).filter(([, n]) => n > 0);
  const [sel, setSel] = useState<Set<number>>(new Set());
  const [confirm, setConfirm] = useState<number[] | null>(null), [bulkDel, setBulkDel] = useState(false);
  const catName = (id: string) => cat?.categories.find((c) => c.id === id)?.name || id;
  const vehicle = (l: MyListing) => {
    if (!l.brandId) return "bez konkrétneho auta";
    const b = cat?.brands.find((x) => x.id === l.brandId)?.name || "", m = cat?.models.find((x) => x.id === l.modelId)?.name || "";
    return `${b} ${m}, ${l.year}`;
  };
  const shown = useMemo(() => {
    const k = q.trim().toLowerCase();
    const r = items.filter((i) => {
      if (k && !(i.name + " " + i.oem + " " + i.description).toLowerCase().includes(k)) return false;
      if (vt && vtOf(i) !== vt) return false;
      if (f === "nophoto") return !i.photos.length;
      if (f === "nooem") return !isUniversal(i.categoryId) && i.oem.replace(/[^A-Za-z0-9]/g, "").length < 4;
      if (f === "nodesc") return i.description.length < 20;
      if (f === "stale") return isStale(i);
      return f === "all" || i.status === f;
    });
    const by: Record<string, (a: MyListing, b: MyListing) => number> = {
      new: (a, b) => b.createdAt.localeCompare(a.createdAt), views: (a, b) => b.views - a.views,
      calls: (a, b) => b.calls - a.calls, pup: (a, b) => a.price - b.price, pdown: (a, b) => b.price - a.price,
    };
    return r.sort(by[sort]);
  }, [items, q, f, sort, vt]); // eslint-disable-line react-hooks/exhaustive-deps
  const ids = [...sel].filter((i) => shown.some((s) => s.id === i));
  const toggle = (id: number) => setSel((s) => { const n = new Set(s); if (n.has(id)) n.delete(id); else n.add(id); return n; });
  const count = (x: F) => x === "all" ? items.length : x === "nophoto" ? items.filter((i) => !i.photos.length).length : x === "nooem" ? 0 : x === "nodesc" ? items.filter((i) => i.description.length < 20).length : x === "stale" ? items.filter(isStale).length : items.filter((i) => i.status === x).length;
  const FL: [F, string][] = [["all", "Všetky"], ["active", "Aktívne"], ["paused", "Pozastavené"], ["sold", "Predané"], ["nophoto", "Bez fotky"], ["stale", `Staršie ako ${STALE_DAYS} dní`],
    ...(items.some((i) => i.status === "blocked") ? [["blocked", "Skryté správcom"] as [F, string]] : [])];
  return (
    <div>
      <header className="pp-h"><h1>Moje inzeráty</h1><span className="pp-quick"><span className="mute">{items.length} spolu</span>
        <button className="ubtn" disabled={!items.length} title="Stiahne inzeráty (aktuálny výber filtra) v rovnakom formáte, aký prijíma import" onClick={() => download(`rozoberacka-inzeraty-${new Date().toISOString().slice(0, 10)}.csv`, listingsCsv(shown, cat))}>Export CSV</button></span></header>
      <div className="pp-tools">
        <input type="search" placeholder="Hľadať v mojich inzerátoch (názov, OEM)" value={q} onChange={(e) => setQ(e.target.value)} aria-label="Hľadať" />
        <select value={sort} onChange={(e) => setSort(e.target.value)} aria-label="Zoradiť">
          <option value="new">Najnovšie</option><option value="views">Najviac zobrazení</option><option value="calls">Najviac telefónov</option><option value="pup">Cena od najnižšej</option><option value="pdown">Cena od najvyššej</option>
        </select>
      </div>
      {vtCounts.length > 1 && <div className="pp-vt pp-vtf" role="radiogroup" aria-label="Druh vozidla"><span className="lt">Diely na</span>
        {vtCounts.map(([t, n]) => <button key={t.id} type="button" role="radio" aria-checked={vt === t.id} className={vt === t.id ? "on" : ""} onClick={() => setVt(t.id)}>{t.short} <span>{n}</span></button>)}
        <button type="button" role="radio" aria-checked={!vt} className={!vt ? "on" : ""} onClick={() => setVt("")}>Všetky <span>{items.length}</span></button></div>}
      <div className="pp-chips">{FL.map(([x, l]) => <button key={x} type="button" className="chip" aria-pressed={f === x} onClick={() => setF(x)}>{l} <span className="mute">{count(x)}</span></button>)}</div>
      {ids.length > 0 && (
        <div className="pp-bulk"><b>Vybrané: {ids.length}</b>
          <button className="ubtn" onClick={() => { onStatus(ids, "active"); setSel(new Set()); }}>Aktivovať</button>
          <button className="ubtn" onClick={() => { onStatus(ids, "paused"); setSel(new Set()); }}>Pozastaviť</button>
          <button className="ubtn" onClick={() => { onStatus(ids, "sold"); setSel(new Set()); }}>Predané</button>
          <button className="ubtn" title="Potvrdí, že diely stále máte (obnoví dátum aktualizácie)" onClick={() => { onFresh(ids); setSel(new Set()); }}>Stále aktuálne</button>
          <PriceBulk n={ids.length} onApply={(fn) => { onPrices(items.filter((i) => ids.includes(i.id)).map((i) => ({ id: i.id, price: fn(i.price) }))); setSel(new Set()); }} />
          {bulkDel ? <ConfirmDelete title={ids.length === 1 ? "Zmazať 1 vybraný inzerát?" : `Zmazať ${ids.length} vybrané ${ids.length < 5 ? "inzeráty" : "inzerátov"}?`} note="Zmažú sa aj s fotkami a nedajú sa obnoviť. Ak ich chcete len dočasne skryť, zvoľte Pozastaviť." onConfirm={() => { onDelete(items.filter((i) => ids.includes(i.id))); setBulkDel(false); setSel(new Set()); }} onCancel={() => setBulkDel(false)} />
            : <button className="del" onClick={() => { setConfirm(null); setBulkDel(true); }}>Zmazať</button>}
          <button className="lnk" onClick={() => { setSel(new Set()); setBulkDel(false); }}>Zrušiť výber</button>
        </div>
      )}
      {!shown.length ? <div className="empty">Nič sa nenašlo.</div> : (
        <ul className="pp-rows">
          <li className="pp-rowh"><label className="pp-cb"><input type="checkbox" aria-label="Vybrať všetky" checked={ids.length === shown.length} onChange={(e) => setSel(e.target.checked ? new Set(shown.map((s) => s.id)) : new Set())} /></label><span>Inzerát</span></li>
          {shown.map((l) => (
            <li key={l.id} className={"pp-row st-" + l.status}>
              <label className="pp-cb"><input type="checkbox" checked={sel.has(l.id)} onChange={() => toggle(l.id)} aria-label={"Vybrať " + l.name} /></label>
              <div className="pp-th">{l.photos[0] ? <img src={l.photos[0].url} alt="" loading="lazy" /> : <span>bez fotky</span>}</div>
              <div className="pp-ri">
                {l.status === "active" ? <a href={listingHref(l.id, l.name, carName(l, cat))} target="_blank" rel="noreferrer" title="Otvoriť, ako ho vidia kupujúci"><b>{l.name}</b></a> : <b>{l.name}</b>}
                <span className="mute"><span className="tg">{VEHICLE_TYPES.find((t) => t.id === vtOf(l))?.short}</span> <span className="pp-id" title="Číslo inzerátu – použite ho v názve fotky, napr. ID{l.id}_1.jpg">ID{l.id}</span> · {vehicle(l)} · {catName(l.categoryId)}{l.oem || !isUniversal(l.categoryId) ? <> · číslo dielu {l.oem || "—"}</> : null}</span>
                <span className="pp-meta"><span className={"pp-st " + l.status}>{ST[l.status]}</span>{l.top && <span className="toptag">TOP</span>}<b>{fmtPrice(l.price)}</b><span className="mute">{plural(l.views, "zobrazenie", "zobrazenia", "zobrazení")} · {plural(l.calls, "telefón", "telefóny", "telefónov")}</span>{isStale(l) && <span className="pp-stale">neaktualizované {Math.floor((Date.now() - Date.parse(l.updatedAt)) / 86400000)} dní · <button className="lnk" onClick={() => onFresh([l.id])}>Stále aktuálne</button></span>}</span>
              </div>
              <div className="pp-ra">
                {l.status === "blocked" ? <span className="mute pp-blk">Inzerát skryl správca portálu – rozhodol človek, nie automat – pre rozpor so zákonom alebo s obchodnými podmienkami{l.moderationNote ? ". Dôvod: " + l.moderationNote : ""}. Ak nesúhlasíte, upravte inzerát alebo nám napíšte na {OPERATOR.email} – váš podnet bezplatne znova posúdi človek. Môžete sa obrátiť aj na súd alebo podať sťažnosť koordinátorovi digitálnych služieb (Rada pre mediálne služby); viac v <a href="/obchodne-podmienky" target="_blank">obchodných podmienkach, časť 4</a>.</span> : null}
                <button className="ubtn" onClick={() => onEdit(l)}>Upraviť</button>
                {l.status !== "blocked" && <>
                {l.status === "active" ? <button className="ubtn" onClick={() => onStatus([l.id], "paused")}>Pozastaviť</button> : <button className="ubtn" onClick={() => onStatus([l.id], "active")}>Aktivovať</button>}
                {l.status !== "sold" && <button className="ubtn" onClick={() => onStatus([l.id], "sold")}>Predané</button>}
                <button className="ubtn" onClick={() => onTop(l)}>{l.top ? "Zrušiť TOP" : "TOP"}</button>
                </>}
                <button className="ubtn" onClick={() => onDup(l)}>Duplikovať</button>
                {confirm?.length === 1 && confirm[0] === l.id
                  ? <ConfirmDelete title={`Zmazať inzerát „${l.name}“?`} note="Zmaže sa aj s fotkami a nedá sa obnoviť. Ak ho chcete len dočasne skryť, zvoľte Pozastaviť." onConfirm={() => { onDelete([l]); setConfirm(null); }} onCancel={() => setConfirm(null)} />
                  : <button className="del" onClick={() => { setBulkDel(false); setConfirm([l.id]); }}>Zmazať</button>}
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

// ---------- SPRÁVY ----------
function Messages({ msgs, onRead, onReply }: { msgs: Message[]; onRead: (ids: number[]) => void; onReply: (id: number, body: string) => Promise<boolean> }) {
  const unread = msgs.filter((m) => !m.read).map((m) => m.id);
  return (
    <div>
      <header className="pp-h"><h1>Správy od kupujúcich</h1>{unread.length > 0 && <button className="ubtn" onClick={() => onRead(unread)}>Označiť všetky ako prečítané</button>}</header>
      <p className="mute pp-note">{EMAIL_REPLIES ? "Vaša odpoveď príde kupujúcemu e-mailom. Keď odpíše, jeho správu uvidíte tu." : "E-maily z portálu ešte nie sú zapnuté – odpoveď pošlite kupujúcemu tlačidlom „Poslať e-mailom“."} Ak zadal telefón, zavolajte mu.</p>
      {!msgs.length ? <div className="empty">Zatiaľ žiadne správy. Kupujúci vám môžu napísať z detailu inzerátu.</div> : (
        <ul className="pp-msgs">{msgs.map((m) => <Thread key={m.id} m={m} onRead={onRead} onReply={onReply} />)}</ul>
      )}
    </div>
  );
}
const when = (d: string) => new Date(d).toLocaleString("sk-SK", { dateStyle: "short", timeStyle: "short" });
function Thread({ m, onRead, onReply }: { m: Message; onRead: (ids: number[]) => void; onReply: (id: number, body: string) => Promise<boolean> }) {
  const [text, setText] = useState(""), [busy, setBusy] = useState(false), [open, setOpen] = useState(!m.read && !!m.buyerEmail), [last, setLast] = useState("");
  const send = async () => {
    if (text.trim().length < 2) return;
    setBusy(true); const ok = await onReply(m.id, text.trim()); setBusy(false);
    if (ok) { setLast(text.trim()); setText(""); }
  };
  const mailto = (body: string) => "mailto:" + encodeURIComponent(m.buyerEmail || "") + "?subject=" + encodeURIComponent("Re: " + m.listingName) + "&body=" + encodeURIComponent(body + "\n\n---\n" + m.name + " napísal(a):\n" + m.body);
  return (
    <li className={m.read ? "" : "unread"}>
      <div className="pp-mh"><b>{m.name}</b><span className="mute">{when(m.createdAt)}</span></div>
      <div className="mute">K inzerátu: <a href={m.carId ? "/vozidlo/" + m.carId : listingHref(m.listingId)} target="_blank" rel="noreferrer">{m.listingName}</a></div>
      <p>{m.body}</p>
      {m.replies.length > 0 && <ol className="pp-thread">{m.replies.map((r, i) => (
        <li key={i} className={r.author === "seller" ? "me" : "them"}>
          <span className="mute">{r.author === "seller" ? "Vy" : m.name} · {when(r.createdAt)}{r.author === "seller" && EMAIL_REPLIES ? (r.emailed ? " · odoslané e-mailom" : r.emailError ? " · e-mail sa nepodarilo odoslať" : " · odosiela sa…") : ""}</span>
          <p>{r.body}</p></li>))}</ol>}
      <div className="pp-mf"><span>Kontakt: <b>{m.buyerEmail ? <a href={"mailto:" + m.buyerEmail}>{m.contact}</a> : <a href={"tel:" + m.contact.replace(/\s/g, "")}>{m.contact}</a>}</b></span>
        {m.buyerEmail && !open && <button className="ubtn" onClick={() => setOpen(true)}>Odpovedať</button>}
        {!m.read && <button className="lnk" onClick={() => onRead([m.id])}>Označiť ako prečítané</button>}</div>
      {m.buyerEmail && open && <div className="pp-reply">
        <label><span>Vaša odpoveď pre {m.name}</span><textarea rows={3} maxLength={2000} value={text} onChange={(e) => setText(e.target.value)} placeholder="Dobrý deň, diel je k dispozícii…" /></label>
        <div className="pp-actions"><button className={EMAIL_REPLIES ? "btn" : "ubtn"} disabled={busy || text.trim().length < 2} onClick={send}>{busy ? "Odosielam…" : EMAIL_REPLIES ? "Odoslať odpoveď" : "Uložiť do konverzácie"}</button>
          {!EMAIL_REPLIES && <a className="btn" href={mailto(text.trim() || last)}>Poslať e-mailom</a>}</div>
      </div>}
      {!m.buyerEmail && <small className="mute">Kupujúci nezadal e-mail – odpovedzte mu telefonicky alebo SMS.</small>}
    </li>
  );
}

// ---------- PROFIL ----------
function ProfileTab({ prof, onSave, onPw }: { prof: Profile; onSave: (p: Profile) => Promise<void>; onPw: () => void }) {
  const [p, setP] = useState(prof), [busy, setBusy] = useState(false), [err, setErr] = useState(""), [decl, setDecl] = useState(false);
  const firm = p.type === "Firma";
  const set = (k: keyof Profile) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => setP({ ...p, [k]: e.target.value });
  async function save(e: React.FormEvent) {
    e.preventDefault(); setErr("");
    if (p.name.trim().length < 2) return setErr("Zadajte názov alebo meno.");
    if (p.phone && p.phone.replace(/\D/g, "").length < 9) return setErr("Telefón musí mať aspoň 9 číslic.");
    if (firm && !/^[0-9]{8}$/.test(p.ico.replace(/\s/g, ""))) return setErr("Ako podnikateľ zadajte IČO (8 číslic).");
    if (firm && p.address.trim().length < 5) return setErr("Ako podnikateľ zadajte sídlo alebo miesto podnikania.");
    if (p.type !== prof.type && !decl) return setErr("Potvrďte vyhlásenie o zmene spôsobu predaja.");
    setBusy(true); try { await onSave(p); setDecl(false); } catch (x) { setErr(skError(x)); } finally { setBusy(false); }
  }
  return (
    <div>
      <header className="pp-h"><h1>Profil predajcu</h1>{prof.verified ? <span className="tg">✓ Overený predajca</span> : <span className="mute">Neoverený</span>}</header>
      <form className="pp-form pp-grid" onSubmit={save}>
        <fieldset className="pp-type full">
          <legend>Ako predávate (vyhlásenie pre kupujúcich)</legend>
          <label className={"pp-typeo" + (firm ? " on" : "")}><input type="radio" name="ptyp" checked={firm} onChange={() => setP({ ...p, type: "Firma" })} />
            <span><b>Ako podnikateľ</b><small>Kupujúci uvidia obchodné meno, IČO a sídlo. Spotrebiteľom zodpovedáte za vady (nový diel 24 mesiacov, použitý najmenej 12) a pri predaji na diaľku môžu odstúpiť do 14 dní.</small></span></label>
          <label className={"pp-typeo" + (!firm ? " on" : "")}><input type="radio" name="ptyp" checked={!firm} onChange={() => setP({ ...p, type: "Súkromná osoba" })} />
            <span><b>Ako súkromná osoba</b><small>Príležitostný predaj, nie v rámci podnikania. Kupujúci uvidí poučenie, že sa nepoužijú predpisy na ochranu spotrebiteľa. Zodpovedáte za vady, na ktoré kupujúceho neupozorníte.</small></span></label>
        </fieldset>
        <label>{firm ? "Obchodné meno" : "Meno (zobrazí sa kupujúcim)"}<input value={p.name} onChange={set("name")} maxLength={120} /></label>
        <label>Mesto<input value={p.city} onChange={set("city")} maxLength={60} /></label>
        {firm && <label>IČO<input value={p.ico} onChange={set("ico")} inputMode="numeric" maxLength={11} placeholder="12345678" /></label>}
        {firm && <label>Sídlo / miesto podnikania<input value={p.address} onChange={set("address")} maxLength={200} placeholder="Ulica 1, 900 01 Mesto" /></label>}
        <label>Telefón (predvyplní sa do inzerátov)<input value={p.phone} onChange={set("phone")} inputMode="tel" /></label>
        <label>E-mail<input value={p.email} disabled /></label>
        {p.type !== prof.type && <label className="pp-chk full"><input type="checkbox" checked={decl} onChange={(e) => setDecl(e.target.checked)} /><span>{firm
          ? "Vyhlasujem, že diely predávam ako podnikateľ (obchodník) a uvedené údaje sú pravdivé."
          : "Vyhlasujem, že diely nepredávam v rámci podnikania. Ak by som predával pravidelne za účelom zisku, zaregistrujem sa ako podnikateľ."}</span></label>}
        {err && <p className="pp-err full">{err}</p>}
        <div className="full pp-actions"><button className="btn" disabled={busy}>{busy ? "Ukladám…" : "Uložiť profil"}</button><button type="button" className="lnk" onClick={onPw}>Zmeniť heslo</button></div>
      </form>
      <p className="mute pp-note">{firm
        ? "Obchodné meno, IČO, sídlo a mesto sú verejné – zákon vyžaduje, aby kupujúci vedel, s kým uzatvára zmluvu. Telefón z profilu sa nezobrazuje; kupujúci vidí len telefón zadaný v inzeráte po kliknutí na „Zobraziť telefón“."
        : "Meno a mesto vidia kupujúci pri vašich inzerátoch. Telefón z profilu sa nezobrazuje; kupujúci vidí len telefón zadaný v inzeráte po kliknutí na „Zobraziť telefón“."}</p>
    </div>
  );
}

function NewPassword({ onDone }: { onDone: () => void }) {
  const [pw, setPw] = useState(""), [err, setErr] = useState("");
  return (
    <form className="pp-box pp-form" onSubmit={async (e) => { e.preventDefault(); if (pw.length < 8) return setErr("Heslo musí mať aspoň 8 znakov."); try { await changePassword(pw); onDone(); } catch (x) { setErr(skError(x)); } }}>
      <h2>Nastavte nové heslo</h2>
      <label>Nové heslo<input type="password" value={pw} onChange={(e) => setPw(e.target.value)} autoComplete="new-password" /></label>
      {err && <p className="pp-err">{err}</p>}
      <button className="btn">Uložiť heslo</button>
    </form>
  );
}

// ---------- MOJE ÚDAJE (GDPR) ----------
function MyData({ uid }: { uid: string }) {
  const [step, setStep] = useState(0), [word, setWord] = useState(""), [busy, setBusy] = useState(""), [err, setErr] = useState("");
  return (
    <div className="pp-box pp-gdpr">
      <h2>Moje údaje</h2>
      <p className="mute">Stiahnite si všetko, čo o vás evidujeme (profil, súkromné údaje, inzeráty, telefóny, správy), ako súbor JSON. <a href="/ochrana-osobnych-udajov" target="_blank">Ochrana osobných údajov</a></p>
      <button className="ubtn" disabled={!!busy} onClick={async () => { setErr(""); setBusy("exp"); try { await exportMyData(); } catch (e) { setErr(skError(e)); } finally { setBusy(""); } }}>{busy === "exp" ? "Pripravujem…" : "Stiahnuť moje údaje"}</button>
      <h2>Zrušiť účet</h2>
      <p className="mute">Natrvalo zmaže účet, profil, všetky inzeráty, fotky a správy. Nedá sa vrátiť späť.</p>
      {step === 0 && <button className="del" onClick={() => setStep(1)}>Zrušiť účet</button>}
      {step === 1 && <div className="pp-form">
        <label>Pre potvrdenie napíšte ZRUŠIŤ<input value={word} onChange={(e) => setWord(e.target.value)} autoComplete="off" /></label>
        <div className="pp-actions" style={{ justifyContent: "flex-start" }}>
          <button className="del" disabled={word.trim().toUpperCase() !== "ZRUŠIŤ" || !!busy} onClick={async () => {
            setErr(""); setBusy("del");
            try { await deleteAccount(uid); window.location.href = "/?ucet=zruseny"; } catch (e) { setErr(skError(e)); setBusy(""); }
          }}>{busy === "del" ? "Mažem…" : "Natrvalo zrušiť účet"}</button>
          <button className="lnk" onClick={() => { setStep(0); setWord(""); }}>Nie, ponechať</button>
        </div></div>}
      {err && <p className="pp-err">{err}</p>}
    </div>
  );
}

// Hromadná zmena ceny: o percento (zľava/zdraženie) alebo na pevnú sumu.
function PriceBulk({ n, onApply }: { n: number; onApply: (fn: (p: number) => number) => void }) {
  const [open, setOpen] = useState(false), [mode, setMode] = useState("pct"), [val, setVal] = useState(""), [err, setErr] = useState("");
  if (!open) return <button className="ubtn" onClick={() => setOpen(true)}>Zmeniť cenu</button>;
  const apply = () => {
    const x = Number(val.replace(",", "."));
    if (!Number.isFinite(x) || (mode === "set" && x <= 0) || (mode === "pct" && (x <= -95 || x >= 500 || x === 0))) return setErr(mode === "pct" ? "Zadajte percento, napr. -10 (zľava) alebo 5 (zdraženie)." : "Zadajte cenu väčšiu ako 0.");
    onApply(mode === "pct" ? (p) => Math.max(1, Math.round(p * (1 + x / 100))) : () => Math.round(x * 100) / 100);
    setOpen(false); setVal(""); setErr("");
  };
  return (
    <span className="pp-price">
      <select value={mode} onChange={(e) => setMode(e.target.value)} aria-label="Spôsob zmeny"><option value="pct">o percento</option><option value="set">na sumu €</option></select>
      <input value={val} onChange={(e) => setVal(e.target.value)} inputMode="decimal" placeholder={mode === "pct" ? "-10" : "50"} aria-label="Hodnota" />
      <button className="ubtn" onClick={apply}>Použiť na {n}</button><button className="lnk" onClick={() => setOpen(false)}>Zrušiť</button>
      {err && <span className="pp-ferr">{err}</span>}
    </span>
  );
}
