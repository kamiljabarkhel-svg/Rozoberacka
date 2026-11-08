# Databáza Rozoberačky (Supabase)

## Súbory
1. `01_schema.sql` – tabuľky, bezpečnosť (Row Level Security), funkcie a úložisko fotiek
2. `02_kategorie.sql` – 11 kategórií a 53 podkategórií dielov
3. `03_katalog.sql` – 6 najčastejších značiek na Slovensku (Škoda, Volkswagen, Audi, BMW, Kia, Hyundai): 98 modelov, 706 motorizácií

## Nasadenie do Supabase (krok za krokom)
1. Na supabase.com sa prihláste a kliknite **New project**. Plán **Free**, región **Central EU (Frankfurt)**. Heslo k databáze si uložte do správcu hesiel (nikam ho nevkladajte do kódu).
2. Počkajte, kým sa projekt pripraví (pár minút).
3. Vľavo otvorte **SQL Editor → New query**.
4. Vložte celý obsah `01_schema.sql` a kliknite **Run**. Má vyjsť „Success. No rows returned“.
5. Novú query: vložte `02_kategorie.sql` → **Run**.
6. Novú query: vložte `03_katalog.sql` → **Run**. Poradie 01 → 02 → 03 je dôležité.
7. Kontrola počtov – vložte a spustite:
   ```sql
   select (select count(*) from public.brands)        as znacky,
          (select count(*) from public.models)        as modely,
          (select count(*) from public.engines)       as motorizacie,
          (select count(*) from public.categories)    as kategorie,
          (select count(*) from public.subcategories) as podkategorie;
   ```
   Má vyjsť: **6 / 98 / 706 / 11 / 53**.
8. Kontrola bezpečnosti a úložiska:
   ```sql
   select tablename, rowsecurity from pg_tables where schemaname = 'public' order by tablename;
   select id, public from storage.buckets where id = 'listing-photos';
   select policyname, cmd, roles from pg_policies where schemaname = 'storage' and tablename = 'objects';
   ```
   - Pri všetkých 11 tabuľkách musí byť `rowsecurity = true`.
   - Bucket `listing-photos` musí existovať a mať `public = true`.
   - Pravidlá pre fotky – pozri tabuľku nižšie v časti „Kontrola pravidiel“.

## Keď `01_schema.sql` skončí chybou „must be owner of table objects“
Táto chyba znamená, že Supabase nedovolil vytvoriť pravidlá pre fotky (tabuľka `storage.objects`) cez SQL Editor.

**Súbor NESPÚŠŤAJTE znova.** Všetko pred chybou sa už uložilo (súbor nebeží ako jeden celok) a druhé spustenie by skončilo chybami „already exists“.

### a) Čo sa vykonalo a čo nie
- Časť o fotkách je **úplne na konci súboru** (posledných 10 riadkov). Všetko pred ňou – tabuľky, indexy, bezpečnosť (RLS), funkcie `reveal_phone`, `log_view`, `listing_vehicles` a ich práva – sa vykonalo.
- Chyba nastane na príkaze `create policy photos_upload on storage.objects …`.
- Za ním sa nevykonali už len 3 pravidlá pre fotky: `photos_upload`, `photos_own_read`, `photos_delete`. Nič iné za nimi nie je, preto netreba žiadny ďalší SQL súbor. Pravidlá sa doklikajú ručne (časť c).
- Pokračujte normálne súbormi `02_kategorie.sql` a `03_katalog.sql`.

### b) Vytvoril sa bucket `listing-photos`?
Príkaz na bucket je **pred** chybou, takže by sa mal vytvoriť. Overte to: vľavo **Storage** – v zozname musí byť `listing-photos` so štítkom **Public**.

Ak tam nie je, vytvorte ho ručne:
1. **Storage → New bucket**.
2. Name: `listing-photos` (presne takto, malými písmenami, s pomlčkou).
3. **Public bucket**: zapnúť.
4. Voliteľne (schéma to nenastavuje, je to len odporúčanie): **Restrict file upload size** 5 MB a **Allowed MIME types** `image/jpeg, image/png, image/webp`.
5. **Save**.

