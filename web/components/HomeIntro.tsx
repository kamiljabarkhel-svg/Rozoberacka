// Pás medzi hlavičkou a hľadaním na úvode: čo portál ponúka (vľavo) a tri najnovšie články z blogu s fotkami (vpravo).
import Link from "next/link";
import { latestPosts } from "@/lib/blog";
import BlogCard from "./BlogCard";
import { LogoMark } from "./Logo";

export default function HomeIntro({ parts, sellers }: { parts?: number; sellers?: number }) {
  return (
    <section className="intro" aria-label="O portáli a blog">
      <div className="intro-in">
        <div className="intro-brand">
          <LogoMark size={52} className="intro-mark" />
          <p className="intro-t">Použité autodiely z celého Slovenska</p>
          <ul className="intro-pts">
            <li><b>Podľa auta, čísla dielu alebo VIN</b><span>nájdete diel, ktorý naozaj pasuje</span></li>
            <li><b>Priamo s predajcom</b><span>zavoláte alebo napíšete, bez registrácie</span></li>
            <li>{parts ? <><b>{parts.toLocaleString("sk-SK")} {parts === 1 ? "diel" : parts <= 4 ? "diely" : "dielov"}</b><span>od {sellers} {sellers === 1 ? "predajcu" : "predajcov"}</span></> : <><b>Pre predajcov zadarmo</b><span>inzerujte diely bez poplatkov</span></>}</li>
          </ul>
          <div className="intro-cta"><a href="#hladanie" className="btn">Hľadať diel</a><Link href="/pre-predajcov" className="ubtn">Predávam diely</Link></div>
        </div>
        <div className="intro-blog">
          <div className="intro-bh"><h2>Z blogu</h2><Link href="/blog">Všetky články</Link></div>
          <div className="intro-cards">{latestPosts(3).map((p, i) => <BlogCard key={p.slug} p={p} priority={i === 0} />)}</div>
        </div>
      </div>
    </section>
  );
}
