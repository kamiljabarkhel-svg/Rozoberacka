import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import Crumbs from "@/components/Crumbs";
import ForumNewThread from "@/components/forum/ForumNewThread";
import { JsonLd, SITE_NAME, breadcrumbLd } from "@/lib/seo";
import { fmtForumDate, forumOverview, forumThreads, sectionPath, threadPath } from "@/lib/forum";
import { plural } from "@/lib/format";

export const revalidate = 60;
const PER = 30;

type P = { params: Promise<{ sekcia: string }>; searchParams: Promise<{ strana?: string }> };

async function load(id: string) {
  const all = await forumOverview().catch(() => []);
  return { all, s: all.find((x) => x.id === id) || null };
}

export async function generateMetadata({ params, searchParams }: P): Promise<Metadata> {
  const { sekcia } = await params; const { strana } = await searchParams;
  const { s } = await load(sekcia);
  if (!s || !s.parent) return {};
  const page = Math.max(1, parseInt(strana || "1", 10) || 1);
  const title = `${s.name} – fórum, poruchy a opravy${page > 1 ? ` (strana ${page})` : ""}`;
  return { title, description: `Otázky a odpovede k vozidlám ${s.name}: poruchy, opravy, výber a výmena dielov. ${s.description || ""}`.slice(0, 158),
    alternates: { canonical: sectionPath(s.id) + (page > 1 ? `?strana=${page}` : "") },
    openGraph: { title: `${title} | ${SITE_NAME}`, url: sectionPath(s.id), siteName: SITE_NAME, locale: "sk_SK", type: "website" } };
}

export default async function Page({ params, searchParams }: P) {
  const { sekcia } = await params; const { strana } = await searchParams;
  const { all, s } = await load(sekcia);
  if (s && !s.parent) redirect("/forum");
  if (!s) notFound();
  const page = Math.max(1, parseInt(strana || "1", 10) || 1);
  const { total, items } = await forumThreads(s.id, (page - 1) * PER, PER).catch(() => ({ total: 0, items: [] }));
  const pages = Math.max(1, Math.ceil(total / PER));
  const group = all.find((x) => x.id === s.parent);
  const crumbs = [{ name: "Úvod", href: "/" }, { name: "Fórum", href: "/forum" }];
  return (
    <main id="main" className="main forum">
      <JsonLd data={breadcrumbLd([...crumbs, { name: s.name, href: sectionPath(s.id) }])} />
      <Crumbs items={crumbs} last={s.name} />
      <div className="fo-head">
        <div><h1>{s.name}</h1><p className="lead">{group?.name}{s.description ? ` – ${s.description}` : ""}</p></div>
      </div>
      <ForumNewThread section={s.id} sectionName={s.name} />
      {items.length ? <ul className="fo-threads">{items.map((t) => (
        <li key={t.id} className={t.pinned ? "is-pinned" : ""}>
          <div className="fo-t-main"><Link href={threadPath(t.section, t.id, t.title)}><b>{t.pinned && <span className="fo-pin">Dôležité</span>}{t.title}</b></Link>
            <span className="mute">{t.nick}{t.seller && <span className="fo-seller">Predajca</span>} · {fmtForumDate(t.created_at)}{t.locked && " · uzamknutá"}</span></div>
          <div className="fo-t-num">{plural(t.posts, "príspevok", "príspevky", "príspevkov")}<span className="mute">posledný {fmtForumDate(t.last_post_at)}</span></div>
        </li>))}</ul>
        : <div className="empty">V sekcii {s.name} zatiaľ nie je žiadna téma. Položte prvú otázku – tlačidlo „Nová téma“ vyššie.</div>}
      {pages > 1 && <nav className="fo-pages" aria-label="Strany">{Array.from({ length: pages }, (_, i) => i + 1).map((n) =>
        n === page ? <b key={n} aria-current="page">{n}</b> : <Link key={n} href={sectionPath(s.id) + (n > 1 ? `?strana=${n}` : "")}>{n}</Link>)}</nav>}
      <p className="mute small fo-note"><Link href="/forum/pravidla">Pravidlá fóra</Link> · Príspevky píšu používatelia, nie prevádzkovateľ portálu.</p>
    </main>
  );
}
