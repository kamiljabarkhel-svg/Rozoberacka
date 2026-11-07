# Test celého postupu (lokálne, bez internetu)

Napodobenina Supabase na tomto počítači: PostgreSQL 16 so súbormi `supabase/01–10`, PostgREST 12.2.3 a `gw.js`
(prihlásenie, fotky a REST na porte 54321). Web beží na porte 3000 s týmito kľúčmi (len lokálne, nie sú tajné).

`test_cely_postup.js` (Playwright) prejde 47 krokov: registrácia, potvrdenie e-mailu, prihlásenie, profil, pridanie
inzerátu s fotkami a „pasuje aj na“, zobrazenie u kupujúceho, hľadanie podľa OEM a podľa auta, telefón, správa
predajcovi, čísla na nástenke, úprava, TOP, duplikovanie, pozastavenie, mazanie, CSV import, darcovské auto, export CSV a hromadná cena, dopyt na diel s ponukou, SEO detailu, nahlásenie a správca, odhlásenie, export údajov a zrušenie účtu.

Cesty v `start.sh` a `gw.js` sú z testovacieho prostredia agenta; pred spustením ich upravte.
Ostrá Supabase sa týmto testom nemení.

**Produkčná verzia (7. 11. 2026):** `web/` zostaviť s premennými testovacej Supabase (`NEXT_PUBLIC_SUPABASE_URL=http://127.0.0.1:54321` a anon kľúč zo `start.sh`), spustiť `prodstart.sh` a test pustiť s `RZ_PROD=1` (mapa webu sa v produkcii obnovuje raz za hodinu, preto sa v nej mestá a predajcovia nekontrolujú). Test zlyhá aj vtedy, keď bezpečnostné hlavičky (CSP) niečo zablokujú. Napodobenina prihlásenia (`gw.js`) vie aj dvojité overenie (TOTP) – kód pre test dáva `/e2e/totp?secret=…`.
