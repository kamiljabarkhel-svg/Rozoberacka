// Predaný alebo pozastavený diel: odkaz (napr. poslaný mechanikovi) ostáva užitočný – ukážeme náhradu.
import Link from "next/link";
import { getCatalog, getReplacements, type GoneListing } from "@/lib/data";
import { pickCatalog } from "@/lib/catalogSort";
import { carName, landingCrumbs, landingPath } from "@/lib/seo";
import Crumbs from "./Crumbs";
import LandingGrid from "./LandingGrid";

export default async function GonePage({ g }: { g: GoneListing }) {
  const [cat, items] = await Promise.all([getCatalog(), getReplacements(g)]);
  const car = carName(g, cat);
  const crumbs = landingCrumbs({ brandId: g.brandId, modelId: g.modelId, cat: g.categoryId, sub: null }, cat);
  const sold = g.status === "sold";
  const more = g.brandId != null ? landingPath({ brandId: g.brandId, modelId: g.modelId, cat: g.categoryId, sub: null }, cat)
    : landingPath({ brandId: null, modelId: null, cat: g.categoryId, sub: null }, cat);
  const rq = new URLSearchParams({ ...(g.brandId != null ? { znacka: String(g.brandId) } : {}), ...(g.modelId != null ? { model: String(g.modelId) } : {}), diel: g.name });
  return (
    <main id="main" className="main landing gone">
      <Crumbs items={crumbs} last={g.name} />
      <div className="gone-head">
        {g.photo && <img src={g.photo} alt="" width={120} height={90} />}
        <div>
          <span className={"gone-badge" + (sold ? " sold" : "")}>{sold ? "Predané" : "Momentálne nedostupné"}</span>
          <h1>{g.name}</h1>
          <p className="mute">{[car, g.year, g.oem && "OEM " + g.oem].filter(Boolean).join(" · ")}</p>
          <p>{sold ? "Tento diel už predajca predal." : "Predajca inzerát dočasne pozastavil."} Nižšie sú podobné diely, ktoré sú teraz v ponuke{g.oem ? " – najprv tie s rovnakým OEM číslom" : ""}.</p>
        </div>
      </div>
      {items.length ? <LandingGrid items={items} cat={pickCatalog(cat, items)} /> : <div className="empty">Podobný diel teraz nikto neponúka.</div>}
      <p className="landing-more"><Link className="btn2" href={more}>Všetky podobné diely</Link></p>
      <div className="rq-cta"><p><b>Nenašli ste náhradu?</b> Zadajte dopyt – predajcovia vám pošlú ponuku. Bez registrácie.</p>
        <Link className="btn2" href={`/dopyt?${rq.toString()}`}>Zadať dopyt na diel</Link></div>
    </main>
  );
}
