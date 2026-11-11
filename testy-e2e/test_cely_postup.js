const { chromium } = require("playwright");
const B = "http://127.0.0.1:3000", G = "http://127.0.0.1:54321";
const errs = [];
// aktuálna verzia obchodných podmienok z web/lib/operator.ts (cesta k repozitáru: RZ_REPO)
const TERMS = /TERMS_VERSION = "([^"]+)"/.exec(require("fs").readFileSync((process.env.RZ_REPO || "/home/claude/rozoberacka") + "/web/lib/operator.ts", "utf8"))[1];
(async () => {
  const br = await chromium.launch(); const ctx = await br.newContext({ viewport: { width: 1280, height: 900 } }); const pg = await ctx.newPage();
  // voľba v lište cookies už je uložená (lištu testuje samostatný krok), aby neprekrývala tlačidlá
  const seen = () => localStorage.setItem("rozoberacka-suhlas", JSON.stringify({ v: 2, at: new Date().toISOString(), analytics: false }));
  await ctx.addInitScript(seen);
  pg.on("console", (m) => { if (m.type() === "error") errs.push("console: " + m.text()); });
  pg.on("response", (r) => { if (r.status() >= 400) errs.push("HTTP " + r.status() + " " + r.request().method() + " " + r.url().slice(0, 140)); }); pg.on("pageerror", (e) => errs.push("pageerror: " + e.message));
  const step = async (n, f) => { try { await f(); console.log("OK  ", n); } catch (e) { console.log("FAIL", n, "->", e.message.split("\n")[0]); await (global.CUR||pg).screenshot({ path: "fail-" + n.replace(/\W+/g, "_") + ".png", fullPage: true }); } };
  await step("home: Hladat nad OEM", async () => {
    await pg.goto(B + "/"); await pg.waitForSelector(".panel");
    const a = await pg.locator(".pa .btn").boundingBox(), o = await pg.locator(".oemrow").boundingBox();
    if (!(a.y < o.y)) throw new Error(`Hladat y=${a.y} oem y=${o.y}`);
  });
  await step("najhladanejsie diely nastavia kategoriu", async () => {
    await pg.click(".pop .chip:has-text('Prevodovka')"); await pg.waitForURL(/kat=pr/);
    if (await pg.locator(".pop .chip:has-text('Prevodovka')").getAttribute("aria-pressed") !== "true") throw new Error("tlacidlo nie je zapnute");
    await pg.click(".pop .chip:has-text('Zadné svetlo')"); await pg.waitForURL(/kat=sv&pod=\d+/);
    if (/q=/.test(pg.url())) throw new Error("ostal skryty text");
    await pg.click(".pop .chip:has-text('Zadné svetlo')"); await pg.waitForFunction(() => !location.search.includes("kat="));
    if ((await pg.locator(".pa .btn").innerText()) !== "Hľadať" || !(await pg.locator("#vin .btn2").innerText()).includes("Hľadať podľa VIN")) throw new Error("texty tlacidiel");
  });
  await step("VIN: auto, rok 1995/2025, nakladne auto prepne druh", async () => {
    await pg.goto(B + "/"); await pg.waitForSelector("#vin input");
    await pg.fill("#vin input:not([type=file])", "WVWZZZ1HZSW123456"); await pg.click("#vin .btn2");
    await pg.waitForSelector("#vin .vmsg:has-text('Volkswagen')"); await pg.waitForSelector("#vin .vmsg:has-text('2025 alebo 1995')");
    if (/rok=|rocnik=/.test(pg.url())) throw new Error("VIN nastavil ročník ako filter: " + pg.url());
    await pg.fill("#vin input:not([type=file])", "WDD2050041F123456"); await pg.click("#vin .btn2"); await pg.waitForSelector("#vin .vmsg:has-text('nezapisuje')");
    await pg.fill("#vin input:not([type=file])", "YS2R4X20005123456"); await pg.click("#vin .btn2");
    await pg.waitForSelector(".vmsg-res:has-text('Scania')"); await pg.waitForSelector(".vmsg-res:has-text('Nákladné autá')");
    if (await pg.locator("[role=tab][aria-selected=true]").innerText() !== (await pg.locator("[role=tab]:has-text('Nákladné')").innerText())) throw new Error("druh sa neprepol");
    if (await pg.locator("#vin").count()) throw new Error("pri nákladných je VIN");
    await pg.goto(B + "/");
  });
  await step("cookies: lista, nastavenia, odkaz v paticke", async () => {
    const c0 = await br.newContext(); const p0 = await c0.newPage();
    await p0.goto(B + "/ako-zoradujeme"); await p0.waitForSelector(".ckbar"); await p0.waitForSelector("h1:has-text('Ako zoraďujeme')");
    await p0.click(".ckbar button:has-text('Rozumiem')"); await p0.waitForSelector(".ckbar", { state: "detached" });
    await p0.reload(); await p0.waitForTimeout(600); if (await p0.locator(".ckbar").count()) throw new Error("lista sa zobrazila znova");
    await p0.click("footer button:has-text('Nastavenia cookies')"); await p0.waitForSelector(".ckdlg:has-text('Nevyhnutné')");
    await p0.click(".ckdlg button:has-text('Zavrieť')"); await p0.waitForSelector(".ckdlg", { state: "detached" });
    await c0.close();
  });
  await step("hlavicka -> prihlasenie", async () => { await pg.click("text=Prihlásenie predajcu"); await pg.waitForURL("**/pre-predajcov"); });
  await step("registracia validacia", async () => {
    await pg.click("role=tab[name='Registrácia']"); await pg.click("button:has-text('Vytvoriť účet')");
    await pg.waitForSelector(".pp-err");
  });
  await step("registracia", async () => {
    await pg.click(".pp-typeo:has-text('Ako podnikateľ')");
    await pg.fill("input[autocomplete=organization]", "Vrakovisko Test"); await pg.fill("input[type=email]", "test@rz.sk"); await pg.fill("input[type=password]", "heslo1234");
    await pg.fill("input[placeholder='12345678']", "12 345 678"); await pg.fill("input[autocomplete=street-address]", "Hlavná 1, 010 01 Žilina");
    for (const c of await pg.locator(".pp-chk input").all()) await c.check();
    await pg.click("button:has-text('Vytvoriť účet')"); await pg.waitForSelector(".pp-ok");
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
    await pg.click(".pp-nav button:has-text('Profil a nastavenia')"); await pg.fill(".pp-form label:has-text('Mesto') input", "Žilina"); await pg.fill(".pp-form label:has-text('Telefón') input", "0905 111 222");
    await pg.click("text=Uložiť profil"); await pg.waitForSelector(".pp-toast:has-text('Profil uložený')");
  });
  await step("formular prazdny -> chyby", async () => {
    await pg.click(".pp-nav button:has-text('Jeden inzerát')"); await pg.click("text=Ďalej →"); await pg.waitForSelector("label.bad"); const n = await pg.locator("label.bad").count(); if (n < 3) throw new Error("bad=" + n);
  });
  await step("formular vyplnit a ulozit", async () => {
    await pg.fill("label:has-text('Názov dielu') input", "Predné ľavé svetlo LED");
    await pg.selectOption("label:has-text('Kategória') select", { label: "Svetlá" });
    await pg.selectOption("label:has-text('Podkategória') select", { label: "Predné svetlá" });
    await pg.fill("label:has-text('OEM') input:not([type=file])", "5E1 941 015");
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
  const c2 = await br.newContext(); await c2.addInitScript(seen); const b2 = await c2.newPage(); global.CUR = b2; b2.on("pageerror", (e) => errs.push("buyer pageerror: " + e.message)); b2.on("console", (m) => { if (m.type() === "error") errs.push("buyer console: " + m.text()); });
  await step("verejne: inzerat na uvode", async () => { await b2.goto(B + "/"); await b2.waitForSelector(".card:has-text('Predné ľavé svetlo LED')"); await b2.waitForSelector(".find-foot:has-text('1')"); });
  await step("ulozene hladanie (strazca)", async () => {
    await b2.selectOption(".panel label:has-text('Značka') select", { label: "Škoda" }); await b2.waitForTimeout(500);
    await b2.click("text=Uložiť hľadanie"); await b2.waitForSelector(".saved-i:has-text('Škoda')");
    await b2.goto(B + "/"); await b2.waitForSelector(".saved-i:has-text('Škoda')"); await b2.click(".saved-i .chip"); await b2.waitForSelector(".saved-ok:has-text('Hľadanie uložené')");
    await b2.goto(B + "/");
  });
  await step("verejne: hladanie OEM bez medzier", async () => { await b2.fill(".oemrow input:not([type=file])", "5e1941015"); await b2.click("text=Hľadať podľa čísla"); await b2.waitForSelector(".cnt:has-text('1')"); });
  await step("verejne: hladanie podla auta cez pasuje aj na (VW)", async () => {
    await b2.goto(B + "/"); await b2.selectOption(".panel label:has-text('Značka') select", { label: "Volkswagen" }); await b2.waitForSelector(".card:has-text('Predné ľavé svetlo LED')");
  });
  await step("nasepkavanie v hlavicke", async () => {
    await b2.goto(B + "/"); await b2.click(".gs input[type=search]"); await b2.fill(".gs input[type=search]", "predne lav");
    await b2.waitForSelector(".hs-list li:has-text('Predné ľavé svetlo LED')");
    await b2.fill(".gs input[type=search]", "octavia iii"); await b2.waitForSelector(".hs-list li:has-text('Škoda Octavia III')");
    await b2.click(".hs-list li:has-text('Škoda Octavia III')");
    await b2.waitForFunction(() => { const s = document.querySelector(".panel label select"); return s && s.selectedOptions[0]?.textContent === "Škoda"; });
  });
  await step("moje auto: ulozit a pri navrate pouzit", async () => {
    await b2.click("text=Uložiť ako moje auto"); await b2.waitForSelector(".mycar.on:has-text('Octavia III')");
    await b2.goto(B + "/"); await b2.waitForSelector(".mycar.on:has-text('Octavia III')");
    await b2.waitForFunction(() => document.querySelectorAll(".panel label select")[1]?.selectedOptions[0]?.textContent?.startsWith("Octavia III"));
  });
  await step("odfotit OEM (citanie v prehliadaci)", async () => {
    await b2.setInputFiles(".oemrow input[type=file]", __dirname + "/oem.jpg");
    await b2.waitForSelector(".scan-r .chip:has-text('5E0823031')", { timeout: 90000 });
    await b2.click(".scan-r .chip:has-text('5E0823031')");
    await b2.waitForFunction(() => document.querySelector(".oemrow input:not([type=file])")?.value === "5E0823031");
  });
  await step("detail + telefon + sprava", async () => {
    await b2.goto(B + "/?q=" + encodeURIComponent("ľavé svetlo")); await b2.waitForSelector(".card:has-text('Predné ľavé svetlo LED')");
    await b2.click(".card:has-text('Predné ľavé svetlo LED') a >> nth=0"); await b2.waitForURL("**/diel/**"); await b2.waitForSelector("text=Pasuje na");
    await b2.waitForSelector(".mycar-fit.yes:has-text('Octavia III')");
    await b2.waitForSelector(".snote.trader:has-text('IČO 12345678')"); await b2.waitForSelector(".seller:has-text('Podnikateľ')");
    await b2.click("text=Zobraziť telefón"); await b2.waitForSelector("text=0905 111 222");
    await b2.click("text=Napísať predajcovi");
    const box = b2.locator(".msgbox"); await box.locator("input >> nth=0").fill("Jano Kupec"); await box.locator("input >> nth=1").fill("0911 222 333"); await box.locator("textarea").fill("Dobrý deň, je svetlo ešte dostupné?");
    await box.locator("text=Odoslať správu").click(); await b2.waitForSelector("text=Správa bola odoslaná");
  });
  global.CUR = pg;
  await step("portal: statistiky a sprava", async () => {
    await pg.goto(B + "/predajca#home"); await pg.reload(); await pg.waitForSelector(".pp-tile");
    const t = await pg.locator(".pp-tiles").innerText(); console.log("   tiles:", t.replace(/\n/g, " | "));
    await pg.click(".pp-nav button:has-text('Správy od kupujúcich')"); await pg.waitForSelector(".pp-msgs li.unread:has-text('Jano Kupec')"); await pg.click("text=Označiť ako prečítané >> nth=0"); await pg.waitForSelector(".pp-msgs li:not(.unread)");
  });
  await step("odpoved predajcu a konverzacia kupujuceho", async () => {
    global.CUR = b2;
    await b2.goto(B + "/?q=" + encodeURIComponent("ľavé svetlo")); await b2.click(".card:has-text('Predné ľavé svetlo LED') a >> nth=0"); await b2.waitForURL("**/diel/**");
    await b2.click("text=Napísať predajcovi"); const box = b2.locator(".msgbox");
    await box.locator("input >> nth=0").fill("Mila Kupcova"); await box.locator("input >> nth=1").fill("Mila.Kupcova@test.sk"); await box.locator("textarea").fill("Dobrý deň, pošlete svetlo na dobierku?");
    await box.locator("text=Odoslať správu").click(); await b2.waitForSelector("text=odpoveď vám príde e-mailom");
    global.CUR = pg; await pg.reload(); await pg.click(".pp-nav button:has-text('Správy od kupujúcich')");
    const th = pg.locator(".pp-msgs > li", { hasText: "Mila Kupcova" }); await th.locator(".pp-reply textarea").waitFor();
    if (!(await pg.locator(".pp-msgs > li", { hasText: "Jano Kupec" }).locator("text=Kupujúci nezadal e-mail").count())) throw new Error("pri telefóne chýba upozornenie");
    await th.locator(".pp-reply textarea").fill("Áno, pošlem na dobierku, 8 € poštovné.");
    await th.locator("button:has-text('odpoveď')").click(); await pg.waitForSelector(".pp-toast:has-text('Odpoveď')");
    await pg.waitForSelector(".pp-msgs > li:has-text('Mila Kupcova') .pp-thread li.me:has-text('8 € poštovné')");
    const token = require("child_process").execSync("psql -h /tmp/pgt -p 5499 -U postgres -d e2e -tAq", { input: "select reply_token from messages where sender_name = 'Mila Kupcova'" }).toString().trim();
    if (!/^[0-9a-f-]{36}$/.test(token)) throw new Error("token " + token);
    global.CUR = b2; await b2.goto(B + "/sprava/" + token);
    await b2.waitForSelector(".thr-list li.them:has-text('8 € poštovné')"); if (/Mila\.Kupcova@test\.sk/i.test(await b2.content())) throw new Error("e-mail v konverzácii");
    await b2.fill(".thr-reply textarea", "Super, posielam adresu: Hlavná 1, Trnava."); await b2.click(".thr-reply >> text=Odoslať"); await b2.waitForSelector("text=Odoslané.");
    await b2.waitForSelector(".thr-list li.me:has-text('Hlavná 1')");
    await b2.goto(B + "/sprava/00000000-0000-0000-0000-000000000000"); await b2.waitForSelector("text=Konverzácia sa nenašla");
    global.CUR = pg; await pg.reload(); await pg.click(".pp-nav button:has-text('Správy od kupujúcich')"); await pg.waitForSelector(".pp-msgs li.unread:has-text('Hlavná 1')");
    const n = require("child_process").execSync("psql -h /tmp/pgt -p 5499 -U postgres -d e2e -tAq", { input: "set role service_role; select count(*) from reply_outbox()" }).toString().trim();
    if (n.split("\n").pop() !== "2") throw new Error("fronta e-mailov " + n);
  });
  await step("upravit inzerat", async () => {
    await pg.click(".pp-nav button:has-text('Moje inzeráty')"); await pg.click(".pp-row:has-text('Predné ľavé') >> text=Upraviť");
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
    await pg.click(".pp-nav button:has-text('Import z CSV')");
    const csv = "nazov;znacka;model;rocnik;oem;cena;kategoria;stav;popis;pasuje;fotky\nAlternátor 140A;Volkswagen;Golf VII;2015;03L903023;85;Elektro;Dobrý;Odskúšaný alternátor, nabíja správne.;Škoda Octavia III;alt1.png|chyba.png\nZlý riadok;Tesla;X;;12;0;Nič;;krátky;;\n";
    require("fs").writeFileSync("i.csv", csv); require("fs").copyFileSync("a.png", "alt1.png"); await pg.setInputFiles(".pp-file input", "i.csv");
    await pg.waitForSelector(".pp-pre li.err"); const okc = await pg.locator(".pp-pre li.ok").count(); if (okc !== 1) throw new Error("ok rows " + okc + " :: " + (await pg.locator(".pp-pre").innerText()));
    await pg.waitForSelector(".pp-pre li.ok:has-text('bez fotky – inzerát bude pozastavený')");
    await pg.setInputFiles(".pp-bulkph input", ["alt1.png"]); await pg.waitForSelector(".pp-pre li.ok .pp-prephotos img");
    await pg.waitForSelector(".pp-pre li.ok:has-text('nenájdené fotky: chyba.png')"); await pg.waitForSelector(".pp-photosum:has-text('1 z 1 inzerátov má fotky')");
    await pg.click("text=Importovať 1"); await pg.waitForSelector(".pp-toast:has-text('Importované: 1')", { timeout: 15000 });
  });
  await step("auto na diely + rychle pridanie dielov", async () => {
    await pg.click(".pp-nav button:has-text('Z auta na diely')"); await pg.click("text=+ Pridať vozidlo");
    await pg.selectOption("label:has-text('Značka') select", { label: "Škoda" });
    const m = pg.locator("label:has-text('Model') select"); const o = (await m.locator("option").allTextContents()).find((t) => /^Octavia III/.test(t)); await m.selectOption({ label: o });
    await pg.selectOption("label:has-text('Ročník') select", "2016"); await pg.fill("label:has-text('Najazdené km') input", "150000");
    await pg.fill("label:has-text('VIN') input:not([type=file])", "TMBJJ7NE0G0123456");
    await pg.click("text=Uložiť a pridať diely"); await pg.waitForSelector("text=Diely z vozidla");
    const row = (n) => pg.locator(".pp-qr", { has: pg.locator(`input[value="${n}"]`) });
    await row("Kapota").locator("input[aria-label^='OEM']").fill("5E0823031"); await row("Kapota").locator("input[aria-label^='Cena']").fill("90");
    await row("Alternátor").locator("input[aria-label^='OEM']").fill("04L903023"); await row("Alternátor").locator("input[aria-label^='Cena']").fill("70");
    await pg.click("text=Vytvoriť 2 inzeráty"); await pg.waitForSelector(".pp-toast:has-text('Vytvorené: 2')", { timeout: 20000 });
    await pg.waitForSelector(".pp-row:has-text('Diely z vozidla: 2')");
  });
  if (!process.env.RZ_CARS) await step("havarovane vozidla su skryte", async () => {
    const r = await b2.goto(B + "/havarovane-vozidla"); if (r.status() !== 404) throw new Error("stav " + r.status());
    await b2.goto(B + "/"); if (await b2.locator(".snav >> text=Havarované vozidlá").count()) throw new Error("odkaz v ponuke");
    if (await b2.locator("a[href='/havarovane-vozidla']").count()) throw new Error("odkaz na stránke (napr. pätička)");
    if (await pg.locator(".pp-nav >> text=Havarované vozidlá").count()) throw new Error("záložka v portáli");
    if (await pg.locator("text=Predať celé vozidlo").count()) throw new Error("tlačidlo Predať celé vozidlo");
    const sm = await (await b2.request.get(B + "/sitemap.xml")).text(); if (/havarovane-vozidla/.test(sm)) throw new Error("v mape webu");
  });
  if (process.env.RZ_CARS) await step("havarovane vozidlo: predajca prida z auta na diely", async () => {
    await pg.click(".pp-row:has-text('Diely z vozidla: 2') >> text=Predať celé vozidlo"); await pg.waitForSelector("h1:has-text('Predať havarované vozidlo')");
    await pg.waitForSelector(".pp-donor-note:has-text('Octavia III')");
    await pg.click("text=Zverejniť vozidlo"); await pg.waitForSelector(".pp-err:has-text('Vyberte stav vozidla')");
    await pg.selectOption("label:has-text('Stav vozidla') select", "Havarované – nepojazdné"); await pg.selectOption("label:has-text('Doklady') select", "S dokladmi – odhlásené");
    await pg.click("text=Zverejniť vozidlo"); await pg.waitForSelector(".pp-err:has-text('Vyberte palivo')"); await pg.waitForSelector(".pp-err:has-text('kľúče')");
    await pg.selectOption("label:has-text('Palivo') select", "Nafta"); await pg.selectOption("label:has-text('Karoséria') select", "Kombi");
    await pg.fill("label:has-text('Najazdené km') input", "210000"); await pg.fill("label:has-text('Výkon') input", "110");
    await pg.selectOption("label:has-text('Naštartuje') select", "0"); await pg.selectOption("label:has-text('Kľúče') select", "1");
    await pg.check(".pp-dmg label:has-text('Predok') input"); await pg.check(".pp-dmg label:has-text('Airbagy') input");
    await pg.fill("label:has-text('Cena (€)') input", "1800"); await pg.fill("label:has-text('Popis') textarea", "Čelný náraz, airbagy vystrelené, zadná časť a interiér v poriadku.");
    await pg.setInputFiles(".pp-add input[type=file]", ["a.png"]); await pg.waitForSelector(".pp-phl figure");
    await pg.click("text=Zverejniť vozidlo"); await pg.waitForSelector(".pp-toast:has-text('je zverejnené')", { timeout: 20000 });
    await pg.waitForSelector(".car-row:has-text('Octavia III') >> text=Havarované – nepojazdné");
  });
  if (process.env.RZ_CARS) await step("havarovane vozidla: zoznam, detail, telefon, sprava", async () => {
    global.CUR = b2;
    await b2.goto(B + "/havarovane-vozidla"); await b2.waitForSelector(".carcard:has-text('Octavia III')");
    await b2.click(".cs-vt >> text=Motorky a štvorkolky"); await b2.waitForSelector("text=0 vozidiel"); await b2.click(".cs-vt >> text=Osobné autá"); await b2.waitForSelector(".carcard");
    await b2.click(".cars-conds >> text=Na diely"); await b2.waitForSelector("text=0 vozidiel"); await b2.click(".cars-conds >> text=Všetky stavy"); await b2.waitForSelector(".carcard");
    await b2.click(".carcard a"); await b2.waitForURL("**/vozidlo/**"); await b2.waitForSelector("h1:has-text('Havarované – nepojazdné')");
    await b2.waitForSelector("dd:text-is('Kombi')"); await b2.waitForSelector("dd:has-text('110 kW')");
    const h = await b2.content(); if (/TMBJJ7NE0G0123456/.test(h)) throw new Error("VIN je verejne");
    // diely z auta na diely sú zatiaľ pozastavené (bez fotiek) – kupujúci ich nevidí
    if (await b2.locator("h2:has-text('Diely z tohto vozidla')").count()) throw new Error("pozastavené diely sú verejné"); await b2.waitForSelector(".disclaimer:has-text('KJ trade')");
    await b2.click(".cd-box >> text=Zobraziť telefón"); await b2.waitForSelector(".cd-box >> text=0905 111 222");
    await b2.click(".cd-box >> text=Napísať predajcovi"); await b2.fill(".msgbox label:has-text('Vaše meno') input", "Jano"); await b2.fill(".msgbox label:has-text('Telefón alebo e-mail') input", "jano@test.sk");
    await b2.click(".msgbox >> text=Odoslať správu"); await b2.waitForSelector("text=Správa bola odoslaná");
    global.CUR = pg; await pg.goto(B + "/predajca#msg"); await pg.reload(); await pg.waitForSelector(".pp-msgs li:has-text('Celé vozidlo')");
  });
  await step("pneumatiky a disky: parametre vo formulari a filtri", async () => {
    await pg.click(".pp-nav button:has-text('Jeden inzerát')"); await pg.fill(".pp-form label:has-text('Názov dielu') input", "Disky 16 Škoda 5x112");
    await pg.selectOption(".pp-form select:has(option:text-is('Pneumatiky a disky'))", { label: "Pneumatiky a disky" });
    await pg.click("text=Ďalej →"); await pg.waitForSelector(".pp-ferr:has-text('čo predávate')");
    // pneumatiky: rozmer, sezóna zo zvolenej podkategórie, bez čísla dielu
    await pg.selectOption(".pp-form label:has-text('Čo predávate') select", { label: "Pneumatiky zimné" }); await pg.waitForSelector(".pp-specg legend:text-is('Pneumatika')");
    if (await pg.locator(".pp-form label:has-text('OEM')").count()) throw new Error("pri pneumatikách je pole OEM");
    if (await pg.inputValue(".pp-specg label:has-text('Sezóna') select") !== "zimné") throw new Error("sezóna sa nevyplnila");
    await pg.click("text=Ďalej →"); await pg.waitForSelector(".pp-ferr:has-text('šírka pneumatiky')");
    // disky
    await pg.selectOption(".pp-form label:has-text('Čo predávate') select", { label: "Disky hliníkové" }); await pg.waitForSelector(".pp-specg legend:text-is('Disk')");
    if (await pg.locator(".pp-specg legend:text-is('Pneumatika')").count()) throw new Error("pri diskoch sú polia pneumatiky");
    await pg.fill(".pp-specg label:has-text('Rozteč') input", "5x112"); await pg.selectOption(".pp-specg label:has-text('Priemer') select", "16");
    await pg.fill(".pp-specg label:has-text('Zális') input", "abc"); await pg.fill(".pp-form label:has-text('OEM') input", "5E0601025");
    await pg.click("text=Ďalej →"); await pg.waitForSelector(".pp-ferr:has-text('Doplňte alebo opravte')");
    await pg.fill(".pp-specg label:has-text('Zális') input", "46"); await pg.fill(".pp-specg label:has-text('Šírka disku') input", "6.5"); await pg.fill(".pp-specg label:has-text('Počet kusov') input", "4");
    await pg.click("text=Ďalej →"); await pg.waitForSelector(".pp-form label:has-text('Značka auta')");
    if (await pg.locator(".pp-form label:has-text('Prevodovka auta')").count()) throw new Error("pri diskoch je prevodovka auta");
  });
  await step("export CSV a hromadna cena", async () => {
    await pg.click(".pp-nav button:has-text('Moje inzeráty')"); await pg.waitForSelector(".pp-row");
    const [dl] = await Promise.all([pg.waitForEvent("download"), pg.click("text=Export CSV")]);
    const t = require("fs").readFileSync(await dl.path(), "utf8"); if (!/^\uFEFFnazov;druh;znacka;model/.test(t) || !/Kapota/.test(t)) throw new Error(t.slice(0, 120));
    await pg.click(".pp-chips >> text=Pozastavené"); await pg.check(".pp-rowh input"); await pg.click("text=Zmeniť cenu");
    await pg.fill(".pp-price input", "-10"); await pg.click(".pp-price >> text=Použiť na"); await pg.waitForSelector(".pp-toast:has-text('Ceny zmenené')");
    await pg.waitForSelector(".pp-row:has-text('Kapota') >> text=81 €");
  });
  await step("fotky hromadne podla cisla dielu", async () => {
    await pg.click(".pp-nav button:has-text('Hromadne z fotiek')"); await pg.waitForSelector("h1:has-text('Hromadne z fotiek')");
    await pg.click(".fp-mode >> text=Doplniť fotky k existujúcim inzerátom");
    require("fs").copyFileSync("a.png", "5E0823031_1.png"); require("fs").copyFileSync("a.png", "nic-nesedi.png");
    await pg.setInputFiles(".pp-bulkph input", ["5E0823031_1.png", "nic-nesedi.png"]);
    await pg.waitForSelector(".pp-pre li:has-text('Kapota') .pp-prephotos img"); await pg.waitForSelector("text=Nepriradené (1)");
    await pg.waitForSelector(".pp-photosum:has-text('po pridaní fotiek zverejní')");
    const cons = []; pg.on("console", (m) => cons.push(m.text()));
    await pg.click(".pp-box .btn:has-text('Pridať fotky')");
    try { await pg.waitForSelector(".pp-toast:has-text('Fotky doplnené k 1 inzerátu')", { timeout: 30000 }); }
    catch (e) { console.log("DEBUG", (await pg.locator(".pp-body").innerText()).slice(0, 800), cons.slice(-10)); throw e; }
    await pg.click(".pp-nav button:has-text('Moje inzeráty')"); await pg.waitForSelector(".pp-row:has-text('Kapota') .pp-th img");
    await pg.click(".pp-chips >> text=Aktívne"); await pg.waitForSelector(".pp-row:has-text('Kapota')");
  });
  await step("hromadne z fotiek: nove inzeraty (najprv fotky)", async () => {
    await pg.click(".pp-nav button:has-text('Hromadne z fotiek')"); await pg.waitForSelector(".fp-mode button[aria-selected='true']:has-text('Nové inzeráty z fotiek')");
    await pg.selectOption(".fp-donor select", { index: 1 });
    for (const n of ["h1.png", "h2.png", "h3.png"]) require("fs").copyFileSync("a.png", n);
    // rôzny obsah, aby sa súbory nezlúčili ako duplikáty
    require("fs").appendFileSync("h2.png", Buffer.from([0])); require("fs").appendFileSync("h3.png", Buffer.from([0, 0]));
    await pg.setInputFiles(".fp-pick input", ["h1.png", "h2.png", "h3.png"]); await pg.waitForFunction(() => document.querySelectorAll(".fp-pool li").length === 3);
    await pg.click(".fp-pool li >> nth=0 >> button"); await pg.click(".fp-pool li >> nth=1 >> button"); await pg.waitForSelector(".fp-pool .fp-n:has-text('2')");
    await pg.click("text=Vytvoriť diel z označených"); await pg.waitForFunction(() => document.querySelectorAll(".fp-pool li").length === 1);
    await pg.click(".fp-pool li >> nth=0 >> button"); await pg.click("text=Vytvoriť diel z označených"); await pg.waitForSelector(".fp-parts > li >> nth=1");
    if ((await pg.locator(".fp-parts > li >> nth=0 >> .fp-th").count()) !== 2) throw new Error("prvy diel nema 2 fotky");
    await pg.click("text=Zverejniť 2 inzeráty"); await pg.waitForSelector(".pp-err:has-text('Doplňte údaje pri 2 dieloch')");
    const p0 = pg.locator(".fp-parts > li >> nth=0"), p1 = pg.locator(".fp-parts > li >> nth=1");
    await p0.locator(".fp-name input").fill("Predné svetlo ľavé");
    if ((await p0.locator(".fp-cat select").inputValue()) !== "sv") throw new Error("kategoria sa nedoplnila z nazvu");
    await p0.locator(".fp-oem input:not([type=file])").fill("5E1941015B"); await p0.locator("label:has-text('Cena') input").fill("120");
    await p1.locator(".fp-name input").fill("Volant kožený"); await p1.locator(".fp-cat select").selectOption("int");
    await p1.locator(".fp-oem input:not([type=file])").fill("5E0419091"); await p1.locator("label:has-text('Cena') input").fill("45");
    await pg.click("text=Zverejniť 2 inzeráty"); await pg.waitForSelector(".pp-toast:has-text('Zverejnené: 2 inzeráty')", { timeout: 30000 });
    await pg.click(".pp-nav button:has-text('Moje inzeráty')"); await pg.click(".pp-chips >> text=Aktívne");
    await pg.waitForSelector(".pp-row:has-text('Volant kožený') .pp-th img"); await pg.waitForSelector(".pp-row:has-text('Predné svetlo ľavé') .pp-th img");
  });
  let reqUrl = "";
  await step("dopyt: kupujuci zada", async () => {
    await b2.goto(B + "/dopyt"); await b2.selectOption("label:has-text('Značka') select", { label: "Škoda" });
    await b2.fill("label:has-text('Aký diel') input", "Ľavé predné svetlo xenón"); await b2.fill("label:has-text('Meno') input", "Fero");
    await b2.fill("label:has-text('Telefón alebo e-mail') input", "0918 123 456"); await b2.check(".pp-chk input"); await b2.click("text=Odoslať dopyt predajcom");
    await b2.waitForSelector("text=Dopyt je odoslaný"); reqUrl = await b2.locator(".rq-url a").getAttribute("href");
  });
  await step("dopyt: predajca posle ponuku", async () => {
    await pg.click(".pp-nav button:has-text('Dopyty na diely')"); await pg.waitForSelector(".pp-msgs li:has-text('Ľavé predné svetlo xenón')");
    await pg.click("text=Mám tento diel – poslať ponuku"); await pg.fill(".rq-offer label:has-text('Cena') input", "95"); await pg.click(".rq-offer >> text=Poslať ponuku");
    await pg.waitForSelector("text=Ponuka odoslaná");
  });
  await step("dopyt: kupujuci vidi ponuku", async () => {
    await b2.goto(B + reqUrl); await b2.waitForSelector("text=Ponuky od predajcov (1)"); await b2.waitForSelector("text=95 €");
  });
  await step("hodnotenie predajcu z dopytu", async () => {
    await b2.click("text=Ohodnotiť predajcu"); await b2.click(".rate-s button[aria-label='5 z 5']");
    await b2.fill(".rate textarea", "Rýchla odpoveď, diel sedel."); await b2.click("text=Uložiť hodnotenie");
    await b2.waitForSelector("text=Vaše hodnotenie: ★★★★★");
  });
  await step("stranka predajcu s hodnotenim", async () => {
    await b2.click(".pp-mh a"); await b2.waitForURL("**/predajci/**"); await b2.waitForSelector("h1:has-text('Vrakovisko Test')");
    await b2.waitForSelector(".seller-head .stars:has-text('5,0')"); await b2.waitForSelector(".reviews li:has-text('Fero')");
    await b2.waitForSelector("h2:has-text('Diely v ponuke')");
  });
  await step("stranka predajcu: hladanie v celej ponuke", async () => {
    const all = await b2.locator(".stock .card").count(); if (!all) throw new Error("ziadne diely");
    await b2.fill(".stock-t input", "xyzneexistuje"); await b2.waitForSelector(".stock .empty");
    await b2.click(".stock .empty button"); await b2.waitForFunction((n) => document.querySelectorAll(".stock .card").length === n, all);
  });
  await step("SEO: detail pripraveny na serveri", async () => {
    const id = require("child_process").execSync(`psql -h /tmp/pgt -p 5499 -U postgres -d e2e -tAc "select max(id) from listings where status='active'"`).toString().trim();
    const r = await fetch(B + "/diel/" + id); const h = await r.text(); if (!new RegExp(`<link rel="canonical" href="[^"]*/diel/${id}-[a-z0-9-]+"`).test(h)) throw new Error("hlavná adresa (canonical) bez názvu: " + r.url);
    if (!/application\/ld\+json/.test(h) || !/"@type":"Product"/.test(h) || !/<link rel="canonical"/.test(h))
      throw new Error(`chyba SEO v HTML: id ${id} ${r.status} ${r.url} ld=${/application\/ld\+json/.test(h)} product=${/"@type":"Product"/.test(h)} canonical=${/<link rel="canonical"/.test(h)} predane=${/Predané|nedostupné/.test(h)} title=${(h.match(/<title>([^<]*)/) || [])[1]}`);
  });
  await step("predany diel: stranka ostane s nahradou", async () => {
    const q = (x) => require("child_process").execSync(`psql -h /tmp/pgt -p 5499 -U postgres -d e2e -tAc "${x}"`).toString().trim();
    const [id, st] = q("select id || '|' || status from listings where status in ('active','paused') order by id desc limit 1").split("|");
    q(`update listings set status='sold' where id=${id}`);
    const r = await fetch(B + "/diel/" + id); const h = await r.text();
    q(`update listings set status='${st}' where id=${id}`);
    if (r.status !== 200 || !/Predané/.test(h) || !/noindex/.test(h) || /class="dacts"/.test(h))
      throw new Error(`id ${id} (${st}) status ${r.status} predane=${/Predané/.test(h)} noindex=${/noindex/.test(h)} detail=${/class="dacts"/.test(h)} ${h.length}`);
  });
  await step("SEO: mesto, navody, mapa webu, aplikacia", async () => {
    const t = async (u, re) => { const r = await fetch(B + u); const h = await r.text(); if (r.status !== 200 || !re.test(h)) throw new Error(u + " " + r.status); return h; };
    await t("/mesto/zilina", /Použité autodiely Žilina/);
    await t("/navody/vin", /Kde nájdem VIN číslo auta/);
    await t("/navody/oem-cislo", /"@type":"Article"/);
    // produkčný web obnovuje mapu webu raz za hodinu – mestá a predajcov kontrolujeme len vo vývojovom režime
    const sm = await t("/sitemap.xml", /\/navody\/vin/); if (process.env.RZ_PROD !== "1" && (!/\/predajci\//.test(sm) || !/\/mesto\/zilina/.test(sm))) throw new Error("sitemap");
    await t("/manifest.webmanifest", /"short_name":"autosuciastky.eu"/);
    await t("/sw.js", /Ste bez internetu/);
    await t("/ocr/worker.min.js", /./);
    const r = await fetch(B + "/mesto/neexistuje"); if (r.status !== 404) throw new Error("mesto 404 " + r.status);
  });
  await step("strazca: zrusenie neexistujuceho odkazu", async () => {
    await b2.goto(B + "/strazca/zrusit/00000000-0000-4000-8000-000000000000"); await b2.waitForSelector("text=Upozornenie už neexistuje");
  });
  await step("hladanie s preklepom (server)", async () => {
    await b2.goto(B + "/?q=alternatr"); await b2.waitForSelector(".card:has-text('Alternátor 140A')");
    await b2.goto(B + "/?q=dynamo"); await b2.waitForSelector(".card:has-text('Alternátor 140A')");
  });
  await step("karta pouziva nahlad fotky", async () => {
    await b2.goto(B + "/?q=octavia"); await b2.waitForSelector(".card img");
    const src = await b2.locator(".card img").first().getAttribute("src"); if (!/_t\.(jpg|webp)/.test(src)) throw new Error(src);
    await b2.waitForFunction(() => { const i = document.querySelector(".card img"); return i.complete && i.naturalWidth > 0 && i.naturalWidth <= 480; });
  });
  await step("nahlasenie inzeratu", async () => {
    await b2.click(".card:has-text('LED Octavia') h2 a"); await b2.waitForURL("**/diel/**");
    await b2.click("text=Nahlásiť inzerát"); await b2.selectOption(".rep select", "Podvod"); await b2.fill(".rep textarea", "Chce zálohu vopred.");
    await b2.click("text=Odoslať nahlásenie"); await b2.waitForSelector(".rep .ferr2:has-text('pravdivé')");
    await b2.check(".rep .pp-chk input"); await b2.click("text=Odoslať nahlásenie"); await b2.waitForSelector("text=nahlásenie sme prijali");
  });
  await step("zaruka firmy bez moznosti Bez zaruky", async () => {
    await pg.click(".pp-nav button:has-text('Jeden inzerát')"); await pg.click(".pp-steps >> text=Stav, cena");
    const o = await pg.locator("label:has-text('Záruka') select option").allTextContents(); if (o.includes("Bez záruky")) throw new Error(o.join("|"));
  });
  await step("admin: nahlasenie -> skryt inzerat", async () => {
    require("child_process").execSync(`psql -h /tmp/pgt -p 5499 -U postgres -d e2e -qc "insert into admins select id from auth.users where email='test@rz.sk' on conflict do nothing"`);
    await pg.goto(B + "/admin"); await pg.waitForSelector("text=Administrácia – potvrdenie kódom");
    // bez kódu z mobilu databáza správcu nepustí
    await pg.click("text=Nastaviť aplikáciu v mobile"); await pg.waitForSelector(".mfa-qr");
    const secret = (await pg.locator(".mfa-secret").textContent()).trim();
    await pg.fill(".mfa-f input", "000000"); await pg.click(".mfa-f button"); await pg.waitForSelector("text=Kód nesedí");
    const code = (await (await fetch("http://127.0.0.1:54321/e2e/totp?secret=" + secret)).json()).code;
    await pg.fill(".mfa-f input", code); await pg.click(".mfa-f button"); await pg.waitForSelector(".pp-tile");
    await pg.click(".pp-nav >> text=Nahlásenia"); await pg.waitForSelector(".pp-msgs li:has-text('Podvod')");
    await pg.click("text=Skryť inzerát a vybaviť"); await pg.waitForSelector(".pp-toast");
    await pg.click(".pp-nav >> text=Hodnotenia"); await pg.waitForSelector(".pp-row:has-text('Vrakovisko Test')");
    await pg.click(".pp-nav >> text=Záznam akcií"); await pg.waitForSelector(".pp-row:has-text('skryť inzerát')");
    await b2.goto(B + "/?q=octavia"); await b2.waitForSelector(".cnt"); await b2.waitForTimeout(800);
    if (await b2.locator(".card:has-text('LED Octavia')").count()) throw new Error("still public");
    await pg.goto(B + "/predajca#list"); await pg.waitForSelector(".pp-st.blocked");
  });
  await step("odhlasenie", async () => { await pg.click("text=Odhlásiť sa"); await pg.waitForURL("**/pre-predajcov"); });
  await step("pravne stranky z paticky", async () => {
    for (const [t, h] of [["Obchodné podmienky", "/obchodne-podmienky"], ["Ochrana osobných údajov", "/ochrana-osobnych-udajov"], ["Cookies", "/cookies"]]) {
      await b2.goto(B + "/"); await b2.click(`.foot-l >> text=${t}`); await b2.waitForURL("**" + h); await b2.waitForSelector("h1:has-text('" + t.split(" ")[0] + "')");
    }
    await b2.waitForSelector("text=KJ trade s. r. o.");
  });
  await step("export mojich udajov", async () => {
    await pg.goto(B + "/pre-predajcov"); await pg.fill("input[type=email]", "test@rz.sk"); await pg.fill("input[type=password]", "heslo1234"); await pg.click("form button.btn"); await pg.waitForSelector(".pp-dash");
    await pg.click(".pp-nav button:has-text('Profil a nastavenia')");
    const [dl] = await Promise.all([pg.waitForEvent("download"), pg.click("text=Stiahnuť moje údaje")]);
    const j = JSON.parse(require("fs").readFileSync(await dl.path(), "utf8"));
    if (!j.profil || j.profil.terms_version !== TERMS || !Array.isArray(j.inzeraty) || !j.inzeraty.length) throw new Error(JSON.stringify(j).slice(0, 200));
  });
  await step("zrusenie uctu", async () => {
    await pg.click("button.del:has-text('Zrušiť účet')"); await pg.fill(".pp-gdpr input", "zrušiť"); await pg.click("text=Natrvalo zrušiť účet");
    await pg.waitForURL("**/?ucet=zruseny", { timeout: 20000 });
    const n = require("child_process").execSync(`psql -h /tmp/pgt -p 5499 -U postgres -d e2e -tAc "select (select count(*) from auth.users)+(select count(*) from sellers)+(select count(*) from listings)+(select count(*) from messages)+(select count(*) from storage.objects)+(select count(*) from donor_cars)+(select count(*) from seller_reviews)"`).toString().trim();
    if (n !== "0") throw new Error("zostali riadky: " + n);
    const files = require("child_process").execSync("find /tmp/claude-0/e2e/files -type f | wc -l").toString().trim();
    if (files !== "0") throw new Error("zostali subory: " + files);
  });
  console.log("ERRORS:", errs.length ? "\n" + [...new Set(errs)].join("\n") : "none");
  if (errs.some((e) => /Content Security Policy|Refused to/i.test(e))) console.log("FAIL bezpecnostne hlavicky (CSP) blokuju cast webu");
  await br.close();
})();
