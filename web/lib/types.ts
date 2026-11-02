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

export type Condition = "Veľmi dobrý" | "Dobrý" | "Na opravu";

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
  fits: Vehicle[]; // „Pasuje aj na“ zadané predajcom
  seller: Seller;
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
};

export const emptyFilters: Filters = {
  q: "", brand: null, model: null, engine: null, year: null, cat: "", sub: null,
  max: null, cond: "", city: "", sort: "new", fav: false,
};
