# Rozoberačka – web (Next.js)

Verejná časť portálu: úvod s hľadaním (auto, kategória, VIN, text), výsledky s facetami, detail inzerátu s „Pasuje na“.

## Spustenie na počítači
```
cd web
npm install
npm run dev        # http://localhost:3000
```

## Režimy
- **Ukážkový režim** (predvolený): bez databázy, katalóg zo `supabase/02_kategorie.sql` a `03_katalog.sql`, vymyslené inzeráty. Na stránke je pás „Ukážkový režim“.
- **Supabase**: skopírujte `.env.example` ako `.env.local` a doplňte `NEXT_PUBLIC_SUPABASE_URL` a `NEXT_PUBLIC_SUPABASE_ANON_KEY`. Web potom číta tabuľky a funkcie podľa `supabase/01_schema.sql`.

## Súbory
| Cesta | Čo to je |
| --- | --- |
| `lib/data.ts` | Jediná dátová vrstva (Supabase alebo demo) |
| `lib/search.ts` | Hľadanie, facety, zhoda OEM („Pasuje na“) |
| `lib/vin.ts` | Dekódovanie VIN (WMI + 10. znak) |
| `lib/demo/` | Ukážkové údaje; `catalog.json` sa generuje príkazom `npm run gen:catalog` |
| `components/` | Časti stránok (hlavička, úvod, karta, detail) |
| `app/` | Stránky: `/`, `/inzerat/[id]`, `/pre-predajcov` |

## Statický náhľad (jeden súbor)
`npm run preview:static -- /cesta/priecinok` vyrobí `index.html`, ktorý sa dá otvoriť dvojklikom (len ukážkové údaje, detail sa otvára v okne).
Pozor: tento príkaz prepíše priečinok `.next`; pred `npm run start` spustite znova `npm run build`.

## Nasadenie na Vercel (krok za krokom)
Vercel je služba, ktorá web zverejní na internete. Plán **Hobby** je zadarmo. Nič z toho nestojí peniaze; ak by Vercel pýtal kartu alebo platený plán (Pro), zastavte a spýtajte sa.

1. Otvorte **vercel.com** → **Sign Up** → zvoľte **Hobby** → **Continue with GitHub** a prihláste sa účtom, kde je repozitár `Rozoberacka`.
2. Na nástenke Vercelu kliknite **Add New…** → **Project**.
3. V zozname **Import Git Repository** nájdite `Rozoberacka` → **Import**.
   - Repozitár je súkromný. Ak ho v zozname nevidíte, kliknite **Adjust GitHub App Permissions** (prípadne „Configure GitHub App“), v GitHube povoľte prístup k repozitáru `Rozoberacka` → **Save** a vráťte sa do Vercelu.
4. **Root Directory**: kliknite **Edit** a vyberte priečinok **`web`** → **Continue**. (Bez tohto kroku Vercel web nenájde.)
5. **Framework Preset**: má sa sám nastaviť na **Next.js**. Build príkazy nemeňte.
6. Rozbaľte **Environment Variables** a pridajte dve premenné (Key = názov, Value = hodnota):
   - `NEXT_PUBLIC_SUPABASE_URL` = **Project URL** zo Supabase
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY` = **anon public** kľúč zo Supabase

   Kde ich nájdete: Supabase → váš projekt → **Project Settings** (ozubené koliesko) → **API** (v novšom vzhľade **Data API** a **API Keys**). Kopírujte len **anon / public** kľúč. Kľúč **service_role** (secret) sem ani nikam inam NIKDY nedávajte.
7. Kliknite **Deploy** a počkajte 1–3 minúty. Na konci uvidíte gratuláciu a adresu webu v tvare `https://<nazov>.vercel.app`. Túto adresu si skopírujte.
8. Supabase → **Authentication** → **URL Configuration**:
   - **Site URL**: vložte adresu z Vercelu, napr. `https://<nazov>.vercel.app` (bez lomky na konci).
   - **Redirect URLs** → **Add URL** a pridajte:
     - `https://<nazov>.vercel.app/**` (ostrý web; sem vedie potvrdenie e-mailu `/predajca` aj obnova hesla `/predajca?heslo=1`)
     - `http://localhost:3000/**` (skúšanie na počítači)
     - voliteľne pre náhľady Vercelu: `https://*-<vas-ucet>.vercel.app/**` (`<vas-ucet>` je názov vášho účtu/tímu vo Verceli, vidno ho v adresách náhľadov)
   - Kliknite **Save**.
