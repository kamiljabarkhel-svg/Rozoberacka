"use client";
// Import inzerátov z CSV (Excel → Uložiť ako CSV) alebo XML (export zo skladu/e-shopu). Najprv náhľad s chybami, potom import.
import { useEffect, useMemo, useState } from "react";
import type { Catalog, Condition } from "@/lib/types";
import { CONDITIONS, condLabel, cleanSpecs, isUniversal, specsErrors, SPEC_LABEL, VEHICLE_TYPES, WHEEL_CAT, wheelDefaults, wheelKind, wheelMissing, type Specs } from "@/lib/types";
import { SPEC_COLS } from "@/lib/csvExport";
import { sampleCsvHref, sampleXmlHref } from "@/lib/importSamples";
import { importMany, type ListingInput, type Profile, cleanOemAlt } from "@/lib/seller";
import { baseName, byExactName, groupByKey, isPhoto, keyOf, MAX_PHOTOS, sortPhotos, splitNames } from "@/lib/bulkPhotos";
import { splitPhotoFiles, tooBigMsg } from "@/lib/photos";

const MAX = 500;
const REQ = ["nazov", "cena", "kategoria"];
/** povinné pri bežných dieloch, pri univerzálnych (pneumatiky, výbava jazdca, iné…) nie */
const norm = (s: string) => s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().replace(/\s+/g, " ").trim();

function parse(text: string): string[][] {
  const first = text.split(/\r?\n/)[0] || "";
  const d = (first.match(/;/g) || []).length >= (first.match(/,/g) || []).length ? ";" : ",";
  const rows: string[][] = []; let row: string[] = [], cell = "", q = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (q) { if (c === '"') { if (text[i + 1] === '"') { cell += '"'; i++; } else q = false; } else cell += c; }
    else if (c === '"') q = true;
    else if (c === d) { row.push(cell); cell = ""; }
    else if (c === "\n" || c === "\r") { if (c === "\r" && text[i + 1] === "\n") i++; row.push(cell); rows.push(row); row = []; cell = ""; }
    else cell += c;
  }
  if (cell || row.length) { row.push(cell); rows.push(row); }
  return rows.filter((r) => r.some((x) => x.trim()));
}

/** Iné názvy stĺpcov/značiek (anglické, Heureka, Excel) → naše stĺpce */
const ALIAS: Record<string, string> = {
  name: "nazov", title: "nazov", productname: "nazov", product: "nazov", nazov_dielu: "nazov",
  brand: "znacka", make: "znacka", znacka_auta: "znacka", car_brand: "znacka",
  car_model: "model", engine: "motorizacia", year: "rocnik", rok: "rocnik",
  oem_number: "oem", oem_cislo: "oem", cislo_dielu: "oem", part_number: "oem", partnumber: "oem",
  nahradne: "nahradne_cisla", nahradne_cislo: "nahradne_cisla", oem_alt: "nahradne_cisla", alt_oem: "nahradne_cisla", alternative_numbers: "nahradne_cisla", cross_reference: "nahradne_cisla",
  price: "cena", price_vat: "cena", cena_s_dph: "cena",
  category: "kategoria", categorytext: "kategoria", subcategory: "podkategoria",
  condition: "stav", warranty: "zaruka", description: "popis", city: "mesto", phone: "telefon",
  fits: "pasuje", side: "strana", manufacturer: "vyrobca", vyrobca_dielu: "vyrobca",
  photos: "fotky", images: "fotky", fotka: "fotky", photo: "fotky", image: "fotky", imgurl: "fotky", vehicle_type: "druh",
};
const colName = (s: string) => { const k = norm(s).replace(/[\s-]+/g, "_"); return ALIAS[k] || k; };

/**
 * XML → riadky ako z CSV. Každý potomok koreňového prvku (napr. <diel>, <item>, <SHOPITEM>) je jeden inzerát,
 * jeho podprvky (alebo atribúty) sú stĺpce. Opakované alebo vnorené prvky (<fotky><fotka>…</fotka></fotky>,
 * <pasuje><auto>…</auto></pasuje>) sa spoja znakom |.
 */
