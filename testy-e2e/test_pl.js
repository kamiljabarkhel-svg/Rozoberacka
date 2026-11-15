// Poľská verzia: preklad rozhrania, ceny v zł, strojový preklad inzerátu, hreflang a prepínač jazyka.
// Spustenie: web na :3000 s lokálnou Supabase (pozri README), potom: NODE_PATH=$(npm root -g) node testy-e2e/test_pl.js
const { chromium } = require("playwright");
const { execSync } = require("child_process");
const B = process.env.B || "http://127.0.0.1:3000";
const sql = (q) => execSync(`su pgt -c "psql -h /tmp/pgt -p 5499 -U postgres -d e2e -tAq -v ON_ERROR_STOP=1"`, { input: q }).toString().trim();
let fail = 0; const ok = (c, m) => { console.log((c ? "OK  " : "FAIL") + " " + m); if (!c) fail++; };
(async () => {
  sql(`insert into auth.users (id,email,email_confirmed_at) values ('e7700000-0000-0000-0000-000000000001','pl.test@t.sk',now()) on conflict do nothing;
    insert into sellers (id,name,city,seller_type) values ('e7700000-0000-0000-0000-000000000001','Vrak PL test','Žilina','Súkromná osoba') on conflict do nothing;
    delete from listings where seller_id='e7700000-0000-0000-0000-000000000001';
    insert into listings (seller_id,name,category_id,brand_id,price,city,description,warranty,condition,vtype)
      select 'e7700000-0000-0000-0000-000000000001','Volant kožený PL test','ine',id,100,'Žilina','Kožený volant bez poškodenia, volajte 0905 999 888.','Bez záruky','Dobrý','osobne' from brands where name='Škoda';`);
  const id = sql(`select id from listings where name='Volant kožený PL test'`);
  const h = sql(`select src_hash from translate_outbox('pl',200) where id=${id}`);
  ok(!!h, "nový inzerát je vo fronte prekladov");
  sql(`select translate_save('pl',${id},'Kierownica skórzana PL test','Skórzana kierownica bez uszkodzeń, dzwoń 0905 999 888.','${h}')`);
  const br = await chromium.launch(); const p = await (await br.newContext({ viewport: { width: 1280, height: 900 } })).newPage();
  const errs = []; p.on("pageerror", (e) => errs.push(String(e)));
  await p.goto(B + "/pl?q=" + encodeURIComponent("Volant kožený PL test"));
  await p.waitForSelector(".card:has-text('Kierownica skórzana PL test')", { timeout: 20000 });
  ok(await p.locator("html[lang=pl]").count() === 1, "html lang=pl");
  ok(await p.locator(".card .price:has-text('zł')").count() > 0, "cena aj v zł: " + await p.locator(".card .price").first().innerText());
  ok(await p.locator("text=Wszystkie pojazdy").count() > 0, "rozhranie po poľsky (Wszystkie pojazdy)");
  await p.screenshot({ path: "/tmp/pl_home.png" });
  await p.click(".card:has-text('Kierownica skórzana PL test') a >> nth=0"); await p.waitForURL("**/pl/diel/**");
  await p.waitForSelector("h1:has-text('Kierownica skórzana PL test')");
  ok(await p.locator("text=Skórzana kierownica bez uszkodzeń").count() === 1, "popis preložený");
  ok(await p.locator("dt:has-text('Stan') + dd:has-text('Dobry')").count() === 1, "parametre po poľsky (Stan: Dobry)");
  ok(await p.locator("text=wysyłkę do Polski i jej koszt uzgodnij").count() === 1, "poznámka o zásielke do Poľska");
  await p.click("text=Pokaż oryginał"); await p.waitForSelector("h1:has-text('Volant kožený PL test')");
  ok(true, "Pokaż oryginał ukáže slovenský text");
  await p.screenshot({ path: "/tmp/pl_detail.png", fullPage: true });
  const html = await (await fetch(B + "/pl/diel/" + id)).text();
  ok(/<title>Kierownica skórzana PL test/.test(html), "titulok pre Google preložený už na serveri");
  ok(new RegExp(`rel="canonical" href="[^"]*/pl/diel/${id}-`).test(html), "canonical na /pl/diel/…");
  ok(/hrefLang="sk-SK"[^>]*\/diel\//.test(html) && /hrefLang="pl-PL"/.test(html), "hreflang sk a pl");
  const sk = await (await fetch(B + "/diel/" + id)).text();
  ok(/<h1>Volant kožený PL test/.test(sk) && /<html lang="sk"/.test(sk), "slovenská stránka ostala po slovensky");
  await p.click(".langsw >> text=SK"); await p.waitForURL((u) => !u.pathname.startsWith("/pl"));
  ok(await p.locator("h1:has-text('Volant kožený PL test')").count() === 1, "prepínač jazyka vedie na slovenskú verziu toho istého dielu");
  await p.goto(B + "/pl?q=" + encodeURIComponent("kierownica skórzana PL"));
  ok(await p.locator(".card:has-text('Kierownica skórzana PL test')").first().waitFor({ timeout: 15000 }).then(() => true, () => false), "hľadanie poľským slovom nájde slovenský inzerát");
  for (const u of ["/pl/navody/vin", "/pl/dopyt", "/pl/obchodne-podmienky", "/pl/ochrana-osobnych-udajov", "/pl/cookies", "/pl/ako-zoradujeme"]) {
    const r = await fetch(B + u); const t = await r.text(); ok(r.status === 200 && /<html lang="pl"/.test(t), u + " " + r.status);
  }
  const sm = await (await fetch(B + "/sitemap.xml")).text();
  ok(/\/pl<\/loc>/.test(sm) && /hreflang="pl"/.test(sm), "mapa webu obsahuje poľské adresy s hreflang");
  ok((await fetch(B + "/pl/forum", { redirect: "manual" })).status === 307, "fórum na /pl presmeruje na slovenské");
  ok(errs.length === 0, "bez chýb v prehliadači " + errs.join(" | "));
  sql(`delete from listings where seller_id='e7700000-0000-0000-0000-000000000001'; delete from sellers where id='e7700000-0000-0000-0000-000000000001'; delete from auth.users where id='e7700000-0000-0000-0000-000000000001';`);
  await br.close(); process.exit(fail ? 1 : 0);
})().catch((e) => { console.log("FAIL " + e.message); process.exit(1); });
