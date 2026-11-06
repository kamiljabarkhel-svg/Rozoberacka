"use client";
// Dopyt na diel: kupujúci bez účtu napíše, čo hľadá; vrakoviská mu pošlú ponuky.
// Ponuky uvidí na súkromnej adrese /dopyt/<kód>, ktorú si uloží (pamätáme si ju aj v tomto prehliadači).
import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import type { Catalog } from "@/lib/types";
import { IS_DEMO, createRequest, getCatalog } from "@/lib/data";
import { decodeVin } from "@/lib/vin";
import { sk } from "@/lib/format";

const KEY = "rozoberacka-dopyty";
export type SavedReq = { token: string; part: string; car: string; at: string };
export function readReqs(): SavedReq[] { try { const a = JSON.parse(localStorage.getItem(KEY) || "[]"); return Array.isArray(a) ? a : []; } catch { return []; } }
function addReq(r: SavedReq) { try { localStorage.setItem(KEY, JSON.stringify([r, ...readReqs()].slice(0, 20))); } catch {} }

export default function RequestForm() {
  const [cat, setCat] = useState<Catalog | null>(null);
  const [v, setV] = useState({ brand: 0, model: 0, engine: 0, year: 0, vin: "", cat: "", part: "", note: "", name: "", contact: "", city: "" });
  const [agree, setAgree] = useState(false);
  const [err, setErr] = useState(""), [busy, setBusy] = useState(false), [done, setDone] = useState<string | null>(null);
  const [mine, setMine] = useState<SavedReq[]>([]);
  useEffect(() => {
    getCatalog().then(setCat).catch((e) => setErr(String(e.message || e))); setMine(readReqs());
    try { const s = new URLSearchParams(window.location.search); setV((o) => ({ ...o, brand: Number(s.get("znacka")) || 0, model: Number(s.get("model")) || 0, part: s.get("q") || "" })); } catch {}
  }, []);
  const brands = useMemo(() => (cat ? [...cat.brands].sort((a, b) => sk(a.name, b.name)) : []), [cat]);
  const models = cat?.models.filter((m) => m.brandId === v.brand) || [];
  const model = models.find((m) => m.id === v.model);
  const engines = cat?.engines.filter((e) => e.modelId === v.model) || [];
  const years: number[] = []; for (let y = Math.min(model?.yearTo ?? new Date().getFullYear(), new Date().getFullYear()); y >= (model?.yearFrom ?? 1990); y--) years.push(y);
  const set = (p: Partial<typeof v>) => setV((o) => ({ ...o, ...p }));
  const carText = [cat?.brands.find((b) => b.id === v.brand)?.name, model?.name, cat?.engines.find((e) => e.id === v.engine)?.name].filter(Boolean).join(" ") + (v.year ? `, ${v.year}` : "");

  const onVin = (s: string) => {
    set({ vin: s.toUpperCase() });
    const r = decodeVin(s);
    if (r.ok && r.brand && cat) { const b = cat.brands.find((x) => x.name === r.brand); if (b && b.id !== v.brand) set({ vin: s.toUpperCase(), brand: b.id, model: 0, engine: 0, year: r.year || 0 }); }
  };
  async function submit(e: React.FormEvent) {
    e.preventDefault(); setErr("");
    const vin = v.vin.replace(/\s/g, "");
    if (!v.brand) return setErr("Vyberte značku auta.");
    if (vin && !/^[A-HJ-NPR-Z0-9]{17}$/i.test(vin)) return setErr("VIN má 17 znakov (bez I, O a Q). Ak ho nemáte, nechajte pole prázdne.");
    if (v.part.trim().length < 3) return setErr("Napíšte, aký diel hľadáte.");
    if (v.name.trim().length < 2) return setErr("Napíšte svoje meno.");
    if (v.contact.trim().length < 5) return setErr("Napíšte telefón alebo e-mail, na ktorý vám predajcovia odpovedia.");
    if (!agree) return setErr("Na odoslanie treba súhlasiť so zobrazením dopytu predajcom.");
    setBusy(true);
    try {
      const token = await createRequest({ brand: v.brand, model: v.model || null, engine: v.engine || null, year: v.year || null, vin, cat: v.cat, part: v.part, note: v.note, name: v.name, contact: v.contact, city: v.city });
      addReq({ token, part: v.part.trim(), car: carText, at: new Date().toISOString() }); setMine(readReqs()); setDone(token);
    } catch (x) { setErr(String((x as Error).message || x)); } finally { setBusy(false); }
  }

  if (done) {
    const url = (typeof window !== "undefined" ? window.location.origin : "") + "/dopyt/" + done;
    return (
      <div className="pp-box rq-done">
        <h2>Dopyt je odoslaný</h2>
        <p>Vrakoviská a predajcovia ho uvidia vo svojom portáli a ozvú sa vám na <b>{v.contact}</b>. Ponuky nájdete aj na tejto súkromnej adrese – uložte si ju:</p>
        <p className="rq-url"><Link href={"/dopyt/" + done}>{url}</Link></p>
        <p className="mute">Adresu si pamätáme aj v tomto prehliadači. Dopyt platí 30 dní, potom sa sám uzavrie.</p>
        <p><Link className="btn" href={"/dopyt/" + done}>Zobraziť ponuky</Link></p>
      </div>
    );
  }
  return (
    <>
      {mine.length > 0 && <div className="saved"><b>Moje dopyty</b>{mine.map((r) => <Link key={r.token} className="chip" href={"/dopyt/" + r.token}>{r.part}{r.car ? ` · ${r.car}` : ""}</Link>)}</div>}
      <form className="pp-form pp-grid pp-card" onSubmit={submit} noValidate>
        {IS_DEMO && <p className="full pp-err">Ukážkový režim: dopyt sa nedá odoslať.</p>}
        <h2 className="full rq-h">Auto</h2>
        <label className="full">VIN (nepovinné – pomôže predajcovi nájsť presný diel)<input value={v.vin} maxLength={20} onChange={(e) => onVin(e.target.value)} placeholder="napr. TMBJJ7NE0G0123456" autoComplete="off" /></label>
        <label>Značka *<select value={v.brand || ""} onChange={(e) => set({ brand: Number(e.target.value), model: 0, engine: 0, year: 0 })}><option value="">Vyberte…</option>{brands.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}</select></label>
        <label>Model<select value={v.model || ""} disabled={!models.length} onChange={(e) => set({ model: Number(e.target.value), engine: 0 })}><option value="">Neviem / iný</option>{models.map((m) => <option key={m.id} value={m.id}>{m.name} ({m.yearFrom}–{m.yearTo ?? ""})</option>)}</select></label>
        <label>Motorizácia<select value={v.engine || ""} disabled={!engines.length} onChange={(e) => set({ engine: Number(e.target.value) })}><option value="">Neviem</option>{engines.map((x) => <option key={x.id} value={x.id}>{x.name}</option>)}</select></label>
        <label>Ročník<select value={v.year || ""} onChange={(e) => set({ year: Number(e.target.value) })}><option value="">Neviem</option>{years.map((y) => <option key={y}>{y}</option>)}</select></label>
        <h2 className="full rq-h">Diel</h2>
        <label className="full">Aký diel hľadáte? *<input value={v.part} maxLength={120} onChange={(e) => set({ part: e.target.value })} placeholder="napr. ľavé predné svetlo LED, OEM 5E1941015" /></label>
        <label>Kategória<select value={v.cat} onChange={(e) => set({ cat: e.target.value })}><option value="">Neviem</option>{cat?.categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}</select></label>
        <label>Mesto<input value={v.city} maxLength={60} onChange={(e) => set({ city: e.target.value })} placeholder="kde diel prevezmete" /></label>
        <label className="full">Poznámka<textarea value={v.note} maxLength={500} rows={3} onChange={(e) => set({ note: e.target.value })} placeholder="farba, strana, stav, termín…" /></label>
        <h2 className="full rq-h">Kontakt</h2>
        <label>Meno *<input value={v.name} maxLength={80} onChange={(e) => set({ name: e.target.value })} autoComplete="name" /></label>
        <label>Telefón alebo e-mail *<input value={v.contact} maxLength={120} onChange={(e) => set({ contact: e.target.value })} autoComplete="tel" /></label>
        <label className="pp-chk full"><input type="checkbox" checked={agree} onChange={(e) => setAgree(e.target.checked)} />
          <span>Súhlasím, aby môj dopyt vrátane mena a kontaktu videli registrovaní predajcovia na Rozoberačke a ozvali sa mi s ponukou. Dopyt sa po 60 dňoch zmaže. <a href="/ochrana-osobnych-udajov" target="_blank">Ochrana osobných údajov</a></span></label>
        {err && <p className="full pp-err" role="alert">{err}</p>}
        <div className="full pp-actions"><button className="btn" disabled={busy || IS_DEMO}>{busy ? "Odosielam…" : "Odoslať dopyt predajcom"}</button></div>
      </form>
    </>
  );
}
