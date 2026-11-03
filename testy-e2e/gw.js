// Lokálna napodobenina Supabase (len na testy): REST → PostgREST, Auth a Storage zjednodušene.
const http = require("http"), crypto = require("crypto"), fs = require("fs"), path = require("path");
const { Pool } = require("pg");
const SECRET = "e2e-local-secret-which-is-at-least-32-chars-long";
const pool = new Pool({ host: "/tmp/pgt", port: 5499, user: "postgres", database: "e2e" });
const FILES = "/tmp/claude-0/e2e/files"; fs.mkdirSync(FILES, { recursive: true });
const b64 = (b) => Buffer.from(b).toString("base64url");
const sign = (p) => { const h = b64(JSON.stringify({ alg: "HS256", typ: "JWT" })), b = b64(JSON.stringify(p)); return `${h}.${b}.${crypto.createHmac("sha256", SECRET).update(h + "." + b).digest("base64url")}`; };
const verify = (t) => { try { const [h, b, s] = t.split("."); if (crypto.createHmac("sha256", SECRET).update(h + "." + b).digest("base64url") !== s) return null; const p = JSON.parse(Buffer.from(b, "base64url")); if (p.exp && p.exp < Date.now() / 1000) return null; return p; } catch { return null; } };
const hash = (pw) => crypto.createHash("sha256").update("salt" + pw).digest("hex");
const refresh = new Map();
const userObj = (u) => ({ id: u.id, aud: "authenticated", role: "authenticated", email: u.email, email_confirmed_at: u.email_confirmed_at, user_metadata: u.raw_user_meta_data || {}, app_metadata: { provider: "email" }, created_at: u.created_at, identities: [] });
function session(u) { const now = Math.floor(Date.now() / 1000); const rt = crypto.randomBytes(16).toString("hex"); refresh.set(rt, u.id);
  return { access_token: sign({ sub: u.id, role: "authenticated", aud: "authenticated", email: u.email, iat: now, exp: now + 3600 }), token_type: "bearer", expires_in: 3600, expires_at: now + 3600, refresh_token: rt, user: userObj(u) }; }
