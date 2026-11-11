"use client";
// Import inzerátov z CSV (Excel → Uložiť ako CSV). Najprv náhľad s chybami, potom import.
import { useEffect, useMemo, useState } from "react";
import type { Catalog, Condition } from "@/lib/types";
import { CONDITIONS, condLabel, cleanSpecs, isUniversal, specsErrors, SPEC_LABEL, VEHICLE_TYPES, WHEEL_CAT, wheelDefaults, wheelKind, wheelMissing, type Specs } from "@/lib/types";
import { SPEC_COLS } from "@/lib/csvExport";
import { importMany, type ListingInput, type Profile } from "@/lib/seller";
import { baseName, byExactName, groupByKey, isPhoto, keyOf, MAX_PHOTOS, sortPhotos, splitNames } from "@/lib/bulkPhotos";

const MAX = 500;
const REQ = ["nazov", "cena", "kategoria"];
/** povinné pri bežných dieloch, pri univerzálnych (pneumatiky, výbava jazdca, iné…) nie */
const REQ_PART = ["znacka", "model", "oem"];
const OPT = ["druh", "motorizacia", "rocnik", "podkategoria", "stav", "zaruka", "popis", "mesto", "telefon", "pasuje", "strana", "odskusany", "vratenie", "km", "vyrobca", "fotky", ...SPEC_COLS.map(([c]) => c)];
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

type Pre = { row: number; name: string; ok: boolean; errors: string[]; warns: string[]; data?: ListingInput; photoNames: string[]; oemKey: string };
type Match = { files: File[]; missing: string[]; how: "" | "stĺpec fotky" | "číslo dielu"; cut: number; dupOem: boolean };

export default function CsvImport({ uid, cat, prof, onDone }: { uid: string; cat: Catalog; prof: Profile | null; onDone: (n: number) => void }) {
  const [pre, setPre] = useState<Pre[] | null>(null);
  const [head, setHead] = useState("");
  const [busy, setBusy] = useState(false), [res, setRes] = useState<string[]>([]);
  const [files, setFiles] = useState<File[]>([]), [done, setDone] = useState(0);
  const addFiles = (list: FileList | null) => {
    if (!list) return;
    const add = [...list].filter(isPhoto);
    setFiles((o) => { const seen = new Set(o.map((f) => baseName(f).toLowerCase() + f.size)); return [...o, ...add.filter((f) => !seen.has(baseName(f).toLowerCase() + f.size))]; });
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

  function load(text: string) {
    setRes([]);
    const rows = parse(text.replace(/^﻿/, ""));
    if (rows.length < 2) { setHead("Súbor je prázdny alebo nemá riadok s hlavičkou."); setPre(null); return; }
    const h = rows[0].map(norm);
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
      const oem = g("oem"); if ((!univ || oem) && oem.replace(/[^A-Za-z0-9]/g, "").length < 4) errors.push("číslo dielu (OEM) má menej ako 4 znaky");
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
          oem, partMaker: g("vyrobca"), price, city, condition, description, warranty, shipping: "Len osobný odber", phone,
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
  const sample = "nazov;znacka;model;motorizacia;rocnik;oem;cena;kategoria;podkategoria;stav;zaruka;popis;mesto;telefon;pasuje;fotky\n" +
    "Predné ľavé svetlo;Škoda;Octavia III;;2015;5E1941015;120;Svetlá;Predné svetlá;Dobrý;12 mesiacov;Funkčné, bez prasklín, úchyty celé.;Žilina;0900123456;Škoda Octavia III Combi;svetlo1.jpg|svetlo2.jpg\n";
  const sampleHref = "data:text/csv;charset=utf-8," + encodeURIComponent("﻿" + sample);

  return (
    <div>
      <header className="pp-h"><h1>Import z CSV</h1><a className="ubtn" href={sampleHref} download="vzor-autosuciastky.csv">Stiahnuť vzorový súbor</a></header>
      <div className="pp-box">
        <p>Povinné stĺpce: <b>{[...REQ, ...REQ_PART].join(", ")}</b> – pri pneumatikách, diskoch, výbave jazdca, príslušenstve a „Iné“ stačí <b>{REQ.join(", ")}</b> (stĺpec <b>druh</b>: osobné, dodávky, nákladné, autobusy alebo motorky). Voliteľné: {OPT.join(", ")}. Oddeľovač <b>;</b> alebo <b>,</b>, najviac {MAX} riadkov. Stav: Nový, Repasovaný, Veľmi dobrý, Dobrý alebo Na opravu. V stĺpci <b>pasuje</b> oddeľte autá znakom | (napr. „Škoda Octavia III | VW Golf VII“).</p>
        <p className="mute">Pneumatiky a disky (kategória „Pneumatiky a disky“): stĺpce pneu_sirka (205), pneu_profil (55), priemer (16), sezona (letné/zimné/celoročné), dezen_mm, dot (rok), index_nosnosti, index_rychlosti, sirka_disku (7), roztec (5x112), et (49), stredovy_otvor (57.1), kusy, material (Hliník/Oceľ).</p>
        <p className="mute">Popis musí mať aspoň 20 znakov. Mesto a telefón sa doplnia z profilu, ak ich v súbore nemáte.</p>
        <ol className="pp-steps2">
          <li><b>Vyberte CSV súbor.</b>
            <label className="pp-add pp-file"><input type="file" accept=".csv,text/csv" onChange={async (e) => { const f = e.target.files?.[0]; if (f) load(await f.text()); e.target.value = ""; }} /><span>Vybrať CSV súbor</span></label></li>
          <li><b>Pridajte fotky</b> (nepovinné, ale bez fotky inzerát ostane pozastavený a kupujúci ho neuvidí).
            <span className="pp-bulkbtns">
              <label className="pp-add pp-bulkph"><input type="file" accept="image/*" multiple onChange={(e) => { addFiles(e.target.files); e.target.value = ""; }} /><span>Vybrať fotky</span></label>
              <label className="pp-add pp-folder"><input type="file" multiple {...{ webkitdirectory: "" }} onChange={(e) => { addFiles(e.target.files); e.target.value = ""; }} /><span>Vybrať celý priečinok</span></label>
              {files.length > 0 && <button type="button" className="lnk" onClick={() => setFiles([])}>Odobrať fotky ({files.length})</button>}
            </span>
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
