// Blog autosuciastky.eu – články pre kupujúcich a vodičov.
// Nový článok = nová položka v BLOG (najnovší hore). Pribudne na úvode (prvé tri), na /blog a v mape webu.
// Fotky: Unsplash (licencia Unsplash – použitie zadarmo, aj komerčne). Prehliadač ich nesťahuje z Unsplash, ale cez
// náš server (/_next/image), aby sa IP adresa návštevníka neposielala tretej strane (GDPR). Pri každej fotke uvádzame
// autora. Fotky z Unsplash+ (platené) NEPOUŽÍVAŤ.
import Link from "next/link";
import type { ReactNode } from "react";

export type BlogPhoto = { id: string; alt: string; author: string; authorUrl: string; pageUrl: string };
export type BlogFaq = { q: string; a: string };
/** title = nadpis H1 (môže byť dlhší); seoTitle = titulok pre Google, najviac ~40 znakov (doplní sa „ | autosuciastky.eu“);
 *  description 120 – 160 znakov; faq = krátke otázky a odpovede (zobrazia sa pod článkom a ako FAQPage pre vyhľadávače). */
export type BlogPost = { slug: string; title: string; seoTitle: string; short: string; description: string; date: string; updated?: string; readMin: number; tag: string; photo: BlogPhoto; body: ReactNode; faq?: BlogFaq[] };

export const blogPath = (slug: string) => `/blog/${slug}`;
/** Pôvodná fotka na Unsplash – len pre servery (náhľad pri zdieľaní, štruktúrované dáta), nie pre prehliadač návštevníka. */
export const photoRemote = (p: BlogPhoto, w = 1600) => `https://images.unsplash.com/photo-${p.id}?auto=format&fit=crop&w=${w}&q=75`;
const STATIC = process.env.NEXT_PUBLIC_STATIC_PREVIEW === "1";
/** Fotka v danej šírke cez náš server (Next.js ju stiahne, zmenší a uloží; šírky povolené v next.config.ts images.deviceSizes). */
export const photoUrl = (p: BlogPhoto, w: number) => STATIC ? photoRemote(p, w) : `/_next/image?url=${encodeURIComponent(photoRemote(p))}&w=${w}&q=75`;
export const photoSrcSet = (p: BlogPhoto, ws: number[]) => ws.map((w) => `${photoUrl(p, w)} ${w}w`).join(", ");

const fmtLink = (href: string, text: string) => <Link href={href}>{text}</Link>;