### c) Pravidlá pre fotky – ručné doklikanie
1. Vľavo **Storage → Policies**.
2. Pri buckete **listing-photos** kliknite **New policy → For full customization**.
3. Vyplňte podľa tabuľky, kliknite **Review** a **Save policy**. Zopakujte pre každé pravidlo (spolu 3).

| Policy name | Allowed operation | Target roles | Policy definition |
| --- | --- | --- | --- |
| `photos_upload` | INSERT | authenticated | `bucket_id = 'listing-photos' and (storage.foldername(name))[1] = auth.uid()::text` |
| `photos_own_read` | SELECT | authenticated | `bucket_id = 'listing-photos' and (storage.foldername(name))[1] = auth.uid()::text` |
| `photos_delete` | DELETE | authenticated | `bucket_id = 'listing-photos' and (storage.foldername(name))[1] = auth.uid()::text` |

Text do políčka **Policy definition** skopírujte presne (bez spätných úvodzoviek). Pri INSERT ho Supabase použije ako WITH CHECK, pri SELECT a DELETE ako USING – nič navyše písať netreba.

Čo pravidlá znamenajú:
- Predajca nahráva, vidí v zozname a maže fotky **len vo vlastnom priečinku** (priečinok = jeho ID používateľa).
- Kupujúci vidia fotky cez verejný odkaz, lebo bucket je **Public**. Na to netreba žiadne pravidlo.
- Pravidlo „verejné čítanie pre všetkých“ (SELECT pre anon) zámerne **nepridávame**: dovolilo by komukoľvek vypísať zoznam všetkých súborov všetkých predajcov.
- Pravidlo na úpravu (UPDATE) netreba: výmena fotky = zmazať starú a nahrať novú.

### Kontrola pravidiel
V SQL Editore spustite:
```sql
select policyname, cmd, roles from pg_policies where schemaname = 'storage' and tablename = 'objects';
```
Má vyjsť (poradie riadkov môže byť iné):

| policyname | cmd | roles |
| --- | --- | --- |
| photos_upload | INSERT | {authenticated} |
| photos_own_read | SELECT | {authenticated} |
| photos_delete | DELETE | {authenticated} |

Ak sa pravidlá klikali ručne a Supabase im pridal k názvu kód (napr. `photos_upload 1a2b3c_0`), nevadí to.

## Čo databáza stráži (overené testom 2. 11. 2026 na PostgreSQL 16)
- Predajca mení len svoje inzeráty a fotky len vo vlastnom priečinku.
- Predajca si nemôže sám nastaviť „Overený predajca“.
- Pozastavené a predané inzeráty kupujúci nevidia.
- Telefón sa nedá stiahnuť zo zoznamu. Kupujúci ho získa len cez funkciu `reveal_phone`, ktorá pripočíta odkrytie.
- `listing_vehicles` vráti všetky autá, na ktoré diel pasuje: vlastné auto, „pasuje aj na“ a inzeráty s rovnakým OEM (bez ohľadu na medzery a pomlčky).

Test: `testy/` (napodobenina Supabase + 11 kontrol). Na skutočnom Supabase sa testuje znova po spustení.

## Pozor
Katalóg je z prototypu, písaný z pamäte. Pred ostrou prevádzkou ho treba nahradiť overeným zdrojom.

