// Spustenie: postaviť web s NEXT_PUBLIC_GA_ID=G-TEST12345 (ukážkový režim stačí), next start -p 3200, potom: NODE_PATH=$(npm root -g) node testy-e2e/test_cookies.js
// Overenie cookies: GA až po súhlase, odmietnutie, odvolanie súhlasu v pätičke zmaže cookies _ga.
const { chromium, devices } = require("playwright");
const B = "http://localhost:3200";
let fail = 0; const ok = (c, m) => { console.log((c ? "OK  " : "FAIL") + " " + m); if (!c) fail++; };
(async () => {
  const br = await chromium.launch();
  async function ctx(opts = {}) {
    const c = await br.newContext(opts); const hits = [];
    // napodobenina Google: skript gtag nastaví cookies _ga ako skutočný Google Analytics
    await c.route(/googletagmanager\.com|google-analytics\.com/, (r) => { hits.push(r.request().url());
      r.fulfill({ contentType: "application/javascript", body: "document.cookie='_ga=GA1.1.123.456; path=/; max-age=63072000'; document.cookie='_ga_TEST12345=GS1.1.1; path=/; max-age=63072000';" }); });
    return { c, hits };
  }
  const gaCookies = async (c) => (await c.cookies()).filter((x) => x.name.startsWith("_ga")).map((x) => x.name);

  // 1) Bez súhlasu nič, Prijať všetky -> GA
  { const { c, hits } = await ctx(); const p = await c.newPage();
    await p.goto(B + "/"); await p.waitForSelector(".ckbar"); await p.waitForTimeout(800);
    ok(hits.length === 0 && (await gaCookies(c)).length === 0, "pred súhlasom sa Google nenačíta a žiadne _ga cookies");
    const btns = await p.locator(".ckbar .ckbtn").allInnerTexts();
    ok(JSON.stringify(btns) === JSON.stringify(["Prijať všetky", "Odmietnuť", "Nastavenia"]), "lišta má tri rovnocenné tlačidlá: " + btns.join(" / "));
    const sz = await p.locator(".ckbar .ckbtn").evaluateAll((e) => e.slice(0, 2).map((x) => { const r = x.getBoundingClientRect(), s = getComputedStyle(x); return [Math.round(r.height), s.backgroundColor, s.fontSize].join(","); }));
    ok(sz[0] === sz[1], "Prijať a Odmietnuť vyzerajú rovnako (" + sz.join(" vs ") + ")");
    await p.click(".ckbar >> text=Prijať všetky"); await p.waitForTimeout(1200);
    ok(hits.length > 0 && (await gaCookies(c)).length === 2, "po súhlase sa Google Analytics načíta (_ga cookies: " + (await gaCookies(c)).join(", ") + ")");
    const cfg = await p.evaluate(() => JSON.stringify(window.dataLayer?.find((x) => x[0] === "config")?.[2] || null));
    ok(/"allow_google_signals":false/.test(cfg) && /"allow_ad_personalization_signals":false/.test(cfg), "bez Google signals a reklamných funkcií");
    // 2) odvolanie súhlasu v pätičke
    await p.click("footer >> text=Nastavenia cookies"); await p.waitForSelector(".ckdlg");
    ok(await p.locator(".cksw input").isChecked(), "nastavenia ukazujú aktuálny súhlas (zapnuté)");
    await p.uncheck(".cksw input"); const hBefore = hits.length;
    await Promise.all([p.waitForEvent("load"), p.click(".ckdlg >> text=Uložiť voľbu")]); await p.waitForTimeout(1500);
    ok((await gaCookies(c)).length === 0, "po odvolaní súhlasu sú _ga cookies zmazané");
    ok(hits.length === hBefore && !(await p.$("script[data-rz-ga]")), "po odvolaní sa Google už nenačíta");
    await p.reload(); await p.waitForTimeout(1000);
    ok(!(await p.$(".ckbar")) && hits.length === hBefore, "voľba ostane uložená, lišta sa neukáže znova");
    await c.close(); }

  // 3) Odmietnuť hneď na lište
  { const { c, hits } = await ctx(); const p = await c.newPage();
    await p.goto(B + "/diel/1"); await p.waitForSelector(".ckbar"); await p.click(".ckbar >> text=Odmietnuť"); await p.waitForTimeout(800);
    await p.goto(B + "/"); await p.waitForTimeout(1000);
    ok(hits.length === 0 && (await gaCookies(c)).length === 0 && !(await p.$(".ckbar")), "Odmietnuť: Google sa nenačíta ani na ďalších stránkach");
    await p.click("footer >> text=Nastavenia cookies"); await p.waitForSelector(".ckdlg");
    ok(!(await p.locator(".cksw input").isChecked()), "v nastaveniach je meranie vypnuté");
    await p.keyboard.press("Escape"); ok(!(await p.$(".ckdlg")), "nastavenia sa zavrú klávesom Esc");
    await c.close(); }

  // 4) Nastavenia z lišty: uložiť bez zapnutia = odmietnutie
  { const { c, hits } = await ctx(); const p = await c.newPage();
    await p.goto(B + "/"); await p.click(".ckbar >> text=Nastavenia"); await p.waitForSelector(".ckdlg");
    ok(!(await p.locator(".cksw input").isChecked()), "v nastaveniach z lišty je meranie predvolene vypnuté");
    await p.click(".ckdlg >> text=Uložiť voľbu"); await p.waitForTimeout(800);
    ok(hits.length === 0, "Uložiť voľbu bez zapnutia = nič sa nenačíta"); await c.close(); }

  // 5) mobil: lišta aj odkaz v pätičke sú dostupné; stránka /cookies má tlačidlo nastavení
  { const { c } = await ctx({ ...devices["iPhone 13"] }); const p = await c.newPage();
    await p.goto(B + "/"); await p.waitForSelector(".ckbar");
    const vis = await p.locator(".ckbar .ckbtn").evaluateAll((e) => e.every((x) => { const r = x.getBoundingClientRect(); return r.width > 0 && r.bottom <= innerHeight; }));
    ok(vis, "na mobile sú všetky tlačidlá lišty viditeľné"); await p.screenshot({ path: "/tmp/ck_mobil.png" });
    await p.click(".ckbar >> text=Odmietnuť");
    ok(await p.locator("footer >> text=Nastavenia cookies").count() === 1, "na mobile je v pätičke odkaz Nastavenia cookies");
    await p.goto(B + "/cookies"); const t = await p.locator("main").innerText();
    ok(/_ga/.test(t), "stránka /cookies uvádza cookies _ga");
    ok(await p.locator("main >> text=Nastavenia cookies").count() > 0 || await p.locator("main button").count() > 0, "na stránke /cookies sa dá zmeniť voľba");
    await c.close(); }
  await br.close(); console.log(fail ? "ZLYHALO: " + fail : "VŠETKO OK"); process.exit(fail ? 1 : 0);
})();
