// Dátová vrstva. Jediné miesto, kde web získava údaje.
// - Ak sú nastavené NEXT_PUBLIC_SUPABASE_URL a NEXT_PUBLIC_SUPABASE_ANON_KEY, číta zo Supabase
//   (tabuľky a funkcie podľa supabase/01_schema.sql).
// - Inak beží v ukážkovom (demo) režime s katalógom zo supabase/02_kategorie.sql a 03_katalog.sql
//   a s ukážkovými inzerátmi z prototypu.
// Do prehliadača ide len verejný anon kľúč. Tajné kľúče sem nepatria.
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import demoCatalogJson from "./demo/catalog.json";
import { buildDemoListings } from "./demo/listings";
import { allVehicles, buildOemIndex, search as localSearch } from "./search";
import type { Catalog, Condition, Filters, Listing, Vehicle } from "./types";
import { emptyFilters } from "./types";

const URL_ = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
const KEY_ = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "";
const STATIC_PREVIEW = process.env.NEXT_PUBLIC_STATIC_PREVIEW === "1";

/** true = ukážkový režim (bez databázy). */
export const IS_DEMO = STATIC_PREVIEW || !URL_ || !KEY_;
export const PHOTO_BUCKET = "listing-photos";

// ---------- DEMO ----------
const demoCatalog: Catalog = {
  brands: demoCatalogJson.brands,
  models: demoCatalogJson.models,
  engines: demoCatalogJson.engines,
  categories: demoCatalogJson.categories,
  subcategories: demoCatalogJson.subcategories,
};
let demoCache: ReturnType<typeof buildDemoListings> | null = null;
function demo() {
  if (!demoCache) demoCache = buildDemoListings(demoCatalog);
  return demoCache;
}

/** Údaje, ktoré sa dajú vykresliť hneď (len v demo režime), aby stránka nebola prázdna. */
export function initialData(): { catalog: Catalog; listings: Listing[] } | null {
  return IS_DEMO ? { catalog: demoCatalog, listings: demo().listings } : null;
}

// ---------- SUPABASE ----------
let sb: SupabaseClient | null = null;
function client(): SupabaseClient {
  if (!sb) sb = createClient(URL_, KEY_, { auth: { persistSession: false } });
  return sb;
}

/** Načíta celú tabuľku po 1000 riadkoch (Supabase vracia najviac 1000 naraz). */
async function selectAll<T>(table: string, cols: string, order: string): Promise<T[]> {
  const out: T[] = [];
  for (let from = 0; ; from += 1000) {
    const { data, error } = await client().from(table).select(cols).order(order).range(from, from + 999);
    if (error) throw new Error(`${table}: ${error.message}`);
    out.push(...((data || []) as T[]));
    if (!data || data.length < 1000) return out;
  }
}

type Row = Record<string, unknown>;

/** Ako selectAll, ale len riadky so zadanými hodnotami stĺpcov. */
async function selectAllWhere<T>(table: string, cols: string, order: string, eq: Record<string, string>): Promise<T[]> {
  const out: T[] = [];
  for (let from = 0; ; from += 1000) {
    let q = client().from(table).select(cols);
    for (const [k, v] of Object.entries(eq)) q = q.eq(k, v);
    const { data, error } = await q.order(order).range(from, from + 999);
    if (error) throw new Error(`${table}: ${error.message}`);
    out.push(...((data || []) as T[]));
    if (!data || data.length < 1000) return out;
  }
}

function photoUrl(path: string): string {
  if (/^https?:|^data:/.test(path)) return path;
  return `${URL_}/storage/v1/object/public/${PHOTO_BUCKET}/${path.split("/").map(encodeURIComponent).join("/")}`;
}
/** Zmenšená fotka „…_t.jpg“ (vytvára sa pri nahratí od 3. 11. 2026). */
export function thumbPath(path: string): string {
  return /^https?:|^data:/.test(path) ? path : path.replace(/\.jpg$/, "_t.jpg");
}

