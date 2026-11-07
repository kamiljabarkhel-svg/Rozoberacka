import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import Crumbs from "@/components/Crumbs";
import SellerStock from "@/components/SellerStock";
import Stars from "@/components/Stars";
import SellerNotice from "@/components/SellerNotice";
import { sellerKind } from "@/lib/legal";
import { getCatalog, getSellerPublic, getSellerReviews, searchListings } from "@/lib/data";
import { emptyFilters } from "@/lib/types";
import { pieces } from "@/lib/format";
import { JsonLd, SITE_NAME, SITE_URL, breadcrumbLd, sellerPath } from "@/lib/seo";

export const revalidate = 600;

// Verejná stránka predajcu: celá jeho ponuka (hľadanie, kategórie, načítať ďalšie) a hodnotenia od kupujúcich (overené cez dopyt).
const idOf = (slug: string) => (/^[0-9a-f-]{36}/i.exec(slug)?.[0] || "").toLowerCase();

async function load(slug: string) {
  const s = await getSellerPublic(idOf(slug));
  if (!s) return null;
  const [cat, res, reviews] = await Promise.all([getCatalog(), searchListings({ ...emptyFilters }, [], 0, 24, { seller: s.id }), getSellerReviews(s.id)]);
  return { s, cat, res, reviews };
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const d = await load((await params).slug);
  if (!d) return { title: "Predajca sa nenašiel", robots: { index: false } };
  const { s, res } = d;
  const title = `${s.name} – použité autodiely${s.city ? ", " + s.city : ""}`;
  const description = `${s.name}${s.city ? " (" + s.city + ")" : ""}: ${pieces(res.total)} na Rozoberačke${s.ratingCount ? `, hodnotenie ${s.ratingAvg?.toLocaleString("sk-SK")} z 5 (${s.ratingCount})` : ""}. Predajcovi zavoláte bez registrácie.`;
  const path = sellerPath(s.id, s.name);
  return { title, description, alternates: { canonical: path }, robots: res.total ? undefined : { index: false, follow: true },
    openGraph: { title: `${title} | ${SITE_NAME}`, description, url: path, siteName: SITE_NAME, locale: "sk_SK", type: "website" } };
}

export default async function Page({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const d = await load(slug);
  if (!d) notFound();
  const { s, cat, res, reviews } = d;
  const path = sellerPath(s.id, s.name);
  const since = new Date(s.since).toLocaleDateString("sk-SK", { month: "long", year: "numeric" });
  const crumbs = [{ name: "Úvod", href: "/" }];
  return (
    <main id="main" className="main landing seller-page">
      <JsonLd data={[breadcrumbLd([...crumbs, { name: s.name, href: path }]),
        { "@context": "https://schema.org", "@type": s.type === "Firma" ? "AutoPartsStore" : "Person", name: s.name, url: SITE_URL + path,
          ...(s.address ? { address: { "@type": "PostalAddress", streetAddress: s.address, addressCountry: "SK" }, ...(s.ico ? { taxID: s.ico } : {}) }
            : s.city ? { address: { "@type": "PostalAddress", addressLocality: s.city, addressCountry: "SK" } } : {}) }]} />
      <Crumbs items={crumbs} last={s.name} />
      <div className="seller-head">
        <h1>{s.name}</h1>
        <p className="seller-meta">
          <span>{sellerKind(s.type)}</span>{s.city && <span>{s.city}</span>}{s.verified && <span className="ok">✓ Overený predajca</span>}<span>Na Rozoberačke od {since}</span>
        </p>
        {s.ratingCount > 0 ? <p><Stars value={s.ratingAvg} count={s.ratingCount} /> <a href="#hodnotenia" className="lnk">Hodnotenia kupujúcich</a></p>
          : <p className="mute">Zatiaľ bez hodnotení.</p>}
        <SellerNotice type={s.type} name={s.name} ico={s.ico} address={s.address} />
      </div>
      <SellerStock seller={s.id} cat={cat} initial={{ items: res.items, total: res.total, cats: [...res.cats] }} />
      <section id="hodnotenia" className="reviews">
        <h2>Hodnotenia kupujúcich</h2>
        <p className="mute small">Hodnotiť môže len kupujúci, ktorému predajca poslal ponuku na jeho dopyt. Hodnotenia nekontrolujeme vopred; nevhodné môžete nahlásiť na <Link href="/ochrana-osobnych-udajov#kontakt">kontakte prevádzkovateľa</Link>.</p>
        {reviews.length ? <ul>{reviews.map((r) => (
          <li key={r.id}><Stars value={r.stars} small /> <b>{r.author}</b> <span className="mute">{new Date(r.createdAt).toLocaleDateString("sk-SK")}</span>{r.body && <p>{r.body}</p>}</li>
        ))}</ul> : <p>Zatiaľ žiadne hodnotenia.</p>}
      </section>
    </main>
  );
}
