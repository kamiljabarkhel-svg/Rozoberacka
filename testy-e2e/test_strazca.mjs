// Test funkcie „strazca“ (supabase/functions/strazca/handler.ts) proti lokálnej databáze a napodobenine Brevo.
// Spustenie: node --experimental-strip-types testy-e2e/test_strazca.mjs  (PostgREST na :3001, databáza e2e)
import { createServer } from "node:http";
import { execSync } from "node:child_process";
import crypto from "node:crypto";
import { run } from "../supabase/functions/strazca/handler.ts";

const SECRET = "e2e-local-secret-which-is-at-least-32-chars-long";
const b64 = (s) => Buffer.from(s).toString("base64url");
const h = b64(JSON.stringify({ alg: "HS256", typ: "JWT" })), b = b64(JSON.stringify({ role: "service_role", iss: "supabase", exp: 2100000000 }));
const KEY = `${h}.${b}.${crypto.createHmac("sha256", SECRET).update(h + "." + b).digest("base64url")}`;
const psql = (sql) => execSync("psql -h /tmp/pgt -p 5499 -U postgres -d e2e -tAq -v ON_ERROR_STOP=1", { input: sql }).toString().trim();

const sent = [];
const srv = createServer((req, res) => { let d = ""; req.on("data", (c) => (d += c)); req.on("end", () => { sent.push({ key: req.headers["api-key"], body: JSON.parse(d) }); res.writeHead(201); res.end("{}"); }); });
await new Promise((ok) => srv.listen(4999, ok));
let fail = 0; const ok = (c, m) => { console.log((c ? "OK  " : "FAIL") + " " + m); if (!c) fail++; };

try {
  psql(`insert into auth.users (id,email) values ('f1111111-0000-0000-0000-000000000001','s@t.sk') on conflict do nothing;
    insert into sellers (id,name,city) values ('f1111111-0000-0000-0000-000000000001','Vrak Strážca','Prešov') on conflict do nothing;
    insert into listings (seller_id,name,brand_id,model_id,year,category_id,oem,price,city,description,warranty)
      select 'f1111111-0000-0000-0000-000000000001','Spätné zrkadlo Fabia',b.id,m.id,2012,'kar','5J1857507',35,'Prešov','Zrkadlo ľavé, elektrické, funkčné.','12 mesiacov' from brands b join models m on m.brand_id=b.id where b.name='Škoda' limit 1;
    insert into search_alerts (email, filter, label, confirmed_at, last_checked_at) values
      ('nove@t.sk', '{"q":"zrkadlo"}', 'Zrkadlo', null, now()),
      ('potvrdene@t.sk', '{"q":"zrkadlo"}', 'Zrkadlo Fabia', now() - interval '5 days', now() - interval '2 days'),
      ('nic@t.sk', '{"q":"turbo"}', 'Turbo', now() - interval '5 days', now() - interval '2 days');`);
  const env = { SUPABASE_URL: "http://127.0.0.1:3001/..", SUPABASE_SERVICE_ROLE_KEY: KEY, BREVO_API_KEY: "test-kluc", SITE_URL: "https://rozoberacka.test",
    MAIL_FROM: "upozornenia@rozoberacka.test", OPERATOR: "KJ Trade s.r.o.", BREVO_URL: "http://127.0.0.1:4999/" };
  // PostgREST lokálne beží bez /rest/v1 – adresu upravíme
  const f = (u, i) => fetch(String(u).replace("/../rest/v1", ""), i);
  const r = await run(env, f);
  ok(r.errors.length === 0, "bez chýb " + JSON.stringify(r.errors));
  ok(r.confirmations === 1 && sent.some((m) => m.body.to[0].email === "nove@t.sk" && /strazca\/potvrdit\//.test(m.body.htmlContent)), "potvrdzovací e-mail s odkazom");
  ok(r.digests === 1 && sent.some((m) => m.body.to[0].email === "potvrdene@t.sk" && /Spätné zrkadlo Fabia/.test(m.body.htmlContent) && /strazca\/zrusit\//.test(m.body.htmlContent)), "prehľad nových dielov s odkazom na zrušenie");
  ok(!sent.some((m) => m.body.to[0].email === "nic@t.sk"), "bez nových dielov sa nič neposiela");
  ok(r.checked === 2, "skontrolované 2 potvrdené upozornenia");
  ok(sent.every((m) => m.key === "test-kluc" && m.body.headers["List-Unsubscribe"]), "kľúč Brevo a hlavička na odhlásenie");
  sent.length = 0;
  const r2 = await run(env, f);
  ok(r2.confirmations === 0 && r2.digests === 0 && sent.length === 0, "druhé spustenie nič neopakuje");
} finally {
  psql(`delete from search_alerts where email in ('nove@t.sk','potvrdene@t.sk','nic@t.sk'); delete from listings where seller_id='f1111111-0000-0000-0000-000000000001';
    delete from sellers where id='f1111111-0000-0000-0000-000000000001'; delete from auth.users where id='f1111111-0000-0000-0000-000000000001';`);
  srv.close();
}
console.log(fail ? `ZLYHALO ${fail}` : "HOTOVO");
process.exit(fail ? 1 : 0);
