// Logika funkcie „strazca“ (bez závislosti na Deno, aby sa dala otestovať aj lokálne).
// 1. Nepotvrdeným upozorneniam pošle e-mail s odkazom na potvrdenie (dvojité potvrdenie, GDPR).
// 2. Potvrdeným raz denne pošle nové diely, ktoré odvtedy pribudli. Každý e-mail má odkaz na zrušenie.
// E-maily posiela Brevo (transakčné API). Kľúče sú len v premenných prostredia funkcie, nie v kóde.

export type Env = {
  SUPABASE_URL: string;
  SUPABASE_SERVICE_ROLE_KEY: string;
  BREVO_API_KEY: string;
  SITE_URL: string;          // napr. https://rozoberacka.sk
  MAIL_FROM: string;         // overená adresa odosielateľa v Brevo
  MAIL_FROM_NAME?: string;
  OPERATOR?: string;         // údaje prevádzkovateľa do päty e-mailu
  BREVO_URL?: string;        // len pre testy
};

type Alert = { id: number; token: string; email: string; filter: Record<string, unknown>; label: string; last_checked_at: string };
type Item = { id: number; name: string; price: number; city: string | null; created_at: string; condition: string };

const esc = (s: string) => s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]!));
const eur = (n: number) => n.toLocaleString("sk-SK", { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + " €";

export async function run(env: Env, f: typeof fetch = fetch): Promise<{ confirmations: number; digests: number; checked: number; errors: string[] }> {
  const site = env.SITE_URL.replace(/\/$/, "");
  const rest = env.SUPABASE_URL.replace(/\/$/, "") + "/rest/v1";
  const H = { apikey: env.SUPABASE_SERVICE_ROLE_KEY, Authorization: "Bearer " + env.SUPABASE_SERVICE_ROLE_KEY, "Content-Type": "application/json" };
  const errors: string[] = [];
  const db = async (path: string, init: RequestInit = {}) => {
    const r = await f(rest + path, { ...init, headers: { ...H, ...(init.headers || {}) } });
    if (!r.ok) throw new Error(`${path.split("?")[0]}: ${r.status} ${await r.text()}`);
    const t = await r.text();
    return t ? JSON.parse(t) : null;
  };
  const mail = async (to: string, subject: string, html: string, cancelUrl: string) => {
    const r = await f(env.BREVO_URL || "https://api.brevo.com/v3/smtp/email", {
      method: "POST",
      headers: { "api-key": env.BREVO_API_KEY, "Content-Type": "application/json", accept: "application/json" },
      body: JSON.stringify({
        sender: { email: env.MAIL_FROM, name: env.MAIL_FROM_NAME || "Rozoberačka" }, to: [{ email: to }], subject, htmlContent: html,
        headers: { "List-Unsubscribe": `<${cancelUrl}>` },
      }),
    });
    if (!r.ok) throw new Error(`Brevo ${r.status}: ${await r.text()}`);
  };
  const foot = (cancelUrl: string) => `<hr style="border:0;border-top:1px solid #e1e8ec;margin:24px 0 12px">
    <p style="font-size:12px;color:#5a6b75">Tento e-mail ste dostali, lebo ste si na Rozoberačke zapli upozornenie na nové diely.
    <a href="${cancelUrl}">Zrušiť upozornenie</a>. Upozornenie sa samo zruší po 6 mesiacoch.${env.OPERATOR ? "<br>" + esc(env.OPERATOR) : ""}</p>`;
  const wrap = (body: string) => `<!doctype html><html lang="sk"><body style="font-family:system-ui,Segoe UI,sans-serif;color:#0d1b22;max-width:560px;margin:0 auto;padding:16px">${body}</body></html>`;

  // 1. potvrdenia
  let confirmations = 0;
  const pending: Alert[] = await db("/search_alerts?select=id,token,email,label,filter,last_checked_at&confirmed_at=is.null&confirm_sent_at=is.null&order=id&limit=50");
  for (const a of pending) {
    const ok = `${site}/strazca/potvrdit/${a.token}`, cancel = `${site}/strazca/zrusit/${a.token}`;
    try {
      await mail(a.email, "Potvrďte upozornenie na nové diely", wrap(`<h1 style="font-size:20px">Potvrďte upozornenie</h1>
        <p>Na Rozoberačke ste si zapli upozornenie na nové diely: <b>${esc(a.label)}</b>.</p>
        <p><a href="${ok}" style="display:inline-block;background:#ffb400;color:#241800;padding:10px 18px;border-radius:3px;font-weight:700;text-decoration:none">Áno, posielajte mi nové diely</a></p>
        <p style="font-size:14px;color:#5a6b75">Ak ste to neboli vy, e-mail ignorujte – bez potvrdenia vám nič nepošleme a adresu do 3 dní zmažeme.</p>${foot(cancel)}`), cancel);
      await db(`/search_alerts?id=eq.${a.id}`, { method: "PATCH", body: JSON.stringify({ confirm_sent_at: new Date().toISOString() }) });
      confirmations++;
    } catch (e) { errors.push(`potvrdenie ${a.id}: ${(e as Error).message}`); }
  }

  // 2. denné prehľady
  let digests = 0, checked = 0;
  const since = new Date(Date.now() - 23 * 3600 * 1000).toISOString();
  const due: Alert[] = await db(`/search_alerts?select=id,token,email,label,filter,last_checked_at&confirmed_at=not.is.null&last_checked_at=lt.${encodeURIComponent(since)}&order=last_checked_at&limit=200`);
  for (const a of due) {
    const now = new Date().toISOString();
    try {
      const res = await db("/rpc/search_listings", { method: "POST", body: JSON.stringify({ p: { ...a.filter, sort: "new", limit: 60, offset: 0 } }) });
      const after = Date.parse(a.last_checked_at);
      const all: Item[] = ((res?.items || []) as Item[]).filter((x) => Date.parse(x.created_at) > after);
      const fresh = all.slice(0, 10), total = all.length;
      if (fresh.length) {
        const cancel = `${site}/strazca/zrusit/${a.token}`;
        const rows = fresh.map((x) => `<li style="margin:0 0 10px"><a href="${site}/diel/${x.id}" style="font-weight:700">${esc(x.name)}</a><br>
          <span style="color:#5a6b75">${eur(Number(x.price))} · ${esc(x.condition || "")}${x.city ? " · " + esc(x.city) : ""}</span></li>`).join("");
        const qs = new URLSearchParams();
        const map: Record<string, string> = { q: "q", brand: "znacka", model: "model", engine: "motor", cat: "kat", sub: "pod", max: "cena", cond: "stav", city: "mesto" };
        for (const [k, v] of Object.entries(a.filter)) if (map[k] && v != null && v !== "" && v !== false) qs.set(map[k], String(v));
        await mail(a.email, `${total >= 60 ? "60+" : total} ${total === 1 ? "nový diel" : total < 5 ? "nové diely" : "nových dielov"}: ${a.label}`.slice(0, 150), wrap(`<h1 style="font-size:20px">Nové diely: ${esc(a.label)}</h1>
          <ul style="padding-left:18px">${rows}</ul>
          ${total > fresh.length ? `<p>…a ďalšie (${total - fresh.length}).</p>` : ""}
          <p><a href="${site}/?${qs.toString()}#vysledky">Zobraziť všetky výsledky</a></p>
          <p style="font-size:13px;color:#5a6b75">Pred kúpou porovnajte OEM číslo so starým dielom. Neposielajte zálohy neznámym predajcom.</p>${foot(cancel)}`), cancel);
        digests++;
      }
      await db(`/search_alerts?id=eq.${a.id}`, { method: "PATCH", body: JSON.stringify({ last_checked_at: now, ...(fresh.length ? { last_sent_at: now } : {}) }) });
      checked++;
    } catch (e) { errors.push(`prehľad ${a.id}: ${(e as Error).message}`); }
  }
  return { confirmations, digests, checked, errors };
}
