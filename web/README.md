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
