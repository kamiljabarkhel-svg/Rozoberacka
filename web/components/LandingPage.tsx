// Stránka pre vyhľadávače: „Použité svetlá Škoda Octavia III“ – zoznam dielov, súvisiace odkazy, štruktúrované údaje.
import type { Metadata } from "next";
import Link from "next/link";
import { getCatalog, getCities, getSeoCounts, searchListings } from "@/lib/data";
import { pickCatalog } from "@/lib/catalogSort";
import { emptyFilters, type Catalog } from "@/lib/types";
import { jeSu, pieces, sk } from "@/lib/format";
import { JsonLd, SITE_NAME, SITE_URL, breadcrumbLd, carName, landingCrumbs, landingPath, landingTitle, listingPath, type Landing } from "@/lib/seo";
import Crumbs from "./Crumbs";
import LandingGrid from "./LandingGrid";

const LIMIT = 24;

async function load(x: Landing) {
  const cat = await getCatalog();
  const f = { ...emptyFilters, brand: x.brandId, model: x.modelId, cat: x.cat, sub: x.sub, city: x.city || "" };
  const [res, counts, cities] = await Promise.all([searchListings(f, [], 0, LIMIT), getSeoCounts().catch(() => []), x.city ? getCities().catch(() => []) : Promise.resolve([] as string[])]);
  return { cat, res, counts, cities };
}

export async function landingMetadata(x: Landing | null): Promise<Metadata> {
  if (!x) return { title: "Stránka neexistuje", robots: { index: false } };
  const { cat, res } = await load(x);
  const title = landingTitle(x, cat);
  const path = landingPath(x, cat);
  const minP = res.items.length ? Math.min(...res.items.map((l) => l.price)) : 0;
  const description = res.total && x.city
    ? `${title}: ${pieces(res.total)} od vrakovísk a predajcov z mesta ${x.city}${minP ? `, ceny od ${minP.toLocaleString("sk-SK")} €` : ""}. Osobný odber, predajcovi zavoláte bez registrácie.`
    : res.total
    ? `${title} z vrakovísk a od predajcov z celého Slovenska: ${pieces(res.total)}${minP ? `, ceny od ${minP.toLocaleString("sk-SK")} €` : ""}. Predajcovi zavoláte bez registrácie, pred kúpou porovnajte OEM číslo.`
    : `${title}: zatiaľ tu nie sú ponuky. Uložte si hľadanie a pozrite sa neskôr.`;
  return {
    title, description, alternates: { canonical: path },
    robots: res.total ? undefined : { index: false, follow: true }, // prázdna stránka nemá byť v Google
    openGraph: { title: `${title} | ${SITE_NAME}`, description, url: path, siteName: SITE_NAME, locale: "sk_SK", type: "website" },
  };
}

function related(x: Landing, cat: Catalog, counts: Awaited<ReturnType<typeof getSeoCounts>>, res: Awaited<ReturnType<typeof searchListings>>, cities: string[]) {
  if (x.city) {
    const g: { title: string; links: { name: string; href: string; n: number }[] }[] = [];
    g.push({ title: `Kategórie dielov – ${x.city}`, links: [...res.cats].filter(([id]) => id !== x.cat).map(([id, n]) => ({ name: cat.categories.find((v) => v.id === id)?.name || id, href: landingPath({ ...x, cat: id, sub: null }, cat), n })) });
    g.push({ title: "Ďalšie mestá", links: cities.filter((c) => c !== x.city).map((c) => ({ name: c, href: landingPath({ brandId: null, modelId: null, cat: "", sub: null, city: c }, cat), n: 0 })) });
    return g.map((v) => ({ ...v, links: v.links.sort((a, b) => b.n - a.n || sk(a.name, b.name)) })).filter((v) => v.links.length);
  }
  const sum = (keyOf: (c: (typeof counts)[number]) => string | null) => {
    const m = new Map<string, number>();
    for (const c of counts) { const k = keyOf(c); if (k) m.set(k, (m.get(k) || 0) + c.n); }
    return m;
  };
  const groups: { title: string; links: { name: string; href: string; n: number }[] }[] = [];
  if (x.brandId != null && x.modelId == null) {
    const m = sum((c) => (c.brandId === x.brandId && (!x.cat || c.categoryId === x.cat) ? String(c.modelId) : null));
    groups.push({ title: "Modely", links: [...m].map(([id, n]) => { const mo = cat.models.find((v) => v.id === Number(id)); return mo ? { name: `${cat.brands.find((b) => b.id === x.brandId)?.name} ${mo.name}`, href: landingPath({ brandId: x.brandId, modelId: mo.id, cat: x.cat, sub: null }, cat), n } : null; }).filter((v): v is { name: string; href: string; n: number } => !!v) });
  }
  if (x.brandId != null && !x.cat) {
    const m = sum((c) => (c.brandId === x.brandId && (x.modelId == null || c.modelId === x.modelId) ? c.categoryId : null));
    groups.push({ title: "Kategórie dielov", links: [...m].map(([id, n]) => ({ name: cat.categories.find((v) => v.id === id)?.name || id, href: landingPath({ brandId: x.brandId, modelId: x.modelId, cat: id, sub: null }, cat), n })) });
  }
  if (x.brandId == null && x.cat) {
    if (x.sub == null) {
      const s = sum((c) => (c.categoryId === x.cat && c.subcategoryId != null ? String(c.subcategoryId) : null));
      groups.push({ title: "Podkategórie", links: [...s].map(([id, n]) => ({ name: cat.subcategories.find((v) => v.id === Number(id))?.name || id, href: landingPath({ brandId: null, modelId: null, cat: x.cat, sub: Number(id) }, cat), n })) });
    }
    const b = sum((c) => (c.categoryId === x.cat && (x.sub == null || c.subcategoryId === x.sub) ? String(c.brandId) : null));
    groups.push({ title: "Podľa značky auta", links: [...b].map(([id, n]) => ({ name: cat.brands.find((v) => v.id === Number(id))?.name || id, href: landingPath({ brandId: Number(id), modelId: null, cat: x.cat, sub: null }, cat), n })) });
  }
  return groups.map((g) => ({ ...g, links: g.links.sort((a, b) => b.n - a.n || sk(a.name, b.name)) })).filter((g) => g.links.length);
}

