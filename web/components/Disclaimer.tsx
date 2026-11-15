"use client";
import T from "@/components/T";
import { useHref } from "@/lib/i18n/client";
// Upozornenie, že ide o inzertný portál: prevádzkovateľ nie je predávajúcim ani stranou zmluvy
// a nezodpovedá za obsah inzerátov ani za vady a reklamácie (zodpovedá predajca). Podrobne v obchodných podmienkach, časť 2.
import Link from "next/link";
import { OPERATOR } from "@/lib/operator";

type Kind = "part" | "car" | "short" | "request";

export default function Disclaimer({ kind = "part" }: { kind?: Kind }) {
  const hl = useHref();
  if (kind === "short") return (
    <p className="disc-short"><b><T>{"autosuciastky.eu je inzertný portál."}</T></b> <T>{"Diely a vozidlá predávajú priamo predajcovia, ktorí zodpovedajú za inzeráty, tovar aj reklamácie."}</T> {OPERATOR.name} <T>{"nie je predávajúcim ani stranou kúpnej zmluvy."}</T> <Link href={hl("/obchodne-podmienky#zodpovednost")}><T>{"Viac"}</T></Link></p>
  );
  const what = kind === "car" ? "vozidlo, jeho stav, poškodenie, kilometre a doklady" : kind === "request" ? "ponuky, diely a ich stav" : "diel, jeho stav, číslo dielu a to, či pasuje na vaše vozidlo";
  return (
    <div className="disclaimer" role="note">
      <b><T>{"Inzertný portál – predávajúcim je predajca, nie portál."}</T></b> <T>{"Inzeráty pridávajú predajcovia a za ich obsah, za"}</T> <T>{what}</T> <T>{"a za vybavenie reklamácie zodpovedá predajca. Prevádzkovateľ portálu"}</T> {OPERATOR.name} <T>{"tovar nepredáva, neoveruje ho, nie je stranou kúpnej zmluvy a nezodpovedá za chyby v inzerátoch, za vady tovaru ani za reklamácie, vrátenie peňazí či doručenie – tieto riešite priamo s predajcom."}</T>
      {kind === "part" && <> <T>{"Pred kúpou porovnajte"}</T> <b><T>{"číslo dielu (OEM)"}</T></b> <T>{"s vaším starým dielom."}</T></>}
      {kind === "car" && <> <T>{"Vozidlo si pred kúpou pozrite osobne a overte doklady."}</T></>}
      {" "}<Link href={hl("/obchodne-podmienky#zodpovednost")}><T>{"Obchodné podmienky"}</T></Link> · <Link href={hl("/navody/bezpecny-nakup")}><T>{"Bezpečný nákup"}</T></Link>
    </div>
  );
}
