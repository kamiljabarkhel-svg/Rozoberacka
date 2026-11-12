// Blog autosuciastky.eu – články pre kupujúcich a vodičov.
// Nový článok = nová položka v BLOG (najnovší hore). Pribudne na úvode (prvé tri), na /blog a v mape webu.
// Fotky: Unsplash (licencia Unsplash – použitie zadarmo, aj komerčne), načítavajú sa priamo z images.unsplash.com;
// pri každej fotke uvádzame autora. Fotky z Unsplash+ (platené) NEPOUŽÍVAŤ.
import Link from "next/link";
import type { ReactNode } from "react";

export type BlogPhoto = { id: string; alt: string; author: string; authorUrl: string; pageUrl: string };
export type BlogPost = { slug: string; title: string; short: string; description: string; date: string; readMin: number; tag: string; photo: BlogPhoto; body: ReactNode };

export const blogPath = (slug: string) => `/blog/${slug}`;
/** Adresa fotky z Unsplash v danej šírke (Unsplash ju zmenší a pošle vo WebP/AVIF, ak to prehliadač vie). */
export const photoUrl = (p: BlogPhoto, w: number) => `https://images.unsplash.com/photo-${p.id}?auto=format&fit=crop&w=${w}&q=70`;
export const photoSrcSet = (p: BlogPhoto, ws: number[]) => ws.map((w) => `${photoUrl(p, w)} ${w}w`).join(", ");

const fmtLink = (href: string, text: string) => <Link href={href}>{text}</Link>;

export const BLOG: BlogPost[] = [
  {
    slug: "ako-kupit-ojazdene-auto",
    title: "Ako kúpiť ojazdené auto a nenaletieť: 9 krokov pred podpisom",
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
  },
  {
    slug: "autobateria-v-zime",
    title: "Autobatéria v zime: ako spoznať, že dosluhuje, a ako vybrať novú",
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
  },
  {
    slug: "zimne-pneumatiky-kedy-prezut",
    title: "Zimné pneumatiky: kedy prezuť a ako vybrať aj použité",
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
          <li><strong>Vek (DOT):</strong> na boku je štvormiestny kód, napríklad 3421 = 34. týždeň roku 2021. Guma časom tvrdne aj bez jazdenia, preto sa pri starších pneumatikách oplatí byť opatrný.</li>
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
  },
];

export const latestPosts = (n = 3) => [...BLOG].sort((a, b) => b.date.localeCompare(a.date)).slice(0, n);
export const fmtDate = (d: string) => new Date(d + "T12:00:00").toLocaleDateString("sk-SK", { day: "numeric", month: "long", year: "numeric" });
