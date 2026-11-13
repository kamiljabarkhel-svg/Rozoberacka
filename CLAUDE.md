# Rozoberačka – portál na použité autodiely (Slovensko)

Som začiatočník a neviem programovať. Vysvetľuj po slovensky, jednoducho, a každý krok mi povedz, čo mám spraviť (kliknúť, skopírovať, vložiť). Pred zmazaním alebo veľkou zmenou sa spýtaj.

## Cieľ
Zmeniť priložený `prototyp.html` (jednosúborové demo, dáta v localStorage) na ostrú webovú stránku s databázou, skutočným prihlásením a hosťovaním. Vzhľad a správanie prototypu zachovaj, otvor ho v prehliadači a použi ako vzor.

## Odporúčaný stack
- Frontend: Next.js (alebo Vite + React) + Tailwind, nasadenie na Vercel.
- Backend: Supabase (Postgres, Auth, Storage, Row Level Security, Edge Functions).
- Doména a HTTPS cez Vercel.

## Základné pravidlá produktu
1. Kupujúci sa NEREGISTRUJE. Prehliada, hľadá a po kliknutí na „Zobraziť telefón“ uvidí číslo.
2. Registrujú sa len predajcovia (e-mail + heslo, potvrdenie e-mailu). Pridávajú a spravujú inzeráty.
3. Hľadanie je najprv podľa auta (Značka → Model → Motorizácia → Ročník), potom kategórie a podkategórie. Pod počtom výsledkov („12 dielov“) sú chipy kategórií s počtami (facety z aktuálneho filtra).
4. Dekódovanie VIN: z prvých 3 znakov (WMI) značka, z 10. znaku približný modelový rok. Ďalej vyhľadávanie podľa auta. ŠPZ sa NEDEKÓDUJE (platené).
5. Katalóg vozidiel: všetky značky, modely (s rokmi od–do) a motorizácie. V prototype je v premennej `CATRAW` (z pamäte, môže mať chyby). Presunúť do tabuliek a neskôr nahradiť licencovanými dátami (TecDoc).
6. Inzerát bez motorizácie pasuje na všetky motorizácie daného modelu.
7. Zhoda OEM ↔ vozidlo: každý inzerát má OEM číslo, vlastné auto a voliteľný zoznam „Pasuje aj na“. V detaile sa zobrazí zoznam „Pasuje na“ zložený zo všetkých aktívnych inzerátov s rovnakým normalizovaným OEM (veľké písmená, bez medzier a pomlčok, min. 4 znaky). Pri hľadaní podľa auta sa zobrazia aj diely, ktoré cez túto zhodu pasujú. Na stránke musí byť upozornenie, že ide o údaje predajcov, nie overený katalóg.

## Stránky a funkcie
Verejná časť:
- Úvod s vyhľadávaním (auto / kategória / VIN / fulltext podľa názvu, OEM, popisu).
- Zoznam inzerátov (karty s fotkou, cenou, stavom, mestom), filtre: cena do, stav, mesto, podkategória, zoradenie, obľúbené (v prehliadači, bez účtu), „Načítať viac“.
- Detail: galéria fotiek, popis, parametre, „Pasuje na“, predajca (názov, typ, mesto, overený), telefón na klik, podobné inzeráty. Zobrazenia a odkryté telefóny sa počítajú (bez duplicít, najlepšie cez serverovú funkciu).
Portál predajcu (po prihlásení), záložky:
- Prehľad: zobrazenia, odkryté telefóny, aktívne, predané, upozornenia (chýbajú fotky, nevyplnený profil).
- Moje inzeráty: hľadanie, filter (všetky/aktívne/pozastavené/predané/bez fotky), akcie upraviť, predané, pozastaviť, aktivovať, duplikovať, zmazať.
- Pridať/upraviť inzerát: polia name, brand, model, engine, year, category, subcategory, oem, fits[], price, city, condition (Veľmi dobrý/Dobrý/Na opravu), phone, description (max 1000), warranty (Bez záruky/14 dní/3 mesiace), shipping, fotky (max ~8, zmenšenie na klientovi, ukladanie do Storage).
- Import z CSV (max 500 riadkov, `;` alebo `,`; povinné stĺpce nazov, znacka, cena, kategoria; voliteľné model, motorizacia, rocnik, oem, podkategoria, stav, zaruka, popis, mesto, telefon; náhľad s chybami a upozorneniami pred importom). Doplniť stĺpec `pasuje`.
- Profil: názov/firma, typ (Firma/Súkromná osoba), mesto, telefón, IČO.

## Databáza (návrh pre Supabase)
PLATNÁ VERZIA je v `supabase/01_schema.sql` (otestovaná). Náčrt nižšie je pôvodný a slúži len na orientáciu.
```sql
create table sellers (
  id uuid primary key references auth.users on delete cascade,
  name text not null, type text default 'Firma', city text, phone text, ico text,
  verified boolean default false, created_at timestamptz default now()
);
create table brands (id serial primary key, name text unique not null);
create table models (id serial primary key, brand_id int references brands, name text not null, year_from int, year_to int);
create table engines (id serial primary key, model_id int references models, name text not null, code text);
create table categories (id text primary key, name text not null);
create table listings (
  id bigserial primary key,
  seller_id uuid references sellers not null,
  name text not null, brand_id int references brands, model_id int references models, engine_id int references engines,
  year int, category_id text references categories, subcategory text,
  oem text, oem_key text generated always as (upper(regexp_replace(coalesce(oem,''),'[^A-Za-z0-9]','','g'))) stored,
  price numeric(10,2) not null, city text, condition text, phone text, description text,
  warranty text, shipping text, status text default 'active' check (status in ('active','paused','sold')),
  views int default 0, calls int default 0, created_at timestamptz default now()
);
create table listing_fits (listing_id bigint references listings on delete cascade, brand_id int, model_id int, engine_id int);
create table listing_photos (id bigserial primary key, listing_id bigint references listings on delete cascade, path text not null, position int default 0);
create index on listings (oem_key); create index on listings (status, created_at desc);
```
Row Level Security: všetci čítajú aktívne inzeráty; zapisovať/mazať môže len vlastník (`seller_id = auth.uid()`). Telefón vracať cez funkciu (rate limit), nie v zozname. Fotky: Storage bucket `listing-photos`, čítanie verejné, zápis len do vlastného priečinka.

## Bezpečnosť a právo
- Žiadne heslá ani kľúče v kóde. Do frontendu len verejný anon kľúč, tajné veci len v Edge Functions / premenných prostredia.
- Ochrana proti spamu (rate limit, CAPTCHA pri registrácii a odkrytí telefónu), možnosť nahlásiť inzerát.
- GDPR: zásady ochrany osobných údajov, súhlas pri registrácii, cookies lišta, kontakt na predajcu je jeho osobný údaj. Obchodné podmienky, údaje prevádzkovateľa (živnosť/IČO).

## Postup práce (rob po krokoch a po každom mi daj vyskúšať)
1. Zozbieraj dopyty: prejdi `prototyp.html`, potvrď mi zoznam funkcií.
2. Založ projekt, Supabase a Vercel (vysvetli mi účty a kľúče).
3. Tabuľky + RLS + import katalógu z `CATRAW` do brands/models/engines.
4. Verejné stránky: zoznam, filtre, facety, detail, VIN.
5. Registrácia/prihlásenie predajcov a portál predajcu.
6. Fotky do Storage, CSV import, zhoda OEM.
7. Doména, e-maily, GDPR stránky, testovanie na mobile.
8. Neskôr: zvýraznenie inzerátov a predplatné pre firmy, hodnotenie predajcov, TecDoc.

