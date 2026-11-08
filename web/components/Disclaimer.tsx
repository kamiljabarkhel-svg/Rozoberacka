// Upozornenie, že ide o inzertný portál: prevádzkovateľ nie je predávajúcim ani stranou zmluvy
// a nezodpovedá za obsah inzerátov ani za vady a reklamácie (zodpovedá predajca). Podrobne v obchodných podmienkach, časť 2.
import Link from "next/link";
import { OPERATOR } from "@/lib/operator";

type Kind = "part" | "car" | "short" | "request";

export default function Disclaimer({ kind = "part" }: { kind?: Kind }) {
  if (kind === "short") return (
    <p className="disc-short"><b>autosuciastky.eu je inzertný portál.</b> Diely a vozidlá predávajú priamo predajcovia, ktorí zodpovedajú za inzeráty, tovar aj reklamácie. {OPERATOR.name} nie je predávajúcim ani stranou kúpnej zmluvy. <Link href="/obchodne-podmienky#zodpovednost">Viac</Link></p>
  );
  const what = kind === "car" ? "vozidlo, jeho stav, poškodenie, kilometre a doklady" : kind === "request" ? "ponuky, diely a ich stav" : "diel, jeho stav, číslo dielu a to, či pasuje na vaše vozidlo";
  return (
    <div className="disclaimer" role="note">
      <b>Inzertný portál – predávajúcim je predajca, nie portál.</b> Inzeráty pridávajú predajcovia a za ich obsah, za {what} a za vybavenie
      reklamácie zodpovedá predajca. Prevádzkovateľ portálu {OPERATOR.name} tovar nepredáva, neoveruje ho, nie je stranou kúpnej zmluvy
      a nezodpovedá za chyby v inzerátoch, za vady tovaru ani za reklamácie, vrátenie peňazí či doručenie – tieto riešite priamo s predajcom.
      {kind === "part" && <> Pred kúpou porovnajte <b>číslo dielu (OEM)</b> s vaším starým dielom.</>}
      {kind === "car" && <> Vozidlo si pred kúpou pozrite osobne a overte doklady.</>}
      {" "}<Link href="/obchodne-podmienky#zodpovednost">Obchodné podmienky</Link> · <Link href="/navody/bezpecny-nakup">Bezpečný nákup</Link>
    </div>
  );
}
