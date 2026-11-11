"use client";
// Formulár inzerátu v 5 krokoch: Diel → Auto → Stav, cena a podmienky → Fotky a popis → Kontakt.
// Povinné polia podľa CLAUDE.md; tie isté pravidlá stráži aj databáza (04_funkcie.sql).
import { useEffect, useMemo, useRef, useState } from "react";
import type { Catalog, Condition, Specs, VehicleType } from "@/lib/types";
import { CONDITIONS, condLabel, isUniversal, PCDS, RIM_DIAMETERS, SEASONS, SPEC_LABEL, specsErrors, VEHICLE_TYPES, WHEEL_CAT, wheelDefaults, wheelKind, wheelMissing, type WheelKind } from "@/lib/types";
import { carName } from "@/lib/seo";
import { saveListing, skError, type Donor, type ListingInput, type MyListing, type PhotoItem, type Profile } from "@/lib/seller";
import ScanText from "../ScanText";

const STEPS = ["Diel", "Auto", "Stav, cena a podmienky", "Fotky a popis", "Kontakt"];
const MAX_PHOTOS = 8;
/** Ktoré parametre patria k druhu ponuky (ostatné sa pri uložení vynechajú). */
const WHEEL_KEYS: Record<WheelKind, (keyof Specs)[]> = {
  pneu: ["tw", "tp", "rd", "season", "tread", "dot", "li", "si", "pcs"],
  disk: ["rd", "pcd", "rw", "et", "cb", "mat", "pcs"],
  kolesa: ["tw", "tp", "rd", "season", "tread", "dot", "li", "si", "pcd", "rw", "et", "cb", "mat", "pcs"],
  ine: [],
};
type Key = "name" | "cat" | "sub" | "oem" | "specs" | "brand" | "model" | "year" | "cond" | "price" | "war" | "ship" | "photos" | "desc" | "city" | "phone";
const STEP_OF: Record<Key, number> = { name: 0, cat: 0, sub: 0, oem: 0, specs: 0, brand: 1, model: 1, year: 1, cond: 2, price: 2, war: 2, ship: 2, photos: 3, desc: 3, city: 4, phone: 4 };
const MSG: Record<Key, string> = {
  name: "Názov dielu musí mať aspoň 3 znaky.", cat: "Vyberte kategóriu.", oem: "Zadajte kód súčiastky / OEM číslo (aspoň 4 písmená alebo číslice).",
  brand: "Vyberte značku auta.", model: "Vyberte model.", year: "Vyberte ročník.", cond: "Vyberte stav.", price: "Zadajte cenu väčšiu ako 0 €.",
  war: "Vyberte záruku.", ship: "Vyberte odovzdanie.", photos: "Pridajte aspoň 1 fotku.", desc: "Popis musí mať aspoň 20 znakov.",
  specs: "Doplňte alebo opravte parametre označené červenou (rozmer, rozteč, počet kusov…).",
  sub: "Vyberte, čo predávate – pneumatiky, disky alebo kolesá.",
  city: "Zadajte mesto.", phone: "Telefón musí mať aspoň 9 číslic.",
};