## Agent Dirigent a denník
- V priečinku `.claude/agents/` je agent `dirigent`. Na začiatku každej práce napíš: „Použi agenta dirigent.“
- Denník stavby: `DENNIK.md` (pracovná kópia) a online Claude Docs „Rozoberačka – denník stavby“. Každá zmena sa zapisuje s dátumom a časom.

## Rozhodnutia (2. 11. 2026, 17:03)
- PRIORITA: databáza (krok 3). Hotový návrh je v `supabase/` a je otestovaný na PostgreSQL 16. Agent ho nasadí do Supabase a napojí naň web.
- Katalóg zatiaľ len 6 najčastejších značiek na SK: Škoda, Volkswagen, Audi, BMW, Kia, Hyundai (podľa predajov jazdeniek: AURES 9/2025, Cebia 1. polrok 2026, AutoOlymp 1–5/2026). Najčastejšie modely: Octavia, Fabia, Superb, Golf, Passat, BMW 3 a 5, Audi A4 a A6, Kia Ceed, Hyundai i30, Kodiaq, Tiguan. Priemerný vek predávaných jazdeniek 9,45 roka.
- Kategórie dielov v poradí dopytu: karoséria, svetlá, elektro, motor, kolesá a disky, potom ostatné. Poradie vychádza z britských údajov (eBay 2022, ifndautoparts Q3 2025); slovenské údaje zatiaľ nemáme.
- Rozhovory s vrakoviskami a pilot: neskôr.

## Roly
- Majiteľ projektu píše nápady a myšlienky v chate s Claude.
- Agent Dirigent v Claude Code stavia web a vedie DENNIK.md.
- Claude v chate je druhý kontrolór: kontroluje prácu Dirigenta podľa jeho reportov.

## Funkcie podľa konkurencie (2. 11. 2026, 17:46)
Zdroj: analýza RRR.lt/Ovoko, Opisto.fr, Autobazar.sk (otvorené 2. 11. 2026). Všetko je už v `prototyp.html`, v ostrej verzii postaviť rovnako:
1. **Hľadanie podľa čísla dielu (OEM)**: samostatné pole; porovnáva sa normalizované OEM (bez medzier a pomlčiek).
2. **Najhľadanejšie diely**: rýchle tlačidlá (Predné svetlo, Zadné svetlo, Nárazník, Kapota, Zrkadlo, Dvere, Riadiaca jednotka, Alternátor, Turbo, Motor, Prevodovka, Volant).
3. **Počítadlo na úvode**: „X dielov od Y predajcov“ zo skutočných údajov.
4. **Nové polia inzerátu**: strana auta (ľavá/pravá), prevodovka auta, z ktorého je diel, najazdené km, „odskúšaný“, „vrátenie do 14 dní“. Štítky na karte a v detaile, filtre „Strana“, „Len odskúšané“, „Len s možnosťou vrátenia“. Do databázy: stĺpce `side`, `donor_gearbox`, `donor_km`, `tested`, `returns_14d` v `listings`.
5. **Uložené hľadanie (strážca)**: kupujúci bez účtu si uloží hľadanie (v prehliadači); pri novom vyhovujúcom diele vidí „nové“. V ostrej verzii voliteľne e-mailové upozornenie (potrebuje e-mail a súhlas, GDPR).
6. **Správa predajcovi**: formulár v detaile (meno, kontakt, text), predajca vidí správy v záložke „Správy“ v portáli. Do databázy: tabuľka `messages` (listing_id, seller_id, meno, kontakt, text, created_at, read_at), RLS: čítať len vlastník inzerátu, vkladať ktokoľvek s ochranou proti spamu.
7. **Zdieľanie odkazu** („Poslať odkaz mechanikovi“): každý inzerát má vlastnú adresu.
8. **TOP zvýraznenie**: predajca zvýrazní inzerát, zobrazí sa medzi prvými so štítkom TOP. Neskôr platená služba. Do databázy: `listings.top_until timestamptz`.
9. Mazanie inzerátu je dvojkrokové priamo na stránke (žiadne vyskakovacie okná prehliadača).

Zámerne NEROBÍME teraz: online platby a doručenie cez portál (RRR, Opisto), hľadanie podľa ŠPZ (Opisto), platforma pre servisy so zľavou (Opisto.pro), newsletter. (Blog od 12. 11. 2026 robíme – pozri nižšie.) Sú v denníku ako neskoršie nápady.

## Formulár predajcu a nástenka (2. 11. 2026, 18:01)
Vzor je v `prototyp.html`.
- **Povinné polia** (označené *, chyba sa ukáže červeno pri poli): názov dielu (min. 3 znaky), kategória, kód súčiastky / OEM číslo (min. 4 písmená alebo číslice), značka auta, model (ak ho katalóg pozná), ročník, stav, cena > 0 €, záruka, odovzdanie, aspoň 1 fotka, popis (min. 20 znakov), mesto, telefón (min. 9 číslic). Nepovinné: podkategória, výrobca dielu (Bosch, Valeo…), motorizácia (prázdna = všetky), prevodovka, km, strana, „pasuje aj na“, odskúšaný, vrátenie.
- Formulár je v 5 krokoch: Diel → Auto → Stav, cena a podmienky → Fotky a popis → Kontakt.
- Overovanie musí byť aj v databáze (NOT NULL a CHECK), nielen vo formulári. Nový stĺpec `listings.part_maker text`.
- CSV import: povinné stĺpce nazov, znacka, model, oem, cena, kategoria.
- **Nástenka predajcu** (prvá záložka portálu): pozdrav a dátum, rýchle akcie (Pridať inzerát, Import, Všetky inzeráty), 6 čísel (aktívne + ich hodnota v €, zobrazenia, odkryté telefóny + počet na 100 zobrazení, nové správy, predané + suma, pozastavené), graf najsledovanejších inzerátov, zoznam „Treba vybaviť“ (správy, bez fotky, bez OEM, bez popisu, pozastavené, profil) a počty aktívnych inzerátov podľa kategórie.
- **Moje inzeráty**: hromadný výber a akcie (aktivovať, pozastaviť, predané, zmazať s potvrdením), triedenie (najnovšie, zobrazenia, telefóny, cena), filtre aj „bez OEM“ a „bez popisu“.
- Na počítači má portál bočné menu, na mobile záložky hore. Vstup: tlačidlo „Prihlásenie predajcu“ v hlavičke a odkaz „Vytvorte si účet predajcu zadarmo“ na úvode.
- Chyba z prototypu, nesmie sa zopakovať: CSS trieda `top` bola použitá aj pre hlavičku aj pre TOP inzerát, takže TOP inzeráty ostávali prilepené pri scrollovaní. Používať jednoznačné názvy tried (napr. `is-top`).

## Tvar dizajnu (2. 11. 2026, 18:09)
Majiteľ nechce zaoblený „AI“ vzhľad. Platí pre celý web:
- Zaoblenie rohov najviac 6 px: karty a panely 6 px, tlačidlá, polia a štítky 3 až 4 px. Žiadne pilulky (border-radius 99px) okrem bodiek stavu.
- Karty bez tieňov, len tenký okraj; pri prejdení myšou sa zmení farba okraja, karta sa nedvíha.
- Úvodný pás jednofarebný (tmavá modrozelená, jemný prechod zhora nadol), bez farebných škvŕn.
- Vzor je v `prototyp.html`.