## Doplnky (stav 3. 11. 2026)
Na ostrej Supabase sú spustené súbory 01 → 02 → 03 → 04 → 05.
- `04_funkcie.sql`: nové polia inzerátu, povinné polia v databáze, správy predajcovi, počítadlo na úvode.
- `05_bezpecnost_hladanie.sql`: limity podľa IP (telefón 40/h, správy 5/h, zobrazenie 1× na IP a deň, nahlásenie 5/h),
  stĺpcové práva (predajca nemení zobrazenia, TOP, overenie ani správy kupujúcich), TOP cez funkciu (max 3, 30 dní),
  záruka podľa zákona (firma min. 12 mesiacov, odstúpenie do 14 dní automaticky), nahlásenia, správcovia (`admins`),
  záznam akcií správcu (`admin_log`), hľadanie na serveri `search_listings` (bez diakritiky, tvary slov, preklepy, synonymá,
  OEM, auto vrátane „pasuje aj na“ a rovnakého OEM), limit fotiek 5 MB (JPEG, WebP, PNG).
- Testy: `testy/20_test_05.sql` (35 kontrol). `testy/10_test_bezpecnosti.sql` je starší a po súbore 04 už nesedí (chýbajú povinné polia), nahrádza ho 20.
- Správcu pridáte v SQL Editore: `insert into public.admins select id from auth.users where email = 'VAS@EMAIL';`

## Doplnky (3. 11. 2026, večer)
Na ostrej Supabase sú spustené aj `06_gdpr.sql` a `07_optimalizacia.sql`.
- `07`: pravidlá RLS volajú `(select auth.uid())` raz na dotaz, jedno pravidlo na akciu, indexy pre cudzie kľúče, pevná search_path, katalóg len na čítanie.
- Testy na ostrej databáze: `testy/20` + `testy/21` spojené do jednej transakcie, ktorá sa na konci zruší (48/48, databáza ostala prázdna).
- Security Advisor: zostávajú len upozornenia „SECURITY DEFINER funkciu môže volať verejnosť/prihlásený“. Sú zámerné: tieto funkcie sú API portálu (telefón, správa, nahlásenie, hľadanie, export, zrušenie účtu, funkcie správcu) a každá si sama kontroluje oprávnenie a limity.
- Auth: potvrdenie e-mailu zapnuté, minimálna dĺžka hesla 8, anonymné prihlásenie vypnuté.
- CHÝBA: vlastné SMTP (bez neho Supabase posiela e-maily len členom tímu, registrácia predajcov nefunguje), Site URL a Redirect URLs (po nasadení na Vercel).

## Doplnky (6. 11. 2026)
Na ostrej Supabase sú spustené aj `08` a `09` (6. 11. 2026, 22:40; obsah overený odtlačkom SHA-256). Nové nasadenie: v SQL Editore v poradí `08` → `09`, každý ako novú query, **Run** (upozornenie „destructive operations“ je kvôli príkazom `revoke`, nič sa nemaže).
- `08_darcovske_auta_dopyty_seo.sql`:
  - **Darcovské autá** (`donor_cars`): predajca si zapíše rozobraté auto (značka, model, motor, ročník, km, farba, voliteľne VIN) a z neho rýchlo pridá diely. Vidí ich len vlastník; inzerát môže odkazovať len na vlastné auto (`listings.donor_id`).
  - **Dopyt na diel** (`part_requests`, `part_offers`): kupujúci bez účtu zadá, čo hľadá; prihlásení predajcovia dopyt vidia a pošlú ponuku; kupujúci ju vidí na tajnej adrese `/dopyt/<kód>`. Limit 3 dopyty za hodinu a 10 za deň z jednej IP, platnosť 30 dní, zmazanie po 60 dňoch (`purge_old_data`).
  - `search_listings` vie filtrovať podľa darcovského auta, `seo_counts()` dáva počty pre SEO stránky a mapu webu, `export_my_data` obsahuje autá a ponuky.
- `09_katalog_opravy.sql`: opravené roky konca výroby (Superb III, Passat B8, BMW 5 G30, Kona, Kodiaq, Tiguan II) a 17 nových generácií (napr. Superb IV, Kodiaq II, Passat B9, Tiguan III, BMW 5 G60, Audi A3 8Y, A6 C8, Q5 FY, Kia Ceed III, Sportage V, Hyundai Tucson IV, i20 III) – zatiaľ bez motorizácií. Katalóg je stále z pamäte, overiť s TecDoc.
- Kontrola po spustení: `select count(*) from public.models;` má vyjsť **115**.
- Testy: `testy/22_test_08.sql` (19 kontrol). Na ostrej databáze prešiel v transakcii, ktorá sa na konci zrušila: 19/19, po teste 0 testovacích účtov, inzerátov, áut aj dopytov.

