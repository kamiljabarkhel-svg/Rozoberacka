import type { Metadata } from "next";
import Link from "next/link";
import HomeIntro from "@/components/HomeIntro";
import Home, { type HomeSsr } from "@/components/Home";
import { IS_DEMO, getCatalog, getCities, getSeoCounts, getStats, searchListings } from "@/lib/data";
import { OTHER_BRAND, isOtherModel, packCatalog, unpackCatalog } from "@/lib/catalogSort";
import { VEHICLE_TYPES, emptyFilters, type VehicleType } from "@/lib/types";
import { sk } from "@/lib/format";
import { JsonLd, landingPath, siteLd } from "@/lib/seo";

// Úvod sa pripraví na serveri (Google uvidí najnovšie diely) a obnovuje sa každých 5 minút.
export const revalidate = 300;

export const metadata: Metadata = {
  title: { absolute: "autosuciastky.eu – použité autodiely na vaše auto" },
  description: "Použité autodiely od predajcov z celého Slovenska. Hľadajte podľa značky, modelu, motorizácie, VIN alebo OEM čísla. Predajcovi zavoláte bez registrácie.",
  alternates: { canonical: "/" },
};

async function ssrData(): Promise<HomeSsr | null> {
  if (IS_DEMO) return null;
  try {
    const [catalog, res, stats, cities] = await Promise.all([getCatalog(), searchListings({ ...emptyFilters, vtype: "osobne" }, [], 0, 12), getStats(), getCities()]);
    return { catalog: packCatalog(catalog), res, stats, cities };
  } catch { return null; } // pri výpadku databázy sa stránka načíta v prehliadači
}

export default async function Page() {
  const [ssr, counts] = await Promise.all([ssrData(), getSeoCounts().catch(() => [])]);
  const cat = ssr ? unpackCatalog(ssr.catalog) : (IS_DEMO ? await getCatalog() : null);
  // Interné odkazy na stránky áut a kategórií (len tie, kde sú inzeráty)
  const byModel = new Map<number, number>();
  for (const c of counts) if (c.modelId != null) byModel.set(c.modelId, (byModel.get(c.modelId) || 0) + c.n);
  const bname = (id: number) => cat?.brands.find((x) => x.id === id)?.name || "";
  const models = cat ? [...byModel].map(([id, n]) => ({ m: cat.models.find((x) => x.id === id)!, n }))
    .filter((x) => x.m && !isOtherModel(x.m.name) && bname(x.m.brandId) !== OTHER_BRAND).sort((a, b) => b.n - a.n).slice(0, 24) : [];
  // Skupiny podľa druhu vozidla – diel na autobus nemá byť pod „Diely podľa auta“
  const HEAD: Record<VehicleType, string> = { osobne: "Diely na osobné autá", dodavky: "Diely na dodávky", nakladne: "Diely na nákladné autá", autobusy: "Diely na autobusy", motorky: "Diely na motorky a štvorkolky" };
  const groups = VEHICLE_TYPES.map((t) => ({ t: t.id, head: HEAD[t.id], items: models.filter((x) => (x.m.vehicleType || "osobne") === t.id)
    .sort((a, b) => sk(bname(a.m.brandId) + " " + a.m.name, bname(b.m.brandId) + " " + b.m.name)) })).filter((g) => g.items.length);
  // Kategórie s počtami zvlášť pre každý druh vozidla (+ „vsetky“ zo všetkých inzerátov)
  const vtOf = new Map((cat?.models || []).map((m) => [m.id, m.vehicleType || "osobne"]));
  const catCount = new Map<string, Map<string, number>>();
  const addCat = (k: string, c: string, n: number) => { const m = catCount.get(k) || new Map<string, number>(); m.set(c, (m.get(c) || 0) + n); catCount.set(k, m); };
  for (const c of counts) { addCat("vsetky", c.categoryId, c.n); const v = c.modelId != null ? vtOf.get(c.modelId) : undefined; if (v) addCat(v, c.categoryId, c.n); }
  const catGroups = cat ? [...catCount].map(([k, m]) => ({ k, items: cat.categories.filter((c) => m.get(c.id)).sort((a, b) => a.sort - b.sort).map((c) => ({ c, n: m.get(c.id)! })) })).filter((g) => g.items.length) : [];
  const cats = catGroups.find((g) => g.k === "vsetky")?.items || [];
  return (
    <>
      <JsonLd data={siteLd()} />
      <HomeIntro parts={ssr?.stats.parts} sellers={ssr?.stats.sellers} />
      <Home ssr={ssr} />
      {cat && (models.length > 0 || cats.length > 0) && (
        // Zobrazí sa len skupina zvoleného druhu vozidla: Home nastaví <html data-vt="…">, skrýva CSS (vrstva „Odkazy podľa druhu vozidla“)
        <nav className="wrap seo-links" aria-label="Diely podľa vozidla a kategórie">
          {groups.map((g) => <section key={g.t} data-vt={g.t}><h2>{g.head}</h2><ul>
            {g.items.map(({ m, n }) => (
              <li key={m.id}><Link href={landingPath({ brandId: m.brandId, modelId: m.id, cat: "", sub: null }, cat)}>{bname(m.brandId)} {m.name}</Link> <span className="mute">({n})</span></li>
            ))}</ul></section>)}
          {catGroups.map((g) => <section key={"c-" + g.k} data-cat={g.k}><h2>Diely podľa kategórie</h2><ul>
            {g.items.map(({ c, n }) => <li key={c.id}><Link href={landingPath({ brandId: null, modelId: null, cat: c.id, sub: null }, cat)}>{c.name}</Link> <span className="mute">({n})</span></li>)}
          </ul></section>)}
        </nav>
      )}
    </>
  );
}
