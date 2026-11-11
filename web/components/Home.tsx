"use client";
// Úvodná stránka: hrdina, panel hľadania podľa auta, VIN, výsledky s facetami a kartami.
// Správanie podľa prototyp.html. Filtre sa ukladajú do adresy (?znacka=…), dá sa ich poslať ďalej.
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import type { Catalog, Filters, Specs, VehicleType } from "@/lib/types";
import { cleanSpecs, CONDITIONS, condLabel, emptyFilters, PCDS, RIM_DIAMETERS, RIM_WIDTHS, SEASONS, TIRE_PROFILES, TIRE_WIDTHS, VEHICLE_TYPES, WHEEL_CAT } from "@/lib/types";
import { getCatalog, getCities, getStats, initialData, searchListings, type SearchPage } from "@/lib/data";
import { decodeVin, vinYearText } from "@/lib/vin";
import { pieces, plural, sk } from "@/lib/format";
import { useFavs } from "@/lib/favs";
import { filterKey, hasCriteria, MAX_SAVED, useSaved } from "@/lib/saved";
import SavedSearches from "./SavedSearches";
import MyCarBar from "./MyCarBar";
import ScanText from "./ScanText";
import AlertForm, { EMAIL_ALERTS } from "./AlertForm";
import { readMyCar, useMyCar, myCarLabel } from "@/lib/mycar";
import { type PackedCatalog, unpackCatalog } from "@/lib/catalogSort";
import { STATIC_PREVIEW, sellersHref } from "@/lib/paths";
import { Icon, catIcon } from "./Icons";
import ListingCard from "./ListingCard";
import Disclaimer from "./Disclaimer";
import ListingDetail from "./ListingDetail";
import SellersSoon from "./SellersSoon";
import { CARS_ENABLED } from "@/lib/features";

const PAGE = 12;
// Najhľadanejšie diely: tlačidlo nastaví kategóriu (a podkategóriu podľa názvu v katalógu), nie skrytý text.
// Predchádzajúci text a kategória sa zrušia, vybrané auto ostane. Bez podkategórie = celá kategória,
// bez kategórie = hľadanie textom (riadiace jednotky sú v kategórii Motor aj Elektro).
const POP: { label: string; cat?: string; sub?: string; q?: string }[] = [
  { label: "Predné svetlo", cat: "sv", sub: "Predné svetlá" }, { label: "Zadné svetlo", cat: "sv", sub: "Zadné svetlá" },
  { label: "Nárazník", cat: "kar", sub: "Nárazníky" }, { label: "Kapota", cat: "kar", sub: "Kapoty" },
  { label: "Zrkadlo", cat: "kar", sub: "Spätné zrkadlá" }, { label: "Dvere", cat: "kar", sub: "Dvere" },
  { label: "Riadiaca jednotka", q: "Riadiaca jednotka" }, { label: "Alternátor", cat: "el", sub: "Alternátory" },
  { label: "Turbo", cat: "motor", sub: "Turbodúchadlá" }, { label: "Motor", cat: "motor", sub: "Motory kompletné" },
  { label: "Prevodovka", cat: "pr" }, { label: "Volant", cat: "int", sub: "Volanty a airbagy" },
];

// Krátke názvy parametrov v adrese
const P = { q: "q", brand: "znacka", model: "model", engine: "motor", year: "rok", cat: "kat", sub: "pod", max: "cena", cond: "stav", city: "mesto", sort: "zoradit", fav: "oblubene", side: "strana", tested: "odskusane", ret: "vratenie", vtype: "druh", wtype: "typ" } as const;
// Parametre kolies v adrese (len pri kategórii Pneumatiky a disky)
const SP: [keyof Specs, string][] = [["pcd", "roztec"], ["rd", "priemer"], ["tw", "sirka"], ["tp", "profil"], ["season", "sezona"], ["rw", "disk"], ["et", "et"], ["mat", "material"]];

/** Úvod má predvolené osobné autá; „Všetky vozidlá“ = druh=vsetky v adrese. */
function pick(o: Specs, keys: (keyof Specs)[]): Specs { const r: Specs = {}; for (const k of keys) if (o[k]) r[k] = o[k]; return r; }

const HOME_DEFAULT: Filters = { ...emptyFilters, vtype: "osobne" };

// Najhľadanejšie diely na motorky (iné kategórie ako pri autách)
const POP_MOTO: typeof POP = [
  { label: "Predné svetlo", cat: "sv", sub: "Predné svetlá" }, { label: "Zadné svetlo", cat: "sv", sub: "Zadné svetlá" },
  { label: "Kapotáž", cat: "mrm", sub: "Kapotáže a plasty" }, { label: "Nádrž", cat: "mrm", sub: "Nádrže" }, { label: "Sedlo", cat: "mrm", sub: "Sedlá" },
  { label: "Predná vidlica", cat: "mvi", sub: "Predné vidlice" }, { label: "Riadidlá", cat: "mri", sub: "Riadidlá" }, { label: "Zrkadlo", cat: "mri", sub: "Zrkadlá" },
  { label: "Výfuk", cat: "pal", sub: "Výfuky" }, { label: "Reťazová sada", cat: "mpo", sub: "Reťazové sady" }, { label: "Motor", cat: "motor" },
];

