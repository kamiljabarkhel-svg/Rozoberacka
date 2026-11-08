// Hľadanie a zhoda dielov s autami. Rovnaká logika ako v prototype a ako funkcia listing_vehicles v databáze.
import type { Catalog, Filters, Listing, Vehicle } from "./types";
import { cleanSpecs } from "./types";

/** Normalizované OEM: bez medzier, pomlčiek a iných znakov, veľkými písmenami (ako stĺpec oem_key). */
export function oemKey(oem: string | null | undefined): string {
  return String(oem || "").replace(/[^A-Za-z0-9]/g, "").toUpperCase();
}
export const OEM_MIN = 4;

export type OemIndex = Map<string, Listing[]>;

export function buildOemIndex(listings: Listing[]): OemIndex {
  const idx: OemIndex = new Map();
  for (const l of listings) {
    const k = oemKey(l.oem);
    if (k.length < OEM_MIN) continue;
    const a = idx.get(k);
    if (a) a.push(l); else idx.set(k, [l]);
  }
  return idx;
}

function ownVehicles(l: Listing): Vehicle[] {
  const v: Vehicle[] = [];
  if (l.brandId != null) v.push({ brandId: l.brandId, modelId: l.modelId, engineId: l.engineId });
  return v.concat(l.fits);
}

/** Všetky autá, na ktoré diel pasuje: vlastné auto + „pasuje aj na“ + inzeráty s rovnakým OEM. */
export function allVehicles(l: Listing, idx: OemIndex): Vehicle[] {
  let out = ownVehicles(l);
  const k = oemKey(l.oem);
  if (k.length >= OEM_MIN) for (const x of idx.get(k) || []) if (x.id !== l.id) out = out.concat(ownVehicles(x));
  const seen = new Set<string>();
  return out.filter((v) => {
    const q = `${v.brandId}|${v.modelId}|${v.engineId}`;
    if (seen.has(q)) return false;
    seen.add(q);
    return true;
  });
}

/** Pasuje auto na filter? Chýbajúca motorizácia = všetky motorizácie modelu. */
function vehicleMatches(v: Vehicle, f: Filters): boolean {
  return (f.brand == null || v.brandId === f.brand)
    && (f.model == null || v.modelId === f.model)
    && (f.engine == null || v.engineId == null || v.engineId === f.engine);
}

function norm(s: string): string {
  return s.toLowerCase().replace(/\s/g, "");
}

export type SearchResult = { items: Listing[]; total: number; facets: { cat: Map<string, number>; sub: Map<number, number>; base: number } };

export function search(listings: Listing[], f: Filters, cat: Catalog, favs: number[]): SearchResult {
  const idx = buildOemIndex(listings);
  const brandName = new Map(cat.brands.map((b) => [b.id, b.name]));
  const modelName = new Map(cat.models.map((m) => [m.id, m.name]));
  const subName = new Map(cat.subcategories.map((s) => [s.id, s.name]));
  const q = norm(f.q);

  const pass = (l: Listing, withCat: boolean): boolean => {
    const own = l.brandId != null && vehicleMatches({ brandId: l.brandId, modelId: l.modelId, engineId: l.engineId }, f);
    if (!own && (f.brand != null || f.model != null || f.engine != null)) {
      if (!allVehicles(l, idx).some((v) => vehicleMatches(v, f))) return false;
    }
    if (withCat && f.cat && l.categoryId !== f.cat) return false;
    if (withCat && f.sub != null && l.subcategoryId !== f.sub) return false;
    if (f.year != null && own && l.year !== f.year) return false;
    if (f.cond && l.condition !== f.cond) return false;
    if (f.vtype && (cat.models.find((m) => m.id === l.modelId)?.vehicleType || "osobne") !== f.vtype) return false;
    if (f.specs && Object.entries(cleanSpecs(f.specs)).some(([k, v]) => v && (l.specs as Record<string, string | undefined>)?.[k] !== v)) return false;
    if (f.city && l.city !== f.city) return false;
    if (f.max != null && l.price > f.max) return false;
    if (f.fav && !favs.includes(l.id)) return false;
    if (f.side && l.side && l.side !== f.side) return false;
    if (f.tested && !l.tested) return false;
    if (f.ret && !l.returns14) return false;
    if (q) {
      const h = norm([l.name, brandName.get(l.brandId ?? -1) || "", modelName.get(l.modelId ?? -1) || "", l.oem || "", l.city || "",
        subName.get(l.subcategoryId ?? -1) || "", l.description || ""].join(" "));
      if (!h.includes(q) && !(oemKey(f.q).length >= OEM_MIN && oemKey(l.oem).includes(oemKey(f.q)))) return false;
    }
    return true;
  };

  const base = listings.filter((l) => pass(l, false));
  const items = base.filter((l) => pass(l, true));
  const catCount = new Map<string, number>();
  const subCount = new Map<number, number>();
  for (const l of base) {
    catCount.set(l.categoryId, (catCount.get(l.categoryId) || 0) + 1);
    if (f.cat && l.categoryId === f.cat && l.subcategoryId != null) subCount.set(l.subcategoryId, (subCount.get(l.subcategoryId) || 0) + 1);
  }
  if (f.sort === "asc") items.sort((a, b) => a.price - b.price);
  else if (f.sort === "desc") items.sort((a, b) => b.price - a.price);
  else items.sort((a, b) => Number(b.top) - Number(a.top) || b.createdAt.localeCompare(a.createdAt));
  return { items, total: items.length, facets: { cat: catCount, sub: subCount, base: base.length } };
}

/** Zoskupí autá pre zoznam „Pasuje na“: „Škoda Octavia III“ → všetky motorizácie alebo zoznam motorizácií. */
export function groupVehicles(vs: Vehicle[], cat: Catalog): { label: string; engines: string[] | null }[] {
  const b = new Map(cat.brands.map((x) => [x.id, x.name]));
  const m = new Map(cat.models.map((x) => [x.id, x.name]));
  const e = new Map(cat.engines.map((x) => [x.id, x.name]));
  const g = new Map<string, { all: boolean; e: string[] }>();
  for (const v of vs) {
    const k = `${b.get(v.brandId) || "?"} ${v.modelId != null ? m.get(v.modelId) || "?" : "(viac modelov)"}`;
    const cur = g.get(k) || { all: false, e: [] };
    if (v.engineId == null) cur.all = true;
    else { const n = e.get(v.engineId) || "?"; if (!cur.e.includes(n)) cur.e.push(n); }
    g.set(k, cur);
  }
  return [...g.entries()].map(([label, x]) => ({ label, engines: x.all ? null : x.e }));
}
