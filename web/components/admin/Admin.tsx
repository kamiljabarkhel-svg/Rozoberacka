"use client";
// Administrácia: prehľad, nahlásenia, predajcovia, inzeráty, záznam akcií.
import { useCallback, useEffect, useState } from "react";
import { IS_DEMO } from "@/lib/data";
import { getSession } from "@/lib/seller";
import { listingHref } from "@/lib/paths";
import { price } from "@/lib/format";
import * as A from "@/lib/admin";

type Tab = "home" | "rep" | "sel" | "lst" | "req" | "log";
const TABS: [Tab, string][] = [["home", "Prehľad"], ["rep", "Nahlásenia"], ["sel", "Predajcovia"], ["lst", "Inzeráty"], ["req", "Dopyty"], ["log", "Záznam akcií"]];
const ST: Record<string, string> = { active: "Aktívny", paused: "Pozastavený", sold: "Predaný", blocked: "Skrytý", open: "Otvorené", resolved: "Vybavené", rejected: "Zamietnuté" };
const d = (s: string) => new Date(s).toLocaleString("sk-SK", { day: "numeric", month: "numeric", year: "numeric", hour: "2-digit", minute: "2-digit" });

export default function Admin() {
  const [state, setState] = useState<"load" | "out" | "no" | "ok">("load");
  const [tab, setTab] = useState<Tab>("home");
  const [toast, setToast] = useState(""); const [err, setErr] = useState("");
  useEffect(() => {
    if (IS_DEMO) { setState("no"); return; }
    getSession().then(async (s) => { if (!s) { setState("out"); return; } setState((await A.isAdmin().catch(() => false)) ? "ok" : "no"); });
  }, []);
  const run = useCallback(async (fn: () => Promise<unknown>, done: string) => {
    setErr(""); try { await fn(); setToast(done); window.setTimeout(() => setToast(""), 2500); return true; } catch (e) { setErr(String((e as Error).message || e)); return false; }
  }, []);
  if (state === "load") return <p className="mute">Načítavam…</p>;
  if (state === "out") return <div className="pp-auth"><h1>Administrácia</h1><p>Najprv sa prihláste. <a href="/pre-predajcov">Prihlásenie</a></p></div>;
  if (state === "no") return <div className="pp-auth"><h1>Administrácia</h1><p className="mute">Na túto stránku nemáte prístup.</p></div>;
  return (
    <div className="pp">
      <aside className="pp-nav"><div className="pp-who"><b>Administrácia</b><span className="mute">Rozoberačka</span></div>
        <nav>{TABS.map(([t, l]) => <button key={t} type="button" aria-current={tab === t ? "page" : undefined} onClick={() => setTab(t)}>{l}</button>)}</nav></aside>
      <section className="pp-body">
        {err && <p className="pp-err">{err}</p>}
        {tab === "home" && <Home />}
        {tab === "rep" && <Reports run={run} />}
        {tab === "sel" && <Sellers run={run} />}
        {tab === "lst" && <Listings run={run} />}
        {tab === "req" && <Reqs run={run} />}
        {tab === "log" && <Log />}
      </section>
      {toast && <div className="pp-toast" role="status">{toast}</div>}
    </div>
  );
}
type Run = (fn: () => Promise<unknown>, done: string) => Promise<boolean>;

function useLoad<T>(fn: () => Promise<T>, deps: unknown[]): [T | null, () => void, string] {
  const [v, setV] = useState<T | null>(null); const [e, setE] = useState(""); const [n, setN] = useState(0);
  useEffect(() => { let off = false; setE(""); fn().then((x) => { if (!off) setV(x); }).catch((x) => { if (!off) setE(String(x?.message || x)); }); return () => { off = true; }; }, [n, ...deps]); // eslint-disable-line react-hooks/exhaustive-deps
  return [v, () => setN((k) => k + 1), e];
}