export default async function LandingPage({ x }: { x: Landing }) {
  const { cat, res, counts, cities } = await load(x);
  const title = landingTitle(x, cat);
  const crumbs = landingCrumbs(x, cat);
  const path = landingPath(x, cat);
  const qs = new URLSearchParams();
  if (x.brandId != null) qs.set("znacka", String(x.brandId));
  if (x.modelId != null) qs.set("model", String(x.modelId));
  if (x.cat) qs.set("kat", x.cat);
  if (x.sub != null) qs.set("pod", String(x.sub));
  if (x.city) qs.set("mesto", x.city);
  const groups = related(x, cat, counts, res, cities);
  const car = [cat.brands.find((v) => v.id === x.brandId)?.name, cat.models.find((v) => v.id === x.modelId)?.name].filter(Boolean).join(" ");
  return (
    <main id="main" className="main landing">
      <JsonLd data={[breadcrumbLd(crumbs.slice(0, -1).concat([{ name: title, href: path }])),
        { "@context": "https://schema.org", "@type": "ItemList", name: title, numberOfItems: res.total,
          itemListElement: res.items.map((l, i) => ({ "@type": "ListItem", position: i + 1, url: SITE_URL + listingPath(l.id, l.name, carName(l, cat)) })) }]} />
      <Crumbs items={crumbs.slice(0, -1)} last={crumbs[crumbs.length - 1]?.name} />
      <h1>{title}</h1>
      <p className="landing-lead">
        {res.total ? <>{x.city ? <>V meste {x.city} {jeSu(res.total)} na Rozoberačke {pieces(res.total)} od miestnych vrakovísk a predajcov – diel si môžete prevziať osobne. </>
          : <>Na Rozoberačke {jeSu(res.total)} {pieces(res.total)}{car ? ` na auto ${car}` : ""} od vrakovísk a predajcov z celého Slovenska. </>}
        Zoznam zahŕňa aj diely, ktoré podľa predajcov pasujú cez rovnaké OEM číslo. Predajcovi zavoláte bez registrácie – pred kúpou porovnajte OEM číslo so starým dielom.</>
          : <>Zatiaľ tu nie sú žiadne ponuky. Nové diely pribúdajú každý deň – zadajte dopyt a predajcovia sa vám ozvú sami.</>}
      </p>
      {res.total > 0 && <p><Link className="btn2" href={`/?${qs.toString()}#vysledky`}>Filtrovať podľa ceny, stavu a mesta</Link></p>}
      {res.items.length ? <LandingGrid items={res.items} cat={pickCatalog(cat, res.items)} /> : <div className="empty">Pre tento výber zatiaľ nemáme diely. <Link href={`/?${qs.toString()}#vysledky`}>Uložte si hľadanie</Link> a pri ďalšej návšteve uvidíte, či pribudol vhodný diel.</div>}
      {res.total > res.items.length && <p className="landing-more"><Link className="btn2" href={`/?${qs.toString()}#vysledky`}>Zobraziť všetkých {res.total}</Link></p>}
      <div className="rq-cta"><p><b>Nenašli ste diel{car ? ` na auto ${car}` : ""}?</b> Zadajte dopyt – vrakoviská vám pošlú ponuku. Bez registrácie.</p>
        <Link className="btn2" href={`/dopyt?${new URLSearchParams({ ...(x.brandId != null ? { znacka: String(x.brandId) } : {}), ...(x.modelId != null ? { model: String(x.modelId) } : {}) }).toString()}`}>Zadať dopyt na diel</Link></div>
      {groups.map((g) => (
        <section key={g.title} className="landing-links"><h2>{g.title}</h2>
          <ul>{g.links.map((l) => <li key={l.href}><Link href={l.href}>{l.name}</Link>{l.n > 0 && <> <span className="mute">({l.n})</span></>}</li>)}</ul>
        </section>
      ))}
    </main>
  );
}
