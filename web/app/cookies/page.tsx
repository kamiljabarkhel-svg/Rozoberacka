import type { Metadata } from "next";
import { LegalPage } from "@/components/Legal";
import { CookieSettingsLink } from "@/components/CookieBar";

export const metadata: Metadata = { title: "Cookies", alternates: { canonical: "/cookies" } };

export default function Page() {
  return (
    <LegalPage title="Cookies a úložisko prehliadača">
      <p>Rozoberačka <b>nepoužíva reklamné, analytické ani sledovacie cookies</b> a nevkladá kód tretích strán, ktorý by vás sledoval (ani písma z Google – web ich podáva sám). V prehliadači ukladáme len údaje nevyhnutné na fungovanie služieb, o ktoré ste požiadali. Na ne podľa § 109 ods. 8 zákona č. 452/2021 Z. z. o elektronických komunikáciách nie je potrebný súhlas.</p>
      <h2>Ako funguje súhlas</h2>
      <ul>
        <li><b>Nevyhnutné úložisko</b> je vždy zapnuté – bez neho by nefungovalo prihlásenie predajcu, obľúbené diely ani uložené hľadania.</li>
        <li><b>Voliteľné nástroje</b> (napríklad meranie návštevnosti) by sme načítali až po vašom súhlase (čl. 6 ods. 1 písm. a) GDPR). Odmietnuť je rovnako jednoduché ako prijať a bez súhlasu web funguje celý. Momentálne žiadne voliteľné nástroje nepoužívame; keby sme ich pridali, lišta sa vám zobrazí znova a opýta sa.</li>
        <li>Svoju voľbu môžete kedykoľvek zmeniť alebo odvolať: <CookieSettingsLink /> (odkaz je aj v pätičke každej stránky). Pri odvolaní súhlasu cookies voliteľných nástrojov zmažeme.</li>
      </ul>
      <h2>Čo ukladáme vo vašom prehliadači</h2>
      <table className="legal-t">
        <thead><tr><th>Názov</th><th>Druh</th><th>Načo slúži</th><th>Kategória</th><th>Ako dlho</th></tr></thead>
        <tbody>
          <tr><td>rozoberacka-auth*</td><td>localStorage</td><td>prihlásenie predajcu (len po prihlásení)</td><td>nevyhnutné</td><td>do odhlásenia</td></tr>
          <tr><td>rozoberacka-fav</td><td>localStorage</td><td>obľúbené inzeráty, ktoré ste si označili</td><td>nevyhnutné (vami zapnutá funkcia)</td><td>kým ich nezmažete</td></tr>
          <tr><td>rozoberacka-hladania</td><td>localStorage</td><td>hľadania, ktoré ste si uložili (strážca dielov)</td><td>nevyhnutné (vami zapnutá funkcia)</td><td>kým ich nezmažete</td></tr>
          <tr><td>rozoberacka-dopyty</td><td>localStorage</td><td>odkazy na vaše dopyty na diely, aby ste ich našli znova</td><td>nevyhnutné (vami zapnutá funkcia)</td><td>kým ich nezmažete</td></tr>
          <tr><td>rozoberacka-moje-auto</td><td>localStorage</td><td>auto, ktoré ste si uložili ako „Moje auto“, aby sme vám ukázali diely naň</td><td>nevyhnutné (vami zapnutá funkcia)</td><td>kým ho nezmažete („Zabudnúť auto“)</td></tr>
          <tr><td>rozoberacka-suhlas</td><td>localStorage</td><td>vaša voľba v nastaveniach cookies a jej dátum</td><td>nevyhnutné</td><td>kým ju nezmeníte alebo nezmažete</td></tr>
          <tr><td>rz-tel-*, rz-view-*</td><td>sessionStorage</td><td>aby sa odkrytý telefón a zobrazenie nepočítali znova</td><td>nevyhnutné</td><td>do zatvorenia prehliadača</td></tr>
          <tr><td>sw.js (service worker)</td><td>skript prehliadača</td><td>pridanie webu na plochu ako aplikácie a hlásenie „bez internetu“; neukladá žiadne údaje</td><td>nevyhnutné</td><td>kým ho nezmažete v nastaveniach prehliadača</td></tr>
        </tbody>
      </table>
      <p>Čítanie OEM alebo VIN z fotky prebieha priamo vo vašom prehliadači – fotka sa nikam neposiela a nič sa neukladá.</p>
      <p>Údaje si môžete kedykoľvek zmazať aj v nastaveniach prehliadača (Vymazať údaje stránok). Viac o spracúvaní osobných údajov nájdete v <a href="/ochrana-osobnych-udajov">zásadách ochrany osobných údajov</a>.</p>
    </LegalPage>
  );
}
