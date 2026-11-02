# Rozoberačka – denník stavby (pracovná kópia pre Claude Code)

Hlavná verzia denníka je v Claude Docs „Rozoberačka – denník stavby“. Tento súbor je jeho pracovná kópia pre agenta Dirigent.

## Otvorené úlohy
- [ ] P2 Doplniť do databázy stĺpce a tabuľku `messages` pre nové funkcie (CLAUDE.md, sekcia Funkcie podľa konkurencie)
- [ ] P3 Neskôr zvážiť: online platby a doručenie cez portál, platforma pre servisy, blog s radami k modelom, newsletter
- [ ] P1 Po založení Supabase: doplniť `web/.env.local` a overiť web so skutočnou databázou (zatiaľ vyskúšaný len ukážkový režim)
- [ ] P1 Nasadiť web na Vercel (náhľad pre majiteľa)
- [ ] P2 Hľadanie beží v prehliadači nad max. 1000 aktívnymi inzerátmi – pri väčšom počte presunúť do databázy (funkcia na serveri)
- [ ] P2 Odkrytie telefónu: CAPTCHA a limit na serveri (teraz len 1× za reláciu prehliadača)
- [ ] P2 Detail inzerátu sa načítava v prehliadači – pre Google (SEO) vykresľovať na serveri
- [ ] P3 Ikony pre kategórie Kolesá, Podvozok, Brzdy, Chladenie, Palivo (teraz náhradná ikona)
- [x] P1 Prepnúť repozitár na Private (Settings → Danger Zone → Change visibility)
- [ ] P3 Rozhovory s 10 vrakoviskami – odložené
- [ ] P3 Pilot s 5 až 20 vrakoviskami – odložené
- [ ] P2 Cieľová skupina a kraj pilotu (návrh: vrakoviská, značky Škoda a VW) – potvrdiť
- [ ] P1 PRIORITA: nasadiť `supabase/` do Supabase a napojiť web (návrh hotový a otestovaný)
- [x] P1 GitHub: repozitár `rozoberacka` a pripojenie ku Claude
- [ ] P1 Katalóg áut z overeného zdroja (napr. licencovaný TecDoc); súčasný je z pamäte
- [ ] P1 Právny základ: GDPR, obchodné podmienky, forma podnikania
- [ ] P1 Doména a hosting
- [ ] P2 Doplniť chýbajúce modely (Superb I, Felicia, Sharan, Sprinter, Jumper…) – čaká na rozhodnutie
- [ ] P2 Vyskúšať nahrávanie fotiek, import CSV a tmavý režim
- [x] P2 Overiť vzhľad so skutočnými písmami (Sora, Manrope) – web ich má v sebe (@fontsource)
- [ ] P2 Ochrana proti spamu, nahlasovanie inzerátov
- [ ] P3 CSV import: stĺpec „pasuje na“
- [ ] P3 Zarábanie: zvýraznenie inzerátov, predplatné pre firmy
- [ ] P3 Hodnotenie predajcov
- [ ] P3 Plné dekódovanie VIN (platená služba)

