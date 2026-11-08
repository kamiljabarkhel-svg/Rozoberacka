// Spoločné typy pre celý web. Názvy polí zodpovedajú tabuľkám v supabase/01_schema.sql.

export type Brand = { id: number; name: string; popular: boolean };
export type VehicleType = "osobne" | "dodavky" | "nakladne" | "autobusy" | "motorky";
export const VEHICLE_TYPES: { id: VehicleType; name: string; short: string }[] = [
  { id: "osobne", name: "Osobné autá", short: "Osobné" }, { id: "dodavky", name: "Dodávky", short: "Dodávky" },
  { id: "nakladne", name: "Nákladné autá", short: "Nákladné" }, { id: "autobusy", name: "Autobusy", short: "Autobusy" },
  { id: "motorky", name: "Motorky a štvorkolky", short: "Motorky" },
];
export type Model = { id: number; brandId: number; name: string; yearFrom: number; yearTo: number | null; vehicleType?: VehicleType };
export type Engine = { id: number; modelId: number; name: string };
export type Category = { id: string; name: string; sort: number; vtypes?: VehicleType[] | null };
export type Subcategory = { id: number; categoryId: string; name: string; sort: number };

export type Catalog = {
  brands: Brand[];
  models: Model[];
  engines: Engine[];
  categories: Category[];
  subcategories: Subcategory[];
};

/** Auto, na ktoré diel pasuje. model/engine null = všetky modely / všetky motorizácie. */
export type Vehicle = { brandId: number; modelId: number | null; engineId: number | null };

export type Condition = "Nový" | "Repasovaný" | "Veľmi dobrý" | "Dobrý" | "Na opravu";
/** Všetky stavy v poradí, v akom sa ponúkajú. „Nový“ = nepoužitý diel (napr. zo zásob). */
export const CONDITIONS: Condition[] = ["Nový", "Repasovaný", "Veľmi dobrý", "Dobrý", "Na opravu"];
export const condLabel = (c: string) => (c === "Nový" ? "Nový (nepoužitý)" : c);

/** type: „Firma“ = podnikateľ (obchodník) podľa vyhlásenia predajcu, „Súkromná osoba“ = nepredáva v rámci podnikania.
 *  ico/address: verejné údaje obchodníka (len pri podnikateľovi). */
export type Seller = { name: string; type: string; city: string | null; verified: boolean; ico?: string | null; address?: string | null };

export type Listing = {
  id: number;
  name: string;
  brandId: number | null;
  modelId: number | null;
  engineId: number | null;
  year: number | null;
  categoryId: string;
  subcategoryId: number | null;
  oem: string | null;
  price: number;
  city: string | null;
  condition: Condition;
  description: string | null;
  warranty: string;
  shipping: string;
  createdAt: string;
  photos: string[]; // úplné adresy obrázkov, prvá je hlavná
  thumbs: string[]; // zmenšené fotky pre karty (ak chýbajú, použije sa veľká)
  mediums: string[]; // stredné fotky pre detail na mobile (ak chýbajú, použije sa veľká)
  updatedAt: string;
  fits: Vehicle[]; // „Pasuje aj na“ zadané predajcom
  seller: Seller;
  sellerId: string;
  donorId: number | null;   // darcovské auto, z ktorého je diel
  side: "Ľavá" | "Pravá" | null;
  gearbox: string | null;   // prevodovka auta, z ktorého je diel
  km: number | null;        // najazdené km auta
  tested: boolean;          // odskúšaný podľa predajcu
  returns14: boolean;       // vrátenie do 14 dní
  top: boolean;             // zvýraznený (TOP) inzerát
  partMaker: string | null; // výrobca dielu (Bosch, Valeo…)
  specs: Specs;             // parametre pneumatík a diskov
};

export type Filters = {
  vtype: VehicleType | "";
  specs: Specs;
  q: string;
  brand: number | null;
  model: number | null;
  engine: number | null;
  year: number | null;
  cat: string;
  sub: number | null;
  max: number | null;
  cond: string;
  city: string;
  sort: "new" | "asc" | "desc";
  fav: boolean;
  side: string;
  tested: boolean;
  ret: boolean;
};

export const emptyFilters: Filters = {
  vtype: "", specs: {},
  q: "", brand: null, model: null, engine: null, year: null, cat: "", sub: null,
  max: null, cond: "", city: "", sort: "new", fav: false, side: "", tested: false, ret: false,
};

// ---------- Pneumatiky a disky ----------
/** Parametre kolies (kľúče rovnaké ako v databáze listings.specs). */
export type Specs = Partial<Record<"tw" | "tp" | "rd" | "season" | "tread" | "dot" | "li" | "si" | "rw" | "pcd" | "et" | "cb" | "pcs" | "mat", string>>;
export const SEASONS = ["letné", "zimné", "celoročné"] as const;
export const PCDS = ["4x98", "4x100", "4x108", "4x114.3", "5x98", "5x100", "5x108", "5x110", "5x112", "5x114.3", "5x115", "5x118", "5x120", "5x127", "5x130", "5x160", "6x114.3", "6x130", "6x139.7", "8x165.1", "10x225", "10x335"];
export const RIM_DIAMETERS = ["13", "14", "15", "16", "17", "18", "19", "20", "21", "22", "17.5", "19.5", "22.5"];
/** Kategória Pneumatiky a disky. */
export const WHEEL_CAT = "kol";
/** Krátky popis parametrov na kartu: „205/55 R16 · zimné · 6 mm“ alebo „5x112 · R17 · 7J ET49“. */
export function specsLine(s: Specs | null | undefined): string {
  if (!s) return "";
  const tire = s.tw && s.tp && s.rd ? `${s.tw}/${s.tp} R${s.rd}` : "";
  const rim = [s.pcd, !tire && s.rd ? `R${s.rd}` : "", s.rw ? `${s.rw}J` : "", s.et ? `ET${s.et}` : ""].filter(Boolean).join(" ");
  return [tire, s.season, s.tread ? `${s.tread} mm` : "", rim, s.pcs ? `${s.pcs} ks` : ""].filter(Boolean).join(" · ");
}

