"use client";
// Autá na diely (v databáze donor_cars): predajca zadá vozidlo, ktoré rozoberá, raz a z neho rýchlo pridá desiatky dielov.
// Diely vzniknú pozastavené (bez fotiek); predajca doplní fotky a aktivuje ich v „Moje inzeráty“.
import { useEffect, useMemo, useState } from "react";
import type { Catalog, Condition, VehicleType } from "@/lib/types";
import { VEHICLE_TYPES } from "@/lib/types";
import { carName } from "@/lib/seo";
import { createFromDonor, deleteDonor, myDonors, saveDonor, skError, type Donor, type ListingInput, type MyListing, type Profile } from "@/lib/seller";
import ScanText from "../ScanText";

type Part = { on: boolean; custom?: boolean; name: string; cat: string; sub: string; side: string; oem: string; price: string; cond: Condition };
type Common = [string, string, string, string?][];
const CAR_COMMON: Common = [
  ["Predné svetlo ľavé", "sv", "Predné svetlá", "Ľavá"], ["Predné svetlo pravé", "sv", "Predné svetlá", "Pravá"],
  ["Zadné svetlo ľavé", "sv", "Zadné svetlá", "Ľavá"], ["Zadné svetlo pravé", "sv", "Zadné svetlá", "Pravá"],
  ["Predný nárazník", "kar", "Nárazníky"], ["Zadný nárazník", "kar", "Nárazníky"], ["Kapota", "kar", "Kapoty"],
  ["Predné dvere ľavé", "kar", "Dvere", "Ľavá"], ["Predné dvere pravé", "kar", "Dvere", "Pravá"],
  ["Zadné dvere ľavé", "kar", "Dvere", "Ľavá"], ["Zadné dvere pravé", "kar", "Dvere", "Pravá"],
  ["Blatník ľavý", "kar", "Blatníky", "Ľavá"], ["Blatník pravý", "kar", "Blatníky", "Pravá"],
  ["Spätné zrkadlo ľavé", "kar", "Spätné zrkadlá", "Ľavá"], ["Spätné zrkadlo pravé", "kar", "Spätné zrkadlá", "Pravá"],
  ["Piate dvere / veko kufra", "kar", "Veká a piate dvere"],
  ["Motor kompletný", "motor", "Motory kompletné"], ["Turbodúchadlo", "motor", "Turbodúchadlá"], ["Riadiaca jednotka motora", "motor", "Riadiace jednotky motora"],
  ["Vstrekovače (sada)", "motor", "Vstrekovače"], ["Prevodovka", "pr", "Manuálne prevodovky"],
  ["Alternátor", "el", "Alternátory"], ["Štartér", "el", "Štartéry"], ["Prístrojový panel (budíky)", "el", "Prístrojové panely"], ["Rádio / navigácia", "el", "Rádiá a navigácie"],
  ["Chladič vody", "chl", "Chladiče"], ["Kompresor klimatizácie", "chl", "Kompresory klimatizácie"],
  ["Volant", "int", "Volanty a airbagy"], ["Sedadlo vodiča", "int", "Sedadlá"], ["Disky hliníkové (sada)", "kol", "Disky hliníkové"],
  ["Airbag vodiča", "bez", "Airbagy vodiča"], ["Riadiaca jednotka airbagov", "bez", "Riadiace jednotky airbagov"],
];
const TRUCK_COMMON: Common = [
  ["Kabína", "kar", "Kabíny (nákladné)"], ["Predný nárazník", "kar", "Nárazníky"], ["Maska", "kar", "Masky a mriežky"],
  ["Spätné zrkadlo ľavé", "kar", "Spätné zrkadlá", "Ľavá"], ["Spätné zrkadlo pravé", "kar", "Spätné zrkadlá", "Pravá"],
  ["Predné svetlo ľavé", "sv", "Predné svetlá", "Ľavá"], ["Predné svetlo pravé", "sv", "Predné svetlá", "Pravá"],
  ["Zadné svetlo ľavé", "sv", "Zadné svetlá", "Ľavá"], ["Zadné svetlo pravé", "sv", "Zadné svetlá", "Pravá"],
  ["Motor kompletný", "motor", "Motory kompletné"], ["Turbodúchadlo", "motor", "Turbodúchadlá"], ["Riadiaca jednotka motora", "motor", "Riadiace jednotky motora"],
  ["Vstrekovače (sada)", "motor", "Vstrekovače"], ["Prevodovka", "pr", "Manuálne prevodovky"], ["Retardér", "pr", "Retardéry"], ["Kardan", "pr", "Kardany"],
  ["Zadná náprava", "pod", "Nápravy (nákladné)"], ["Vzduchový kompresor", "brz", "Vzduchové brzdy a kompresory"],
  ["Alternátor", "el", "Alternátory"], ["Štartér", "el", "Štartéry"], ["Tachograf", "el", "Tachografy"], ["Prístrojový panel (budíky)", "el", "Prístrojové panely"],
  ["Chladič vody", "chl", "Chladiče"], ["Nezávislé kúrenie", "chl", "Nezávislé kúrenie (Webasto, Eberspächer)"], ["AdBlue nádrž a čerpadlo", "pal", "AdBlue systém"],
  ["Sedadlo vodiča", "int", "Sedadlá"], ["Disky (sada)", "kol", "Disky oceľové"],
];
const LORRY_EXTRA: Common = [["Hydraulická ruka", "nad", "Hydraulické ruky a žeriavy"], ["Točnica", "nad", "Točnice a ťažné zariadenia"], ["Sklápacia nadstavba", "nad", "Sklápače a valníky"]];
const BUS_EXTRA: Common = [["Dvere s ovládaním", "bus", "Dvere a ovládanie dverí"], ["Sedadlá pre cestujúcich", "bus", "Sedadlá pre cestujúcich"], ["Klimatizácia autobusu", "bus", "Klimatizácia autobusu"], ["Informačný panel", "bus", "Informačné panely"]];
const MOTO_COMMON: Common = [
  ["Motor kompletný", "motor", "Motory kompletné"], ["Riadiaca jednotka motora", "motor", "Riadiace jednotky motora"], ["Rám", "mrm", "Rámy"],
  ["Kapotáž (sada)", "mrm", "Kapotáže a plasty"], ["Nádrž", "mrm", "Nádrže"], ["Sedlo", "mrm", "Sedlá"], ["Predný blatník", "mrm", "Blatníky"], ["Plexi štít", "mrm", "Plexi a štíty"],
  ["Predná vidlica", "mvi", "Predné vidlice"], ["Zadný tlmič", "mvi", "Zadné tlmiče"], ["Kyvná vidlica", "mvi", "Kyvné vidlice"],
  ["Riadidlá", "mri", "Riadidlá"], ["Tachometer / prístroje", "mri", "Prístroje a tachometre"], ["Zrkadlo ľavé", "mri", "Zrkadlá", "Ľavá"], ["Zrkadlo pravé", "mri", "Zrkadlá", "Pravá"],
  ["Predné svetlo", "sv", "Predné svetlá"], ["Zadné svetlo", "sv", "Zadné svetlá"], ["Smerovky (sada)", "sv", "Smerovky"],
  ["Reťazová sada", "mpo", "Reťazové sady"], ["Výfuk", "pal", "Výfuky"], ["Predný brzdový strmeň", "brz", "Strmene"], ["Brzdový kotúč", "brz", "Kotúče"],
  ["Predný disk (koleso)", "kol", "Disky hliníkové"], ["Zadný disk (koleso)", "kol", "Disky hliníkové"], ["Štartér", "el", "Štartéry"],
];
function commonFor(t: VehicleType): Common {
  if (t === "motorky") return MOTO_COMMON;
  if (t === "nakladne") return [...TRUCK_COMMON, ...LORRY_EXTRA];
  if (t === "autobusy") return [...TRUCK_COMMON.filter(([n]) => n !== "Kabína"), ...BUS_EXTRA];
  return CAR_COMMON;
}
const typeOf = (cat: Catalog, modelId: number): VehicleType => cat.models.find((m) => m.id === modelId)?.vehicleType || "osobne";
const VIN_RE = /^[A-HJ-NPR-Z0-9]{17}$/;
const emptyCar = (): Omit<Donor, "id" | "createdAt"> => ({ brandId: 0, modelId: 0, engineId: null, year: 0, km: null, gearbox: "", color: "", vin: "", dismantledAt: "", note: "" });

