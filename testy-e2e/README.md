# Test celého postupu (lokálne, bez internetu)

Napodobenina Supabase na tomto počítači: PostgreSQL 16 so súbormi `supabase/01–09`, PostgREST 12.2.3 a `gw.js`
(prihlásenie, fotky a REST na porte 54321). Web beží na porte 3000 s týmito kľúčmi (len lokálne, nie sú tajné).

`test_cely_postup.js` (Playwright) prejde 37 krokov: registrácia, potvrdenie e-mailu, prihlásenie, profil, pridanie
inzerátu s fotkami a „pasuje aj na“, zobrazenie u kupujúceho, hľadanie podľa OEM a podľa auta, telefón, správa
predajcovi, čísla na nástenke, úprava, TOP, duplikovanie, pozastavenie, mazanie, CSV import, darcovské auto, export CSV a hromadná cena, dopyt na diel s ponukou, SEO detailu, nahlásenie a správca, odhlásenie, export údajov a zrušenie účtu.

Cesty v `start.sh` a `gw.js` sú z testovacieho prostredia agenta; pred spustením ich upravte.
Ostrá Supabase sa týmto testom nemení.
