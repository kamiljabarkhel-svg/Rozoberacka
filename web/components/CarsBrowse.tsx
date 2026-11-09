"use client";
// Zoznam havarovaných a nepojazdných vozidiel s filtrami. Filtre sa ukladajú do adresy (?druh=…&znacka=…).
import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import type { CarFilters, CarListing, Catalog, VehicleType } from "@/lib/types";
import { CAR_CONDITIONS, emptyCarFilters, FUELS, VEHICLE_TYPES } from "@/lib/types";
import { searchCars, type CarPage } from "@/lib/data";
import { type PackedCatalog, unpackCatalog } from "@/lib/catalogSort";
import { plural, sk } from "@/lib/format";
import CarCard from "./CarCard";

const PAGE = 24;
const P = { vtype: "druh", brand: "znacka", model: "model", yfrom: "rok-od", yto: "rok-do", max: "cena", cond: "stav", fuel: "palivo", docs: "doklady", q: "q", sort: "zoradit" } as const;

function readUrl(): CarFilters {
  const f: CarFilters = { ...emptyCarFilters, vtype: "osobne" };
  try {
    const s = new URLSearchParams(window.location.search);
    const n = (k: string) => { const v = Number(s.get(k)); return s.get(k) && Number.isFinite(v) ? v : null; };
    const vt = s.get(P.vtype); f.vtype = vt === "vsetky" ? "" : VEHICLE_TYPES.some((t) => t.id === vt) ? (vt as VehicleType) : "osobne";
    f.brand = n(P.brand); f.model = n(P.model); f.yfrom = n(P.yfrom); f.yto = n(P.yto); f.max = n(P.max);
    f.cond = s.get(P.cond) || ""; f.fuel = s.get(P.fuel) || ""; f.docs = s.get(P.docs) === "1"; f.q = s.get(P.q) || "";
    const so = s.get(P.sort); f.sort = (["asc", "desc", "year", "km"] as const).find((x) => x === so) || "new";
  } catch {}
  return f;
}
function writeUrl(f: CarFilters) {
  const s = new URLSearchParams();
  const put = (k: string, v: unknown) => { if (v !== null && v !== "" && v !== false && v !== undefined) s.set(k, v === true ? "1" : String(v)); };
  if (f.vtype !== "osobne") put(P.vtype, f.vtype || "vsetky"); put(P.brand, f.brand); put(P.model, f.model); put(P.yfrom, f.yfrom); put(P.yto, f.yto); put(P.max, f.max);
  put(P.cond, f.cond); put(P.fuel, f.fuel); put(P.docs, f.docs); put(P.q, f.q.trim()); if (f.sort !== "new") put(P.sort, f.sort);
  const qs = s.toString();
  window.history.replaceState(window.history.state, "", window.location.pathname + (qs ? "?" + qs : ""));
}

