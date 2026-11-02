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

Zámerne NEROBÍME teraz: online platby a doručenie cez portál (RRR, Opisto), hľadanie podľa ŠPZ (Opisto), platforma pre servisy so zľavou (Opisto.pro), blog, newsletter. Sú v denníku ako neskoršie nápady.