## Audit a etapy (3. 11. 2026, 21:30)
Audit a návrh priorít: Claude Docs „Rozoberačka – audit a návrh priorít“. Majiteľ schválil všetko.
- Online košík ani platby NEBUDÚ – portál je inzercia (kontakt telefón/správa).
- Etapy: 1 Bezpečný základ (hotové) → 2 Spustenie (SEO, právne stránky, Vercel, doména, e-maily, katalóg) → 3 Odlíšenie (dopyt na diel, darcovské auto, uložené hľadanie s e-mailom, našeptávanie, export) → 4 Rast.
- Záruka: firma pri použitom diele najmenej 12 mesiacov (možnosti 12/24 mesiacov), súkromná osoba môže „Bez záruky“. Pri firme sa zobrazuje zákonné odstúpenie do 14 dní pri kúpe na diaľku. Overiť s právnikom.
- Hľadanie beží v databáze (`search_listings`), nie v prehliadači. Ukážkový režim bez Supabase hľadá lokálne.

## GDPR (3. 11. 2026, 22:40)
- Prevádzkovateľ: KJ trade s. r. o. (presne podľa ORSR), IČO 57598142, OR Mestského súdu Bratislava III, oddiel Sro, vložka 198932/B. Údaje v `web/lib/operator.ts` (sídlo Kvetná 1505/4D, 900 41 Rovinka, e-mail autosuciastky.eu@gmail.com; zápis v OR doplniť). Pri zmene textov podmienok zvýšiť `TERMS_VERSION`.
- Žiadne analytické ani reklamné cookies bez súhlasu. Ak sa pridajú, najprv cookie lišta so súhlasom.
- Doby uchovávania: správy 12 mesiacov, nahlásenia 12 mesiacov po vybavení, odtlačok IP 3 dni (pri nahlásení 30), záznam správcu 3 roky, dopyty kupujúcich 60 dní od zadania (platnosť 30 dní), strážca e-mailom: nepotvrdený 3 dni, potvrdený najviac 6 mesiacov. Mazanie: `purge_old_data()` denne cez pg_cron.
- Nové osobné údaje (napr. VIN darcovského auta, e-mail kupujúceho pre strážcu) doplniť do zásad a do záznamov o spracovateľských činnostiach skôr, než sa začnú zbierať.

## SEO, darcovské autá, dopyty (6. 11. 2026, 22:20)
- SEO: stránky sa pripravujú na serveri. Detail má adresu `/diel/<id>-<nazov-a-auto>` (staré `/inzerat/<id>` presmeruje), vstupné stránky `/diely/<znacka>/<model>/<kategoria>` a `/kategoria/<kategoria>/<podkategoria>`, `sitemap.xml`, `robots.txt`, štruktúrované dáta (Product, BreadcrumbList), obrázok pre zdieľanie. Po kúpe domény nastaviť `NEXT_PUBLIC_SITE_URL`.
- Darcovské auto: predajca zapíše rozobraté auto a pridá z neho viac dielov naraz (tabuľka `donor_cars`, `listings.donor_id`). VIN je nepovinný a nezobrazuje sa verejne.
- Dopyt na diel: kupujúci bez účtu (`/dopyt`), predajcovia odpovedajú ponukou v záložke „Dopyty“, kupujúci vidí ponuky na tajnej adrese. Kontakt kupujúceho vidia len prihlásení predajcovia.
- Predajca: export inzerátov do CSV (rovnaké stĺpce ako import) a hromadná zmena ceny (o € alebo %).
- Katalóg: `supabase/09_katalog_opravy.sql` (115 modelov). Stále z pamäte, nahradiť TecDoc.

## SEO a zážitok kupujúceho (6. 11. 2026, 23:30)
- Predaný (do 180 dní) alebo pozastavený diel: stránka ostane s nápisom „Predané“ a náhradami (rovnaké OEM, auto, kategória), bez telefónu; pre Google `noindex`.
- Stránky miest `/mesto/<mesto>` (aj s kategóriou), verejná stránka predajcu `/predajci/<id>-<nazov>`, návody `/navody/oem-cislo`, `/navody/vin`, `/navody/bezpecny-nakup` (stále stránky, nie blog). Všetko v mape webu.
- Fotky: veľká vždy JPEG (zdieľanie), stredná 960 px a náhľad 480 px vo WebP (`X.w.jpg`, `X.w_m.webp`, `X.w_t.webp`; pomôcky v `web/lib/photos.ts`).
- Našepkávanie v hlavičke (autá, kategórie, názvy dielov, OEM). „Moje auto“ v prehliadači: úvod ukáže diely naň, detail povie, či pasuje (ročník sa nefiltruje).
- Odfotenie OEM/VIN: tesseract.js beží v prehliadači, súbory z vlastného webu `/ocr`, nič sa neukladá ani neposiela.
- Aplikácia na plochu: manifest, ikony, `sw.js` bez ukladania údajov.
- Hodnotenie predajcov len od kupujúceho, ktorému predajca poslal ponuku na dopyt; zobrazí sa krstné meno; správca môže skryť. Pravidlá v obchodných podmienkach (časť 4a).
- Strážca e-mailom: hotový, ale vypnutý (`NEXT_PUBLIC_EMAIL_ALERTS`), kým nebeží Brevo a funkcia `strazca` (návod v `supabase/README.md`).

## Bezpečnosť (7. 11. 2026, 13:00)
- Bezpečnostné hlavičky v `web/next.config.ts` (CSP, HSTS, X-Frame-Options…). Nová služba z cudzej domény sa musí doplniť do CSP.
- Správca portálu len s dvojitým overením (heslo + kód z aplikácie, TOTP): `is_admin()` vyžaduje `aal2` (`supabase/11`). Nastavenie aj zadanie kódu je priamo na `/admin`.
- Po zmene inzerátu portál volá `/api/obnovit` – verejné stránky dielov sa obnovia hneď.
- Detail `/diel/<id>` bez názvu sa zobrazí s canonical na plnú adresu (bez presmerovania).
- Otvorené: CAPTCHA (potrebuje účet Cloudflare Turnstile), Next.js 16 (zvyšné slabé miesta v knižniciach) až po spustení.

## Stavy dielu a ponuka predajcu (7. 11. 2026)
- Stav dielu: Nový (nepoužitý), Repasovaný, Veľmi dobrý, Dobrý, Na opravu (`supabase/13`). Firma: nový diel záruka 24 mesiacov, použitý aj repasovaný najmenej 12 mesiacov; súkromná osoba môže „Bez záruky“. Overiť s právnikom.
- Verejná stránka predajcu `/predajci/<id>` ukazuje celú jeho ponuku: hľadanie v ponuke, kategórie s počtami, zoradenie a „Načítať ďalšie“. V detaile dielu je odkaz „Všetky diely predajcu (N)“.
- Po zmene alebo zmazaní inzerátu `/api/obnovit` obnoví aj úvod a stránky áut, kategórií a miest, aby kupujúci nevidel zmazaný diel.

