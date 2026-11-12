"use client";
// Havarované a nepojazdné vozidlá na predaj (celé vozidlá). Len havarované, nepojazdné a na diely – nie bežný autobazár.
// Telefón a VIN sú v súkromnej tabuľke car_contacts; VIN sa nikdy nezobrazuje verejne.
import ConfirmDelete from "./ConfirmDelete";
import { useEffect, useMemo, useState } from "react";
import type { Catalog, VehicleType } from "@/lib/types";
import { CAR_BODIES, CAR_CONDITIONS, CAR_DAMAGE, CAR_DAMAGE_NOT_MOTO, CAR_DOCS, CAR_ORIGINS, FUELS, VEHICLE_TYPES } from "@/lib/types";
import { carName } from "@/lib/seo";
import { price as fmtPrice } from "@/lib/format";
import { deleteCar, myCars, saveCar, setCarStatus, skError, type CarInput, type Donor, type MyCar, type PhotoItem, type Profile, type Status } from "@/lib/seller";
import ScanText from "../ScanText";

const MAX_PHOTOS = 12;
const VIN_RE = /^[A-HJ-NPR-Z0-9]{17}$/;
const ST: Record<Status, string> = { active: "Aktívny", paused: "Pozastavený", sold: "Predané", blocked: "Skrytý správcom" };

export function carTitle(c: { brandId: number; modelId: number | null; engineId?: number | null; year: number }, cat: Catalog) {
  const b = cat.brands.find((x) => x.id === c.brandId)?.name || "";
  const m = c.modelId ? cat.models.find((x) => x.id === c.modelId)?.name || "" : "";
  return `${[b, m].filter(Boolean).join(" ")}, ${c.year}`;
}

