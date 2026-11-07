// Spoločné typy pre celý web. Názvy polí zodpovedajú tabuľkám v supabase/01_schema.sql.

export type Brand = { id: number; name: string; popular: boolean };
export type Model = { id: number; brandId: number; name: string; yearFrom: number; yearTo: number | null };
export type Engine = { id: number; modelId: number; name: string };
export type Category = { id: string; name: string; sort: number };
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

export type Seller = { name: string; type: string; city: string | null; verified: boolean };

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
};

export type Filters = {
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
  q: "", brand: null, model: null, engine: null, year: null, cat: "", sub: null,
  max: null, cond: "", city: "", sort: "new", fav: false, side: "", tested: false, ret: false,
};
