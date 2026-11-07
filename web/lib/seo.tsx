// Pomôcky pre vyhľadávače: adresa webu, „slug“ adries, názvy stránok a štruktúrované údaje.
import type { Catalog, Listing } from "./types";
import { OPERATOR } from "./operator";

/** Verejná adresa webu. Na Verceli sa doplní sama; po kúpe domény nastaviť NEXT_PUBLIC_SITE_URL. */
export const SITE_URL = (process.env.NEXT_PUBLIC_SITE_URL
  || (process.env.VERCEL_PROJECT_PRODUCTION_URL ? "https://" + process.env.VERCEL_PROJECT_PRODUCTION_URL : "http://localhost:3000")).replace(/\/$/, "");
export const SITE_NAME = "Rozoberačka";

/** „Predné ľavé svetlo LED“ → „predne-lave-svetlo-led“. */
export function slugify(s: string): string {
  return s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 70).replace(/-+$/, "");
}

export function carName(l: Pick<Listing, "brandId" | "modelId" | "engineId">, cat: Catalog | null, withEngine = false): string {
  const b = cat?.brands.find((x) => x.id === l.brandId)?.name || "";
  const m = cat?.models.find((x) => x.id === l.modelId)?.name || "";
  const e = withEngine ? cat?.engines.find((x) => x.id === l.engineId)?.name || "" : "";
  return [b, m, e].filter(Boolean).join(" ");
}

/** Kanonická adresa detailu: /diel/12-predne-lave-svetlo-led-skoda-octavia-iii */
export function listingPath(id: number, name: string, car = ""): string {
  const s = slugify(`${name} ${car}`);
  return `/diel/${id}${s ? "-" + s : ""}`;
}

// ---------- stránky podľa auta a kategórie ----------
/** city = stránka mesta („Autodiely Žilina“), voliteľne s kategóriou. */
export type Landing = { brandId: number | null; modelId: number | null; cat: string; sub: number | null; city?: string | null };

export function landingPath(x: Landing, cat: Catalog): string {
  const b = cat.brands.find((v) => v.id === x.brandId), m = cat.models.find((v) => v.id === x.modelId);
  const c = cat.categories.find((v) => v.id === x.cat), s = cat.subcategories.find((v) => v.id === x.sub);
  if (x.city) return "/mesto/" + [slugify(x.city), c && slugify(c.name)].filter(Boolean).join("/");
  if (b) return "/diely/" + [slugify(b.name), m && slugify(m.name), c && slugify(c.name)].filter(Boolean).join("/");
  if (c) return "/kategoria/" + [slugify(c.name), s && slugify(s.name)].filter(Boolean).join("/");
  return "/";
}

/** /diely/skoda/octavia-iii/svetla → filtre. null = neexistuje. */
export function resolveDiely(parts: string[], cat: Catalog): Landing | null {
  const [bs, x, y] = parts;
  const b = cat.brands.find((v) => slugify(v.name) === bs);
  if (!b || parts.length > 3) return null;
  const out: Landing = { brandId: b.id, modelId: null, cat: "", sub: null };
  const catBy = (s?: string) => cat.categories.find((v) => slugify(v.name) === s);
  if (x) {
    const m = cat.models.find((v) => v.brandId === b.id && slugify(v.name) === x);
    if (m) out.modelId = m.id;
    else { const c = catBy(x); if (!c || y) return null; out.cat = c.id; return out; }
  }
  if (y) { const c = catBy(y); if (!c) return null; out.cat = c.id; }
  return out;
}

/** /kategoria/svetla/predne-svetla → filtre. */
export function resolveKategoria(parts: string[], cat: Catalog): Landing | null {
  const [cs, ss] = parts;
  const c = cat.categories.find((v) => slugify(v.name) === cs);
  if (!c || parts.length > 2) return null;
  const out: Landing = { brandId: null, modelId: null, cat: c.id, sub: null };
  if (ss) { const s = cat.subcategories.find((v) => v.categoryId === c.id && slugify(v.name) === ss); if (!s) return null; out.sub = s.id; }
  return out;
}

/** /mesto/zilina/svetla → filtre (mesto musí mať aktívne inzeráty). */
export function resolveMesto(parts: string[], cities: string[], cat: Catalog): Landing | null {
  const [ms, cs] = parts;
  const city = cities.find((v) => slugify(v) === ms);
  if (!city || parts.length > 2) return null;
  const out: Landing = { brandId: null, modelId: null, cat: "", sub: null, city };
  if (cs) { const c = cat.categories.find((v) => slugify(v.name) === cs); if (!c) return null; out.cat = c.id; }
  return out;
}

/** Verejná stránka predajcu: /predajci/<id>-vrakovisko-novak */
export function sellerPath(id: string, name: string): string {
  const s = slugify(name);
  return `/predajci/${id}${s ? "-" + s : ""}`;
}

