import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import Crumbs from "@/components/Crumbs";
import { NAVODY, navodPath, navodyFor } from "@/lib/navody";
import { JsonLd, SITE_NAME, SITE_URL, breadcrumbLd } from "@/lib/seo";
import { OPERATOR } from "@/lib/operator";
import { langOf, lhref, tr } from "@/lib/i18n";
import { altLangs } from "@/lib/hreflang";

export const dynamicParams = false;
export function generateStaticParams() { return NAVODY.map((n) => ({ slug: n.slug })); }

type P = { params: Promise<{ slug: string; lang: string }> };
async function load(params: P["params"]) {
  const { slug, lang: lp } = await params;
  const lang = langOf("/" + lp);
  return { lang, n: (await navodyFor(lang)).find((x) => x.slug === slug), all: await navodyFor(lang) };
}

export async function generateMetadata({ params }: P): Promise<Metadata> {
  const { lang, n } = await load(params);
  if (!n) return {};
  const url = lhref(lang, navodPath(n.slug));
  return { title: n.title, description: n.description, alternates: { canonical: url, languages: altLangs(navodPath(n.slug)) },
    openGraph: { title: `${n.title} | ${SITE_NAME}`, description: n.description, url, siteName: SITE_NAME, locale: lang === "pl" ? "pl_PL" : "sk_SK", type: "article" } };
}

export default async function Page({ params }: P) {
  const { lang, n, all } = await load(params);
  if (!n) notFound();
  const L = (h: string) => lhref(lang, h);
  const crumbs = [{ name: tr(lang, "Úvod"), href: L("/") }, { name: tr(lang, "Návody"), href: L("/navody") }];
  return (
    <main id="main" className="main legal navod">
      <JsonLd data={[breadcrumbLd([...crumbs, { name: n.title, href: L(navodPath(n.slug)) }]),
        { "@context": "https://schema.org", "@type": "Article", headline: n.title, description: n.description, inLanguage: lang,
          dateModified: n.updated, mainEntityOfPage: SITE_URL + L(navodPath(n.slug)), publisher: { "@type": "Organization", name: SITE_NAME, legalName: OPERATOR.name } }]} />
      <Crumbs items={crumbs} last={n.short} />
      <h1>{n.title}</h1>
      <p className="mute small">{tr(lang, "Aktualizované")} {new Date(n.updated).toLocaleDateString(lang === "pl" ? "pl-PL" : "sk-SK")}</p>
      {n.body}
      <nav className="navod-more" aria-label={tr(lang, "Ďalšie návody")}>
        <h2>{tr(lang, "Ďalšie návody")}</h2>
        <ul>{all.filter((x) => x.slug !== n.slug).map((x) => <li key={x.slug}><Link href={L(navodPath(x.slug))}>{x.title}</Link></li>)}</ul>
      </nav>
    </main>
  );
}
