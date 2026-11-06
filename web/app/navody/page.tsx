import type { Metadata } from "next";
import Link from "next/link";
import Crumbs from "@/components/Crumbs";
import { NAVODY, navodPath } from "@/lib/navody";

export const metadata: Metadata = { title: "Návody pre kupujúcich", description: "Ako nájsť OEM číslo dielu a VIN auta a ako bezpečne kúpiť použitý autodiel.", alternates: { canonical: "/navody" } };

export default function Page() {
  return (
    <main id="main" className="main legal navod">
      <Crumbs items={[{ name: "Úvod", href: "/" }]} last="Návody" />
      <h1>Návody pre kupujúcich</h1>
      <ul className="navod-list">{NAVODY.map((n) => <li key={n.slug}><Link href={navodPath(n.slug)}><b>{n.title}</b></Link><span className="mute">{n.description}</span></li>)}</ul>
    </main>
  );
}
