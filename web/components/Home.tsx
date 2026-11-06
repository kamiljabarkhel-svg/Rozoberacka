"use client";
// Úvodná stránka: hrdina, panel hľadania podľa auta, VIN, výsledky s facetami a kartami.
// Správanie podľa prototyp.html. Filtre sa ukladajú do adresy (?znacka=…), dá sa ich poslať ďalej.
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import type { Catalog, Filters } from "@/lib/types";
import { emptyFilters } from "@/lib/types";
import { getCatalog, getCities, getStats, initialData, searchListings, type SearchPage } from "@/lib/data";
import { decodeVin } from "@/lib/vin";
import { pieces, sk } from "@/lib/format";
import { useFavs } from "@/lib/favs";
import { filterKey, hasCriteria, MAX_SAVED, useSaved } from "@/lib/saved";
import SavedSearches from "./SavedSearches";
import MyCarBar from "./MyCarBar";
import ScanText from "./ScanText";
import AlertForm, { EMAIL_ALERTS } from "./AlertForm";
import { readMyCar, useMyCar } from "@/lib/mycar";
import { STATIC_PREVIEW, sellersHref } from "@/lib/paths";
import { Icon, catIcon } from "./Icons";
import ListingCard from "./ListingCard";
import ListingDetail from "./ListingDetail";
import SellersSoon from "./SellersSoon";

const PAGE = 12;
const POP = ["Predné svetlo", "Zadné svetlo", "Nárazník", "Kapota", "Zrkadlo", "Dvere", "Riadiaca jednotka", "Alternátor", "Turbo", "Motor", "Prevodovka", "Volant"];

// Krátke názvy parametrov v adrese
const P = { q: "q", brand: "znacka", model: "model", engine: "motor", year: "rok", cat: "kat", sub: "pod", max: "cena", cond: "stav", city: "mesto", sort: "zoradit", fav: "oblubene", side: "strana", tested: "odskusane", ret: "vratenie" } as const;

function readUrl(): Filters {
  const f = { ...emptyFilters };
  let s: URLSearchParams;
  try { s = new URLSearchParams(window.location.search); } catch { return f; }
  const num = (k: string) => { const v = s.get(k); const n = v ? Number(v) : NaN; return Number.isFinite(n) ? n : null; };
  f.q = s.get(P.q) || "";
  f.brand = num(P.brand); f.model = num(P.model); f.engine = num(P.engine); f.year = num(P.year);
  f.cat = s.get(P.cat) || ""; f.sub = num(P.sub); f.max = num(P.max);
  f.cond = s.get(P.cond) || ""; f.city = s.get(P.city) || "";
  const so = s.get(P.sort); f.sort = so === "asc" || so === "desc" ? so : "new";
  f.fav = s.get(P.fav) === "1";
  const sd = s.get(P.side); f.side = sd === "Ľavá" || sd === "Pravá" ? sd : "";
  f.tested = s.get(P.tested) === "1"; f.ret = s.get(P.ret) === "1";
  return f;
}

function writeUrl(f: Filters) {
  if (STATIC_PREVIEW) return; // v statickom náhľade adresu nemeníme (súbor otvorený z disku)
  const s = new URLSearchParams();
  const put = (k: string, v: string | number | null | boolean) => { if (v !== null && v !== "" && v !== false) s.set(k, v === true ? "1" : String(v)); };
  put(P.q, f.q.trim()); put(P.brand, f.brand); put(P.model, f.model); put(P.engine, f.engine); put(P.year, f.year);
  put(P.cat, f.cat); put(P.sub, f.sub); put(P.max, f.max); put(P.cond, f.cond); put(P.city, f.city);
  if (f.sort !== "new") put(P.sort, f.sort);
  put(P.fav, f.fav); put(P.side, f.side); put(P.tested, f.tested); put(P.ret, f.ret);
  const qs = s.toString();
  const url = window.location.pathname + (qs ? "?" + qs : "") + window.location.hash;
  window.history.replaceState(window.history.state, "", url);
}

export type HomeSsr = { catalog: Catalog; res: SearchPage; stats: { parts: number; sellers: number }; cities: string[] };