function parseXml(text: string): string[][] | string {
  const doc = new DOMParser().parseFromString(text, "application/xml");
  if (doc.getElementsByTagName("parsererror").length) return "Súbor nie je platné XML. Skontrolujte, či sú všetky značky správne uzavreté a znaky & zapísané ako &amp;.";
  const root = doc.documentElement;
  let items = [...root.children];
  // obal navyše (<export><diely><diel>…) – zostúp, kým má prvok len jedného potomka typu „zoznam“
  while (items.length === 1 && [...items[0].children].some((c) => c.children.length > 0)) items = [...items[0].children];
  const recs: Map<string, string[]>[] = [];
  for (const it of items) {
    const m = new Map<string, string[]>();
    const put = (k: string, v: string) => { v = v.trim(); if (!v) return; const key = colName(k);
      if (key === "fotky") v = decodeURIComponent(v.split(/[?#]/)[0].split("/").pop() || v);   // z adresy fotky stačí názov súboru
      m.set(key, [...(m.get(key) || []), v]); };
    for (const a of [...it.attributes]) put(a.name, a.value);
    for (const f of [...it.children]) {
      if (f.children.length) for (const sub of [...f.children]) put(f.localName, sub.textContent || "");
      else put(f.localName, f.textContent || "");
    }
    if (m.size) recs.push(m);
  }
  if (!recs.length) return "V XML sa nenašli žiadne inzeráty.";
  const cols = [...new Set(recs.flatMap((r) => [...r.keys()]))];
  return [cols, ...recs.map((r) => cols.map((c) => (r.get(c) || []).join(c === "popis" ? "\n" : "|")))];
}

type Pre = { row: number; name: string; ok: boolean; errors: string[]; warns: string[]; data?: ListingInput; photoNames: string[]; oemKey: string };
type Match = { files: File[]; missing: string[]; how: "" | "stĺpec fotky" | "číslo dielu"; cut: number; dupOem: boolean };

export default function CsvImport({ uid, cat, prof, onDone }: { uid: string; cat: Catalog; prof: Profile | null; onDone: (n: number) => void }) {
  const [pre, setPre] = useState<Pre[] | null>(null);
  const [head, setHead] = useState("");
  const [busy, setBusy] = useState(false), [res, setRes] = useState<string[]>([]);
  const [files, setFiles] = useState<File[]>([]), [done, setDone] = useState(0), [bigErr, setBigErr] = useState("");
  const addFiles = (list: FileList | null) => {
    if (!list) return;
    const { ok: add, tooBig } = splitPhotoFiles([...list].filter(isPhoto));
    setFiles((o) => { const seen = new Set(o.map((f) => baseName(f).toLowerCase() + f.size)); return [...o, ...add.filter((f) => !seen.has(baseName(f).toLowerCase() + f.size))]; });
    setBigErr(tooBigMsg(tooBig));
  };
  // priradenie fotiek k riadkom: stĺpec „fotky“ (presné názvy) alebo číslo dielu v názve súboru
  const matches = useMemo(() => {
    const m = new Map<number, Match>();
    if (!pre) return m;
    const exact = byExactName(files), { byKey } = groupByKey(files);
    const oemCount = new Map<string, number>(); for (const p of pre) if (p.oemKey.length >= 4) oemCount.set(p.oemKey, (oemCount.get(p.oemKey) || 0) + 1);
    for (const p of pre) {
      let list: File[] = [], missing: string[] = [], how: Match["how"] = "", dupOem = false;
      if (p.photoNames.length) {
        how = "stĺpec fotky";
        for (const n of p.photoNames) { const f = exact.get(n.toLowerCase()); if (f) { if (!list.includes(f)) list.push(f); } else missing.push(n); }
      } else if (p.oemKey.length >= 4 && byKey.has(p.oemKey)) {
        if ((oemCount.get(p.oemKey) || 0) > 1) dupOem = true;
        else { how = "číslo dielu"; list = sortPhotos(byKey.get(p.oemKey)!); }
      }
      if (!files.length) missing = [];
      const cut = Math.max(0, list.length - MAX_PHOTOS);
      m.set(p.row, { files: list.slice(0, MAX_PHOTOS), missing, how, cut, dupOem });
    }
    return m;
  }, [pre, files]);
  const urls = useMemo(() => new Map(files.map((f) => [f, URL.createObjectURL(f)])), [files]);
  useEffect(() => () => { for (const u of urls.values()) URL.revokeObjectURL(u); }, [urls]);
  const used = new Set([...matches.values()].flatMap((x) => x.files));
  const unused = files.filter((f) => !used.has(f));

  function load(text: string, xml = false) {
    setRes([]);
    text = text.replace(/^\uFEFF/, "");
    const rows = xml || /^\s*<(\?xml|[A-Za-z])/.test(text) ? parseXml(text) : parse(text);
    if (typeof rows === "string") { setHead(rows); setPre(null); return; }
    if (rows.length < 2) { setHead("Súbor je prázdny alebo nemá riadok s hlavičkou."); setPre(null); return; }
    const h = rows[0].map(colName);
    const col = (n: string) => h.indexOf(n);
    const miss = REQ.filter((r) => col(r) < 0);
    if (miss.length) { setHead("Chýbajú povinné stĺpce: " + miss.join(", ") + "."); setPre(null); return; }
    const data = rows.slice(1, MAX + 1);
    setHead(rows.length - 1 > MAX ? `Súbor má ${rows.length - 1} riadkov, načítaných je prvých ${MAX}.` : "");
    const byName = <T extends { name: string }>(list: T[], v: string) => list.find((x) => norm(x.name) === norm(v));
    setPre(data.map((r, k) => {
      const g = (n: string) => (col(n) >= 0 ? (r[col(n)] || "").trim() : "");
      const errors: string[] = [], warns: string[] = [];
      const name = g("nazov");
      if (name.length < 3) errors.push("názov má menej ako 3 znaky");
      // kategória najprv: pri univerzálnych (pneumatiky, výbava jazdca, iné…) auto a číslo dielu nie sú povinné
      const c0 = cat.categories.find((x) => norm(x.name) === norm(g("kategoria")) || x.id === norm(g("kategoria")));
      const univ = isUniversal(c0?.id);
      const brand = g("znacka") ? byName(cat.brands, g("znacka")) : undefined;
      if (!brand && (!univ || g("znacka"))) errors.push(g("znacka") ? `značka „${g("znacka")}“ nie je v katalógu` : "chýba značka auta");
      const model = brand ? cat.models.find((m) => m.brandId === brand.id && norm(m.name) === norm(g("model"))) : undefined;
      if (brand && !model && (!univ || g("model"))) errors.push(`model „${g("model")}“ nie je v katalógu pre ${brand.name}`);
      const engine = model && g("motorizacia") ? cat.engines.find((e) => e.modelId === model.id && norm(e.name) === norm(g("motorizacia"))) : undefined;
      if (model && g("motorizacia") && !engine) warns.push("motorizácia nenájdená – pasuje na všetky");
      const c = cat.categories.find((x) => norm(x.name) === norm(g("kategoria")) || x.id === norm(g("kategoria")));
      if (!c) errors.push(`kategória „${g("kategoria")}“ neexistuje`);
      const sub = c && g("podkategoria") ? cat.subcategories.find((s) => s.categoryId === c.id && norm(s.name) === norm(g("podkategoria"))) : undefined;
      if (c && g("podkategoria") && !sub) warns.push("podkategória nenájdená");
      const oem = g("oem"); if ((!(univ || model?.vehicleType === "veterany") || oem) && oem.replace(/[^A-Za-z0-9]/g, "").length < 4) errors.push("číslo dielu (OEM) má menej ako 4 znaky");
      const price = Number(g("cena").replace(/\s|€/g, "").replace(",", ".")); if (!(price > 0)) errors.push("cena musí byť väčšia ako 0");
      let year = parseInt(g("rocnik"), 10) || 0;
      if (!year && model) { year = model.yearFrom; warns.push(`ročník chýba – nastavený ${year}`); }
      const condition: Condition = CONDITIONS.find((x) => norm(x) === norm(g("stav")) || norm(condLabel(x)) === norm(g("stav"))) || (norm(g("stav")) === norm("nepoužitý") ? "Nový" : "Dobrý");
      if (g("stav") && ![norm(condition), norm(condLabel(condition)), norm("nepoužitý")].includes(norm(g("stav")))) warns.push("stav nerozpoznaný – nastavený Dobrý");
      const firm = (prof?.type || "Firma") === "Firma";
      let warranty = ["Bez záruky", "12 mesiacov", "24 mesiacov"].find((x) => norm(x) === norm(g("zaruka"))) || (firm ? "12 mesiacov" : "Bez záruky");
      if (firm && condition === "Nový" && warranty !== "24 mesiacov") { warranty = "24 mesiacov"; warns.push("firma, nový diel: záruka nastavená na 24 mesiacov (zákon)"); }
      if (firm && warranty === "Bez záruky") { warranty = "12 mesiacov"; warns.push("firma: záruka nastavená na 12 mesiacov (zákon)"); }
      if (g("zaruka") && !["Bez záruky", "12 mesiacov", "24 mesiacov"].some((x) => norm(x) === norm(g("zaruka")))) warns.push(`záruka „${g("zaruka")}“ nerozpoznaná – nastavená ${warranty}`);
      const description = g("popis"); if (description.length < 20) errors.push("popis má menej ako 20 znakov");
      const city = g("mesto") || prof?.city || ""; if (city.length < 2) errors.push("chýba mesto (stĺpec mesto alebo profil)");
      const phone = g("telefon") || prof?.phone || ""; if (phone.replace(/\D/g, "").length < 9) errors.push("chýba telefón (stĺpec telefon alebo profil)");
      const fits: ListingInput["fits"] = [];
      for (const part of g("pasuje").split(/[|]/).map((s) => s.trim()).filter(Boolean)) {
        const b = cat.brands.find((x) => norm(part).startsWith(norm(x.name)));
        const rest = b ? norm(part).slice(norm(b.name).length).trim() : "";
        const m = b && rest ? cat.models.filter((x) => x.brandId === b.id).sort((a, z) => z.name.length - a.name.length).find((x) => rest.startsWith(norm(x.name))) : undefined;
        if (!b || (rest && !m)) warns.push(`„pasuje“: ${part} nenájdené`); else fits.push({ brandId: b.id, modelId: m?.id ?? null, engineId: null });
      }
      const yes = (s: string) => /^(ano|a|1|x|yes|true)$/.test(norm(s));
      const side = /^l/.test(norm(g("strana"))) ? "Ľavá" : /^p/.test(norm(g("strana"))) ? "Pravá" : "";
      const km = parseInt(g("km").replace(/\D/g, ""), 10);
      const rawSpecs: Specs = {};
      if (c?.id === WHEEL_CAT) for (const [colName, k] of SPEC_COLS) { let x = g(colName); if (k === "season") x = x.toLowerCase(); if (k === "mat") x = /^hl|^al/i.test(x) ? "Hliník" : /^oc|^st/i.test(norm(x)) ? "Oceľ" : x; if (x) rawSpecs[k] = x; }
      for (const k of specsErrors(rawSpecs)) warns.push(`${SPEC_LABEL[k].toLowerCase()} „${rawSpecs[k]}“ má zlý tvar – vynechané`);
      let specs = cleanSpecs(rawSpecs);
      if (c?.id === WHEEL_CAT) {
        if (!sub) errors.push("pri pneumatikách a diskoch vyplňte stĺpec podkategoria (napr. Pneumatiky zimné, Disky hliníkové, Kolesá s pneumatikami)");
        else {
          const kind = wheelKind(sub.name); specs = { ...wheelDefaults(sub.name), ...specs };
          const miss = wheelMissing(kind, specs, condition === "Nový");
          const must = miss.filter((x) => ["tw", "tp", "rd", "pcd"].includes(x));   // rozmer stráži aj databáza
          if (must.length) errors.push(kind === "kolesa" ? "pri kolesách vyplňte rozmer pneumatiky (pneu_sirka, pneu_profil, priemer) alebo disku (roztec, priemer)" : `chýba rozmer: ${must.map((x) => SPEC_LABEL[x].toLowerCase()).join(", ")}`);
          const rest = miss.filter((x) => !must.includes(x)); if (rest.length) warns.push(`odporúčame doplniť: ${rest.map((x) => SPEC_LABEL[x].toLowerCase()).join(", ")}`);
        }
      }
      const ok = !errors.length;
      return {
        row: k + 2, name: name || "(bez názvu)", ok, errors, warns, photoNames: splitNames(g("fotky")), oemKey: keyOf(oem),
        data: ok ? { name, brandId: model ? brand!.id : 0, modelId: model?.id ?? 0, engineId: engine?.id ?? null, year: model ? year : 0,
          vtype: (VEHICLE_TYPES.find((t) => norm(t.name) === norm(g("druh")) || t.id === norm(g("druh")))?.id) ?? null, categoryId: c!.id, subcategoryId: sub?.id ?? null,
          oem, oemAlt: cleanOemAlt(g("nahradne_cisla"), oem), partMaker: g("vyrobca"), price, city, condition, description, warranty, shipping: "Len osobný odber", phone,
          side, gearbox: "", km: Number.isFinite(km) ? km : null, tested: yes(g("odskusany")), returns14: yes(g("vratenie")), fits, specs, donorId: null } : undefined,
      };
    }));
  }

  const good = pre?.filter((p) => p.ok) || [];
  const withPhoto = good.filter((p) => matches.get(p.row)?.files.length).length;
  async function run() {
    setBusy(true); setDone(0);
    const r = await importMany(uid, good.map((p) => ({ row: p.row, data: p.data!, files: matches.get(p.row)?.files || [] })), setDone);
    setBusy(false); setRes(r.errors);
    if (r.ok) onDone(r.ok);
  }
  const sampleHref = sampleCsvHref;


  return (
    <div>
      <header className="pp-h"><h1>Import z CSV alebo XML</h1><span className="pp-bulkbtns"><a className="ubtn" href={sampleHref} download="vzor-autosuciastky.csv">Vzor CSV</a><a className="ubtn" href={sampleXmlHref} download="vzor-autosuciastky.xml">Vzor XML</a></span></header>
      <div className="pp-box">
        <p><b>Najjednoduchšie:</b> stiahnite si <b>Vzor CSV</b>, otvorte ho v Exceli, prepíšte riadky svojimi dielmi a uložte ako „CSV (oddelený bodkočiarkou)“. Firmy môžu nahrať aj export zo skladového programu alebo e-shopu (<b>XML</b>).</p>
        <p className="mute">Povinné stĺpce: <b>nazov, cena, kategoria</b> a pri dieloch na konkrétne auto aj <b>znacka, model, oem</b>. Mesto a telefón sa doplnia z profilu. Pred importom uvidíte náhľad s chybami – nič sa nezverejní bez vášho potvrdenia.</p>
        <p><a href="/pre-predajcov/import" target="_blank" rel="noopener">Podrobný návod: všetky stĺpce, pneumatiky a disky, XML, fotky</a></p>
        <ol className="pp-steps2">
          <li><b>Vyberte súbor CSV alebo XML.</b>
            <label className="pp-add pp-file"><input type="file" accept=".csv,text/csv,.xml,application/xml,text/xml" onChange={async (e) => { const f = e.target.files?.[0]; if (f) load(await f.text(), /\.xml$/i.test(f.name)); e.target.value = ""; }} /><span>Vybrať súbor</span></label></li>
          <li><b>Pridajte fotky</b> (nepovinné, ale bez fotky inzerát ostane pozastavený a kupujúci ho neuvidí).
            <span className="pp-bulkbtns">
              <label className="pp-add pp-bulkph"><input type="file" accept="image/*" multiple onChange={(e) => { addFiles(e.target.files); e.target.value = ""; }} /><span>Vybrať fotky</span></label>
              <label className="pp-add pp-folder"><input type="file" multiple {...{ webkitdirectory: "" }} onChange={(e) => { addFiles(e.target.files); e.target.value = ""; }} /><span>Vybrať celý priečinok</span></label>
              {files.length > 0 && <button type="button" className="lnk" onClick={() => setFiles([])}>Odobrať fotky ({files.length})</button>}
            </span>
            {bigErr && <span className="pp-err" role="alert">{bigErr}</span>}
            <span className="mute">Fotky sa k riadkom priradia: podľa stĺpca <b>fotky</b> (názvy súborov oddelené |, napr. <code>svetlo1.jpg|svetlo2.jpg</code>), alebo podľa <b>čísla dielu v názve súboru</b> (<code>5E1941015.jpg</code>, <code>5E1941015_2.jpg</code>). Najviac {MAX_PHOTOS} fotiek na inzerát, formát JPG, PNG alebo WebP (na iPhone zvoľte v Nastavenia → Fotoaparát → Formáty „Najkompatibilnejší“). Fotky sa pred nahraním zmenšia v prehliadači.</span></li>
        </ol>
        {head && <p className="pp-err">{head}</p>}
      </div>
      {pre && (
        <div className="pp-box">
          <div className="pp-h"><h2>Náhľad: {good.length} v poriadku, {pre.length - good.length} s chybou</h2>
            <button className="btn" disabled={!good.length || busy} onClick={run}>{busy ? `Importujem ${done} / ${good.length}…` : `Importovať ${good.length}`}</button></div>
          {good.length > 0 && <p className="pp-photosum">{withPhoto} z {good.length} inzerátov má fotky a hneď sa zverejní{good.length - withPhoto > 0 ? `, ${good.length - withPhoto} bez fotky ostane pozastavených (fotky doplníte neskôr v „Fotky hromadne“)` : ""}.
            {files.length > 0 && unused.length > 0 && <> {unused.length} {unused.length === 1 ? "fotka sa nepriradila" : "fotiek sa nepriradilo"}: <span className="mute">{unused.slice(0, 6).map(baseName).join(", ")}{unused.length > 6 ? "…" : ""}</span></>}</p>}
          <ul className="pp-pre">{pre.map((p) => { const m = matches.get(p.row); return (
            <li key={p.row} className={p.ok ? "ok" : "err"}><b>Riadok {p.row}: {p.name}</b>
              {p.errors.map((x) => <span key={x} className="pp-ferr">✗ {x}</span>)}
              {p.ok && m && m.files.length > 0 && <span className="pp-prephotos">{m.files.slice(0, 4).map((f) => <img key={baseName(f) + f.size} src={urls.get(f)} alt="" loading="lazy" decoding="async" />)}<span className="mute">{m.files.length} {m.files.length === 1 ? "fotka" : m.files.length < 5 ? "fotky" : "fotiek"} ({m.how})</span></span>}
              {p.ok && m && m.missing.length > 0 && <span className="mute">! nenájdené fotky: {m.missing.join(", ")}</span>}
              {p.ok && m && m.cut > 0 && <span className="mute">! {m.cut} fotiek navyše – použije sa prvých {MAX_PHOTOS}</span>}
              {p.ok && m && m.dupOem && <span className="mute">! rovnaké číslo dielu má viac riadkov – fotky priraďte cez stĺpec fotky</span>}
              {p.ok && !m?.files.length && <span className="mute">! bez fotky – inzerát bude pozastavený</span>}
              {p.ok && p.warns.map((x) => <span key={x} className="mute">! {x}</span>)}</li>
          ); })}</ul>
          {res.length > 0 && <div className="pp-err">{res.map((r) => <div key={r}>{r}</div>)}</div>}
        </div>
      )}
    </div>
  );
}
