// Pás medzi hlavičkou a hľadaním na úvode: logo, čo portál ponúka a rady pre kupujúcich (návody).
import Link from "next/link";
import { NAVODY, navodPath } from "@/lib/navody";
import { LogoMark } from "./Logo";

const LEAD: Record<string, string> = {
  "oem-cislo": "Číslo zo štítku starého dielu je najistejší spôsob, ako kúpiť diel, ktorý sedí.",
  vin: "17 znakov z technického preukazu prezradí výrobcu a často aj modelový rok.",
  "bezpecny-nakup": "Na čo sa opýtať predajcu, ako platiť a aké máte práva pri kúpe.",
};

export default function HomeIntro({ parts, sellers }: { parts?: number; sellers?: number }) {
  return (
    <section className="intro" aria-label="O portáli a rady pre kupujúcich">
      <div className="intro-in">
        <div className="intro-brand">
          <LogoMark size={64} className="intro-mark" />
          <div>
            <p className="intro-t">Použité autodiely z vrakovísk a od predajcov na Slovensku</p>
            <ul className="intro-pts">
              <li>Hľadajte podľa auta, čísla dielu alebo VIN</li>
              <li>Predajcovi zavoláte priamo, bez registrácie</li>
              {parts ? <li><b>{parts.toLocaleString("sk-SK")}</b> {parts === 1 ? "diel" : parts <= 4 ? "diely" : "dielov"} od <b>{sellers}</b> {sellers === 1 ? "predajcu" : "predajcov"}</li> : <li>Inzerovanie pre predajcov zadarmo</li>}
            </ul>
          </div>
        </div>
        <div className="intro-blog">
          <div className="intro-bh"><h2>Rady a návody</h2><Link href="/navody">Všetky návody</Link></div>
          <ul>
            {NAVODY.map((n) => (
              <li key={n.slug}><Link href={navodPath(n.slug)}><b>{n.title}</b><span>{LEAD[n.slug] || n.description}</span></Link></li>
            ))}
          </ul>
        </div>
      </div>
    </section>
  );
}