## Súlad so zákonom a cookies (7. 11. 2026, 23:59)
Overené na Slov-Lexe: Občiansky zákonník § 597, 599, 612, 618, 619 (znenie od 31. 7. 2026), zákon č. 108/2024 Z. z. § 2, 16, 20 (znenie od 27. 9. 2026). **Od 1. 7. 2027 platí nový Občiansky zákonník č. 260/2026 Z. z.** (spotrebiteľ § 809 – rovnaké 2 roky / 1 rok; súkromný predaj § 521 – vadu vytknúť do 6 mesiacov). K tomuto dátumu prepísať texty v `web/lib/legal.ts`, formulári, návode a podmienkach.
- Predajca pri registrácii a v profile **vyhlási**: podnikateľ (obchodné meno, IČO, sídlo – verejné) alebo súkromná osoba (bez IČO a adresy). `supabase/14`.
- Detail dielu, stránka predajcu a ponuky na dopyt zobrazujú poučenie podľa typu predajcu (`components/SellerNotice.tsx`, `lib/legal.ts`): pri súkromnej osobe, že sa nepoužijú predpisy na ochranu spotrebiteľa.
- Riadok „Zodpovednosť za vady“: podnikateľ 24 mesiacov, pri použitom/repasovanom dohodnutých 12 mesiacov (§ 619 ods. 3); súkromná osoba – zodpovedá za vady, na ktoré neupozornila. Odstúpenie do 14 dní len pri kúpe od podnikateľa na diaľku.
- Stránka `/ako-zoradujeme` (parametre poradia, TOP) s odkazom pri výsledkoch a v pätičke.
- Cookies: `lib/consent.ts` + `components/CookieBar.tsx`. Bez voliteľných nástrojov len informačná lišta „Nesledujeme vás“; s `NEXT_PUBLIC_ANALYTICS_SRC` tri rovnocenné tlačidlá (Prijať všetky / Odmietnuť / Nastavenia), skript až po súhlase, odvolanie v pätičke („Nastavenia cookies“) zmaže cookies tretích strán.
- Overiť s právnikom: znenie poučení, repasovaný diel ako použitá vec, či je portál „online trhom“ aj bez platieb (zvolili sme bezpečnejší výklad – áno).


## Spustenie (8. 11. 2026, 15:25)
- Ostrý web: https://rozoberacka.vercel.app (Vercel Hobby, projekt `rozoberacka`, Root Directory `web`). Každý push do `main` sa nasadí sám.
- Kľúč v `NEXT_PUBLIC_SUPABASE_ANON_KEY` je nový „Publishable key“ (`sb_publishable_…`). „Secret key“ nikdy do Vercelu ani do kódu.
- Supabase Auth: Site URL https://rozoberacka.vercel.app, Redirect URLs https://rozoberacka.vercel.app/**. Po kúpe domény doplniť doménu aj sem a nastaviť `NEXT_PUBLIC_SITE_URL`.

## Kontrola súladu (8. 11. 2026, 17:00)
- Overené: RLS chráni súkromné tabuľky na ostrej databáze; `15_spevnenie_prav.sql` pridáva druhú vrstvu (spustí majiteľ v SQL Editore). Funkcia hľadania číta celé riadky inzerátov ako návštevník – stĺpce `listings` preto neskrývať pred anon.
- Podmienky (verzia 2026-11-08): 18+, licencia na fotky, prístup k údajom a 30-dňová výpoveď (nariadenie P2B 2019/1150), moderovanie rozhoduje človek, nahlásenie s vyhlásením o dobrej viere (DSA čl. 16), orgán dozoru SOI.
- Zákon 22/2004 § 4: na webe chýba telefón prevádzkovateľa (`OPERATOR.phone`, doplní majiteľ). Firma nie je platiteľ DPH.
- Vercel Hobby je len na nekomerčné použitie a DPA dáva len k Pro – majiteľ chce iný hosting (porovnanie v chate 8. 11. 2026). Funkcie bežia vo Frankfurte (`web/vercel.json`).
- E-maily prihlasovania (potvrdenie, obnova hesla…) sú po slovensky v `supabase/emaily/`. Supabase ich dovolí vložiť až po napojení vlastného SMTP (Brevo alebo Websupport) a domény; dovtedy chodia anglicky od Supabase.

## Katalóg pre celú Európu (8. 11. 2026, 19:00)
- Majiteľ chce všetky značky, modely a motorizácie európskeho trhu (mení rozhodnutie z 2. 11. o 6 značkách). Údaje: `supabase/katalog/*.txt` (formát v hlavičke súboru) → `python3 supabase/katalog/generuj.py` → `supabase/16_katalog_europa.sql` (needitovať ručne) → `npm run gen:catalog` (demo). Z pamäte – nahradiť TecDoc.
- Web: modely triedi `lib/catalogSort.ts` (rad + rok). Stránky dielov, áut, miest a predajcov posielajú do prehliadača len časť katalógu (`pickCatalog`), úvod kompaktne (`packCatalog`). Ukážkové údaje sa načítajú len v ukážkovom režime (`demoData()` v `lib/data.ts`).
- Next.js si pamätá odpovede databázy (fetch cache) – po zmene katalógu sa web obnoví do 5 minút; lokálne pred buildom zmazať `.next/cache/fetch-cache`.


## autosuciastky.eu – vozidlá, kategórie, pneumatiky, havarované vozidlá (8. 11. 2026, 21:00)
- Nový názov portálu: **autosuciastky.eu** (všade na webe, v e-mailoch a podmienkach). Interné kľúče `rozoberacka-*` v prehliadači a názov projektu/repozitára ostávajú.
- **Číslo dielu (OEM)** je hlavný údaj: veľký box s kopírovaním v detaile (`components/OemBox.tsx`), riadok „Číslo dielu“ na každej karte, vo formulári vysvetlenie. Rozhoduje číslo dielu, nie len model auta.
- **Druhy vozidiel**: `models.vehicle_type` (osobne, dodavky, nakladne, autobusy, motorky), `categories.vtypes` (kategórie len pre niektoré druhy). Záložky na úvode, v dopyte, vo formulári, pri autách na diely. Katalóg: `supabase/katalog/1*.txt` (`!druh`) → `generuj.py` → `supabase/20_katalog_vozidla.sql`.
- **Kategórie**: 33 kategórií, 344 podkategórií (`supabase/18` + `supabase/21`: ťažné a nosiče, kabriolet, nákladný priestor dodávky, obytné vozidlá, kabína kamiónu, vzduchový systém, náves a príves, interiér autobusu, kufre motorky, výbava jazdca, štvorkolky a „Iné“ pre všetky vozidlá) – od karosérie po interiér, airbagy, multimédiá, elektropohon, výbava, nadstavby, autobus, motorky.
- **Pneumatiky a disky** (kategória `kol`): `listings.specs` jsonb (šírka, profil, priemer, sezóna, dezén, DOT, indexy, šírka disku, rozteč, ET, stredový otvor, kusy, materiál), kontrola v DB `specs_ok()` aj vo formulári (`cleanSpecs`), filtre na úvode, stĺpce v CSV.
- **Autá na diely** (predtým „darcovské autá“, v DB stále `donor_cars`): predajca zapíše rozoberané vozidlo a pridá z neho veľa dielov naraz; zoznamy bežných dielov podľa druhu vozidla; tlačidlo „Predať celé vozidlo“.
- **Havarované vozidlá** (`supabase/19`, `car_listings`, `car_contacts`, `car_photos`): len havarované, nepojazdné, po požiari/povodni alebo na diely – nie bežný autobazár. Verejnosť číta len cez funkcie (`search_cars`, `get_car`); telefón na klik, VIN nikdy verejne. Stránky `/havarovane-vozidla` a `/vozidlo/<id>-<nazov>`, portál „Havarované vozidlá“, správy a nahlásenia (aj „Podozrenie na kradnuté vozidlo“), v mape webu.
- **Inzertný portál – zodpovednosť**: `components/Disclaimer.tsx` v detaile dielu, vozidla, dopytoch, na úvode, stránke predajcu, vo formulároch a pri registrácii; pätička; obchodné podmienky časť 6 „Zodpovednosť“ (`#zodpovednost`) a 3a1 „Predaj celých vozidiel“ (zákon 79/2015 o starých vozidlách). `TERMS_VERSION` 2026-11-09. Overiť s právnikom.