const LISTING_COLS =
  "id,name,brand_id,model_id,engine_id,year,category_id,subcategory_id,oem,price,city,condition,description,warranty,shipping,created_at,updated_at,seller_id,donor_id," +
  "side,donor_gearbox,donor_km,tested,returns_14d,top_until,part_maker," +
  "sellers(name,seller_type,city,verified),listing_photos(path,position),listing_fits(brand_id,model_id,engine_id)";

function toListing(r: Row): Listing {
  const s = (r.sellers || {}) as Row;
  const photos = ((r.listing_photos || []) as Row[]).slice().sort((a, b) => Number(a.position) - Number(b.position));
  return {
    id: Number(r.id), name: String(r.name),
    brandId: (r.brand_id as number) ?? null, modelId: (r.model_id as number) ?? null, engineId: (r.engine_id as number) ?? null,
    year: (r.year as number) ?? null, categoryId: String(r.category_id), subcategoryId: (r.subcategory_id as number) ?? null,
    oem: (r.oem as string) ?? null, price: Number(r.price), city: (r.city as string) ?? null,
    condition: r.condition as Condition, description: (r.description as string) ?? null,
    warranty: String(r.warranty), shipping: String(r.shipping), createdAt: String(r.created_at),
    photos: photos.map((p) => photoUrl(String(p.path))),
    thumbs: photos.map((p) => photoUrl(thumbPath(String(p.path)))),
    updatedAt: String(r.updated_at || r.created_at),
    fits: ((r.listing_fits || []) as Row[]).map((f) => ({ brandId: f.brand_id as number, modelId: (f.model_id as number) ?? null, engineId: (f.engine_id as number) ?? null })),
    sellerId: String(r.seller_id || ""), donorId: (r.donor_id as number) ?? null,
    seller: { name: String(s.name || "Predajca"), type: String(s.seller_type || "Firma"), city: (s.city as string) ?? null, verified: Boolean(s.verified) },
    side: (r.side as Listing["side"]) ?? null, gearbox: (r.donor_gearbox as string) ?? null, km: (r.donor_km as number) ?? null,
    tested: Boolean(r.tested), returns14: Boolean(r.returns_14d),
    top: !!r.top_until && Date.parse(String(r.top_until)) > Date.now(), partMaker: (r.part_maker as string) ?? null,
  };
}

// ---------- VEREJNÉ FUNKCIE ----------

/** Katalóg áut a kategórie dielov. */
export async function getCatalog(): Promise<Catalog> {
  if (IS_DEMO) return demoCatalog;
  const [b, m, e, c, s] = await Promise.all([
    selectAll<Row>("brands", "id,name,popular", "id"),
    selectAll<Row>("models", "id,brand_id,name,year_from,year_to", "id"),
    selectAll<Row>("engines", "id,model_id,name", "id"),
    selectAll<Row>("categories", "id,name,sort", "sort"),
    selectAll<Row>("subcategories", "id,category_id,name,sort", "sort"),
  ]);
  return {
    brands: b.map((x) => ({ id: x.id as number, name: String(x.name), popular: Boolean(x.popular) })),
    models: m.map((x) => ({ id: x.id as number, brandId: x.brand_id as number, name: String(x.name), yearFrom: x.year_from as number, yearTo: (x.year_to as number) ?? null })),
    engines: e.map((x) => ({ id: x.id as number, modelId: x.model_id as number, name: String(x.name) })),
    categories: c.map((x) => ({ id: String(x.id), name: String(x.name), sort: x.sort as number })),
    subcategories: s.map((x) => ({ id: x.id as number, categoryId: String(x.category_id), name: String(x.name), sort: x.sort as number })),
  };
}

export type SearchPage = { items: Listing[]; total: number; base: number; cats: Map<string, number>; subs: Map<number, number> };

