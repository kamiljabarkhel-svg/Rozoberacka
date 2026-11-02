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