## Nový vzhľad „pult v predajni dielov“ (9. 11. 2026, 17:30)
- Úvod sa pýta ako predavač: „Na aké vozidlo hľadáte diel?“; záložky druhov vozidiel sú horná hrana panelu hľadania.
- ~~Písma IBM Plex~~ – nahradené písmom Inter (pozri „Vzhľad C“ nižšie). Barlow sme skúsili a zamietli – zle rozostavené „ľ“.
- Farby: petrolejová #0f3d47 (značka, tlačidlá telefónu), pozadie oceľovo-sivé #eef2f4, žltá #f2b300 len na hlavné „Hľadať“ a štítok TOP (aj v tmavom režime).
- Číslo dielu je všade rovnaký „štítok“ (tenký tmavý rámik, Plex Mono). Odkazy bez šípky „→“, štítky bez veľkých písmen.
- Nové pravidlá sú vrstva na konci `web/app/globals.css` („Vzhľad pult v predajni dielov“). Pravidlá z „Tvar dizajnu“ (rohy max. 6 px, bez tieňov) platia ďalej.

## Sekcie a druh vozidla (9. 11. 2026, 18:30)
- ~~Žltý pás sekcií~~ – od 11. 11. 2026 podčiarknuté záložky (pozri „Vzhľad C“). Pôvodne: sekcie Autodiely / Pneumatiky a disky / Havarované vozidlá / Dopyt na diel boli výrazný **žltý** pás pod hlavičkou (aktívna sekcia petrolejová; na mobile 2 × 2) – na želanie majiteľa, aby si ho ľudia všimli.
- Úvod aj havarované vozidlá majú **predvolené osobné autá**; „Všetky vozidlá“ je posledná záložka (v adrese `druh=vsetky`, osobné sa do adresy nepíšu).
- Hľadanie podľa VIN sa ukáže len pri osobných autách, dodávkach a „všetkých“; pri nákladných, autobusoch a motorkách nie.
- Číslo dielu (OEM) aj text sa hľadá len v zvolenom druhu vozidla (pri poli je napísané, v akom). Odkaz „Rovnaké číslo u iných predajcov“ nesie druh vozidla dielu. Motorky majú vlastné „Najhľadanejšie diely“.
- Portál predajcu: vo formulári je prvá otázka „Na aké vozidlo je diel?“ (pamätá si naposledy zvolený druh), v „Moje inzeráty“ filter a štítok druhu vozidla, na nástenke „Na aké vozidlá predávate“.

## Google Analytics (9. 11. 2026, 19:40)
- Pripravené, zapína sa premennou `NEXT_PUBLIC_GA_ID` (G-…) vo Verceli. Bez nej sa nič nemení.
- Kód Google sa načíta až po súhlase v lište (Prijať všetky / Odmietnuť / Nastavenia), bez Google signals a reklamných funkcií; pri odvolaní sa cookies zmažú. `CONSENT_VERSION` 2 – lišta sa ukáže všetkým znova.
- CSP, /cookies (_ga, _ga_*) a zásady ochrany údajov (časť 3 a 6, prenos do USA cez rámec EÚ – USA) sa prispôsobia samy podľa `NEXT_PUBLIC_GA_ID`.
- V Google Analytics nastaviť: uchovávanie údajov 14 mesiacov, vypnúť Google signals a reklamné funkcie, prijať dodatok o spracúvaní údajov.

## Pneumatiky, havarované vozidlá, dopyt (9. 11. 2026, 21:00)
- „Pneumatiky a disky“ (`/?kat=kol#pneu`): úvod zmení nadpis, hore v paneli je výber (Disky hliníkové/oceľové, Kolesá s pneumatikami, Pneumatiky letné/zimné/celoročné) a filtre Pneumatika (šírka, profil, priemer, sezóna) a Disk (rozteč, šírka disku, ET, typ disku). VIN a najhľadanejšie diely sa vtedy skryjú.
- `/havarovane-vozidla` má rovnaký úvodný pás ako úvod a prázdny stav s odkazom pre predajcov.
- Dopyt vidia všetci registrovaní predajcovia v záložke „Dopyty“ (predvolene len dopyty na značky, ktoré predávajú). E-mailom sa zatiaľ neposiela – až po Brevo. Vysvetlené na `/dopyt`.

## Univerzálne diely, pneumatiky, havarované vozidlá (9. 11. 2026, 22:05)
- `supabase/22` (ostrá DB): `categories.universal` (kol, mjz, ine, vyb, obv, mvy) – inzerát môže byť bez auta a bez čísla dielu; ostatné kategórie vyžadujú značku, model, ročník a číslo dielu (trigger `listing_required`). `listings.vtype` = druh vozidla aj bez modelu. Web: `UNIVERSAL_CATS`/`isUniversal` v `lib/types.ts`.
- Pneumatiky a disky majú vlastný panel podľa rozmeru (`wtype` pneu/disk/kolesa, adresa `typ=`), bez OEM, VIN, chipov kategórií a „Moje auto“.
- Havarované vozidlá: dlaždice stavov + bočné filtre (`CarsBrowse.tsx`, `CarCard.tsx`) – nemajú vyzerať ako autodiely.
- VIN len pri osobných autách a dodávkach – platí aj vo formulári dopytu.

## Povinné polia pri pneumatikách a vozidlách (9. 11. 2026, 22:25)
- `supabase/23`: pri kategórii `kol` je povinná podkategória („Čo predávate?“) a rozmer – pneumatiky šírka + profil + priemer, disky rozteč + priemer, kolesá oboje (trigger `listing_required`). Formulár navyše vyžaduje počet kusov, pri diskoch šírku a ET, pri použitých pneumatikách dezén (`wheelKind`, `wheelMissing`, `wheelDefaults` v `lib/types.ts`).
- Havarované vozidlá: nové stĺpce `body`, `power_kw`, `keys`, `origin`; palivo povinné (`car_listings_fuel_required`). Formulár vyžaduje aj karosériu, km (alebo „nepoznám“), naštartuje a kľúče. `search_cars` skladá riadok stĺpec po stĺpci – pri novom stĺpci v `car_listings` ho treba prepísať.

## Hromadné fotky (10. 11. 2026, 19:40)
- Import CSV: stĺpec `fotky` (názvy súborov oddelené |) alebo fotka pomenovaná číslom dielu (`5E1941015.jpg`, `5E1941015_2.jpg`, „5E1941015 (3).jpg“). Inzerát bez fotky sa naimportuje **pozastavený**.
- Záložka „Hromadne z fotiek“ → „Doplniť fotky k existujúcim inzerátom“: fotky k existujúcim inzerátom podľa čísla dielu alebo `ID<číslo inzerátu>_1.jpg`; najviac 8 fotiek na inzerát, pridávajú sa za existujúce. Pravidlá názvov v `web/lib/bulkPhotos.ts` (rovnaké pre oba spôsoby).
- Fotky sa zmenšujú v prehliadači (JPG, PNG, WebP; HEIC z iPhonu nie – v nastaveniach fotoaparátu „Najkompatibilnejší“).