/** Hľadanie inzerátov. So Supabase beží v databáze (funkcia search_listings), v ukážke v prehliadači. */
export async function searchListings(f: Filters, favs: number[], offset: number, limit: number, extra: { exclude?: number; seller?: string; donor?: number } = {}): Promise<SearchPage> {
  if (IS_DEMO) {
    let all = demo().listings;
    if (extra.exclude != null) all = all.filter((l) => l.id !== extra.exclude);
    if (extra.seller) all = all.filter((l) => l.sellerId === extra.seller);
    if (extra.donor != null) all = all.filter((l) => l.donorId === extra.donor);
    const r = localSearch(all, f, demoCatalog, favs);
    return { items: r.items.slice(offset, offset + limit), total: r.total, base: r.facets.base, cats: r.facets.cat, subs: r.facets.sub };
  }
  const p: Record<string, unknown> = { q: f.q.trim(), brand: f.brand, model: f.model, engine: f.engine, year: f.year, cat: f.cat, sub: f.sub,
    max: f.max, cond: f.cond, city: f.city, side: f.side, tested: f.tested, ret: f.ret, sort: f.sort, limit, offset, ...extra };
  if (f.fav) p.ids = favs;
  const { data, error } = await client().rpc("search_listings", { p });
  if (error) throw new Error("search: " + error.message);
  const d = (data || {}) as { total?: number; base?: number; cats?: Record<string, number>; subs?: Record<string, number>; items?: Row[] };
  return {
    items: (d.items || []).map(toListing), total: Number(d.total || 0), base: Number(d.base || 0),
    cats: new Map(Object.entries(d.cats || {}).map(([k, v]) => [k, Number(v)])),
    subs: new Map(Object.entries(d.subs || {}).map(([k, v]) => [Number(k), Number(v)])),
  };
}

/** Mestá, v ktorých sú aktívne inzeráty (filter Mesto). */
export async function getCities(): Promise<string[]> {
  if (IS_DEMO) return [...new Set(demo().listings.map((l) => l.city).filter((c): c is string => !!c))].sort((a, b) => a.localeCompare(b, "sk"));
  const { data, error } = await client().rpc("listing_cities");
  if (error) throw new Error("cities: " + error.message);
  return ((data || []) as unknown[]).map((x) => String(typeof x === "object" && x ? Object.values(x)[0] : x));
}

/** Podobné inzeráty: rovnaká kategória a značka, inak rovnaká kategória. */
export async function getSimilar(l: Listing): Promise<Listing[]> {
  const base = { ...emptyFilters, cat: l.categoryId };
  const a = await searchListings({ ...base, brand: l.brandId }, [], 0, 4, { exclude: l.id });
  if (a.items.length >= 3) return a.items.slice(0, 3);
  const b = await searchListings(base, [], 0, 4, { exclude: l.id });
  const seen = new Set(a.items.map((x) => x.id));
  return a.items.concat(b.items.filter((x) => !seen.has(x.id))).slice(0, 3);
}

/** Ďalšie aktívne diely toho istého predajcu (najnovšie). */
export async function getSellerListings(l: Listing): Promise<{ items: Listing[]; total: number }> {
  if (!l.sellerId) return { items: [], total: 0 };
  const r = await searchListings({ ...emptyFilters }, [], 0, 4, { exclude: l.id, seller: l.sellerId });
  return { items: r.items, total: r.total };
}

/** Nahlásenie inzerátu (podvod, nepravdivé údaje…). */
export async function reportListing(id: number, reason: string, note: string, contact: string): Promise<void> {
  if (IS_DEMO) return;
  const { error } = await client().rpc("report_listing", { p_listing: id, p_reason: reason, p_note: note, p_contact: contact });
  if (error) throw new Error(error.message);
}

/** Jeden inzerát (len aktívny). */
export async function getListing(id: number): Promise<Listing | null> {
  if (IS_DEMO) return demo().listings.find((l) => l.id === id) || null;
  const { data, error } = await client().from("listings").select(LISTING_COLS).eq("id", id).eq("status", "active").maybeSingle();
  if (error) throw new Error("listing: " + error.message);
  return data ? toListing(data as unknown as Row) : null;
}

