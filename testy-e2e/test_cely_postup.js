const { chromium } = require("playwright");
const B = "http://127.0.0.1:3000", G = "http://127.0.0.1:54321";
const errs = [];
(async () => {
  const br = await chromium.launch(); const ctx = await br.newContext({ viewport: { width: 1280, height: 900 } }); const pg = await ctx.newPage();
  pg.on("console", (m) => { if (m.type() === "error") errs.push("console: " + m.text()); });
  pg.on("response", (r) => { if (r.status() >= 400) errs.push("HTTP " + r.status() + " " + r.request().method() + " " + r.url().slice(0, 140)); }); pg.on("pageerror", (e) => errs.push("pageerror: " + e.message));
  const step = async (n, f) => { try { await f(); console.log("OK  ", n); } catch (e) { console.log("FAIL", n, "->", e.message.split("\n")[0]); await (global.CUR||pg).screenshot({ path: "fail-" + n.replace(/\W+/g, "_") + ".png", fullPage: true }); } };
  await step("home: Hladat nad OEM", async () => {
    await pg.goto(B + "/"); await pg.waitForSelector(".panel");
    const a = await pg.locator(".pa .btn").boundingBox(), o = await pg.locator(".oemrow").boundingBox();
    if (!(a.y < o.y)) throw new Error(`Hladat y=${a.y} oem y=${o.y}`);
  });
  await step("hlavicka -> prihlasenie", async () => { await pg.click("text=Prihlásenie predajcu"); await pg.waitForURL("**/pre-predajcov"); });
  await step("registracia validacia", async () => {
    await pg.click("role=tab[name='Registrácia']"); await pg.click("button:has-text('Vytvoriť účet')");
    await pg.waitForSelector(".pp-err");
  });
  await step("registracia", async () => {
    await pg.fill("input[autocomplete=organization]", "Vrakovisko Test"); await pg.fill("input[type=email]", "test@rz.sk"); await pg.fill("input[type=password]", "heslo1234");
    await pg.check(".pp-chk input"); await pg.click("button:has-text('Vytvoriť účet')"); await pg.waitForSelector(".pp-ok");
  });
  await step("prihlasenie bez potvrdenia", async () => {
    await pg.click("role=tab[name='Prihlásiť sa']"); await pg.fill("input[type=email]", "test@rz.sk"); await pg.fill("input[type=password]", "heslo1234");
    await pg.click("form button.btn"); await pg.waitForSelector(".pp-err:has-text('potvrdený')");
  });
  await step("potvrdenie + prihlasenie", async () => {
    await (await fetch(G + "/e2e/confirm?email=test@rz.sk")).text();
    await pg.click("form button.btn"); await pg.waitForURL("**/predajca**"); await pg.waitForSelector(".pp-dash");
  });
  await step("hlavicka ukazuje portal", async () => { await pg.waitForSelector(".site-header >> text=Portál predajcu"); });
  await step("nastenka: profil chyba", async () => { await pg.waitForSelector("text=Doplňte mesto a telefón"); });
  await step("profil ulozit", async () => {
    await pg.click(".pp-nav >> text=Profil"); await pg.fill(".pp-form label:has-text('Mesto') input", "Žilina"); await pg.fill(".pp-form label:has-text('Telefón') input", "0905 111 222");
    await pg.click("text=Uložiť profil"); await pg.waitForSelector(".pp-toast:has-text('Profil uložený')");
  });
  await step("formular prazdny -> chyby", async () => {
    await pg.click(".pp-nav >> text=Pridať inzerát"); await pg.click("text=Ďalej →"); await pg.waitForSelector("label.bad"); const n = await pg.locator("label.bad").count(); if (n < 3) throw new Error("bad=" + n);
  });
  await step("formular vyplnit a ulozit", async () => {
    await pg.fill("label:has-text('Názov dielu') input", "Predné ľavé svetlo LED");
    await pg.selectOption("label:has-text('Kategória') select", { label: "Svetlá" });
    await pg.selectOption("label:has-text('Podkategória') select", { label: "Predné svetlá" });
    await pg.fill("label:has-text('OEM') input", "5E1 941 015");
    await pg.click("text=Ďalej →");
    await pg.selectOption("label:has-text('Značka auta') select", { label: "Škoda" });
    const m = pg.locator("label:has-text('Model') select"); const opts = await m.locator("option").allTextContents();
    const oct = opts.find((t) => /^Octavia III/.test(t)); if (!oct) throw new Error("no Octavia III in " + opts.join("|"));
    await m.selectOption({ label: oct });
    await pg.selectOption("label:has-text('Ročník auta') select", "2016");
    await pg.selectOption("label:has-text('Strana auta') select", "Ľavá");
    // pasuje aj na
    await pg.selectOption(".pp-fitrow select[aria-label=Značka]", { label: "Volkswagen" }); await pg.click(".pp-fitrow >> text=Pridať");
    await pg.waitForSelector(".pp-fitl li");
    await pg.click("text=Ďalej →");
    await pg.selectOption("label:has-text('Stav') select", "Dobrý"); await pg.fill("label:has-text('Cena') input", "120,50");
    await pg.check("text=Diel je odskúšaný");
    await pg.click("text=Ďalej →");
    await pg.setInputFiles(".pp-add input[type=file]", ["a.png", "b.png"]); await pg.waitForSelector(".pp-phl figure >> nth=1");
    await pg.fill("label:has-text('Popis') textarea", "Funkčné svetlo, bez prasklín, všetky úchyty celé.");
    await pg.click("text=Ďalej →");
    const city = await pg.inputValue("label:has-text('Mesto') input"); if (city !== "Žilina") throw new Error("city prefill " + city);
    await pg.click("text=Zverejniť inzerát"); await pg.waitForSelector(".pp-toast:has-text('zverejnený')", { timeout: 15000 });
  });
  await step("moje inzeraty zobrazuju + fotka sa nacita", async () => { await pg.waitForSelector(".pp-row:has-text('Predné ľavé svetlo LED') img"); await pg.waitForFunction(() => { const i = document.querySelector(".pp-row img"); return i && i.complete && i.naturalWidth > 0; }, null, { timeout: 8000 }); });
  await ctx.storageState({ path: "seller.json" });
  // verejná časť v novom kontexte (kupujúci)
  const c2 = await br.newContext(); const b2 = await c2.newPage(); global.CUR = b2; b2.on("pageerror", (e) => errs.push("buyer pageerror: " + e.message)); b2.on("console", (m) => { if (m.type() === "error") errs.push("buyer console: " + m.text()); });
  await step("verejne: inzerat na uvode", async () => { await b2.goto(B + "/"); await b2.waitForSelector(".card:has-text('Predné ľavé svetlo LED')"); await b2.waitForSelector(".stats:has-text('1')"); });
  await step("verejne: hladanie OEM bez medzier", async () => { await b2.fill(".oemrow input", "5e1941015"); await b2.click("text=Hľadať podľa čísla"); await b2.waitForSelector(".cnt:has-text('1')"); });
  await step("verejne: hladanie podla auta cez pasuje aj na (VW)", async () => {
    await b2.goto(B + "/"); await b2.selectOption(".panel label:has-text('Značka') select", { label: "Volkswagen" }); await b2.waitForSelector(".card:has-text('Predné ľavé svetlo LED')");
  });
  await step("detail + telefon + sprava", async () => {
    await b2.click(".card:has-text('Predné ľavé svetlo LED') a >> nth=0"); await b2.waitForURL("**/inzerat/**"); await b2.waitForSelector("text=Pasuje na");
    await b2.click("text=Zobraziť telefón"); await b2.waitForSelector("text=0905 111 222");
    await b2.click("text=Napísať predajcovi");
    const box = b2.locator(".msgbox"); await box.locator("input >> nth=0").fill("Jano Kupec"); await box.locator("input >> nth=1").fill("0911 222 333"); await box.locator("textarea").fill("Dobrý deň, je svetlo ešte dostupné?");
    await box.locator("text=Odoslať správu").click(); await b2.waitForSelector("text=Správa bola odoslaná");
  });
  global.CUR = pg;
  await step("portal: statistiky a sprava", async () => {
    await pg.goto(B + "/predajca#home"); await pg.reload(); await pg.waitForSelector(".pp-tile");
    const t = await pg.locator(".pp-tiles").innerText(); console.log("   tiles:", t.replace(/\n/g, " | "));
    await pg.click(".pp-nav >> text=Správy"); await pg.waitForSelector(".pp-msgs li.unread:has-text('Jano Kupec')"); await pg.click("text=Označiť ako prečítané >> nth=0"); await pg.waitForSelector(".pp-msgs li:not(.unread)");
  });
  await step("upravit inzerat", async () => {
    await pg.click(".pp-nav >> text=Moje inzeráty"); await pg.click(".pp-row:has-text('Predné ľavé') >> text=Upraviť");
    await pg.fill("label:has-text('Názov dielu') input", "Predné ľavé svetlo LED Octavia"); await pg.click("text=Uložiť zmeny"); await pg.waitForSelector(".pp-toast:has-text('Zmeny uložené')");
    await pg.waitForSelector(".pp-row:has-text('LED Octavia') img");
  });
  await step("TOP, duplikovat, pozastavit", async () => {
    await pg.click(".pp-row >> text=TOP"); await pg.waitForSelector(".pp-row .toptag");
    await pg.click(".pp-row >> text=Duplikovať"); await pg.waitForFunction(() => document.querySelectorAll(".pp-row").length === 2);
    await pg.waitForSelector(".pp-row >> nth=0 >> .pp-st.paused"); await pg.click(".pp-row >> nth=1 >> text=Pozastaviť"); await pg.waitForFunction(() => document.querySelectorAll(".pp-st.paused").length === 2); await pg.click(".pp-row >> nth=1 >> text=Aktivovať"); await pg.waitForFunction(() => document.querySelectorAll(".pp-st.active").length === 1);
  });
  await step("zmazat dvojkrokovo", async () => {
    const n0 = await pg.locator(".pp-row").count();
    await pg.click(".pp-row >> nth=0 >> button.del"); await pg.click("text=Naozaj zmazať?"); await pg.waitForFunction((n) => document.querySelectorAll(".pp-row").length === n - 1, n0);
  });
  await step("CSV import", async () => {
    await pg.click(".pp-nav >> text=Import CSV");
    const csv = "nazov;znacka;model;rocnik;oem;cena;kategoria;stav;popis;pasuje\nAlternátor 140A;Volkswagen;Golf VII;2015;03L903023;85;Elektro;Dobrý;Odskúšaný alternátor, nabíja správne.;Škoda Octavia III\nZlý riadok;Tesla;X;;12;0;Nič;;krátky;\n";
    require("fs").writeFileSync("i.csv", csv); await pg.setInputFiles(".pp-file input", "i.csv");
    await pg.waitForSelector(".pp-pre li.err"); const okc = await pg.locator(".pp-pre li.ok").count(); if (okc !== 1) throw new Error("ok rows " + okc + " :: " + (await pg.locator(".pp-pre").innerText()));
    await pg.click("text=Importovať 1"); await pg.waitForSelector(".pp-toast:has-text('Importované: 1')", { timeout: 15000 });
  });
  await step("odhlasenie", async () => { await pg.click("text=Odhlásiť sa"); await pg.waitForURL("**/pre-predajcov"); });
  console.log("ERRORS:", errs.length ? "\n" + [...new Set(errs)].join("\n") : "none");
  await br.close();
})();
