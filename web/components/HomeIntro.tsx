import T from "@/components/T";
// Pás medzi hlavičkou a hľadaním na úvode: čo portál ponúka (vľavo) a tri najnovšie články z blogu s fotkami (vpravo).
import Link from "next/link";
import { pieces } from "@/lib/format";
import { latestPosts } from "@/lib/blog";
import BlogCard from "./BlogCard";
import { LogoMark } from "./Logo";
import { NAVODY_PL } from "@/lib/navody.pl";
import { navodPath } from "@/lib/navody";
import type { Lang } from "@/lib/i18n";
import { VIN_ENABLED } from "@/lib/features";

export default function HomeIntro({ parts, sellers, lang = "sk" }: { parts?: number; sellers?: number; lang?: Lang }) {
  const pl = lang === "pl";
  return (
    <section className="intro" aria-label={pl ? "O portalu" : "O portáli a blog"}>
      <div className="intro-in">
        <div className="intro-brand">
          <LogoMark size={52} className="intro-mark" />
          <p className="intro-t"><T>{"Použité autodiely z celého Slovenska"}</T></p>
          <ul className="intro-pts">
            <li><b>{VIN_ENABLED ? <T>{"Podľa auta, čísla dielu alebo VIN"}</T> : <T>{"Podľa auta alebo čísla dielu"}</T>}</b><span><T>{"nájdete diel, ktorý naozaj pasuje"}</T></span></li>
            <li><b><T>{"Priamo s predajcom"}</T></b><span><T>{"zavoláte alebo napíšete, bez registrácie"}</T></span></li>
            <li>{parts ? <><b>{pl ? pieces(parts, "pl") : <>{parts.toLocaleString("sk-SK")} {parts === 1 ? "diel" : parts <= 4 ? "diely" : "dielov"}</>}</b><span>{pl ? <>od {sellers} {sellers === 1 ? "sprzedawcy" : "sprzedawców"} ze Słowacji</> : <><T>{"od"}</T> {sellers} {sellers === 1 ? "predajcu" : "predajcov"}</>}</span></> : <><b><T>{"Pre predajcov zadarmo"}</T></b><span><T>{"inzerujte diely bez poplatkov"}</T></span></>}</li>
          </ul>
          <div className="intro-cta"><a href="#hladanie" className="btn"><T>{"Hľadať diel"}</T></a><Link href="/pre-predajcov" hrefLang="sk" className="ubtn"><T>{"Predávam diely"}</T></Link></div>
        </div>
        {pl ? <div className="intro-blog intro-nav">
          <div className="intro-bh"><h2>Poradniki</h2><Link href="/pl/navody">Wszystkie poradniki</Link></div>
          <ul className="navod-list">{NAVODY_PL.map((n) => <li key={n.slug}><Link href={"/pl" + navodPath(n.slug)}><b>{n.title}</b></Link><span className="mute">{n.description}</span></li>)}</ul>
        </div> : <div className="intro-blog">
          <div className="intro-bh"><h2><T>{"Z blogu"}</T></h2><Link href="/blog"><T>{"Všetky články"}</T></Link></div>
          <div className="intro-cards">{latestPosts(3).map((p, i) => <BlogCard key={p.slug} p={p} priority={i === 0} />)}</div>
        </div>}
      </div>
    </section>
  );
}
