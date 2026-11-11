// Test dekódovania VIN (web/lib/vin.ts) pre osobné autá, dodávky, nákladné autá, autobusy a motorky.
// Spustenie: node --experimental-strip-types testy-e2e/test_vin.mjs
import { readFileSync, readdirSync } from "node:fs";
import { decodeVin, vinYears } from "../web/lib/vin.ts";

let fail = 0; const ok = (c, m) => { console.log((c ? "OK  " : "FAIL") + " " + m); if (!c) fail++; };
const NOW = 2026;
const d = (v) => decodeVin(v);

// [popis, VIN, značka, druh (null = podľa katalógu), očakávané roky]
const CASES = [
  ["Škoda Octavia III 2015", "TMBJJ7NE4F0123456", "Škoda", null, [2015]],
  ["VW Golf III 1995 (S = 1995 aj 2025)", "WVWZZZ1HZSW123456", "Volkswagen", null, [2025, 1995]],
  ["VW Golf VII 2017", "WVWZZZAUZHW123456", "Volkswagen", null, [2017]],
  ["Audi A4 B8 2011", "WAUZZZ8K3BA123456", "Audi", null, [2011]],
  ["Hyundai i30 z Nošovíc 2019", "TMAH381CAKJ123456", "Hyundai", null, [2019]],
  ["Kia Ceed zo Žiliny 2020", "U5YH5819ALL123456", "Kia", null, [2020]],
  ["Mercedes C W205 (rok v VIN nie je)", "WDD2050041F123456", "Mercedes-Benz", null, []],
  ["BMW 3 F30 (rok v VIN nie je)", "WBA8A1102GK123456", "BMW", null, []],
  ["Ford Focus EU (rok je v 11. znaku, nie v 10.)", "WF0FXXGCDFKS12345", "Ford", null, []],
  ["Renault Clio", "VF1RJA00X67123456", "Renault", null, []],
  ["Ford Transit dodávka", "WF0XXXTTGXKJ12345", "Ford", null, []],
  ["Mercedes Sprinter W907", "W1V9076351P123456", "Mercedes-Benz", "dodavky", []],
  ["Iveco Daily", "ZCFC35A0005123456", "Iveco", null, []],
  ["MAN TGX", "WMA06XZZ4CP123456", "MAN", null, []],
  ["Scania R", "YS2R4X20005123456", "Scania", "nakladne", []],
  ["Volvo FH", "YV2RT40A5GB123456", "Volvo", "nakladne", []],
  ["DAF XF", "XLRTEH4300G123456", "DAF", "nakladne", []],
  ["Tatra Phoenix", "TNT3D1A00GK123456", "Tatra", "nakladne", []],
  ["Setra autobus", "WKK63221313123456", "Setra", "autobusy", []],
  ["Solaris Urbino", "SUU241211AB123456", "Solaris", "autobusy", []],
  ["Mercedes Citaro (EvoBus)", "WEB62802313123456", "Mercedes-Benz", "autobusy", []],
  ["Karosa", "TMK95513512345678", "Karosa", "autobusy", []],
  ["Honda CBR 600 2008", "JH2PC40A08K123456", "Honda", "motorky", [2008]],
  ["Honda Civic (auto, nie motorka)", "SHHFK2760HU123456", "Honda", null, [2017]],
  ["Yamaha MT-07 2017", "JYARM06E0HA123456", "Yamaha", "motorky", [2017]],
  ["Kawasaki Z900 2018", "JKAZR2A10JA123456", "Kawasaki", "motorky", [2018]],
  ["Suzuki GSX-R (motorka) 2011", "JS1GR7MA0B2123456", "Suzuki", "motorky", [2011]],
  ["KTM 390 Duke 2019", "VBKJGJ407KM123456", "KTM", "motorky", [2019]],
  ["BMW R 1250 GS (motorka)", "WB10J1301K6123456", "BMW", "motorky", []],
  ["Ducati Monster 2015", "ZDM1RAMN0FB123456", "Ducati", "motorky", [2015]],
  ["Harley-Davidson 2005 (USA, 7. znak číslica)", "1HD1FCW105Y123456", "Harley-Davidson", "motorky", [2005]],
  ["Tesla Model 3 2021 (USA, 7. znak písmeno)", "5YJ3E1EA8MF123456", "Tesla", null, [2021]],
];
for (const [n, v, brand, vt, years] of CASES) {
  const r = d(v);
  ok(r.ok && r.brand === brand && r.vtype === vt && JSON.stringify(r.years) === JSON.stringify(years),
     `${n}: ${r.ok ? `${r.brand}, druh ${r.vtype ?? "–"}, roky ${JSON.stringify(r.years)}` : r.msg}`);
}

// chyby vstupu
ok(!d("TMBJJ7NE4F012345").ok && /16/.test(d("TMBJJ7NE4F012345").msg), "16 znakov – správa s počtom");
ok(!d("TMBJJ7NE4F01234O6").ok && /I, O ani Q/.test(d("TMBJJ7NE4F01234O6").msg), "písmeno O – vysvetlenie");
ok(d(" tmbjj7ne4f0123456 ").ok && d("TMB-JJ7NE4F-0123456").ok, "malé písmená, medzery a pomlčky");
ok(d("ZZZZZZZZZZZZZZZZZ").ok && d("ZZZZZZZZZZZZZZZZZ").brand === null, "neznámy výrobca – platný VIN bez značky");

// rok: cyklus 30 rokov a budúce roky
ok(JSON.stringify(vinYears("TMBXXXXXXA0000000", NOW)) === "[2010]", "A = 2010 (1980 sa vynechá)");
ok(JSON.stringify(vinYears("TMBXXXXXXT0000000", NOW)) === "[2026,1996]", "T = 2026 alebo 1996");
ok(JSON.stringify(vinYears("TMBXXXXXXW0000000", NOW)) === "[1998]", "W = 1998 (2028 je v budúcnosti)");
ok(JSON.stringify(vinYears("TMBXXXXXX5000000", NOW)) === "[2005]", "5 = 2005");

// každá značka z tabuľky VIN je v katalógu (inak by web značku nevybral)
const dir = new URL("../supabase/katalog/", import.meta.url);
const names = new Set();
for (const f of readdirSync(dir).filter((x) => x.endsWith(".txt"))) for (const line of readFileSync(new URL(f, dir), "utf8").split("\n")) if (line.startsWith("@")) names.add(line.slice(1).split("|")[0].trim());
const src = readFileSync(new URL("../web/lib/vin.ts", import.meta.url), "utf8");
const used = [...src.matchAll(/(?:car|only)\("([^"]+)"/g)].map((m) => m[1]);
const missing = [...new Set(used)].filter((b) => !names.has(b));
ok(missing.length === 0, "značky z VIN sú v katalógu" + (missing.length ? ": chýba " + missing.join(", ") : ""));

console.log(fail ? `ZLYHALO: ${fail}` : "VŠETKO OK");
process.exit(fail ? 1 : 0);
