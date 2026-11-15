import T from "@/components/T";
// Poučenie kupujúceho podľa § 16 ods. 1 písm. b) a c) zákona č. 108/2024 Z. z. (online trh).
import Link from "next/link";
import { isTrader } from "@/lib/legal";

export default function SellerNotice({ type, name, ico, address }: { type: string; name: string; ico?: string | null; address?: string | null }) {
  if (isTrader(type)) return (
    <div className="snote trader" role="note">
      <b><T>{"Predáva podnikateľ"}</T></b> <T>{"(podľa vyhlásenia predajcu)"}</T>{ico || address ? <>: {name}{ico ? `, IČO ${ico}` : ""}{address ? `, ${address}` : ""}</> : null}.
      {" "}<T>{"Máte práva spotrebiteľa – zodpovednosť predajcu za vady a pri kúpe na diaľku odstúpenie od zmluvy do 14 dní. Zmluvu uzatvárate priamo s predajcom, portál nie je jej stranou."}</T> <Link href="/navody/bezpecny-nakup"><T>{"Viac o právach kupujúceho"}</T></Link>
    </div>
  );
  return (
    <div className="snote private" role="note">
      <b><T>{"Predáva súkromná osoba"}</T></b> <T>{"(podľa vyhlásenia predajcu, nie podnikateľ). Na túto kúpu sa"}</T> <b><T>{"nevzťahujú predpisy na ochranu spotrebiteľa"}</T></b> <T>{"– napríklad odstúpenie od zmluvy do 14 dní či zákonná doba zodpovednosti obchodníka za vady. Platia všeobecné pravidlá Občianskeho zákonníka: predajca zodpovedá za vady, na ktoré vás neupozornil. Zmluvu uzatvárate priamo s predajcom, portál nie je jej stranou."}</T> <Link href="/navody/bezpecny-nakup"><T>{"Viac o právach kupujúceho"}</T></Link>
    </div>
  );
}