export default function Donors({ uid, cat, prof, items, onAddOne, onSellCar, onDone }: {
  uid: string; cat: Catalog; prof: Profile | null; items: MyListing[];
  onAddOne: (d: Donor) => void; onSellCar?: (d: Donor) => void; onDone: (msg: string) => void;
}) {
  const [list, setList] = useState<Donor[] | null>(null);
  const [err, setErr] = useState("");
  const [edit, setEdit] = useState<{ id: number | null; v: Omit<Donor, "id" | "createdAt"> } | null>(null);
  const [quick, setQuick] = useState<Donor | null>(null);
  const [confirm, setConfirm] = useState<number | null>(null);
  const reload = () => myDonors().then(setList).catch((e) => setErr(skError(e)));
  useEffect(() => { reload(); }, []);

  if (edit) return <CarForm cat={cat} init={edit.v} isNew={edit.id == null} onCancel={() => setEdit(null)} onSave={async (v) => {
    const id = await saveDonor(uid, v, edit.id); setEdit(null); await reload(); onDone(edit.id == null ? "Vozidlo pridané – teraz z neho pridajte diely" : "Vozidlo uložené");
    if (edit.id == null) setQuick({ ...v, id, createdAt: new Date().toISOString() });
  }} />;
  if (quick) return <QuickAdd uid={uid} cat={cat} prof={prof} donor={quick} onCancel={() => setQuick(null)} onDone={(n) => { setQuick(null); onDone(`Vytvorené: ${n} inzerátov. Sú pozastavené – doplňte fotky a aktivujte ich.`); }} />;

  return (
    <div>
      <header className="pp-h"><h1>Autá na diely</h1><button className="btn" onClick={() => setEdit({ id: null, v: emptyCar() })}>+ Pridať vozidlo</button></header>
      <p className="mute pp-note"><b>Rozoberáte auto, dodávku, kamión alebo motorku?</b> Zapíšte vozidlo raz a jedným formulárom z neho pridajte desiatky dielov – značka, model, motor, ročník, km a prevodovka sa pri každom diele vyplnia samy. Kupujúci pri dieli uvidí, z akého vozidla je, a nájde aj ďalšie diely z neho. VIN vidíte len vy.{onSellCar ? " Ak chcete predať vozidlo celé, použite „Predať celé vozidlo“." : ""}</p>
      {err && <p className="pp-err">{err}</p>}
      {list && !list.length && <div className="empty">Zatiaľ nemáte žiadne vozidlo na diely.<br /><button className="add" onClick={() => setEdit({ id: null, v: emptyCar() })}>Pridať prvé vozidlo</button></div>}
      <ul className="pp-rows">{list?.map((d) => {
        const own = items.filter((i) => i.donorId === d.id);
        return (
          <li key={d.id} className="pp-row ad-row">
            <div className="pp-ri"><b>{carName(d, cat, true)}, {d.year} <span className="tg">{VEHICLE_TYPES.find((t) => t.id === typeOf(cat, d.modelId))?.short}</span></b>
              <span className="mute">{[d.km != null && `${d.km.toLocaleString("sk-SK")} km`, d.gearbox, d.color, d.vin && `VIN ${d.vin}`, d.dismantledAt && `demontáž ${new Date(d.dismantledAt).toLocaleDateString("sk-SK")}`].filter(Boolean).join(" · ")}</span>
              <span className="mute">Diely z vozidla: {own.length} ({own.filter((i) => i.status === "active").length} aktívnych)</span></div>
            <div className="pp-ra">
              <button className="btn pp-btn-s" onClick={() => setQuick(d)}>Pridať viac dielov</button>
              <button className="ubtn" onClick={() => onAddOne(d)}>Pridať jeden diel</button>
              {onSellCar && <button className="ubtn" onClick={() => onSellCar(d)}>Predať celé vozidlo</button>}
              <button className="ubtn" onClick={() => setEdit({ id: d.id, v: { ...d } })}>Upraviť</button>
              {confirm === d.id ? <><button className="del" onClick={async () => { setConfirm(null); try { await deleteDonor(d.id); await reload(); onDone("Vozidlo zmazané (diely ostali)"); } catch (e) { setErr(skError(e)); } }}>Naozaj zmazať?</button><button className="lnk" onClick={() => setConfirm(null)}>Nie</button></>
                : <button className="del" onClick={() => setConfirm(d.id)}>Zmazať</button>}
            </div>
          </li>);
      })}</ul>
    </div>
  );
}