## Doplnky (6. 11. 2026, večer)
Na ostrej Supabase je spustený aj `10_predane_navrhy_hodnotenia_strazca.sql` (obsah overený odtlačkom SHA-256).
Test `testy/23_test_10.sql` prešiel priamo na nej v transakcii, ktorá sa zrušila: 31/31, databáza ostala čistá.
- **Predaný diel**: `listings.sold_at`, funkcia `listing_gone` – stránka predaného (do 180 dní) alebo pozastaveného dielu ostane s ponukou náhrad, bez telefónu a popisu.
- **Našepkávanie**: `search_suggest(text)` – názvy dielov z aktívnych inzerátov.
- **Hodnotenie predajcov**: `seller_reviews`, `rate_seller` – hodnotiť môže len kupujúci, ktorému predajca poslal ponuku na dopyt (overené súkromným kódom dopytu). Priemer v `sellers.rating_avg/rating_count`, správca skrýva cez `admin_hide_review`.
- **Strážca e-mailom**: `search_alerts`, `create_search_alert`, `confirm_search_alert`, `cancel_search_alert`. Dvojité potvrdenie, nepotvrdené sa mažú po 3 dňoch, všetky po 6 mesiacoch.
- **Súkromie predajcov**: z tabuľky `sellers` je verejných len 9 stĺpcov (čas súhlasu s podmienkami už nie).