9. Test:
   - Otvorte adresu z Vercelu. Hore **nesmie** byť pás „Ukážkový režim“ (ak je, premenné z kroku 6 chýbajú alebo sú zle; po oprave vo Verceli → Deployments → **Redeploy**).
   - Kliknite **Pre predajcov** → registrácia s novým e-mailom.
   - Otvorte potvrdzovací e-mail od Supabase. Odkaz musí po kliknutí skončiť na `https://<nazov>.vercel.app/predajca`, **nie** na `localhost`. Ak vedie na localhost, Site URL z kroku 8 nie je uložená.
   - Po potvrdení ste v portáli predajcu; pridajte skúšobný inzerát a overte, že sa zobrazí na úvodnej stránke.

Poznámky:
- Prihlásenie berie spiatočnú adresu z adresy, na ktorej web práve beží (`window.location.origin` v `lib/seller.ts`), takže v kóde netreba nič meniť. Supabase ju však pustí len vtedy, keď je v **Redirect URLs**; inak pošle človeka na **Site URL**.
- Každý nový commit do vetvy `main` Vercel nasadí sám.
- Vstavané e-maily Supabase majú na pláne Free nízky hodinový limit (presné číslo neoverené). Na skúšku stačí, pred pilotom treba vlastný SMTP (sekcia nižšie).
- Názvy tlačidiel (Sign Up, Hobby, Add New…, Import, Adjust GitHub App Permissions, Root Directory/Edit, Environment Variables, Deploy, Project Settings → API / Data API, URL Configuration, Redirect URLs, Add URL, Save) sú podľa dokumentácie a pamäte k 2. 11. 2026, **neoverené klikaním** – Vercel a Supabase ich občas premenujú. Ak sa tlačidlo volá inak, hľadajte podobné.

## Vlastné SMTP (neskôr, pred pilotom)
Prečo: vstavané e-maily Supabase (potvrdenie registrácie, obnova hesla) sú len na skúšanie. Majú prísny limit počtu e-mailov za hodinu (presné číslo neoverené) a môžu chodiť len na obmedzené adresy (neoverené). Pre skutočných predajcov treba vlastnú službu na odosielanie e-mailov (SMTP).

Kde sa nastavuje: Supabase → váš projekt → **Authentication** → **Emails** → záložka **SMTP Settings** → zapnúť **Enable Custom SMTP** → **Save**. (Názvy podľa pamäte k 3. 11. 2026, **neoverené klikaním**.)

Aké údaje treba (dá ich poskytovateľ e-mailov):
- **Host** (adresa SMTP servera) a **Port** (zvyčajne 465 alebo 587)
- **Username** (používateľ) a **Password** (heslo alebo API kľúč)
- **Sender email** (odosielateľ, napr. `noreply@vasa-domena.sk`) a **Sender name** (napr. Rozoberačka)

Príklady poskytovateľov (bez odporúčania, ceny a bezplatné limity si overte na ich stránke): Resend, Brevo, Postmark, Amazon SES.

Doména: odosielať treba z vlastnej domény. Poskytovateľ vám dá DNS záznamy **SPF** a **DKIM** (často aj **DMARC**), ktoré sa vložia u registrátora domény. Bez nich e-maily často padajú do spamu. Preto SMTP rieši až po kúpe domény.

Bezpečnosť: heslo SMTP patrí **len** do Supabase (políčko Password). Nikdy ho nedávajte do repozitára, do `.env` súborov webu ani do Vercelu.
