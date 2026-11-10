// Test funkcie „odpovede“ (supabase/functions/odpovede/handler.ts) proti lokálnej databáze a napodobenine Brevo.
// Spustenie: node --experimental-strip-types testy-e2e/test_odpovede.mjs  (PostgREST na :3001, databáza e2e)
import { createServer } from "node:http";
import { execSync } from "node:child_process";
import crypto from "node:crypto";
import { run } from "../supabase/functions/odpovede/handler.ts";

const SECRET = "e2e-local-secret-which-is-at-least-32-chars-long";
const b64 = (s) => Buffer.from(s).toString("base64url");
const h = b64(JSON.stringify({ alg: "HS256", typ: "JWT" })), b = b64(JSON.stringify({ role: "service_role", iss: "supabase", exp: 2100000000 }));
const KEY = `${h}.${b}.${crypto.createHmac("sha256", SECRET).update(h + "." + b).digest("base64url")}`;
const psql = (sql) => execSync("psql -h /tmp/pgt -p 5499 -U postgres -d e2e -tAq -v ON_ERROR_STOP=1", { input: sql }).toString().trim();

const sent = []; let failNext = false;
const srv = createServer((req, res) => { let d = ""; req.on("data", (c) => (d += c)); req.on("end", () => {
  if (failNext) { failNext = false; res.writeHead(400); res.end('{"message":"invalid"}'); return; }
  sent.push({ key: req.headers["api-key"], body: JSON.parse(d) }); res.writeHead(201); res.end("{}"); }); });
await new Promise((ok) => srv.listen(4998, ok));
let fail = 0; const ok = (c, m) => { console.log((c ? "OK  " : "FAIL") + " " + m); if (!c) fail++; };

try {
  psql(`insert into auth.users (id,email) values ('f2222222-0000-0000-0000-000000000002','predajca.odp@t.sk') on conflict do nothing;
    insert into sellers (id,name,city) values ('f2222222-0000-0000-0000-000000000002','Vrak Odpovede','Senec') on conflict do nothing;
    insert into listings (seller_id,name,brand_id,model_id,year,category_id,oem,price,city,description,warranty,condition)
      select 'f2222222-0000-0000-0000-000000000002','Turbo Octavia <test>',b.id,m.id,2014,'kar','03L253016T',300,'Senec','Turbo bez vôle, odskúšané.','12 mesiacov','Dobrý' from brands b join models m on m.brand_id=b.id where b.name='Škoda' limit 1;
    insert into messages (listing_id, seller_id, sender_name, sender_contact, body)
      select id, seller_id, 'Kupec Odp', 'kupec.odp@t.sk', 'Je turbo ešte k dispozícii?' from listings where name = 'Turbo Octavia <test>';
    insert into message_replies (message_id, author, body) select id, 'seller', 'Áno, je. <b>Cena</b> dohodou.' from messages where sender_name = 'Kupec Odp';
    insert into message_replies (message_id, author, body) select id, 'buyer', 'Prídem v sobotu.' from messages where sender_name = 'Kupec Odp';`);
  const token = psql("select reply_token from messages where sender_name = 'Kupec Odp'");
  const env = { SUPABASE_URL: "http://127.0.0.1:3001/..", SUPABASE_SERVICE_ROLE_KEY: KEY, BREVO_API_KEY: "test-kluc", SITE_URL: "https://autosuciastky.test/",
    MAIL_FROM: "spravy@autosuciastky.test", MAIL_FROM_NAME: "autosuciastky.eu", OPERATOR: "KJ trade s. r. o.", BREVO_URL: "http://127.0.0.1:4998/" };
  const f = (u, i) => fetch(String(u).replace("/../rest/v1", ""), i);
  const r = await run(env, f);
  ok(r.errors.length === 0, "bez chýb " + JSON.stringify(r.errors));
  const toBuyer = sent.find((m) => m.body.to[0].email === "kupec.odp@t.sk"), toSeller = sent.find((m) => m.body.to[0].email === "predajca.odp@t.sk");
  ok(toBuyer && toBuyer.body.htmlContent.includes(`https://autosuciastky.test/sprava/${token}`), "kupujúcemu odpoveď s odkazom na konverzáciu");
  ok(toBuyer && toBuyer.body.htmlContent.includes("&lt;b&gt;Cena&lt;/b&gt;") && !toBuyer.body.htmlContent.includes("<b>Cena</b>"), "text odpovede je bezpečne escapovaný");
  ok(toBuyer && !toBuyer.body.htmlContent.includes("predajca.odp@t.sk"), "kupujúci nevidí e-mail predajcu");
  ok(toSeller && toSeller.body.htmlContent.includes("/predajca#msg") && !toSeller.body.htmlContent.includes("kupec.odp@t.sk"), "predajcovi upozornenie bez e-mailu kupujúceho");
  ok(sent.every((m) => m.key === "test-kluc" && m.body.sender.email === "spravy@autosuciastky.test"), "kľúč Brevo a odosielateľ portálu");
  sent.length = 0;
  const r2 = await run(env, f);
  ok(r2.sent === 0 && sent.length === 0, "druhé spustenie nič neposiela (bez duplicít)");
  // chyba Brevo: zapíše sa a pri ďalšom behu sa skúsi znova
  psql(`insert into message_replies (message_id, author, body) select id, 'seller', 'Ešte jedna odpoveď.' from messages where sender_name = 'Kupec Odp';`);
  failNext = true; const r3 = await run(env, f);
  ok(r3.errors.length === 1 && psql("select email_error is not null and emailed_at is null from message_replies where body = 'Ešte jedna odpoveď.'") === "t", "chyba odoslania sa zapíše");
  const r4 = await run(env, f);
  ok(r4.sent === 1 && psql("select emailed_at is not null and email_error is null from message_replies where body = 'Ešte jedna odpoveď.'") === "t", "pri ďalšom behu sa odošle znova");
} finally {
  psql(`delete from messages where sender_name = 'Kupec Odp'; delete from listings where name = 'Turbo Octavia <test>'; delete from auth.users where id = 'f2222222-0000-0000-0000-000000000002';`);
  srv.close();
}
console.log(fail ? `ZLYHALO: ${fail}` : "VŠETKO OK");
process.exit(fail ? 1 : 0);
