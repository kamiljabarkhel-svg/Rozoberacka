# Databáza Rozoberačky (Supabase)

## Súbory
1. `01_schema.sql` – tabuľky, bezpečnosť (Row Level Security), funkcie a úložisko fotiek
2. `02_kategorie.sql` – 11 kategórií a 53 podkategórií dielov
3. `03_katalog.sql` – 6 najčastejších značiek na Slovensku (Škoda, Volkswagen, Audi, BMW, Kia, Hyundai): 98 modelov, 706 motorizácií

## Ako ich spustiť v Supabase
1. Na supabase.com si založte projekt (región EU, napr. Frankfurt).
2. Otvorte **SQL Editor → New query**.
3. Vložte obsah `01_schema.sql` a kliknite **Run**. Potom rovnako `02_kategorie.sql` a `03_katalog.sql`.

## Čo databáza stráži (overené testom 2. 11. 2026 na PostgreSQL 16)
- Predajca mení len svoje inzeráty a fotky len vo vlastnom priečinku.
- Predajca si nemôže sám nastaviť „Overený predajca“.
- Pozastavené a predané inzeráty kupujúci nevidia.
- Telefón sa nedá stiahnuť zo zoznamu. Kupujúci ho získa len cez funkciu `reveal_phone`, ktorá pripočíta odkrytie.
- `listing_vehicles` vráti všetky autá, na ktoré diel pasuje: vlastné auto, „pasuje aj na“ a inzeráty s rovnakým OEM (bez ohľadu na medzery a pomlčky).

Test: `testy/` (napodobenina Supabase + 11 kontrol). Na skutočnom Supabase sa testuje znova po spustení.

## Pozor
Katalóg je z prototypu, písaný z pamäte. Pred ostrou prevádzkou ho treba nahradiť overeným zdrojom.