## Odpovede na správy, havarované vozidlá vypnuté (10. 11. 2026, 21:25)
- `supabase/24`: predajca odpovedá kupujúcemu v „Správy“ (`seller_reply`), len ak kupujúci zadal e-mail (`messages.buyer_email`). Kupujúci píše cez tajný odkaz `/sprava/<token>` (`thread_get`, `thread_reply`, až po odpovedi predajcu). Predajca token nevidí. E-maily posiela funkcia `odpovede` z fronty `reply_outbox()`; zapnutie e-mailov `NEXT_PUBLIC_EMAIL_REPLIES=1` až po Brevo (návod `supabase/README.md`).
- Havarované vozidlá sú **skryté** (`web/lib/features.ts`, `CARS_ENABLED`; zapnutie `NEXT_PUBLIC_CARS=1`). Kód a tabuľky ostali.

## Cookies overené, VIN pre všetky vozidlá (11. 11. 2026, 17:45)
- Cookies s Google Analytics overené v prehliadači (`testy-e2e/test_cookies.js`, 18/18): nič pred súhlasom, rovnocenné tlačidlá, odvolanie v pätičke a na /cookies zmaže _ga cookies.
- VIN (`web/lib/vin.ts`): WMI s druhom vozidla (motorka Honda `JH2` vs auto `JHM`), rok len pri výrobcoch, ktorí ho zapisujú do 10. znaku; dvojznačný rok = obe možnosti. Ročník z VIN sa **nenastavuje ako filter**, len sa zobrazí. Ak značka nie je v zvolenom druhu vozidla, úvod prepne druh. Test `testy-e2e/test_vin.mjs` – každá značka z tabuľky VIN musí byť v katalógu.

## Kolesá s jedným rozmerom (11. 11. 2026, 18:10)
- `supabase/25`: „Kolesá s pneumatikami“ stačí s rozmerom pneumatiky (šírka, profil, priemer) alebo disku (rozteč, priemer). `wheelMissing`/`wheelHalves` v `lib/types.ts`. Hľadanie (`l.specs @> sp`) porovnáva len vyplnené parametre.

## Vzhľad C „Bez rečí“ a hromadne z fotiek (11. 11. 2026)
- Majiteľ vybral smer C z návrhov (Claude Design „autosuciastky.eu – nový dizajn“). Písmo **Inter** (`@fontsource-variable/inter`) na všetko, aj na čísla dielov (tabuľkové číslice). IBM Plex odinštalované.
- Úvod: žiadny veľký úvodný pás – hneď petrolejová lišta hľadania („Hľadám diely na“ Značka / Model / Motorizácia / Časť auta + žlté „Hľadať“), pod ňou „Mám číslo dielu“ a „Mám VIN“, potom vľavo zoznam častí auta s počtami a filtre, vpravo výsledky ako riadky (fotka | údaje | cena a telefón). Na mobile sú číslo/VIN a filtre zbalené za tlačidlami.
- Sekcie v hlavičke sú podčiarknuté záložky (nie žltý pás). Cena má žltý „zvýrazňovač“, žltá inak len na „Hľadať“ a TOP. Pätička je biely pás cez celú šírku.
- CSS: vrstva „Vzhľad C“ na konci `web/app/globals.css` (prepisuje staršie vrstvy). Rohy max. 6 px a bez tieňov platí ďalej.
- **Hromadne z fotiek** (záložka portálu): „Nové inzeráty z fotiek“ (`components/seller/FromPhotos.tsx`) – predajca nahrá všetky fotky naraz, vyberie rozoberané vozidlo alebo značku/model/ročník a raz zadá stav, záruku, odovzdanie, mesto a telefón; klikaním označí fotky jedného dielu → „Vytvoriť diel z označených“ (alebo „Každá fotka = 1 diel“), doplní názov (bežné názvy doplnia kategóriu a stranu), číslo dielu a cenu → „Zverejniť“. Popis vznikne sám (vozidlo + spoločný doplnok). Pneumatiky a disky sa takto nepridávajú (potrebujú rozmery – bežný formulár). Druhý režim „Doplniť fotky k existujúcim inzerátom“ je pôvodné priradenie podľa názvu súboru.
- Menu portálu predajcu je v skupinách s nadpismi: Prehľad (Nástenka, Moje inzeráty), Pridať inzeráty (Jeden inzerát, Hromadne z fotiek, Import z CSV, Z auta na diely), Kupujúci (Správy od kupujúcich, Dopyty na diely), Môj účet (Profil a nastavenia). Na mobile záložky bez nadpisov. `NAV_GROUPS` v `components/seller/Portal.tsx`.