function readUrl(): Filters {
  const f = { ...HOME_DEFAULT };
  let s: URLSearchParams;
  try { s = new URLSearchParams(window.location.search); } catch { return f; }
  const num = (k: string) => { const v = s.get(k); const n = v ? Number(v) : NaN; return Number.isFinite(n) ? n : null; };
  f.q = s.get(P.q) || "";
  f.brand = num(P.brand); f.model = num(P.model); f.engine = num(P.engine); f.year = num(P.year);
  f.cat = s.get(P.cat) || ""; f.sub = num(P.sub); f.max = num(P.max);
  f.cond = s.get(P.cond) || ""; f.city = s.get(P.city) || "";
  const so = s.get(P.sort); f.sort = so === "asc" || so === "desc" ? so : "new";
  f.fav = s.get(P.fav) === "1";
  const sd = s.get(P.side); f.side = sd === "Ľavá" || sd === "Pravá" ? sd : "";
  f.tested = s.get(P.tested) === "1"; f.ret = s.get(P.ret) === "1";
  const vt = s.get(P.vtype); f.vtype = vt === "vsetky" ? "" : VEHICLE_TYPES.some((t) => t.id === vt) ? (vt as VehicleType) : "osobne";
  if (f.cat === WHEEL_CAT) { const wt = s.get(P.wtype); f.wtype = wt === "vsetko" ? "" : wt === "pneu" || wt === "disk" || wt === "kolesa" ? wt : "pneu"; }
  if (f.cat === WHEEL_CAT) { const sp: Specs = {}; for (const [k, n] of SP) { const v = s.get(n); if (v) sp[k] = v; } f.specs = cleanSpecs(sp); }
  return f;
}

function writeUrl(f: Filters) {
  if (STATIC_PREVIEW) return; // v statickom náhľade adresu nemeníme (súbor otvorený z disku)
  const s = new URLSearchParams();
  const put = (k: string, v: string | number | null | boolean) => { if (v !== null && v !== "" && v !== false) s.set(k, v === true ? "1" : String(v)); };
  put(P.q, f.q.trim()); put(P.brand, f.brand); put(P.model, f.model); put(P.engine, f.engine); put(P.year, f.year);
  put(P.cat, f.cat); put(P.sub, f.sub); put(P.max, f.max); put(P.cond, f.cond); put(P.city, f.city);
  if (f.sort !== "new") put(P.sort, f.sort);
  put(P.fav, f.fav); put(P.side, f.side); put(P.tested, f.tested); put(P.ret, f.ret); if (f.vtype !== "osobne") put(P.vtype, f.vtype || "vsetky");
  if (f.cat === WHEEL_CAT) { put(P.wtype, f.wtype || "vsetko"); for (const [k, n] of SP) put(n, f.specs?.[k] || ""); }
  const qs = s.toString();
  const url = window.location.pathname + (qs ? "?" + qs : "") + window.location.hash;
  window.history.replaceState(window.history.state, "", url);
  window.dispatchEvent(new Event("rz-url"));
}

export type HomeSsr = { catalog: PackedCatalog; res: SearchPage; stats: { parts: number; sellers: number }; cities: string[] };

