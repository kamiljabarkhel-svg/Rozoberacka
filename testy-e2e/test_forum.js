// E2E test fóra: registrácia do fóra, nová téma (čaká na schválenie), viditeľnosť, schválenie, odpoveď, nahlásenie,
// ochrana portálu predajcu pred účtom fóra, zrušenie účtu. Beží proti lokálnemu Supabase (PostgREST + gw.js) a `next start`.
const { chromium } = require("playwright");
const { execSync } = require("child_process");
const B = "http://127.0.0.1:3000", G = "http://127.0.0.1:54321";
const sql = (q) => execSync(`psql -h /tmp/pgt -p 5499 -U postgres -d e2e -tAc "${q.replace(/"/g, '\\"')}"`).toString().trim();
const errs = [];
(async () => {
  const br = await chromium.launch();
  const ctx = await br.newContext({ viewport: { width: 1280, height: 900 } });
  await ctx.addInitScript(() => localStorage.setItem("rozoberacka-suhlas", JSON.stringify({ v: 3, at: new Date().toISOString(), analytics: false })));
  const pg = await ctx.newPage();
  pg.on("pageerror", (e) => errs.push("pageerror: " + e.message));
  pg.on("response", (r) => { if (r.status() >= 500) errs.push("HTTP " + r.status() + " " + r.url().slice(0, 120)); });
  const step = async (n, f) => { try { await f(); console.log("OK  ", n); } catch (e) { console.log("FAIL", n, "->", e.message.split("\n")[0]); await pg.screenshot({ path: "fail-forum-" + n.replace(/\W+/g, "_") + ".png" }).catch(() => {}); } };
  const vis = await (await br.newContext()).newPage();   // návštevník bez účtu

  await step("forum: prehľad a sekcia", async () => {
    await fetch(B + "/api/forum-obnovit", { method: "POST" });   // stránka mohla vzniknúť pri zostavení ešte bez tabuliek fóra
    await vis.goto(B + "/forum"); await vis.waitForSelector("h1:has-text('Fórum')"); await vis.waitForSelector(".fo-sections a:has-text('Škoda')");
    await vis.click(".fo-sections a:has-text('Škoda')"); await vis.waitForSelector("h1:has-text('Škoda')");
    await vis.waitForSelector(".fo-new a.btn:has-text('Nová téma')");
    if (!(await vis.locator(".snav a:has-text('Fórum')").count())) throw new Error("v hlavičke chýba Fórum");
  });
  await step("forum: registracia a potvrdenie", async () => {
    await pg.goto(B + "/forum/ucet?spat=%2Fforum%2Fskoda"); await pg.click("role=tab[name='Registrácia']");
    await pg.click("button:has-text('Vytvoriť účet')"); await pg.waitForSelector("label.bad .f-err:has-text('Prezývka')");
    await pg.fill("input[autocomplete=nickname]", "Jano Test"); await pg.fill("input[type=email]", "forum@rz.sk"); await pg.fill("input[type=password]", "heslo1234");
    await pg.check(".pp-chk input"); await pg.click("button:has-text('Vytvoriť účet')"); await pg.waitForSelector(".pp-ok");
    await (await fetch(G + "/e2e/confirm?email=forum@rz.sk")).text();
    await pg.click("role=tab[name='Prihlásiť sa']"); await pg.fill("input[type=email]", "forum@rz.sk"); await pg.fill("input[type=password]", "heslo1234");
    await pg.click("form button.btn"); await pg.waitForURL("**/forum/skoda");
  });
  await step("forum: nova tema caka na schvalenie", async () => {
    await pg.click(".fo-new button:has-text('Nová téma')");
    await pg.click("button:has-text('Zverejniť tému')"); await pg.waitForSelector("label.bad .f-err:has-text('nadpis')");
    await pg.fill(".fo-form input", "Octavia III 2.0 TDI – svieti kontrolka DPF");
    await pg.fill(".fo-form textarea", "Octavia III 2.0 TDI, 2015, 190 000 km. Svieti kontrolka DPF aj po dlhej jazde. Čo skontrolovať?");
    await pg.click("button:has-text('Zverejniť tému')"); await pg.waitForSelector(".pp-ok:has-text('schvaľuje správca')");
    await vis.goto(B + "/forum/skoda"); await vis.waitForTimeout(500);
    if (await vis.locator("text=svieti kontrolka DPF").count()) throw new Error("návštevník vidí neschválenú tému");
  });
  await step("forum: moj ucet ukazuje cakajuci prispevok", async () => {
    await pg.goto(B + "/forum/ucet"); await pg.waitForSelector("h1:has-text('Môj účet vo fóre')"); await pg.waitForSelector(".fo-my .pp-st:has-text('Čaká na schválenie')");
    await pg.waitForSelector("text=Jano Test");
  });
  let url = "";
  await step("forum: po schvaleni vidi tému každý", async () => {
    sql("update public.forum_posts set status = 'visible'; update public.forum_threads set status = 'visible'; select public.forum_recount(id) from public.forum_threads;");
    await fetch(B + "/api/forum-obnovit", { method: "POST" });
    await vis.goto(B + "/forum/skoda"); await vis.click("a:has-text('svieti kontrolka DPF')"); await vis.waitForSelector("h1.fo-title:has-text('svieti kontrolka DPF')");
    url = vis.url();
    const ld = await vis.locator("script[type='application/ld+json']").allInnerTexts();
    if (!ld.some((x) => x.includes("DiscussionForumPosting"))) throw new Error("chýbajú štruktúrované dáta");
    await vis.waitForSelector(".fo-reply-note a:has-text('Prihlásiť sa a odpovedať')");
  });
  await step("forum: odpoved nováčika čaká, autor ju vidí", async () => {
    await pg.goto(url); await pg.fill(".fo-reply textarea", "Doplním: chybový kód P2002."); await pg.click("button:has-text('Odoslať odpoveď')");
    await pg.waitForSelector(".pp-ok:has-text('čaká na schválenie')"); await pg.waitForSelector(".fo-post.is-pending:has-text('P2002')");
    await vis.reload(); await vis.waitForSelector("h1.fo-title");
    if (await vis.locator("text=P2002").count()) throw new Error("návštevník vidí neschválenú odpoveď");
  });
  await step("forum: nahlasenie prispevku", async () => {
    await vis.click(".fo-post button:has-text('Nahlásiť')"); await vis.selectOption(".rep select", "Spam alebo reklama");
    await vis.check(".rep .pp-chk input"); await vis.click("button:has-text('Odoslať nahlásenie')"); await vis.waitForSelector(".rep-ok");
    if (sql("select count(*) from public.forum_reports") !== "1") throw new Error("nahlásenie sa neuložilo");
  });
  await step("forum: ucet fora sa nedostane do portalu predajcu", async () => {
    await pg.goto(B + "/predajca"); await pg.waitForSelector("text=len do fóra");
    if (sql("select count(*) from public.sellers") !== "0") throw new Error("vznikol predajca z účtu fóra");
    await pg.goto(B + "/forum"); await pg.waitForSelector("#user a.ubtn:has-text('Môj účet')");
  });
  await step("forum: zrusenie uctu zmaže príspevky", async () => {
    await pg.goto(B + "/forum/ucet"); await pg.click("button.del:has-text('Zrušiť účet')"); await pg.click(".cdel-yes");
    await pg.waitForURL("**/forum"); await pg.waitForTimeout(500);
    const n = sql("select (select count(*) from public.forum_profiles)+(select count(*) from public.forum_posts)+(select count(*) from public.forum_threads)+(select count(*) from auth.users where email='forum@rz.sk')");
    if (n !== "0") throw new Error("zostali riadky: " + n);
  });
  console.log("ERRORS:", errs.length ? "\n" + [...new Set(errs)].join("\n") : "none");
  await br.close();
})();