const cors = { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Headers": "*", "Access-Control-Allow-Methods": "GET,POST,PUT,PATCH,DELETE,OPTIONS,HEAD", "Access-Control-Expose-Headers": "Content-Range, Content-Profile, X-Total-Count" };
const send = (res, code, body, h = {}) => { res.writeHead(code, { ...cors, "Content-Type": "application/json", ...h }); res.end(body === undefined ? "" : JSON.stringify(body)); };
const readBody = (req) => new Promise((ok) => { const c = []; req.on("data", (d) => c.push(d)); req.on("end", () => ok(Buffer.concat(c))); });
const claims = (req) => verify(String(req.headers.authorization || "").replace(/^Bearer /, ""));
async function asUser(cl, fn) { const c = await pool.connect(); try { await c.query("begin"); await c.query(`set local role ${cl?.role === "authenticated" ? "authenticated" : "anon"}`); await c.query("select set_config('request.jwt.claims',$1,true)", [JSON.stringify(cl || { role: "anon" })]); const r = await fn(c); await c.query("commit"); return r; } catch (e) { await c.query("rollback"); throw e; } finally { c.release(); } }
const log = []; // odoslané e-maily (potvrdenie, reset)
http.createServer(async (req, res) => {
  try {
    if (req.method === "OPTIONS") return send(res, 204);
    const u = new URL(req.url, "http://x"); const p = u.pathname;
    if (p.startsWith("/rest/v1")) {
      const body = await readBody(req);
      const h = { ...req.headers }; delete h.host; delete h["content-length"];
      if (!/^Bearer /.test(h.authorization || "")) h.authorization = "Bearer " + h.apikey;
      h["x-forwarded-for"] = String(req.headers["x-test-ip"] || req.socket.remoteAddress);
      const pr = http.request({ host: "127.0.0.1", port: 3001, path: p.slice(8) + u.search, method: req.method, headers: h }, (r) => { const hh = { ...cors }; for (const [k, v] of Object.entries(r.headers)) if (!k.startsWith("access-control-")) hh[k] = v; res.writeHead(r.statusCode, hh); r.pipe(res); });
      pr.on("error", (e) => send(res, 502, { message: String(e) })); pr.end(body); return;
    }
    if (p === "/e2e/confirm") { await pool.query("update auth.users set email_confirmed_at=now() where email=$1", [u.searchParams.get("email")]); return send(res, 200, { ok: true }); }
    if (p === "/e2e/mails") return send(res, 200, log);
    if (p.startsWith("/auth/v1/")) {
      const body = JSON.parse((await readBody(req)).toString() || "{}"); const a = p.slice(9);
      if (a === "signup") {
        if (!body.password || body.password.length < 6) return send(res, 422, { code: 422, error_code: "weak_password", msg: "Password should be at least 6 characters." });
        const ex = await pool.query("select * from auth.users where email=$1", [body.email.toLowerCase()]);
        if (ex.rows.length) return send(res, 422, { code: 422, error_code: "user_already_exists", msg: "User already registered" });
        const r = await pool.query("insert into auth.users(email,encrypted_password,raw_user_meta_data) values($1,$2,$3) returning *", [body.email.toLowerCase(), hash(body.password), body.data || {}]);
        log.push({ to: body.email, type: "confirm", redirect: u.searchParams.get("redirect_to") }); return send(res, 200, userObj(r.rows[0]));
      }
      if (a === "token") {
        const gt = u.searchParams.get("grant_type");
        if (gt === "password") {
          const r = await pool.query("select * from auth.users where email=$1", [String(body.email).toLowerCase()]); const x = r.rows[0];
          if (!x || x.encrypted_password !== hash(body.password)) return send(res, 400, { code: 400, error_code: "invalid_credentials", msg: "Invalid login credentials" });
          if (!x.email_confirmed_at) return send(res, 400, { code: 400, error_code: "email_not_confirmed", msg: "Email not confirmed" });
          return send(res, 200, session(x));
        }
        if (gt === "refresh_token") { const id = refresh.get(body.refresh_token); if (!id) return send(res, 400, { code: 400, error_code: "refresh_token_not_found", msg: "Invalid Refresh Token" }); refresh.delete(body.refresh_token); const r = await pool.query("select * from auth.users where id=$1", [id]); return send(res, 200, session(r.rows[0])); }
      }
      if (a === "user") { const cl = claims(req); if (!cl?.sub) return send(res, 401, { code: 401, msg: "invalid JWT" });
        if (req.method === "PUT" && body.password) await pool.query("update auth.users set encrypted_password=$1 where id=$2", [hash(body.password), cl.sub]);
        const r = await pool.query("select * from auth.users where id=$1", [cl.sub]); return send(res, 200, userObj(r.rows[0])); }
      if (a === "logout") return send(res, 204);
      if (a === "recover") { log.push({ to: body.email, type: "recover" }); return send(res, 200, {}); }
      return send(res, 404, { msg: "not implemented " + a });
    }
    if (p.startsWith("/storage/v1/object/public/")) {
      const [bucket, ...rest] = p.slice(26).split("/"); const name = decodeURIComponent(rest.join("/"));
      const b = await pool.query("select public from storage.buckets where id=$1", [bucket]); const f = path.join(FILES, bucket, name);
      if (!b.rows[0]?.public || !fs.existsSync(f)) return send(res, 404, { message: "Object not found" });
      res.writeHead(200, { ...cors, "Content-Type": "image/jpeg" }); return fs.createReadStream(f).pipe(res);
    }
    if (p.startsWith("/storage/v1/object/")) {
      const [bucket, ...rest] = p.slice(19).split("/"); const name = decodeURIComponent(rest.join("/")); const cl = claims(req);
      if (req.method === "POST" && name) {
        let data = await readBody(req);
        const m = /boundary=(.+)$/.exec(String(req.headers["content-type"] || ""));
        if (m) { // multipart: vyber časť so súborom
          const bnd = Buffer.from("--" + m[1]); let i = data.indexOf(bnd);
          while (i >= 0) { const j = data.indexOf(bnd, i + bnd.length); if (j < 0) break; const part = data.subarray(i + bnd.length + 2, j - 2); const he = part.indexOf("\r\n\r\n");
            if (/filename=/.test(part.subarray(0, he).toString())) { data = part.subarray(he + 4); break; } i = j; }
        }
        try { await asUser(cl, (c) => c.query("insert into storage.objects(bucket_id,name,owner) values($1,$2,$3)", [bucket, name, cl?.sub || null])); }
        catch (e) { return send(res, 403, { statusCode: "403", error: "Unauthorized", message: "new row violates row-level security policy" }); }
        const f = path.join(FILES, bucket, name); fs.mkdirSync(path.dirname(f), { recursive: true }); fs.writeFileSync(f, data);
        return send(res, 200, { Key: bucket + "/" + name, Id: crypto.randomUUID() });
      }
      if (req.method === "DELETE") {
        const body = JSON.parse((await readBody(req)).toString() || "{}");
        const r = await asUser(cl, (c) => c.query("delete from storage.objects where bucket_id=$1 and name = any($2) returning name", [bucket, body.prefixes || []]));
        r.rows.forEach((x) => { try { fs.unlinkSync(path.join(FILES, bucket, x.name)); } catch {} });
        return send(res, 200, r.rows.map((x) => ({ name: x.name, bucket_id: bucket })));
      }
    }
    send(res, 404, { message: "not found " + p });
  } catch (e) { console.error(e); send(res, 500, { message: String(e.message || e) }); }
}).listen(54321, "127.0.0.1", () => console.log("gw on 54321, anon key:", sign({ iss: "supabase", role: "anon", iat: 1700000000, exp: 2100000000 })));
