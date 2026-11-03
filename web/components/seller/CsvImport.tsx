"use client";
// Import inzerátov z CSV (Excel → Uložiť ako CSV). Najprv náhľad s chybami, potom import.
import { useState } from "react";
import type { Catalog, Condition } from "@/lib/types";
import { importMany, type ListingInput, type Profile } from "@/lib/seller";

const MAX = 500;
const REQ = ["nazov", "znacka", "model", "oem", "cena", "kategoria"];
const OPT = ["motorizacia", "rocnik", "podkategoria", "stav", "zaruka", "popis", "mesto", "telefon", "pasuje", "strana", "odskusany", "vratenie", "km", "vyrobca"];
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

type Pre = { row: number; name: string; ok: boolean; errors: string[]; warns: string[]; data?: ListingInput };

export default function CsvImport({ uid, cat, prof, onDone }: { uid: string; cat: Catalog; prof: Profile | null; onDone: (n: number) => void }) {
  const [pre, setPre] = useState<Pre[] | null>(null);
  const [head, setHead] = useState("");
  const [busy, setBusy] = useState(false), [res, setRes] = useState<string[]>([]);

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
      const brand = byName(cat.brands, g("znacka"));
      if (!brand) errors.push(`značka „${g("znacka")}“ nie je v katalógu`);
      const model = brand ? cat.models.find((m) => m.brandId === brand.id && norm(m.name) === norm(g("model"))) : undefined;
      if (brand && !model) errors.push(`model „${g("model")}“ nie je v katalógu pre ${brand.name}`);
      const engine = model && g("motorizacia") ? cat.engines.find((e) => e.modelId === model.id && norm(e.name) === norm(g("motorizacia"))) : undefined;
      if (model && g("motorizacia") && !engine) warns.push("motorizácia nenájdená – pasuje na všetky");
      const c = cat.categories.find((x) => norm(x.name) === norm(g("kategoria")) || x.id === norm(g("kategoria")));
      if (!c) errors.push(`kategória „${g("kategoria")}“ neexistuje`);
      const sub = c && g("podkategoria") ? cat.subcategories.find((s) => s.categoryId === c.id && norm(s.name) === norm(g("podkategoria"))) : undefined;
      if (c && g("podkategoria") && !sub) warns.push("podkategória nenájdená");
      const oem = g("oem"); if (oem.replace(/[^A-Za-z0-9]/g, "").length < 4) errors.push("OEM má menej ako 4 znaky");
      const price = Number(g("cena").replace(/\s|€/g, "").replace(",", ".")); if (!(price > 0)) errors.push("cena musí byť väčšia ako 0");
      let year = parseInt(g("rocnik"), 10);
      if (!year && model) { year = model.yearFrom; warns.push(`ročník chýba – nastavený ${year}`); }
      const conds: Condition[] = ["Veľmi dobrý", "Dobrý", "Na opravu"];
      const condition = conds.find((x) => norm(x) === norm(g("stav"))) || "Dobrý";
      if (g("stav") && norm(condition) !== norm(g("stav"))) warns.push("stav nerozpoznaný – nastavený Dobrý");
      const firm = (prof?.type || "Firma") === "Firma";
      let warranty = ["Bez záruky", "12 mesiacov", "24 mesiacov"].find((x) => norm(x) === norm(g("zaruka"))) || (firm ? "12 mesiacov" : "Bez záruky");
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
      warns.push("bez fotky – doplňte cez Upraviť");
      const ok = !errors.length;
      return {
        row: k + 2, name: name || "(bez názvu)", ok, errors, warns,
        data: ok ? { name, brandId: brand!.id, modelId: model!.id, engineId: engine?.id ?? null, year, categoryId: c!.id, subcategoryId: sub?.id ?? null,
          oem, partMaker: g("vyrobca"), price, city, condition, description, warranty, shipping: "Len osobný odber", phone,
          side, gearbox: "", km: Number.isFinite(km) ? km : null, tested: yes(g("odskusany")), returns14: yes(g("vratenie")), fits } : undefined,
      };
    }));
  }

  const good = pre?.filter((p) => p.ok) || [];
  async function run() {
    setBusy(true);
    const r = await importMany(uid, good.map((p) => p.data!));
    setBusy(false); setRes(r.errors);
    if (r.ok) onDone(r.ok);
  }
  const sample = "nazov;znacka;model;motorizacia;rocnik;oem;cena;kategoria;podkategoria;stav;zaruka;popis;mesto;telefon;pasuje\n" +
    "Predné ľavé svetlo;Škoda;Octavia III;;2015;5E1941015;120;Svetlá;Predné svetlá;Dobrý;12 mesiacov;Funkčné, bez prasklín, úchyty celé.;Žilina;0900123456;Škoda Octavia III Combi\n";
  const sampleHref = "data:text/csv;charset=utf-8," + encodeURIComponent("﻿" + sample);

  return (
    <div>
      <header className="pp-h"><h1>Import z CSV</h1><a className="ubtn" href={sampleHref} download="vzor-rozoberacka.csv">Stiahnuť vzorový súbor</a></header>
      <div className="pp-box">
        <p>Povinné stĺpce: <b>{REQ.join(", ")}</b>. Voliteľné: {OPT.join(", ")}. Oddeľovač <b>;</b> alebo <b>,</b>, najviac {MAX} riadkov. V stĺpci <b>pasuje</b> oddeľte autá znakom | (napr. „Škoda Octavia III | VW Golf VII“).</p>
        <p className="mute">Popis musí mať aspoň 20 znakov. Mesto a telefón sa doplnia z profilu, ak ich v súbore nemáte. Importované inzeráty sú bez fotiek – doplníte ich cez Upraviť.</p>
        <label className="pp-add pp-file"><input type="file" accept=".csv,text/csv" onChange={async (e) => { const f = e.target.files?.[0]; if (f) load(await f.text()); e.target.value = ""; }} /><span>Vybrať CSV súbor</span></label>
        {head && <p className="pp-err">{head}</p>}
      </div>
      {pre && (
        <div className="pp-box">
          <div className="pp-h"><h2>Náhľad: {good.length} v poriadku, {pre.length - good.length} s chybou</h2>
            <button className="btn" disabled={!good.length || busy} onClick={run}>{busy ? "Importujem…" : `Importovať ${good.length}`}</button></div>
          <ul className="pp-pre">{pre.map((p) => (
            <li key={p.row} className={p.ok ? "ok" : "err"}><b>Riadok {p.row}: {p.name}</b>
              {p.errors.map((x) => <span key={x} className="pp-ferr">✗ {x}</span>)}
              {p.ok && p.warns.map((x) => <span key={x} className="mute">! {x}</span>)}</li>
          ))}</ul>
          {res.length > 0 && <div className="pp-err">{res.map((r) => <div key={r}>{r}</div>)}</div>}
        </div>
      )}
    </div>
  );
}
