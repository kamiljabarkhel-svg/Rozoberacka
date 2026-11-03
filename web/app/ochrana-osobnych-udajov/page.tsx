import type { Metadata } from "next";
import { LegalPage, OperatorBox } from "@/components/Legal";
import { OPERATOR, fill } from "@/lib/operator";

export const metadata: Metadata = { title: "Ochrana osobných údajov – Rozoberačka" };

export default function Page() {
  return (
    <LegalPage title="Ochrana osobných údajov">
      <p>Tu vysvetľujeme, aké osobné údaje spracúvame na portáli Rozoberačka, prečo, ako dlho a aké máte práva. Postupujeme podľa nariadenia (EÚ) 2016/679 (GDPR) a zákona č. 18/2018 Z. z. o ochrane osobných údajov.</p>

      <h2>1. Kto vaše údaje spracúva</h2>
      <OperatorBox />
      <p>Zodpovednú osobu sme neurčili, zákon nám to neukladá. So všetkými otázkami k osobným údajom nám píšte na {OPERATOR.email || fill("")}.</p>

      <h2>2. Aké údaje, prečo a na akom základe</h2>
      <table className="legal-t">
        <thead><tr><th>Koho sa týka</th><th>Údaje</th><th>Účel</th><th>Právny základ</th><th>Ako dlho</th></tr></thead>
        <tbody>
          <tr><td>Predajca</td><td>e-mail, heslo (uložené len ako nečitateľný odtlačok), názov alebo meno, typ (firma / súkromná osoba), mesto, telefón, IČO, čas súhlasu s podmienkami</td><td>účet predajcu a zverejňovanie inzerátov</td><td>zmluva (čl. 6 ods. 1 písm. b GDPR)</td><td>kým účet nezrušíte</td></tr>
          <tr><td>Predajca</td><td>inzeráty, fotky, telefón v inzeráte, počty zobrazení a odkrytí telefónu</td><td>zverejnenie inzerátu a štatistiky pre predajcu</td><td>zmluva</td><td>kým inzerát alebo účet nezmažete</td></tr>
          <tr><td>Kupujúci, ktorý píše predajcovi</td><td>meno, telefón alebo e-mail, text správy</td><td>doručenie správy predajcovi, ktorému píšete</td><td>vaša žiadosť o kontakt (čl. 6 ods. 1 písm. b) a náš oprávnený záujem na ochrane pred zneužitím (písm. f)</td><td>12 mesiacov, potom sa správa automaticky zmaže</td></tr>
          <tr><td>Ktokoľvek, kto nahlási inzerát</td><td>dôvod, text, nepovinne kontakt</td><td>preverenie nahlásenia</td><td>oprávnený záujem a povinnosti podľa nariadenia (EÚ) 2022/2065 o digitálnych službách (čl. 6 ods. 1 písm. c a f)</td><td>12 mesiacov po vybavení</td></tr>
          <tr><td>Každý návštevník</td><td>odtlačok IP adresy vytvorený tajným kľúčom, ktorý sa mení každý mesiac (samotnú IP adresu neukladáme)</td><td>ochrana pred robotmi a spamom, počítanie zobrazení bez duplicít</td><td>oprávnený záujem (čl. 6 ods. 1 písm. f)</td><td>3 dni; pri nahlásení 30 dní</td></tr>
          <tr><td>Každý návštevník</td><td>technické záznamy servera (IP adresa, čas, prehliadač) u poskytovateľov hostingu</td><td>prevádzka a bezpečnosť webu</td><td>oprávnený záujem</td><td>podľa podmienok poskytovateľa, spravidla dni až týždne</td></tr>
          <tr><td>Správca portálu</td><td>záznam o akciách správcu (skrytie inzerátu, overenie predajcu)</td><td>kontrola a preukázanie zásahov</td><td>oprávnený záujem a nariadenie o digitálnych službách</td><td>3 roky</td></tr>
        </tbody>
      </table>
      <p>Údaje predajcu, ktoré sú súčasťou inzerátu (názov alebo meno, typ, mesto a telefón v inzeráte), sú verejné. Telefón sa zobrazí až po kliknutí na „Zobraziť telefón“ a počet odkrytí z jedného pripojenia je obmedzený. Telefón a IČO z profilu nevidí nikto okrem predajcu a správcu portálu.</p>
      <p>Pri nahratí fotky web odstráni skryté údaje súboru vrátane polohy GPS.</p>
      <p>Kupujúci sa neregistruje. Obľúbené inzeráty sa ukladajú len vo vašom prehliadači a my ich nevidíme.</p>

      <h2>3. Komu údaje poskytujeme</h2>
      <ul>
        <li><b>Predajcovi</b>: meno, kontakt a text vašej správy dostane len predajca, ktorému píšete.</li>
        <li><b>Sprostredkovateľom</b>, ktorí pre nás zabezpečujú techniku na základe zmluvy o spracúvaní údajov: Supabase Inc. (databáza, prihlásenie a fotky; údaje sú uložené v dátovom centre vo Frankfurte, Nemecko), Vercel Inc. (zobrazovanie webu) a poskytovateľ odosielania e-mailov.</li>
        <li><b>Orgánom verejnej moci</b>, ak nám to ukladá zákon.</li>
      </ul>
      <p>Supabase a Vercel sú spoločnosti so sídlom v USA. Ak by pri ich službách došlo k prenosu údajov mimo EÚ, deje sa na základe štandardných zmluvných doložiek Európskej komisie, prípadne rámca EÚ – USA na ochranu údajov. Údaje nepredávame a nepoužívame na reklamu.</p>

      <h2>4. Vaše práva</h2>
      <ul>
        <li>prístup k údajom a ich prenosnosť – predajca si všetky údaje stiahne v portáli (Profil → Moje údaje),</li>
        <li>oprava nesprávnych údajov – v portáli alebo e-mailom,</li>
        <li>vymazanie – predajca zruší účet v portáli (Profil → Zrušiť účet); kupujúci nám napíše, ktorú správu máme zmazať,</li>
        <li>obmedzenie spracúvania a námietka proti spracúvaniu na základe oprávneného záujmu,</li>
        <li>podanie návrhu na začatie konania na Úrade na ochranu osobných údajov Slovenskej republiky, Hraničná 12, 820 07 Bratislava, <a href="https://dataprotection.gov.sk" rel="noreferrer">dataprotection.gov.sk</a>.</li>
      </ul>
      <p>Na žiadosť odpovieme bez zbytočného odkladu, najneskôr do jedného mesiaca. Automatizované rozhodovanie ani profilovanie s právnymi účinkami nevykonávame; obmedzenie počtu odkrytí telefónu z jedného pripojenia slúži len na ochranu pred robotmi a po hodine sa uvoľní.</p>

      <h2>5. Bezpečnosť</h2>
      <p>Prístup k údajom stráži databáza pravidlami pre každý riadok (predajca vidí len svoje údaje), komunikácia je šifrovaná (HTTPS), heslá sa ukladajú len ako odtlačok a zásahy správcu sa zaznamenávajú.</p>

      <h2>6. Cookies</h2>
      <p>Používame len nevyhnutné úložisko prehliadača. Podrobnosti sú na stránke <a href="/cookies">Cookies</a>.</p>
    </LegalPage>
  );
}
