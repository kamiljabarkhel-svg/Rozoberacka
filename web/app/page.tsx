import type { Metadata } from "next";
import Link from "next/link";
import Home, { type HomeSsr } from "@/components/Home";
import { IS_DEMO, getCatalog, getCities, getSeoCounts, getStats, searchListings } from "@/lib/data";
import { emptyFilters } from "@/lib/types";
import { sk } from "@/lib/format";
import { JsonLd, landingPath, siteLd } from "@/lib/seo";

// Úvod sa pripraví na serveri (Google uvidí najnovšie diely) a obnovuje sa každých 5 minút.
export const revalidate = 300;

export const metadata: Metadata = {
  title: { absolute: "Rozoberačka – použité autodiely z vrakovísk na vaše auto" },
  description: "Použité autodiely z vrakovísk a od predajcov z celého Slovenska. Hľadajte podľa značky, modelu, motorizácie, VIN alebo OEM čísla. Predajcovi zavoláte bez registrácie.",
  alternates: { canonical: "/" },
};

async function ssrData(): Promise<HomeSsr | null> {
  if (IS_DEMO) return null;
  try {
    const [catalog, res, stats, cities] = await Promise.all([getCatalog(), searchListings(emptyFilters, [], 0, 12), getStats(), getCities()]);
    return { catalog, res, stats, cities };
  } catch { return null; } // pri výpadku databázy sa stránka načíta v prehliadači
}

export default async function Page() {
  const [ssr, counts] = await Promise.all([ssrData(), getSeoCounts().catch(() => [])]);
  const cat = ssr?.catalog || (IS_DEMO ? await getCatalog() : null);
  // Interné odkazy na stránky áut a kategórií (len tie, kde sú inzeráty)
  const byModel = new Map<number, number>(), byCat = new Map<string, number>();
  for (const c of counts) { byModel.set(c.modelId, (byModel.get(c.modelId) || 0) + c.n); byCat.set(c.categoryId, (byCat.get(c.categoryId) || 0) + c.n); }
  const models = cat ? [...byModel].map(([id, n]) => ({ m: cat.models.find((x) => x.id === id), n })).filter((x) => x.m).sort((a, b) => b.n - a.n).slice(0, 24) : [];
  const cats = cat ? cat.categories.filter((c) => byCat.get(c.id)).sort((a, b) => a.sort - b.sort) : [];
  return (
    <>
      <JsonLd data={siteLd()} />
      <Home ssr={ssr} />
      {cat && (models.length > 0 || cats.length > 0) && (
        <nav className="wrap seo-links" aria-label="Diely podľa auta a kategórie">
          {models.length > 0 && <section><h2>Diely podľa auta</h2><ul>
            {models.sort((a, b) => sk(cat.brands.find((x) => x.id === a.m!.brandId)!.name + a.m!.name, cat.brands.find((x) => x.id === b.m!.brandId)!.name + b.m!.name)).map(({ m, n }) => (
              <li key={m!.id}><Link href={landingPath({ brandId: m!.brandId, modelId: m!.id, cat: "", sub: null }, cat)}>{cat.brands.find((x) => x.id === m!.brandId)?.name} {m!.name}</Link> <span className="mute">({n})</span></li>
            ))}</ul></section>}
          {cats.length > 0 && <section><h2>Diely podľa kategórie</h2><ul>
            {cats.map((c) => <li key={c.id}><Link href={landingPath({ brandId: null, modelId: null, cat: c.id, sub: null }, cat)}>{c.name}</Link> <span className="mute">({byCat.get(c.id)})</span></li>)}
          </ul></section>}
          <section><h2>Značky</h2><ul>
            {[...cat.brands].sort((a, b) => sk(a.name, b.name)).map((b) => <li key={b.id}><Link href={landingPath({ brandId: b.id, modelId: null, cat: "", sub: null }, cat)}>Použité diely {b.name}</Link></li>)}
          </ul></section>
        </nav>
      )}
    </>
  );
}