export default function Home({ ssr }: { ssr?: HomeSsr | null }) {
  const init = useMemo(() => (ssr ? { catalog: ssr.catalog } : initialData()), [ssr]);
  const [catalog, setCatalog] = useState<Catalog | null>(init?.catalog || null);
  const [res, setRes] = useState<SearchPage | null>(ssr?.res || null);
  const [busy, setBusy] = useState(false);
  const [cities, setCities] = useState<string[]>(ssr?.cities || []);
  const [loadErr, setLoadErr] = useState("");
  const [f, setF] = useState<Filters>(emptyFilters);
  const [adv, setAdv] = useState(false);
  const [vin, setVin] = useState("");
  const [vinCat, setVinCat] = useState("");
  const [vinMsg, setVinMsg] = useState("");
  const [hash, setHash] = useState("");
  const [stats, setStats] = useState<{ parts: number; sellers: number } | null>(ssr?.stats || null);
  const [oemQ, setOemQ] = useState("");
  const { favs, toggle } = useFavs();
  const saved = useSaved();
  const my = useMyCar();
  const isSaved = saved.list.some((x) => filterKey(x.f) === filterKey(f));
  const ready = useRef(false);
  const resRef = useRef<HTMLDivElement>(null);
  const panelRef = useRef<HTMLElement>(null);

  // Katalóg áut, mestá a počítadlo (v demo režime je katalóg už pripravený)
  useEffect(() => {
    let off = false;
    if (!init) getCatalog().then((c) => { if (!off) setCatalog(c); }).catch((e) => { if (!off) setLoadErr(String(e?.message || e)); });
    getCities().then((c) => { if (!off) setCities(c); }).catch(() => {});
    getStats().then((x) => { if (!off) setStats(x); }).catch(() => {});
    return () => { off = true; };
  }, [init]);

  // Filtre z adresy pri otvorení
  useEffect(() => {
    let u = readUrl();
    // Moje auto: bez filtrov v adrese ukážeme rovno diely pre uložené auto (ročník nefiltrujeme – diel často sedí na viac rokov)
    const mc = readMyCar();
    if (mc && !hasCriteria(u) && !u.fav && !window.location.search) u = { ...u, brand: mc.brand, model: mc.model, engine: mc.engine };
    setF(u);
    if (u.sub != null || u.year != null || u.max != null || u.cond || u.city || u.sort !== "new" || u.side || u.tested || u.ret) setAdv(true);
    ready.current = true;
    if (window.location.hash === "#vysledky") setTimeout(() => resRef.current?.scrollIntoView({ block: "start" }), 50);
  }, []);
  useEffect(() => { if (ready.current) writeUrl(f); }, [f]);

  // Hľadanie z hlavičky
  const toRes = useCallback(() => resRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }), []);
  useEffect(() => {
    const h = (e: Event) => {
      const d = (e as CustomEvent<{ q: string; scroll: boolean }>).detail;
      setF((x) => ({ ...x, q: d.q, fav: false }));
      if (d.scroll) setTimeout(toRes, 30);
    };
    window.addEventListener("rz-q", h);
    // výber z našepkávania v hlavičke (auto alebo kategória)
    const hf = (e: Event) => {
      const p = (e as CustomEvent<Partial<Filters>>).detail;
      setF((x) => ({ ...x, q: "", fav: false, ...("brand" in p ? { engine: null, year: null } : {}), ...p }));
      setTimeout(toRes, 30);
    };
    window.addEventListener("rz-f", hf);
    return () => { window.removeEventListener("rz-q", h); window.removeEventListener("rz-f", hf); };
  }, [toRes]);

  // Statický náhľad: detail a „pre predajcov“ cez # v adrese
  useEffect(() => {
    if (!STATIC_PREVIEW) return;
    const h = () => setHash(window.location.hash);
    h();
    window.addEventListener("hashchange", h);
    return () => window.removeEventListener("hashchange", h);
  }, []);

  const set = (patch: Partial<Filters>) => { setF((x) => ({ ...x, ...patch })); };

  // Hľadanie v databáze: pri písaní s krátkym oneskorením, staršie odpovede sa zahodia
  const seq = useRef(0);
  const favKey = f.fav ? favs.join(",") : "";
  useEffect(() => {
    if (!ready.current) return;
    const my = ++seq.current;
    setBusy(true);
    const t = window.setTimeout(() => {
      searchListings(f, favs, 0, PAGE)
        .then((r) => { if (my === seq.current) { setRes(r); setLoadErr(""); } })
        .catch((e) => { if (my === seq.current) setLoadErr(String(e?.message || e)); })
        .finally(() => { if (my === seq.current) setBusy(false); });
    }, f.q ? 250 : 0);
    return () => window.clearTimeout(t);
  }, [f, favKey]); // eslint-disable-line react-hooks/exhaustive-deps
  const more = () => {
    if (!res) return;
    const my = ++seq.current;
    setBusy(true);
    searchListings(f, favs, res.items.length, PAGE)
      .then((r) => { if (my === seq.current) setRes({ ...r, items: res.items.concat(r.items.filter((x) => !res.items.some((y) => y.id === x.id))) }); })
      .catch((e) => { if (my === seq.current) setLoadErr(String(e?.message || e)); })
      .finally(() => { if (my === seq.current) setBusy(false); });
  };

  const brands = useMemo(() => (catalog ? [...catalog.brands].sort((a, b) => sk(a.name, b.name)) : []), [catalog]);
  // Rýchle značky v poradí ako v prototype (najčastejšie na SK), potom ostatné obľúbené
  const quick = useMemo(() => {
    const order = ["Škoda", "Volkswagen", "BMW", "Audi", "Hyundai", "Kia"];
    const rank = (n: string) => { const i = order.indexOf(n); return i < 0 ? 99 : i; };
    return brands.filter((b) => b.popular).sort((a, b) => rank(a.name) - rank(b.name) || sk(a.name, b.name));
  }, [brands]);
  const models = useMemo(() => (catalog && f.brand != null ? catalog.models.filter((m) => m.brandId === f.brand) : []), [catalog, f.brand]);
  const model = models.find((m) => m.id === f.model) || null;
  const engines = useMemo(() => (catalog && model ? catalog.engines.filter((e) => e.modelId === model.id) : []), [catalog, model]);
  const cats = useMemo(() => (catalog ? [...catalog.categories].sort((a, b) => a.sort - b.sort) : []), [catalog]);
  const subs = useMemo(() => (catalog && f.cat ? catalog.subcategories.filter((s) => s.categoryId === f.cat).sort((a, b) => a.sort - b.sort) : []), [catalog, f.cat]);
  const years = useMemo(() => {
    const to = model?.yearTo || new Date().getFullYear(), from = model?.yearFrom || 1995, r: number[] = [];
    for (let y = to; y >= from; y--) r.push(y);
    return r;
  }, [model]);

  const reset = () => { setF({ ...emptyFilters }); window.dispatchEvent(new CustomEvent("rz-q-set", { detail: "" })); };

  const onVin = () => {
    const r = decodeVin(vin);
    if (!r.ok) { setVinMsg(r.msg); return; }
    if (!r.brand) { setVinMsg("VIN je platný, ale výrobcu v ukážke nepoznáme. Vyberte auto ručne v paneli vyššie."); return; }
    const b = catalog?.brands.find((x) => x.name === r.brand);
    if (!b) { setVinMsg(`Rozpoznané: ${r.brand}${r.year ? ", ročník približne " + r.year : ""}. Táto značka zatiaľ nie je v katalógu.`); return; }
    set({ brand: b.id, model: null, engine: null, year: r.year, cat: vinCat, sub: null });
    if (r.year) setAdv(true);
    setVinMsg(`Rozpoznané: ${b.name}${r.year ? ", ročník približne " + r.year : ""}. Model a motorizáciu z VIN určiť nevieme, vyberte ich v paneli vyššie.`);
    setTimeout(toRes, 30);
  };

  const opt = (v: string | number, label: string) => <option key={v} value={v}>{label}</option>;
  const numOrNull = (v: string) => (v === "" ? null : Number(v));

  const detailId = STATIC_PREVIEW && hash.startsWith("#inzerat-") ? Number(hash.slice(9)) : null;
  const closeHash = () => { history.replaceState(null, "", window.location.pathname + window.location.search); setHash(""); };

  return (
    <main id="pub" tabIndex={-1}>
      <section className="hero"><div className="in"><span id="main" />
        <h1>Použité autodiely presne na vaše auto</h1>
        <p className="sub">Vyberte značku, model a motorizáciu a uvidíte len diely, ktoré naň pasujú. Predajcov kontaktujete bez registrácie.</p>
        {stats && stats.parts > 0 && <p className="stats"><b>{stats.parts.toLocaleString("sk-SK")}</b> {stats.parts === 1 ? "diel" : stats.parts >= 2 && stats.parts <= 4 ? "diely" : "dielov"} od <b>{stats.sellers}</b> {stats.sellers === 1 ? "predajcu" : "predajcov"} na jednom mieste</p>}
        <div className="qb" aria-label="Najčastejšie značky">
          {quick.map((b) => (
            <button key={b.id} className="chip" onClick={() => { set({ brand: b.id, model: null, engine: null, year: null }); panelRef.current?.scrollIntoView({ behavior: "smooth", block: "center" }); }}>{b.name}</button>
          ))}
        </div>
        <p className="sellcta">Predávate diely z vrakoviska alebo servisu? <a href={STATIC_PREVIEW ? sellersHref : "/pre-predajcov?registracia=1"}>Vytvorte si účet predajcu zadarmo</a></p>
      </div></section>

      <div className="wrap">
        <section className="panel" aria-label="Hľadanie dielov" ref={panelRef}>
          <MyCarBar car={my.car} cat={catalog} f={f}
            onUse={() => { if (my.car) { set({ brand: my.car.brand, model: my.car.model, engine: my.car.engine, year: null }); setTimeout(toRes, 30); } }}
            onAll={() => set({ brand: null, model: null, engine: null, year: null })}
            onSave={() => { if (f.brand != null) my.save({ brand: f.brand, model: f.model, engine: f.engine, year: f.year }); }}
            onForget={() => my.save(null)} />
          <div className="pg">
            <label>Značka
              <select value={f.brand ?? ""} onChange={(e) => set({ brand: numOrNull(e.target.value), model: null, engine: null, year: null })}>
                {opt("", "Všetky značky")}{brands.map((b) => opt(b.id, b.name))}
              </select>
            </label>
            <label>Model
              <select value={f.model ?? ""} disabled={f.brand == null} onChange={(e) => {
                const id = numOrNull(e.target.value), m = models.find((x) => x.id === id);
                const keepYear = f.year != null && m && f.year >= m.yearFrom && f.year <= (m.yearTo || 9999);
                set({ model: id, engine: null, year: keepYear || !m ? f.year : null });
              }}>
                {opt("", f.brand == null ? "Najprv vyberte značku" : "Všetky modely")}
                {models.map((m) => opt(m.id, `${m.name} (${m.yearFrom}–${m.yearTo || "dnes"})`))}
              </select>
            </label>
            <label>Kategória
              <select value={f.cat} onChange={(e) => set({ cat: e.target.value, sub: null })}>
                {opt("", "Všetky kategórie")}{cats.map((c) => opt(c.id, c.name))}
              </select>
            </label>
            <label>Motorizácia
              <select value={f.engine ?? ""} disabled={!model} onChange={(e) => set({ engine: numOrNull(e.target.value) })}>
                {opt("", model ? "Všetky motorizácie" : "Najprv vyberte model")}{engines.map((x) => opt(x.id, x.name))}
              </select>
            </label>
          </div>
          <div className="adv" hidden={!adv}>
            <label>Podkategória
              <select value={f.sub ?? ""} disabled={!f.cat} onChange={(e) => set({ sub: numOrNull(e.target.value) })}>
                {opt("", f.cat ? "Všetky podkategórie" : "Najprv vyberte kategóriu")}{subs.map((s) => opt(s.id, s.name))}
              </select>
            </label>
            <label>Ročník
              <select value={f.year ?? ""} onChange={(e) => set({ year: numOrNull(e.target.value) })}>
                {opt("", "Každý ročník")}{years.map((y) => opt(y, String(y)))}
              </select>
            </label>
            <label>Cena do
              <input type="number" min={0} inputMode="numeric" placeholder="€" value={f.max ?? ""} onChange={(e) => set({ max: e.target.value === "" ? null : Math.max(0, Number(e.target.value)) })} />
            </label>
            <label>Stav
              <select value={f.cond} onChange={(e) => set({ cond: e.target.value })}>
                {opt("", "Každý stav")}{opt("Veľmi dobrý", "Veľmi dobrý")}{opt("Dobrý", "Dobrý")}{opt("Na opravu", "Na opravu")}
              </select>
            </label>
            <label>Mesto
              <select value={f.city} onChange={(e) => set({ city: e.target.value })}>
                {opt("", "Celé Slovensko")}{cities.map((c) => opt(c, c))}
              </select>
            </label>
            <label>Zoradiť
              <select value={f.sort} onChange={(e) => set({ sort: e.target.value as Filters["sort"] })}>
                {opt("new", "Najnovšie")}{opt("asc", "Najlacnejšie")}{opt("desc", "Najdrahšie")}
              </select>
            </label>
            <label>Strana
              <select value={f.side} onChange={(e) => set({ side: e.target.value })}>
                {opt("", "Ľavá aj pravá")}{opt("Ľavá", "Ľavá")}{opt("Pravá", "Pravá")}
              </select>
            </label>
            <label className="chk"><input type="checkbox" checked={f.tested} onChange={(e) => set({ tested: e.target.checked })} /> Len odskúšané diely</label>
            <label className="chk"><input type="checkbox" checked={f.ret} onChange={(e) => set({ ret: e.target.checked })} /> Len s možnosťou vrátenia</label>
          </div>
          <div className="pa">
            <button className="lnk" aria-expanded={adv} onClick={() => setAdv(!adv)}>Rozšírené hľadanie</button>
            <button className="btn" onClick={toRes}>Hľadať</button>
          </div>
          <form id="hladat" className="oemrow" onSubmit={(e) => { e.preventDefault(); if (!oemQ.trim()) return; set({ q: oemQ.trim() }); window.dispatchEvent(new CustomEvent("rz-q-set", { detail: oemQ.trim() })); setTimeout(toRes, 30); }}>
            <label>Číslo dielu (OEM)<span className="oemin"><input value={oemQ} onChange={(e) => setOemQ(e.target.value)} placeholder="napr. 03G903023 alebo 5E0 807 221" autoComplete="off" />
              <ScanText kind="oem" onResult={(v) => { setOemQ(v); set({ q: v }); window.dispatchEvent(new CustomEvent("rz-q-set", { detail: v })); setTimeout(toRes, 30); }} /></span></label>
            <button className="btn2" type="submit">Hľadať podľa čísla</button>
          </form>
        </section>

        <section id="vin" className="plate" aria-label="Hľadanie podľa VIN">
          <h2>Hľadať podľa VIN</h2>
          <div className="pg2">
            <label>VIN (17 znakov)
              <span className="pl"><span className="eu">VIN</span>
                <input value={vin} onChange={(e) => setVin(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter") onVin(); }} placeholder="TMBJJ7NE0G0123456" maxLength={17} autoComplete="off" />
                <ScanText kind="vin" onResult={(v) => setVin(v)} />
              </span>
            </label>
            <label>Hľadám
              <select value={vinCat} onChange={(e) => setVinCat(e.target.value)}>{opt("", "Všetky diely")}{cats.map((c) => opt(c.id, c.name))}</select>
            </label>
            <button className="btn2" onClick={onVin}>Dekódovať VIN</button>
          </div>
          <p>VIN nájdete v osvedčení o evidencii (časť I, pole E) a na štítku pri čelnom skle (<Link href="/navody/vin">kde presne</Link>). Na mobile ho môžete odfotiť ikonou fotoaparátu. Z VIN prečítame značku a približný ročník. Model a motorizáciu vyberte v paneli vyššie. Podľa ŠPZ nehľadáme.</p>
          <p className="vmsg" role="status">{vinMsg}</p>
        </section>

        <div className="pop"><h2 className="sh">Najhľadanejšie diely</h2><div className="chips">
          {POP.map((p) => <button key={p} className="chip" onClick={() => { set({ q: p }); window.dispatchEvent(new CustomEvent("rz-q-set", { detail: p })); setTimeout(toRes, 30); }}>{p}</button>)}
        </div></div>

        <div id="vysledky" ref={resRef} className="head">
          <span className="cnt" aria-live="polite">{res ? pieces(res.total) : "Načítavam…"}</span>
          <span className="head-a">
            {hasCriteria(f) && !f.fav && (isSaved
              ? <span className="chip saved-ok" title="Pri ďalšej návšteve uvidíte, koľko nových dielov pribudlo">✓ Hľadanie uložené</span>
              : <button className="chip" disabled={saved.list.length >= MAX_SAVED} title="Uloží sa len v tomto prehliadači. Pri ďalšej návšteve uvidíte, koľko nových dielov pribudlo." onClick={() => saved.add(f)}>🔔 Uložiť hľadanie</button>)}
            <button className="chip" aria-pressed={f.fav} onClick={() => set({ fav: !f.fav })}>♥ Obľúbené</button>
          </span>
        </div>
        {hasCriteria(f) && !f.fav && isSaved && EMAIL_ALERTS && <AlertForm key={filterKey(f)} f={f} cat={catalog} />}
        <SavedSearches list={saved.list} cat={catalog} onRemove={saved.remove}
          onOpen={(x) => { setF({ ...x.f, fav: false }); saved.seen(x.id); window.dispatchEvent(new CustomEvent("rz-q-set", { detail: x.f.q })); setTimeout(toRes, 30); }} />

        {res && catalog && (
          <div className="chips" aria-label="Kategórie nájdených dielov">
            <button className="chip" aria-pressed={!f.cat} onClick={() => set({ cat: "", sub: null })}>Všetky ({res.base})</button>
            {cats.filter((c) => res.cats.get(c.id) || f.cat === c.id).map((c) => (
              <button key={c.id} className="chip" aria-pressed={f.cat === c.id} onClick={() => set({ cat: f.cat === c.id ? "" : c.id, sub: null })}>
                <Icon id={catIcon(c.id)} />{c.name} ({res.cats.get(c.id) || 0})
              </button>
            ))}
            {f.cat && subs.filter((s) => res.subs.get(s.id) || f.sub === s.id).map((s) => (
              <button key={s.id} className="chip" aria-pressed={f.sub === s.id} onClick={() => set({ sub: f.sub === s.id ? null : s.id })}>{s.name} ({res.subs.get(s.id) || 0})</button>
            ))}
          </div>
        )}

        {loadErr && <div className="err" role="alert">Údaje sa nepodarilo načítať: {loadErr}</div>}

        <div className="grid">
          {!res && !loadErr && <div className="loading">Načítavam inzeráty…</div>}
          {res && catalog && res.total > 0 && res.items.map((l) => (
            <ListingCard key={l.id} l={l} cat={catalog} fav={favs.includes(l.id)} onFav={toggle} />
          ))}
          {res && res.total > res.items.length && (
            <button className="add more" disabled={busy} onClick={more}>{busy ? "Načítavam…" : `Načítať viac (${res.total - res.items.length})`}</button>
          )}
          {res && res.total === 0 && (
            hasCriteria(f) || f.fav
              ? <div className="empty">{f.fav && !favs.length ? "Zatiaľ nemáte obľúbené diely. Označte ich srdiečkom ♡ na karte." : "Nič sme nenašli. Skúste iné slovo, kategóriu alebo všetky značky."}
                  {hasCriteria(f) && !f.fav && !isSaved && <><br />Uložte si hľadanie a pri ďalšej návšteve uvidíte, či pribudol vhodný diel.<br /><button className="add" onClick={() => saved.add(f)}>🔔 Uložiť hľadanie</button></>}
                  <br /><button className="add" onClick={reset}>Zrušiť všetky filtre</button>
                </div>
              : <div className="empty">Na portáli zatiaľ nie sú žiadne inzeráty.<br />Predávate diely? <a href={STATIC_PREVIEW ? sellersHref : "/pre-predajcov?registracia=1"}>Pridajte prvý diel zadarmo</a>.</div>
          )}
        </div>

        {!STATIC_PREVIEW && res && (
          <div className="rq-cta"><p><b>Nenašli ste svoj diel?</b> Zadajte dopyt – vrakoviská vám pošlú ponuku. Bez registrácie.</p>
            <a className="btn2" href={`/dopyt?${new URLSearchParams({ ...(f.brand ? { znacka: String(f.brand) } : {}), ...(f.model ? { model: String(f.model) } : {}), ...(f.q.trim() ? { q: f.q.trim() } : {}) }).toString()}`}>Zadať dopyt na diel</a></div>
        )}

        <section className="how" aria-label="Ako to funguje">
          <div><b>1</b><h3>Vyberte svoje auto</h3><p>Značka, model a motorizácia, alebo VIN číslo. Diely, ktoré naň pasujú, uvidíte hneď.</p></div>
          <div><b>2</b><h3>Nájdite diel</h3><p>Zúžte výber podľa kategórie, ceny, stavu alebo mesta a porovnajte OEM číslo so starým dielom.</p></div>
          <div><b>3</b><h3>Zavolajte predajcovi</h3><p>Bez registrácie. Telefón sa zobrazí jedným kliknutím a dohodnete sa priamo s predajcom.</p></div>
        </section>
      </div>

      {detailId != null && (
        <div className="overlay" onClick={(e) => { if (e.target === e.currentTarget) closeHash(); }}>
          <ListingDetail id={detailId} onClose={closeHash} />
        </div>
      )}
      {STATIC_PREVIEW && hash === "#pre-predajcov" && (
        <div className="overlay" onClick={(e) => { if (e.target === e.currentTarget) closeHash(); }}>
          <div className="dbox"><SellersSoon /><button className="close" onClick={closeHash}>Zavrieť</button></div>
        </div>
      )}
    </main>
  );
}
