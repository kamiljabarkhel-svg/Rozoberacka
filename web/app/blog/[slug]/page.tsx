import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import Crumbs from "@/components/Crumbs";
import BlogCard from "@/components/BlogCard";
import { BLOG, blogPath, fmtDate, photoSrcSet, photoUrl } from "@/lib/blog";
import { JsonLd, SITE_NAME, SITE_URL, breadcrumbLd } from "@/lib/seo";
import { OPERATOR } from "@/lib/operator";

export const dynamicParams = false;
export function generateStaticParams() { return BLOG.map((p) => ({ slug: p.slug })); }

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const p = BLOG.find((x) => x.slug === slug);
  if (!p) return {};
  return { title: p.title, description: p.description, alternates: { canonical: blogPath(p.slug) },
    openGraph: { title: p.title, description: p.description, url: blogPath(p.slug), siteName: SITE_NAME, locale: "sk_SK", type: "article", publishedTime: p.date, images: [{ url: photoUrl(p.photo, 1200), width: 1200, alt: p.photo.alt }] } };
}

export default async function Page({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const p = BLOG.find((x) => x.slug === slug);
  if (!p) notFound();
  const crumbs = [{ name: "Úvod", href: "/" }, { name: "Blog", href: "/blog" }];
  const more = BLOG.filter((x) => x.slug !== p.slug).slice(0, 3);
  return (
    <main id="main" className="main blog-post">
      <JsonLd data={[breadcrumbLd([...crumbs, { name: p.title, href: blogPath(p.slug) }]),
        { "@context": "https://schema.org", "@type": "BlogPosting", headline: p.title, description: p.description, inLanguage: "sk", datePublished: p.date, image: photoUrl(p.photo, 1200),
          mainEntityOfPage: SITE_URL + blogPath(p.slug), author: { "@type": "Organization", name: SITE_NAME }, publisher: { "@type": "Organization", name: SITE_NAME, legalName: OPERATOR.name } }]} />
      <Crumbs items={crumbs} last={p.short} />
      <article>
        <p className="bpost-tag">{p.tag}</p>
        <h1>{p.title}</h1>
        <p className="mute small">{fmtDate(p.date)} · {p.readMin} min čítania</p>
        <figure className="bpost-fig">
          <img src={photoUrl(p.photo, 1200)} srcSet={photoSrcSet(p.photo, [640, 960, 1200, 1600])} sizes="(max-width:820px) 100vw, 780px" alt={p.photo.alt} width={1200} height={675} decoding="async" fetchPriority="high" />
          <figcaption>Foto: <a href={p.photo.pageUrl} rel="noopener" target="_blank">{p.photo.author}</a> / Unsplash</figcaption>
        </figure>
        <div className="bpost-body">{p.body}</div>
      </article>
      {more.length > 0 && <section className="bpost-more" aria-labelledby="bm-h"><h2 id="bm-h">Ďalšie články</h2><div className="bgrid">{more.map((x) => <BlogCard key={x.slug} p={x} />)}</div><p><Link href="/blog">Všetky články</Link></p></section>}
    </main>
  );
}
