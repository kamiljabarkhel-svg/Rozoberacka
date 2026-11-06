// Vygeneruje web/lib/demo/catalog.json zo supabase/02_kategorie.sql a supabase/03_katalog.sql.
// Spustenie: npm run gen:catalog  (z priečinka web/)
// Čísla id sa prideľujú v poradí ako v databáze (serial), takže demo a Supabase majú rovnakú štruktúru.
import { readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const root = join(dirname(fileURLToPath(import.meta.url)), "..", "..");
const kat = readFileSync(join(root, "supabase", "02_kategorie.sql"), "utf8");
const cat = readFileSync(join(root, "supabase", "03_katalog.sql"), "utf8") + "\n" + readFileSync(join(root, "supabase", "09_katalog_opravy.sql"), "utf8");

const categories = [];
const subcategories = [];
for (const line of kat.split("\n")) {
  let m = line.match(/insert into public\.categories \(id, name, sort\) values \('([^']+)', '([^']+)', (\d+)\)/);
  if (m) { categories.push({ id: m[1], name: m[2], sort: Number(m[3]) }); continue; }
  m = line.match(/insert into public\.subcategories \(category_id, name, sort\) values \('([^']+)', '([^']+)', (\d+)\)/);
  if (m) subcategories.push({ id: subcategories.length + 1, categoryId: m[1], name: m[2], sort: Number(m[3]) });
}

const brands = [];
const models = [];
const engines = [];
for (const line of cat.split("\n")) {
  let m = line.match(/insert into public\.brands \(name, popular\) values \('([^']+)', (true|false)\)/);
  if (m) { brands.push({ id: brands.length + 1, name: m[1], popular: m[2] === "true" }); continue; }
  m = line.match(/insert into public\.models \(brand_id, name, year_from, year_to\) select id, '([^']+)', (\d+), (\d+|null) from public\.brands where name = '([^']+)'/);
  if (m) {
    const b = brands.find((x) => x.name === m[4]);
    if (!b) throw new Error("Neznáma značka " + m[4]);
    models.push({ id: models.length + 1, brandId: b.id, name: m[1], yearFrom: Number(m[2]), yearTo: m[3] === "null" ? null : Number(m[3]) });
    continue;
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

const out = { source: "supabase/02_kategorie.sql + supabase/03_katalog.sql", categories, subcategories, brands, models, engines };
writeFileSync(join(root, "web", "lib", "demo", "catalog.json"), JSON.stringify(out, null, 1) + "\n");
console.log(`kategórie ${categories.length}, podkategórie ${subcategories.length}, značky ${brands.length}, modely ${models.length}, motorizácie ${engines.length}`);