/** Všetky autá, na ktoré diel pasuje (vlastné auto + „pasuje aj na“ + rovnaké OEM). */
export async function getListingVehicles(listing: Listing): Promise<Vehicle[]> {
  if (IS_DEMO) return allVehicles(listing, buildOemIndex(demo().listings));
  const { data, error } = await client().rpc("listing_vehicles", { p_listing: listing.id });
  if (error) throw new Error("listing_vehicles: " + error.message);
  return ((data || []) as Row[]).map((r) => ({ brandId: r.brand_id as number, modelId: (r.model_id as number) ?? null, engineId: (r.engine_id as number) ?? null }));
}

/** Odkryje telefón (v databáze sa pripočíta odkrytie). Opakované kliknutie v tej istej relácii sa nepočíta znova. */
export async function revealPhone(id: number): Promise<string | null> {
  const key = "rz-tel-" + id;
  try { const c = sessionStorage.getItem(key); if (c) return c; } catch {}
  let phone: string | null;
  if (IS_DEMO) phone = demo().phones[id] || null;
  else {
    const { data, error } = await client().rpc("reveal_phone", { p_listing: id });
    if (error) throw new Error("reveal_phone: " + error.message);
    phone = (data as string | null) ?? null;
  }
  try { if (phone) sessionStorage.setItem(key, phone); } catch {}
  return phone;
}

/** Započíta zobrazenie inzerátu, najviac raz za reláciu prehliadača. */
export async function logView(id: number): Promise<void> {
  const key = "rz-view-" + id;
  try { if (sessionStorage.getItem(key)) return; sessionStorage.setItem(key, "1"); } catch {}
  if (IS_DEMO) return;
  const { error } = await client().rpc("log_view", { p_listing: id });
  if (error) console.warn("log_view:", error.message);
}

/** Počet aktívnych dielov a predajcov (číslo na úvode). */
export async function getStats(): Promise<{ parts: number; sellers: number }> {
  if (IS_DEMO) { const l = demo().listings; return { parts: l.length, sellers: new Set(l.map((x) => x.seller.name)).size }; }
  const { data, error } = await client().rpc("public_stats");
  if (error) throw new Error("public_stats: " + error.message);
  const r = ((data || []) as Row[])[0] || {};
  return { parts: Number(r.parts || 0), sellers: Number(r.sellers || 0) };
}

/** Správa predajcovi od kupujúceho (bez účtu). V databáze cez funkciu send_message s obmedzením počtu. */
export async function sendMessage(id: number, name: string, contact: string, body: string): Promise<void> {
  if (IS_DEMO) return;
  const { error } = await client().rpc("send_message", { p_listing: id, p_name: name, p_contact: contact, p_body: body });
  if (error) throw new Error(error.message);
}

/** Id ukážkových inzerátov (pre statické stránky detailu). */
export function demoListingIds(): number[] {
  return demo().listings.map((l) => l.id);
}

/** Všetko pre detail inzerátu naraz (používa server aj prehliadač). null = inzerát nie je aktívny. */
export type DetailData = { l: Listing; cat: Catalog; vehicles: Vehicle[]; similar: Listing[]; more: { items: Listing[]; total: number }; sameCar: Listing[] };
export async function loadDetail(id: number): Promise<DetailData | null> {
  const [cat, l] = await Promise.all([getCatalog(), getListing(id)]);
  if (!l) return null;
  const [vehicles, more] = await Promise.all([getListingVehicles(l), getSellerListings(l).catch(() => ({ items: [] as Listing[], total: 0 }))]);
  const sameCar = l.donorId != null ? (await searchListings({ ...emptyFilters }, [], 0, 7, { exclude: l.id, donor: l.donorId }).catch(() => null))?.items || [] : [];
  const seen = new Set([...more.items, ...sameCar].map((x) => x.id));
  const similar = (await getSimilar(l).catch(() => [] as Listing[])).filter((x) => !seen.has(x.id));
  return { l, cat, vehicles, similar, more: { ...more, items: more.items.filter((x) => !sameCar.some((y) => y.id === x.id)) }, sameCar };
}

