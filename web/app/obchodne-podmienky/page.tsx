import type { Metadata } from "next";
import { LegalPage, OperatorBox } from "@/components/Legal";
import { OPERATOR, fill } from "@/lib/operator";

export const metadata: Metadata = { title: "Obchodné podmienky", alternates: { canonical: "/obchodne-podmienky" } };

export default function Page() {
  return (
    <LegalPage title="Obchodné podmienky">
      <p>Tieto podmienky upravujú používanie inzertného portálu Rozoberačka. Prehliadanie inzerátov a kontaktovanie predajcov je bez registrácie a zadarmo. Predajca registráciou potvrdzuje, že s podmienkami súhlasí.</p>

      <h2>1. Prevádzkovateľ</h2>
      <OperatorBox />
      <p>Kontaktné miesto pre používateľov a orgány podľa nariadenia (EÚ) 2022/2065 o digitálnych službách: {OPERATOR.email || fill("")}, komunikujeme po slovensky.</p>

      <h2>2. Čo portál robí a čo nie</h2>
      <ul>
        <li>Portál zverejňuje inzeráty predajcov použitých autodielov a sprostredkúva kontakt medzi predajcom a kupujúcim.</li>
        <li>Prevádzkovateľ <b>nie je predávajúcim ani účastníkom</b> kúpnej zmluvy. Zmluva vzniká priamo medzi predajcom a kupujúcim, ktorí sa dohodnú na cene, platbe, odovzdaní aj reklamácii.</li>
        <li>Portál neprijíma platby a neposiela tovar.</li>
        <li>Zoznam „Pasuje na“ skladáme z údajov predajcov (vlastné auto, „pasuje aj na“ a inzeráty s rovnakým OEM číslom). Nie je to overený katalóg. Pred kúpou porovnajte OEM číslo s pôvodným dielom.</li>
      </ul>

      <h2>3. Predajca a jeho povinnosti</h2>
      <ul>
        <li>Predajca uvádza pravdivé údaje o sebe aj o diele, vrátane známych vád, a pravdivo vyberie, či je firma alebo súkromná osoba.</li>
        <li>Predáva len diely, ktoré vlastní alebo s ktorými smie nakladať. Zakázané sú kradnuté diely, diely s pozmeneným identifikačným číslom a veci, ktorých predaj zakazuje zákon.</li>
        <li>Firma predávajúca spotrebiteľovi dodržiava zákony na ochranu spotrebiteľa, najmä zodpovednosť za vady použitého tovaru najmenej 12 mesiacov a pri predaji na diaľku právo spotrebiteľa odstúpiť od zmluvy do 14 dní.</li>
        <li>Predajca zodpovedá za obsah inzerátu, fotky (musia byť jeho alebo ich smie použiť) a za vybavenie reklamácie.</li>
        <li>Predajca neposiela kupujúcim nevyžiadanú reklamu a kontakty kupujúcich (zo správ aj z dopytov na diely) používa len na ponuku a dohodu o danom diele.</li>
        <li>VIN darcovského auta, ktorý predajca zadá v portáli, je neverejný a predajca ho smie zadať len pre svoju evidenciu.</li>
        <li>Prístup k účtu chráni heslom a nezdieľa ho.</li>
      </ul>

      <h2>4. Nahlásenie obsahu a moderovanie</h2>
      <ul>
        <li>Ktokoľvek môže nahlásiť inzerát tlačidlom „Nahlásiť inzerát“ v detaile. Nahlásenie posúdime bez zbytočného odkladu, nestranne a starostlivo.</li>
        <li>Inzerát, ktorý porušuje zákon alebo tieto podmienky, môžeme skryť. Predajca v portáli uvidí, že inzerát skryl správca, a dôvod. Proti rozhodnutiu sa môže ohradiť e-mailom; jeho podnet znova posúdime.</li>
        <li>Pri opakovanom alebo závažnom porušení (podvod, kradnuté diely) môžeme účet zablokovať. Zablokovaný predajca nemôže zverejňovať inzeráty.</li>
        <li>Na ochranu pred robotmi obmedzujeme počet odkrytí telefónu, správ, dopytov a nahlásení z jedného pripojenia.</li>
      </ul>

      <h2>4a. Hodnotenie predajcov</h2>
      <ul>
        <li>Predajcu môže ohodnotiť len kupujúci, ktorému predajca poslal ponuku na jeho dopyt na diel. Hodnotenie sa pridáva zo súkromnej stránky dopytu a zobrazí sa s krstným menom kupujúceho.</li>
        <li>Hodnotenie musí byť pravdivé a vecné, bez urážok a osobných údajov. Hodnotenia vopred nekontrolujeme a nepredávame; poradie ani priemer neovplyvňuje platba.</li>
        <li>Hodnotenie, ktoré porušuje tieto pravidlá, môže správca skryť. Skryté hodnotenie sa nezapočíta do priemeru. Predajca nám môže nevhodné hodnotenie oznámiť e-mailom.</li>
      </ul>

      <h2>5. Poplatky</h2>
      <p>Registrácia, inzeráty aj zvýraznenie TOP (najviac 3 inzeráty naraz na 30 dní) sú počas skúšobnej prevádzky zadarmo. Ak zavedieme platené služby, oznámime to vopred a bez súhlasu predajcu nič nespoplatníme.</p>

      <h2>6. Zodpovednosť</h2>
      <p>Prevádzkovateľ nezodpovedá za obsah inzerátov, správnosť údajov od predajcov, kvalitu dielov ani za priebeh obchodu medzi predajcom a kupujúcim. Neposielajte zálohy neznámym predajcom. Portál sa snažíme prevádzkovať bez výpadkov, nezaručujeme však nepretržitú dostupnosť.</p>

      <h2>7. Zrušenie účtu</h2>
      <p>Predajca môže účet kedykoľvek zrušiť v portáli (Profil → Zrušiť účet). Zmažú sa jeho inzeráty, fotky, správy a osobné údaje podľa <a href="/ochrana-osobnych-udajov">zásad ochrany osobných údajov</a>.</p>

      <h2>8. Záverečné ustanovenia</h2>
      <ul>
        <li>Podmienky sa riadia právom Slovenskej republiky.</li>
        <li>Predajca, ktorý je spotrebiteľom, sa môže so sporom obrátiť aj na subjekt alternatívneho riešenia spotrebiteľských sporov, napríklad Slovenskú obchodnú inšpekciu.</li>
        <li>Zmenu podmienok oznámime predajcom e-mailom najmenej 15 dní vopred. Ak so zmenou nesúhlasia, môžu účet zrušiť.</li>
      </ul>
    </LegalPage>
  );
}
