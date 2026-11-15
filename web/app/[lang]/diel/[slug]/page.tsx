import type { Metadata } from "next";
import { notFound } from "next/navigation";
import ListingDetail from "@/components/ListingDetail";
import GonePage from "@/components/GonePage";
import { IS_DEMO, demoListingIds, getCatalog, getGone, getListingTr, loadDetail } from "@/lib/data";
import { langOf, lhref, tr } from "@/lib/i18n";
import { altLangs } from "@/lib/hreflang";
import { price } from "@/lib/format";
import { JsonLd, SITE_NAME, breadcrumbLd, carName, cut, landingCrumbs, listingPath, productLd } from "@/lib/seo";

// Stránka sa pripraví na serveri a 5 minút sa podáva z vyrovnávacej pamäte (rýchle a viditeľné pre Google).
export const revalidate = 300;

export async function generateStaticParams() {
  if (!IS_DEMO) return [];
  const cat = await getCatalog();
  const ids = await demoListingIds();
  const out: { slug: string }[] = [];
  for (const id of ids) { const d = await loadDetail(id); if (d) out.push({ slug: listingPath(id, d.l.name, carName(d.l, cat)).slice(6) }); }
  return out;
}

const idOf = (slug: string) => { const n = parseInt(slug, 10); return Number.isFinite(n) && n > 0 ? n : null; };

type P = { params: Promise<{ slug: string; lang: string }> };
export async function generateMetadata({ params }: P): Promise<Metadata> {
  const { slug, lang: lp } = await params;
  const lang = langOf("/" + lp);
  const id = idOf(slug);
  const d = id ? await loadDetail(id) : null;
  if (!d) {
    const g = id ? await getGone(id) : null;
    if (!g) return { title: tr(lang, "Inzerát sa nenašiel"), robots: { index: false } };
    // predaný / pozastavený diel: stránka ostáva pre ľudí s odkazom, ale Google ju z výsledkov vyradí
    return { title: `${tr(lang, g.status === "sold" ? "Predané" : "Momentálne nedostupné")}: ${g.name}`, robots: { index: false, follow: true } };
  }
  const { l, cat } = d;
  const t = lang === "pl" ? (await getListingTr([l.id], "pl")).get(l.id) : undefined;
  const name = t?.name || l.name, text = (t ? t.description : l.description) || "";
  const car = tr(lang, carName(l, cat));
  const title = `${name}${car ? " – " + car : ""}${l.year ? " " + l.year : ""}`;
  const desc = cut(`${price(l.price)} · ${tr(lang, l.condition)}${l.oem ? " · OEM " + l.oem : ""}${l.city ? " · " + l.city : ""}. ${text}`);
  const skPath = listingPath(l.id, l.name, carName(l, cat));
  const path = lhref(lang, skPath);
  return {
    title, description: desc, alternates: { canonical: path, languages: altLangs(skPath) },
    openGraph: { title: `${title} | ${price(l.price)}`, description: desc, url: path, siteName: SITE_NAME, locale: lang === "pl" ? "pl_PL" : "sk_SK", type: "website",
      ...(l.photos.length ? { images: [{ url: l.photos[0], alt: name }] } : {}) },
    twitter: { card: l.photos.length ? "summary_large_image" : "summary" },
  };
}

export default async function Page({ params }: P) {
  const { slug, lang: lp } = await params;
  const lang = langOf("/" + lp);
  const id = idOf(slug);
  if (!id) notFound();
  const d = await loadDetail(id);
  if (!d) {
    const g = await getGone(id);
    if (!g) notFound();
    return <GonePage g={g} lang={lang} />;
  }
  const t = lang === "pl" ? (await getListingTr([d.l.id], "pl")).get(d.l.id) || null : null;
  const path = lhref(lang, listingPath(d.l.id, d.l.name, carName(d.l, d.cat)));
  // Stará alebo skrátená adresa (/diel/123) sa zobrazí tiež; Google dostane hlavnú adresu cez <link rel="canonical">.
  // (Presmerovanie zo stránky s ISR posiela v Next.js 15 pri prvom zobrazení hlavičku Location dvakrát.)
  const crumbs = landingCrumbs({ brandId: d.l.brandId, modelId: d.l.modelId, cat: d.l.categoryId, sub: null }, d.cat, lang);
  return (
    <main id="main" className="dpage">
      <JsonLd data={[productLd(t ? { ...d.l, name: t.name, description: t.description } : d.l, d.cat, path), breadcrumbLd([...crumbs, { name: d.l.name, href: path }])]} />
      <ListingDetail id={id} initial={d} trInitial={t} />
    </main>
  );
}
