// Detail havarovaného / nepojazdného vozidla. Predané (do 180 dní) alebo pozastavené: stránka ostane s nápisom, bez telefónu, noindex.
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { emptyFilters } from "@/lib/types";
import { getCar, getCatalog, searchListings } from "@/lib/data";
import { pickCatalog } from "@/lib/catalogSort";
import { price } from "@/lib/format";
import { JsonLd, SITE_NAME, breadcrumbLd, cut, sellerPath, vehicleLd, vehiclePath, vehicleTitle } from "@/lib/seo";
import Crumbs from "@/components/Crumbs";
import CarDetail from "@/components/CarDetail";
import LandingGrid from "@/components/LandingGrid";
import Disclaimer from "@/components/Disclaimer";

export const revalidate = 300;
// Prázdny zoznam = stránky sa pripravia pri prvej návšteve a potom sa podávajú z vyrovnávacej pamäte (ISR).
export async function generateStaticParams() { return []; }
const idOf = (slug: string) => { const n = parseInt(slug, 10); return Number.isFinite(n) && n > 0 ? n : null; };

async function load(slug: string) {
  const id = idOf(slug); if (!id) return null;
  const [cat, c] = await Promise.all([getCatalog(), getCar(id).catch(() => null)]);
  return c ? { cat, c } : null;
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const d = await load((await params).slug);
  if (!d) return { title: "Inzerát sa nenašiel", robots: { index: false } };
  const title = vehicleTitle(d.c, d.cat);
  if ("gone" in d.c) return { title: `${d.c.status === "sold" ? "Predané" : "Momentálne nedostupné"}: ${title}`, robots: { index: false, follow: true } };
  const c = d.c, path = vehiclePath(c.id, title, c.condition);
  const desc = cut(`${price(c.price)} · ${c.condition}${c.km != null ? ` · ${c.km.toLocaleString("sk-SK")} km` : ""} · ${c.city}. ${c.description}`);
  return {
    title: `${title} – ${c.condition}`, description: desc, alternates: { canonical: path },
    openGraph: { title: `${title} – ${c.condition} | ${price(c.price)}`, description: desc, url: path, siteName: SITE_NAME, locale: "sk_SK", type: "website",
      ...(c.photos.length ? { images: [{ url: c.photos[0], alt: title }] } : {}) },
    twitter: { card: c.photos.length ? "summary_large_image" : "summary" },
  };
}

export default async function Page({ params }: { params: Promise<{ slug: string }> }) {
  const d = await load((await params).slug);
  if (!d) notFound();
  const { cat, c } = d;
  const title = vehicleTitle(c, cat);
  const crumbs = [{ name: "Úvod", href: "/" }, { name: "Havarované vozidlá", href: "/havarovane-vozidla" }];
  if ("gone" in c) return (
    <main id="main" className="main landing gone">
      <Crumbs items={crumbs} last={title} />
      <div className="gone-head"><div>
        <span className={"gone-badge" + (c.status === "sold" ? " sold" : "")}>{c.status === "sold" ? "Predané" : "Momentálne nedostupné"}</span>
        <h1>{title}</h1>
        <p>{c.status === "sold" ? "Toto vozidlo už predajca predal." : "Predajca inzerát dočasne pozastavil."} Pozrite si ďalšie vozidlá alebo diely naň.</p>
      </div></div>
      <p className="landing-more"><Link className="btn2" href="/havarovane-vozidla">Všetky havarované vozidlá</Link> <Link className="btn2" href={`/?znacka=${c.brandId}${c.modelId ? "&model=" + c.modelId : ""}#vysledky`}>Diely na toto vozidlo</Link></p>
    </main>
  );
  const path = vehiclePath(c.id, title, c.condition);
  const engine = c.engineId ? cat.engines.find((e) => e.id === c.engineId)?.name || "" : "";
  const parts = c.donorId ? (await searchListings({ ...emptyFilters }, [], 0, 12, { donor: c.donorId }).catch(() => null))?.items || [] : [];
  return (
    <main id="main" className="main dpage">
      <JsonLd data={[vehicleLd(c, title, path), breadcrumbLd([...crumbs, { name: title, href: path }])]} />
      <Crumbs items={crumbs} last={title} />
      <h1>{title}{engine ? ` ${engine}` : ""} <span className="mute">– {c.condition}</span></h1>
      <CarDetail c={c} title={title} engine={engine} path={path} sellerHref={sellerPath(c.sellerId, c.seller.name)} />
      {parts.length > 0 && <section><h2 className="sh">Diely z tohto vozidla ({c.parts})</h2><LandingGrid items={parts} cat={pickCatalog(cat, parts)} /></section>}
      <p className="landing-more"><Link className="btn2" href={`/?znacka=${c.brandId}${c.modelId ? "&model=" + c.modelId : ""}#vysledky`}>Diely na {title.split(",")[0]} od všetkých predajcov</Link></p>
      <Disclaimer kind="car" />
    </main>
  );
}
