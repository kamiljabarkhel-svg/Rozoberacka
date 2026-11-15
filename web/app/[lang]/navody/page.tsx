import type { Metadata } from "next";
import Link from "next/link";
import Crumbs from "@/components/Crumbs";
import { navodPath, navodyFor } from "@/lib/navody";
import { langOf, lhref } from "@/lib/i18n";
import { altLangs } from "@/lib/hreflang";

type P = { params: Promise<{ lang: string }> };
export async function generateMetadata({ params }: P): Promise<Metadata> {
  const lang = langOf("/" + (await params).lang);
  return lang === "pl"
    ? { title: "Poradniki dla kupujących", description: "Jak znaleźć numer OEM części i VIN samochodu oraz jak bezpiecznie kupić używaną część samochodową.", alternates: { canonical: "/pl/navody", languages: altLangs("/navody") } }
    : { title: "Návody pre kupujúcich", description: "Ako nájsť OEM číslo dielu a VIN auta a ako bezpečne kúpiť použitý autodiel.", alternates: { canonical: "/navody", languages: altLangs("/navody") } };
}

export default async function Page({ params }: P) {
  const lang = langOf("/" + (await params).lang);
  const pl = lang === "pl";
  return (
    <main id="main" className="main legal navod">
      <Crumbs items={[{ name: pl ? "Strona główna" : "Úvod", href: lhref(lang, "/") }]} last={pl ? "Poradniki" : "Návody"} />
      <h1>{pl ? "Poradniki dla kupujących" : "Návody pre kupujúcich"}</h1>
      <ul className="navod-list">{(await navodyFor(lang)).map((n) => <li key={n.slug}><Link href={lhref(lang, navodPath(n.slug))}><b>{n.title}</b></Link><span className="mute">{n.description}</span></li>)}</ul>
    </main>
  );
}
