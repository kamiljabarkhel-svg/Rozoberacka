import T from "@/components/T";
// Predaný alebo pozastavený diel: odkaz (napr. poslaný mechanikovi) ostáva užitočný – ukážeme náhradu.
import Link from "next/link";
import { getCatalog, getReplacements, type GoneListing } from "@/lib/data";
import { pickCatalog } from "@/lib/catalogSort";
import { carName, landingCrumbs, landingPath } from "@/lib/seo";
import Crumbs from "./Crumbs";
import { lhref, tr, type Lang } from "@/lib/i18n";
import LandingGrid from "./LandingGrid";

export default async function GonePage({ g, lang = "sk" }: { g: GoneListing; lang?: Lang }) {
  const t = (s: string) => tr(lang, s);
  const [cat, items] = await Promise.all([getCatalog(), getReplacements(g)]);
  const car = carName(g, cat);
  const crumbs = landingCrumbs({ brandId: g.brandId, modelId: g.modelId, cat: g.categoryId, sub: null }, cat, lang);
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
          <span className={"gone-badge" + (sold ? " sold" : "")}>{t(sold ? "Predané" : "Momentálne nedostupné")}</span>
          <h1>{g.name}</h1>
          <p className="mute">{[t(car), g.year, g.oem && "OEM " + g.oem].filter(Boolean).join(" · ")}</p>
          <p>{t(sold ? "Tento diel už predajca predal." : "Predajca inzerát dočasne pozastavil.")} <T>{"Nižšie sú podobné diely, ktoré sú teraz v ponuke"}</T>{g.oem ? " – " + t("najprv tie s rovnakým OEM číslom") : ""}.</p>
        </div>
      </div>
      {items.length ? <LandingGrid items={items} cat={pickCatalog(cat, items)} /> : <div className="empty"><T>{"Podobný diel teraz nikto neponúka."}</T></div>}
      <p className="landing-more"><Link className="btn2" href={lhref(lang, more)}><T>{"Všetky podobné diely"}</T></Link></p>
      <div className="rq-cta"><p><b><T>{"Nenašli ste náhradu?"}</T></b> <T>{"Zadajte dopyt – predajcovia vám pošlú ponuku. Bez registrácie."}</T></p>
        <Link className="btn2" href={lhref(lang, `/dopyt?${rq.toString()}`)}><T>{"Zadať dopyt na diel"}</T></Link></div>
    </main>
  );
}
