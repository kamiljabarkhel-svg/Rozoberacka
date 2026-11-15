import type { Metadata } from "next";
import Link from "next/link";
import Crumbs from "@/components/Crumbs";
import BlogCard from "@/components/BlogCard";
import { latestPosts, BLOG } from "@/lib/blog";
import { NAVODY, navodPath } from "@/lib/navody";
import { JsonLd, SITE_NAME, breadcrumbLd } from "@/lib/seo";

export const metadata: Metadata = {
  title: "Blog – rady pri kúpe auta, dielov a pneumatík",
  description: "Praktické články o kúpe ojazdeného auta, použitých autodieloch a pneumatikách. Bez reklamných rečí.",
  alternates: { canonical: "/blog" },
  openGraph: { title: `Blog | ${SITE_NAME}`, url: "/blog", siteName: SITE_NAME, locale: "sk_SK", type: "website" },
};

export default function Page() {
  const crumbs = [{ name: "Úvod", href: "/" }];
  return (
    <main id="main" className="main blog-list">
      <JsonLd data={breadcrumbLd([...crumbs, { name: "Blog", href: "/blog" }])} />
      <Crumbs items={crumbs} last="Blog" />
      <h1>Blog</h1>
      <p className="lead">Praktické rady pri kúpe auta, dielov a pneumatík.</p>
      <div className="bgrid">{latestPosts(BLOG.length).map((p, i) => <BlogCard key={p.slug} p={p} priority={i < 3} />)}</div>
      <section className="blog-navody" aria-labelledby="bn-h">
        <h2 id="bn-h">Krátke návody</h2>
        <ul>{NAVODY.map((n) => <li key={n.slug}><Link href={navodPath(n.slug)}>{n.title}</Link></li>)}</ul>
      </section>
    </main>
  );
}