function Home() {
  const [s, , e] = useLoad(A.adminStats, []);
  const L: [string, string][] = [["sellers", "Predajcovia"], ["sellers_new_7d", "Noví predajcovia (7 dní)"], ["active", "Aktívne inzeráty"], ["blocked", "Skryté inzeráty"],
    ["reports_open", "Otvorené nahlásenia"], ["requests_open", "Otvorené dopyty"], ["messages_7d", "Správy (7 dní)"], ["phones_7d", "Odkryté telefóny (7 dní)"], ["views_7d", "Zobrazenia (7 dní)"]];
  return <div><header className="pp-h"><h1>Prehľad portálu</h1></header>{e && <p className="pp-err">{e}</p>}
    <div className="pp-tiles">{L.map(([k, l]) => <div key={k} className="pp-tile"><b>{s ? Number(s[k] || 0).toLocaleString("sk-SK") : "…"}</b><span>{l}</span></div>)}</div></div>;
}

function Reports({ run }: { run: Run }) {
  const [f, setF] = useState("open");
  const [rows, reload, e] = useLoad(() => A.reports(f), [f]);
  return <div><header className="pp-h"><h1>Nahlásenia</h1>
    <select className="ad-sel" value={f} onChange={(x) => setF(x.target.value)}><option value="open">Otvorené</option><option value="resolved">Vybavené</option><option value="rejected">Zamietnuté</option><option value="">Všetky</option></select></header>
    {e && <p className="pp-err">{e}</p>}
    {rows && !rows.length && <div className="empty">Žiadne nahlásenia.</div>}
    <ul className="pp-msgs">{rows?.map((r) => <li key={r.id} className={r.status === "open" ? "unread" : ""}>
      <div className="pp-mh"><b>{r.reason}</b><span className="mute">{d(r.createdAt)} · {ST[r.status]}</span></div>
      <div>Inzerát #{r.listingId}: <a href={listingHref(r.listingId)} target="_blank" rel="noreferrer">{r.listingName}</a> <span className="mute">({ST[r.listingStatus] || r.listingStatus})</span></div>
      {r.note && <p>{r.note}</p>}{r.contact && <div className="mute">Kontakt: {r.contact}</div>}
      <div className="pp-ra ad-a">
        {r.listingStatus !== "blocked" && <button className="del" onClick={async () => { if (await run(() => A.setListing(r.listingId, true, "nahlásenie #" + r.id + ": " + r.reason), "Inzerát skrytý")) { await run(() => A.resolveReport(r.id, "resolved"), "Vybavené"); reload(); } }}>Skryť inzerát a vybaviť</button>}
        {r.status !== "resolved" && <button className="ubtn" onClick={async () => { await run(() => A.resolveReport(r.id, "resolved"), "Vybavené"); reload(); }}>Vybavené</button>}
        {r.status !== "rejected" && <button className="ubtn" onClick={async () => { await run(() => A.resolveReport(r.id, "rejected"), "Zamietnuté"); reload(); }}>Zamietnuť</button>}
      </div></li>)}</ul></div>;
}

function Sellers({ run }: { run: Run }) {
  const [rows, reload, e] = useLoad(A.sellers, []);
  const [q, setQ] = useState(""); const [confirm, setConfirm] = useState("");
  const shown = (rows || []).filter((s) => !q || (s.name + " " + s.email + " " + s.city + " " + s.ico).toLowerCase().includes(q.toLowerCase()));
  return <div><header className="pp-h"><h1>Predajcovia</h1><span className="mute">{rows?.length ?? "…"} spolu</span></header>
    <div className="pp-tools"><input type="search" placeholder="Hľadať meno, e-mail, mesto, IČO" value={q} onChange={(x) => setQ(x.target.value)} /></div>
    {e && <p className="pp-err">{e}</p>}
    <ul className="pp-rows">{shown.map((s) => <li key={s.id} className="pp-row ad-row">
      <div className="pp-ri"><b>{s.name} {s.verified && <span className="tg">✓ Overený</span>} {s.blocked && <span className="pp-st blocked">Zablokovaný</span>}</b>
        <span className="mute">{s.type} · {s.city || "bez mesta"} · {s.email} · tel. {s.phone || "—"} · IČO {s.ico || "—"}</span>
        <span className="mute">Od {d(s.createdAt)} · aktívne {s.active} / spolu {s.total}</span></div>
      <div className="pp-ra">
        <button className="ubtn" onClick={async () => { await run(() => A.setSeller(s.id, !s.verified, null), s.verified ? "Overenie zrušené" : "Predajca overený"); reload(); }}>{s.verified ? "Zrušiť overenie" : "Overiť"}</button>
        {s.blocked ? <button className="ubtn" onClick={async () => { await run(() => A.setSeller(s.id, null, false), "Odblokovaný (inzeráty sú pozastavené)"); reload(); }}>Odblokovať</button>
          : confirm === s.id ? <><button className="del" onClick={async () => { setConfirm(""); await run(() => A.setSeller(s.id, null, true), "Zablokovaný, inzeráty skryté"); reload(); }}>Naozaj zablokovať?</button><button className="lnk" onClick={() => setConfirm("")}>Nie</button></>
          : <button className="del" onClick={() => setConfirm(s.id)}>Zablokovať</button>}
      </div></li>)}</ul></div>;
}

