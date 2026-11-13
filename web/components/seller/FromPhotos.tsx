"use client";
// Hromadné pridanie „najprv fotky“: predajca nahrá všetky fotky naraz (napr. celé rozobraté auto),
// klikaním označí fotky jedného dielu a vyplní len názov, číslo dielu a cenu.
// Vozidlo, stav, záruka, odovzdanie, mesto a telefón sa zadajú raz pre celú dávku.
// Súbory netreba premenovávať. Nič sa neuloží, kým predajca neklikne „Zverejniť“.
import { useEffect, useMemo, useState } from "react";
import type { Catalog, Condition, VehicleType } from "@/lib/types";
import { CONDITIONS, condLabel, oemOptional, VEHICLE_TYPES } from "@/lib/types";
import { carName } from "@/lib/seo";
import { myDonors, saveListing, skError, type Donor, type ListingInput, type Profile } from "@/lib/seller";
import { baseName, isPhoto, MAX_PHOTOS, sortPhotos } from "@/lib/bulkPhotos";
import { commonFor } from "./Donors";
import ScanText from "../ScanText";

type Part = { id: number; files: File[]; name: string; cat: string; sub: string; side: string; oem: string; price: string; cond: Condition | ""; err?: string };
const digits = (s: string) => s.replace(/\D/g, "").length;
const oemLen = (s: string) => s.replace(/[^A-Za-z0-9]/g, "").length;
const plural = (n: number, a: string, b: string, c: string) => (n === 1 ? a : n >= 2 && n <= 4 ? b : c);
let nextId = 1;

