// Návody pre kupujúcich – stále stránky (nie blog). Pomáhajú ľuďom aj vyhľadávačom.
import Link from "next/link";
import type { ReactNode } from "react";

export type Navod = { slug: string; title: string; short: string; description: string; updated: string; body: ReactNode };

export const NAVODY: Navod[] = [
  {
    slug: "oem-cislo",
    title: "Kde nájdem OEM číslo dielu",
    short: "OEM číslo",
    description: "Čo je OEM číslo autodielu, kde ho nájdete na starom diele a prečo ho porovnať pred kúpou použitého dielu.",
    updated: "2026-11-06",
    body: <>
      <p><b>OEM číslo je výrobné číslo dielu od výrobcu auta.</b> Rovnaké číslo znamená rovnaký diel, aj keď sedí do viacerých modelov. Preto je to najistejší spôsob, ako overiť, že použitý diel pasuje.</p>
      <h2>Kde ho nájdete</h2>
      <ul>
        <li><b>Na starom diele</b> – na nálepke, štítku alebo vyrazené či odliate v plaste a kove. Pri svetlách býva na zadnej strane krytu, pri riadiacich jednotkách na štítku, pri alternátore a štartéri na kovovom štítku.</li>
        <li><b>V servise alebo u predajcu značky</b> – podľa VIN čísla vám ho vyhľadajú v katalógu výrobcu.</li>
        <li><b>Na faktúre</b> z predchádzajúcej opravy, ak sa diel už menil.</li>
      </ul>
      <h2>Ako ho porovnať</h2>
      <ul>
        <li>Medzery, bodky a pomlčky nehrajú rolu: <code>5E0 823 031</code> a <code>5E0823031</code> je to isté číslo. autosuciastky.eu ich pri hľadaní porovnáva bez nich.</li>
        <li>Písmeno na konci (napr. <code>…031A</code>, <code>…031B</code>) často označuje novšiu verziu dielu. Niekedy je zameniteľná, niekedy nie – opýtajte sa predajcu alebo servisu.</li>
        <li>Číslo výrobcu dielu (Bosch, Valeo, Hella…) nie je OEM číslo auta. Ak ho predajca uvádza, nájdete ho v inzeráte ako „Výrobca dielu“.</li>
      </ul>
      <h2>Hľadanie na autosuciastky.eu</h2>
      <p>Na úvodnej stránke napíšte číslo do poľa <Link href="/#hladat">Hľadať podľa čísla dielu</Link>. Na mobile ho môžete aj odfotiť – text sa prečíta priamo v telefóne, fotka sa nikam neposiela.</p>
      <p className="mute">Zoznam „Pasuje na“ v inzerátoch zostavujeme z údajov predajcov a zo zhody OEM čísel. Nie je to overený katalóg výrobcu.</p>
    </>,
  },
  {
    slug: "vin",
    title: "Kde nájdem VIN číslo auta",
    short: "VIN číslo",
    description: "Kde je VIN (výrobné číslo karosérie) na aute a v osvedčení o evidencii a čo z neho zistíte: výrobcu, druh vozidla a pri niektorých značkách modelový rok.",
    updated: "2026-11-06",
    body: <>
      <p><b>VIN je 17-miestne výrobné číslo auta.</b> Obsahuje písmená a číslice, ale nikdy písmená I, O a Q (aby sa nepliedli s 1 a 0).</p>
      <h2>Kde ho nájdete</h2>
      <ul>
        <li><b>V osvedčení o evidencii</b> (malý technický preukaz), časť I, v kolónke <b>E</b>.</li>
        <li><b>Za čelným sklom</b> – pri väčšine novších áut v spodnom rohu na strane vodiča, čitateľné zvonka.</li>
        <li><b>Na štítku</b> v stĺpiku dverí alebo v motorovom priestore a vyrazené na karosérii (miesto podľa výrobcu).</li>
      </ul>
      <h2>Čo z neho zistíte</h2>
      <ul>
        <li><b>Prvé 3 znaky</b> označujú výrobcu, napríklad <code>TMB</code> Škoda, <code>WVW</code> Volkswagen, <code>WAU</code> Audi, <code>WBA</code> BMW.</li>
        <li>Prvé 3 znaky prezradia aj <b>druh vozidla</b> – napríklad <code>JH2</code> je motorka Honda, <code>JHM</code> auto Honda, <code>YS2</code> nákladné auto Scania, <code>WKK</code> autobus Setra.</li>
        <li><b>10. znak</b> je modelový rok – ale len u niektorých výrobcov (napr. Škoda, Volkswagen, Audi, Seat, Hyundai, Kia, Toyota, Volvo, japonské motorky): … <code>G</code> 2016, <code>H</code> 2017, <code>J</code> 2018, <code>K</code> 2019, <code>L</code> 2020, <code>M</code> 2021, <code>N</code> 2022, <code>P</code> 2023, <code>R</code> 2024, <code>S</code> 2025, <code>T</code> 2026. Kód sa opakuje každých 30 rokov (<code>S</code> je aj 1995). Mercedes-Benz, BMW, Renault, Peugeot, Citroën, Fiat, Opel, Ford (Európa) a väčšina nákladných áut a autobusov rok do 10. znaku nezapisujú – ročník nájdete v technickom preukaze. Modelový rok sa môže líšiť od roku výroby.</li>
      </ul>
      <p>Na úvodnej stránke zadajte VIN do poľa <Link href="/#vin">VIN</Link> a autosuciastky.eu podľa neho vyberie výrobcu a druh vozidla a ukáže približný ročník, ak ho výrobca do VIN zapisuje. Presný model, motorizáciu a ročník vyberte sami. VIN môžete aj odfotiť – číta sa priamo v telefóne.</p>
      <p>VIN pomôže aj predajcovi pri dopyte: <Link href="/dopyt">zadajte dopyt na diel</Link> a VIN pripíšte – predajca ho uvidí, verejne sa nezobrazuje.</p>
    </>,
  },
  {
    slug: "bezpecny-nakup",
    title: "Ako bezpečne kúpiť použitý autodiel",
    short: "Bezpečný nákup",
    description: "Ako overiť, že použitý diel pasuje, na čo sa pýtať predajcu, ako platiť a aké máte práva pri kúpe od firmy a od súkromnej osoby.",
    updated: "2026-11-07",
    body: <>
      <p><b>Najprv overte diel, potom plaťte.</b> autosuciastky.eu je inzertný portál – diel kupujete priamo od predajcu, my platby nesprostredkúvame.</p>
      <h2>Pred kúpou</h2>
      <ol>
        <li>Porovnajte <Link href="/navody/oem-cislo">OEM číslo</Link> so starým dielom. Ak ho inzerát nemá, vypýtajte si fotku štítku.</li>
        <li>Opýtajte sa na auto, z ktorého je diel: ročník, motorizácia, najazdené km. Pri elektronike, či bola odskúšaná.</li>
        <li>Pri svetlách a karosérii si vypýtajte fotky úchytov a hrán – praskliny bývajú tam.</li>
      </ol>
      <h2>Platba a prevzatie</h2>
      <ul>
        <li>Najbezpečnejší je osobný odber s kontrolou dielu na mieste.</li>
        <li>Pri zásielke uprednostnite dobierku alebo predajcu, ktorého poznáte. Neposielajte zálohu neznámemu predajcovi, najmä ak vás tlačí na rýchlu platbu.</li>
        <li>Podozrivý inzerát nahláste tlačidlom „Nahlásiť inzerát“ v detaile.</li>
      </ul>
      <h2>Vaše práva</h2>
      <ul>
        <li><b>Kto predáva:</b> pri každom inzeráte uvidíte, či predáva <b>podnikateľ</b> (s obchodným menom, IČO a sídlom) alebo <b>súkromná osoba</b>. Vychádza to z vyhlásenia predajcu.</li>
        <li><b>Kúpa od podnikateľa:</b> máte práva spotrebiteľa. Predajca zodpovedá za vady, ktoré sa prejavia do 24 mesiacov od prevzatia; pri použitom alebo repasovanom diele sa s vami môže dohodnúť na kratšej dobe, najmenej 12 mesiacov (v inzeráte to uvidíte). Za vadu sa nepovažuje bežné opotrebenie zodpovedajúce veku dielu. Pri kúpe na diaľku (zásielka) môžete odstúpiť od zmluvy do 14 dní bez udania dôvodu; pri osobnom odbere toto právo nemáte.</li>
        <li><b>Kúpa od súkromnej osoby:</b> predpisy na ochranu spotrebiteľa sa nepoužijú (žiadne odstúpenie do 14 dní). Predajca zodpovedá za vady, na ktoré vás neupozornil – vytknite mu ich čo najskôr, najneskôr do 24 mesiacov od prevzatia (od 1. 7. 2027 podľa nového Občianskeho zákonníka spravidla do 6 mesiacov). Podmienky si dohodnite vopred, ideálne písomne (stačí správa).</li>
        <li><b>Spor s podnikateľom</b> riešte najprv reklamáciou u predajcu. Ak nevyhovie, môžete sa obrátiť na subjekt alternatívneho riešenia spotrebiteľských sporov, napríklad Slovenskú obchodnú inšpekciu (soi.sk), alebo na súd.</li>
        <li><b>Kupujete pre firmu alebo servis?</b> Vtedy nie ste spotrebiteľ – zodpovednosť za vady sa riadi Obchodným zákonníkom a dohodou s predajcom.</li>
      </ul>
      <p className="mute">Toto je všeobecná informácia, nie právna rada.</p>
      <h2>Nenašli ste diel?</h2>
      <p><Link href="/dopyt">Zadajte dopyt</Link> – vrakoviská vám pošlú ponuky. Alebo si v hľadaní zapnite strážcu a pri ďalšej návšteve uvidíte nové diely.</p>
    </>,
  },
];

export const navodPath = (slug: string) => "/navody/" + slug;
