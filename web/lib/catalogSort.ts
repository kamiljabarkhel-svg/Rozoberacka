// Poradie modelov v ponuke: podľa modelového radu (abecedne) a v rade podľa roku od.
// Bez toho by sa nové generácie pridané neskôr (napr. Golf III) zobrazili až za Golf VIII.
import type { Catalog, Model, VehicleType } from "./types";

const sk = new Intl.Collator("sk", { numeric: true, sensitivity: "base" });

/** „Golf VII“ → „Golf“, „3 (E46)“ → „3“, „Passat B8“ → „Passat“, „C (W204)“ → „C“. */
export function modelFamily(name: string): string {
  let s = name.replace(/\s*\(.*\)\s*$/, "").trim();
  s = s.replace(/\s+(?:I{1,3}|IV|V|VI{0,3}|IX|X|XI|B\d{1,2}|C\d|D\d|Mk\s?\d+|[A-Z]{1,2}\d{1,3}[A-Z]?)$/, "").trim();
  return s || name;
}

export function sortModels<T extends Pick<Model, "name" | "yearFrom">>(list: T[]): T[] {
  return [...list].sort((a, b) => sk.compare(modelFamily(a.name), modelFamily(b.name)) || a.yearFrom - b.yearFrom || sk.compare(a.name, b.name));
}

export function sortCatalog(c: Catalog): Catalog {
  return { ...c, models: sortModels(c.models) };
}

// ---------- Menší katalóg pre stránky ----------
type Ref = { brandId: number | null; modelId: number | null; engineId: number | null; fits?: { brandId: number; modelId: number | null; engineId: number | null }[] };

/** Len modely a motorizácie, ktoré stránka naozaj zobrazuje (značky a kategórie celé – sú malé).
 *  Celý katalóg má tisíce motorizácií; na stránke dielu by zbytočne pridal stovky kB. */
export function pickCatalog(cat: Catalog, items: Ref[], vehicles: Ref[] = []): Catalog {
  const ms = new Set<number>(), es = new Set<number>();
  const add = (r: { modelId: number | null; engineId: number | null }) => { if (r.modelId != null) ms.add(r.modelId); if (r.engineId != null) es.add(r.engineId); };
  for (const x of [...items, ...vehicles]) { add(x); for (const f of x.fits || []) add(f); }
  return { ...cat, models: cat.models.filter((m) => ms.has(m.id)), engines: cat.engines.filter((e) => es.has(e.id)) };
}

/** Kompaktný tvar katalógu na prenos do prehliadača (polia namiesto objektov – asi polovičná veľkosť). */
export type PackedCatalog = {
  b: [number, string, 0 | 1][]; m: [number, number, string, number, number | null, string?][]; e: [number, number, string][];
  c: Catalog["categories"]; s: Catalog["subcategories"];
};
export function packCatalog(c: Catalog): PackedCatalog {
  return { b: c.brands.map((x) => [x.id, x.name, x.popular ? 1 : 0]), m: c.models.map((x) => (x.vehicleType && x.vehicleType !== "osobne" ? [x.id, x.brandId, x.name, x.yearFrom, x.yearTo, x.vehicleType] : [x.id, x.brandId, x.name, x.yearFrom, x.yearTo])),
    e: c.engines.map((x) => [x.id, x.modelId, x.name]), c: c.categories, s: c.subcategories };
}
export function unpackCatalog(p: PackedCatalog): Catalog {
  return { brands: p.b.map(([id, name, pop]) => ({ id, name, popular: pop === 1 })), models: p.m.map(([id, brandId, name, yearFrom, yearTo, vt]) => ({ id, brandId, name, yearFrom, yearTo, vehicleType: (vt || "osobne") as VehicleType })),
    engines: p.e.map(([id, modelId, name]) => ({ id, modelId, name })), categories: p.c, subcategories: p.s };
}