function CarForm({ cat, init, isNew, onSave, onCancel }: { cat: Catalog; init: Omit<Donor, "id" | "createdAt">; isNew: boolean; onSave: (v: Omit<Donor, "id" | "createdAt">) => Promise<void>; onCancel: () => void }) {
  const [v, setV] = useState(init); const [err, setErr] = useState(""); const [busy, setBusy] = useState(false);
  const [vt, setVt] = useState<VehicleType>(init.modelId ? typeOf(cat, init.modelId) : "osobne");
  const vtModels = cat.models.filter((m) => (m.vehicleType || "osobne") === vt);
  const brandIds = new Set(vtModels.map((m) => m.brandId));
  const models = vtModels.filter((m) => m.brandId === v.brandId), model = cat.models.find((m) => m.id === v.modelId);
  const engines = cat.engines.filter((e) => e.modelId === v.modelId);
  const years = useMemo(() => { const r: number[] = []; const to = Math.min(model?.yearTo ?? new Date().getFullYear(), new Date().getFullYear()); for (let y = to; y >= (model?.yearFrom ?? 1980); y--) r.push(y); return r; }, [model]);
  const save = async () => {
    setErr("");
    if (!v.brandId || !v.modelId || !v.year) return setErr("Vyberte značku, model a ročník.");
    const vin = v.vin.replace(/\s/g, "").toUpperCase();
    if (vin && !VIN_RE.test(vin)) return setErr("VIN má 17 znakov (písmená a číslice, bez I, O a Q).");
    setBusy(true); try { await onSave({ ...v, vin }); } catch (e) { setErr(skError(e)); setBusy(false); }
  };
  return (
    <div>
      <header className="pp-h"><h1>{isNew ? "Pridať vozidlo na diely" : "Upraviť vozidlo na diely"}</h1></header>
      <div className="pp-form pp-grid pp-card">
        <div className="full pp-vt" role="radiogroup" aria-label="Druh vozidla"><span className="lt">Druh vozidla</span>{VEHICLE_TYPES.map((t) => <button key={t.id} type="button" role="radio" aria-checked={vt === t.id} className={vt === t.id ? "on" : ""} onClick={() => { if (t.id !== vt) { setVt(t.id); setV({ ...v, brandId: 0, modelId: 0, engineId: null, year: 0 }); } }}>{t.short}</button>)}</div>
        <label>Značka *<select value={v.brandId || ""} onChange={(e) => setV({ ...v, brandId: Number(e.target.value), modelId: 0, engineId: null, year: 0 })}><option value="">Vyberte…</option>{cat.brands.filter((b) => brandIds.has(b.id)).map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}</select></label>
        <label>Model *<select value={v.modelId || ""} disabled={!models.length} onChange={(e) => setV({ ...v, modelId: Number(e.target.value), engineId: null, year: 0 })}><option value="">Vyberte…</option>{models.map((m) => <option key={m.id} value={m.id}>{m.name} ({m.yearFrom}–{m.yearTo ?? ""})</option>)}</select></label>
        <label>Motorizácia<select value={v.engineId ?? ""} disabled={!engines.length} onChange={(e) => setV({ ...v, engineId: e.target.value ? Number(e.target.value) : null })}><option value="">Neuvedená</option>{engines.map((x) => <option key={x.id} value={x.id}>{x.name}</option>)}</select></label>
        <label>Ročník *<select value={v.year || ""} disabled={!v.modelId} onChange={(e) => setV({ ...v, year: Number(e.target.value) })}><option value="">Vyberte…</option>{years.map((y) => <option key={y}>{y}</option>)}</select></label>
        <label>Najazdené km<input inputMode="numeric" value={v.km ?? ""} onChange={(e) => setV({ ...v, km: e.target.value ? parseInt(e.target.value.replace(/\D/g, ""), 10) || 0 : null })} placeholder="napr. 184000" /></label>
        <label>Prevodovka<select value={v.gearbox} onChange={(e) => setV({ ...v, gearbox: e.target.value })}><option value="">—</option><option>Manuálna</option><option>Automatická</option></select></label>
        <label>Farba<input value={v.color} maxLength={40} onChange={(e) => setV({ ...v, color: e.target.value })} placeholder="napr. strieborná 8E" /></label>
        <label>Dátum demontáže<input type="date" value={v.dismantledAt} onChange={(e) => setV({ ...v, dismantledAt: e.target.value })} /></label>
        <label className="full">VIN (vidíte len vy)<span className="oemin"><input value={v.vin} maxLength={20} onChange={(e) => setV({ ...v, vin: e.target.value.toUpperCase() })} placeholder="17 znakov" autoComplete="off" />
          <ScanText kind="vin" onResult={(x) => setV({ ...v, vin: x })} /></span></label>
        <label className="full">Poznámka<textarea value={v.note} maxLength={500} rows={3} onChange={(e) => setV({ ...v, note: e.target.value })} placeholder="napr. havária zozadu, motor v poriadku" /></label>
        {err && <p className="full pp-err">{err}</p>}
        <div className="full pp-actions"><button className="ubtn" onClick={onCancel}>Zrušiť</button><button className="btn" disabled={busy} onClick={save}>{busy ? "Ukladám…" : isNew ? "Uložiť a pridať diely" : "Uložiť"}</button></div>
      </div>
    </div>
  );
}