export default function CarsBrowse({ packed, initial }: { packed: PackedCatalog; initial: CarPage }) {
  const cat: Catalog = useMemo(() => unpackCatalog(packed), [packed]);
  const [f, setF] = useState<CarFilters>({ ...emptyCarFilters, vtype: "osobne" });
  const [res, setRes] = useState<CarPage>(initial);
  const [busy, setBusy] = useState(false), [err, setErr] = useState("");
  const first = useRef(true), seq = useRef(0);
  const set = (p: Partial<CarFilters>) => setF((o) => ({ ...o, ...p }));

  // po načítaní vždy čerstvé výsledky (stránka zo servera môže byť pár minút stará); filtre z adresy
  useEffect(() => { const u = readUrl(); first.current = false; setF(u); }, []);
  useEffect(() => {
    if (first.current) return;
    writeUrl(f);
    const my = ++seq.current; setBusy(true); setErr("");
    const t = window.setTimeout(() => {
      searchCars(f, 0, PAGE).then((r) => { if (my === seq.current) setRes(r); }).catch((e) => { if (my === seq.current) setErr(String(e?.message || e)); })
        .finally(() => { if (my === seq.current) setBusy(false); });
    }, f.q ? 300 : 0);
    return () => window.clearTimeout(t);
  }, [f]);
  const more = async () => {
    setBusy(true);
    try { const r = await searchCars(f, res.items.length, PAGE); setRes({ ...r, items: [...res.items, ...r.items] }); } catch (e) { setErr(String((e as Error).message || e)); } finally { setBusy(false); }
  };

  const vtOk = (m: { vehicleType?: VehicleType }) => !f.vtype || (m.vehicleType || "osobne") === f.vtype;
  const brandIds = new Set(cat.models.filter(vtOk).map((m) => m.brandId));
  const brands = cat.brands.filter((b) => !f.vtype || brandIds.has(b.id)).sort((a, b) => sk(a.name, b.name));
  const models = f.brand ? cat.models.filter((m) => m.brandId === f.brand && vtOk(m)) : [];
  const thisYear = new Date().getFullYear();
  const years: number[] = []; for (let y = thisYear; y >= 1970; y--) years.push(y);
  const opt = (v: string | number, l: string) => <option key={v} value={v}>{l}</option>;
  const num = (v: string) => (v === "" ? null : Number(v));

  return (
    <>
      <section className="panel" aria-label="Hľadanie vozidiel">
        <div className="vtabs" role="tablist" aria-label="Druh vozidla">
          {VEHICLE_TYPES.map((t) => <button key={t.id} role="tab" aria-selected={f.vtype === t.id} className={f.vtype === t.id ? "on" : ""} onClick={() => set({ vtype: t.id, brand: null, model: null })}>{t.short}</button>)}
          <button role="tab" aria-selected={!f.vtype} className={!f.vtype ? "on" : ""} onClick={() => set({ vtype: "", brand: null, model: null })}>Všetky vozidlá</button>
        </div>
        <div className="cars-f">
          <label>Značka<select value={f.brand ?? ""} onChange={(e) => set({ brand: num(e.target.value), model: null })}>{opt("", "Všetky značky")}{brands.map((b) => opt(b.id, b.name))}</select></label>
          <label>Model<select value={f.model ?? ""} disabled={!f.brand} onChange={(e) => set({ model: num(e.target.value) })}>{opt("", f.brand ? "Všetky modely" : "Najprv vyberte značku")}{models.map((m) => opt(m.id, `${m.name} (${m.yearFrom}–${m.yearTo || "dnes"})`))}</select></label>
          <label>Stav<select value={f.cond} onChange={(e) => set({ cond: e.target.value })}>{opt("", "Každý stav")}{CAR_CONDITIONS.map((c) => opt(c, `${c}${res.conds[c] ? ` (${res.conds[c]})` : ""}`))}</select></label>
          <label>Cena do<input type="number" min={0} inputMode="numeric" placeholder="€" value={f.max ?? ""} onChange={(e) => set({ max: e.target.value === "" ? null : Math.max(0, Number(e.target.value)) })} /></label>
          <label>Ročník od<select value={f.yfrom ?? ""} onChange={(e) => set({ yfrom: num(e.target.value) })}>{opt("", "Každý")}{years.map((y) => opt(y, String(y)))}</select></label>
          <label>Ročník do<select value={f.yto ?? ""} onChange={(e) => set({ yto: num(e.target.value) })}>{opt("", "Každý")}{years.map((y) => opt(y, String(y)))}</select></label>
          <label>Palivo<select value={f.fuel} onChange={(e) => set({ fuel: e.target.value })}>{opt("", "Každé")}{FUELS.map((x) => opt(x, x))}</select></label>
          <label>Zoradiť<select value={f.sort} onChange={(e) => set({ sort: e.target.value as CarFilters["sort"] })}>{opt("new", "Najnovšie")}{opt("asc", "Najlacnejšie")}{opt("desc", "Najdrahšie")}{opt("year", "Najmladšie")}{opt("km", "Najmenej km")}</select></label>
          <label style={{ gridColumn: "span 2" }}>Hľadať v popise<input value={f.q} placeholder="napr. motor v poriadku, airbagy" onChange={(e) => set({ q: e.target.value })} /></label>
          <label className="chk"><input type="checkbox" checked={f.docs} onChange={(e) => set({ docs: e.target.checked })} /> Len s dokladmi</label>
          <button className="lnk" onClick={() => setF((x) => ({ ...emptyCarFilters, vtype: x.vtype }))}>Zrušiť filtre</button>
        </div>
      </section>
      <section id="vysledky" aria-live="polite">
        <h2 className="sh">{res.total} {plural(res.total, "vozidlo", "vozidlá", "vozidiel")}{busy && <span className="mute"> · hľadám…</span>}</h2>
        {err && <p className="pp-err">Vozidlá sa nepodarilo načítať: {err}</p>}
        {!res.items.length && !busy && <div className="empty">Takéto vozidlo zatiaľ nikto neponúka. Skúste zmeniť filtre alebo hľadajte <Link href="/">diely</Link>.</div>}
        <div className="grid">{res.items.map((c: CarListing) => <CarCard key={c.id} c={c} cat={cat} />)}</div>
        {res.items.length < res.total && <p style={{ textAlign: "center" }}><button className="btn2" disabled={busy} onClick={more}>Načítať ďalšie</button></p>}
      </section>
    </>
  );
}