/** Rovnaké pravidlá ako public.specs_ok v databáze (18). Vráti len vyplnené, upravené hodnoty. */
const SPEC_RULES: Record<keyof Specs, (v: string) => boolean> = {
  tw: (v) => /^\d{2,3}$/.test(v) && +v >= 100 && +v <= 460,
  tp: (v) => /^\d{2,3}$/.test(v) && +v >= 25 && +v <= 100,
  rd: (v) => /^\d{2}(\.5)?$/.test(v) && +v >= 10 && +v <= 26,
  season: (v) => (SEASONS as readonly string[]).includes(v),
  tread: (v) => /^\d{1,2}(\.\d)?$/.test(v) && +v <= 30,
  dot: (v) => /^(19|20)\d{2}$/.test(v),
  li: (v) => /^\d{2,3}(\/\d{2,3})?$/.test(v),
  si: (v) => /^[A-Z]{1,2}$/.test(v),
  rw: (v) => /^\d{1,2}(\.5)?$/.test(v) && +v >= 3 && +v <= 15,
  pcd: (v) => /^[3-8]x\d{2,3}(\.\d)?$/.test(v),
  et: (v) => /^-?\d{1,3}$/.test(v) && +v >= -100 && +v <= 200,
  cb: (v) => /^\d{2,3}(\.\d)?$/.test(v),
  pcs: (v) => /^\d{1,2}$/.test(v) && +v >= 1 && +v <= 12,
  mat: (v) => v === "Hliník" || v === "Oceľ",
};
export const SPEC_LABEL: Record<keyof Specs, string> = {
  tw: "Šírka pneumatiky", tp: "Profil (výška)", rd: "Priemer (palce)", season: "Sezóna", tread: "Dezén (mm)", dot: "Rok výroby (DOT)",
  li: "Index nosnosti", si: "Index rýchlosti", rw: "Šírka disku (J)", pcd: "Rozteč (PCD)", et: "Zális (ET)", cb: "Stredový otvor (mm)", pcs: "Počet kusov", mat: "Materiál disku",
};
function normSpec(k: keyof Specs, v: string): string {
  let x = v.trim().replace(",", ".");
  if (k === "pcd") x = x.toLowerCase().replace(/[×*\s]/g, "x").replace(/x+/g, "x");
  if (k === "si") x = x.toUpperCase();
  if (k === "rd" || k === "rw") x = x.replace(/^r/i, "").replace(/j$/i, "").replace(/\.0$/, "");
  if (k === "et") x = x.replace(/^et/i, "");
  return x;
}
export function cleanSpecs(s: Specs | null | undefined): Specs {
  const o: Specs = {};
  for (const [k, v] of Object.entries(s || {}) as [keyof Specs, string][]) { const x = v ? normSpec(k, v) : ""; if (x && SPEC_RULES[k]?.(x)) o[k] = x; }
  return o;
}
/** Polia, ktoré sú vyplnené, ale nesprávne. */
export function specsErrors(s: Specs | null | undefined): (keyof Specs)[] {
  return (Object.entries(s || {}) as [keyof Specs, string][]).filter(([k, v]) => v && v.trim() && !SPEC_RULES[k]?.(normSpec(k, v))).map(([k]) => k);
}

// ---------- Havarované vozidlá na predaj ----------
export const CAR_CONDITIONS = ["Havarované – pojazdné", "Havarované – nepojazdné", "Nepojazdné – porucha", "Na diely", "Po požiari alebo povodni"] as const;
export const CAR_DAMAGE = ["Predok", "Zadok", "Ľavý bok", "Pravý bok", "Strecha", "Podvozok", "Motor", "Prevodovka", "Elektrika", "Interiér"] as const;
export const CAR_DOCS = ["S dokladmi – prihlásené", "S dokladmi – odhlásené", "Bez dokladov – len na diely"] as const;
export const FUELS = ["Benzín", "Nafta", "LPG", "CNG", "Hybrid", "Plug-in hybrid", "Elektro"] as const;
export type CarListing = {
  id: number; vehicleType: VehicleType; brandId: number; modelId: number | null; engineId: number | null; year: number; km: number | null;
  fuel: string | null; gearbox: string | null; color: string | null; condition: string; damage: string[]; starts: boolean | null; docs: string;
  stkUntil: string | null; price: number; city: string; description: string; donorId: number | null; createdAt: string; updatedAt: string;
  sellerId: string; seller: Seller; photos: string[]; thumbs: string[]; mediums: string[]; parts: number; status?: string;
};
export type CarFilters = { vtype: VehicleType | ""; brand: number | null; model: number | null; yfrom: number | null; yto: number | null; max: number | null; cond: string; fuel: string; docs: boolean; city: string; q: string; sort: "new" | "asc" | "desc" | "year" | "km" };
export const emptyCarFilters: CarFilters = { vtype: "", brand: null, model: null, yfrom: null, yto: null, max: null, cond: "", fuel: "", docs: false, city: "", q: "", sort: "new" };
