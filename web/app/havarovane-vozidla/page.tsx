// Havarované, nepojazdné a na diely určené vozidlá na predaj (osobné, dodávky, nákladné, autobusy, motorky).
import type { Metadata } from "next";
import Link from "next/link";
import { getCatalog, searchCars } from "@/lib/data";
import { packCatalog } from "@/lib/catalogSort";
import { emptyCarFilters } from "@/lib/types";
import { JsonLd, SITE_NAME, SITE_URL, breadcrumbLd, vehiclePath, vehicleTitle } from "@/lib/seo";
import CarsBrowse from "@/components/CarsBrowse";
import Disclaimer from "@/components/Disclaimer";
import { CARS_ENABLED } from "@/lib/features";
import { notFound } from "next/navigation";

export const revalidate = 300;
const TITLE = "Havarované a nepojazdné vozidlá na predaj";
const DESC = "Havarované, nepojazdné a na diely určené autá, dodávky, nákladné autá, autobusy a motorky od vrakovísk a predajcov zo Slovenska. Predajcovi zavoláte bez registrácie.";

export const metadata: Metadata = {
  title: TITLE, description: DESC, alternates: { canonical: "/havarovane-vozidla" },
  openGraph: { title: `${TITLE} | ${SITE_NAME}`, description: DESC, url: "/havarovane-vozidla", siteName: SITE_NAME, locale: "sk_SK", type: "website" },
};

export default async function Page() {
  if (!CARS_ENABLED) notFound();   // sekcia je vypnutá (lib/features.ts)
  const cat = await getCatalog();
  const initial = await searchCars({ ...emptyCarFilters, vtype: "osobne" }, 0, 24).catch(() => ({ items: [], total: 0, conds: {} }));
  const packed = packCatalog({ ...cat, engines: [], subcategories: [] });
  return (
    <main id="main">
      <JsonLd data={[breadcrumbLd([{ name: "Úvod", href: "/" }, { name: "Havarované vozidlá", href: "/havarovane-vozidla" }]),
        { "@context": "https://schema.org", "@type": "ItemList", name: TITLE, numberOfItems: initial.total,
          itemListElement: initial.items.map((c, i) => ({ "@type": "ListItem", position: i + 1, url: SITE_URL + vehiclePath(c.id, vehicleTitle(c, cat), c.condition) })) }]} />
      <section className="hero"><div className="in">
        <h1>Havarované a nepojazdné vozidlá</h1>
        <p className="sub">Celé vozidlá po havárii, s poruchou, po požiari či povodni alebo určené na diely – osobné autá, dodávky, nákladné autá, autobusy aj motorky. Pri každom vidíte stav, poškodené časti, kilometre a doklady. Bežné jazdené autá tu nenájdete.</p>
        <p className="sellcta">Predávate havarované alebo nepojazdné vozidlo? <Link href="/pre-predajcov?registracia=1">Pridajte ho zadarmo</Link></p>
      </div></section>
      <div className="wrap">
        <CarsBrowse packed={packed} initial={initial} />
        <Disclaimer kind="car" />
      </div>
    </main>
  );
}
