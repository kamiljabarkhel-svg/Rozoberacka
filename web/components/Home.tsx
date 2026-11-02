"use client";
// Úvodná stránka: hrdina, panel hľadania podľa auta, VIN, výsledky s facetami a kartami.
// Správanie podľa prototyp.html. Filtre sa ukladajú do adresy (?znacka=…), dá sa ich poslať ďalej.
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { Catalog, Filters, Listing } from "@/lib/types";
import { emptyFilters } from "@/lib/types";
import { getActiveListings, getCatalog, initialData } from "@/lib/data";
import { search } from "@/lib/search";
import { decodeVin } from "@/lib/vin";
import { pieces, sk } from "@/lib/format";
import { useFavs } from "@/lib/favs";
import { STATIC_PREVIEW } from "@/lib/paths";
import { Icon, catIcon } from "./Icons";
import ListingCard from "./ListingCard";
import ListingDetail from "./ListingDetail";
import SellersSoon from "./SellersSoon";

const PAGE = 8;

// Krátke názvy parametrov v adrese
const P = { q: "q", brand: "znacka", model: "model", engine: "motor", year: "rok", cat: "kat", sub: "pod", max: "cena", cond: "stav", city: "mesto", sort: "zoradit", fav: "oblubene" } as const;

function readUrl(): Filters {
  const f = { ...emptyFilters };
  let s: URLSearchParams;
  try { s = new URLSearchParams(window.location.search); } catch { return f; }
  const num = (k: string) => { const v = s.get(k); const n = v ? Number(v) : NaN; return Number.isFinite(n) ? n : null; };
  f.q = s.get(P.q) || "";
  f.brand = num(P.brand); f.model = num(P.model); f.engine = num(P.engine); f.year = num(P.year);
  f.cat = s.get(P.cat) || ""; f.sub = num(P.sub); f.max = num(P.max);
  f.cond = s.get(P.cond) || ""; f.city = s.get(P.city) || "";
  const so = s.get(P.sort); f.sort = so === "asc" || so === "desc" ? so : "new";
  f.fav = s.get(P.fav) === "1";
  return f;
}

function writeUrl(f: Filters) {
  if (STATIC_PREVIEW) return; // v statickom náhľade adresu nemeníme (súbor otvorený z disku)
  const s = new URLSearchParams();
  const put = (k: string, v: string | number | null | boolean) => { if (v !== null && v !== "" && v !== false) s.set(k, v === true ? "1" : String(v)); };
  put(P.q, f.q.trim()); put(P.brand, f.brand); put(P.model, f.model); put(P.engine, f.engine); put(P.year, f.year);
  put(P.cat, f.cat); put(P.sub, f.sub); put(P.max, f.max); put(P.cond, f.cond); put(P.city, f.city);
  if (f.sort !== "new") put(P.sort, f.sort);
  put(P.fav, f.fav);
  const qs = s.toString();
  const url = window.location.pathname + (qs ? "?" + qs : "") + window.location.hash;
  window.history.replaceState(window.history.state, "", url);
}

