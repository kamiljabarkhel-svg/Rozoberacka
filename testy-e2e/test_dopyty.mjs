// Test funkcie „dopyty“ (supabase/functions/dopyty/handler.ts) proti lokálnej databáze a napodobenine Brevo.
// Spustenie: node --experimental-strip-types testy-e2e/test_dopyty.mjs  (PostgREST na :3001, databáza e2e so supabase/34 a 41)
import { createServer } from "node:http";
import { execSync } from "node:child_process";
import crypto from "node:crypto";
import { run } from "../supabase/functions/dopyty/handler.ts";

const SECRET = "e2e-local-secret-which-is-at-least-32-chars-long";
const b64 = (s) => Buffer.from(s).toString("base64url");
const h = b64(JSON.stringify({ alg: "HS256", typ: "JWT" })), b = b64(JSON.stringify({ role: "service_role", iss: "supabase", exp: 2100000000 }));
const KEY = `${h}.${b}.${crypto.createHmac("sha256", SECRET).update(h + "." + b).digest("base64url")}`;
const psql = (sql) => execSync("psql -h /tmp/pgt -p 5499 -U postgres -d e2e -tAq -v ON_ERROR_STOP=1", { input: sql }).toString().trim();

const sent = [];
const srv = createServer((req, res) => { let d = ""; req.on("data", (c) => (d += c)); req.on("end", () => { sent.push(JSON.parse(d)); res.writeHead(201); res.end("{}"); }); });
await new Promise((ok) => srv.listen(4997, ok));
let fail = 0; const ok = (c, m) => { console.log((c ? "OK  " : "FAIL") + " " + m); if (!c) fail++; };
try {
  psql(`insert into auth.users (id,email,email_confirmed_at) values ('f3333333-0000-0000-0000-000000000003','predajca.dopyt@t.sk',now()) on conflict do nothing;
    insert into sellers (id,name,city) values ('f3333333-0000-0000-0000-000000000003','Vrak Dopyty','Senec') on conflict do nothing;
    insert into listings (seller_id,name,category_id,brand_id,price,city,description,warranty,condition,vtype)
      select 'f3333333-0000-0000-0000-000000000003','Doplnok dopyt test','ine',id,10,'Senec','Univerzálny diel na test dopytov.','12 mesiacov','Dobrý','osobne' from brands where name='Škoda';
    insert into part_requests (brand_id, part_name, note, contact_name, contact, city)
      select id, 'Zrkadlo <ľavé>', 'Elektrické, vyhrievané', 'Kupec Dopyt', 'kupec.dopyt@t.sk', 'Trnava' from brands where name='Škoda';`);
  const env = { SUPABASE_URL: "http://127.0.0.1:3001/..", SUPABASE_SERVICE_ROLE_KEY: KEY, BREVO_API_KEY: "test-kluc", SITE_URL: "https://autosuciastky.test/",
    MAIL_FROM: "noreply@autosuciastky.test", MAIL_FROM_NAME: "autosuciastky.eu", BREVO_URL: "http://127.0.0.1:4997/" };
  const f = (u, i) => fetch(String(u).replace("/../rest/v1", ""), i);
  const r = await run(env, f);
  const m = sent.find((x) => x.to[0].email === "predajca.dopyt@t.sk" && x.subject.includes("Zrkadlo"));
  ok(r.errors.length === 0, "bez chýb " + JSON.stringify(r.errors));
  ok(m && m.subject.includes("Zrkadlo") && m.htmlContent.includes("/predajca#req"), "predajca dostal e-mail s odkazom do portálu");
  ok(m && !m.htmlContent.includes("kupec.dopyt@t.sk") && m.htmlContent.includes("&lt;ľavé&gt;"), "bez kontaktu kupujúceho, text escapovaný");
  // supabase/41: kupujúci dostane raz odkaz na svoj dopyt
  const tok = psql(`select token from part_requests where contact_name = 'Kupec Dopyt'`);
  const kb = sent.find((x) => x.to[0].email === "kupec.dopyt@t.sk");
  ok(r.buyers === 1 && kb && kb.htmlContent.includes(`/dopyt/${tok}`) && kb.subject.startsWith("Váš dopyt"), "kupujúci dostal odkaz na ponuky");
  // predajca bez inzerátu, ale so „všetky značky“ v profile, tiež dostane e-mail
  psql(`insert into auth.users (id,email,email_confirmed_at) values ('f3333333-0000-0000-0000-000000000004','vsetky.dopyt@t.sk',now()) on conflict do nothing;
    insert into sellers (id,name,city) values ('f3333333-0000-0000-0000-000000000004','Vrak Všetky','Senec') on conflict do nothing;
    insert into seller_private (seller_id, request_all) values ('f3333333-0000-0000-0000-000000000004', true) on conflict (seller_id) do update set request_all = true;`);
  sent.length = 0; const r2 = await run(env, f);
  ok(!sent.some((x) => x.to[0].email === "predajca.dopyt@t.sk" || x.to[0].email === "kupec.dopyt@t.sk"), "druhé spustenie už neposiela");
  ok(sent.some((x) => x.to[0].email === "vsetky.dopyt@t.sk" && x.subject.includes("Zrkadlo")), "predajca so „všetky značky“ dostal e-mail");
} finally {
  psql(`delete from part_requests where contact_name = 'Kupec Dopyt'; delete from listings where name = 'Doplnok dopyt test'; delete from auth.users where id in ('f3333333-0000-0000-0000-000000000003','f3333333-0000-0000-0000-000000000004');`);
  srv.close();
}
console.log(fail ? `ZLYHALO: ${fail}` : "VŠETKO OK");
process.exit(fail ? 1 : 0);
