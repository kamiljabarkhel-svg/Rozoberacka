import type { Metadata } from "next";
import { notFound, permanentRedirect } from "next/navigation";
import ListingDetail from "@/components/ListingDetail";
import GonePage from "@/components/GonePage";
import { IS_DEMO, demoListingIds, getCatalog, getGone, loadDetail } from "@/lib/data";
import { price } from "@/lib/format";
import { JsonLd, SITE_NAME, breadcrumbLd, carName, cut, landingCrumbs, listingPath, productLd } from "@/lib/seo";

// Stránka sa pripraví na serveri a 5 minút sa podáva z vyrovnávacej pamäte (rýchle a viditeľné pre Google).
export const revalidate = 300;

export async function generateStaticParams() {
  if (!IS_DEMO) return [];
  const cat = await getCatalog();
  const ids = demoListingIds();
  const out: { slug: string }[] = [];
  for (const id of ids) { const d = await loadDetail(id); if (d) out.push({ slug: listingPath(id, d.l.name, carName(d.l, cat)).slice(6) }); }
  return out;
}

const idOf = (slug: string) => { const n = parseInt(slug, 10); return Number.isFinite(n) && n > 0 ? n : null; };

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const id = idOf(slug);
  const d = id ? await loadDetail(id) : null;
  if (!d) {
    const g = id ? await getGone(id) : null;
    if (!g) return { title: "Inzerát sa nenašiel", robots: { index: false } };
    // predaný / pozastavený diel: stránka ostáva pre ľudí s odkazom, ale Google ju z výsledkov vyradí
    return { title: `${g.status === "sold" ? "Predané" : "Momentálne nedostupné"}: ${g.name}`, robots: { index: false, follow: true } };
  }
  const { l, cat } = d;
  const car = carName(l, cat);
  const title = `${l.name}${car ? " – " + car : ""}${l.year ? " " + l.year : ""}`;
  const desc = cut(`${price(l.price)} · ${l.condition}${l.oem ? " · OEM " + l.oem : ""}${l.city ? " · " + l.city : ""}. ${l.description || ""}`);
  const path = listingPath(l.id, l.name, car);
  return {
    title, description: desc, alternates: { canonical: path },
    openGraph: { title: `${title} | ${price(l.price)}`, description: desc, url: path, siteName: SITE_NAME, locale: "sk_SK", type: "website",
      ...(l.photos.length ? { images: [{ url: l.photos[0], alt: l.name }] } : {}) },
    twitter: { card: l.photos.length ? "summary_large_image" : "summary" },
  };
}

export default async function Page({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const id = idOf(slug);
  if (!id) notFound();
  const d = await loadDetail(id);
  if (!d) {
    const g = await getGone(id);
    if (!g) notFound();
    return <GonePage g={g} />;
  }
  const path = listingPath(d.l.id, d.l.name, carName(d.l, d.cat));
  if (!IS_DEMO && "/diel/" + slug !== path) permanentRedirect(path); // stará alebo skrátená adresa → kanonická
  const crumbs = landingCrumbs({ brandId: d.l.brandId, modelId: d.l.modelId, cat: d.l.categoryId, sub: null }, d.cat);
  return (
    <main id="main" className="dpage">
      <JsonLd data={[productLd(d.l, d.cat, path), breadcrumbLd([...crumbs, { name: d.l.name, href: path }])]} />
      <ListingDetail id={id} initial={d} />
    </main>
  );
}