## Farby modrá + žltá (11. 11. 2026, 20:45) – NAHRADENÉ indigovou (21:15)
- Majiteľ: priveľa odtieňov zelenej, zle čitateľné a nudné. Petrolejová a zelené odtiene sú preč.
- Hlavná farba **modrá #1840a0** (`--pet`, svetlejšia `--pet2` #2456cc, odkazy `--link` #1c4fc4): hlavička, lišta sekcií a lišta hľadania tvoria jeden modrý blok; logo a texty v ňom biele.
- **Žltá #ffd43b** (`--acc`): tlačidlo hľadania, „Hľadať“, aktívna sekcia (podčiarknutie), vybraný druh vozidla, zvýrazňovač ceny, TOP, pruh pri vybranej časti auta.
- Texty neutrálne sivé (#1d2127, #565e69), tmavý režim neutrálny (#101216 / #191c22). Zelená len pre stav „v poriadku“ (`--ok`).
- CSS: vrstva „Farby modrá + žltá“ úplne na konci `web/app/globals.css`.

## Indigová, logo, Rady a návody (11. 11. 2026, 21:15) – farby NAHRADENÉ grafitovou + oranžovou (12. 11.)
- Modrá #1840a0 bola podobná autobazar.eu → hlavná farba **tmavá indigová #1a2d6d** (`--pet`, `--pet2` #2f49a8, odkazy #2742b0), žltá #ffd43b ostáva. Tmavý režim `--pet` #18275e.
- **Logo** (`components/Logo.tsx`): žltý náboj kolesa s 5 otvormi v indigovom štvorci + „autosuciastky“ a žlté „.eu“. V hlavičke bez štvorca. Ikony: `app/icon.svg`, `app/apple-icon.png`, `public/icons/*` (generované z icon.svg).
- **Pás na úvode** medzi hlavičkou a hľadaním (`components/HomeIntro.tsx`): logo, krátky popis portálu a „Rady a návody“ – návody z `lib/navody.tsx` ako články. Nový článok = nová položka v `NAVODY` (pribudne aj tu, na /navody a v mape webu).
- **Z auta na diely**: pri každom diele tlačidlo „Fotky“ (najviac 8); diel s fotkou sa hneď zverejní, bez fotky vznikne pozastavený (`createFromDonor`).

## Svetlá lišta hľadania, filtre až po hľadaní (11. 11. 2026, 22:00)
- Lišta hľadania je **biela karta** na sivom pozadí (nie tmavomodrý blok): druh vozidla ako záložky karty (vybraná biela so žltým pásikom), polia s okrajom `--field`, „Hľadať“ a „Zobraziť pneumatiky“ indigové, „Mám číslo dielu“ a „Mám VIN“ ako svetlosivé políčka. Indigová hlavička ostáva. CSS: vrstva „Svetlá lišta hľadania“ na konci `globals.css`.
- **Bočné filtre** (časť auta, cena, stav, mesto…) sa na úvode ukážu až keď človek hľadá: klikne „Hľadať“/číslo dielu/VIN/najhľadanejší diel, vyberie značku, časť auta alebo filter, alebo je v Pneumatikách (`searched` v `Home.tsx`, trieda `no-side`).

## Grafit + oranžová a blog (12. 11. 2026) – farby NAHRADENÉ bielou + korálovou (19:30), blog platí
- Žlto-modrú používa aj autobazar.eu → nová kombinácia: **grafitová #24282e** (`--pet`; hlavička s oranžovou linkou dole, štítky, telefón) a **oranžová #ff7a1a** (`--acc`, text na nej tmavý `--accink`): „Hľadať“, lupa v hlavičke, aktívna sekcia, vybraný druh vozidla, zvýrazňovač ceny, TOP. Odkazy `--link` #b8420b (tmavý režim #ff9a52). Logo: oranžový náboj kolesa (`components/Logo.tsx`, `app/icon.svg`, ikony v `public/icons`). Žltá ani modrá sa nepoužívajú. CSS: vrstva „Grafit + oranžová“ na konci `globals.css`.
- **Blog**: `lib/blog.tsx` (články ako dáta: nadpis, popis, dátum, téma, fotka, text), stránky `/blog` a `/blog/<slug>` (štruktúrované dáta BlogPosting), karta `components/BlogCard.tsx`, odkaz v hlavičke, pätičke a v mape webu. Na úvode (`components/HomeIntro.tsx`) vľavo čo portál ponúka a tlačidlá „Hľadať diel“ / „Predávam diely“, vpravo **3 najnovšie články** s fotkou.
- Fotky článkov: **Unsplash, len s licenciou Unsplash (zadarmo)** – nie Unsplash+; načítavajú sa z images.unsplash.com (povolené v CSP `img-src`), pri fotke „Foto: autor / Unsplash“. Fakty v článkoch overovať (zdroje: slovensko.sk, rpzv.sk, výrobcovia pneumatík) a pri právnych veciach pridať upozornenie.

## Pneumatiky, disky, puklice a farby F (12. 11. 2026, 19:30)
- Texty: „**Použité autodiely**“ – nepísať „autodiely z vrakovísk“ (vrakoviská sa môžu spomenúť ako predajcovia).
- **Kupujúci – Pneumatiky a disky** (`/?kat=kol`): bez záložiek druhov vozidiel (hľadá sa vo všetkých); typy Pneumatiky / Disky / Kolesá (disk s pneumatikou) / **Puklice** / Všetko (adresa `typ=puklice`). Kolesá sa hľadajú len podľa disku (priemer, rozteč, šírka, ET, materiál), puklice podľa priemeru. Bočný filter Stav len „Nové aj použité / Nové / Použité“ (`WHEEL_CONDS`, hodnota `pouzite` = všetko okrem „Nový“).
- **Predajca**: v menu „Pridať inzeráty“ položka **„Pneumatiky, disky, puklice“** (záložka `wheels`, `ListingForm` s `wheelOnly`): kroky „Čo predávate → Auto (nepovinné) → …“, prvá otázka dlaždice (`WHEEL_SUBS`) + „Alebo iné“, druh vozidla sa nepýta (vtype podľa podkategórie). V bežnom formulári je kategória Pneumatiky a disky skrytá a hore je odkaz na tento formulár. Úprava existujúceho inzerátu z `kol` otvorí tento režim.
- `supabase/26` (ostrá DB): pri puklicích povinný priemer (`specs.rd`), `search_listings` pozná `wtype` „puklice“ a stav „pouzite“. Test `supabase/testy/33_test_26.sql`.
- ~~Farby F – biela a korálová~~ (nahradené G1, pozri nižšie): biela hlavička s tmavým textom, jedna výrazná farba **korálová #ff4b3e** (`--acc`, biely text) na tlačidlá, aktívnu sekciu, logo a TOP; odkazy #c9302a; text #14161a. Logo: korálový náboj kolesa (v hlavičke bez štvorca, inde v čiernom štvorci). Tmavý režim: tmavá hlavička (`--card`). CSS: vrstva „Biela a korálová“ na konci `globals.css`. Pri návrhoch farieb ukazovať majiteľovi viac možností na obrázku a nechať ho vybrať.

## Tmavosivá a žltá, Iná značka, správy (12. 11. 2026, 20:15)
- **Farby G1 (vybral majiteľ)**: tmavosivá hlavička a pás sekcií #2b2f36 so žltou linkou dole, **žltá #ffc61a** s tmavým textom (`--acc`/`--accink`) na hlavné tlačidlá, lupu, aktívnu sekciu, vybraný druh vozidla, TOP a zvýrazňovač ceny. Žltá nikdy ako text na bielom – odkazy #8a5a00 (tmavý režim #ffd25a). Logo: žltý náboj kolesa (`Logo.tsx`, `app/icon.svg`, ikony). CSS: vrstva „Tmavosivá a žltá“ na konci `globals.css`.
- Úvod: bez zoznamov „Diely podľa mesta“ a „Použité diely podľa značky“ (ostali „Diely podľa auta“ a „podľa kategórie“, ak sú inzeráty). Stránky miest a značiek sú ďalej v mape webu.
- Detail inzerátu: **popis hneď pod tlačidlom telefónu** (`.ddesc`), nie pod fotkami.
- **Iná značka / Iný model** (`supabase/27`): značka „Iná značka“ a pri každej značke model „Iný model“ (pri iných druhoch „Iný model (dodávka/nákladné/autobus/motorka)“) – v zoznamoch vždy na konci (`sortCatalog`). Predajca napíše presné auto do názvu alebo popisu; `carName` ich zobrazuje ako „Iné vozidlo“ / bez modelu.
- **Správy**: e-mailom ide len **odpoveď predajcu kupujúcemu** (`reply_outbox` od 27 vynecháva odpovede kupujúceho). Odpoveď kupujúceho cez `/sprava/<token>` predajca vidí len v portáli (Správy). Kým nie sú zapnuté e-maily (Brevo + doména, `NEXT_PUBLIC_EMAIL_REPLIES=1`), predajca posiela odpoveď tlačidlom „Poslať e-mailom“ (mailto).
- Blog: článok o vrakovisku nahradený „Autobatéria v zime“ (`/blog/autobateria-v-zime`), stará adresa presmeruje na `/blog`.


## Registrácia a kontrola zákonov (12. 11. 2026, 19:55)
- V hlavičke je tlačidlo **Registrácia** (žlté, `.regbtn`) vedľa „Prihlásenie predajcu“ – len pre neprihlásených, vedie na `/pre-predajcov?registracia=1`.
- Overené na Slov-Lexe: 22/2004 § 4 (znenie od 28. 6. 2025), 108/2024 § 11 ods. 6, § 16, § 20a (znenie od 27. 9. 2026), 264/2022 (regulátor = Rada pre mediálne služby, koordinátor digitálnych služieb).
- Každý zoznam inzerátov musí mať odkaz „Ako zoraďujeme ponuky“ (§ 16 ods. 2). Pri hodnoteniach text „Ako overujeme hodnotenia“ – kúpu neoverujeme (§ 11 ods. 6 písm. a).
- Skrytý inzerát: dôvod + „rozhodol človek“ + možnosti nápravy (DSA čl. 17). Koordinátor digitálnych služieb: Rada pre mediálne služby (podmienky časť 4 a 8, pätička).
- Fotky z cudzích webov nenačítavať priamo v prehliadači (IP návštevníka = osobný údaj) – cez `/_next/image` (`images.remotePatterns` v `next.config.ts`). V CSP `img-src` preto nie je Unsplash.
- Keď bude TOP platený: označiť ho ako platené zvýraznenie/reklamu (zákon 108/2024, príloha – nekalé praktiky) a upraviť `/ako-zoradujeme`.

## Cookies pripravené na GA, vozidlá na úvode, mobil (12. 11. 2026, 20:40)
- Lišta cookies je **vždy so súhlasom** (Prijať všetky / Odmietnuť / Nastavenia, `CONSENT_UI` v `lib/consent.ts`, `CONSENT_VERSION` 3) a menuje Google Analytics. Bez `NEXT_PUBLIC_GA_ID` sa súhlas len uloží, nič sa nenačíta; texty na /cookies a v zásadách dopĺňajú „zatiaľ nie je spustené“. Pri zapnutí GA netreba nič meniť; pri inom novom nástroji zvýšiť `CONSENT_VERSION`.
- Úvod: odkazy na autá sú v skupinách podľa druhu vozidla („Diely na autobusy“…) a ukáže sa **len skupina zvoleného druhu** (aj kategórie s počtami pre ten druh; „Všetky vozidlá“ = všetko). `Home.tsx` nastaví `<html data-vt>`, skrýva CSS vrstva „Odkazy podľa druhu vozidla“. „Iná značka/Iný model“ sa tam neukazuje. Nepísať „auto“ tam, kde môže byť autobus, nákladné auto alebo motorka – „vozidlo“.
- Mobil (do 640 px): druhy vozidiel = 6 tlačidiel v mriežke 3 × 2 s nadpisom „Na aké vozidlo hľadáte diel?“, vybrané žlté.
- Zmazanie v portáli: vždy `components/seller/ConfirmDelete.tsx` (otázka s názvom, čo sa stane, „Zmazať natrvalo“ + „Ponechať“), nie „Naozaj zmazať? / Nie“. Text v tlačidle s `display:flex` obaliť do jedného `<span>` (inak zmizne medzera medzi slovami).

## Číslo dielu, registrácia, GDPR hostingu (13. 11. 2026, 11:05)
- `supabase/28` (ostrá DB): `search_text` obsahuje číslo dielu aj bez medzier/pomlčiek (v triggri BEFORE sa počíta z `oem`, generovaný `oem_key` tam ešte nie je); v slovách s číslicami sa neskracujú koncovky ani netolerujú preklepy („5E1941016“ nenájde „5E1941015“). Test `supabase/testy/35_test_28.sql`.
- Súhlasy pri registrácii: pôvodný text, menšie sivé písmo (`.pp-chk.pp-legal`). Bežné `.pp-chk` vo formulároch nemeniť.
- GDPR hostingu: Supabase má DPA so SCC aj na bezplatnom pláne (platí prijatím podmienok). Vercel Hobby DPA nemá (len Pro/Enterprise), je len na nekomerčné použitie a obsah môže použiť na trénovanie AI → pred spustením naostro Vercel Pro alebo hosting v EÚ.

## Doména autosuciastky.eu (13. 11. 2026, 19:45)
- Ostrý web: **https://autosuciastky.eu** (doména u Websupportu, `www` presmeruje na hlavnú). Stará adresa rozoberacka.vercel.app presmeruje na doménu (`next.config.ts`, podľa `NEXT_PUBLIC_SITE_URL`).
- DNS vo Websupporte: A `@` → 216.198.79.1, CNAME `www` → 328ef0a25df83cb1.vercel-dns-017.com (hodnoty z Vercelu → Settings → Domains). Pri zmene hostingu zmeniť len tieto dva záznamy. MX/TXT/mail záznamy sú pre e-maily Websupportu – nemazať.
- Supabase Auth: Site URL https://autosuciastky.eu, Redirect URLs https://autosuciastky.eu/** (+ stará adresa).
- Google Search Console: vlastníctvo `sc-domain:autosuciastky.eu`, účet autosuciastky.eu@gmail.com, overenie TXT záznamom vo Websupporte (nemazať), odoslaná `sitemap.xml`.

## Blog a SEO článkov (13. 11. 2026, 21:00)
- Článok v `lib/blog.tsx` má `title` (H1, môže byť dlhý), `seoTitle` (titulok pre Google, najviac ~40 znakov, doplní sa „ | autosuciastky.eu“), `description` 120 – 160 znakov, voliteľne `updated` (dátum úpravy – dateModified a mapa webu) a `faq` (3 – 4 otázky; zobrazia sa pod článkom ako „Časté otázky“ a ako FAQPage). Odpovede vo FAQ musia sedieť s textom článku.
- Každý článok má 2+ vnútorné odkazy (na sekciu webu, návod alebo iný článok) a na konci výzvu (`blog-tip`). Pri právnych a technických veciach upozornenie (`mute small`).
- Články: ojazdené auto, autobatéria, zimné pneumatiky, označenie pneumatík a diskov, originálny vs. neoriginálny diel, ako predať použité diely.

## Veterány (13. 11. 2026, 22:15)
- Druh vozidla `veterany` („Veterány“) – záložka pri hľadaní hneď vedľa Osobných áut, rovnaké funkcie ako osobné autá. **Nie je v hlavičke** (majiteľ nechce).
- Patria sem osobné autá, ktorých **výroba sa začala najneskôr v roku 1989**; Favorit je osobné auto. Generácie od 1990 a tie, ktoré už sú v osobných autách (Golf III, E34, 205…), sú v osobných autách.
- Katalóg: `supabase/katalog/14_veterany.txt` (časti `!druh veterany` a `!druh osobne`) → `python3 generuj.py` → `supabase/30_katalog_veterany.sql`; demo `npm run gen:catalog`. Z pamäte – nahradiť TecDoc.
- `supabase/29`: druh `veterany` v kontrolách, ročník od 1900, kategórie osobných áut aj pre veterány (okrem „Hybrid a elektropohon“), univerzálna kategória `vet` „Dobové doplnky, emblémy a literatúra“.
- Pri veteránoch je číslo dielu nepovinné (`oemOptional` v `lib/types.ts`), VIN sa pri nich neponúka.

## Mobil – bez posúvania do strán (13. 11. 2026, 22:40)
- Žiadny prvok nesmie byť širší ako obrazovka: gridy s jedným stĺpcom písať `grid-template-columns:minmax(0,1fr)` (nie automatický stĺpec – `width:max-content` ho roztiahne). Kontrola: na 360 a 390 px `document.documentElement.scrollWidth` = šírka okna.
- Hlavička na mobile: „Prihlásenie“ s ikonou a „Registrácia“ rovnako vysoké; pás sekcií na mobile „Autodiely / Pneumatiky / Dopyt / Blog“ (celé názvy cez `.hide-s` od 521 px).

## Next.js 16 a registrácia firmy (13. 11. 2026, 23:59)
- Web beží na **Next.js 16** (Turbopack). Kontrola kódu: `npm run lint` (ESLint flat config v `web/eslint.config.mjs`), `next lint` neexistuje. Pravidlá React Compilera (`react-hooks/set-state-in-effect` a i.) sú vypnuté – compiler nepoužívame.
- Podnikateľ musí pri registrácii aj v profile vyplniť **obchodné meno, IČO a sídlo** (označené *, chyba pri poli). IČO = 8 číslic + kontrolná číslica (`icoError` v `lib/legal.ts`). Databáza (supabase/14) nedovolí podnikateľovi bez IČO a sídla zverejniť inzerát.