function QuickAdd({ uid, cat, prof, donor, onCancel, onDone }: { uid: string; cat: Catalog; prof: Profile | null; donor: Donor; onCancel: () => void; onDone: (n: number) => void }) {
  const auto = donor.gearbox === "Automatická";
  const [rows, setRows] = useState<Part[]>(() => commonFor(typeOf(cat, donor.modelId)).map(([name, c, sub, side]) => ({ on: false, name, cat: c, sub: name === "Prevodovka" && auto ? "Automatické prevodovky" : sub, side: side || "", oem: "", price: "", cond: "Dobrý" })));
  const [bad, setBad] = useState<Set<number>>(new Set()); const [err, setErr] = useState<string[]>([]); const [busy, setBusy] = useState(false);
  const firm = (prof?.type || "Firma") === "Firma";
  const car = `${carName(donor, cat, true)}, ${donor.year}`;
  const vt = typeOf(cat, donor.modelId);
  const cats = cat.categories.filter((c) => !c.vtypes?.length || c.vtypes.includes(vt));
  const upd = (i: number, p: Partial<Part>) => setRows((r) => r.map((x, k) => (k === i ? { ...x, ...p, on: p.on ?? true } : x)));
  const missingProfile = !prof?.city || (prof?.phone || "").replace(/\D/g, "").length < 9;
  const chosen = rows.filter((r) => r.on).length;
  const submit = async () => {
    const b = new Set<number>();
    rows.forEach((r, i) => { if (r.on && (r.name.trim().length < 3 || r.oem.replace(/[^A-Za-z0-9]/g, "").length < 4 || !(Number(r.price.replace(",", ".")) > 0))) b.add(i); });
    setBad(b); setErr([]);
    if (b.size) return setErr([`Doplňte názov, OEM číslo (aspoň 4 znaky) a cenu pri označených riadkoch (${b.size}).`]);
    if (!chosen) return setErr(["Označte aspoň jeden diel."]);
    const desc = `Diel z vozidla ${car}${donor.km != null ? `, ${donor.km.toLocaleString("sk-SK")} km` : ""}${donor.gearbox ? `, ${donor.gearbox.toLowerCase()} prevodovka` : ""}${donor.color ? `, farba ${donor.color}` : ""}.`;
    const input: ListingInput[] = rows.filter((r) => r.on).map((r) => ({
      name: r.name.trim(), brandId: donor.brandId, modelId: donor.modelId, engineId: donor.engineId, year: donor.year, categoryId: r.cat,
      subcategoryId: cat.subcategories.find((s) => s.categoryId === r.cat && s.name === r.sub)?.id ?? null, oem: r.oem.trim(), partMaker: "",
      price: Math.round(Number(r.price.replace(",", ".")) * 100) / 100, city: prof?.city || "", condition: r.cond, description: desc,
      warranty: firm ? "12 mesiacov" : "Bez záruky", shipping: "Len osobný odber", phone: prof?.phone || "", side: r.side, gearbox: donor.gearbox,
      km: donor.km, tested: false, returns14: false, fits: [], specs: {}, vtype: null, donorId: donor.id,
    }));
    setBusy(true);
    const res = await createFromDonor(uid, input);
    setBusy(false);
    if (res.errors.length) { setErr(res.errors); if (res.ok) onDone(res.ok); return; }
    onDone(res.ok);
  };
  if (missingProfile) return <div className="pp-box"><h2>Najprv doplňte profil</h2><p>Mesto a telefón z profilu sa použijú pri všetkých dieloch z auta. Doplňte ich v záložke Profil.</p><button className="ubtn" onClick={onCancel}>Späť</button></div>;
  return (
    <div>
      <header className="pp-h"><h1>Diely z vozidla {car}</h1><span className="mute">Označené: {chosen}</span></header>
      <p className="mute pp-note">Zaškrtnite diely, ktoré máte, a doplňte OEM číslo a cenu. Inzeráty vzniknú pozastavené – potom im v „Moje inzeráty“ pridajte fotky a aktivujte ich. Mesto a telefón sa vezmú z profilu.</p>
      <div className="pp-quick-t" role="table">
        <div className="pp-qh" role="row"><span /><span>Diel</span><span>OEM číslo *</span><span>Cena € *</span><span>Stav</span></div>
        {rows.map((r, i) => (
          <div key={i} className={"pp-qr" + (r.on ? " on" : "") + (bad.has(i) ? " bad" : "")} role="row">
            <input type="checkbox" checked={r.on} onChange={(e) => upd(i, { on: e.target.checked })} aria-label={"Vybrať " + r.name} />
            {r.custom
              ? <span className="pp-qc"><input value={r.name} onChange={(e) => upd(i, { name: e.target.value })} placeholder="Názov dielu" aria-label="Názov dielu" />
                  <select value={r.cat} onChange={(e) => upd(i, { cat: e.target.value, sub: "" })} aria-label="Kategória">{cats.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}</select>
                  <select value={r.sub} onChange={(e) => upd(i, { sub: e.target.value })} aria-label="Podkategória"><option value="">Podkategória (nepovinná)</option>{cat.subcategories.filter((x) => x.categoryId === r.cat).sort((a, b) => a.sort - b.sort).map((x) => <option key={x.id} value={x.name}>{x.name}</option>)}</select></span>
              : <input value={r.name} onChange={(e) => upd(i, { name: e.target.value })} aria-label="Názov dielu" />}
            <input value={r.oem} onChange={(e) => upd(i, { oem: e.target.value })} placeholder="OEM" aria-label={"OEM " + r.name} />
            <input value={r.price} inputMode="decimal" onChange={(e) => upd(i, { price: e.target.value })} placeholder="€" aria-label={"Cena " + r.name} />
            <select value={r.cond} onChange={(e) => upd(i, { cond: e.target.value as Condition })} aria-label={"Stav " + r.name}><option>Veľmi dobrý</option><option>Dobrý</option><option>Na opravu</option><option>Repasovaný</option></select>
          </div>
        ))}
      </div>
      <button className="lnk" onClick={() => setRows((r) => [...r, { on: true, custom: true, name: "", cat: vt === "motorky" ? "mrm" : "kar", sub: "", side: "", oem: "", price: "", cond: "Dobrý" }])}>+ Pridať iný diel</button>
      {err.map((x) => <p key={x} className="pp-err">{x}</p>)}
      <div className="pp-actions"><button className="ubtn" onClick={onCancel}>Zrušiť</button><button className="btn" disabled={busy} onClick={submit}>{busy ? "Vytváram…" : `Vytvoriť ${chosen} ${chosen === 1 ? "inzerát" : chosen >= 2 && chosen <= 4 ? "inzeráty" : "inzerátov"}`}</button></div>
    </div>
  );
}
