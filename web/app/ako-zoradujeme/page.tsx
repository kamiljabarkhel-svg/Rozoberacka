import type { Metadata } from "next";
import Link from "next/link";
import { LegalPage } from "@/components/Legal";

// § 16 ods. 1 písm. a) zákona č. 108/2024 Z. z.: hlavné parametre poradia ponúk vo výsledkoch hľadania.
export const metadata: Metadata = {
  title: "Ako zoraďujeme ponuky",
  description: "Podľa čoho autosuciastky.eu zoraďuje inzeráty vo výsledkoch hľadania: TOP inzeráty, najnovšie, cena, zhoda s hľadaným textom a autom.",
  alternates: { canonical: "/ako-zoradujeme" },
};

export default function Page() {
  return (
    <LegalPage title="Ako zoraďujeme ponuky">
      <p>Vo výsledkoch hľadania vidíte len aktívne inzeráty, ktoré zodpovedajú vašim filtrom (auto, kategória, cena, stav, mesto a ďalšie). Poradie určujú tieto parametre, v tomto poradí dôležitosti:</p>
      <h2>Zoradenie „Najnovšie“ (predvolené)</h2>
      <ol>
        <li><b>TOP inzeráty</b> – predajca môže inzerát zvýrazniť na 30 dní, najviac 3 inzeráty naraz. TOP inzerát je vždy označený štítkom <b>TOP</b> a zobrazí sa medzi prvými, ak zodpovedá vašim filtrom. Zvýraznenie je zatiaľ bezplatné; ak bude platené, uvedieme to tu aj pri štítku.</li>
        <li><b>Zhoda s hľadaným textom</b> – ak hľadáte slovom, najprv sú diely, ktorých názov obsahuje hľadaný výraz, potom diely, kde sa výraz našiel v popise, OEM čísle alebo aute.</li>
        <li><b>Dátum pridania</b> – novšie inzeráty sú vyššie.</li>
      </ol>
      <h2>Zoradenie „Najlacnejšie“ a „Najdrahšie“</h2>
      <p>Inzeráty sú zoradené len podľa ceny (pri rovnakej cene novšie vyššie). TOP zvýraznenie tu poradie neovplyvňuje.</p>
      <h2>Hľadanie podľa auta</h2>
      <p>Pri výbere auta sa zobrazia diely z tohto auta aj diely, pri ktorých predajcovia uviedli, že naň pasujú, alebo majú rovnaké OEM číslo ako diel z vášho auta. Ide o údaje predajcov, nie o overený katalóg – pred kúpou porovnajte OEM číslo.</p>
      <h2>Čo poradie neovplyvňuje</h2>
      <ul>
        <li>Platby predajcov mimo TOP zvýraznenia – za vyššie miesto sa inak platiť nedá.</li>
        <li>Či je predajca podnikateľ alebo súkromná osoba, ani hodnotenia predajcu.</li>
        <li>Vaše osobné údaje – poradie nie je prispôsobené konkrétnemu človeku. Obľúbené a „Moje auto“ sú uložené len vo vašom prehliadači a použijú sa, len keď si ich sami zapnete.</li>
      </ul>
      <p><Link href="/">Späť na hľadanie dielov</Link></p>
    </LegalPage>
  );
}