### Strážca e-mailom – zapnutie (až po Brevo a doméne)
E-maily posiela Edge Function `supabase/functions/strazca` (otestovaná lokálne: `testy-e2e/test_strazca.mjs`, 7/7).
1. V Brevo overte doménu odosielateľa (napr. `upozornenia@vasadomena.sk`) a vytvorte API kľúč (SMTP & API → API Keys).
2. Supabase → **Edge Functions** → **Deploy a new function** → názov `strazca`, vložte obsah `index.ts` a `handler.ts` (dva súbory; ak editor dovolí len jeden, vložte `handler.ts` nad `index.ts`, zmažte riadok `import { run } …` a slovo `export` pred `type Env` a `async function run` nechajte) → Deploy. Pri funkcii vypnite „Verify JWT“ (chráni ju vlastné heslo `CRON_SECRET`).
3. Supabase → Edge Functions → **Secrets**: `BREVO_API_KEY`, `SITE_URL` (napr. https://vasadomena.sk), `MAIL_FROM`, `MAIL_FROM_NAME` (Rozoberačka), `OPERATOR` (KJ Trade s.r.o., IČO 57598142, Kvetná 1505/4D, 900 41 Rovinka) a `CRON_SECRET` (dlhé náhodné heslo).
4. SQL Editor – spúšťanie každých 10 minút (heslo uložené vo Vault, nie v kóde):
   ```sql
   create extension if not exists pg_net;
   select vault.create_secret('SEM_VLOZTE_CRON_SECRET', 'strazca_secret');
   select cron.schedule('rozoberacka-strazca', '*/10 * * * *', $$
     select net.http_post(
       url := 'https://sbfhmlayemaiinuismhh.supabase.co/functions/v1/strazca',
       headers := jsonb_build_object('x-cron-secret', (select decrypted_secret from vault.decrypted_secrets where name = 'strazca_secret'))
     ) $$);
   ```
5. Vo Verceli nastavte `NEXT_PUBLIC_EMAIL_ALERTS=1` a nasaďte web znova. Tlačidlo „Posielať nové diely e-mailom“ sa zobrazí pri uloženom hľadaní.

## Správca s dvojitým overením (7. 11. 2026)
Na ostrej Supabase je spustený `11_spravca_dvojite_overenie.sql` (obsah overený odtlačkom SHA-256); test `testy/24_test_11.sql` prešiel priamo na nej v zrušenej transakcii 11/11.
- Práva správcu (`is_admin()`) platia len pri prihlásení s kódom z aplikácie v mobile (úroveň `aal2`). Samotné heslo nestačí – databáza správcovi bez kódu neukáže nahlásenia, skryté inzeráty ani záznam akcií a odmietne všetky funkcie správcu.
- V Supabase je v Authentication → Multi-Factor zapnuté **TOTP (App Authenticator)** (overené 7. 11. 2026).
- **Ako sa stať správcom:** zaregistrujte sa na webe ako predajca, potom v SQL Editore spustite
  `insert into public.admins select id from auth.users where email = 'VAS@EMAIL';`
  Pri prvom otvorení `/admin` vás web prevedie nastavením aplikácie Google Authenticator alebo Microsoft Authenticator (QR kód) a odvtedy pri každom prihlásení do administrácie zadáte 6-miestny kód.
- **Stratený mobil:** v Supabase → Authentication → Users → váš účet → „Multi-factor authentication“ → zmazať faktor. Pri ďalšom otvorení `/admin` nastavíte novú aplikáciu.

## Oprava názvu podkategórie (7. 11. 2026)
`12_oprava_nazvu_podkategorie.sql`: „Polosi a kĺby“ → „Poloosi a kĺby“. Spustené na ostrej Supabase, kontrolný výpis podkategórií prevodovky potvrdil nový názov. Opravené aj v `02_kategorie.sql` (nová databáza) a v ukážkovom katalógu webu.

## Stavy „Nový“ a „Repasovaný“ (7. 11. 2026)
`13_stav_novy_repasovany.sql`: stav dielu môže byť Nový (nepoužitý), Repasovaný, Veľmi dobrý, Dobrý alebo Na opravu. Firma musí pri novom diele dať záruku 24 mesiacov, pri použitom a repasovanom aspoň 12 mesiacov (kontroluje databáza, `guard_listing`). Keď sa predajca zmení na firmu, jeho nové diely dostanú 24 mesiacov.
Spustené na ostrej Supabase (obsah overený odtlačkom SHA-256 c78b732b…), test `testy/25_test_13.sql` (8 kontrol) prešiel lokálne aj priamo na ostrej databáze v zrušenej transakcii 8/8; po teste 0 inzerátov a 0 testovacích účtov.

## Vyhlásenie predajcu: podnikateľ / súkromná osoba (7. 11. 2026)
`14_vyhlasenie_predajcu.sql` (zákon č. 108/2024 Z. z. § 16 – online trh musí kupujúcemu povedať, či predáva obchodník, a poučiť ho):
- `sellers.ico`, `sellers.address` (sídlo / miesto podnikania) sú pri podnikateľovi verejné; súkromná osoba ich nemá (trigger ich zmaže). IČO sa presunulo zo `seller_private`.
- `sellers.type_declared_at` – čas vyhlásenia (zapíše sa pri registrácii a pri každej zmene typu).
- Podnikateľ bez IČO a sídla nemôže zverejniť ani aktivovať inzerát (`guard_listing`).
- Test `testy/26_test_14.sql` (10 kontrol). Staršie testy 20–25 dávajú testovacím firmám IČO a sídlo.

## Spevnenie práv návštevníka (8. 11. 2026)
`15_spevnenie_prav.sql` – druhá vrstva ochrany popri RLS: anonym nemá ani právo na súkromné tabuľky (telefóny, správy, nahlásenia, záznamy správcu, odtlačky IP), nezapisuje priamo do žiadnej tabuľky (len cez funkcie) a nevidí čas vyhlásenia predajcu. Nikto okrem správcu databázy nemôže použiť TRUNCATE. Test `testy/27_test_15.sql` (12 kontrol); testy 20 a 26 upravené. Spustiť v SQL Editore (New query → vložiť celý súbor → Run).