/** Nadpis stránky: „Použité svetlá Škoda Octavia III“, „Použité diely BMW“, „Predné svetlá – použité diely“. */
// Názov kategórie v nadpise „Použité …“: kategórie sú v jednotnom čísle (Motor, Interiér), preto vlastné tvary.
const CAT_PHRASE: Record<string, string> = {
  motor: "motory a diely motora", pr: "prevodovky a spojky", kar: "karosárske diely", sv: "svetlá", kol: "kolesá a disky",
  el: "elektrodiely", pod: "diely podvozku a riadenia", brz: "brzdy", chl: "diely chladenia a klimatizácie",
  pal: "diely palivovej sústavy a výfuku", int: "diely interiéru",
};
const SUB_PHRASE: Record<string, string> = { "Riadenie a servo": "diely riadenia a servá", "Kúrenie": "diely kúrenia" };
/** Malé prvé písmeno, skratky (ABS, DPF) ostanú. */
const lowerFirst = (t: string) => (/^[A-ZÁČĎÉÍĽĹŇÓÔŔŠŤÚÝŽ]{2}/.test(t) ? t : t.charAt(0).toLowerCase() + t.slice(1));

export function landingTitle(x: Landing, cat: Catalog): string {
  const car = [cat.brands.find((v) => v.id === x.brandId)?.name, cat.models.find((v) => v.id === x.modelId)?.name].filter(Boolean).join(" ");
  const c = cat.categories.find((v) => v.id === x.cat)?.name, s = cat.subcategories.find((v) => v.id === x.sub)?.name;
  const what = s ? (SUB_PHRASE[s] || lowerFirst(s)) : c ? (CAT_PHRASE[x.cat] || lowerFirst(c)) : "diely";
  if (x.city) return c ? `Použité ${what} – ${x.city}` : `Použité autodiely ${x.city}`;
  return car ? `Použité ${what} ${car}` : `Použité ${what} na auto`;
}

/** Drobčeky (navigácia „Úvod › Škoda › Octavia III“) aj pre štruktúrované údaje. */
export function landingCrumbs(x: Landing, cat: Catalog): { name: string; href: string }[] {
  const out = [{ name: "Úvod", href: "/" }];
  const b = cat.brands.find((v) => v.id === x.brandId), m = cat.models.find((v) => v.id === x.modelId);
  const c = cat.categories.find((v) => v.id === x.cat), s = cat.subcategories.find((v) => v.id === x.sub);
  if (x.city) {
    out.push({ name: x.city, href: landingPath({ brandId: null, modelId: null, cat: "", sub: null, city: x.city }, cat) });
    if (c) out.push({ name: c.name, href: landingPath({ ...x, cat: c.id }, cat) });
  } else if (b) {
    out.push({ name: b.name, href: landingPath({ brandId: b.id, modelId: null, cat: "", sub: null }, cat) });
    if (m) out.push({ name: m.name, href: landingPath({ brandId: b.id, modelId: m.id, cat: "", sub: null }, cat) });
    if (c) out.push({ name: c.name, href: landingPath({ brandId: b.id, modelId: m?.id ?? null, cat: c.id, sub: null }, cat) });
  } else if (c) {
    out.push({ name: c.name, href: landingPath({ brandId: null, modelId: null, cat: c.id, sub: null }, cat) });
    if (s) out.push({ name: s.name, href: landingPath({ brandId: null, modelId: null, cat: c.id, sub: s.id }, cat) });
  }
  return out;
}

export function breadcrumbLd(items: { name: string; href: string }[]) {
  return {
    "@context": "https://schema.org", "@type": "BreadcrumbList",
    itemListElement: items.map((it, i) => ({ "@type": "ListItem", position: i + 1, name: it.name, item: SITE_URL + it.href })),
  };
}

export function productLd(l: Listing, cat: Catalog, path: string) {
  const car = carName(l, cat, true);
  return {
    "@context": "https://schema.org", "@type": "Product",
    name: l.name, sku: String(l.id), ...(l.oem ? { mpn: l.oem } : {}),
    description: [l.description, car && `Z auta: ${car}${l.year ? ", " + l.year : ""}.`, l.oem && `OEM: ${l.oem}.`].filter(Boolean).join(" "),
    ...(l.photos.length ? { image: l.photos } : {}),
    ...(l.partMaker ? { brand: { "@type": "Brand", name: l.partMaker } } : {}),
    category: cat.categories.find((c) => c.id === l.categoryId)?.name,
    offers: {
      "@type": "Offer", url: SITE_URL + path, price: l.price.toFixed(2), priceCurrency: "EUR",
      availability: "https://schema.org/InStock", itemCondition: "https://schema.org/UsedCondition",
      seller: { "@type": l.seller.type === "Firma" ? "Organization" : "Person", name: l.seller.name },
    },
  };
}

export function siteLd() {
  return [
    { "@context": "https://schema.org", "@type": "WebSite", name: SITE_NAME, url: SITE_URL + "/", inLanguage: "sk",
      potentialAction: { "@type": "SearchAction", target: SITE_URL + "/?q={search_term_string}", "query-input": "required name=search_term_string" } },
    { "@context": "https://schema.org", "@type": "Organization", name: SITE_NAME, url: SITE_URL + "/", legalName: OPERATOR.name,
      ...(OPERATOR.email ? { email: OPERATOR.email } : {}), logo: SITE_URL + "/icon.svg" },
  ];
}

export function JsonLd({ data }: { data: unknown }) {
  return <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(data).replace(/</g, "\\u003c") }} />;
}

export function cut(s: string, n = 155): string {
  const t = s.replace(/\s+/g, " ").trim();
  return t.length <= n ? t : t.slice(0, n - 1).replace(/\s+\S*$/, "") + "…";
}