/** Počty aktívnych inzerátov podľa auta a kategórie – pre stránky značiek a modelov, interné odkazy a sitemap. */
export type SeoCount = { brandId: number; modelId: number; categoryId: string; subcategoryId: number | null; n: number };
export async function getSeoCounts(): Promise<SeoCount[]> {
  if (IS_DEMO) {
    const m = new Map<string, SeoCount>();
    for (const l of demo().listings) {
      if (l.brandId == null || l.modelId == null) continue;
      const k = `${l.brandId}|${l.modelId}|${l.categoryId}|${l.subcategoryId}`;
      const c = m.get(k) || { brandId: l.brandId, modelId: l.modelId, categoryId: l.categoryId, subcategoryId: l.subcategoryId, n: 0 };
      c.n++; m.set(k, c);
    }
    return [...m.values()];
  }
  const { data, error } = await client().rpc("seo_counts");
  if (error) throw new Error("seo_counts: " + error.message);
  return ((data || []) as Row[]).map((r) => ({ brandId: Number(r.brand_id), modelId: Number(r.model_id), categoryId: String(r.category_id), subcategoryId: (r.subcategory_id as number) ?? null, n: Number(r.n) }));
}

/** Aktívne inzeráty pre sitemap (id, názov, auto, posledná zmena). */
export async function getSitemapListings(): Promise<{ id: number; name: string; brandId: number | null; modelId: number | null; engineId: number | null; updatedAt: string }[]> {
  if (IS_DEMO) return demo().listings.map((l) => ({ id: l.id, name: l.name, brandId: l.brandId, modelId: l.modelId, engineId: l.engineId, updatedAt: l.updatedAt }));
  const rows = await selectAllWhere<Row>("listings", "id,name,brand_id,model_id,updated_at", "id", { status: "active" });
  return rows.map((r) => ({ id: Number(r.id), name: String(r.name), brandId: (r.brand_id as number) ?? null, modelId: (r.model_id as number) ?? null, engineId: null, updatedAt: String(r.updated_at) }));
}

// ---------- DOPYT NA DIEL (kupujúci bez účtu) ----------
export type RequestInput = { brand: number; model: number | null; engine: number | null; year: number | null; vin: string; cat: string; part: string; note: string; name: string; contact: string; city: string };
export type RequestView = {
  id: number; status: "open" | "closed" | "expired"; brandId: number; modelId: number | null; engineId: number | null; year: number | null; categoryId: string | null;
  partName: string; note: string; city: string; createdAt: string; expiresAt: string;
  offers: { price: number; phone: string; note: string; listingId: number | null; listingName: string; createdAt: string; seller: string; sellerType: string; sellerCity: string; verified: boolean }[];
};
export async function createRequest(x: RequestInput): Promise<string> {
  if (IS_DEMO) throw new Error("V ukážkovom režime sa dopyt nedá odoslať.");
  const { data, error } = await client().rpc("create_part_request", { p: x });
  if (error) throw new Error(error.message);
  return String(data);
}
export async function getRequest(token: string): Promise<RequestView | null> {
  if (IS_DEMO || !/^[0-9a-f-]{36}$/i.test(token)) return null;
  const { data, error } = await client().rpc("get_part_request", { p_token: token });
  if (error) throw new Error(error.message);
  if (!data) return null;
  const r = data as Row;
  return {
    id: Number(r.id), status: r.status as RequestView["status"], brandId: Number(r.brand_id), modelId: (r.model_id as number) ?? null, engineId: (r.engine_id as number) ?? null,
    year: (r.year as number) ?? null, categoryId: (r.category_id as string) ?? null, partName: String(r.part_name), note: String(r.note || ""), city: String(r.city || ""),
    createdAt: String(r.created_at), expiresAt: String(r.expires_at),
    offers: ((r.offers || []) as Row[]).map((o) => ({ price: Number(o.price), phone: String(o.phone), note: String(o.note || ""), listingId: (o.listing_id as number) ?? null,
      listingName: String(o.listing_name || ""), createdAt: String(o.created_at), seller: String(o.seller), sellerType: String(o.seller_type), sellerCity: String(o.seller_city || ""), verified: !!o.verified })),
  };
}
export async function closeRequest(token: string): Promise<void> {
  const { error } = await client().rpc("close_part_request", { p_token: token });
  if (error) throw new Error(error.message);
}
