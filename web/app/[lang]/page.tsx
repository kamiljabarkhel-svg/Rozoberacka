import type { Metadata } from "next";
import Link from "next/link";
import HomeIntro from "@/components/HomeIntro";
import Home, { type HomeSsr } from "@/components/Home";
import { IS_DEMO, getCatalog, getCities, getSeoCounts, getStats, searchListings } from "@/lib/data";
import { OTHER_BRAND, isOtherModel, packCatalog, unpackCatalog } from "@/lib/catalogSort";
import { VEHICLE_TYPES, emptyFilters, type VehicleType } from "@/lib/types";
import { sk } from "@/lib/format";
import { JsonLd, SEO_KEYWORDS, landingPath, siteLd } from "@/lib/seo";
import { langOf, lhref, tr, type Lang } from "@/lib/i18n";
import { altLangs } from "@/lib/hreflang";

// Úvod sa pripraví na serveri (Google uvidí najnovšie diely) a obnovuje sa každých 5 minút.
export const revalidate = 300;

type P = { params: Promise<{ lang: string }> };
export async function generateMetadata({ params }: P): Promise<Metadata> {
  const lang = langOf("/" + (await params).lang);
  if (lang === "pl") return {
    title: { absolute: "autosuciastky.eu – używane części samochodowe ze Słowacji" },
    description: "Używane części samochodowe od sprzedawców ze Słowacji. Szukaj według marki, modelu, silnika, VIN lub numeru OEM. Zadzwoń do sprzedawcy bez rejestracji. Ceny w € i orientacyjnie w zł.",
    alternates: { canonical: "/pl", languages: altLangs("/") },
  };
  return {
    title: { absolute: "Použité autodiely a náhradné diely na auto | autosuciastky.eu" },
    description: "Použité autodiely a náhradné diely od predajcov a vrakovísk z celého Slovenska. Hľadajte podľa auta, VIN alebo čísla dielu (OEM), volajte bez registrácie.",
    keywords: SEO_KEYWORDS,
    alternates: { canonical: "/", languages: altLangs("/") },
  };
}

async function ssrData(): Promise<HomeSsr | null> {
  if (IS_DEMO) return null;
  try {
    const [catalog, res, stats, cities] = await Promise.all([getCatalog(), searchListings({ ...emptyFilters, vtype: "osobne" }, [], 0, 12), getStats(), getCities()]);
    return { catalog: packCatalog(catalog), res, stats, cities };
  } catch { return null; } // pri výpadku databázy sa stránka načíta v prehliadači
}

export default async function Page({ params }: P) {
  const lang: Lang = langOf("/" + (await params).lang);
  const t = (x: string) => tr(lang, x);
  const L = (h: string) => lhref(lang, h);
  const [ssr, counts] = await Promise.all([ssrData(), getSeoCounts().catch(() => [])]);
  const cat = ssr ? unpackCatalog(ssr.catalog) : (IS_DEMO ? await getCatalog() : null);
  // Interné odkazy na stránky áut a kategórií (len tie, kde sú inzeráty)
  const byModel = new Map<number, number>();
  for (const c of counts) if (c.modelId != null) byModel.set(c.modelId, (byModel.get(c.modelId) || 0) + c.n);
  const bname = (id: number) => cat?.brands.find((x) => x.id === id)?.name || "";
  const models = cat ? [...byModel].map(([id, n]) => ({ m: cat.models.find((x) => x.id === id)!, n }))
    .filter((x) => x.m && !isOtherModel(x.m.name) && bname(x.m.brandId) !== OTHER_BRAND).sort((a, b) => b.n - a.n).slice(0, 24) : [];
  // Skupiny podľa druhu vozidla – diel na autobus nemá byť pod „Diely podľa auta“
  const HEAD: Record<VehicleType, string> = { osobne: "Diely na osobné autá", veterany: "Diely na veterány", dodavky: "Diely na dodávky", nakladne: "Diely na nákladné autá", autobusy: "Diely na autobusy", motorky: "Diely na motorky a štvorkolky" };
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
      <JsonLd data={siteLd(lang)} />
      <HomeIntro parts={ssr?.stats.parts} sellers={ssr?.stats.sellers} lang={lang} />
      <Home ssr={ssr} />
      {cat && (models.length > 0 || cats.length > 0) && (
        // Zobrazí sa len skupina zvoleného druhu vozidla: Home nastaví <html data-vt="…">, skrýva CSS (vrstva „Odkazy podľa druhu vozidla“)
        <nav className="wrap seo-links" aria-label={t("Diely podľa vozidla a kategórie")}>
          {groups.map((g) => <section key={g.t} data-vt={g.t}><h2>{t(g.head)}</h2><ul>
            {g.items.map(({ m, n }) => (
              <li key={m.id}><Link href={L(landingPath({ brandId: m.brandId, modelId: m.id, cat: "", sub: null }, cat))}>{bname(m.brandId)} {m.name}</Link> <span className="mute">({n})</span></li>
            ))}</ul></section>)}
          {catGroups.map((g) => <section key={"c-" + g.k} data-cat={g.k}><h2>{t("Diely podľa kategórie")}</h2><ul>
            {g.items.map(({ c, n }) => <li key={c.id}><Link href={L(landingPath({ brandId: null, modelId: null, cat: c.id, sub: null }, cat))}>{t(c.name)}</Link> <span className="mute">({n})</span></li>)}
          </ul></section>)}
        </nav>
      )}
      {lang === "sk" && (
        // Krátky text pre vyhľadávače aj ľudí – slová, ktorými ľudia diely hľadajú
        <section className="wrap seo-about">
          <h2>Použité autodiely a náhradné diely na jednom mieste</h2>
          <p>Na autosuciastky.eu nájdete <b>použité autodiely</b>, <b>náhradné diely</b> a autosúčiastky na osobné autá, dodávky, nákladné autá, autobusy, motorky aj veterány. Ponúkajú ich vrakoviská, autoservisy, predajcovia dielov aj ľudia, ktorí rozpredávajú auto na diely. Pri dieloch je číslo dielu (OEM), fotky, stav, cena a mesto.</p>
          <p>Hľadajte podľa značky a modelu, podľa VIN alebo priamo podľa čísla dielu – uvidíte len <b>použité diely</b>, ktoré pasujú na vaše vozidlo. Predajcovi zavoláte alebo napíšete bez registrácie. Nenašli ste diel? <Link href="/dopyt">Zadajte dopyt</Link> a predajcovia sa vám ozvú. Predávate diely? <Link href="/pre-predajcov">Inzerát je zadarmo</Link>, aj hromadne cez CSV alebo XML.</p>
        </section>
      )}
    </>
  );
}