function Listings({ run }: { run: Run }) {
  const [q, setQ] = useState(""), [st, setSt] = useState(""), [qq, setQq] = useState(""), [why, setWhy] = useState("");
  const [rows, reload, e] = useLoad(() => A.listings(qq, st), [qq, st]);
  return <div><header className="pp-h"><h1>Inzeráty</h1></header>
    <form className="pp-tools" onSubmit={(x) => { x.preventDefault(); setQq(q); }}>
      <input type="search" placeholder="Číslo inzerátu alebo názov (Enter)" value={q} onChange={(x) => setQ(x.target.value)} />
      <select value={st} onChange={(x) => setSt(x.target.value)}><option value="">Všetky stavy</option>{["active", "paused", "sold", "blocked"].map((s) => <option key={s} value={s}>{ST[s]}</option>)}</select></form>
    <div className="pp-tools"><input placeholder="Dôvod skrytia – uvidí ho predajca (povinné, aspoň 5 znakov)" value={why} onChange={(x) => setWhy(x.target.value)} maxLength={300} /></div>
    {e && <p className="pp-err">{e}</p>}
    {rows && !rows.length && <div className="empty">Nič sa nenašlo.</div>}
    <ul className="pp-rows">{rows?.map((l) => <li key={l.id} className={"pp-row ad-row st-" + l.status}>
      <div className="pp-ri"><b>#{l.id} {l.status === "active" ? <a href={listingHref(l.id)} target="_blank" rel="noreferrer">{l.name}</a> : l.name}</b>
        <span className="mute">{l.seller} · OEM {l.oem || "—"} · {price(l.price)} · {d(l.createdAt)}</span><span className={"pp-st " + l.status}>{ST[l.status]}</span></div>
      <div className="pp-ra">{l.status === "blocked"
        ? <button className="ubtn" onClick={async () => { await run(() => A.setListing(l.id, false, "obnovené"), "Obnovený ako pozastavený"); reload(); }}>Obnoviť</button>
        : <button className="del" disabled={why.trim().length < 5} title="Najprv napíšte dôvod skrytia" onClick={async () => { await run(() => A.setListing(l.id, true, why.trim()), "Inzerát skrytý"); reload(); }}>Skryť</button>}</div>
    </li>)}</ul></div>;
}

function Log() {
  const [rows, , e] = useLoad(A.log, []);
  return <div><header className="pp-h"><h1>Záznam akcií správcu</h1></header>{e && <p className="pp-err">{e}</p>}
    <ul className="pp-rows">{rows?.map((r) => <li key={r.id} className="pp-row ad-row"><div className="pp-ri"><b>{r.action}</b><span className="mute">{d(r.createdAt)} · {r.target} · {r.detail}</span></div></li>)}</ul></div>;
}

function Reqs({ run }: { run: Run }) {
  const [rows, reload, e] = useLoad(A.requests, []);
  return <div><header className="pp-h"><h1>Dopyty kupujúcich</h1></header>{e && <p className="pp-err">{e}</p>}
    {rows && !rows.length && <div className="empty">Žiadne dopyty.</div>}
    <ul className="pp-rows">{rows?.map((r) => <li key={r.id} className="pp-row ad-row">
      <div className="pp-ri"><b>#{r.id} {r.part}</b><span className="mute">{r.name} · {r.contact} · {d(r.createdAt)} · {r.status === "open" ? (new Date(r.expiresAt) > new Date() ? "otvorený" : "vypršal") : "uzavretý"}</span></div>
      <div className="pp-ra">{r.status === "open" && <button className="del" onClick={async () => { await run(() => A.closeRequestAdmin(r.id), "Dopyt uzavretý"); reload(); }}>Uzavrieť (spam)</button>}</div>
    </li>)}</ul></div>;
}
