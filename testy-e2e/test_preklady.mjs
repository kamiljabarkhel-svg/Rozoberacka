// Test funkcie „preklady“ – ochrana čísel/e-mailov a uloženie prekladu (napodobenina DeepL a PostgREST nie je potrebná).
// Spustenie: node --experimental-strip-types testy-e2e/test_preklady.mjs
import { protect, protectHtml, restore, restoreHtml, run } from "../supabase/functions/preklady/handler.ts";
let fail = 0; const ok = (c, m) => { console.log((c ? "OK  " : "FAIL") + " " + m); if (!c) fail++; };
const src = "Predné svetlo 5E1 941 015, volajte 0905 123 456 alebo jan@x.sk. Pasuje na 1.6 TDI <LED> & xenón.";
const p = protect(src);
ok(!p.xml.includes("0905") && !p.xml.includes("jan@x.sk") && !p.xml.includes("941"), "telefón, e-mail a OEM sa neposielajú");
ok(restore(p.xml, p.keep) === src, "obnova bez prekladu vráti pôvodný text");
// napodobenina: DeepL vráti text s rovnakými značkami
const calls = [];
const fake = async (u, i) => {
  const b = JSON.parse(i.body);
  if (String(u).includes("deepl")) { calls.push(b); return new Response(JSON.stringify({ translations: b.text.map((t) => ({ text: t.replace("Predné svetlo", "Reflektor przedni").replace("Pasuje na", "Pasuje do") })) })); }
  if (String(u).endsWith("/translate_outbox")) return new Response(JSON.stringify([{ id: 7, name: "Predné svetlo", description: src, src_hash: "h" }]));
  if (String(u).endsWith("/translate_save")) { calls.push(b); return new Response("true"); }
  return new Response("?", { status: 404 });
};
const r = await run({ SUPABASE_URL: "http://db", SUPABASE_SERVICE_ROLE_KEY: "k", DEEPL_API_KEY: "x:fx", DEEPL_URL: "http://deepl/v2/translate" }, fake);
const saved = calls.find((c) => c.p_id === 7);
ok(r.translated === 1 && r.errors.length === 0, "1 preložený " + JSON.stringify(r));
ok(calls[0].source_lang === "SK" && calls[0].target_lang === "PL" && calls[0].tag_handling === "xml", "DeepL SK → PL s ochranou značiek");
ok(saved?.p_name === "Reflektor przedni", "názov preložený: " + saved?.p_name);
ok(saved?.p_desc.includes("5E1 941 015") && saved?.p_desc.includes("0905 123 456") && saved?.p_desc.includes("<LED> & xenón"), "číslo dielu, telefón a znaky ostali: " + saved?.p_desc);
// Microsoft Translator (Azure): HTML so <span class="notranslate">
const ph = protectHtml(src);
ok(!ph.xml.includes("0905") && ph.xml.includes('<span class="notranslate">0</span>'), "Azure: chránené časti v notranslate");
ok(restoreHtml(ph.xml, ph.keep) === src, "Azure: obnova bez prekladu vráti pôvodný text");
const calls2 = [];
const fakeAz = async (u, i) => {
  const b = JSON.parse(i.body);
  if (String(u).includes("azure")) { calls2.push({ u: String(u), h: i.headers, b }); return new Response(JSON.stringify(b.map((t) => ({ translations: [{ text: t.Text.replace("Predné svetlo", "Reflektor przedni").replace(/<span class="notranslate">(\d+)<\/span>/g, '<span class="notranslate"> $1 </span>'), to: "pl" }] })))); }
  if (String(u).endsWith("/translate_outbox")) return new Response(JSON.stringify([{ id: 8, name: "Predné svetlo", description: src, src_hash: "h" }]));
  if (String(u).endsWith("/translate_save")) { calls2.push(b); return new Response("true"); }
  return new Response("?", { status: 404 });
};
const r2 = await run({ SUPABASE_URL: "http://db", SUPABASE_SERVICE_ROLE_KEY: "k", AZURE_TRANSLATOR_KEY: "az", AZURE_TRANSLATOR_REGION: "westeurope", AZURE_URL: "http://azure/translate" }, fakeAz);
const s2 = calls2.find((c) => c.p_id === 8), req = calls2.find((c) => c.u);
ok(r2.translated === 1 && r2.errors.length === 0, "Azure: 1 preložený " + JSON.stringify(r2));
ok(/from=sk&to=pl&textType=html/.test(req.u) && req.h["Ocp-Apim-Subscription-Region"] === "westeurope", "Azure: SK → PL, región v hlavičke");
ok(s2?.p_name === "Reflektor przedni" && s2?.p_desc.includes("5E1 941 015") && s2?.p_desc.includes("0905 123 456"), "Azure: preklad uložený, čísla ostali: " + s2?.p_desc);
process.exit(fail ? 1 : 0);