export default function Home({ ssr }: { ssr?: HomeSsr | null }) {
  const init = useMemo(() => (ssr ? { catalog: unpackCatalog(ssr.catalog) } : initialData()), [ssr]);
  const [catalog, setCatalog] = useState<Catalog | null>(init?.catalog || null);
  const [res, setRes] = useState<SearchPage | null>(ssr?.res || null);
  const [busy, setBusy] = useState(false);
  const [cities, setCities] = useState<string[]>(ssr?.cities || []);
  const [loadErr, setLoadErr] = useState("");
  const [f, setF] = useState<Filters>(HOME_DEFAULT);
  const [adv, setAdv] = useState(false);
  const [vin, setVin] = useState("");
  const [vinCat, setVinCat] = useState("");
  const [vinMsg, setVinMsg] = useState("");
  const [hash, setHash] = useState("");
  const [stats, setStats] = useState<{ parts: number; sellers: number } | null>(ssr?.stats || null);
  const [oemQ, setOemQ] = useState("");
  const { favs, toggle } = useFavs();
  const saved = useSaved();
  const my = useMyCar();
  // staršie uložené auto nemá názov – doplníme ho, aby sa ukázal aj v detaile dielu (tam je len časť katalógu)
  useEffect(() => { if (my.car && !my.car.label && catalog) my.save({ ...my.car, label: myCarLabel(my.car, catalog) }); }, [my, catalog]);
  const isSaved = saved.list.some((x) => filterKey(x.f) === filterKey(f));
  const ready = useRef(false);
  const resRef = useRef<HTMLDivElement>(null);
  const panelRef = useRef<HTMLElement>(null);

  // Katalóg áut, mestá a počítadlo (v demo režime je katalóg už pripravený)
  useEffect(() => {
    let off = false;
    if (!init) getCatalog().then((c) => { if (!off) setCatalog(c); }).catch((e) => { if (!off) setLoadErr(String(e?.message || e)); });
    getCities().then((c) => { if (!off) setCities(c); }).catch(() => {});
    getStats().then((x) => { if (!off) setStats(x); }).catch(() => {});
    return () => { off = true; };
  }, [init]);

  // Filtre z adresy pri otvorení
  useEffect(() => {
    let u = readUrl();
    // Moje auto: bez filtrov v adrese ukážeme rovno diely pre uložené auto (ročník nefiltrujeme – diel často sedí na viac rokov)
    const mc = readMyCar();
    if (mc && !hasCriteria(u) && !u.fav && !window.location.search) u = { ...u, brand: mc.brand, model: mc.model, engine: mc.engine };
    setF(u);
    if (u.sub != null || u.year != null || u.max != null || u.cond || u.city || u.sort !== "new" || u.side || u.tested || u.ret) setAdv(true);
    ready.current = true;
    if (window.location.hash === "#vysledky") setTimeout(() => resRef.current?.scrollIntoView({ block: "start" }), 50);
    if (window.location.hash === "#pneu") setTimeout(() => panelRef.current?.scrollIntoView({ block: "start" }), 50);
  }, []);
  useEffect(() => { if (ready.current) writeUrl(f); }, [f]);

  // Hľadanie z hlavičky
  const toRes = useCallback(() => resRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }), []);
  useEffect(() => {
    const h = (e: Event) => {
      const d = (e as CustomEvent<{ q: string; scroll: boolean }>).detail;
      setF((x) => ({ ...x, q: d.q, fav: false }));
      if (d.scroll) setTimeout(toRes, 30);
    };
    window.addEventListener("rz-q", h);
    // výber z našepkávania v hlavičke (auto alebo kategória)
    const hf = (e: Event) => {
      const p = (e as CustomEvent<Partial<Filters>>).detail;
      setF((x) => ({ ...x, q: "", fav: false, ...("brand" in p ? { engine: null, year: null } : {}), ...p }));
      setTimeout(toRes, 30);
    };
    window.addEventListener("rz-f", hf);
    return () => { window.removeEventListener("rz-q", h); window.removeEventListener("rz-f", hf); };
  }, [toRes]);

  // Statický náhľad: detail a „pre predajcov“ cez # v adrese
  useEffect(() => {
    if (!STATIC_PREVIEW) return;
    const h = () => setHash(window.location.hash);
    h();
    window.addEventListener("hashchange", h);
    return () => window.removeEventListener("hashchange", h);
  }, []);

  const set = (patch: Partial<Filters>) => { setF((x) => ({ ...x, ...patch })); };

  // Hľadanie v databáze: pri písaní s krátkym oneskorením, staršie odpovede sa zahodia
  const seq = useRef(0);
  const favKey = f.fav ? favs.join(",") : "";
  useEffect(() => {
    if (!ready.current) return;
    const my = ++seq.current;
    setBusy(true);
    const t = window.setTimeout(() => {
      searchListings(f, favs, 0, PAGE)
        .then((r) => { if (my === seq.current) { setRes(r); setLoadErr(""); } })
        .catch((e) => { if (my === seq.current) setLoadErr(String(e?.message || e)); })
        .finally(() => { if (my === seq.current) setBusy(false); });
    }, f.q ? 250 : 0);
    return () => window.clearTimeout(t);
  }, [f, favKey]); // eslint-disable-line react-hooks/exhaustive-deps
  const more = () => {
    if (!res) return;
    const my = ++seq.current;
    setBusy(true);
    searchListings(f, favs, res.items.length, PAGE)
      .then((r) => { if (my === seq.current) setRes({ ...r, items: res.items.concat(r.items.filter((x) => !res.items.some((y) => y.id === x.id))) }); })
      .catch((e) => { if (my === seq.current) setLoadErr(String(e?.message || e)); })
      .finally(() => { if (my === seq.current) setBusy(false); });
  };

  const vtOk = useCallback((m: { vehicleType?: VehicleType }) => !f.vtype || (m.vehicleType || "osobne") === f.vtype, [f.vtype]);
  const brands = useMemo(() => {
    if (!catalog) return [];
    const ids = f.vtype ? new Set(catalog.models.filter(vtOk).map((m) => m.brandId)) : null;
    return catalog.brands.filter((b) => !ids || ids.has(b.id)).sort((a, b) => sk(a.name, b.name));
  }, [catalog, f.vtype, vtOk]);
  // Rýchle značky v poradí ako v prototype (najčastejšie na SK), potom ostatné obľúbené
  const quick = useMemo(() => {
    const order = ["Škoda", "Volkswagen", "BMW", "Audi", "Hyundai", "Kia", "Ford", "Opel", "Mercedes-Benz", "Toyota", "Peugeot", "Renault", "Citroën", "Dacia", "Fiat", "Volvo"];
    const rank = (n: string) => { const i = order.indexOf(n); return i < 0 ? 99 : i; };
    if (f.vtype && f.vtype !== "osobne") return brands.slice(0, 16); // pri iných druhoch ukážeme značky toho druhu
    return brands.filter((b) => b.popular).sort((a, b) => rank(a.name) - rank(b.name) || sk(a.name, b.name));
  }, [brands, f.vtype]);
  const models = useMemo(() => (catalog && f.brand != null ? catalog.models.filter((m) => m.brandId === f.brand && vtOk(m)) : []), [catalog, f.brand, vtOk]);
  const model = models.find((m) => m.id === f.model) || null;
  const engines = useMemo(() => (catalog && model ? catalog.engines.filter((e) => e.modelId === model.id) : []), [catalog, model]);
  const cats = useMemo(() => (catalog ? catalog.categories.filter((c) => !f.vtype || !c.vtypes?.length || c.vtypes.includes(f.vtype)).sort((a, b) => a.sort - b.sort) : []), [catalog, f.vtype]);
  const pickVt = (t: VehicleType | "") => {
    if (t === f.vtype) return;
    const m = catalog?.models.find((x) => x.id === f.model);
    const keepCar = !t || (m ? (m.vehicleType || "osobne") === t : f.brand == null || !!catalog?.models.some((x) => x.brandId === f.brand && (x.vehicleType || "osobne") === t));
    const c = catalog?.categories.find((x) => x.id === f.cat);
    const keepCat = !t || !c?.vtypes?.length || c.vtypes.includes(t);
    set({ vtype: t, ...(keepCar ? {} : { brand: null, model: null, engine: null, year: null }), ...(keepCat ? {} : { cat: "", sub: null, specs: {} }) });
  };
  const setSpec = (k: keyof Specs, v: string) => setF((x) => { const n = { ...x.specs }; if (v) n[k] = v; else delete n[k]; return { ...x, specs: n }; });
  const subs = useMemo(() => (catalog && f.cat ? catalog.subcategories.filter((s) => s.categoryId === f.cat).sort((a, b) => a.sort - b.sort) : []), [catalog, f.cat]);
  const years = useMemo(() => {
    const to = model?.yearTo || new Date().getFullYear(), from = model?.yearFrom || 1995, r: number[] = [];
    for (let y = to; y >= from; y--) r.push(y);
    return r;
  }, [model]);

  const reset = () => { setF((x) => ({ ...emptyFilters, vtype: x.vtype })); window.dispatchEvent(new CustomEvent("rz-q-set", { detail: "" })); };

  const onVin = () => {
    const r = decodeVin(vin);
    if (!r.ok) { setVinMsg(r.msg); return; }
    const yt = vinYearText(r);
    if (!r.brand) { setVinMsg(`VIN je platný, ale výrobcu (kód ${r.wmi}) zatiaľ nepoznáme${yt ? "; " + yt : ""}. Vyberte vozidlo ručne v paneli vyššie.`); return; }
    const b = catalog?.brands.find((x) => x.name === r.brand);
    if (!b || !catalog) { setVinMsg(`Rozpoznané: ${r.brand}${yt ? ", " + yt : ""}. Táto značka zatiaľ nie je v katalógu.`); return; }
    // druh vozidla: z VIN (napr. motorka Honda) alebo podľa toho, aké vozidlá značka vyrába; ročník len ako informácia (VIN ho určí len približne)
    const types = new Set(catalog.models.filter((m) => m.brandId === b.id).map((m) => m.vehicleType || "osobne"));
    let vt: Filters["vtype"] = f.vtype;
    if (r.vtype && types.has(r.vtype)) vt = r.vtype;
    else if (vt && !types.has(vt)) vt = types.size === 1 ? ([...types][0] as Filters["vtype"]) : "";
    set({ vtype: vt, brand: b.id, model: null, engine: null, year: null, cat: vinCat, sub: null });
    const vtName = vt !== f.vtype ? (vt ? VEHICLE_TYPES.find((t) => t.id === vt)?.name : "Všetky vozidlá") : "";
    setVinMsg(`Rozpoznané: ${b.name}${yt ? ", " + yt : ""}.${vtName ? ` Prepli sme na: ${vtName}.` : ""} Model a motorizáciu z VIN určiť nevieme, vyberte ich v paneli vyššie.`);
    setTimeout(toRes, 30);
  };

  const opt = (v: string | number, label: string) => <option key={v} value={v}>{label}</option>;
  const wheels = f.cat === WHEEL_CAT;
  const vinShown = !f.vtype || f.vtype === "osobne" || f.vtype === "dodavky";
  const numOrNull = (v: string) => (v === "" ? null : Number(v));

  const detailId = STATIC_PREVIEW && hash.startsWith("#inzerat-") ? Number(hash.slice(9)) : null;
  const closeHash = () => { history.replaceState(null, "", window.location.pathname + window.location.search); setHash(""); };

  return (
    <main id="pub" tabIndex={-1}>
      <section className="hero"><div className="in"><span id="main" />
        {wheels ? <>
        <h1>Pneumatiky a disky</h1>
        <p className="sub">Hľadajte podľa rozmeru: šírka, profil a priemer pneumatiky, rozteč, ET a typ disku. Rozmer nájdete na boku pneumatiky (napr. 205/55 R16) a na vnútornej strane disku (napr. 7J×16 ET49 5x112).</p>
        </> : <>
        <h1>Na aké vozidlo hľadáte diel?</h1>
        <p className="sub">Použité diely na osobné autá, dodávky, nákladné autá, autobusy a motorky od vrakovísk a predajcov z celého Slovenska. Vyberte vozidlo alebo zadajte číslo dielu – predajcovi zavoláte bez registrácie.</p>
        </>}
        {stats && stats.parts > 0 && <p className="stats"><b>{stats.parts.toLocaleString("sk-SK")}</b> {stats.parts === 1 ? "diel" : stats.parts >= 2 && stats.parts <= 4 ? "diely" : "dielov"} od <b>{stats.sellers}</b> {stats.sellers === 1 ? "predajcu" : "predajcov"} na jednom mieste</p>}
        {!wheels && <div className="qb" aria-label="Najčastejšie značky">
          {quick.map((b) => (
            <button key={b.id} className="chip" onClick={() => { set({ brand: b.id, model: null, engine: null, year: null }); panelRef.current?.scrollIntoView({ behavior: "smooth", block: "center" }); }}>{b.name}</button>
          ))}
        </div>}
        <p className="sellcta">Predávate diely z vrakoviska alebo servisu? <a href={STATIC_PREVIEW ? sellersHref : "/pre-predajcov?registracia=1"}>Vytvorte si účet predajcu zadarmo</a></p>
      </div></section>

      <div className="wrap">
        <section className="panel" aria-label="Hľadanie dielov" ref={panelRef}>
          {!wheels && <MyCarBar car={my.car} cat={catalog} f={f}
            onUse={() => { if (my.car) { set({ brand: my.car.brand, model: my.car.model, engine: my.car.engine, year: null }); setTimeout(toRes, 30); } }}
            onAll={() => set({ brand: null, model: null, engine: null, year: null })}
            onSave={() => { if (f.brand != null) { const c = { brand: f.brand, model: f.model, engine: f.engine, year: f.year }; my.save(catalog ? { ...c, label: myCarLabel(c, catalog) } : c); } }}
            onForget={() => my.save(null)} />}
          <div className="vtabs" role="tablist" aria-label="Druh vozidla">
            {VEHICLE_TYPES.map((t) => <button key={t.id} role="tab" aria-selected={f.vtype === t.id} className={f.vtype === t.id ? "on" : ""} onClick={() => pickVt(t.id)}>{t.short}</button>)}
            <button role="tab" aria-selected={!f.vtype} className={!f.vtype ? "on" : ""} onClick={() => pickVt("")}>Všetky vozidlá</button>
          </div>
          {!wheels && <>
          <div className="pg">
            <label>Značka
              <select value={f.brand ?? ""} onChange={(e) => set({ brand: numOrNull(e.target.value), model: null, engine: null, year: null })}>
                {opt("", "Všetky značky")}{brands.map((b) => opt(b.id, b.name))}
              </select>
            </label>
            <label>Model
              <select value={f.model ?? ""} disabled={f.brand == null} onChange={(e) => {
                const id = numOrNull(e.target.value), m = models.find((x) => x.id === id);
                const keepYear = f.year != null && m && f.year >= m.yearFrom && f.year <= (m.yearTo || 9999);
                set({ model: id, engine: null, year: keepYear || !m ? f.year : null });
              }}>
                {opt("", f.brand == null ? "Najprv vyberte značku" : "Všetky modely")}
                {models.map((m) => opt(m.id, `${m.name} (${m.yearFrom}–${m.yearTo || "dnes"})`))}
              </select>
            </label>
            <label>Motorizácia
              <select value={f.engine ?? ""} disabled={!model} onChange={(e) => set({ engine: numOrNull(e.target.value) })}>
                {opt("", model ? "Všetky motorizácie" : "Najprv vyberte model")}{engines.map((x) => opt(x.id, x.name))}
              </select>
            </label>
            <label>Kategória
              <select value={f.cat} onChange={(e) => set({ cat: e.target.value, sub: null, specs: {}, wtype: e.target.value === WHEEL_CAT ? "pneu" : "" })}>
                {opt("", "Všetky kategórie")}{cats.map((c) => opt(c.id, c.name))}
              </select>
            </label>
          </div>
          </>}
          {wheels && <div className="wheelbox" id="pneu">
            <div className="wb-type" role="radiogroup" aria-label="Čo hľadáte">
              {([["pneu", "Pneumatiky"], ["disk", "Disky"], ["kolesa", "Kolesá (disk s pneumatikou)"], ["", "Všetko"]] as const).map(([id, label]) =>
                <button key={id} type="button" role="radio" aria-checked={f.wtype === id} className={f.wtype === id ? "on" : ""}
                  onClick={() => set({ wtype: id, sub: null, specs: id === "pneu" ? pick(f.specs, ["tw", "tp", "rd", "season"]) : id === "disk" ? pick(f.specs, ["rd", "pcd", "rw", "et", "mat"]) : f.specs })}>{label}</button>)}
            </div>
            {f.wtype !== "disk" && <div className="wb-row">
              <span className="wb-l">{f.wtype === "kolesa" ? "Pneumatika" : "Rozmer pneumatiky"}</span>
              <div className="wb-size" aria-label="Rozmer pneumatiky, napr. 205/55 R16">
                <select aria-label="Šírka" value={f.specs.tw || ""} onChange={(e) => setSpec("tw", e.target.value)}>{opt("", "šírka")}{TIRE_WIDTHS.map((x) => opt(x, x))}</select>
                <span>/</span>
                <select aria-label="Profil" value={f.specs.tp || ""} onChange={(e) => setSpec("tp", e.target.value)}>{opt("", "profil")}{TIRE_PROFILES.map((x) => opt(x, x))}</select>
                <span>R</span>
                <select aria-label="Priemer" value={f.specs.rd || ""} onChange={(e) => setSpec("rd", e.target.value)}>{opt("", "priemer")}{RIM_DIAMETERS.map((x) => opt(x, x))}</select>
              </div>
              <div className="wb-seg" role="radiogroup" aria-label="Sezóna">
                {(["", ...SEASONS] as string[]).map((x) => <button key={x || "vsetky"} type="button" role="radio" aria-checked={(f.specs.season || "") === x} className={(f.specs.season || "") === x ? "on" : ""} onClick={() => setSpec("season", x)}>{x ? x[0].toUpperCase() + x.slice(1) : "Každá sezóna"}</button>)}
              </div>
            </div>}
            {(f.wtype === "disk" || f.wtype === "kolesa") && <div className="wb-row">
              <span className="wb-l">Disk</span>
              <div className="wb-disk">
                {f.wtype === "disk" && <label>Priemer<select value={f.specs.rd || ""} onChange={(e) => setSpec("rd", e.target.value)}>{opt("", "každý")}{RIM_DIAMETERS.map((x) => opt(x, x + "\""))}</select></label>}
                <label>Rozteč skrutiek<select value={f.specs.pcd || ""} onChange={(e) => setSpec("pcd", e.target.value)}>{opt("", "každá")}{PCDS.map((x) => opt(x, x))}</select></label>
                <label>Šírka<select value={f.specs.rw || ""} onChange={(e) => setSpec("rw", e.target.value)}>{opt("", "každá")}{RIM_WIDTHS.map((x) => opt(x, x + "J"))}</select></label>
                <label>ET (zális)<input inputMode="numeric" placeholder="napr. 45" value={f.specs.et || ""} onChange={(e) => setSpec("et", e.target.value.replace(/[^\d-]/g, "").slice(0, 4))} /></label>
              </div>
              <div className="wb-seg" role="radiogroup" aria-label="Typ disku">
                {([["", "Hliníkové aj oceľové"], ["Hliník", "Hliníkové (elektróny)"], ["Oceľ", "Oceľové (plechové)"]] as const).map(([id, label]) => <button key={id || "oba"} type="button" role="radio" aria-checked={(f.specs.mat || "") === id} className={(f.specs.mat || "") === id ? "on" : ""} onClick={() => setSpec("mat", id)}>{label}</button>)}
              </div>
            </div>}
            {(f.wtype === "disk" || f.wtype === "kolesa") && <div className="wb-row wb-car">
              <span className="wb-l">Na auto <small>(nepovinné – len ak hľadáte originálne disky na konkrétny model)</small></span>
              <div className="wb-disk">
                <label>Značka<select value={f.brand ?? ""} onChange={(e) => set({ brand: numOrNull(e.target.value), model: null, engine: null, year: null })}>{opt("", "akákoľvek")}{brands.map((b) => opt(b.id, b.name))}</select></label>
                <label>Model<select value={f.model ?? ""} disabled={f.brand == null} onChange={(e) => set({ model: numOrNull(e.target.value) })}>{opt("", f.brand == null ? "najprv značka" : "akýkoľvek")}{models.map((m) => opt(m.id, m.name))}</select></label>
              </div>
            </div>}
            <p className="wb-hint mute">{f.wtype === "disk" ? <>Rozmer disku je vyrazený na jeho vnútornej strane, napr. <b>7J×16 ET45 5x112</b>: šírka 7, priemer 16, zális 45, rozteč 5x112.</> : <>Rozmer nájdete na boku pneumatiky, napr. <b>205/55 R16 91V</b>: šírka 205, profil 55, priemer 16.</>}</p>
            <div className="pa"><button type="button" className="lnk" onClick={() => set({ wtype: f.wtype, specs: {}, brand: null, model: null })}>Zrušiť rozmery</button><button className="btn" onClick={toRes}>Zobraziť {f.wtype === "disk" ? "disky" : f.wtype === "kolesa" ? "kolesá" : f.wtype === "pneu" ? "pneumatiky" : "ponuky"}</button></div>
          </div>}
          {!wheels && <>
          <div className="adv" hidden={!adv}>
            <label>Podkategória
              <select value={f.sub ?? ""} disabled={!f.cat} onChange={(e) => set({ sub: numOrNull(e.target.value) })}>
                {opt("", f.cat ? "Všetky podkategórie" : "Najprv vyberte kategóriu")}{subs.map((s) => opt(s.id, s.name))}
              </select>
            </label>
            <label>Ročník
              <select value={f.year ?? ""} onChange={(e) => set({ year: numOrNull(e.target.value) })}>
                {opt("", "Každý ročník")}{years.map((y) => opt(y, String(y)))}
              </select>
            </label>
            <label>Cena do
              <input type="number" min={0} inputMode="numeric" placeholder="€" value={f.max ?? ""} onChange={(e) => set({ max: e.target.value === "" ? null : Math.max(0, Number(e.target.value)) })} />
            </label>
            <label>Stav
              <select value={f.cond} onChange={(e) => set({ cond: e.target.value })}>
                {opt("", "Každý stav")}{CONDITIONS.map((c) => opt(c, condLabel(c)))}
              </select>
            </label>
            <label>Mesto
              <select value={f.city} onChange={(e) => set({ city: e.target.value })}>
                {opt("", "Celé Slovensko")}{cities.map((c) => opt(c, c))}
              </select>
            </label>
            <label>Zoradiť
              <select value={f.sort} onChange={(e) => set({ sort: e.target.value as Filters["sort"] })}>
                {opt("new", "Najnovšie")}{opt("asc", "Najlacnejšie")}{opt("desc", "Najdrahšie")}
              </select>
            </label>
            <label>Strana
              <select value={f.side} onChange={(e) => set({ side: e.target.value })}>
                {opt("", "Ľavá aj pravá")}{opt("Ľavá", "Ľavá")}{opt("Pravá", "Pravá")}
              </select>
            </label>
            <label className="chk"><input type="checkbox" checked={f.tested} onChange={(e) => set({ tested: e.target.checked })} /> Len odskúšané diely</label>
            <label className="chk"><input type="checkbox" checked={f.ret} onChange={(e) => set({ ret: e.target.checked })} /> Len s možnosťou vrátenia</label>
          </div>
          <div className="pa">
            <button className="lnk" aria-expanded={adv} onClick={() => setAdv(!adv)}>Rozšírené hľadanie</button>
            <button className="btn" onClick={toRes}>Hľadať</button>
          </div>
          <form id="hladat" className="oemrow" onSubmit={(e) => { e.preventDefault(); if (!oemQ.trim()) return; set({ q: oemQ.trim() }); window.dispatchEvent(new CustomEvent("rz-q-set", { detail: oemQ.trim() })); setTimeout(toRes, 30); }}>
            <label>Číslo dielu (OEM) {f.vtype ? <span className="oem-scope">Hľadáme len diely na {VEHICLE_TYPES.find((t) => t.id === f.vtype)?.name.toLowerCase()}</span> : <span className="oem-scope">Hľadáme diely na všetky vozidlá</span>}<span className="oemin"><input value={oemQ} onChange={(e) => setOemQ(e.target.value)} placeholder="napr. 03G903023 alebo 5E0 807 221" autoComplete="off" />
              <ScanText kind="oem" onResult={(v) => { setOemQ(v); set({ q: v }); window.dispatchEvent(new CustomEvent("rz-q-set", { detail: v })); setTimeout(toRes, 30); }} /></span></label>
            <button className="btn2" type="submit">Hľadať podľa čísla</button>
          </form>
          </>}
        </section>

        {!wheels && vinShown && <section id="vin" className="plate" aria-label="Hľadanie podľa VIN">
          <h2>Hľadať podľa VIN</h2>
          <div className="pg2">
            <label>VIN (17 znakov)
              <span className="pl"><span className="eu">VIN</span>
                <input value={vin} onChange={(e) => setVin(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter") onVin(); }} placeholder="TMBJJ7NE0G0123456" maxLength={17} autoComplete="off" />
                <ScanText kind="vin" onResult={(v) => setVin(v)} />
              </span>
            </label>
            <label>Hľadám
              <select value={vinCat} onChange={(e) => setVinCat(e.target.value)}>{opt("", "Všetky diely")}{cats.map((c) => opt(c.id, c.name))}</select>
            </label>
            <button className="btn2" onClick={onVin}>Hľadať podľa VIN</button>
          </div>
          <p>VIN nájdete v osvedčení o evidencii (časť I, pole E) a na štítku pri čelnom skle (<Link href="/navody/vin">kde presne</Link>). Z VIN prečítame výrobcu, druh vozidla a pri niektorých značkách približný ročník; model, motorizáciu a ročník potom vyberte v paneli vyššie. Podľa ŠPZ nehľadáme.</p>
          <p className="vmsg" role="status">{vinMsg}</p>
        </section>}

        {!wheels && <div className="pop"><h2 className="sh">Najhľadanejšie diely</h2><div className="chips">
          {(f.vtype === "motorky" ? POP_MOTO : POP).filter((p) => cats.some((c) => c.id === p.cat)).map((p) => {
            const sub = p.sub && catalog ? catalog.subcategories.find((s) => s.categoryId === p.cat && s.name === p.sub)?.id ?? null : null;
            const on = p.q ? f.q === p.q && !f.cat : !f.q && f.cat === p.cat && f.sub === sub;
            return <button key={p.label} className="chip" aria-pressed={on} onClick={() => {
              const q = on ? "" : p.q || "";
              set(on ? { q: "", cat: "", sub: null } : { q, cat: p.cat || "", sub });
              window.dispatchEvent(new CustomEvent("rz-q-set", { detail: q })); setOemQ("");
              if (!on) setTimeout(toRes, 30);
            }}>{p.label}</button>;
          })}
        </div></div>}

        <div id="vysledky" ref={resRef} className="head">
          {vinMsg && !vinShown && <p className="vmsg vmsg-res" role="status">{vinMsg}</p>}
          <span className="cnt-w"><span className="cnt" aria-live="polite">{res ? (wheels ? plural(res.total, "ponuka", "ponuky", "ponúk") : pieces(res.total)) : "Načítavam…"}</span>{!STATIC_PREVIEW && <Link className="sortinfo" href="/ako-zoradujeme">Ako zoraďujeme ponuky</Link>}</span>
          <span className="head-a">
            {hasCriteria(f) && !f.fav && (isSaved
              ? <span className="chip saved-ok" title="Pri ďalšej návšteve uvidíte, koľko nových dielov pribudlo">✓ Hľadanie uložené</span>
              : <button className="chip" disabled={saved.list.length >= MAX_SAVED} title="Uloží sa len v tomto prehliadači. Pri ďalšej návšteve uvidíte, koľko nových dielov pribudlo." onClick={() => saved.add(f)}>🔔 Uložiť hľadanie</button>)}
            <button className="chip" aria-pressed={f.fav} onClick={() => set({ fav: !f.fav })}>♥ Obľúbené</button>
          </span>
        </div>
        {hasCriteria(f) && !f.fav && isSaved && EMAIL_ALERTS && <AlertForm key={filterKey(f)} f={f} cat={catalog} />}
        <SavedSearches list={saved.list} cat={catalog} onRemove={saved.remove}
          onOpen={(x) => { setF({ ...x.f, fav: false }); saved.seen(x.id); window.dispatchEvent(new CustomEvent("rz-q-set", { detail: x.f.q })); setTimeout(toRes, 30); }} />

        {res && catalog && !wheels && !(f.fav && res.total === 0) && (
          <div className="chips" aria-label="Kategórie nájdených dielov">
            {f.q.trim() && <button className="chip qchip" title="Zrušiť hľadaný text" aria-label={`Zrušiť hľadaný text ${f.q.trim()}`} onClick={() => { set({ q: "" }); setOemQ(""); window.dispatchEvent(new CustomEvent("rz-q-set", { detail: "" })); }}>„{f.q.trim()}“ <span aria-hidden="true">✕</span></button>}
            <button className="chip" aria-pressed={!f.cat} onClick={() => set({ cat: "", sub: null })}>Všetky ({res.base})</button>
            {cats.filter((c) => res.cats.get(c.id) || f.cat === c.id).map((c) => (
              <button key={c.id} className="chip" aria-pressed={f.cat === c.id} onClick={() => set({ cat: f.cat === c.id ? "" : c.id, sub: null })}>
                <Icon id={catIcon(c.id)} />{c.name} ({res.cats.get(c.id) || 0})
              </button>
            ))}
            {f.cat && subs.filter((s) => res.subs.get(s.id) || f.sub === s.id).map((s) => (
              <button key={s.id} className="chip" aria-pressed={f.sub === s.id} onClick={() => set({ sub: f.sub === s.id ? null : s.id })}>{s.name} ({res.subs.get(s.id) || 0})</button>
            ))}
          </div>
        )}

        {loadErr && <div className="err" role="alert">Údaje sa nepodarilo načítať: {loadErr}</div>}

        <div className="grid">
          {!res && !loadErr && <div className="loading">Načítavam inzeráty…</div>}
          {res && catalog && res.total > 0 && res.items.map((l) => (
            <ListingCard key={l.id} l={l} cat={catalog} fav={favs.includes(l.id)} onFav={toggle} />
          ))}
          {res && res.total > res.items.length && (
            <button className="add more" disabled={busy} onClick={more}>{busy ? "Načítavam…" : `Načítať viac (${res.total - res.items.length})`}</button>
          )}
          {res && res.total === 0 && (
            hasCriteria(f) || f.fav
              ? <div className="empty">{f.fav && !favs.length ? "Zatiaľ nemáte obľúbené diely. Označte ich srdiečkom ♡ na karte." : wheels ? "Takýto rozmer zatiaľ nikto neponúka. Skúste iný rozmer, sezónu alebo typ." : "Nič sme nenašli. Skúste iné slovo, kategóriu alebo všetky značky."}
                  {hasCriteria(f) && !f.fav && !isSaved && <><br />Uložte si hľadanie a pri ďalšej návšteve uvidíte, či pribudol vhodný diel.<br /><button className="add" onClick={() => saved.add(f)}>🔔 Uložiť hľadanie</button></>}
                  <br />{f.fav ? <button className="add" onClick={() => set({ fav: false })}>Zobraziť všetky diely</button> : wheels ? <button className="add" onClick={() => set({ specs: {}, brand: null, model: null, engine: null, q: "" })}>Zrušiť rozmer a filtre</button> : <button className="add" onClick={reset}>Zrušiť všetky filtre</button>}
                </div>
              : <div className="empty">Na portáli zatiaľ nie sú žiadne inzeráty.<br />Predávate diely? <a href={STATIC_PREVIEW ? sellersHref : "/pre-predajcov?registracia=1"}>Pridajte prvý diel zadarmo</a>.</div>
          )}
        </div>

        {!STATIC_PREVIEW && res && (
          <div className="rq-cta"><p><b>Nenašli ste svoj diel?</b> Zadajte dopyt – vrakoviská vám pošlú ponuku. Bez registrácie.</p>
            <a className="btn2" href={`/dopyt?${new URLSearchParams({ ...(f.brand ? { znacka: String(f.brand) } : {}), ...(f.model ? { model: String(f.model) } : {}), ...(f.q.trim() ? { q: f.q.trim() } : {}) }).toString()}`}>Zadať dopyt na diel</a></div>
        )}
        {!STATIC_PREVIEW && CARS_ENABLED && <div className="rq-cta"><p><b>Hľadáte celé vozidlo na diely?</b> Havarované a nepojazdné autá, dodávky, kamióny aj motorky od vrakovísk.</p>
          <Link className="btn2" href="/havarovane-vozidla">Havarované vozidlá</Link></div>}
        <Disclaimer kind="short" />

        <section className="how" aria-label="Ako to funguje">
          {wheels ? <>
          <div><b>1</b><h3>Zistite rozmer</h3><p>Rozmer pneumatiky je na jej boku (napr. 205/55 R16), rozmer disku v technickom preukaze alebo na zadnej strane disku.</p></div>
          <div><b>2</b><h3>Vyberte ponuku</h3><p>Pri pneumatikách porovnajte rok výroby (DOT) a hĺbku dezénu, pri diskoch rozteč, šírku a ET.</p></div>
          </> : <>
          <div><b>1</b><h3>Vyberte svoje auto</h3><p>Značka, model a motorizácia, alebo VIN číslo. Diely, ktoré naň pasujú, uvidíte hneď.</p></div>
          <div><b>2</b><h3>Nájdite diel</h3><p>Zúžte výber podľa kategórie, ceny, stavu alebo mesta a porovnajte OEM číslo so starým dielom.</p></div>
          </>}
          <div><b>3</b><h3>Zavolajte predajcovi</h3><p>Bez registrácie. Telefón sa zobrazí jedným kliknutím a dohodnete sa priamo s predajcom.</p></div>
        </section>
      </div>

      {detailId != null && (
        <div className="overlay" onClick={(e) => { if (e.target === e.currentTarget) closeHash(); }}>
          <ListingDetail id={detailId} onClose={closeHash} catalog={catalog} />
        </div>
      )}
      {STATIC_PREVIEW && hash === "#pre-predajcov" && (
        <div className="overlay" onClick={(e) => { if (e.target === e.currentTarget) closeHash(); }}>
          <div className="dbox"><SellersSoon /><button className="close" onClick={closeHash}>Zavrieť</button></div>
        </div>
      )}
    </main>
  );
}
