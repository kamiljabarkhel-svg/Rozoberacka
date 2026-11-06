import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import Crumbs from "@/components/Crumbs";
import { NAVODY, navodPath } from "@/lib/navody";
import { JsonLd, SITE_NAME, SITE_URL, breadcrumbLd } from "@/lib/seo";
import { OPERATOR } from "@/lib/operator";

export const dynamicParams = false;
export function generateStaticParams() { return NAVODY.map((n) => ({ slug: n.slug })); }

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const n = NAVODY.find((x) => x.slug === slug);
  if (!n) return {};
  return { title: n.title, description: n.description, alternates: { canonical: navodPath(n.slug) },
    openGraph: { title: `${n.title} | ${SITE_NAME}`, description: n.description, url: navodPath(n.slug), siteName: SITE_NAME, locale: "sk_SK", type: "article" } };
}

export default async function Page({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const n = NAVODY.find((x) => x.slug === slug);
  if (!n) notFound();
  const crumbs = [{ name: "Úvod", href: "/" }, { name: "Návody", href: "/navody" }];
  return (
    <main id="main" className="main legal navod">
      <JsonLd data={[breadcrumbLd([...crumbs, { name: n.title, href: navodPath(n.slug) }]),
        { "@context": "https://schema.org", "@type": "Article", headline: n.title, description: n.description, inLanguage: "sk",
          dateModified: n.updated, mainEntityOfPage: SITE_URL + navodPath(n.slug), publisher: { "@type": "Organization", name: SITE_NAME, legalName: OPERATOR.name } }]} />
      <Crumbs items={crumbs} last={n.short} />
      <h1>{n.title}</h1>
      <p className="mute small">Aktualizované {new Date(n.updated).toLocaleDateString("sk-SK")}</p>
      {n.body}
      <nav className="navod-more" aria-label="Ďalšie návody">
        <h2>Ďalšie návody</h2>
        <ul>{NAVODY.filter((x) => x.slug !== n.slug).map((x) => <li key={x.slug}><Link href={navodPath(x.slug)}>{x.title}</Link></li>)}</ul>
      </nav>
    </main>
  );
}