## Denník
| Kedy | Čo sme urobili | Čo to znamená |
| --- | --- | --- |
| 2. 11. 2026, 18:01 | Prototyp: oprava TOP inzerátov prilepených pri scrollovaní, povinné polia vo formulári predajcu (OEM, značka, model, ročník, fotka, popis…), nová nástenka predajcu s číslami, grafom a úlohami, hromadné akcie v Mojich inzerátoch | Ostrá verzia podľa CLAUDE.md, sekcia Formulár predajcu a nástenka |
| 2. 11. 2026, 17:46 | Analýza konkurencie (RRR.lt/Ovoko, Opisto, Autobazar.sk) a 9 nových funkcií v prototype: OEM hľadanie, najhľadanejšie diely, počítadlo, nové polia (strana, km, odskúšané, vrátenie), uložené hľadanie, správa predajcovi, zdieľanie odkazu, TOP, bezpečné mazanie | Ostrá verzia má podľa CLAUDE.md tieto funkcie mať tiež |
| 2. 11. 2026, 17:47 | Krok 4 – verejné stránky ako Next.js projekt v `web/` (Next 15.5.28, TypeScript, Tailwind): úvod s hľadaním podľa auta, kategórie, VIN a textu, facety, filtre, obľúbené, „Načítať viac“, detail s galériou, „Pasuje na“ (zhoda OEM) a telefónom na klik, stránka „Pre predajcov – pripravujeme“. Dátová vrstva `web/lib/data.ts`: so Supabase kľúčmi číta databázu, bez nich ukážkový režim (katalóg vygenerovaný zo `supabase/02` a `03`). `npm run build` prešiel, Playwright: 0 chýb v konzole, mobil 390 px bez pretekania. Statický náhľad v jednom súbore | Web sa dá pozrieť a vyskúšať aj bez Supabase; po založení Supabase stačí doplniť 2 kľúče |
| 2. 11. 2026, 17:45 | Repozitár kamiljabarkhel-svg/Rozoberacka prepnutý na Private (urobil majiteľ). Overené cez GitHub API: „private: true“ | Kód a dáta projektu nevidí nikto cudzí |
| 2. 11. 2026, 17:42 | Denník zlúčený do vetvy `main` (odteraz sa ukladá do main). Návod `supabase/README.md`: nasadenie v 8 krokoch (Free, Frankfurt, súbory 01→02→03, kontrola počtov 6/98/706/11/53, RLS, bucket) a čo robiť pri chybe „must be owner of table objects“ – storage časť je na konci `01_schema.sql`, chýbajú len 3 pravidlá pre fotky, doklikajú sa v Storage → Policies. Pridaná úloha: repozitár na Private | Majiteľ môže nasadiť databázu aj pri tejto chybe; kód ani databáza sa nemenili |
| 2. 11. 2026, 17:30 | Session: zhrnutie stavu, navrhnutý prvý krok – založiť projekt v Supabase (región EU, Frankfurt) a v SQL Editore spustiť `01_schema.sql`, `02_kategorie.sql`, `03_katalog.sql`, potom kontrola počtov. Kód ani databáza sa nemenili | Čaká sa na súhlas majiteľa a založenie účtu Supabase |
| 2. 11. 2026, 17:21 | GitHub: repozitár kamiljabarkhel-svg/rozoberacka, nainštalovaná aplikácia Claude, nahraný celý projekt | Agent v Claude Code môže začať kódovať |
| 2. 11. 2026, 17:03 | Rozhodnutia: databáza je priorita, katalóg 6 najčastejších značiek, kategórie podľa dopytu; rozhovory a pilot neskôr. Hotová databáza v `supabase/`, 11 testov bezpečnosti prešlo | Agent môže začať napojením webu na Supabase |
| 2. 11. 2026, 16:50 | Denník, mapa trhu, agent Dirigent | Jedno miesto na postup a úlohy |
| 2. 11. 2026, 16:31 | Kontrola katalógu, 5 opráv | Presnejší, stále z pamäte |
| 2. 11. 2026, 16:26 | Moderný dizajn | Platný vzhľad |
| 2. 11. 2026, 16:20 | Opravy rozhrania na mobile | Bez pretekania |
| 2. 11. 2026, 16:19 | Balík pre Claude Code | Základ ostrej verzie |
| 2. 11. 2026, 15:45 | Zhoda OEM s motorizáciami | „Pasuje na“ v detaile a vo vyhľadávaní |
| skôr, čas nezaznamenaný | Portál predajcu, katalóg, VIN, vyhľadávanie podľa auta, prototyp | Funkčné demo |

## Myšlienky dňa
Myšlienky píše majiteľ v chate s Claude; agent ich sem len zapisuje.