export const BLOG: BlogPost[] = [
  {
    slug: "oznacenie-pneumatiky-a-disku",
    title: "Ako čítať označenie pneumatiky a disku: 205/55 R16 91V, DOT, ET a rozteč",
    seoTitle: "Označenie pneumatiky a disku vysvetlené",
    short: "Označenie pneumatík a diskov",
    description: "Čo znamená 205/55 R16 91V, ako zistiť vek pneumatiky z DOT a čo je na disku 7J x 16 ET45 5x112. Návod, aby ste kúpili pneumatiky a disky, ktoré pasujú.",
    date: "2026-11-13",
    readMin: 6,
    tag: "Pneumatiky",
    photo: { id: "1643599630623-97e5adb8dcb7", alt: "Detail kolesa s pneumatikou a hliníkovým diskom", author: "Jakob Rosen", authorUrl: "https://unsplash.com/@jakobnoahrosen", pageUrl: "https://unsplash.com/photos/a-close-up-of-a-tire-on-a-car-zCNu2tzr5wM" },
    body: (
      <>
        <p className="lead">Na boku každej pneumatiky a na vnútornej strane disku je skupina čísel a písmen. Kto ich vie prečítať, kúpi aj použité pneumatiky a disky bez strachu, že nebudú pasovať. Vysvetlíme všetko na bežnom príklade <strong>205/55 R16 91V</strong>.</p>

        <h2>Rozmer pneumatiky: 205/55 R16</h2>
        <ul>
          <li><strong>205</strong> – šírka pneumatiky v milimetroch.</li>
          <li><strong>55</strong> – profil: výška boku je 55 % zo šírky (tu asi 113 mm). Čím nižšie číslo, tým nižší bok.</li>
          <li><strong>R</strong> – radiálna konštrukcia, dnes takmer všetky osobné pneumatiky.</li>
          <li><strong>16</strong> – priemer disku v palcoch, na ktorý pneumatika patrí.</li>
        </ul>
        <p>Pri hľadaní pneumatík stačí poznať tieto tri čísla – šírku, profil a priemer. Nájdete ich na starej pneumatike alebo v dokladoch od auta.</p>

        <h2>Index nosnosti a rýchlosti: 91V</h2>
        <p>Číslo udáva, akú hmotnosť unesie jedna pneumatika, písmeno najvyššiu povolenú rýchlosť. Najčastejšie hodnoty:</p>
        <ul>
          <li><strong>Nosnosť:</strong> 88 = 560 kg, 91 = 615 kg, 94 = 670 kg, 95 = 690 kg.</li>
          <li><strong>Rýchlosť:</strong> Q = 160 km/h, R = 170, S = 180, T = 190, H = 210, V = 240, W = 270, Y = 300 km/h.</li>
        </ul>
        <p>Indexy nesmú byť nižšie, než aké povoľujú doklady vášho auta. Pri zimných pneumatikách niektorí výrobcovia áut povoľujú nižší index rýchlosti – overte si to v dokladoch alebo v servise.</p>

        <h2>Vek pneumatiky: kód DOT</h2>
        <p>Na boku nájdete označenie DOT a za ním skupinu znakov. Posledné štyri číslice sú týždeň a rok výroby: <strong>3421</strong> znamená 34. týždeň roku 2021. Guma starne aj vtedy, keď pneumatika leží v sklade, preto sa pri použitých pneumatikách pozerajte nielen na dezén, ale aj na vek.</p>

        <h2>Ďalšie značky, ktoré sa oplatí poznať</h2>
        <ul>
          <li><strong>M+S</strong> – vhodná do blata a snehu; <strong>snehová vločka v horskom štíte</strong> (3PMSF) – pneumatika prešla skúškou na snehu. Viac v článku {fmtLink("/blog/zimne-pneumatiky-kedy-prezut", "Zimné pneumatiky: kedy prezuť")}.</li>
          <li><strong>XL</strong> alebo <strong>Reinforced</strong> – zosilnená pneumatika s vyššou nosnosťou.</li>
          <li><strong>RunFlat, RSC, SSR</strong> a podobné – pneumatika, s ktorou sa dá po defekte dôjsť do servisu. Auto na ne musí byť pripravené.</li>
          <li><strong>Šípka a nápis Rotation</strong> – smer otáčania; pneumatiku treba namontovať podľa šípky.</li>
        </ul>
        <p>Nové pneumatiky majú navyše energetický štítok EÚ s triedou valivého odporu, priľnavosti na mokrej vozovke a hlučnosti. Pri použitých pneumatikách ho zvyčajne nemáte, údaje však nájdete podľa presného názvu a rozmeru pneumatiky.</p>

        <h2>Označenie disku: 7J x 16 ET45, 5x112, 57,1</h2>
        <ul>
          <li><strong>7J</strong> – šírka disku v palcoch (7″); písmeno J označuje tvar okraja a pri osobných autách je bežné.</li>
          <li><strong>16</strong> – priemer disku v palcoch. Musí sedieť s pneumatikou (R16).</li>
          <li><strong>ET45</strong> – zális v milimetroch: ako hlboko je disk „zasunutý“. Pri väčšej odchýlke od pôvodného disku môže koleso drieť o podbeh alebo o tlmič.</li>
          <li><strong>5x112</strong> – rozteč: 5 skrutiek na kružnici s priemerom 112 mm. Musí presne sedieť s vaším autom.</li>
          <li><strong>57,1</strong> – stredový otvor v milimetroch. Ak je väčší ako náboj auta, pomôžu vymedzovacie krúžky.</li>
        </ul>
        <p>Pri diskoch z iného auta skontrolujte aj skrutky alebo matice: musia mať správny závit a tvar dosadacej plochy (kužeľ alebo guľa), inak koleso nebude bezpečne držať.</p>

        <h2>Čo smiete namontovať</h2>
        <p>Povolené rozmery pneumatík a diskov sú uvedené v dokladoch vozidla (osvedčenie o evidencii, prípadne doklad o zhode od výrobcu). Iný rozmer, než aký doklady povoľujú, môže znamenať problém na technickej kontrole a pri poistnej udalosti. Ak si nie ste istí, opýtajte sa v pneuservise.</p>

        <div className="blog-tip"><strong>Hľadáte pneumatiky alebo disky?</strong> V sekcii {fmtLink("/?kat=kol#pneu", "Pneumatiky a disky")} zadáte šírku, profil a priemer pneumatiky alebo rozteč a priemer disku a uvidíte ponuky, ktoré pasujú.</div>
        <p className="mute small">Hodnoty indexov sú podľa medzinárodných tabuliek pre osobné pneumatiky. Pravidlá technickej kontroly a povolené rozmery overte v dokladoch vozidla alebo v servise.</p>
      </>
    ),
    faq: [
      { q: "Čo znamená 205/55 R16?", a: "205 je šírka pneumatiky v milimetroch, 55 je výška boku v percentách zo šírky, R znamená radiálnu konštrukciu a 16 je priemer disku v palcoch." },
      { q: "Ako zistím vek pneumatiky?", a: "Pozrite sa na kód DOT na boku pneumatiky. Posledné štyri číslice sú týždeň a rok výroby, napríklad 3421 je 34. týždeň roku 2021." },
      { q: "Čo je ET na disku?", a: "ET je zális disku v milimetroch. Udáva, ako hlboko je disk zasunutý v podbehu. Mal by byť rovnaký alebo veľmi blízky pôvodnému disku." },
      { q: "Pasujú mi disky s roztečou 5x112?", a: "Len ak má vaše auto rovnakú rozteč – 5 skrutiek na kružnici s priemerom 112 mm. Skontrolujte aj priemer, šírku, zális a stredový otvor." },
    ],
  },
  {
    slug: "originalny-oem-alebo-neoriginalny-diel",
    title: "Originálny, OEM alebo neoriginálny diel: aký je rozdiel a čo sa oplatí kúpiť použité",
    seoTitle: "Originálny, OEM či neoriginálny diel?",
    short: "Originálny alebo neoriginálny diel",
    description: "Čím sa líši originálny diel, OEM diel od dodávateľa a neoriginálny diel. Ktoré diely sa oplatí kúpiť použité, ktoré radšej nové a prečo je dôležité číslo dielu.",
    date: "2026-11-13",
    readMin: 6,
    tag: "Autodiely",
    photo: { id: "1771340012319-0b4fca008b54", alt: "Mechanik pri oprave motora v dielni", author: "Dextar Studio", authorUrl: "https://unsplash.com/@dextarstudio", pageUrl: "https://unsplash.com/photos/mechanic-working-on-a-car-engine-in-a-workshop-XP8o9_Arwqg" },
    body: (
      <>
        <p className="lead">V servise aj v obchode počujete slová originál, OEM, náhradný či neoriginálny diel. Rozdiel je v tom, kto diel vyrobil a pre koho. Od toho sa odvíja cena, kvalita aj to, či vám diel bude pasovať.</p>

        <h2>Originálny diel</h2>
        <p>Diel, ktorý predáva výrobca auta pod svojou značkou – napríklad v krabici s logom Škoda alebo BMW. Vyrába ho zvyčajne dodávateľ, ale balí a predáva ho automobilka. Pasuje presne a má rovnakú kvalitu ako diel, ktorý bol v aute z výroby. Nevýhodou je cena: nový originál býva najdrahší.</p>

        <h2>OEM diel (diel od dodávateľa)</h2>
        <p>OEM (alebo OES) diel vyrába ten istý dodávateľ, ktorý dodáva diely do výroby áut – napríklad Bosch, Valeo, Hella či Continental. Predáva ho však pod vlastnou značkou, často aj s rovnakým číslom. Kvalitou zodpovedá originálu a býva lacnejší.</p>

        <h2>Neoriginálny diel</h2>
        <p>Diel od iného výrobcu, ktorý je vyrobený tak, aby nahradil originál. Kvalita sa veľmi líši – od kvalitných značiek až po lacné diely, ktoré nesedia alebo rýchlo odídu. Pri svetlách, zrkadlách a sklách hľadajte na diele homologizačnú značku „E“ v krúžku: bez nej diel nemusí prejsť technickou kontrolou.</p>

        <h2>Použitý originálny diel</h2>
        <p>Použitý diel z rozobratého auta je originál alebo OEM diel, ktorý bol v aute od výroby. Pri dieloch, ktoré sa neopotrebúvajú, ponúka najlepší pomer ceny a kvality: pasuje ako originál a stojí zlomok ceny nového. Pri starších autách je často jedinou dostupnou možnosťou.</p>

        <h2>Ktoré diely sa oplatí kúpiť použité</h2>
        <ul>
          <li><strong>Karoséria</strong> – dvere, kapota, blatníky, nárazníky, najlepšie v rovnakej farbe.</li>
          <li><strong>Svetlá a zrkadlá</strong> – nový svetlomet stojí často stovky eur.</li>
          <li><strong>Interiér</strong> – sedadlá, panely, volant, ovládače.</li>
          <li><strong>Elektrika</strong> – alternátor, štartér, motorčeky, riadiace jednotky. Pri riadiacich jednotkách počítajte s tým, že niektoré treba v servise prispôsobiť autu (kódovanie).</li>
          <li><strong>Veľké agregáty</strong> – motor, prevodovka, turbo. Pýtajte si najazdené kilometre auta, z ktorého pochádzajú, a informáciu, či boli odskúšané.</li>
        </ul>

        <h2>Ktoré diely kupujte radšej nové</h2>
        <ul>
          <li><strong>Diely, ktoré sa opotrebúvajú</strong> – brzdové doštičky a kotúče, filtre, rozvodový remeň, spojka, tlmiče.</li>
          <li><strong>Batéria a pneumatiky s vysokým vekom</strong> – časom strácajú vlastnosti aj bez používania.</li>
          <li><strong>Bezpečnostné prvky</strong> – pri airbagoch a bezpečnostných pásoch sa vždy poraďte so servisom.</li>
        </ul>

        <h2>Rozhoduje číslo dielu</h2>
        <p>Aj v rámci jedného modelu sa diely líšia podľa motorizácie, výbavy alebo roku výroby. Istotu dá len <strong>číslo dielu</strong> (OEM číslo) – nájdete ho na štítku starého dielu alebo vám ho povie servis podľa VIN. Ako ho nájsť, opisuje návod {fmtLink("/navody/oem-cislo", "Kde nájdem číslo dielu (OEM)")}.</p>

        <h2>A čo záruka na auto?</h2>
        <p>Podľa pravidiel EÚ pre predaj a servis áut vám výrobca nemôže odmietnuť záruku len preto, že ste bežný servis robili v nezávislom servise alebo s dielmi zodpovedajúcej kvality. Opravy, ktoré platí výrobca v rámci záruky, však robí autorizovaný servis. Ak máte auto v záruke, pred väčšou opravou sa poraďte so servisom.</p>

        <div className="blog-tip"><strong>Máte číslo dielu?</strong> Zadajte ho do poľa „Mám číslo dielu“ na {fmtLink("/", "úvodnej stránke")}. Nájdete tak aj rovnaký diel z iného modelu, ak ho predajca uviedol.</div>
        <p className="mute small">Článok je všeobecná informácia, nie právne ani technické poradenstvo. Pri dieloch dôležitých pre bezpečnosť sa poraďte s odborným servisom.</p>
      </>
    ),
    faq: [
      { q: "Aký je rozdiel medzi originálnym a OEM dielom?", a: "Originálny diel predáva výrobca auta pod svojou značkou. OEM diel vyrába ten istý dodávateľ, ktorý dodáva diely do výroby, ale predáva ho pod vlastnou značkou a zvyčajne lacnejšie." },
      { q: "Oplatí sa kúpiť použitý diel?", a: "Pri dieloch, ktoré sa neopotrebúvajú – karoséria, svetlá, interiér, elektrika – áno. Brzdy, filtre, rozvody a spojku kupujte radšej nové." },
      { q: "Ako zistím, či mi diel pasuje?", a: "Porovnajte číslo dielu (OEM číslo) zo starého dielu alebo z dokladov od servisu s číslom v inzeráte. Samotný model auta nestačí." },
    ],
  },
  {
    slug: "ako-predat-pouzite-autodiely",
    title: "Ako predať použité autodiely rýchlo: 10 tipov na inzerát, ktorý predáva",
    seoTitle: "Ako predať použité autodiely rýchlo",
    short: "Ako predať použité autodiely",
    description: "Ako napísať inzerát na použitý autodiel, aby sa predal: číslo dielu, fotky, úprimný stav, správna cena a rýchla odpoveď. Tipy pre firmy aj súkromných predajcov.",
    date: "2026-11-13",
    readMin: 6,
    tag: "Pre predajcov",
    photo: { id: "1767340078222-98633f3ffd27", alt: "Kopa použitých dielov motora na trhu", author: "Zoshua Colah", authorUrl: "https://unsplash.com/@zoshuacolah", pageUrl: "https://unsplash.com/photos/a-pile-of-old-car-engines-and-parts-FYGMJfE4yyY" },
    body: (
      <>
        <p className="lead">Kupujúci použitého dielu sa rozhoduje rýchlo: potrebuje vedieť, či mu diel pasuje, v akom je stave a koľko stojí. Inzerát, ktorý na tieto otázky odpovie hneď, sa predá skôr a s menej telefonátmi.</p>

        <h2>1. Uveďte číslo dielu</h2>
        <p>Číslo dielu (OEM číslo) je pre kupujúceho najdôležitejší údaj. Podľa neho hľadá a podľa neho si overí, že diel pasuje. Nájdete ho na štítku alebo vyrazené priamo na diele. Na autosuciastky.eu sa diel s číslom zobrazí aj ľuďom, ktorí hľadajú rovnaké číslo pri inom modeli.</p>

        <h2>2. Fotky za denného svetla</h2>
        <ul>
          <li>Diel celý zo všetkých strán, na jednoduchom pozadí.</li>
          <li>Detail štítku s číslom dielu.</li>
          <li>Konektory, úchyty a akékoľvek poškodenie – škrabance, prasklinu, chýbajúci úchyt.</li>
        </ul>
        <p>Inzerát s fotkami poškodení pôsobí dôveryhodnejšie a ušetrí vám neskoršie spory.</p>

        <h2>3. Názov, ktorý ľudia hľadajú</h2>
        <p>Dobrý názov obsahuje diel, auto a stranu: „Ľavý predný svetlomet Škoda Octavia III“. Nepíšte len „svetlo“ ani skratky, ktoré pozná iba dielňa.</p>

        <h2>4. Úprimný stav</h2>
        <p>Vyberte stav, ktorý zodpovedá skutočnosti, a v popise napíšte, čo dielu chýba alebo čo je opravené. Kupujúci, ktorého neprekvapí stav dielu, nevracia tovar a píše dobré hodnotenia.</p>

        <h2>5. Odskúšaný diel a kilometre</h2>
        <p>Pri motoroch, prevodovkách, turbách či alternátoroch pomáha informácia, že diel bol odskúšaný, a koľko kilometrov malo auto, z ktorého pochádza. Na portáli na to máte samostatné polia.</p>

        <h2>6. Cena podľa trhu</h2>
        <p>Pozrite si ceny rovnakého dielu u iných predajcov a cenu nového dielu. Použitý diel sa zvyčajne predáva za zlomok ceny nového – podľa stavu, záujmu a toho, či je dostupný aj nový.</p>

        <h2>7. Popis, ktorý odpovie na otázky</h2>
        <p>Napíšte, z akého auta diel je (motorizácia, rok, prevodovka), čo všetko dostane kupujúci (napríklad svetlo s riadiacou jednotkou alebo bez) a na čo si dať pozor pri montáži.</p>

        <h2>8. Záruka a vrátenie</h2>
        <p>Ak predávate ako podnikateľ, máte voči spotrebiteľom zákonné povinnosti – zodpovednosť za vady a pri predaji na diaľku aj právo kupujúceho odstúpiť od zmluvy do 14 dní. Súkromná osoba môže predávať aj bez záruky, musí však upozorniť na známe vady. Prehľad nájdete v {fmtLink("/obchodne-podmienky", "obchodných podmienkach")}. Kto predáva pravidelne a za účelom zisku, podniká a potrebuje živnosť.</p>

        <h2>9. Odovzdanie a doprava</h2>
        <p>Uveďte, či diel pošlete kuriérom, kde si ho dá vyzdvihnúť a či ho viete zabaliť. Pri veľkých dieloch (motor, kapota) napíšte, ako sa dá preprava dohodnúť.</p>

        <h2>10. Odpovedajte rýchlo</h2>
        <p>Kto hľadá diel, často píše viacerým predajcom naraz. Predá ten, kto odpovie prvý. Správy od kupujúcich vidíte v portáli predajcu v časti Správy a dopyty na diely v časti Dopyty.</p>

        <h2>Ako ušetriť čas pri veľa dieloch</h2>
        <ul>
          <li><strong>Hromadne z fotiek</strong> – nahráte všetky fotky naraz a z označených fotiek vytvoríte inzeráty.</li>
          <li><strong>Z auta na diely</strong> – zapíšete rozoberané auto raz a pridáte z neho veľa dielov naraz.</li>
          <li><strong>Import z CSV</strong> – ak máte sklad v tabuľke, nahráte ho jedným súborom.</li>
        </ul>

        <div className="blog-tip"><strong>Predávate použité autodiely?</strong> Inzeráty na autosuciastky.eu sú zadarmo a bez provízie. {fmtLink("/pre-predajcov?registracia=1", "Vytvorte si účet predajcu")} a pridajte prvý diel za pár minút.</div>
        <p className="mute small">Článok je všeobecná rada, nie právne poradenstvo. Povinnosti predajcu závisia od toho, či predávate ako podnikateľ alebo súkromná osoba.</p>
      </>
    ),
    faq: [
      { q: "Čo musí obsahovať inzerát na použitý autodiel?", a: "Číslo dielu, názov s autom a stranou, fotky vrátane štítku a poškodení, úprimný stav, cenu a spôsob odovzdania." },
      { q: "Koľko stojí inzerát na autosuciastky.eu?", a: "Pridanie inzerátov je zadarmo a bez provízie z predaja. Kupujúci vás kontaktuje priamo telefonicky alebo správou." },
      { q: "Musím dávať záruku na použitý diel?", a: "Podnikateľ má voči spotrebiteľom zákonnú zodpovednosť za vady. Súkromná osoba môže predávať bez záruky, musí však upozorniť na vady, o ktorých vie." },
    ],
  },
  {
    slug: "ako-kupit-ojazdene-auto",
    title: "Ako kúpiť ojazdené auto a nenaletieť: 9 krokov pred podpisom",
    seoTitle: "Ako kúpiť ojazdené auto: 9 krokov",
    short: "Ako kúpiť ojazdené auto",
    description: "Na čo sa pozrieť v inzeráte, čo overiť podľa VIN, ako prebehnúť obhliadku a skúšobnú jazdu a čo musí byť v kúpnej zmluve. Praktický postup pre Slovensko.",
    date: "2026-11-12",
    readMin: 7,
    tag: "Kúpa auta",
    photo: { id: "1701518367658-fe45bf7dfe32", alt: "Predajňa ojazdených áut s cenovkou za oknom", author: "Chelaxy Designs", authorUrl: "https://unsplash.com/@chelaxydp", pageUrl: "https://unsplash.com/photos/a-car-dealership-with-a-sales-sign-in-the-window-9rdfLAZXW2E" },
    body: (
      <>
        <p className="lead">Ojazdené auto je najväčší nákup, aký väčšina z nás urobí po bývaní. Pár hodín príprav a malý poplatok za preverenie vás môže ušetriť tisíce eur. Tu je postup, ktorý funguje pri kúpe od autobazáru aj od súkromnej osoby.</p>

        <h2>1. Čítajte inzerát pozorne – aj to, čo v ňom chýba</h2>
        <p>Dobrý inzerát má VIN alebo ho predajca bez problémov pošle, uvádza najazdené kilometre, počet majiteľov, platnosť technickej kontroly a fotky zo všetkých strán vrátane interiéru a motora. Podozrivo nízka cena, fotky len z jednej strany alebo „VIN pošlem až na obhliadke“ sú dôvod spozornieť.</p>

        <h2>2. Pýtajte si VIN a nechajte auto preveriť</h2>
        <p>VIN je 17-miestne číslo z osvedčenia o evidencii (technického preukazu). Podľa neho zistíte históriu auta. Na Slovensku je dostupný napríklad <strong>ODO-Pass a jeho príloha</strong> z Registra prevádzkových záznamov vozidiel (RPZV): ukáže záznamy kilometrov z kontrol, platnosť technickej a emisnej kontroly, či vozidlo nie je v pátraní a údaje o leasingu či záložnom práve. Aktuálne možnosti a cenu overíte na stránke rpzv.sk. Pri dovezených autách pomôžu aj komerčné služby histórie vozidla.</p>
        <p>Ako VIN prečítať a čo z neho vyčítate hneď, opisuje náš návod {fmtLink("/navody/vin", "Kde nájdem VIN a čo z neho zistím")}.</p>

        <h2>3. Porovnajte kilometre s tým, čo vidíte</h2>
        <p>Stočený tachometer je stále bežný podvod. Kilometre porovnajte so záznamami z kontrol a so servisnou knižkou. Opotrebovaný volant, radiaca páka a sedadlo vodiča pri „90 000 km“ k sebe nesedia.</p>

        <h2>4. Obhliadka za denného svetla</h2>
        <ul>
          <li><strong>Karoséria:</strong> rozdielne odtiene laku, nerovnomerné medzery medzi dielmi a stopy po striekaní na gumách naznačujú opravu po nehode. Ak môžete, požičajte si merač hrúbky laku.</li>
          <li><strong>Podvozok a hrdza:</strong> prahy, podbehy, spodok dverí a okolie výfuku.</li>
          <li><strong>Pneumatiky:</strong> nerovnomerne zjazdený dezén môže znamenať zlú geometriu alebo poškodené zavesenie.</li>
          <li><strong>Motorový priestor:</strong> úniky oleja a chladiacej kvapaliny, stav oleja na mierke, „umytý“ motor tesne pred predajom.</li>
        </ul>

        <h2>5. Štartujte studený motor</h2>
        <p>Dohodnite sa, že motor pred vaším príchodom nebude bežať. Pri studenom štarte sa najlepšie ukážu problémy so štartovaním, hlučné rozvody či modrý alebo hustý biely dym z výfuku.</p>

        <h2>6. Skúšobná jazda aspoň 20 minút</h2>
        <p>Vyskúšajte mesto aj rýchlejšiu cestu. Sledujte, či auto pri brzdení neťahá do strany, či prevodovka radí plynulo, či z podvozku nie je počuť klepanie a či na prístrojovej doske nesvietia kontrolky.</p>

        <h2>7. Nechajte auto pozrieť nezávislému mechanikovi</h2>
        <p>Diagnostika chybových kódov a pohľad zospodu na zdviháku stoja zlomok ceny auta. Ak predajca obhliadku v servise odmieta, je to signál, že niečo nie je v poriadku. Pri kúpe je dobré zvážiť aj kontrolu originality, ktorá overí identifikačné čísla vozidla.</p>

        <h2>8. Skontrolujte doklady a predajcu</h2>
        <p>Meno v osvedčení o evidencii musí sedieť s občianskym preukazom predávajúceho (alebo musí mať splnomocnenie). Porovnajte VIN v dokladoch s VIN na aute. Pýtajte si servisnú knižku a faktúry za opravy.</p>

        <h2>9. Kúpna zmluva a prepis</h2>
        <p>V písomnej kúpnej zmluve majú byť údaje oboch strán, VIN, evidenčné číslo, stav tachometra, cena, dátum a čas odovzdania a známe vady. Prepis na nového majiteľa podáva <strong>pôvodný vlastník do 30 dní</strong> na ktoromkoľvek dopravnom inšpektoráte alebo elektronicky (s kvalifikovaným elektronickým podpisom). Ak kupujúci nejde na inšpektorát osobne, dodá splnomocnenie alebo doklad o nadobudnutí s úradne osvedčeným podpisom. Aktuálny postup a poplatky nájdete na slovensko.sk.</p>

        <div className="blog-tip"><strong>Tip na záver:</strong> po kúpe sa oplatí vymeniť olej, filtre a skontrolovať rozvody, ak nie je doložená ich výmena. Na údržbu staršieho auta sa výborne hodia použité originálne diely – hľadajte podľa čísla dielu na {fmtLink("/", "autosuciastky.eu")}.</div>
        <p className="mute small">Článok je všeobecná rada, nie právne poradenstvo. Pravidlá prepisu a poplatky sa môžu meniť – overte si ich na slovensko.sk alebo na dopravnom inšpektoráte.</p>
      </>
    ),
    faq: [
      { q: "Ako overím históriu ojazdeného auta?", a: "Vypýtajte si VIN a overte ho napríklad cez ODO-Pass z Registra prevádzkových záznamov vozidiel (rpzv.sk) alebo cez komerčné služby histórie vozidla." },
      { q: "Kto podáva prepis auta?", a: "Prepis na nového vlastníka podáva pôvodný vlastník do 30 dní na dopravnom inšpektoráte alebo elektronicky. Aktuálny postup nájdete na slovensko.sk." },
      { q: "Čo má byť v kúpnej zmluve na auto?", a: "Údaje oboch strán, VIN, evidenčné číslo, stav tachometra, cena, dátum a čas odovzdania a známe vady vozidla." },
    ],
  },
  {
    slug: "autobateria-v-zime",
    title: "Autobatéria v zime: ako spoznať, že dosluhuje, a ako vybrať novú",
    seoTitle: "Autobatéria v zime: kontrola a výber",
    short: "Autobatéria v zime",
    description: "Prečo batéria v mraze slabne, ako ju jednoducho zmerať, kedy ju vymeniť a na čo sa pozrieť pri kúpe novej – kapacita, štartovací prúd, rozmery a autá so štart-stop.",
    date: "2026-11-10",
    readMin: 5,
    tag: "Údržba",
    photo: { id: "1738123748481-5953edf462bb", alt: "Otvorený motorový priestor červeného auta", author: "Vasanth Rajasekaran", authorUrl: "https://unsplash.com/@vasanthr", pageUrl: "https://unsplash.com/photos/the-engine-compartment-of-a-red-car-with-its-hood-open-pm-r7o2F-VM" },
    body: (
      <>
        <p className="lead">Batéria najčastejšie vypovie službu v prvé mrazivé ráno. Nie je to náhoda: chlad spomaľuje chemické reakcie v batérii a studený motor zároveň potrebuje na naštartovanie viac energie. Ak viete, na čo sa pozrieť, výmenu si naplánujete skôr, ako vás auto nechá stáť.</p>

        <h2>Príznaky, že batéria dosluhuje</h2>
        <ul>
          <li>Motor sa pri štarte točí pomaly a „ťažko“, najmä ráno.</li>
          <li>Pri štartovaní bliká alebo slabne osvetlenie prístrojov.</li>
          <li>Systém štart-stop prestáva vypínať motor na semaforoch.</li>
          <li>Auto po pár dňoch státia neštartuje vôbec.</li>
          <li>Batéria je staršia ako 4 až 6 rokov – to je bežná životnosť.</li>
        </ul>

        <h2>Ako batériu jednoducho zmerať</h2>
        <p>Stačí lacný multimeter. Merajte, keď auto aspoň niekoľko hodín stálo a nič nebolo zapnuté. Orientačne platí:</p>
        <ul>
          <li><strong>12,6 V a viac</strong> – batéria je nabitá,</li>
          <li><strong>okolo 12,4 V</strong> – nabitá zhruba na tri štvrtiny,</li>
          <li><strong>12,2 V a menej</strong> – je vybitá aspoň do polovice, treba ju dobiť a sledovať,</li>
          <li><strong>pod 12 V</strong> – batéria je vybitá; ak sa to opakuje aj po nabití, blíži sa koniec.</li>
        </ul>
        <p>Napätie však neprezradí všetko. Spoľahlivý je test v servise alebo v predajni batérií, ktorý zmeria, koľko prúdu batéria dokáže dodať pri záťaži.</p>

        <h2>Ako predĺžiť jej život</h2>
        <ul>
          <li>Ak jazdíte len krátke trasy, batériu raz za čas dobite nabíjačkou – alternátor ju za pár minút jazdy nestihne nabiť.</li>
          <li>Pri dlhšom státí ju udržiavajte inteligentnou nabíjačkou.</li>
          <li>Udržujte póly čisté a pevne dotiahnuté.</li>
          <li>Pred štartom v mraze vypnite svetlá, kúrenie a ďalšie spotrebiče.</li>
        </ul>

        <h2>Ako vybrať novú batériu</h2>
        <ul>
          <li><strong>Kapacita (Ah) a štartovací prúd (A, EN)</strong> – mali by byť aspoň také ako pri pôvodnej batérii. Údaje nájdete na štítku starej batérie.</li>
          <li><strong>Rozmery a umiestnenie pólov</strong> – batéria musí sedieť v držiaku a plus pól musí byť na rovnakej strane.</li>
          <li><strong>Autá so štart-stop</strong> potrebujú batériu typu EFB alebo AGM podľa toho, akú malo auto z výroby. Obyčajná batéria v takom aute rýchlo odíde.</li>
          <li><strong>Registrácia batérie</strong> – niektoré novšie autá treba po výmene „naučiť“ novú batériu diagnostikou, inak ju systém nabíja nesprávne.</li>
        </ul>

        <h2>Nová alebo použitá?</h2>
        <p>Batéria je spotrebný diel, ktorý časom stráca kapacitu, preto sa pri nej oplatí kúpiť novú. Pri ostatných dieloch elektroinštalácie – alternátor, štartér, riadiace jednotky – však často dobre poslúži aj použitý originálny diel. Hľadajte podľa čísla dielu, aby ste mali istotu, že pasuje.</p>

        <div className="blog-tip"><strong>Hľadáte alternátor alebo štartér?</strong> Zadajte číslo dielu do poľa „Mám číslo dielu“ na {fmtLink("/", "úvodnej stránke")} alebo napíšte {fmtLink("/dopyt", "dopyt na diel")} – predajcovia vám pošlú ponuky.</div>
        <p className="mute small">Staré batérie nepatria do bežného odpadu – odovzdajte ich v predajni batérií alebo na zbernom dvore.</p>
      </>
    ),
    faq: [
      { q: "Aké napätie má mať nabitá autobatéria?", a: "Nabitá batéria má po niekoľkých hodinách státia približne 12,6 V alebo viac. Pod 12,2 V je vybitá aspoň do polovice." },
      { q: "Ako dlho vydrží autobatéria?", a: "Bežne 4 až 6 rokov. Krátke jazdy, mráz a dlhé státie životnosť skracujú." },
      { q: "Akú batériu potrebuje auto so štart-stop?", a: "Typ EFB alebo AGM podľa toho, akú malo auto z výroby. Obyčajná batéria v takom aute rýchlo odíde." },
    ],
  },
  {
    slug: "zimne-pneumatiky-kedy-prezut",
    title: "Zimné pneumatiky: kedy prezuť a ako vybrať aj použité",
    seoTitle: "Zimné pneumatiky: kedy prezuť",
    short: "Zimné pneumatiky",
    description: "Kedy sú zimné pneumatiky na Slovensku povinné, aká musí byť hĺbka dezénu, čo znamenajú značky M+S a snehová vločka a ako skontrolovať použité pneumatiky pred kúpou.",
    date: "2026-11-06",
    readMin: 5,
    tag: "Pneumatiky",
    photo: { id: "1708805283017-c662be2c7a44", alt: "Detail pneumatiky auta na mokrej ceste", author: "Zac Nielson", authorUrl: "https://unsplash.com/@zacherynielson", pageUrl: "https://unsplash.com/photos/a-close-up-of-a-car-tire-on-a-wet-surface-m5g2IFRouCs" },
    body: (
      <>
        <p className="lead">Prvé ráno s námrazou príde každý rok skôr, ako čakáme. Čo hovorí zákon, kedy je ten správny čas na prezutie a ako kúpiť použité zimné pneumatiky, ktoré vám vydržia?</p>

        <h2>Kedy sú zimné pneumatiky povinné</h2>
        <p>Na Slovensku pre osobné autá neplatí pevný dátum. Zimné pneumatiky sú povinné vtedy, keď je na vozovke <strong>súvislá vrstva snehu, ľadu alebo námrazy</strong>. Pri nákladných vozidlách nad 3,5 t musí mať aspoň jedna hnacia náprava zimné pneumatiky od 15. novembra do 31. marca.</p>
        <p>Prakticky: vyhovujúce pneumatiky musíte mať vtedy, keď sa podmienky zmenia – aj keď ráno vyrazíte po suchej ceste. Preto sa odporúča prezuť, keď teploty, najmä nočné, klesajú pod približne 7 °C.</p>

        <h2>Minimálna hĺbka dezénu</h2>
        <p>Zimná pneumatika musí mať dezén hlboký <strong>najmenej 3 mm</strong>. Nová pneumatika má zvyčajne 8 až 9 mm. Hĺbku zmeriate lacným hĺbkomerom alebo podľa indikátorov opotrebenia v drážkach.</p>

        <h2>M+S alebo snehová vločka?</h2>
        <p>Zákon zatiaľ uznáva pneumatiky označené M+S aj pneumatiky so symbolom snehovej vločky v horskom štíte (3PMSF). Značka M+S sama osebe znamená len vhodnosť do blata a snehu – vločka v štíte potvrdzuje, že pneumatika prešla skúškou na snehu. Pri kúpe preto uprednostnite pneumatiky so symbolom vločky.</p>

        <h2>Ako skontrolovať použité pneumatiky</h2>
        <ul>
          <li><strong>Vek (DOT):</strong> na boku je štvormiestny kód, napríklad 3421 = 34. týždeň roku 2021. Guma časom tvrdne aj bez jazdenia, preto sa pri starších pneumatikách oplatí byť opatrný. Celé označenie pneumatiky vysvetľuje článok {fmtLink("/blog/oznacenie-pneumatiky-a-disku", "Ako čítať označenie pneumatiky a disku")}.</li>
          <li><strong>Dezén:</strong> zmerajte ho na viacerých miestach. Nerovnomerné zjazdenie naznačuje zlú geometriu auta, z ktorého pochádzajú.</li>
          <li><strong>Bok pneumatiky:</strong> hľadajte praskliny, vydutiny a rezy. Vydutina znamená poškodenú kostru – takú pneumatiku nekupujte.</li>
          <li><strong>Rovnaké kusy:</strong> na jednej náprave majú byť rovnaké pneumatiky, ideálne na celom aute.</li>
          <li><strong>Rozmer a indexy:</strong> napríklad 205/55 R16 91T – rozmer musí byť povolený pre vaše auto a index rýchlosti a nosnosti zodpovedať technickému preukazu.</li>
        </ul>

        <h2>Kolesá s diskami ušetria čas</h2>
        <p>Ak kúpite kompletné kolesá (pneumatiky na diskoch), prezúvanie je rýchlejšie a lacnejšie. Pri diskoch skontrolujte rozteč skrutiek, priemer, šírku a zális (ET) – musia sedieť s vaším autom.</p>

        <div className="blog-tip"><strong>Hľadáte zimné pneumatiky alebo disky?</strong> V sekcii {fmtLink("/?kat=kol#pneu", "Pneumatiky a disky")} hľadáte podľa rozmeru – stačí zadať šírku, profil a priemer.</div>
        <p className="mute small">Informácie platia k novembru 2026. Pravidlá v zahraničí sa líšia – pred cestou si ich overte.</p>
      </>
    ),
    faq: [
      { q: "Kedy sú zimné pneumatiky na Slovensku povinné?", a: "Pre osobné autá vtedy, keď je na vozovke súvislá vrstva snehu, ľadu alebo námrazy. Pevný dátum pre osobné autá neplatí." },
      { q: "Aký hlboký musí byť dezén zimnej pneumatiky?", a: "Najmenej 3 mm. Nová zimná pneumatika má zvyčajne 8 až 9 mm." },
      { q: "Ako zistím vek pneumatiky?", a: "Z kódu DOT na boku pneumatiky: posledné štyri číslice sú týždeň a rok výroby, napríklad 3421 je 34. týždeň roku 2021." },
    ],
  },
];

export const latestPosts = (n = 3) => [...BLOG].sort((a, b) => b.date.localeCompare(a.date)).slice(0, n);
export const fmtDate = (d: string) => new Date(d + "T12:00:00").toLocaleDateString("sk-SK", { day: "numeric", month: "long", year: "numeric" });
