import T from "@/components/T";
// Stránka pre vyhľadávače: „Použité svetlá Škoda Octavia III“ – zoznam dielov, súvisiace odkazy, štruktúrované údaje.
import type { Metadata } from "next";
import Link from "next/link";
import { getCatalog, getCities, getSeoCounts, searchListings } from "@/lib/data";
import { pickCatalog } from "@/lib/catalogSort";
import { emptyFilters, isUniversal, type Catalog } from "@/lib/types";
import { jeSu, pieces, sk } from "@/lib/format";
import { lhref, tr, type Lang } from "@/lib/i18n";
import { altLangs } from "@/lib/hreflang";
import { JsonLd, SITE_NAME, SITE_URL, breadcrumbLd, carKeywords, carName, landingCrumbs, landingPath, landingTitle, listingPath, type Landing } from "@/lib/seo";
import Crumbs from "./Crumbs";
import LandingGrid from "./LandingGrid";

const LIMIT = 24;

async function load(x: Landing) {
  const cat = await getCatalog();
  const f = { ...emptyFilters, brand: x.brandId, model: x.modelId, cat: x.cat, sub: x.sub, city: x.city || "" };
  const [res, counts, cities] = await Promise.all([searchListings(f, [], 0, LIMIT), getSeoCounts().catch(() => []), x.city ? getCities().catch(() => []) : Promise.resolve([] as string[])]);
  return { cat, res, counts, cities };
}

export async function landingMetadata(x: Landing | null, lang: Lang = "sk"): Promise<Metadata> {
  if (!x) return { title: tr(lang, "Stránka neexistuje"), robots: { index: false } };
  const { cat, res } = await load(x);
  const title = landingTitle(x, cat, lang);
  const path = landingPath(x, cat);
  const minP = res.items.length ? Math.min(...res.items.map((l) => l.price)) : 0;
  const description = lang === "pl" ? (res.total
    ? `${title}: ${pieces(res.total, "pl")} od sprzedawców ze Słowacji${minP ? `, ceny od ${minP.toLocaleString("pl-PL")} €` : ""}. Zadzwoń do sprzedawcy bez rejestracji${x.cat && isUniversal(x.cat) ? "" : ", przed zakupem porównaj numer OEM"}.`
    : `${title}: na razie brak ofert. Zapisz wyszukiwanie i sprawdź później.`)
    : res.total && x.city
    ? `${title}: ${pieces(res.total, lang)} od predajcov z mesta ${x.city}${minP ? `, ceny od ${minP.toLocaleString("sk-SK")} €` : ""}. Osobný odber, predajcovi zavoláte bez registrácie.`
    : res.total
    ? `${title} – náhradné diely od predajcov a vrakovísk z celého Slovenska: ${pieces(res.total, lang)}${minP ? `, ceny od ${minP.toLocaleString("sk-SK")} €` : ""}. Predajcovi zavoláte bez registrácie${x.cat && isUniversal(x.cat) ? "" : ", pred kúpou porovnajte OEM číslo"}.`
    : `${title}: zatiaľ tu nie sú ponuky. Uložte si hľadanie a pozrite sa neskôr.`;
  const car = [cat.brands.find((v) => v.id === x.brandId)?.name, cat.models.find((v) => v.id === x.modelId)?.name].filter(Boolean).join(" ");
  const what = (cat.subcategories.find((v) => v.id === x.sub)?.name || cat.categories.find((v) => v.id === x.cat)?.name || "diely").toLowerCase();
  return {
    title, description, alternates: { canonical: lhref(lang, path), languages: altLangs(path) },
    ...(lang === "sk" ? { keywords: x.city ? [`použité autodiely ${x.city}`, `autodiely ${x.city}`, `náhradné diely ${x.city}`, `vrakovisko ${x.city}`, ...(x.cat ? [`${what} ${x.city}`] : [])] : carKeywords(car, what === "diely" ? "diely" : what) } : {}),
    robots: res.total ? undefined : { index: false, follow: true }, // prázdna stránka nemá byť v Google
    openGraph: { title: `${title} | ${SITE_NAME}`, description, url: lhref(lang, path), siteName: SITE_NAME, locale: lang === "pl" ? "pl_PL" : "sk_SK", type: "website" },
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
    groups.push({ title: "Podľa značky vozidla", links: [...b].map(([id, n]) => ({ name: cat.brands.find((v) => v.id === Number(id))?.name || id, href: landingPath({ brandId: Number(id), modelId: null, cat: x.cat, sub: null }, cat), n })) });
  }
  return groups.map((g) => ({ ...g, links: g.links.sort((a, b) => b.n - a.n || sk(a.name, b.name)) })).filter((g) => g.links.length);
}

