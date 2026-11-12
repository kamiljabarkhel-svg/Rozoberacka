import type { Metadata } from "next";
import { LegalPage, OperatorBox } from "@/components/Legal";
import { OPERATOR, fill } from "@/lib/operator";
import { CARS_ENABLED } from "@/lib/features";

// Texty o Google Analytics sú pripravené vždy (lišta sa naň pýta); GA_ON = meranie naozaj beží (NEXT_PUBLIC_GA_ID).
const GA = true;
const GA_ON = /^G-[A-Z0-9]+$/.test((process.env.NEXT_PUBLIC_GA_ID || "").trim());
const NOT_YET = GA_ON ? "" : " Meranie zatiaľ nie je spustené – ak súhlasíte, začne sa až po jeho spustení; dovtedy sa kód Google nenačíta vôbec.";

export const metadata: Metadata = { title: "Ochrana osobných údajov", alternates: { canonical: "/ochrana-osobnych-udajov" } };

export default function Page() {
  return (
    <LegalPage title="Ochrana osobných údajov">
      <p>Tu vysvetľujeme, aké osobné údaje spracúvame na portáli autosuciastky.eu, prečo, ako dlho a aké máte práva. Postupujeme podľa nariadenia (EÚ) 2016/679 (GDPR) a zákona č. 18/2018 Z. z. o ochrane osobných údajov.</p>

      <h2 id="kontakt">1. Kto vaše údaje spracúva</h2>
      <OperatorBox />
      <p>Zodpovednú osobu sme neurčili, zákon nám to neukladá. So všetkými otázkami k osobným údajom nám píšte na {OPERATOR.email || fill("")}.</p>

      <h2>2. Aké údaje, prečo a na akom základe</h2>
      <table className="legal-t lt-gdpr">
        <thead><tr><th>Koho sa týka</th><th>Údaje</th><th>Účel</th><th>Právny základ</th><th>Ako dlho</th></tr></thead>
        <tbody>
          <tr><td>Predajca</td><td>e-mail, heslo (uložené len ako nečitateľný odtlačok), názov alebo meno, vyhlásenie o type predajcu (podnikateľ / súkromná osoba) a jeho čas, mesto, telefón, čas súhlasu s podmienkami</td><td>účet predajcu a zverejňovanie inzerátov</td><td>zmluva (čl. 6 ods. 1 písm. b GDPR)</td><td>kým účet nezrušíte</td></tr>
          <tr><td>Predajca – podnikateľ</td><td>obchodné meno, IČO, sídlo alebo miesto podnikania</td><td>zverejnenie totožnosti obchodníka kupujúcim a informácia, či predáva obchodník</td><td>zákonná povinnosť (čl. 6 ods. 1 písm. c GDPR; § 5 a § 16 zákona č. 108/2024 Z. z.)</td><td>kým účet nezrušíte; súkromná osoba tieto údaje nezadáva</td></tr>
          <tr><td>Predajca</td><td>inzeráty, fotky, telefón v inzeráte, počty zobrazení a odkrytí telefónu</td><td>zverejnenie inzerátu a štatistiky pre predajcu</td><td>zmluva</td><td>kým inzerát alebo účet nezmažete</td></tr>
          <tr><td>Kupujúci, ktorý píše predajcovi</td><td>meno, telefón alebo e-mail, text správy, odpovede v konverzácii s predajcom, odtlačok IP pri odpovedi</td><td>doručenie správy predajcovi; ak zadáte e-mail, doručenie odpovede predajcu e-mailom z adresy portálu s odkazom na konverzáciu (predajca váš e-mail v konverzácii nepotrebuje a vy nevidíte jeho); ochrana pred zneužitím</td><td>vaša žiadosť o kontakt (čl. 6 ods. 1 písm. b) a náš oprávnený záujem na ochrane pred zneužitím (písm. f)</td><td>12 mesiacov od poslednej správy v konverzácii; odtlačok IP 3 dni</td></tr>
          <tr><td>Kupujúci, ktorý zadá dopyt na diel</td><td>meno, telefón alebo e-mail, auto (značka, model, ročník, nepovinne VIN), hľadaný diel, poznámka, mesto, odtlačok IP</td><td>zobrazenie dopytu registrovaným predajcom, aby vám poslali ponuku; ochrana pred spamom</td><td>váš súhlas (čl. 6 ods. 1 písm. a GDPR), ktorý môžete kedykoľvek odvolať; ochrana pred zneužitím – oprávnený záujem (písm. f)</td><td>dopyt platí 30 dní, zmaže sa po 60 dňoch spolu s ponukami</td></tr>
          <tr><td>Predajca</td><td>autá na diely – vozidlá, ktoré rozoberá (značka, model, ročník, km, farba, VIN), ponuky na dopyty</td><td>evidencia dielov z jedného vozidla, ponuky kupujúcim</td><td>zmluva</td><td>kým ich predajca nezmaže alebo nezruší účet; VIN vidí len predajca</td></tr>
          {CARS_ENABLED && <tr><td>Predajca havarovaného vozidla</td><td>inzerát vozidla (značka, model, ročník, km, stav, poškodenie, doklady, STK, cena, mesto, fotky), telefón, nepovinne VIN</td><td>zverejnenie inzerátu vozidla; VIN len pre evidenciu predajcu</td><td>zmluva</td><td>kým inzerát alebo účet nezmažete; telefón sa zobrazí po kliknutí, VIN nikdy verejne</td></tr>}
          {CARS_ENABLED && <tr><td>Kupujúci, ktorý píše predajcovi vozidla</td><td>meno, telefón alebo e-mail, text správy</td><td>doručenie správy predajcovi</td><td>vaša žiadosť o kontakt a oprávnený záujem na ochrane pred zneužitím</td><td>12 mesiacov</td></tr>}
          <tr id="strazca"><td>Kupujúci, ktorý si zapne upozornenie e-mailom (strážca)</td><td>e-mail, uložené hľadanie (auto, diel, filtre), čas súhlasu a potvrdenia, odtlačok IP</td><td>raz denne poslať nové diely, ktoré zodpovedajú hľadaniu; ochrana pred zneužitím</td><td>váš súhlas (čl. 6 ods. 1 písm. a GDPR) potvrdený kliknutím na odkaz v e-maile; odvolať ho môžete odkazom v každom e-maile</td><td>nepotvrdené 3 dni, potvrdené do zrušenia, najviac 6 mesiacov; odtlačok IP 3 dni</td></tr>
          <tr><td>Kupujúci, ktorý ohodnotí predajcu</td><td>počet hviezdičiek, text, krstné meno z dopytu</td><td>zverejnenie hodnotenia na stránke predajcu, aby sa ostatní kupujúci vedeli rozhodnúť</td><td>váš súhlas (čl. 6 ods. 1 písm. a) – hodnotenie pridávate dobrovoľne</td><td>kým predajca nezruší účet alebo nás nepožiadate o zmazanie; správca môže nevhodné hodnotenie skryť</td></tr>
          <tr><td>Predajca</td><td>hodnotenia od kupujúcich a ich priemer</td><td>informácia pre kupujúcich na stránke predajcu</td><td>oprávnený záujem kupujúcich a prevádzkovateľa na dôveryhodnej inzercii (čl. 6 ods. 1 písm. f)</td><td>kým účet nezrušíte</td></tr>
          <tr><td>Ktokoľvek, kto nahlási inzerát</td><td>dôvod, text, nepovinne kontakt</td><td>preverenie nahlásenia</td><td>oprávnený záujem a povinnosti podľa nariadenia (EÚ) 2022/2065 o digitálnych službách (čl. 6 ods. 1 písm. c a f)</td><td>12 mesiacov po vybavení</td></tr>
          <tr><td>Každý návštevník</td><td>odtlačok IP adresy vytvorený tajným kľúčom, ktorý sa mení každý mesiac (samotnú IP adresu neukladáme)</td><td>ochrana pred robotmi a spamom, počítanie zobrazení bez duplicít</td><td>oprávnený záujem (čl. 6 ods. 1 písm. f)</td><td>3 dni; pri nahlásení 30 dní</td></tr>
          <tr><td>Každý návštevník</td><td>technické záznamy servera (IP adresa, čas, prehliadač) u poskytovateľov hostingu</td><td>prevádzka a bezpečnosť webu</td><td>oprávnený záujem</td><td>podľa podmienok poskytovateľa, spravidla dni až týždne</td></tr>
          <tr><td>Správca portálu</td><td>záznam o akciách správcu (skrytie inzerátu, overenie predajcu)</td><td>kontrola a preukázanie zásahov</td><td>oprávnený záujem a nariadenie o digitálnych službách</td><td>3 roky</td></tr>
        </tbody>
      </table>
      <p>Údaje predajcu, ktoré sú súčasťou inzerátu (názov alebo meno, či je podnikateľ alebo súkromná osoba, mesto a telefón v inzeráte), sú verejné a verejné stránky portálu indexujú aj vyhľadávače (napr. Google). Pri podnikateľovi sú verejné aj IČO a sídlo, lebo zákon vyžaduje, aby kupujúci vedel, s kým uzatvára zmluvu. Telefón sa zobrazí až po kliknutí na „Zobraziť telefón“, nie je v kóde stránky (vyhľadávače ho nevidia) a počet odkrytí z jedného pripojenia je obmedzený. E-mail predajcu ani telefón z profilu nevidí nikto okrem predajcu a správcu portálu.</p>
      <p><b>Musíte údaje poskytnúť?</b> Bez e-mailu a hesla nevytvoríte účet predajcu; bez mena, mesta a telefónu nezverejníte inzerát, lebo kupujúci by vás nemal ako kontaktovať (zmluvná požiadavka). IČO a sídlo podnikateľa vyžaduje zákon. Kupujúci nemusí poskytnúť nič – bez kontaktu však predajca nemôže odpovedať na správu alebo dopyt.</p>
      <p>Pri nahratí fotky web odstráni skryté údaje súboru vrátane polohy GPS.</p>
      <p>Kupujúci sa neregistruje. Obľúbené inzeráty, uložené hľadania a „Moje auto“ sa ukladajú len vo vašom prehliadači a my ich nevidíme.</p>
      <p>Pri odfotení OEM čísla alebo VIN sa text z fotky číta priamo vo vašom zariadení. Fotka sa nikam neposiela ani neukladá.</p>
      <p>Fotky v blogu pochádzajú z Unsplash, ale podávame ich z nášho servera – váš prehliadač sa pri ich zobrazení na Unsplash ani na iné cudzie servery nepripája. Písma tiež podávame sami.</p>

      <h2>3. Komu údaje poskytujeme</h2>
      <ul>
        <li><b>Predajcovi</b>: meno, kontakt a text vašej správy dostane len predajca, ktorému píšete.</li>
        <li><b>Registrovaným predajcom</b>: dopyt na diel vrátane mena a kontaktu vidia prihlásení predajcovia na portáli (nie verejnosť), aby vám mohli poslať ponuku.</li>
        <li><b>Kupujúcemu, ktorý zadal dopyt</b>: ponuku predajcu (názov predajcu, typ, mesto, cenu, telefón a poznámku) vidí len tento kupujúci na svojej neverejnej adrese dopytu.</li>
        <li><b>Sprostredkovateľom</b>, ktorí pre nás zabezpečujú techniku: Supabase Inc. (databáza, prihlásenie, fotky a zatiaľ aj odosielanie potvrdzovacích e-mailov; údaje sú uložené v dátovom centre vo Frankfurte, Nemecko; zmluva o spracúvaní údajov je súčasťou zmluvy so Supabase), poskytovateľ hostingu Vercel Inc. (zobrazovanie webu; stránky sa pripravujú na serveroch vo Frankfurte) a po zapojení aj Brevo (Sendinblue SAS, Francúzsko – odosielanie e-mailov – odpovedí v konverzáciách a upozornení strážcu).{GA && " So súhlasom návštevníka aj Google Ireland Ltd. (Google Analytics – meranie návštevnosti, časť 6)."}</li>
        <li><b>Orgánom verejnej moci</b>, ak nám to ukladá zákon.</li>
      </ul>
      <p>Supabase a Vercel sú spoločnosti so sídlom v USA. Ak by pri ich službách došlo k prenosu údajov mimo EÚ, deje sa na základe štandardných zmluvných doložiek Európskej komisie, prípadne rámca EÚ – USA na ochranu údajov. Údaje nepredávame a nepoužívame na reklamu.</p>

      <h2>4. Vaše práva</h2>
      <ul>
        <li>prístup k údajom a ich prenosnosť – predajca si všetky údaje stiahne v portáli (Profil → Moje údaje),</li>
        <li>oprava nesprávnych údajov – v portáli alebo e-mailom,</li>
        <li>vymazanie – predajca zruší účet v portáli (Profil → Zrušiť účet); kupujúci nám napíše, ktorú správu alebo dopyt máme zmazať (dopyt môžete aj sami uzavrieť na jeho stránke),</li>
        <li>odvolanie súhlasu s dopytom – napíšte nám a dopyt zmažeme; upozornenie e-mailom zrušíte odkazom v každom e-maile; hodnotenie vám na požiadanie zmažeme; odvolanie nemá vplyv na zákonnosť predchádzajúceho spracúvania,</li>
        <li>obmedzenie spracúvania a námietka proti spracúvaniu na základe oprávneného záujmu,</li>
        <li>podanie návrhu na začatie konania na Úrade na ochranu osobných údajov Slovenskej republiky, Hraničná 12, 820 07 Bratislava, <a href="https://dataprotection.gov.sk" rel="noreferrer">dataprotection.gov.sk</a>.</li>
      </ul>
      <p>Na žiadosť odpovieme bez zbytočného odkladu, najneskôr do jedného mesiaca. Automatizované rozhodovanie ani profilovanie s právnymi účinkami nevykonávame; obmedzenie počtu odkrytí telefónu z jedného pripojenia slúži len na ochranu pred robotmi a po hodine sa uvoľní.</p>

      <h2>5. Bezpečnosť</h2>
      <p>Prístup k údajom stráži databáza pravidlami pre každý riadok (predajca vidí len svoje údaje), komunikácia je šifrovaná (HTTPS), heslá sa ukladajú len ako odtlačok a zásahy správcu sa zaznamenávajú.</p>

      <h2>6. Cookies</h2>
      {GA && <p><b>Meranie návštevnosti (Google Analytics).</b> Ak v lište cookies súhlasíte, meriame návštevnosť nástrojom Google Analytics 4 od Google Ireland Ltd. (Gordon House, Barrow Street, Dublin 4, Írsko). Spracúvajú sa údaje o návšteve: navštívené stránky, odkiaľ ste prišli, približná poloha (krajina, mesto), typ zariadenia a prehliadača a identifikátor v cookies _ga. Účel: zistiť, ako sa web používa, a zlepšovať ho. Právny základ: váš súhlas (čl. 6 ods. 1 písm. a) GDPR a § 109 ods. 8 zákona č. 452/2021 Z. z.), ktorý môžete kedykoľvek odvolať v „Nastaveniach cookies“ v pätičke. Reklamné funkcie a Google signals máme vypnuté, údaje neprepájame s vaším menom ani účtom. Google je pre nás sprostredkovateľom; údaje môžu byť prenesené do USA na základe rámca EÚ – USA na ochranu údajov, ku ktorému je Google pripojený. Údaje v Google Analytics uchovávame 14 mesiacov.{NOT_YET}</p>}
      <p>Používame len nevyhnutné úložisko prehliadača, na ktoré nie je potrebný súhlas{GA ? ", a so súhlasom Google Analytics (pozri vyššie). Reklamné cookies nepoužívame." : ". Reklamné ani analytické cookies nepoužívame."} {GA ? "Google Analytics aj prípadné ďalšie voliteľné nástroje načítame až po vašom súhlase," : "Keby sme v budúcnosti pridali voliteľné nástroje (napríklad meranie návštevnosti), načítame ich až po vašom súhlase,"} ktorý môžete kedykoľvek odvolať v „Nastaveniach cookies“ v pätičke. Podrobnosti a zoznam všetkých údajov sú na stránke <a href="/cookies">Cookies</a>.</p>
    </LegalPage>
  );
}
