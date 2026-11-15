// Stránka čísla dielu (OEM): /cislo-dielu/03l130277q – všetky aktívne ponuky s rovnakým normalizovaným číslom dielu,
// na aké vozidlá podľa predajcov pasuje a súvisiace odkazy. Ľudia často hľadajú v Google priamo číslo zo starého dielu.
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getCatalog, searchListings } from "@/lib/data";
import { pickCatalog } from "@/lib/catalogSort";
import { emptyFilters, type Catalog, type Listing } from "@/lib/types";
import { oemKey } from "@/lib/search";
import { pieces, price, sk } from "@/lib/format";
import { JsonLd, SITE_NAME, SITE_URL, breadcrumbLd, carName, landingPath, listingPath, oemPath } from "@/lib/seo";
import Crumbs from "@/components/Crumbs";
import LandingGrid from "@/components/LandingGrid";
import Disclaimer from "@/components/Disclaimer";

export const revalidate = 600;
type P = { params: Promise<{ lang: string; oem: string }> };

async function load(raw: string) {
  const key = oemKey(decodeURIComponent(raw));
  if (key.length < 4) return null;
  const [cat, res] = await Promise.all([getCatalog(), searchListings({ ...emptyFilters, vtype: "", q: key }, [], 0, 100)]);
  const items = res.items.filter((l) => oemKey(l.oem) === key);
  return { key, cat, items };
}

/** Najčastejší názov dielu („Vstrekovač“) a vozidlá, na ktoré podľa predajcov pasuje (vlastné auto + „Pasuje aj na“). */
function summary(items: Listing[], cat: Catalog) {
  const names = new Map<string, number>();
  for (const l of items) names.set(l.name, (names.get(l.name) || 0) + 1);
  const name = [...names].sort((a, b) => b[1] - a[1])[0]?.[0] || "";
  const cars = new Map<string, { brandId: number; modelId: number | null }>();
  for (const l of items) for (const v of [{ brandId: l.brandId, modelId: l.modelId, engineId: null }, ...l.fits]) {
    if (v.brandId == null) continue;
    const n = carName(v as Listing, cat);
    if (n && !cars.has(n)) cars.set(n, { brandId: v.brandId, modelId: v.modelId });
  }
  const carList = [...cars].sort((a, b) => sk(a[0], b[0]));
  const display = items.find((l) => l.oem)?.oem?.trim() || "";
  return { name, cars: carList, display };
}

export async function generateMetadata({ params }: P): Promise<Metadata> {
  const { lang, oem } = await params;
  if (lang !== "sk") return {};
  const d = await load(oem);
  if (!d || !d.items.length) return { title: "Číslo dielu", robots: { index: false } };
  const s = summary(d.items, d.cat);
  const car = s.cars.slice(0, 2).map((c) => c[0]).join(", ");
  const minP = Math.min(...d.items.map((l) => l.price));
  const title = `${d.key} – ${s.name}${car ? " " + s.cars[0][0] : ""}`.slice(0, 60);
  const description = `Číslo dielu ${d.key}${s.name ? ` (${s.name.toLowerCase()})` : ""}: ${pieces(d.items.length, "sk")} od predajcov z celého Slovenska${minP ? `, od ${price(minP)}` : ""}.${car ? ` Pasuje napr. na ${car}.` : ""} Použité aj nové náhradné diely.`.slice(0, 160);
  const path = oemPath(d.key);
  return {
    title, description,
    alternates: { canonical: path },
    keywords: [d.key, s.display, `${d.key} ${s.name}`, `${s.name} ${d.key}`, `${d.key} použitý`, `${d.key} diel`].filter(Boolean),
    // Jedna ponuka = rovnaký obsah ako detail dielu; indexujeme až od 2 ponúk (inak by Google videl dve takmer rovnaké stránky).
    robots: d.items.length >= 2 ? undefined : { index: false, follow: true },
    openGraph: { title: `${title} | ${SITE_NAME}`, description, url: SITE_URL + path, type: "website" },
  };
}

export default async function Page({ params }: P) {
  const { lang, oem } = await params;
  if (lang !== "sk") notFound();
  const d = await load(oem);
  if (!d || !d.items.length) notFound();
  const { key, cat, items } = d;
  const s = summary(items, cat);
  const path = oemPath(key);
  const minP = Math.min(...items.map((l) => l.price)), maxP = Math.max(...items.map((l) => l.price));
  const crumbs = [{ name: "Úvod", href: "/" }, { name: "Číslo dielu " + key, href: path }];
  return (
    <main id="main" className="main landing">
      <JsonLd data={[breadcrumbLd(crumbs), { "@context": "https://schema.org", "@type": "ItemList", name: `Číslo dielu ${key}`, numberOfItems: items.length,
        itemListElement: items.map((l, i) => ({ "@type": "ListItem", position: i + 1, url: SITE_URL + listingPath(l.id, l.name, carName(l, cat), l.oem) })) }]} />
      <Crumbs items={crumbs.slice(0, -1)} last={crumbs[crumbs.length - 1].name} />
      <h1>Číslo dielu {s.display || key}{s.name ? ` – ${s.name}` : ""}</h1>
      <p className="landing-lead">
        {items.length === 1 ? "Na autosuciastky.eu je 1 ponuka" : `Na autosuciastky.eu je ${pieces(items.length, "sk")}`} s číslom dielu <b>{key}</b>
        {minP === maxP ? ` za ${price(minP)}` : `, ceny od ${price(minP)} do ${price(maxP)}`}. Porovnajte číslo so starým dielom – číslo sa porovnáva bez medzier, bodiek a pomlčiek,
        takže {key} je to isté ako {s.display && s.display !== key ? s.display : key.replace(/(.{3})(.{3})(.+)/, "$1 $2 $3")}.
      </p>
      <LandingGrid items={items} cat={pickCatalog(cat, items)} />
      {s.cars.length > 0 && (
        <section className="landing-links"><h2>Na aké vozidlá diel {key} pasuje</h2>
          <ul>{s.cars.map(([n, v]) => <li key={n}><Link href={landingPath({ brandId: v.brandId, modelId: v.modelId, cat: "", sub: null }, cat)}>{n}</Link></li>)}</ul>
          <p className="mute small">Zoznam vozidiel zostavujeme z údajov predajcov (auto, z ktorého je diel, a „Pasuje aj na“). Nie je to overený katalóg výrobcu – pred kúpou si zhodu overte u predajcu alebo v servise podľa VIN.</p>
        </section>
      )}
      <p className="seo-text mute">Hľadáte diel s číslom {key}? Na autosuciastky.eu predávajú vrakoviská, autoservisy aj súkromní predajcovia použité a nové náhradné diely s uvedeným číslom dielu (OEM). Číslo dielu nájdete na nálepke alebo vyrazené priamo na starom diele. Predajcovi zavoláte alebo napíšete bez registrácie.</p>
      <div className="rq-cta"><p><b>Potrebujete diel {key} inak (iný stav, iné mesto)?</b> Zadajte dopyt – predajcovia vám pošlú ponuku. Bez registrácie.</p>
        <Link className="btn2" href="/dopyt">Zadať dopyt na diel</Link></div>
      <Disclaimer kind="short" />
    </main>
  );
}
