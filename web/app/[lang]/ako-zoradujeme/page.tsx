import type { Metadata } from "next";
import Link from "next/link";
import { LegalPage } from "@/components/Legal";
import { langOf } from "@/lib/i18n";
import { altLangs } from "@/lib/hreflang";

// § 16 ods. 1 písm. a) zákona č. 108/2024 Z. z.: hlavné parametre poradia ponúk vo výsledkoch hľadania.
type P = { params: Promise<{ lang: string }> };
export async function generateMetadata({ params }: P): Promise<Metadata> {
  const pl = langOf("/" + (await params).lang) === "pl";
  return pl ? { title: "Jak sortujemy oferty", description: "Według czego autosuciastky.eu sortuje ogłoszenia w wynikach wyszukiwania: ogłoszenia TOP, najnowsze, cena, zgodność z szukanym tekstem i samochodem.", alternates: { canonical: "/pl/ako-zoradujeme", languages: altLangs("/ako-zoradujeme") } }
    : { title: "Ako zoraďujeme ponuky", description: "Podľa čoho autosuciastky.eu zoraďuje inzeráty vo výsledkoch hľadania: TOP inzeráty, najnovšie, cena, zhoda s hľadaným textom a autom.", alternates: { canonical: "/ako-zoradujeme", languages: altLangs("/ako-zoradujeme") } };
}

export default async function Page({ params }: P) {
  if (langOf("/" + (await params).lang) === "pl") return (
    <LegalPage title="Jak sortujemy oferty" lang="pl" skPath="/ako-zoradujeme">
      <p>W wynikach wyszukiwania widzisz tylko aktywne ogłoszenia odpowiadające Twoim filtrom (samochód, kategoria, cena, stan, miasto i inne). Kolejność wyznaczają następujące parametry, w tej kolejności ważności:</p>
      <h2>Sortowanie „Najnowsze” (domyślne)</h2>
      <ol>
        <li><b>Ogłoszenia TOP</b> – sprzedawca może wyróżnić ogłoszenie na 30 dni, maksymalnie 3 ogłoszenia jednocześnie. Ogłoszenie TOP jest zawsze oznaczone etykietą <b>TOP</b> i wyświetla się wśród pierwszych, jeśli odpowiada Twoim filtrom. Wyróżnienie jest na razie bezpłatne; jeśli będzie płatne, podamy to tutaj i przy etykiecie.</li>
        <li><b>Zgodność z szukanym tekstem</b> – jeśli szukasz słowem, najpierw są części, których nazwa zawiera szukane wyrażenie, potem części, w których wyrażenie znaleziono w opisie, numerze OEM lub samochodzie. Teksty ogłoszeń są po słowacku, dlatego najlepiej szukać według samochodu, kategorii lub numeru części.</li>
        <li><b>Data dodania</b> – nowsze ogłoszenia są wyżej.</li>
      </ol>
      <h2>Sortowanie „Najtańsze” i „Najdroższe”</h2>
      <p>Ogłoszenia są posortowane tylko według ceny (przy tej samej cenie nowsze wyżej). Wyróżnienie TOP nie wpływa tu na kolejność.</p>
      <h2>Wyszukiwanie według samochodu</h2>
      <p>Po wybraniu samochodu wyświetlą się części z tego samochodu oraz części, przy których sprzedawcy podali, że do niego pasują, lub które mają ten sam numer OEM co część z Twojego samochodu. Są to dane sprzedawców, a nie zweryfikowany katalog – przed zakupem porównaj numer OEM.</p>
      <h2>Co nie wpływa na kolejność</h2>
      <ul>
        <li>Płatności sprzedawców poza wyróżnieniem TOP – za wyższe miejsce nie można zapłacić w inny sposób.</li>
        <li>To, czy sprzedawca jest przedsiębiorcą czy osobą prywatną, ani oceny sprzedawcy.</li>
        <li>Twoje dane osobowe – kolejność nie jest dopasowana do konkretnej osoby. Ulubione i „Mój samochód” są zapisane tylko w Twojej przeglądarce i są używane tylko wtedy, gdy sam je włączysz.</li>
        <li>Język – polska wersja pokazuje te same ogłoszenia w tej samej kolejności co słowacka.</li>
      </ul>
      <p><Link href="/pl">Wróć do wyszukiwania części</Link></p>
    </LegalPage>
  );
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
