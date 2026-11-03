"use client";
// Formulár inzerátu v 5 krokoch: Diel → Auto → Stav, cena a podmienky → Fotky a popis → Kontakt.
// Povinné polia podľa CLAUDE.md; tie isté pravidlá stráži aj databáza (04_funkcie.sql).
import { useEffect, useMemo, useRef, useState } from "react";
import type { Catalog, Condition } from "@/lib/types";
import { saveListing, skError, type ListingInput, type MyListing, type PhotoItem, type Profile } from "@/lib/seller";

const STEPS = ["Diel", "Auto", "Stav, cena a podmienky", "Fotky a popis", "Kontakt"];
const MAX_PHOTOS = 8;
type Key = "name" | "cat" | "oem" | "brand" | "model" | "year" | "cond" | "price" | "war" | "ship" | "photos" | "desc" | "city" | "phone";
const STEP_OF: Record<Key, number> = { name: 0, cat: 0, oem: 0, brand: 1, model: 1, year: 1, cond: 2, price: 2, war: 2, ship: 2, photos: 3, desc: 3, city: 4, phone: 4 };
const MSG: Record<Key, string> = {
  name: "Názov dielu musí mať aspoň 3 znaky.", cat: "Vyberte kategóriu.", oem: "Zadajte kód súčiastky / OEM číslo (aspoň 4 písmená alebo číslice).",
  brand: "Vyberte značku auta.", model: "Vyberte model.", year: "Vyberte ročník.", cond: "Vyberte stav.", price: "Zadajte cenu väčšiu ako 0 €.",
  war: "Vyberte záruku.", ship: "Vyberte odovzdanie.", photos: "Pridajte aspoň 1 fotku.", desc: "Popis musí mať aspoň 20 znakov.",
  city: "Zadajte mesto.", phone: "Telefón musí mať aspoň 9 číslic.",
};

