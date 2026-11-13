import type { Metadata } from "next";
import Link from "next/link";
import Crumbs from "@/components/Crumbs";
import { JsonLd, SITE_NAME, breadcrumbLd } from "@/lib/seo";
import { fmtForumDate, forumOverview, forumThreads, sectionPath, threadPath } from "@/lib/forum";
import { plural } from "@/lib/format";

export const revalidate = 60;

export const metadata: Metadata = {
  title: "Fórum – technické otázky a poruchy áut",
  description: "Poradňa pre vodičov a mechanikov: poruchy, opravy a výber dielov podľa značky – Škoda, Volkswagen, Audi, BMW, Ford a ďalšie. Čítať môže každý.",
  alternates: { canonical: "/forum" },
  openGraph: { title: `Fórum | ${SITE_NAME}`, url: "/forum", siteName: SITE_NAME, locale: "sk_SK", type: "website" },
};

export default async function Page() {
  const [sections, latest] = await Promise.all([forumOverview().catch(() => []), forumThreads(null, 0, 10).catch(() => ({ total: 0, items: [] }))]);
  const groups = sections.filter((s) => !s.parent);
  const name = (id: string) => sections.find((s) => s.id === id)?.name || "";
  const crumbs = [{ name: "Úvod", href: "/" }];
  return (
    <main id="main" className="main forum">
      <JsonLd data={breadcrumbLd([...crumbs, { name: "Fórum", href: "/forum" }])} />
      <Crumbs items={crumbs} last="Fórum" />
      <div className="fo-head">
        <div><h1>Fórum</h1><p className="lead">Pýtajte sa na poruchy, opravy a diely. Odpovedajú vodiči, mechanici aj predajcovia dielov.</p></div>
        <div className="fo-acts"><Link className="btn" href="/forum/ucet">Môj účet vo fóre</Link><Link className="lnk" href="/forum/pravidla">Pravidlá fóra</Link></div>
      </div>
      {groups.map((g) => {
        const kids = sections.filter((s) => s.parent === g.id);
        return (
          <section key={g.id} className="fo-group" aria-labelledby={"fg-" + g.id}>
            <h2 id={"fg-" + g.id}>{g.name}</h2>
            {g.description && <p className="mute">{g.description}</p>}
            <ul className="fo-sections">
              {kids.map((s) => (
                <li key={s.id}>
                  <div className="fo-s-main"><Link href={sectionPath(s.id)}><b>{s.name}</b></Link>{s.description && <span className="mute">{s.description}</span>}</div>
                  <div className="fo-s-num"><span><b>{s.threads}</b> {plural(s.threads, "téma", "témy", "tém").replace(/^\d+\s/, "")}</span><span className="mute">{plural(s.posts, "príspevok", "príspevky", "príspevkov")}</span></div>
                  <div className="fo-s-last">{s.last ? <><Link href={threadPath(s.id, s.last.id, s.last.title)}>{s.last.title}</Link><span className="mute">{fmtForumDate(s.last.at)}</span></> : <span className="mute">Zatiaľ bez tém – začnite prvú.</span>}</div>
                </li>
              ))}
            </ul>
          </section>
        );
      })}
      <section className="fo-group" aria-labelledby="fo-new">
        <h2 id="fo-new">Najnovšie témy</h2>
        {latest.items.length ? <ul className="fo-threads">{latest.items.map((t) => (
          <li key={t.id}><div className="fo-t-main"><Link href={threadPath(t.section, t.id, t.title)}><b>{t.title}</b></Link>
            <span className="mute">{name(t.section)} · {t.nick}{t.seller && <span className="fo-seller">Predajca</span>}</span></div>
            <div className="fo-t-num">{plural(t.posts, "príspevok", "príspevky", "príspevkov")}<span className="mute">{fmtForumDate(t.last_post_at)}</span></div></li>
        ))}</ul> : <p className="mute">Zatiaľ tu nie je žiadna téma. Vyberte značku vyššie a položte prvú otázku.</p>}
      </section>
      <p className="mute small fo-note">Príspevky píšu používatelia, nie prevádzkovateľ portálu. Pri opravách dôležitých pre bezpečnosť sa vždy poraďte s odborným servisom. Nevhodný príspevok nahláste tlačidlom „Nahlásiť“ pri príspevku.</p>
    </main>
  );
}
