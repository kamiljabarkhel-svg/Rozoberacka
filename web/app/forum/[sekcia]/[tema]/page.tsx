import type { Metadata } from "next";
import { notFound, permanentRedirect } from "next/navigation";
import Crumbs from "@/components/Crumbs";
import ForumThreadView from "@/components/forum/ForumThreadView";
import { JsonLd, SITE_NAME, SITE_URL, breadcrumbLd } from "@/lib/seo";
import { forumOverview, forumThreadPublic, sectionPath, threadIdOf, threadPath } from "@/lib/forum";

export const revalidate = 60;

type P = { params: Promise<{ sekcia: string; tema: string }> };

async function load(sekcia: string, tema: string) {
  const id = threadIdOf(tema);
  if (!id) return null;
  const [t, sections] = await Promise.all([forumThreadPublic(id).catch(() => null), forumOverview().catch(() => [])]);
  if (!t || t.status !== "visible") return null;
  return { t, section: sections.find((s) => s.id === t.section) || null, wrongPath: t.section !== sekcia };
}

export async function generateMetadata({ params }: P): Promise<Metadata> {
  const { sekcia, tema } = await params;
  const d = await load(sekcia, tema);
  if (!d) return {};
  const first = d.t.posts[0]?.body || "";
  const desc = first.replace(/\s+/g, " ").slice(0, 155);
  const url = threadPath(d.t.section, d.t.id, d.t.title);
  return { title: `${d.t.title} – fórum ${d.section?.name || ""}`.trim(), description: desc, alternates: { canonical: url },
    openGraph: { title: d.t.title, description: desc, url, siteName: SITE_NAME, locale: "sk_SK", type: "article" } };
}

export default async function Page({ params }: P) {
  const { sekcia, tema } = await params;
  const d = await load(sekcia, tema);
  if (!d) notFound();
  const url = threadPath(d.t.section, d.t.id, d.t.title);
  if (d.wrongPath) permanentRedirect(url);   // téma presunutá do inej sekcie
  const crumbs = [{ name: "Úvod", href: "/" }, { name: "Fórum", href: "/forum" }, ...(d.section ? [{ name: d.section.name, href: sectionPath(d.section.id) }] : [])];
  const [first, ...rest] = d.t.posts;
  const ld = {
    "@context": "https://schema.org", "@type": "DiscussionForumPosting", headline: d.t.title, url: SITE_URL + url,
    datePublished: d.t.created_at, dateModified: d.t.last_post_at, text: first?.body || d.t.title,
    author: { "@type": "Person", name: d.t.nick }, interactionStatistic: { "@type": "InteractionCounter", interactionType: "https://schema.org/CommentAction", userInteractionCount: rest.length },
    comment: rest.slice(0, 50).map((p) => ({ "@type": "Comment", text: p.body, datePublished: p.created_at, author: { "@type": "Person", name: p.nick } })),
  };
  return (
    <main id="main" className="main forum">
      <JsonLd data={[breadcrumbLd([...crumbs, { name: d.t.title, href: url }]), ld]} />
      <Crumbs items={crumbs} last={d.t.title.length > 50 ? d.t.title.slice(0, 48) + "…" : d.t.title} />
      <h1 className="fo-title">{d.t.title}</h1>
      <ForumThreadView initial={d.t} />
    </main>
  );
}