export default function Home() {
  const init = useMemo(() => initialData(), []);
  const [catalog, setCatalog] = useState<Catalog | null>(init?.catalog || null);
  const [listings, setListings] = useState<Listing[]>(init?.listings || []);
  const [loadErr, setLoadErr] = useState("");
  const [f, setF] = useState<Filters>(emptyFilters);
  const [shown, setShown] = useState(PAGE);
  const [adv, setAdv] = useState(false);
  const [vin, setVin] = useState("");
  const [vinCat, setVinCat] = useState("");
  const [vinMsg, setVinMsg] = useState("");
  const [hash, setHash] = useState("");
  const { favs, toggle } = useFavs();
  const ready = useRef(false);
  const resRef = useRef<HTMLDivElement>(null);
  const panelRef = useRef<HTMLElement>(null);

  // Načítanie údajov (v demo režime sú už pripravené)
  useEffect(() => {
    if (init) return;
    let off = false;
    Promise.all([getCatalog(), getActiveListings()])
      .then(([c, l]) => { if (!off) { setCatalog(c); setListings(l); } })
      .catch((e) => { if (!off) setLoadErr(String(e?.message || e)); });
    return () => { off = true; };
  }, [init]);

  // Filtre z adresy pri otvorení
  useEffect(() => {
    const u = readUrl();
    setF(u);
    if (u.sub != null || u.year != null || u.max != null || u.cond || u.city || u.sort !== "new") setAdv(true);
    ready.current = true;
    if (window.location.hash === "#vysledky") setTimeout(() => resRef.current?.scrollIntoView({ block: "start" }), 50);
  }, []);
  useEffect(() => { if (ready.current) writeUrl(f); }, [f]);

  // Hľadanie z hlavičky
  const toRes = useCallback(() => resRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }), []);
  useEffect(() => {
    const h = (e: Event) => {
      const d = (e as CustomEvent<{ q: string; scroll: boolean }>).detail;
      setF((x) => ({ ...x, q: d.q })); setShown(PAGE);
      if (d.scroll) setTimeout(toRes, 30);
    };
    window.addEventListener("rz-q", h);
    return () => window.removeEventListener("rz-q", h);
  }, [toRes]);

  // Statický náhľad: detail a „pre predajcov“ cez # v adrese
  useEffect(() => {
    if (!STATIC_PREVIEW) return;
    const h = () => setHash(window.location.hash);
    h();
    window.addEventListener("hashchange", h);
    return () => window.removeEventListener("hashchange", h);
  }, []);

  const set = (patch: Partial<Filters>) => { setF((x) => ({ ...x, ...patch })); setShown(PAGE); };

  const brands = useMemo(() => (catalog ? [...catalog.brands].sort((a, b) => sk(a.name, b.name)) : []), [catalog]);
  // Rýchle značky v poradí ako v prototype (najčastejšie na SK), potom ostatné obľúbené
  const quick = useMemo(() => {
    const order = ["Škoda", "Volkswagen", "BMW", "Audi", "Hyundai", "Kia"];
    const rank = (n: string) => { const i = order.indexOf(n); return i < 0 ? 99 : i; };
    return brands.filter((b) => b.popular).sort((a, b) => rank(a.name) - rank(b.name) || sk(a.name, b.name));
  }, [brands]);
  const models = useMemo(() => (catalog && f.brand != null ? catalog.models.filter((m) => m.brandId === f.brand) : []), [catalog, f.brand]);
  const model = models.find((m) => m.id === f.model) || null;
  const engines = useMemo(() => (catalog && model ? catalog.engines.filter((e) => e.modelId === model.id) : []), [catalog, model]);
  const cats = useMemo(() => (catalog ? [...catalog.categories].sort((a, b) => a.sort - b.sort) : []), [catalog]);
  const subs = useMemo(() => (catalog && f.cat ? catalog.subcategories.filter((s) => s.categoryId === f.cat).sort((a, b) => a.sort - b.sort) : []), [catalog, f.cat]);
  const cities = useMemo(() => [...new Set(listings.map((l) => l.city).filter((c): c is string => !!c))].sort(sk), [listings]);
  const years = useMemo(() => {
    const to = model?.yearTo || new Date().getFullYear(), from = model?.yearFrom || 1995, r: number[] = [];
    for (let y = to; y >= from; y--) r.push(y);
    return r;
  }, [model]);

  const res = useMemo(() => (catalog ? search(listings, f, catalog, favs) : null), [catalog, listings, f, favs]);

  const reset = () => { setF({ ...emptyFilters }); setShown(PAGE); window.dispatchEvent(new CustomEvent("rz-q-set", { detail: "" })); };

  const onVin = () => {
    const r = decodeVin(vin);
    if (!r.ok) { setVinMsg(r.msg); return; }
    if (!r.brand) { setVinMsg("VIN je platný, ale výrobcu v ukážke nepoznáme. Vyberte auto ručne v paneli vyššie."); return; }
    const b = catalog?.brands.find((x) => x.name === r.brand);
    if (!b) { setVinMsg(`Rozpoznané: ${r.brand}${r.year ? ", ročník približne " + r.year : ""}. Táto značka zatiaľ nie je v katalógu.`); return; }
    set({ brand: b.id, model: null, engine: null, year: r.year, cat: vinCat, sub: null });
    if (r.year) setAdv(true);
    setVinMsg(`Rozpoznané: ${b.name}${r.year ? ", ročník približne " + r.year : ""}. Model a motorizáciu z VIN určiť nevieme, vyberte ich v paneli vyššie.`);
    setTimeout(toRes, 30);
  };

  const opt = (v: string | number, label: string) => <option key={v} value={v}>{label}</option>;
  const numOrNull = (v: string) => (v === "" ? null : Number(v));

  const detailId = STATIC_PREVIEW && hash.startsWith("#inzerat-") ? Number(hash.slice(9)) : null;
  const closeHash = () => { history.replaceState(null, "", window.location.pathname + window.location.search); setHash(""); };

  return (
    <main id="pub" tabIndex={-1}>
      <section className="hero"><div className="in"><span id="main" />
        <h1>Použité autodiely presne na vaše auto</h1>
        <p className="sub">Vyberte značku, model a motorizáciu a uvidíte len diely, ktoré naň pasujú. Predajcov kontaktujete bez registrácie.</p>
        <div className="qb" aria-label="Najčastejšie značky">
          {quick.map((b) => (
            <button key={b.id} className="chip" onClick={() => { set({ brand: b.id, model: null, engine: null, year: null }); panelRef.current?.scrollIntoView({ behavior: "smooth", block: "center" }); }}>{b.name}</button>
          ))}
        </div>
      </div></section>

      <div className="wrap">
        <section className="panel" aria-label="Hľadanie dielov" ref={panelRef}>
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
            <label>Kategória
              <select value={f.cat} onChange={(e) => set({ cat: e.target.value, sub: null })}>
                {opt("", "Všetky kategórie")}{cats.map((c) => opt(c.id, c.name))}
              </select>
            </label>
            <label>Motorizácia
              <select value={f.engine ?? ""} disabled={!model} onChange={(e) => set({ engine: numOrNull(e.target.value) })}>
                {opt("", model ? "Všetky motorizácie" : "Najprv vyberte model")}{engines.map((x) => opt(x.id, x.name))}
              </select>
            </label>
          </div>
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
                {opt("", "Každý stav")}{opt("Veľmi dobrý", "Veľmi dobrý")}{opt("Dobrý", "Dobrý")}{opt("Na opravu", "Na opravu")}
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
          </div>
          <div className="pa">
            <button className="lnk" aria-expanded={adv} onClick={() => setAdv(!adv)}>Rozšírené hľadanie</button>
            <button className="btn" onClick={toRes}>Hľadať</button>
          </div>
        </section>

        <section className="plate" aria-label="Hľadanie podľa VIN">
          <h2>Hľadať podľa VIN</h2>
          <div className="pg2">
            <label>VIN (17 znakov)
              <span className="pl"><span className="eu">VIN</span>
                <input value={vin} onChange={(e) => setVin(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter") onVin(); }} placeholder="TMBJJ7NE0G0123456" maxLength={17} autoComplete="off" />
              </span>
            </label>
            <label>Hľadám
              <select value={vinCat} onChange={(e) => setVinCat(e.target.value)}>{opt("", "Všetky diely")}{cats.map((c) => opt(c.id, c.name))}</select>
            </label>
            <button className="btn2" onClick={onVin}>Dekódovať VIN</button>
          </div>
          <p>VIN nájdete v osvedčení o evidencii (časť I, pole E) a na štítku pri čelnom skle. Z VIN prečítame značku a približný ročník. Model a motorizáciu vyberte v paneli vyššie. Podľa ŠPZ nehľadáme.</p>
          <p className="vmsg" role="status">{vinMsg}</p>
        </section>

        <div id="vysledky" ref={resRef} className="head">
          <span className="cnt" aria-live="polite">{res ? pieces(res.total) : "Načítavam…"}</span>
          <button className="chip" aria-pressed={f.fav} onClick={() => set({ fav: !f.fav })}>♥ Obľúbené</button>
        </div>

        {res && catalog && (
          <div className="chips" aria-label="Kategórie nájdených dielov">
            <button className="chip" aria-pressed={!f.cat} onClick={() => set({ cat: "", sub: null })}>Všetky ({res.facets.base})</button>
            {cats.filter((c) => res.facets.cat.get(c.id) || f.cat === c.id).map((c) => (
              <button key={c.id} className="chip" aria-pressed={f.cat === c.id} onClick={() => set({ cat: f.cat === c.id ? "" : c.id, sub: null })}>
                <Icon id={catIcon(c.id)} />{c.name} ({res.facets.cat.get(c.id) || 0})
              </button>
            ))}
            {f.cat && subs.filter((s) => res.facets.sub.get(s.id) || f.sub === s.id).map((s) => (
              <button key={s.id} className="chip" aria-pressed={f.sub === s.id} onClick={() => set({ sub: f.sub === s.id ? null : s.id })}>{s.name} ({res.facets.sub.get(s.id) || 0})</button>
            ))}
          </div>
        )}

        {loadErr && <div className="err" role="alert">Údaje sa nepodarilo načítať: {loadErr}</div>}

        <div className="grid">
          {!res && !loadErr && <div className="loading">Načítavam inzeráty…</div>}
          {res && catalog && res.total > 0 && res.items.slice(0, shown).map((l) => (
            <ListingCard key={l.id} l={l} cat={catalog} fav={favs.includes(l.id)} onFav={toggle} />
          ))}
          {res && res.total > shown && (
            <button className="add more" onClick={() => setShown(shown + PAGE)}>Načítať viac ({res.total - shown})</button>
          )}
          {res && res.total === 0 && (
            <div className="empty">Nič sme nenašli. Skúste iné slovo, kategóriu alebo všetky značky.<br />
              <button className="add" onClick={reset}>Zrušiť všetky filtre</button>
            </div>
          )}
        </div>

        <section className="how" aria-label="Ako to funguje">
          <div><b>1</b><h3>Vyberte svoje auto</h3><p>Značka, model a motorizácia, alebo VIN číslo. Diely, ktoré naň pasujú, uvidíte hneď.</p></div>
          <div><b>2</b><h3>Nájdite diel</h3><p>Zúžte výber podľa kategórie, ceny, stavu alebo mesta a porovnajte OEM číslo so starým dielom.</p></div>
          <div><b>3</b><h3>Zavolajte predajcovi</h3><p>Bez registrácie. Telefón sa zobrazí jedným kliknutím a dohodnete sa priamo s predajcom.</p></div>
        </section>
      </div>

      {detailId != null && (
        <div className="overlay" onClick={(e) => { if (e.target === e.currentTarget) closeHash(); }}>
          <ListingDetail id={detailId} onClose={closeHash} />
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
