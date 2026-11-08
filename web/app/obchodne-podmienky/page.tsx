import type { Metadata } from "next";
import { LegalPage, OperatorBox } from "@/components/Legal";
import { OPERATOR, fill } from "@/lib/operator";

export const metadata: Metadata = { title: "Obchodné podmienky", alternates: { canonical: "/obchodne-podmienky" } };

export default function Page() {
  return (
    <LegalPage title="Obchodné podmienky">
      <p>Tieto podmienky upravujú používanie inzertného portálu autosuciastky.eu. Prehliadanie inzerátov a kontaktovanie predajcov je bez registrácie a zadarmo. Predajca registráciou potvrdzuje, že s podmienkami súhlasí.</p>

      <h2>1. Prevádzkovateľ</h2>
      <OperatorBox />
      <p>Kontaktné miesto pre používateľov a orgány podľa nariadenia (EÚ) 2022/2065 o digitálnych službách: {OPERATOR.email || fill("")}, komunikujeme po slovensky.</p>

      <h2>2. Čo portál robí a čo nie</h2>
      <ul>
        <li>Portál zverejňuje inzeráty predajcov autodielov (vrátane pneumatík a diskov) na osobné autá, dodávky, nákladné autá, autobusy a motorky a inzeráty celých <b>havarovaných, nepojazdných alebo na diely určených vozidiel</b>. Sprostredkúva len kontakt medzi predajcom a kupujúcim.</li>
        <li>Prevádzkovateľ <b>nie je predávajúcim ani účastníkom</b> kúpnej zmluvy. Zmluva vzniká priamo medzi predajcom a kupujúcim, ktorí sa dohodnú na cene, platbe, odovzdaní aj reklamácii.</li>
        <li>Portál neprijíma platby a neposiela tovar.</li>
        <li>Inzeráty zverejňujeme len na tomto portáli. Neposielame ich na iné weby ani do partnerských programov; vyhľadávače (napr. Google) však verejné stránky portálu indexujú.</li>
        <li>So všetkými predajcami zaobchádzame rovnako. Prevádzkovateľ sám na portáli nepredáva a vlastné ponuky neuprednostňuje.</li>
        <li>Zoznam „Pasuje na“ skladáme z údajov predajcov (vlastné auto, „pasuje aj na“ a inzeráty s rovnakým OEM číslom). Nie je to overený katalóg. Aj pri rovnakom modeli auta sa diely líšia podľa motora, výbavy či roku – pred kúpou preto porovnajte <b>číslo dielu (OEM)</b> s pôvodným dielom.</li>
        <li>Katalóg značiek, modelov a motorizácií je pomôcka na hľadanie, zostavená bez licencovaných dát, a môže obsahovať chyby.</li>
      </ul>

      <h2>3. Podnikateľ alebo súkromná osoba – vyhlásenie predajcu</h2>
      <ul>
        <li>Pri registrácii a v profile predajca <b>vyhlási, či predáva ako podnikateľ (obchodník) alebo ako súkromná osoba</b>, ktorá nepredáva v rámci podnikania. Podľa tohto vyhlásenia portál kupujúcim zobrazí, kto predáva, a poučí ich o ich právach (§ 16 zákona č. 108/2024 Z. z. o ochrane spotrebiteľa).</li>
        <li><b>Podnikateľ</b> uvedie obchodné meno, IČO a sídlo alebo miesto podnikania. Tieto údaje sú verejné, aby kupujúci vedel, s kým uzatvára zmluvu. Bez nich podnikateľ nemôže zverejniť inzerát.</li>
        <li><b>Súkromná osoba</b> predáva len príležitostne, napríklad diely z vlastného auta. Kto predáva diely <b>sústavne a za účelom zisku</b> (napríklad skupuje autá na rozobratie), podniká a musí sa zaregistrovať ako podnikateľ. Nepravdivé vyhlásenie môže byť dôvodom na skrytie inzerátov alebo zablokovanie účtu.</li>
        <li>Prevádzkovateľ vyhlásenie predajcu neoveruje; za jeho pravdivosť zodpovedá predajca. Označenie „Overený predajca“ znamená, že prevádzkovateľ overil totožnosť predajcu.</li>
        <li>Predajcom môže byť len osoba, ktorá má aspoň 18 rokov, alebo právnická osoba konajúca cez oprávnenú osobu.</li>
      </ul>

      <h2>3a. Povinnosti predajcu</h2>
      <ul>
        <li>Predajca uvádza pravdivé údaje o sebe aj o diele vrátane známych vád a poškodení.</li>
        <li>Predáva len diely, ktoré vlastní alebo s ktorými smie nakladať. Zakázané sú kradnuté diely, diely s pozmeneným identifikačným číslom a veci, ktorých predaj zakazuje zákon.</li>
        <li><b>Podnikateľ predávajúci spotrebiteľovi</b> dodržiava predpisy na ochranu spotrebiteľa: zodpovedá za vady, ktoré sa prejavia do 24 mesiacov od prevzatia; pri použitom (aj repasovanom) diele sa so spotrebiteľom môže dohodnúť na kratšej dobe, najmenej 12 mesiacov (§ 619 Občianskeho zákonníka) – dohodnutú dobu uvedie v inzeráte aj na doklade. Pri predaji na diaľku má spotrebiteľ právo odstúpiť od zmluvy do 14 dní (§ 20 zákona č. 108/2024 Z. z.). Pri predaji inému podnikateľovi sa zodpovednosť za vady riadi Obchodným zákonníkom a dohodou strán.</li>
        <li><b>Súkromná osoba</b> zodpovedá za vady, na ktoré kupujúceho neupozornila (§ 597 a 599 Občianskeho zákonníka). Predpisy na ochranu spotrebiteľa sa na súkromný predaj nevzťahujú.</li>
        <li>Predajca zodpovedá za obsah inzerátu, fotky (musia byť jeho alebo ich smie použiť) a za vybavenie reklamácie.</li>
        <li>Autorské práva k fotkám a textom ostávajú predajcovi. Zverejnením inzerátu udeľuje prevádzkovateľovi bezplatný, nevýhradný súhlas ich zobrazovať na portáli, zmenšovať a upravovať ich formát (napr. náhľady) po dobu, kým je inzerát na portáli. Zmazaním inzerátu alebo účtu súhlas zaniká.</li>
        <li>Predajca neposiela kupujúcim nevyžiadanú reklamu a kontakty kupujúcich (zo správ aj z dopytov na diely) používa len na ponuku a dohodu o danom diele.</li>
        <li>VIN vozidla na diely alebo havarovaného vozidla, ktorý predajca zadá v portáli, je neverejný; portál ho kupujúcim nezobrazuje a predajca ho zadáva len pre svoju evidenciu.</li>
        <li>Pri pneumatikách a diskoch predajca uvádza rozmery a parametre (napr. šírka, profil, priemer, rozteč, ET) podľa skutočnosti a pri pneumatikách aj hĺbku dezénu a rok výroby (DOT), ak ich pozná.</li>
        <li>Prístup k účtu chráni heslom a nezdieľa ho.</li>
      </ul>

      <h2>3a1. Predaj celých vozidiel</h2>
      <ul>
        <li>Celé vozidlá sa na portáli predávajú len ako <b>havarované, nepojazdné, po požiari alebo povodni alebo určené na diely</b>. Bežné jazdené vozidlá sem nepatria a môžeme ich skryť.</li>
        <li>Predajca smie ponúkať len vozidlo, ktoré vlastní alebo ktoré smie predať. Zakázané sú kradnuté vozidlá, vozidlá s pozmeneným identifikačným číslom (VIN) a vozidlá, ktorých predaj zakazuje zákon. Kupujúcemu na požiadanie umožní porovnať VIN na vozidle s dokladmi.</li>
        <li>Predajca pravdivo uvedie stav, rozsah poškodenia, najazdené kilometre a doklady (prihlásené, odhlásené, bez dokladov). Vozidlo bez dokladov sa ponúka len na diely.</li>
        <li>Vozidlo, ktoré je odpadom (staré vozidlo), smie držiteľ odovzdať len osobe oprávnenej na spracovanie starých vozidiel podľa zákona č. 79/2015 Z. z. o odpadoch. Za dodržanie týchto pravidiel, prepis vozidla a ďalšie povinnosti voči úradom zodpovedajú predajca a kupujúci, nie prevádzkovateľ.</li>
      </ul>

      <h2>3b. Údaje predajcu a prístup k nim</h2>
      <ul>
        <li><b>Predajca vidí</b> svoje inzeráty, ich zobrazenia a počet odkrytí telefónu, správy a dopyty kupujúcich (meno a kontakt, ktoré kupujúci sám zadal) a hodnotenia. Kontakty kupujúcich smie použiť len na dohodu o danom diele.</li>
        <li><b>Prevádzkovateľ má prístup</b> ku všetkým údajom, ktoré predajcovia a kupujúci na portáli zadajú, a používa ich len na prevádzku portálu, ochranu pred zneužitím a plnenie zákonných povinností. Súhrnné štatistiky (napr. počet inzerátov) môže zverejniť len bez osobných údajov.</li>
        <li>Údaje predajcov ani kupujúcich <b>nepredávame a neposkytujeme tretím stranám</b> okrem technických sprostredkovateľov a orgánov podľa <a href="/ochrana-osobnych-udajov">zásad ochrany osobných údajov</a>.</li>
        <li>Predajca si môže svoje údaje kedykoľvek stiahnuť (Profil → Moje údaje). Po zrušení účtu sa údaje zmažú a prístup k nim už nie je možný.</li>
      </ul>

      <h2>3c. Poradie ponúk</h2>
      <p>Podľa čoho zoraďujeme inzeráty vo výsledkoch hľadania (vrátane zvýraznenia TOP), opisuje stránka <a href="/ako-zoradujeme">Ako zoraďujeme ponuky</a>.</p>

      <h2>4. Nahlásenie obsahu a moderovanie</h2>
      <ul>
        <li>Ktokoľvek môže nahlásiť inzerát tlačidlom „Nahlásiť inzerát“ v detaile. V nahlásení uvedie dôvod a vysvetlenie, nepovinne meno a e-mail, a potvrdí, že údaje uvádza v dobrej viere. Prijatie nahlásenia potvrdíme hneď na stránke. Nahlásenie posúdime bez zbytočného odkladu, nestranne a starostlivo; ak oznamovateľ zadal kontakt, oznámime mu rozhodnutie.</li>
        <li>O skrytí inzerátu alebo zablokovaní účtu <b>rozhoduje vždy človek</b> (správca portálu). Automaticky len obmedzujeme počet odkrytí telefónu, správ, dopytov a nahlásení z jedného pripojenia (ochrana pred robotmi); obsah inzerátov automaticky neposudzujeme.</li>
        <li>Inzerát, ktorý porušuje zákon alebo tieto podmienky, môžeme skryť. Predajca v portáli najneskôr pri skrytí uvidí, že inzerát skryl správca, a konkrétny dôvod. Proti rozhodnutiu sa môže ohradiť e-mailom na adrese prevádzkovateľa; jeho podnet bezplatne a znova posúdi človek. Predajca sa môže obrátiť aj na súd.</li>
        <li>Pri opakovanom alebo závažnom porušení (podvod, kradnuté diely) môžeme účet zablokovať; dôvod oznámime predajcovi e-mailom alebo v portáli. Zablokovaný predajca nemôže zverejňovať inzeráty.</li>
        <li>Ak zistíme informácie o trestnom čine, ktorý ohrozuje život alebo bezpečnosť osôb, oznámime to orgánom činným v trestnom konaní.</li>
      </ul>

      <h2>4a. Hodnotenie predajcov</h2>
      <ul>
        <li>Predajcu môže ohodnotiť len kupujúci, ktorému predajca poslal ponuku na jeho dopyt na diel. Hodnotenie sa pridáva zo súkromnej stránky dopytu a zobrazí sa s krstným menom kupujúceho.</li>
        <li>Hodnotenie musí byť pravdivé a vecné, bez urážok a osobných údajov. Hodnotenia vopred nekontrolujeme a nepredávame; poradie ani priemer neovplyvňuje platba.</li>
        <li>Hodnotenie, ktoré porušuje tieto pravidlá, môže správca skryť. Skryté hodnotenie sa nezapočíta do priemeru. Predajca nám môže nevhodné hodnotenie oznámiť e-mailom.</li>
      </ul>

      <h2>5. Poplatky</h2>
      <p>Registrácia, inzeráty aj zvýraznenie TOP (najviac 3 inzeráty naraz na 30 dní) sú počas skúšobnej prevádzky zadarmo. Ak zavedieme platené služby, oznámime to vopred a bez súhlasu predajcu nič nespoplatníme.</p>

      <h2 id="zodpovednost">6. Zodpovednosť – portál je len inzertný</h2>
      <ul>
        <li>autosuciastky.eu je <b>inzertný portál</b>. Prevádzkovateľ {OPERATOR.name} uchováva a zobrazuje inzeráty, ktoré pridávajú predajcovia (služba „hostingu“ podľa čl. 6 nariadenia (EÚ) 2022/2065). Diely ani vozidlá nepredáva, nekupuje, neskladuje, neoveruje ich stav ani pôvod a nie je stranou kúpnej zmluvy.</li>
        <li>Za obsah inzerátu, správnosť údajov (aj čísla dielu, zhody s vozidlom, parametrov, kilometrov a dokladov), za vady tovaru, <b>reklamácie</b>, vrátenie peňazí, odstúpenie od zmluvy a doručenie <b>zodpovedá predajca</b>. Reklamáciu a ďalšie nároky z kúpy uplatňuje kupujúci priamo u predajcu.</li>
        <li>Prevádzkovateľ preto nezodpovedá za chyby v inzerátoch, za kvalitu a vady dielov a vozidiel, za to, či diel pasuje na vozidlo kupujúceho, ani za priebeh a následky obchodu medzi predajcom a kupujúcim – v rozsahu, v akom to dovoľujú právne predpisy. Ak sa dozvie o nezákonnom inzeráte (napr. z nahlásenia), bez zbytočného odkladu ho posúdi a prípadne skryje.</li>
        <li>Neposielajte zálohy neznámym predajcom a diel alebo vozidlo si pred zaplatením pozrite. Portál sa snažíme prevádzkovať bez výpadkov, nezaručujeme však nepretržitú dostupnosť.</li>
      </ul>

      <h2>7. Zrušenie účtu</h2>
      <p>Predajca môže účet kedykoľvek zrušiť v portáli (Profil → Zrušiť účet). Zmažú sa jeho inzeráty, fotky, správy a osobné údaje podľa <a href="/ochrana-osobnych-udajov">zásad ochrany osobných údajov</a>. Pred zrušením si môže údaje stiahnuť (Profil → Moje údaje).</p>
      <p>Prevádzkovateľ môže zmluvu s predajcom vypovedať (zrušiť jeho účet) s odôvodnením a s výpovednou lehotou najmenej 30 dní. Bez výpovednej lehoty len vtedy, ak mu to ukladá zákon alebo rozhodnutie orgánu, alebo ak predajca opakovane porušuje tieto podmienky.</p>

      <h2>8. Záverečné ustanovenia</h2>
      <ul>
        <li>Podmienky sa riadia právom Slovenskej republiky.</li>
        <li>Predajca, ktorý je spotrebiteľom, sa môže so sporom obrátiť aj na subjekt alternatívneho riešenia spotrebiteľských sporov, napríklad Slovenskú obchodnú inšpekciu.</li>
        <li>Od 1. 7. 2027 nahrádza doterajší Občiansky zákonník nový Občiansky zákonník (zákon č. 260/2026 Z. z.). Odkazy na ustanovenia v týchto podmienkach sa potom vzťahujú na zodpovedajúce ustanovenia nového zákona.</li>
        <li>Zmenu podmienok oznámime predajcom e-mailom najmenej 15 dní vopred. Ak so zmenou nesúhlasia, môžu účet zrušiť. Zmeny nepôsobia spätne.</li>
        <li>Sťažnosti a podnety predajcov a kupujúcich vybavujeme bezplatne e-mailom na adrese prevádzkovateľa. Orgánom dozoru nad dodržiavaním predpisov o elektronickom obchode a ochrane spotrebiteľa je Slovenská obchodná inšpekcia; nad ochranou osobných údajov Úrad na ochranu osobných údajov SR.</li>
      </ul>
    </LegalPage>
  );
}
