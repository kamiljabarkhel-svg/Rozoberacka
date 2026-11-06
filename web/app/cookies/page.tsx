import type { Metadata } from "next";
import { LegalPage } from "@/components/Legal";

export const metadata: Metadata = { title: "Cookies", alternates: { canonical: "/cookies" } };

export default function Page() {
  return (
    <LegalPage title="Cookies a úložisko prehliadača">
      <p>Rozoberačka nepoužíva reklamné, analytické ani sledovacie cookies a nevkladá kód tretích strán, ktorý by vás sledoval. Ukladáme len údaje nevyhnutné na fungovanie služieb, o ktoré ste požiadali. Na tieto podľa § 109 ods. 8 zákona č. 452/2021 Z. z. o elektronických komunikáciách nie je potrebný súhlas, preto nezobrazujeme cookie lištu.</p>
      <table className="legal-t">
        <thead><tr><th>Názov</th><th>Druh</th><th>Načo slúži</th><th>Ako dlho</th></tr></thead>
        <tbody>
          <tr><td>rozoberacka-auth*</td><td>localStorage</td><td>prihlásenie predajcu (len po prihlásení)</td><td>do odhlásenia</td></tr>
          <tr><td>rozoberacka-fav</td><td>localStorage</td><td>obľúbené inzeráty, ktoré ste si označili</td><td>kým ich nezmažete</td></tr>
          <tr><td>rozoberacka-hladania</td><td>localStorage</td><td>hľadania, ktoré ste si uložili (strážca dielov)</td><td>kým ich nezmažete</td></tr>
          <tr><td>rozoberacka-dopyty</td><td>localStorage</td><td>odkazy na vaše dopyty na diely, aby ste ich našli znova</td><td>kým ich nezmažete</td></tr>
          <tr><td>rozoberacka-moje-auto</td><td>localStorage</td><td>auto, ktoré ste si uložili ako „Moje auto“, aby sme vám ukázali diely naň</td><td>kým ho nezmažete („Zabudnúť auto“)</td></tr>
          <tr><td>sw.js (service worker)</td><td>skript prehliadača</td><td>pridanie webu na plochu ako aplikácie a hlásenie „bez internetu“; neukladá žiadne údaje</td><td>kým ho nezmažete v nastaveniach prehliadača</td></tr>
          <tr><td>rz-tel-*, rz-view-*</td><td>sessionStorage</td><td>aby sa odkrytý telefón a zobrazenie nepočítali znova</td><td>do zatvorenia prehliadača</td></tr>
        </tbody>
      </table>
      <p>Ak v budúcnosti pridáme meranie návštevnosti alebo iné nepotrebné cookies, najprv vás požiadame o súhlas.</p>
      <p>Údaje si môžete kedykoľvek zmazať v nastaveniach prehliadača (Vymazať údaje stránok).</p>
    </LegalPage>
  );
}