export default function Cars({ uid, cat, prof, fromDonor, onDone }: { uid: string; cat: Catalog; prof: Profile | null; fromDonor?: Donor | null; onDone: (m: string) => void }) {
  const [list, setList] = useState<MyCar[] | null>(null);
  const [err, setErr] = useState("");
  const [edit, setEdit] = useState<MyCar | "new" | null>(fromDonor ? "new" : null);
  const [confirm, setConfirm] = useState<number | null>(null);
  const reload = () => myCars(uid).then(setList).catch((e) => setErr(skError(e)));
  useEffect(() => { reload(); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  if (edit) return <CarSaleForm uid={uid} cat={cat} prof={prof} edit={edit === "new" ? null : edit} donor={edit === "new" ? fromDonor || null : null}
    onCancel={() => setEdit(null)} onSaved={async (id) => { setEdit(null); await reload(); onDone(edit === "new" ? `Vozidlo #${id} je zverejnené` : "Zmeny uložené"); }} />;

  const act = async (fn: () => Promise<unknown>, m: string) => { try { await fn(); await reload(); onDone(m); } catch (e) { setErr(skError(e)); } };
  return (
    <div>
      <header className="pp-h"><h1>Havarované vozidlá</h1><button className="btn" onClick={() => setEdit("new")}>+ Predať vozidlo</button></header>
      <p className="mute pp-note">Predávajte celé <b>havarované, nepojazdné alebo na diely</b> určené vozidlá – osobné autá, dodávky, nákladné autá, autobusy aj motorky. Bežné jazdené autá sem nepatria. Telefón kupujúci uvidí po kliknutí, VIN vidíte len vy.</p>
      {err && <p className="pp-err">{err}</p>}
      {list && !list.length && <div className="empty">Zatiaľ nepredávate žiadne vozidlo.<br /><button className="add" onClick={() => setEdit("new")}>Pridať prvé vozidlo</button></div>}
      <ul className="pp-rows">{list?.map((c) => (
        <li key={c.id} className={"pp-row car-row st-" + c.status}>
          {c.photos[0] ? <img className="pp-thumb" src={c.photos[0].url} alt="" /> : <span className="pp-thumb pp-nophoto">bez fotky</span>}
          <div className="pp-ri"><b>{carTitle(c, cat)} <span className="tg">{VEHICLE_TYPES.find((t) => t.id === c.vehicleType)?.short}</span></b>
            <span className="mute">{c.condition} · {fmtPrice(c.price)} · {ST[c.status]} · {c.views} zobrazení · {c.calls} odkrytí telefónu</span>
            {c.status === "blocked" && c.moderationNote && <span className="pp-err">Správca: {c.moderationNote}</span>}</div>
          <div className="pp-ra">
            <a className="ubtn" href={"/vozidlo/" + c.id} target="_blank" rel="noreferrer">Zobraziť</a>
            <button className="ubtn" onClick={() => setEdit(c)}>Upraviť</button>
            {c.status === "active" && <><button className="ubtn" onClick={() => act(() => setCarStatus(c.id, "sold"), "Označené ako predané")}>Predané</button><button className="ubtn" onClick={() => act(() => setCarStatus(c.id, "paused"), "Pozastavené")}>Pozastaviť</button></>}
            {(c.status === "paused" || c.status === "sold") && <button className="ubtn" onClick={() => act(() => setCarStatus(c.id, "active"), "Aktivované")}>Aktivovať</button>}
            {confirm === c.id ? <ConfirmDelete title="Zmazať inzerát vozidla?" note="Zmaže sa aj s fotkami a správami a nedá sa obnoviť." onConfirm={() => { setConfirm(null); act(() => deleteCar(c), "Vozidlo zmazané"); }} onCancel={() => setConfirm(null)} />
              : <button className="del" onClick={() => setConfirm(c.id)}>Zmazať</button>}
          </div>
        </li>
      ))}</ul>
    </div>
  );
}

function CarSaleForm({ uid, cat, prof, edit, donor, onSaved, onCancel }: { uid: string; cat: Catalog; prof: Profile | null; edit: MyCar | null; donor: Donor | null; onSaved: (id: number) => void; onCancel: () => void }) {
  const dm = donor ? cat.models.find((m) => m.id === donor.modelId) : undefined;
  const [v, setV] = useState<CarInput>(() => edit ? { ...edit } : {
    vehicleType: dm?.vehicleType || "osobne", brandId: donor?.brandId || 0, modelId: donor?.modelId || null, engineId: donor?.engineId ?? null, year: donor?.year || 0,
    km: donor?.km ?? null, fuel: "", gearbox: donor?.gearbox || "", color: donor?.color || "", condition: "", damage: [], starts: null, docs: "", stkUntil: "",
    price: 0, city: prof?.city || "", description: donor?.note || "", donorId: donor?.id ?? null, phone: prof?.phone || "", vin: donor?.vin || "",
    body: "", powerKw: null, keys: null, origin: "",
  });
  const [kmUnknown, setKmUnknown] = useState(!!edit && edit.km == null);
  const [priceS, setPriceS] = useState(edit ? String(edit.price) : "");
  const [photos, setPhotos] = useState<PhotoItem[]>(edit?.photos.map((p) => ({ path: p.path, url: p.url })) || []);
  const [errs, setErrs] = useState<string[]>([]); const [busy, setBusy] = useState(false);
  const set = (p: Partial<CarInput>) => setV((o) => ({ ...o, ...p }));
  const vtModels = cat.models.filter((m) => (m.vehicleType || "osobne") === v.vehicleType);
  const brandIds = new Set(vtModels.map((m) => m.brandId));
  const models = vtModels.filter((m) => m.brandId === v.brandId);
  const model = models.find((m) => m.id === v.modelId);
  const engines = cat.engines.filter((e) => e.modelId === v.modelId);
  const years = useMemo(() => { const r: number[] = []; const to = Math.min(model?.yearTo ?? new Date().getFullYear(), new Date().getFullYear()); for (let y = to; y >= (model?.yearFrom ?? 1960); y--) r.push(y); return r; }, [model]);
  const firm = (prof?.type || "Firma") === "Firma";

  useEffect(() => () => photos.forEach((p) => p.file && URL.revokeObjectURL(p.url)), []); // eslint-disable-line react-hooks/exhaustive-deps
  const addFiles = (fl: FileList | null) => {
    if (!fl) return;
    const add = [...fl].filter((f) => f.type.startsWith("image/")).slice(0, MAX_PHOTOS - photos.length).map((file) => ({ file, url: URL.createObjectURL(file) }));
    setPhotos((p) => [...p, ...add]);
  };
  const move = (i: number, d: number) => setPhotos((p) => { const n = [...p]; const j = i + d; if (j < 0 || j >= n.length) return p; [n[i], n[j]] = [n[j], n[i]]; return n; });

  const save = async () => {
    const e: string[] = [];
    if (!v.brandId) e.push("Vyberte značku.");
    if (models.length && !v.modelId) e.push("Vyberte model.");
    if (!v.year) e.push("Vyberte ročník.");
    if (!v.fuel) e.push("Vyberte palivo.");
    if (v.km == null && !kmUnknown) e.push("Zadajte najazdené km, alebo zaškrtnite „Stav km nepoznám“.");
    if (!v.body) e.push("Vyberte karosériu / typ vozidla.");
    if (v.starts == null) e.push("Vyberte, či vozidlo naštartuje.");
    if (v.keys == null) e.push("Vyberte, či sú ku vozidlu kľúče.");
    if (!v.condition) e.push("Vyberte stav vozidla.");
    if (!v.docs) e.push("Vyberte, či má vozidlo doklady.");
    const pr = Math.round(Number(priceS.replace(/\s|€/g, "").replace(",", ".")) * 100) / 100; if (!(pr > 0)) e.push("Zadajte cenu väčšiu ako 0 €.");
    if (v.description.trim().length < 20) e.push("Popis musí mať aspoň 20 znakov – opíšte poškodenie a čo je v poriadku.");
    if (v.city.trim().length < 2) e.push("Zadajte mesto.");
    if (v.phone.replace(/\D/g, "").length < 9) e.push("Telefón musí mať aspoň 9 číslic.");
    const vin = v.vin.replace(/\s/g, "").toUpperCase(); if (vin && !VIN_RE.test(vin)) e.push("VIN má 17 znakov (písmená a číslice, bez I, O a Q).");
    if (!photos.length) e.push("Pridajte aspoň 1 fotku (najlepšie aj poškodenia).");
    if (firm && prof && (!prof.ico || !prof.address)) e.push("Ako podnikateľ musíte mať v profile vyplnené IČO a sídlo.");
    setErrs(e); if (e.length) { window.scrollTo({ top: 0, behavior: "smooth" }); return; }
    setBusy(true);
    try { onSaved(await saveCar(uid, edit?.id ?? null, { ...v, vin, price: pr }, photos, edit?.photos.map((p) => p.path) || [])); }
    catch (x) { setErrs([skError(x)]); setBusy(false); }
  };
  const tog = (d: string) => set({ damage: v.damage.includes(d) ? v.damage.filter((x) => x !== d) : [...v.damage, d] });

  return (
    <div>
      <header className="pp-h"><h1>{edit ? "Upraviť vozidlo" : "Predať havarované vozidlo"}</h1><span className="mute">Polia s * sú povinné.</span></header>
      {donor && <p className="pp-donor-note">Údaje sú predvyplnené z vozidla na diely <b>{carName(donor, cat, true)}, {donor.year}</b>. Kupujúci uvidí aj diely, ktoré ste z neho už ponúkli.</p>}
      {errs.length > 0 && <div className="pp-err" role="alert">{errs.map((x) => <div key={x}>{x}</div>)}</div>}
      <div className="pp-form pp-grid pp-card">
        <div className="full pp-vt" role="radiogroup" aria-label="Druh vozidla"><span className="lt">Druh vozidla</span>
          {VEHICLE_TYPES.map((t) => <button key={t.id} type="button" role="radio" aria-checked={v.vehicleType === t.id} className={v.vehicleType === t.id ? "on" : ""}
            onClick={() => { if (t.id !== v.vehicleType) set({ vehicleType: t.id as VehicleType, brandId: 0, modelId: null, engineId: null, year: 0, body: "", damage: v.damage.filter((d) => t.id !== "motorky" || !CAR_DAMAGE_NOT_MOTO.includes(d)) }); }}>{t.short}</button>)}</div>
        <label>Značka *<select value={v.brandId || ""} onChange={(e) => set({ brandId: Number(e.target.value), modelId: null, engineId: null, year: 0 })}><option value="">Vyberte…</option>{cat.brands.filter((b) => brandIds.has(b.id)).map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}</select></label>
        <label>Model *<select value={v.modelId || ""} disabled={!models.length} onChange={(e) => set({ modelId: Number(e.target.value) || null, engineId: null, year: 0 })}><option value="">Vyberte…</option>{models.map((m) => <option key={m.id} value={m.id}>{m.name} ({m.yearFrom}–{m.yearTo ?? ""})</option>)}</select></label>
        <label>Motorizácia<select value={v.engineId ?? ""} disabled={!engines.length} onChange={(e) => set({ engineId: e.target.value ? Number(e.target.value) : null })}><option value="">Neuvedená</option>{engines.map((x) => <option key={x.id} value={x.id}>{x.name}</option>)}</select></label>
        <label>Ročník *<select value={v.year || ""} disabled={!v.brandId} onChange={(e) => set({ year: Number(e.target.value) })}><option value="">Vyberte…</option>{years.map((y) => <option key={y}>{y}</option>)}</select></label>
        <label>Karoséria / typ *<select value={v.body} onChange={(e) => set({ body: e.target.value })}><option value="">Vyberte…</option>{CAR_BODIES[v.vehicleType].map((x) => <option key={x}>{x}</option>)}</select></label>
        <label>Najazdené km *<input inputMode="numeric" value={v.km ?? ""} disabled={kmUnknown} onChange={(e) => set({ km: e.target.value ? parseInt(e.target.value.replace(/\D/g, ""), 10) || 0 : null })} placeholder="napr. 210000" /></label>
        <label className="pp-chk"><input type="checkbox" checked={kmUnknown} onChange={(e) => { setKmUnknown(e.target.checked); if (e.target.checked) set({ km: null }); }} /><span>Stav km nepoznám</span></label>
        <label>Palivo *<select value={v.fuel} onChange={(e) => set({ fuel: e.target.value })}><option value="">Vyberte…</option>{FUELS.map((x) => <option key={x}>{x}</option>)}</select></label>
        <label>Výkon (kW)<input inputMode="numeric" value={v.powerKw ?? ""} onChange={(e) => { const n = parseInt(e.target.value.replace(/\D/g, ""), 10); set({ powerKw: n > 0 ? Math.min(n, 2000) : null }); }} placeholder="napr. 110" /></label>
        <label>Prevodovka<select value={v.gearbox} onChange={(e) => set({ gearbox: e.target.value })}><option value="">Neuvedená</option><option>Manuálna</option><option>Automatická</option></select></label>
        <label>Farba<input value={v.color} maxLength={40} onChange={(e) => set({ color: e.target.value })} placeholder="napr. sivá metalíza" /></label>

        <label>Stav vozidla *<select value={v.condition} onChange={(e) => set({ condition: e.target.value })}><option value="">Vyberte…</option>{CAR_CONDITIONS.map((x) => <option key={x}>{x}</option>)}</select></label>
        <label>Naštartuje? *<select value={v.starts == null ? "" : v.starts ? "1" : "0"} onChange={(e) => set({ starts: e.target.value === "" ? null : e.target.value === "1" })}><option value="">Vyberte…</option><option value="1">Áno</option><option value="0">Nie</option></select></label>
        <label>Kľúče *<select value={v.keys == null ? "" : v.keys ? "1" : "0"} onChange={(e) => set({ keys: e.target.value === "" ? null : e.target.value === "1" })}><option value="">Vyberte…</option><option value="1">Áno, sú ku vozidlu</option><option value="0">Nie</option></select></label>
        <label>Pôvod vozidla<select value={v.origin} onChange={(e) => set({ origin: e.target.value })}><option value="">Neuvádzam</option>{CAR_ORIGINS.map((x) => <option key={x}>{x}</option>)}</select></label>
        <label>Doklady *<select value={v.docs} onChange={(e) => set({ docs: e.target.value })}><option value="">Vyberte…</option>{CAR_DOCS.map((x) => <option key={x}>{x}</option>)}</select></label>
        <label>STK a EK platná do<input type="date" value={v.stkUntil} onChange={(e) => set({ stkUntil: e.target.value })} /></label>
        <fieldset className="full pp-dmg"><legend>Poškodené časti <small className="mute">(označte všetko, čo je poškodené)</small></legend>{CAR_DAMAGE.filter((d) => v.vehicleType !== "motorky" || !CAR_DAMAGE_NOT_MOTO.includes(d)).map((d) => <label key={d} className="pp-chk"><input type="checkbox" checked={v.damage.includes(d)} onChange={() => tog(d)} /><span>{d}</span></label>)}</fieldset>
        {v.docs.startsWith("Bez dokladov") && <p className="full pp-warnbox">Vozidlo bez dokladov sa dá predať len na diely. Ak je vozidlo <b>odpadom (staré vozidlo)</b>, smiete ho odovzdať len osobe s oprávnením na spracovanie starých vozidiel, ktorá vám vydá potvrdenie (zákon č. 79/2015 Z. z. o odpadoch). Toto nie je právna rada.</p>}

        <label>{firm ? "Cena (€) vrátane DPH *" : "Cena (€) *"}<input value={priceS} inputMode="decimal" placeholder="napr. 1500" onChange={(e) => setPriceS(e.target.value)} /></label>
        <label>Mesto *<input value={v.city} maxLength={60} onChange={(e) => set({ city: e.target.value })} /></label>
        <label>Telefón *<input value={v.phone} inputMode="tel" placeholder="0900 123 456" onChange={(e) => set({ phone: e.target.value })} /></label>
        <label>VIN (vidíte len vy)<span className="oemin"><input value={v.vin} maxLength={20} onChange={(e) => set({ vin: e.target.value.toUpperCase() })} placeholder="17 znakov" autoComplete="off" /><ScanText kind="vin" onResult={(x) => set({ vin: x })} /></span></label>

        <div className="full pp-photos">
          <span className="lt">Fotky* <small className="mute">({photos.length}/{MAX_PHOTOS}, prvá je hlavná – pridajte aj fotky poškodenia a tachometra)</small></span>
          <div className="pp-phl">
            {photos.map((p, i) => (
              <figure key={p.url}><img src={p.url} alt={"Fotka " + (i + 1)} />
                <figcaption><button type="button" onClick={() => move(i, -1)} disabled={!i} aria-label="Posunúť doľava">←</button><button type="button" onClick={() => move(i, 1)} disabled={i === photos.length - 1} aria-label="Posunúť doprava">→</button><button type="button" onClick={() => setPhotos(photos.filter((_, j) => j !== i))} aria-label="Odstrániť">×</button></figcaption></figure>
            ))}
            {photos.length < MAX_PHOTOS && <label className="pp-add"><input type="file" accept="image/*" multiple onChange={(e) => { addFiles(e.target.files); e.target.value = ""; }} /><span>+ Pridať fotky</span></label>}
          </div>
        </div>
        <label className="full">Popis *<textarea value={v.description} maxLength={3000} rows={7} placeholder="Čo je poškodené, čo funguje, čo chýba, či je motor a prevodovka v poriadku, výbava…" onChange={(e) => set({ description: e.target.value })} /><small className="mute">{v.description.length} / 3000</small></label>
        <p className="full pp-resp">Zverejnením potvrdzujete, že vozidlo vlastníte alebo ho smiete predať, nie je kradnuté a údaje sú pravdivé (aj o poškodení a kilometroch). <b>Za inzerát, vozidlo, jeho stav a vybavenie reklamácie zodpovedáte vy ako predajca.</b> autosuciastky.eu je len inzertný portál – prevádzkovateľ KJ trade s. r. o. nie je stranou kúpnej zmluvy a vozidlo neoveruje.</p>
        <div className="full pp-actions"><button className="ubtn" onClick={onCancel}>Zrušiť</button><button className="btn" disabled={busy} onClick={save}>{busy ? "Ukladám…" : edit ? "Uložiť zmeny" : "Zverejniť vozidlo"}</button></div>
      </div>
    </div>
  );
}