export default function ListingForm({ uid, cat, prof, edit, donor, onSaved }: { uid: string; cat: Catalog; prof: Profile | null; edit: MyListing | null; donor?: Donor | null; onSaved: (id: number) => void }) {
  const [step, setStep] = useState(0);
  const [v, setV] = useState({
    name: edit?.name || "", categoryId: edit?.categoryId || "", subcategoryId: edit?.subcategoryId ?? null as number | null,
    oem: edit?.oem || "", partMaker: edit?.partMaker || "",
    brandId: edit?.brandId ?? donor?.brandId ?? 0, modelId: edit?.modelId ?? donor?.modelId ?? 0, engineId: edit ? edit.engineId : donor?.engineId ?? null as number | null, year: edit?.year ?? donor?.year ?? 0,
    gearbox: edit?.gearbox || donor?.gearbox || "", km: edit?.km != null ? String(edit.km) : donor?.km != null ? String(donor.km) : "", side: edit?.side || "",
    condition: (edit?.condition || "") as Condition | "", price: edit ? String(edit.price) : "", warranty: edit?.warranty || (prof?.type === "Súkromná osoba" ? "Bez záruky" : "12 mesiacov"),
    shipping: edit?.shipping || "Len osobný odber", tested: edit?.tested ?? false, returns14: edit?.returns14 ?? false,
    description: edit?.description || "", city: edit?.city || prof?.city || "", phone: edit?.phone || prof?.phone || "",
  });
  const [fits, setFits] = useState(edit?.fits || []);
  const [specs, setSpecs] = useState<Specs>(edit?.specs || {});
  const startModel = cat.models.find((m) => m.id === (edit?.modelId ?? donor?.modelId));
  const [vt, setVt] = useState<VehicleType>(() => {
    if (startModel?.vehicleType) return startModel.vehicleType;
    if (edit?.vtype) return edit.vtype;
    if (edit || donor) return "osobne";
    try { const x = localStorage.getItem("rozoberacka-druh"); if (x && VEHICLE_TYPES.some((t) => t.id === x)) return x as VehicleType; } catch {} // naposledy zvolený druh
    return "osobne";
  });
  const [photos, setPhotos] = useState<PhotoItem[]>(edit?.photos.map((p) => ({ path: p.path, url: p.url })) || []);
  const [bad, setBad] = useState<Set<Key>>(new Set());
  const [busy, setBusy] = useState(false), [err, setErr] = useState("");
  const top = useRef<HTMLDivElement>(null);
  const firm = (prof?.type || "Firma") === "Firma";
  const set = <K extends keyof typeof v>(k: K, val: (typeof v)[K]) => { setV((o) => ({ ...o, [k]: val })); };

  const vtOf = (m: { vehicleType?: VehicleType }) => m.vehicleType || "osobne";
  const vtModels = cat.models.filter((m) => vtOf(m) === vt);
  const vtBrands = useMemo(() => { const ids = new Set(vtModels.map((m) => m.brandId)); return cat.brands.filter((b) => ids.has(b.id)); }, [vtModels, cat.brands]);
  const vtCats = cat.categories.filter((c) => !c.vtypes?.length || c.vtypes.includes(vt));
  const models = vtModels.filter((m) => m.brandId === v.brandId);
  const wheel = v.categoryId === WHEEL_CAT;
  const subName = cat.subcategories.find((x) => x.id === v.subcategoryId)?.name;
  const kind: WheelKind | null = wheel ? (v.subcategoryId ? wheelKind(subName) : null) : null;
  const missing = kind ? wheelMissing(kind, specs, v.condition === "Nový") : [];
  const specBad = wheel ? [...new Set([...specsErrors(specs), ...missing])] : [];
  const setSpec = (k: keyof Specs, val: string) => { setSpecs((o) => ({ ...o, [k]: val })); clear("specs"); };
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
    const univ = isUniversal(v.categoryId);   // pneumatiky, výbava jazdca, príslušenstvo, iné: auto a číslo dielu nepovinné
    if ((!univ || v.oem.trim()) && v.oem.replace(/[^A-Za-z0-9]/g, "").length < 4) b.add("oem");
    if (wheel && !v.subcategoryId) b.add("sub");
    if (wheel && specBad.length) b.add("specs");
    if (!univ || v.brandId) {
      if (!v.brandId) b.add("brand");
      if (!v.modelId) b.add("model");
      if (!v.year && !univ) b.add("year");
    }
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
  const cur = check(); // aktuálne chýbajúce polia (krok je „hotový“ len keď je vyplnený)
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
      phone: v.phone, km: isUniversal(v.categoryId) ? null : v.km ? Math.max(0, parseInt(v.km.replace(/\D/g, ""), 10) || 0) : null,
      vtype: vt, tested: wheel ? false : v.tested, returns14: v.returns14, fits,
      specs: kind ? Object.fromEntries(WHEEL_KEYS[kind].filter((k) => specs[k]).map((k) => [k, specs[k]])) : {},
      side: isUniversal(v.categoryId) ? "" : v.side, gearbox: isUniversal(v.categoryId) ? "" : v.gearbox, donorId: edit ? edit.donorId : donor?.id ?? null,
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

  const reqK = kind === "kolesa" ? (["pcs"] as (keyof Specs)[]) : kind ? wheelMissing(kind, {}, v.condition === "Nový") : [];
  const SI = (k: keyof Specs, el: React.ReactNode) => <label key={k} className={specBad.includes(k) ? "bad" : ""}><span>{SPEC_LABEL[k]}{reqK.includes(k) && <em>*</em>}</span>{el}</label>;
  const L = ({ k, t, req = true, children }: { k?: Key; t: string; req?: boolean; children: React.ReactNode }) => (
    <label className={k && bad.has(k) ? "bad" : ""}><span className="lt">{t}{req && <em>*</em>}</span>{children}{k && bad.has(k) && <small className="pp-ferr">{MSG[k]}</small>}</label>
  );

  return (
    <div ref={top}>
      <header className="pp-h"><h1>{edit ? "Upraviť inzerát" : "Pridať inzerát"}</h1><span className="mute">Polia s <em className="req">*</em> sú povinné.</span></header>
      {firm && prof && (!prof.ico || !prof.address) && <p className="pp-warnbox" role="alert">Ako podnikateľ musíte mať v profile vyplnené <b>IČO a sídlo</b> – kupujúci musí vedieť, s kým uzatvára zmluvu. Bez nich inzerát nezverejníte. Doplňte ich v záložke Profil.</p>}
      {donor && !edit && <p className="pp-donor-note">Diel z auta na diely <b>{carName(donor, cat, true)}, {donor.year}{donor.km != null ? `, ${donor.km.toLocaleString("sk-SK")} km` : ""}</b>. Údaje o aute sú predvyplnené.</p>}
      <ol className="pp-steps">{STEPS.map((s, i) => (
        <li key={s}><button type="button" aria-current={i === step ? "step" : undefined} className={(i !== step && i < step && !stepBad(i, cur) ? "done " : "") + (stepBad(i) ? "bad" : "")} onClick={() => goStep(i)} aria-label={`Krok ${i + 1}: ${s}`}><span>{i + 1}</span><em>{s}</em></button></li>
      ))}</ol>
      <div className="pp-form pp-grid pp-card">
        {step === 0 && <>
          <div className="full pp-vt pp-vt-big" role="radiogroup" aria-label="Druh vozidla"><span className="lt">Na aké vozidlo je diel? <em>*</em><small className="mute">Podľa toho ho nájdu správni kupujúci – diel na motorku uvidia len tí, čo hľadajú diely na motorky.</small></span>
            {VEHICLE_TYPES.map((t) => <button key={t.id} type="button" role="radio" aria-checked={vt === t.id} className={vt === t.id ? "on" : ""} onClick={() => {
              if (t.id === vt) return; setVt(t.id); try { localStorage.setItem("rozoberacka-druh", t.id); } catch {}
              set("brandId", 0); set("modelId", 0); set("engineId", null); set("year", 0);
              const c = cat.categories.find((x) => x.id === v.categoryId); if (c?.vtypes?.length && !c.vtypes.includes(t.id)) { set("categoryId", ""); set("subcategoryId", null); }
            }}>{t.name}</button>)}
          </div>
          <div className="full">{L({ k: "name", t: wheel ? "Názov inzerátu" : "Názov dielu", children: <input value={v.name} maxLength={120} placeholder={wheel ? "napr. Zimné pneumatiky Michelin Alpin 6 205/55 R16" : "napr. Predné ľavé svetlo LED"} onChange={(e) => { set("name", e.target.value); clear("name"); }} /> })}</div>
          {L({ k: "cat", t: "Kategória", children: <select value={v.categoryId} onChange={(e) => { set("categoryId", e.target.value); set("subcategoryId", null); clear("cat"); clear("sub"); }}><option value="">Vyberte…</option>{vtCats.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}</select> })}
          {L({ k: "sub", t: wheel ? "Čo predávate?" : "Podkategória", req: wheel, children: <select value={v.subcategoryId ?? ""} disabled={!subs.length} onChange={(e) => {
            const id = e.target.value ? Number(e.target.value) : null; set("subcategoryId", id); clear("sub");
            if (wheel) { const d = wheelDefaults(cat.subcategories.find((x) => x.id === id)?.name); if (Object.keys(d).length) { setSpecs((o) => ({ ...o, ...d })); clear("specs"); } }
          }}><option value="">{!v.categoryId ? "Najprv vyberte kategóriu" : wheel ? "Vyberte…" : "Nevybraná"}</option>{subs.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}</select> })}
          {kind !== "pneu" && L({ k: "oem", t: isUniversal(v.categoryId) ? "Číslo dielu (OEM) – nepovinné" : "Kód súčiastky / OEM číslo", req: !isUniversal(v.categoryId), children: <span className="oemin"><input value={v.oem} maxLength={40} placeholder={wheel ? "napr. 5E0601025 (originálne disky)" : "napr. 5E1941015"} onChange={(e) => { set("oem", e.target.value); clear("oem"); }} />
            <ScanText kind="oem" onResult={(x) => { set("oem", x); clear("oem"); }} /></span> })}
          {L({ t: kind === "pneu" ? "Značka pneumatík" : kind === "disk" ? "Výrobca diskov" : kind === "kolesa" ? "Značka pneumatík / diskov" : "Výrobca dielu", req: false,
            children: <input value={v.partMaker} maxLength={60} placeholder={kind === "pneu" ? "Michelin, Continental, Nokian…" : kind === "disk" ? "originál Škoda, BBS, Borbet, OZ…" : kind === "kolesa" ? "Continental / originál VW" : "Bosch, Valeo, Hella…"} onChange={(e) => set("partMaker", e.target.value)} /> })}
          {!isUniversal(v.categoryId) && <p className="full mute pp-hint"><b>Číslo dielu je najdôležitejší údaj inzerátu.</b> Nájdete ho na štítku alebo vyrazené na diele. Kupujúci podľa neho overí, že diel pasuje – aj pri rovnakom modeli auta sa diely líšia podľa motora, výbavy či roku. Web podľa čísla spojí aj rovnaké diely iných áut.</p>}
          {wheel && !kind && <p className="full mute pp-hint">Najprv vyberte, <b>čo predávate</b> – podľa toho sa ukážu správne polia (rozmer pneumatiky, rozteč disku…).</p>}
          {kind && kind !== "ine" && <div className={"full pp-specs" + (bad.has("specs") ? " bad" : "")}>
            <b>{kind === "pneu" ? "Rozmer a stav pneumatík" : kind === "disk" ? "Rozmer diskov" : "Rozmer pneumatík a diskov"}</b>
            <span className="mute">Polia s <em className="req">*</em> sú povinné – kupujúci podľa nich hľadajú.{kind !== "disk" && " Rozmer nájdete na boku pneumatiky (napr. 205/55 R16 91V), rok výroby v kóde DOT (posledné 4 číslice, napr. 2321 = 2021)."}{kind !== "pneu" && " Rozmer disku je vyrazený na jeho zadnej strane (napr. 7Jx16 ET49)."}{kind === "kolesa" && <> <b>Stačí rozmer pneumatiky alebo rozmer disku</b> – vyplňte, čo viete; čím viac údajov, tým ľahšie vás kupujúci nájde.</>}</span>
            <div className="pp-specg">
              {kind !== "disk" && <fieldset><legend>Pneumatika</legend>
                {SI("tw", <input inputMode="numeric" placeholder="205" value={specs.tw || ""} onChange={(e) => setSpec("tw", e.target.value)} />)}
                {SI("tp", <input inputMode="numeric" placeholder="55" value={specs.tp || ""} onChange={(e) => setSpec("tp", e.target.value)} />)}
                {SI("rd", <select value={specs.rd || ""} onChange={(e) => setSpec("rd", e.target.value)}><option value="">–</option>{RIM_DIAMETERS.map((d) => <option key={d} value={d}>R{d}</option>)}</select>)}
                {SI("season", <select value={specs.season || ""} onChange={(e) => setSpec("season", e.target.value)}><option value="">–</option>{SEASONS.map((x) => <option key={x}>{x}</option>)}</select>)}
                {SI("tread", <input inputMode="decimal" placeholder="6" value={specs.tread || ""} onChange={(e) => setSpec("tread", e.target.value)} />)}
                {SI("dot", <input inputMode="numeric" placeholder="2021" value={specs.dot || ""} onChange={(e) => setSpec("dot", e.target.value)} />)}
                {SI("li", <input placeholder="91" value={specs.li || ""} onChange={(e) => setSpec("li", e.target.value)} />)}
                {SI("si", <input placeholder="V" maxLength={2} value={specs.si || ""} onChange={(e) => setSpec("si", e.target.value.toUpperCase())} />)}
              </fieldset>}
              {kind !== "pneu" && <fieldset><legend>Disk</legend>
                {kind === "disk" && SI("rd", <select value={specs.rd || ""} onChange={(e) => setSpec("rd", e.target.value)}><option value="">–</option>{RIM_DIAMETERS.map((d) => <option key={d} value={d}>R{d}</option>)}</select>)}
                {SI("pcd", <><input list="pp-pcds" placeholder="5x112" value={specs.pcd || ""} onChange={(e) => setSpec("pcd", e.target.value)} /><datalist id="pp-pcds">{PCDS.map((x) => <option key={x} value={x} />)}</datalist></>)}
                {SI("rw", <input inputMode="decimal" placeholder="7" value={specs.rw || ""} onChange={(e) => setSpec("rw", e.target.value)} />)}
                {SI("et", <input inputMode="numeric" placeholder="49" value={specs.et || ""} onChange={(e) => setSpec("et", e.target.value)} />)}
                {SI("cb", <input inputMode="decimal" placeholder="57.1" value={specs.cb || ""} onChange={(e) => setSpec("cb", e.target.value)} />)}
                {SI("mat", <select value={specs.mat || ""} onChange={(e) => setSpec("mat", e.target.value)}><option value="">–</option><option>Hliník</option><option>Oceľ</option></select>)}
              </fieldset>}
              <fieldset><legend>Sada</legend>
                {SI("pcs", <input inputMode="numeric" placeholder="4" value={specs.pcs || ""} onChange={(e) => setSpec("pcs", e.target.value)} />)}
              </fieldset>
            </div>
            {bad.has("specs") && <small className="pp-ferr">{MSG.specs}{missing.length ? ` Chýba: ${missing.map((k) => SPEC_LABEL[k].toLowerCase()).join(", ")}.` : ""}</small>}
            {kind !== "disk" && <small className="mute">Dezén zmerajte v strede pneumatiky (pri nových pneumatikách nepovinné).</small>}
          </div>}
        </>}
        {step === 1 && <>
          {isUniversal(v.categoryId) && <p className="full pp-resp">Pri kategórii <b>{cat.categories.find((c) => c.id === v.categoryId)?.name}</b> auto vyplniť <b>nemusíte</b> – diel sa ukáže pri všetkých vozidlách zvoleného druhu ({VEHICLE_TYPES.find((t) => t.id === vt)?.name.toLowerCase()}). Auto vyberte len vtedy, ak sa diel hodí iba naň (napr. originálne disky na konkrétny model).</p>}
          {L({ k: "brand", t: "Značka auta", req: !isUniversal(v.categoryId), children: <select value={v.brandId || ""} onChange={(e) => { set("brandId", Number(e.target.value)); set("modelId", 0); set("engineId", null); set("year", 0); clear("brand"); }}><option value="">Vyberte…</option>{vtBrands.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}</select> })}
          {L({ k: "model", t: "Model", req: !isUniversal(v.categoryId) || !!v.brandId, children: <select value={v.modelId || ""} disabled={!models.length} onChange={(e) => { set("modelId", Number(e.target.value)); set("engineId", null); set("year", 0); clear("model"); }}><option value="">Vyberte…</option>{models.map((m) => <option key={m.id} value={m.id}>{m.name} ({m.yearFrom}–{m.yearTo ?? ""})</option>)}</select> })}
          {L({ t: "Motorizácia", req: false, children: <select value={v.engineId ?? ""} disabled={!engines.length} onChange={(e) => set("engineId", e.target.value ? Number(e.target.value) : null)}><option value="">Všetky motorizácie</option>{engines.map((x) => <option key={x.id} value={x.id}>{x.name}</option>)}</select> })}
          {L({ k: "year", t: "Ročník auta", req: !isUniversal(v.categoryId), children: <select value={v.year || ""} disabled={!v.modelId} onChange={(e) => { set("year", Number(e.target.value)); clear("year"); }}><option value="">Vyberte…</option>{years.map((y) => <option key={y}>{y}</option>)}</select> })}
          {!isUniversal(v.categoryId) && <>{L({ t: "Prevodovka auta", req: false, children: <select value={v.gearbox} onChange={(e) => set("gearbox", e.target.value)}><option value="">Neuvedená</option><option>Manuálna</option><option>Automatická</option></select> })}
          {L({ t: "Najazdené km auta", req: false, children: <input value={v.km} inputMode="numeric" placeholder="napr. 184000" onChange={(e) => set("km", e.target.value)} /> })}
          {L({ t: "Strana auta", req: false, children: <select value={v.side} onChange={(e) => set("side", e.target.value)}><option value="">Neuvádza sa</option><option>Ľavá</option><option>Pravá</option></select> })}</>}
          {(!isUniversal(v.categoryId) || kind === "disk" || kind === "kolesa") && <div className="full pp-fits"><b>Pasuje aj na ďalšie autá</b><span className="mute">Nepovinné. Diel sa zobrazí aj pri hľadaní podľa týchto áut.</span>
            <div className="pp-fitrow">
              <select value={fb || ""} onChange={(e) => { setFb(Number(e.target.value)); setFm(0); setFe(0); }} aria-label="Značka"><option value="">Značka</option>{vtBrands.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}</select>
              <select value={fm || ""} disabled={!fb} onChange={(e) => { setFm(Number(e.target.value)); setFe(0); }} aria-label="Model"><option value="">Všetky modely</option>{vtModels.filter((m) => m.brandId === fb).map((m) => <option key={m.id} value={m.id}>{m.name}</option>)}</select>
              <select value={fe || ""} disabled={!fm} onChange={(e) => setFe(Number(e.target.value))} aria-label="Motorizácia"><option value="">Všetky motorizácie</option>{cat.engines.filter((x) => x.modelId === fm).map((x) => <option key={x.id} value={x.id}>{x.name}</option>)}</select>
              <button type="button" className="ubtn" disabled={!fb} onClick={() => {
                const f = { brandId: fb, modelId: fm || null, engineId: fe || null };
                if (!fits.some((x) => x.brandId === f.brandId && x.modelId === f.modelId && x.engineId === f.engineId)) setFits([...fits, f]);
                setFb(0); setFm(0); setFe(0);
              }}>Pridať</button>
            </div>
            {fits.length > 0 && <ul className="pp-fitl">{fits.map((f, i) => <li key={i}>{vname(f.brandId, f.modelId, f.engineId)}<button type="button" aria-label="Odobrať" onClick={() => setFits(fits.filter((_, j) => j !== i))}>×</button></li>)}</ul>}
          </div>}
        </>}
        {step === 2 && <>
          {L({ k: "cond", t: "Stav", children: <select value={v.condition} onChange={(e) => { const c = e.target.value as Condition; set("condition", c); if (firm && c === "Nový") set("warranty", "24 mesiacov"); clear("cond"); }}><option value="">Vyberte…</option>{CONDITIONS.map((c) => <option key={c} value={c}>{condLabel(c)}</option>)}</select> })}
          {L({ k: "price", t: firm ? "Konečná cena (€) vrátane DPH" : "Cena (€)", children: <input value={v.price} inputMode="decimal" placeholder="napr. 120" onChange={(e) => { set("price", e.target.value); clear("price"); }} /> })}
          {L({ k: "war", t: "Zodpovednosť za vady (záruka)", children: <select value={v.warranty} onChange={(e) => set("warranty", e.target.value)}>{!firm && <option value="Bez záruky">Bez záruky (súkromný predaj)</option>}{!(firm && v.condition === "Nový") && <option>12 mesiacov</option>}<option>24 mesiacov</option></select> })}
          {L({ k: "ship", t: "Odovzdanie", children: <select value={v.shipping} onChange={(e) => set("shipping", e.target.value)}><option>Len osobný odber</option><option>Zasielam kuriérom</option></select> })}
          {!wheel && <label className="pp-chk"><input type="checkbox" checked={v.tested} onChange={(e) => set("tested", e.target.checked)} /><span>Diel je odskúšaný</span></label>}
          {firm
            ? <p className="full mute pp-hint">Ako podnikateľ zodpovedáte spotrebiteľovi za vady: pri novom diele 24 mesiacov, pri použitom a repasovanom môžete dobu dohodou skrátiť na 12 mesiacov (§ 619 ods. 3 Občianskeho zákonníka) – kupujúci to uvidí v inzeráte, uveďte to aj na doklade. Pri predaji na diaľku (kuriér) môže kupujúci odstúpiť od zmluvy do 14 dní – na webe sa to zobrazí automaticky. Vady, ktoré opíšete v popise, nie sú predmetom reklamácie. Toto nie je právna rada.</p>
            : <>
              <label className="pp-chk"><input type="checkbox" checked={v.returns14} onChange={(e) => set("returns14", e.target.checked)} /><span>Ponúkam vrátenie do 14 dní, ak diel nepasuje (dobrovoľne)</span></label>
              <p className="full mute pp-hint">Ako súkromná osoba zodpovedáte za vady, na ktoré kupujúceho neupozorníte (§ 597 Občianskeho zákonníka; kupujúci ich musí vytknúť do 24 mesiacov od prevzatia, podľa nového zákonníka od 1. 7. 2027 spravidla do 6 mesiacov). Všetky poškodenia preto uveďte v popise. Toto nie je právna rada.</p>
            </>}
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
          <p className="full pp-resp">Zverejnením potvrdzujete, že údaje v inzeráte sú pravdivé a diel smiete predať. <b>Za inzerát, diel, jeho stav a vybavenie reklamácie zodpovedáte vy ako predajca.</b> autosuciastky.eu je len inzertný portál – prevádzkovateľ KJ trade s. r. o. nie je stranou kúpnej zmluvy.</p>
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