export default function FromPhotos({ uid, cat, prof, onDone }: { uid: string; cat: Catalog; prof: Profile | null; onDone: (msg: string) => void }) {
  const firm = (prof?.type || "Firma") !== "Súkromná osoba";
  // ---- spoločné údaje dávky ----
  const [donors, setDonors] = useState<Donor[]>([]);
  const [donorId, setDonorId] = useState<number | null>(null);
  const [vt, setVt] = useState<VehicleType>(() => { try { const x = localStorage.getItem("rozoberacka-druh"); if (x && VEHICLE_TYPES.some((t) => t.id === x)) return x as VehicleType; } catch {} return "osobne"; });
  const [car, setCar] = useState({ brandId: 0, modelId: 0, engineId: null as number | null, year: 0 });
  const [b, setB] = useState({ cond: "Dobrý" as Condition, warranty: firm ? "12 mesiacov" : "Bez záruky", shipping: "Len osobný odber", city: prof?.city || "", phone: prof?.phone || "", note: "" });
  useEffect(() => { myDonors().then(setDonors).catch(() => setDonors([])); }, []);
  const donor = donors.find((d) => d.id === donorId) || null;

  const vtModels = cat.models.filter((m) => (m.vehicleType || "osobne") === vt);
  const brandIds = new Set(vtModels.map((m) => m.brandId));
  const models = vtModels.filter((m) => m.brandId === car.brandId), model = cat.models.find((m) => m.id === car.modelId);
  const engines = cat.engines.filter((e) => e.modelId === car.modelId);
  const years = useMemo(() => { const r: number[] = []; const to = Math.min(model?.yearTo ?? new Date().getFullYear(), new Date().getFullYear()); for (let y = to; y >= (model?.yearFrom ?? 1980); y--) r.push(y); return r; }, [model]);
  const pickDonor = (id: number | null) => {
    setDonorId(id);
    const d = donors.find((x) => x.id === id);
    if (d) { setCar({ brandId: d.brandId, modelId: d.modelId, engineId: d.engineId, year: d.year }); setVt(cat.models.find((m) => m.id === d.modelId)?.vehicleType || "osobne"); }
  };
  const carText = car.modelId ? `${carName({ brandId: car.brandId, modelId: car.modelId, engineId: car.engineId }, cat, true)}${car.year ? `, ${car.year}` : ""}` : "";

  // ---- fotky a diely ----
  const [files, setFiles] = useState<File[]>([]);
  const [sel, setSel] = useState<File[]>([]);
  const [parts, setParts] = useState<Part[]>([]);
  const [msg, setMsg] = useState(""); const [busy, setBusy] = useState(false); const [done, setDone] = useState(0);
  const [tried, setTried] = useState(false);
  const urls = useMemo(() => new Map(files.map((f) => [f, URL.createObjectURL(f)])), [files]);
  useEffect(() => () => { for (const u of urls.values()) URL.revokeObjectURL(u); }, [urls]);
  const used = useMemo(() => new Set(parts.flatMap((p) => p.files)), [parts]);
  const pool = files.filter((f) => !used.has(f));

  const addFiles = (list: FileList | null) => {
    if (!list) return;
    const add = sortPhotos([...list].filter(isPhoto));
    setFiles((o) => { const seen = new Set(o.map((f) => baseName(f).toLowerCase() + f.size)); return [...o, ...add.filter((f) => !seen.has(baseName(f).toLowerCase() + f.size))]; });
    setMsg("");
  };
  const toggle = (f: File) => setSel((s) => (s.includes(f) ? s.filter((x) => x !== f) : [...s, f]));
  const common = commonFor(vt);
  const cats = cat.categories.filter((c) => c.id !== "kol" && (!c.vtypes?.length || c.vtypes.includes(vt)));
  const newPart = (fs: File[]): Part => ({ id: nextId++, files: fs, name: "", cat: "", sub: "", side: "", oem: "", price: "", cond: "" });
  const makeOne = () => {
    if (!sel.length) return;
    if (sel.length > MAX_PHOTOS) return setMsg(`Jeden diel môže mať najviac ${MAX_PHOTOS} fotiek. Označili ste ${sel.length}.`);
    setParts((p) => [...p, newPart(sel)]); setSel([]); setMsg("");
  };
  const makeEach = () => { if (!sel.length) return; setParts((p) => [...p, ...sel.map((f) => newPart([f]))]); setSel([]); setMsg(""); };
  const upd = (id: number, x: Partial<Part>) => setParts((p) => p.map((q) => (q.id === id ? { ...q, ...x, err: undefined } : q)));
  const setName = (id: number, name: string) => {
    const hit = common.find(([n]) => n.toLowerCase() === name.trim().toLowerCase());
    upd(id, hit ? { name, cat: hit[1], sub: hit[2], side: hit[3] || "" } : { name });
  };
  const dropPhoto = (id: number, f: File) => setParts((p) => p.flatMap((q) => (q.id !== id ? [q] : q.files.length > 1 ? [{ ...q, files: q.files.filter((x) => x !== f) }] : [])));
  const removePart = (id: number) => setParts((p) => p.filter((q) => q.id !== id));

  // ---- kontrola ----
  const batchErr: string[] = [];
  if (!car.brandId) batchErr.push("Vyberte značku vozidla.");
  if (car.brandId && models.length && !car.modelId) batchErr.push("Vyberte model vozidla.");
  if (!car.year) batchErr.push("Vyberte ročník vozidla.");
  if (!b.city.trim()) batchErr.push("Zadajte mesto.");
  if (digits(b.phone) < 9) batchErr.push("Telefón musí mať aspoň 9 číslic.");
  const partErr = (p: Part): string[] => {
    const e: string[] = [];
    if (p.name.trim().length < 3) e.push("názov");
    if (!p.cat) e.push("kategória");
    if (!oemOptional(p.cat, vt) && oemLen(p.oem) < 4) e.push("číslo dielu");
    if (!(Number(p.price.replace(",", ".")) > 0)) e.push("cena");
    return e;
  };
  const badParts = parts.filter((p) => partErr(p).length);
  const ready = parts.length > 0 && !batchErr.length && !badParts.length;

  const description = (p: Part) => {
    const from = donor ? `Diel z rozoberaného vozidla ${carText}${donor.km != null ? `, ${donor.km.toLocaleString("sk-SK")} km` : ""}${donor.gearbox ? `, ${donor.gearbox.toLowerCase()} prevodovka` : ""}${donor.color ? `, farba ${donor.color}` : ""}.` : `${p.name.trim()} z vozidla ${carText}.`;
    return (from + (b.note.trim() ? " " + b.note.trim() : "")).slice(0, 1000);
  };
  async function publish() {
    setTried(true); setMsg("");
    if (!ready) return setMsg(batchErr[0] || (badParts.length ? `Doplňte údaje pri ${badParts.length} ${plural(badParts.length, "dieli", "dieloch", "dieloch")} (označené červenou).` : "Najprv vytvorte aspoň jeden diel z fotiek."));
    setBusy(true); setDone(0);
    let ok = 0; const left: Part[] = [];
    for (let k = 0; k < parts.length; k++) {
      const p = parts[k];
      const cond = (p.cond || b.cond) as Condition;
      const input: ListingInput = {
        name: p.name.trim(), brandId: car.brandId, modelId: car.modelId, engineId: car.engineId, year: car.year, vtype: vt,
        categoryId: p.cat, subcategoryId: cat.subcategories.find((s) => s.categoryId === p.cat && s.name === p.sub)?.id ?? null,
        oem: p.oem.trim(), partMaker: "", price: Math.round(Number(p.price.replace(",", ".")) * 100) / 100, city: b.city.trim(), condition: cond,
        description: description(p), warranty: firm && cond === "Nový" ? "24 mesiacov" : b.warranty, shipping: b.shipping, phone: b.phone.trim(),
        side: p.side, gearbox: donor?.gearbox || "", km: donor?.km ?? null, tested: false, returns14: false, fits: [], specs: {}, donorId: donor?.id ?? null,
      };
      try { await saveListing(uid, null, input, p.files.map((file) => ({ file, url: "" })), []); ok++; }
      catch (e) { left.push({ ...p, err: skError(e) }); }
      setDone(k + 1);
    }
    setBusy(false);
    const gone = new Set(parts.filter((p) => !left.some((l) => l.id === p.id)).flatMap((p) => p.files));
    setParts(left); setFiles((f) => f.filter((x) => !gone.has(x))); setTried(false);
    if (ok) onDone(`Zverejnené: ${ok} ${plural(ok, "inzerát", "inzeráty", "inzerátov")}`);
    if (left.length) setMsg(`${left.length} ${plural(left.length, "diel sa nepodarilo", "diely sa nepodarilo", "dielov sa nepodarilo")} uložiť – pozrite chybu pri dieli.`);
  }

  const missingProfile = !prof?.city || digits(prof?.phone || "") < 9;
  return (
    <div className="fp">
      <div className="pp-box">
        <h2>1. Vozidlo a podmienky – raz pre všetky diely</h2>
        {donors.length > 0 && (
          <label className="fp-donor">Rozoberané vozidlo<select value={donorId ?? ""} onChange={(e) => pickDonor(e.target.value ? Number(e.target.value) : null)}>
            <option value="">Iné vozidlo (vyberiem nižšie)</option>
            {donors.map((d) => <option key={d.id} value={d.id}>{carName(d, cat, true)}, {d.year}</option>)}</select></label>
        )}
        {!donor && <>
          <div className="pp-vt" role="radiogroup" aria-label="Druh vozidla"><span className="lt">Druh vozidla</span>{VEHICLE_TYPES.map((t) => <button key={t.id} type="button" role="radio" aria-checked={vt === t.id} className={vt === t.id ? "on" : ""} onClick={() => { if (t.id !== vt) { setVt(t.id); setCar({ brandId: 0, modelId: 0, engineId: null, year: 0 }); } }}>{t.short}</button>)}</div>
          <div className="fp-car">
            <label>Značka *<select value={car.brandId || ""} onChange={(e) => setCar({ brandId: Number(e.target.value), modelId: 0, engineId: null, year: 0 })}><option value="">Vyberte…</option>{cat.brands.filter((x) => brandIds.has(x.id)).map((x) => <option key={x.id} value={x.id}>{x.name}</option>)}</select></label>
            <label>Model *<select value={car.modelId || ""} disabled={!models.length} onChange={(e) => setCar({ ...car, modelId: Number(e.target.value), engineId: null, year: 0 })}><option value="">Vyberte…</option>{models.map((m) => <option key={m.id} value={m.id}>{m.name} ({m.yearFrom}–{m.yearTo ?? ""})</option>)}</select></label>
            <label>Motorizácia<select value={car.engineId ?? ""} disabled={!engines.length} onChange={(e) => setCar({ ...car, engineId: e.target.value ? Number(e.target.value) : null })}><option value="">Všetky / neuvedená</option>{engines.map((x) => <option key={x.id} value={x.id}>{x.name}</option>)}</select></label>
            <label>Ročník *<select value={car.year || ""} disabled={!car.modelId && models.length > 0} onChange={(e) => setCar({ ...car, year: Number(e.target.value) })}><option value="">Vyberte…</option>{years.map((y) => <option key={y}>{y}</option>)}</select></label>
          </div>
        </>}
        <div className="fp-car">
          <label>Stav (ak pri dieli nezmeníte)<select value={b.cond} onChange={(e) => { const c = e.target.value as Condition; setB({ ...b, cond: c, warranty: firm && c === "Nový" ? "24 mesiacov" : b.warranty }); }}>{CONDITIONS.map((c) => <option key={c} value={c}>{condLabel(c)}</option>)}</select></label>
          <label>Zodpovednosť za vady<select value={b.warranty} onChange={(e) => setB({ ...b, warranty: e.target.value })}>{!firm && <option value="Bez záruky">Bez záruky (súkromný predaj)</option>}<option>12 mesiacov</option><option>24 mesiacov</option></select></label>
          <label>Odovzdanie<select value={b.shipping} onChange={(e) => setB({ ...b, shipping: e.target.value })}><option>Len osobný odber</option><option>Zasielam kuriérom</option></select></label>
          <label>Mesto *<input value={b.city} maxLength={60} onChange={(e) => setB({ ...b, city: e.target.value })} /></label>
          <label>Telefón *<input value={b.phone} inputMode="tel" maxLength={30} onChange={(e) => setB({ ...b, phone: e.target.value })} /></label>
        </div>
        <label className="fp-note">Doplnok k popisu všetkých dielov (nepovinné)<input value={b.note} maxLength={300} onChange={(e) => setB({ ...b, note: e.target.value })} placeholder="napr. Diely sú odskúšané pred demontážou. Pošleme aj na dobierku." /></label>
        <p className="mute fp-hint">Popis vznikne sám: „{donor || carText ? (donor ? `Diel z rozoberaného vozidla ${carText}.` : `Názov dielu z vozidla ${carText || "…"}.`) : "Názov dielu z vozidla …"}{b.note.trim() ? " " + b.note.trim() : ""}“ Neskôr ho môžete pri každom inzeráte upraviť.</p>
        {missingProfile && <p className="mute">Tip: mesto a telefón si uložte v Profile – nabudúce sa doplnia samy.</p>}
        {tried && batchErr.length > 0 && <p className="pp-err">{batchErr.join(" ")}</p>}
      </div>

      <div className="pp-box">
        <h2>2. Nahrajte fotky</h2>
        <p className="mute">Vyberte naraz všetky fotky – napríklad celé rozobraté auto. Súbory netreba premenovávať. JPG, PNG alebo WebP; na iPhone zvoľte v Nastavenia → Fotoaparát → Formáty „Najkompatibilnejší“.</p>
        <span className="pp-bulkbtns">
          <label className="pp-add fp-pick"><input type="file" accept="image/*" multiple onChange={(e) => { addFiles(e.target.files); e.target.value = ""; }} /><span>Vybrať fotky</span></label>
          <label className="pp-add pp-folder"><input type="file" multiple {...{ webkitdirectory: "" }} onChange={(e) => { addFiles(e.target.files); e.target.value = ""; }} /><span>Vybrať celý priečinok</span></label>
          {files.length > 0 && <span className="mute">Nahraté {files.length}, nepriradené {pool.length}</span>}
        </span>
      </div>

      {pool.length > 0 && (
        <div className="pp-box fp-poolbox">
          <div className="fp-bar">
            <h2>3. Kliknutím označte fotky jedného dielu</h2>
            <span className="fp-acts">
              <span className="mute">Označené: {sel.length}</span>
              <button type="button" className="btn" disabled={!sel.length} onClick={makeOne}>Vytvoriť diel z označených</button>
              <button type="button" className="ubtn" disabled={sel.length < 2} onClick={makeEach} title="Každá označená fotka bude samostatný diel">Každá fotka = 1 diel</button>
              {sel.length > 0 && <button type="button" className="lnk" onClick={() => setSel([])}>Zrušiť označenie</button>}
            </span>
          </div>
          <ul className="fp-pool">{pool.map((f) => {
            const n = sel.indexOf(f);
            return <li key={baseName(f) + f.size}><button type="button" aria-pressed={n >= 0} className={n >= 0 ? "on" : ""} onClick={() => toggle(f)} title={baseName(f)}>
              <img src={urls.get(f)} alt={baseName(f)} loading="lazy" decoding="async" />{n >= 0 && <span className="fp-n">{n + 1}</span>}</button></li>;
          })}</ul>
          {msg && !parts.length && <p className="pp-err">{msg}</p>}
        </div>
      )}

      {parts.length > 0 && (
        <div className="pp-box">
          <h2>4. Doplňte názov, číslo dielu a cenu ({parts.length} {plural(parts.length, "diel", "diely", "dielov")})</h2>
          <datalist id="fp-names">{common.map(([n]) => <option key={n} value={n} />)}</datalist>
          <ul className="fp-parts">{parts.map((p) => {
            const e = tried ? partErr(p) : [];
            return (
              <li key={p.id} className={e.length || p.err ? "bad" : ""}>
                <div className="fp-ph">{p.files.map((f, k) => <span key={k} className="fp-th"><img src={urls.get(f)} alt="" />{k === 0 && <em>hlavná</em>}<button type="button" aria-label="Vrátiť fotku medzi nepriradené" onClick={() => dropPhoto(p.id, f)}>×</button></span>)}</div>
                <div className="fp-f">
                  <label className="fp-name">Názov dielu *<input list="fp-names" value={p.name} maxLength={120} onChange={(e) => setName(p.id, e.target.value)} placeholder="napr. Predné svetlo ľavé" /></label>
                  <label className="fp-cat">Kategória *<select value={p.cat} onChange={(e) => upd(p.id, { cat: e.target.value, sub: "" })}><option value="">Vyberte…</option>{cats.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}</select></label>
                  <label>Podkategória<select value={p.sub} disabled={!p.cat} onChange={(e) => upd(p.id, { sub: e.target.value })}><option value="">Nevyberať</option>{cat.subcategories.filter((x) => x.categoryId === p.cat).sort((a, c) => a.sort - c.sort).map((x) => <option key={x.id} value={x.name}>{x.name}</option>)}</select></label>
                  <label className="fp-oem">Číslo dielu (OEM){oemOptional(p.cat, vt) ? "" : " *"}<span className="oemin"><input value={p.oem} maxLength={40} onChange={(e) => upd(p.id, { oem: e.target.value })} placeholder="napr. 5E1941015" autoComplete="off" /><ScanText kind="oem" onResult={(x) => upd(p.id, { oem: x })} /></span></label>
                  <label>Cena € *<input value={p.price} inputMode="decimal" maxLength={10} onChange={(e) => upd(p.id, { price: e.target.value })} placeholder="€" /></label>
                  <label>Stav<select value={p.cond} onChange={(e) => upd(p.id, { cond: e.target.value as Condition | "" })}><option value="">{condLabel(b.cond)} (ako všetky)</option>{CONDITIONS.filter((c) => c !== b.cond).map((c) => <option key={c} value={c}>{condLabel(c)}</option>)}</select></label>
                  <label>Strana<select value={p.side} onChange={(e) => upd(p.id, { side: e.target.value })}><option value="">—</option><option>Ľavá</option><option>Pravá</option></select></label>
                </div>
                {(e.length > 0 || p.err) && <p className="pp-err">{p.err || `Doplňte: ${e.join(", ")}.`}</p>}
                <button type="button" className="lnk fp-rm" onClick={() => removePart(p.id)}>Zrušiť diel (fotky sa vrátia)</button>
              </li>
            );
          })}</ul>
          {msg && <p className="pp-err">{msg}</p>}
          <div className="pp-actions"><button className="btn" disabled={busy} onClick={publish}>{busy ? `Zverejňujem ${done} / ${parts.length}…` : `Zverejniť ${parts.length} ${plural(parts.length, "inzerát", "inzeráty", "inzerátov")}`}</button></div>
        </div>
      )}
    </div>
  );
}