export default async function LandingPage({ x, lang = "sk" }: { x: Landing; lang?: Lang }) {
  const t = (s: string, ...a: (string | number)[]) => tr(lang, s, ...a);
  const L = (h: string) => lhref(lang, h);
  const { cat, res, counts, cities } = await load(x);
  const title = landingTitle(x, cat, lang);
  const crumbs = landingCrumbs(x, cat, lang);
  const path = L(landingPath(x, cat));
  const qs = new URLSearchParams();
  if (x.brandId != null) qs.set("znacka", String(x.brandId));
  if (x.modelId != null) qs.set("model", String(x.modelId));
  if (x.cat) qs.set("kat", x.cat);
  if (x.sub != null) qs.set("pod", String(x.sub));
  if (x.city) qs.set("mesto", x.city);
  const groups = related(x, cat, counts, res, cities).map((g) => ({ title: t(g.title.replace(/ – .*$/, "")) + (g.title.includes(" – ") ? " – " + g.title.split(" – ")[1] : ""), links: g.links.map((l) => ({ ...l, name: t(l.name), href: L(l.href) })) }));
  const car = [cat.brands.find((v) => v.id === x.brandId)?.name, cat.models.find((v) => v.id === x.modelId)?.name].filter(Boolean).join(" ");
  return (
    <main id="main" className="main landing">
      <JsonLd data={[breadcrumbLd(crumbs.slice(0, -1).concat([{ name: title, href: path }])),
        { "@context": "https://schema.org", "@type": "ItemList", name: title, numberOfItems: res.total,
          itemListElement: res.items.map((l, i) => ({ "@type": "ListItem", position: i + 1, url: SITE_URL + L(listingPath(l.id, l.name, carName(l, cat), l.oem)) })) }]} />
      <Crumbs items={crumbs.slice(0, -1)} last={crumbs[crumbs.length - 1]?.name} />
      <h1>{title}</h1>
      <p className="landing-lead">
        {res.total ? <>{x.city ? <><T>{"V meste"}</T> {x.city} {jeSu(res.total, lang)} <T>{"na autosuciastky.eu"}</T> {pieces(res.total, lang)} <T>{"od miestnych predajcov – diel si môžete prevziať osobne."}</T> </>
          : <><T>{"Na autosuciastky.eu"}</T> {jeSu(res.total, lang)} {pieces(res.total, lang)}{car ? (lang === "pl" ? ` do ${car}` : ` na auto ${car}`) : ""} <T>{"od predajcov z celého Slovenska."}</T> </>}
        {t(x.cat === "kol" ? "Pred kúpou porovnajte rozmer pneumatiky alebo disku s údajmi pre vaše auto (nájdete ich v technickom preukaze alebo na starej pneumatike). Predajcovi zavoláte bez registrácie."
          : x.cat && isUniversal(x.cat) ? "Predajcovi zavoláte bez registrácie – pred kúpou si vyžiadajte ďalšie fotky."
          : "Zoznam zahŕňa aj diely, ktoré podľa predajcov pasujú cez rovnaké OEM číslo. Predajcovi zavoláte bez registrácie – pred kúpou porovnajte OEM číslo so starým dielom.")}</>
          : <><T>{"Zatiaľ tu nie sú žiadne ponuky. Nové diely pribúdajú každý deň – zadajte dopyt a predajcovia sa vám ozvú sami."}</T></>}
      </p>
      {res.total > 0 && <p><Link className="btn2" href={L(`/?${qs.toString()}#vysledky`)}><T>{"Filtrovať podľa ceny, stavu a mesta"}</T></Link></p>}
      {res.items.length ? <LandingGrid items={res.items} cat={pickCatalog(cat, res.items)} /> : <div className="empty"><T>{"Pre tento výber zatiaľ nemáme diely."}</T> <Link href={L(`/?${qs.toString()}#vysledky`)}><T>{"Uložte si hľadanie"}</T></Link> <T>{"a pri ďalšej návšteve uvidíte, či pribudol vhodný diel."}</T></div>}
      {res.total > res.items.length && <p className="landing-more"><Link className="btn2" href={L(`/?${qs.toString()}#vysledky`)}><T>{"Zobraziť všetkých"}</T> {res.total}</Link></p>}
      <div className="rq-cta"><p><b><T>{"Nenašli ste diel"}</T>{car ? (lang === "pl" ? ` do ${car}` : ` na auto ${car}`) : ""}?</b> <T>{"Zadajte dopyt – predajcovia vám pošlú ponuku. Bez registrácie."}</T></p>
        <Link className="btn2" href={L(`/dopyt?${new URLSearchParams({ ...(x.brandId != null ? { znacka: String(x.brandId) } : {}), ...(x.modelId != null ? { model: String(x.modelId) } : {}) }).toString()}`)}><T>{"Zadať dopyt na diel"}</T></Link></div>
      {lang === "sk" && <p className="seo-text mute">{x.city
        ? `Použité autodiely a náhradné diely v meste ${x.city}: diely z rozobratých áut od miestnych predajcov a vrakovísk. Diel si môžete pozrieť a prevziať osobne.`
        : car && x.modelId == null
        ? `Hľadáte použité diely na vozidlá značky ${car}? Na autosuciastky.eu nájdete náhradné diely a autosúčiastky z rozobratých vozidiel ${car} od predajcov a vrakovísk z celého Slovenska. Vyberte model a uvidíte len diely, ktoré naň pasujú – pri každom je číslo dielu (OEM), fotky a cena.`
        : car
        ? `Hľadáte použité diely na ${car}? Na autosuciastky.eu nájdete náhradné diely a autosúčiastky z rozobratých vozidiel ${car} – karosériu, svetlá, motor, prevodovku, elektroniku aj interiér. Predajcovia a vrakoviská z celého Slovenska, ktorí rozpredávajú ${car} na diely, uvádzajú číslo dielu (OEM), aby ste si overili, či diel pasuje.`
        : `${title} od predajcov a vrakovísk z celého Slovenska – použité aj nové náhradné diely s číslom dielu (OEM), fotkami a cenou. Vyberte značku a model vozidla a uvidíte len diely, ktoré naň pasujú.`}</p>}
      {groups.map((g) => (
        <section key={g.title} className="landing-links"><h2>{g.title}</h2>
          <ul>{g.links.map((l) => <li key={l.href}><Link href={l.href}>{l.name}</Link>{l.n > 0 && <> <span className="mute">({l.n})</span></>}</li>)}</ul>
        </section>
      ))}
    </main>
  );
}
