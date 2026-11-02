// Dátová vrstva. Jediné miesto, kde web získava údaje.
// - Ak sú nastavené NEXT_PUBLIC_SUPABASE_URL a NEXT_PUBLIC_SUPABASE_ANON_KEY, číta zo Supabase
//   (tabuľky a funkcie podľa supabase/01_schema.sql).
// - Inak beží v ukážkovom (demo) režime s katalógom zo supabase/02_kategorie.sql a 03_katalog.sql
//   a s ukážkovými inzerátmi z prototypu.
// Do prehliadača ide len verejný anon kľúč. Tajné kľúče sem nepatria.
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import demoCatalogJson from "./demo/catalog.json";
import { buildDemoListings } from "./demo/listings";
import { allVehicles, buildOemIndex } from "./search";
import type { Catalog, Condition, Listing, Vehicle } from "./types";

const URL_ = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
const KEY_ = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "";
const STATIC_PREVIEW = process.env.NEXT_PUBLIC_STATIC_PREVIEW === "1";

/** true = ukážkový režim (bez databázy). */
export const IS_DEMO = STATIC_PREVIEW || !URL_ || !KEY_;
export const PHOTO_BUCKET = "listing-photos";
/** Koľko aktívnych inzerátov sa načíta naraz (hľadanie zatiaľ beží v prehliadači). */
const LIST_LIMIT = 1000;

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

function photoUrl(path: string): string {
  if (/^https?:|^data:/.test(path)) return path;
  return `${URL_}/storage/v1/object/public/${PHOTO_BUCKET}/${path.split("/").map(encodeURIComponent).join("/")}`;
}

const LISTING_COLS =
  "id,name,brand_id,model_id,engine_id,year,category_id,subcategory_id,oem,price,city,condition,description,warranty,shipping,created_at," +
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
    fits: ((r.listing_fits || []) as Row[]).map((f) => ({ brandId: f.brand_id as number, modelId: (f.model_id as number) ?? null, engineId: (f.engine_id as number) ?? null })),
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

/** Aktívne inzeráty (najnovšie prvé). Filtrovanie a facety robí lib/search.ts. */
export async function getActiveListings(): Promise<Listing[]> {
  if (IS_DEMO) return demo().listings;
  const { data, error } = await client().from("listings").select(LISTING_COLS)
    .eq("status", "active").order("created_at", { ascending: false }).limit(LIST_LIMIT);
  if (error) throw new Error("listings: " + error.message);
  return ((data || []) as unknown as Row[]).map(toListing);
}

/** Jeden inzerát (len aktívny). */
export async function getListing(id: number): Promise<Listing | null> {
  if (IS_DEMO) return demo().listings.find((l) => l.id === id) || null;
  const { data, error } = await client().from("listings").select(LISTING_COLS).eq("id", id).eq("status", "active").maybeSingle();
  if (error) throw new Error("listing: " + error.message);
  return data ? toListing(data as unknown as Row) : null;
}

/** Všetky autá, na ktoré diel pasuje (vlastné auto + „pasuje aj na“ + rovnaké OEM). */
export async function getListingVehicles(listing: Listing, all: Listing[]): Promise<Vehicle[]> {
  if (IS_DEMO) return allVehicles(listing, buildOemIndex(all));
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
export async function getStats(listings: Listing[]): Promise<{ parts: number; sellers: number }> {
  if (IS_DEMO) return { parts: listings.length, sellers: new Set(listings.map((l) => l.seller.name)).size };
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
