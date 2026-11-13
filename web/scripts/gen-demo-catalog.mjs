// Vygeneruje web/lib/demo/catalog.json zo supabase/02_kategorie.sql a supabase/03_katalog.sql.
// Spustenie: npm run gen:catalog  (z priečinka web/)
// Čísla id sa prideľujú v poradí ako v databáze (serial), takže demo a Supabase majú rovnakú štruktúru.
import { readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const root = join(dirname(fileURLToPath(import.meta.url)), "..", "..");
const kat = ["02_kategorie.sql", "18_kategorie_druhy_vozidiel.sql", "21_kategorie_rozsirenie.sql"].map((f) => readFileSync(join(root, "supabase", f), "utf8")).join("\n");
const cat = ["03_katalog.sql", "09_katalog_opravy.sql", "16_katalog_europa.sql", "17_katalog_opravy.sql", "20_katalog_vozidla.sql", "30_katalog_veterany.sql"].map((f) => readFileSync(join(root, "supabase", f), "utf8")).join("\n");

const categories = [];
const subcategories = [];
for (const line of kat.split("\n")) {
  let m = line.match(/insert into public\.categories \(id, name, sort\) values \('([^']+)', '([^']+)', (\d+)\)/);
  if (m) { const ex = categories.find((x) => x.id === m[1]); if (ex) { ex.name = m[2]; ex.sort = Number(m[3]); } else categories.push({ id: m[1], name: m[2], sort: Number(m[3]), vtypes: null }); continue; }
  m = line.match(/update public\.categories set name = '([^']+)' where id = '([^']+)'/);
  if (m) { const c = categories.find((x) => x.id === m[2]); if (c) c.name = m[1]; continue; }
  m = line.match(/update public\.categories set vtypes = '\{([^}]*)\}' where id = '([^']+)'/);
  if (m) { const c = categories.find((x) => x.id === m[2]); if (c) c.vtypes = m[1].split(","); continue; }
  m = line.match(/insert into public\.subcategories \(category_id, name, sort\) values \('([^']+)', '([^']+)', (\d+)\)/);
  if (m && !subcategories.some((x) => x.categoryId === m[1] && x.name === m[2])) subcategories.push({ id: subcategories.length + 1, categoryId: m[1], name: m[2], sort: Number(m[3]) });
}

// 29_veterany.sql: kategórie osobných áut platia aj pre veterány, elektropohon nie; nová kategória „vet“ s podkategóriami
for (const c of categories) if (c.vtypes?.includes("osobne") && !c.vtypes.includes("veterany")) c.vtypes.push("veterany");
{ const ev = categories.find((x) => x.id === "ev"); if (ev) ev.vtypes = ["osobne", "dodavky", "nakladne", "autobusy", "motorky"]; }
{ const v29 = readFileSync(join(root, "supabase", "29_veterany.sql"), "utf8");
  const m = v29.match(/values \('vet', '([^']+)', (\d+)/); categories.push({ id: "vet", name: m[1], sort: Number(m[2]), vtypes: ["veterany"] });
  for (const x of v29.matchAll(/\('vet', '([^']+)', (\d+)\)/g)) subcategories.push({ id: subcategories.length + 1, categoryId: "vet", name: x[1], sort: Number(x[2]) }); }

const brands = [];
const models = [];
const engines = [];
for (const line of cat.split("\n")) {
  let m = line.match(/insert into public\.brands \(name, popular\) values \('([^']+)', (true|false)\)/);
  if (m) { if (!brands.some((x) => x.name === m[1])) brands.push({ id: brands.length + 1, name: m[1], popular: m[2] === "true" }); continue; }
  m = line.match(/insert into public\.models \(brand_id, name, year_from, year_to\) select id, '([^']+)', (\d+), (\d+|null) from public\.brands where name = '([^']+)'/);
  if (m) {
    const b = brands.find((x) => x.name === m[4]);
    if (!b) throw new Error("Neznáma značka " + m[4]);
    models.push({ id: models.length + 1, brandId: b.id, name: m[1], yearFrom: Number(m[2]), yearTo: m[3] === "null" ? null : Number(m[3]) });
    continue;
  }
  m = line.match(/insert into public\.models \(brand_id, name, year_from, year_to, vehicle_type\) select id, '([^']+)', (\d+), (\d+|null), '([a-z]+)' from public\.brands where name = '([^']+)'/);
  if (m) {
    const b = brands.find((x) => x.name === m[5]);
    if (!b) throw new Error("Neznáma značka " + m[5]);
    models.push({ id: models.length + 1, brandId: b.id, name: m[1], yearFrom: Number(m[2]), yearTo: m[3] === "null" ? null : Number(m[3]), vehicleType: m[4] });
    continue;
  }
  m = line.match(/update public\.models set vehicle_type = '([a-z]+)' where name = '([^']+)' and brand_id = \(select id from public\.brands where name = '([^']+)'\)/);
  if (m) {
    const b = brands.find((x) => x.name === m[3]); const mo = models.find((x) => x.brandId === b?.id && x.name === m[2]);
    if (!mo) throw new Error("Neznámy model " + m[2]);
    mo.vehicleType = m[1]; continue;
  }
  m = line.match(/update public\.models set year_to = (\d+) where name = '([^']+)' and brand_id = \(select id from public\.brands where name = '([^']+)'\)/);
  if (m) {
    const b = brands.find((x) => x.name === m[3]); const mo = models.find((x) => x.brandId === b?.id && x.name === m[2]);
    if (!mo) throw new Error("Neznámy model " + m[2]);
    mo.yearTo = Number(m[1]); continue;
  }
  m = line.match(/cross join \(values (.*)\) as v\(n\) where b\.name = '([^']+)' and m\.name = '([^']+)'/);
  if (m) {
    const b = brands.find((x) => x.name === m[2]);
    const mo = models.find((x) => x.brandId === b.id && x.name === m[3]);
    if (!mo) throw new Error("Neznámy model " + m[3]);
    for (const e of m[1].matchAll(/\('([^']+)'\)/g)) engines.push({ id: engines.length + 1, modelId: mo.id, name: e[1] });
  }
}

const out = { source: "supabase/02 + 18 + 21 + 29 (kategórie), 03 + 09 + 16 + 17 + 20 + 30 (katalóg)", categories, subcategories, brands, models, engines };
writeFileSync(join(root, "web", "lib", "demo", "catalog.json"), JSON.stringify(out, null, 1) + "\n");
console.log(`kategórie ${categories.length}, podkategórie ${subcategories.length}, značky ${brands.length}, modely ${models.length}, motorizácie ${engines.length}`);