export default function ListingForm({ uid, cat, prof, edit, onSaved }: { uid: string; cat: Catalog; prof: Profile | null; edit: MyListing | null; onSaved: (id: number) => void }) {
  const [step, setStep] = useState(0);
  const [v, setV] = useState({
    name: edit?.name || "", categoryId: edit?.categoryId || "", subcategoryId: edit?.subcategoryId ?? null as number | null,
    oem: edit?.oem || "", partMaker: edit?.partMaker || "",
    brandId: edit?.brandId ?? 0, modelId: edit?.modelId ?? 0, engineId: edit?.engineId ?? null as number | null, year: edit?.year ?? 0,
    gearbox: edit?.gearbox || "", km: edit?.km != null ? String(edit.km) : "", side: edit?.side || "",
    condition: (edit?.condition || "") as Condition | "", price: edit ? String(edit.price) : "", warranty: edit?.warranty || "Bez záruky",
    shipping: edit?.shipping || "Len osobný odber", tested: edit?.tested ?? false, returns14: edit?.returns14 ?? false,
    description: edit?.description || "", city: edit?.city || prof?.city || "", phone: edit?.phone || prof?.phone || "",
  });
  const [fits, setFits] = useState(edit?.fits || []);
  const [photos, setPhotos] = useState<PhotoItem[]>(edit?.photos.map((p) => ({ path: p.path, url: p.url })) || []);
  const [bad, setBad] = useState<Set<Key>>(new Set());
  const [busy, setBusy] = useState(false), [err, setErr] = useState("");
  const top = useRef<HTMLDivElement>(null);
  const set = <K extends keyof typeof v>(k: K, val: (typeof v)[K]) => { setV((o) => ({ ...o, [k]: val })); };

  const models = cat.models.filter((m) => m.brandId === v.brandId);
  const model = cat.models.find((m) => m.id === v.modelId);
  const engines = cat.engines.filter((e) => e.modelId === v.modelId);
  const subs = cat.subcategories.filter((s) => s.categoryId === v.categoryId);
  const thisYear = new Date().getFullYear();
  const years = useMemo(() => {
    const from = model?.yearFrom ?? 1980, to = Math.min(model?.yearTo ?? thisYear, thisYear);
    const r: number[] = []; for (let y = to; y >= from; y--) r.push(y); return r;
  }, [model, thisYear]);

  useEffect(() => () => photos.forEach((p) => p.file && URL.revokeObjectURL(p.url)), []); // eslint-disable-line react-hooks/exhaustive-deps

  function check(): Set<Key> {
    const b = new Set<Key>();
    if (v.name.trim().length < 3) b.add("name");
    if (!v.categoryId) b.add("cat");
    if (v.oem.replace(/[^A-Za-z0-9]/g, "").length < 4) b.add("oem");
    if (!v.brandId) b.add("brand");
    if (!v.modelId) b.add("model");
    if (!v.year) b.add("year");
    if (!v.condition) b.add("cond");
    const pr = Number(v.price.replace(",", ".")); if (!(pr > 0)) b.add("price");
    if (!v.warranty) b.add("war");
    if (!v.shipping) b.add("ship");
    if (!photos.length) b.add("photos");
    if (v.description.trim().length < 20) b.add("desc");
    if (v.city.trim().length < 2) b.add("city");
    if (v.phone.replace(/\D/g, "").length < 9) b.add("phone");
    return b;
  }
  const stepBad = (s: number, b = bad) => [...b].some((k) => STEP_OF[k] === s);
  const clear = (k: Key) => bad.has(k) && setBad((o) => { const n = new Set(o); n.delete(k); return n; });
  const goStep = (s: number) => { setStep(s); top.current?.scrollIntoView({ behavior: "smooth", block: "start" }); };
  function next() {
    const b = check(); const mine = new Set([...b].filter((k) => STEP_OF[k] === step));
    setBad((o) => new Set([...[...o].filter((k) => STEP_OF[k] !== step), ...mine]));
    if (!mine.size) goStep(step + 1); else focusBad();
  }
  const focusBad = () => window.setTimeout(() => {
    const el = document.querySelector<HTMLElement>(".pp-form label.bad input, .pp-form label.bad select, .pp-form label.bad textarea, .pp-photos.bad .pp-add");
    el?.scrollIntoView({ behavior: "smooth", block: "center" }); if (el && el.tagName !== "LABEL") el.focus({ preventScroll: true });
  }, 60);

  async function save() {
    setErr("");
    const b = check(); setBad(b);
    if (b.size) { const first = Math.min(...[...b].map((k) => STEP_OF[k])); setErr(`Doplňte povinné polia (${b.size}). Sú označené červenou.`); setStep(first); focusBad(); return; }
    const x: ListingInput = {
      name: v.name, brandId: v.brandId, modelId: v.modelId, engineId: v.engineId, year: v.year, categoryId: v.categoryId,
      subcategoryId: v.subcategoryId, oem: v.oem, partMaker: v.partMaker, price: Math.round(Number(v.price.replace(",", ".")) * 100) / 100,
      city: v.city, condition: v.condition as Condition, description: v.description, warranty: v.warranty, shipping: v.shipping,
      phone: v.phone, side: v.side, gearbox: v.gearbox, km: v.km ? Math.max(0, parseInt(v.km.replace(/\D/g, ""), 10) || 0) : null,
      tested: v.tested, returns14: v.returns14, fits,
    };
    setBusy(true);
    try { onSaved(await saveListing(uid, edit?.id ?? null, x, photos, edit?.photos.map((p) => p.path) || [])); }
    catch (e) { setErr(skError(e)); } finally { setBusy(false); }
  }

  function addFiles(list: FileList | null) {
    if (!list) return;
    const add = [...list].filter((f) => f.type.startsWith("image/")).slice(0, MAX_PHOTOS - photos.length).map((file) => ({ file, url: URL.createObjectURL(file) }));
    if (add.length) { setPhotos((p) => [...p, ...add]); clear("photos"); }
  }
  const move = (i: number, d: number) => setPhotos((p) => { const n = [...p]; const j = i + d; if (j < 0 || j >= n.length) return p; [n[i], n[j]] = [n[j], n[i]]; return n; });

  // „Pasuje aj na“
  const [fb, setFb] = useState(0), [fm, setFm] = useState(0), [fe, setFe] = useState(0);
  const vname = (b: number, m: number | null, e: number | null) =>
    [cat.brands.find((x) => x.id === b)?.name, m ? cat.models.find((x) => x.id === m)?.name : "všetky modely", e ? cat.engines.find((x) => x.id === e)?.name : m ? "všetky motorizácie" : ""].filter(Boolean).join(" ");

  const L = ({ k, t, req = true, children }: { k?: Key; t: string; req?: boolean; children: React.ReactNode }) => (
    <label className={k && bad.has(k) ? "bad" : ""}><span className="lt">{t}{req && <em>*</em>}</span>{children}{k && bad.has(k) && <small className="pp-ferr">{MSG[k]}</small>}</label>
  );

  return (
    <div ref={top}>
      <header className="pp-h"><h1>{edit ? "Upraviť inzerát" : "Pridať inzerát"}</h1><span className="mute">Polia s <em className="req">*</em> sú povinné.</span></header>
      <ol className="pp-steps">{STEPS.map((s, i) => (
        <li key={s}><button type="button" aria-current={i === step ? "step" : undefined} className={(i < step ? "done " : "") + (stepBad(i) ? "bad" : "")} onClick={() => goStep(i)}><span>{i + 1}</span>{s}</button></li>
      ))}</ol>
      <div className="pp-form pp-grid pp-card">
        {step === 0 && <>
          <div className="full">{L({ k: "name", t: "Názov dielu", children: <input value={v.name} maxLength={120} placeholder="napr. Predné ľavé svetlo LED" onChange={(e) => { set("name", e.target.value); clear("name"); }} /> })}</div>
          {L({ k: "cat", t: "Kategória", children: <select value={v.categoryId} onChange={(e) => { set("categoryId", e.target.value); set("subcategoryId", null); clear("cat"); }}><option value="">Vyberte…</option>{cat.categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}</select> })}
          {L({ t: "Podkategória", req: false, children: <select value={v.subcategoryId ?? ""} disabled={!subs.length} onChange={(e) => set("subcategoryId", e.target.value ? Number(e.target.value) : null)}><option value="">—</option>{subs.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}</select> })}
          {L({ k: "oem", t: "Kód súčiastky / OEM číslo", children: <input value={v.oem} maxLength={40} placeholder="napr. 5E1941015" onChange={(e) => { set("oem", e.target.value); clear("oem"); }} /> })}
          {L({ t: "Výrobca dielu", req: false, children: <input value={v.partMaker} maxLength={60} placeholder="Bosch, Valeo, Hella…" onChange={(e) => set("partMaker", e.target.value)} /> })}
          <p className="full mute pp-hint">OEM číslo nájdete na štítku dielu. Podľa neho kupujúci overia, že diel pasuje, a web ho spojí s rovnakými dielmi iných áut.</p>
        </>}
        {step === 1 && <>
          {L({ k: "brand", t: "Značka auta", children: <select value={v.brandId || ""} onChange={(e) => { set("brandId", Number(e.target.value)); set("modelId", 0); set("engineId", null); set("year", 0); clear("brand"); }}><option value="">Vyberte…</option>{cat.brands.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}</select> })}
          {L({ k: "model", t: "Model", children: <select value={v.modelId || ""} disabled={!models.length} onChange={(e) => { set("modelId", Number(e.target.value)); set("engineId", null); set("year", 0); clear("model"); }}><option value="">Vyberte…</option>{models.map((m) => <option key={m.id} value={m.id}>{m.name} ({m.yearFrom}–{m.yearTo ?? ""})</option>)}</select> })}
          {L({ t: "Motorizácia", req: false, children: <select value={v.engineId ?? ""} disabled={!engines.length} onChange={(e) => set("engineId", e.target.value ? Number(e.target.value) : null)}><option value="">Všetky motorizácie</option>{engines.map((x) => <option key={x.id} value={x.id}>{x.name}</option>)}</select> })}
          {L({ k: "year", t: "Ročník auta", children: <select value={v.year || ""} disabled={!v.modelId} onChange={(e) => { set("year", Number(e.target.value)); clear("year"); }}><option value="">Vyberte…</option>{years.map((y) => <option key={y}>{y}</option>)}</select> })}
          {L({ t: "Prevodovka auta", req: false, children: <select value={v.gearbox} onChange={(e) => set("gearbox", e.target.value)}><option value="">—</option><option>Manuálna</option><option>Automatická</option></select> })}
          {L({ t: "Najazdené km auta", req: false, children: <input value={v.km} inputMode="numeric" placeholder="napr. 184000" onChange={(e) => set("km", e.target.value)} /> })}
          {L({ t: "Strana auta", req: false, children: <select value={v.side} onChange={(e) => set("side", e.target.value)}><option value="">—</option><option>Ľavá</option><option>Pravá</option></select> })}
          <div className="full pp-fits"><b>Pasuje aj na ďalšie autá</b><span className="mute">Nepovinné. Diel sa zobrazí aj pri hľadaní podľa týchto áut.</span>
            <div className="pp-fitrow">
              <select value={fb || ""} onChange={(e) => { setFb(Number(e.target.value)); setFm(0); setFe(0); }} aria-label="Značka"><option value="">Značka</option>{cat.brands.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}</select>
              <select value={fm || ""} disabled={!fb} onChange={(e) => { setFm(Number(e.target.value)); setFe(0); }} aria-label="Model"><option value="">Všetky modely</option>{cat.models.filter((m) => m.brandId === fb).map((m) => <option key={m.id} value={m.id}>{m.name}</option>)}</select>
              <select value={fe || ""} disabled={!fm} onChange={(e) => setFe(Number(e.target.value))} aria-label="Motorizácia"><option value="">Všetky motorizácie</option>{cat.engines.filter((x) => x.modelId === fm).map((x) => <option key={x.id} value={x.id}>{x.name}</option>)}</select>
              <button type="button" className="ubtn" disabled={!fb} onClick={() => {
                const f = { brandId: fb, modelId: fm || null, engineId: fe || null };
                if (!fits.some((x) => x.brandId === f.brandId && x.modelId === f.modelId && x.engineId === f.engineId)) setFits([...fits, f]);
                setFb(0); setFm(0); setFe(0);
              }}>Pridať</button>
            </div>
            {fits.length > 0 && <ul className="pp-fitl">{fits.map((f, i) => <li key={i}>{vname(f.brandId, f.modelId, f.engineId)}<button type="button" aria-label="Odobrať" onClick={() => setFits(fits.filter((_, j) => j !== i))}>×</button></li>)}</ul>}
          </div>
        </>}
        {step === 2 && <>
          {L({ k: "cond", t: "Stav", children: <select value={v.condition} onChange={(e) => { set("condition", e.target.value as Condition); clear("cond"); }}><option value="">Vyberte…</option><option>Veľmi dobrý</option><option>Dobrý</option><option>Na opravu</option></select> })}
          {L({ k: "price", t: "Cena (€)", children: <input value={v.price} inputMode="decimal" placeholder="napr. 120" onChange={(e) => { set("price", e.target.value); clear("price"); }} /> })}
          {L({ k: "war", t: "Záruka", children: <select value={v.warranty} onChange={(e) => set("warranty", e.target.value)}><option>Bez záruky</option><option>14 dní</option><option>3 mesiace</option></select> })}
          {L({ k: "ship", t: "Odovzdanie", children: <select value={v.shipping} onChange={(e) => set("shipping", e.target.value)}><option>Len osobný odber</option><option>Zasielam kuriérom</option></select> })}
          <label className="pp-chk"><input type="checkbox" checked={v.tested} onChange={(e) => set("tested", e.target.checked)} /><span>Diel je odskúšaný</span></label>
          <label className="pp-chk"><input type="checkbox" checked={v.returns14} onChange={(e) => set("returns14", e.target.checked)} /><span>Možnosť vrátenia do 14 dní</span></label>
        </>}
        {step === 3 && <>
          <div className={"full pp-photos" + (bad.has("photos") ? " bad" : "")}>
            <span className="lt">Fotky<em>*</em> <small className="mute">({photos.length}/{MAX_PHOTOS}, prvá je hlavná)</small></span>
            <div className="pp-phl">
              {photos.map((p, i) => (
                <figure key={p.url}><img src={p.url} alt={"Fotka " + (i + 1)} />
                  <figcaption><button type="button" onClick={() => move(i, -1)} disabled={!i} aria-label="Posunúť doľava">←</button><button type="button" onClick={() => move(i, 1)} disabled={i === photos.length - 1} aria-label="Posunúť doprava">→</button><button type="button" onClick={() => setPhotos(photos.filter((_, j) => j !== i))} aria-label="Odstrániť">×</button></figcaption></figure>
              ))}
              {photos.length < MAX_PHOTOS && <label className="pp-add"><input type="file" accept="image/*" multiple onChange={(e) => { addFiles(e.target.files); e.target.value = ""; }} /><span>+ Pridať fotky</span></label>}
            </div>
            {bad.has("photos") && <small className="pp-ferr">{MSG.photos}</small>}
            <small className="mute">Fotky sa pred nahraním zmenšia, aby sa stránka načítala rýchlo.</small>
          </div>
          <div className="full">{L({ k: "desc", t: "Popis", children: <><textarea value={v.description} maxLength={1000} rows={6} placeholder="Stav, poškodenia, čo je súčasťou, z akého auta…" onChange={(e) => { set("description", e.target.value); clear("desc"); }} /><small className="mute">{v.description.length} / 1000</small></> })}</div>
        </>}
        {step === 4 && <>
          {L({ k: "city", t: "Mesto", children: <input value={v.city} maxLength={60} onChange={(e) => { set("city", e.target.value); clear("city"); }} /> })}
          {L({ k: "phone", t: "Telefón", children: <input value={v.phone} inputMode="tel" placeholder="0900 123 456" onChange={(e) => { set("phone", e.target.value); clear("phone"); }} /> })}
          <p className="full mute pp-hint">Telefón sa nezobrazuje v zozname. Kupujúci ho uvidí až po kliknutí na „Zobraziť telefón“.</p>
        </>}
        {err && <p className="full pp-err" role="alert">{err}</p>}
        <div className="full pp-actions">
          {step > 0 && <button type="button" className="ubtn" onClick={() => goStep(step - 1)}>← Späť</button>}
          {step < STEPS.length - 1 && <button type="button" className="btn" onClick={next}>Ďalej →</button>}
          {(step === STEPS.length - 1 || edit) && <button type="button" className={step === STEPS.length - 1 ? "btn" : "ubtn"} disabled={busy} onClick={save}>{busy ? "Ukladám…" : edit ? "Uložiť zmeny" : "Zverejniť inzerát"}</button>}
        </div>
      </div>
    </div>
  );
}
