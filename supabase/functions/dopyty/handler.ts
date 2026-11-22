// Logika funkcie „dopyty“ (bez závislosti na Deno, aby sa dala otestovať aj lokálne).
// Z fronty request_outbox() pošle predajcom e-mail o novom dopyte na značku, ktorú predávajú.
// Kontakt kupujúceho v e-maile nie je – predajca ho uvidí po prihlásení v portáli (záložka Dopyty).
// Od supabase/41 pošle aj kupujúcemu (ak zadal e-mail) raz odkaz na jeho dopyt s ponukami – request_buyer_outbox().

export type Env = {
  SUPABASE_URL: string;
  SUPABASE_SERVICE_ROLE_KEY: string;
  BREVO_API_KEY: string;
  SITE_URL: string;
  MAIL_FROM: string;
  MAIL_FROM_NAME?: string;
  OPERATOR?: string;
  BREVO_URL?: string;        // len pre testy
};

type Row = { request_id: number; seller_id: string; to_email: string; seller_name: string; brand: string; model: string | null;
  year: number | null; category: string | null; part_name: string; note: string | null; city: string | null; created_at: string };

type BuyerRow = { request_id: number; to_email: string; contact_name: string; token: string; part_name: string; brand: string;
  model: string | null; year: number | null; expires_at: string };

const esc = (s: string) => s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]!));

export async function run(env: Env, f: typeof fetch = fetch): Promise<{ sent: number; buyers: number; errors: string[] }> {
  const site = env.SITE_URL.replace(/\/$/, "");
  const rest = env.SUPABASE_URL.replace(/\/$/, "") + "/rest/v1";
  const H = { apikey: env.SUPABASE_SERVICE_ROLE_KEY, Authorization: "Bearer " + env.SUPABASE_SERVICE_ROLE_KEY, "Content-Type": "application/json" };
  const rpc = async (fn: string, args: Record<string, unknown>) => {
    const r = await f(`${rest}/rpc/${fn}`, { method: "POST", headers: H, body: JSON.stringify(args) });
    if (!r.ok) throw new Error(`${fn}: ${r.status} ${await r.text()}`);
    const t = await r.text(); return t ? JSON.parse(t) : null;
  };
  const brand = env.MAIL_FROM_NAME || "autosuciastky.eu";
  const rows: Row[] = (await rpc("request_outbox", { p_limit: 200 })) || [];
  let sent = 0; const errors: string[] = [];
  for (const x of rows) {
    try {
      const car = [x.brand, x.model, x.year ? String(x.year) : ""].filter(Boolean).join(" ");
      const link = `${site}/predajca#req`;
      const html = `<!doctype html><html lang="sk"><body style="font-family:system-ui,Segoe UI,sans-serif;color:#1d2127;max-width:560px;margin:0 auto;padding:16px">
        <p style="font-weight:700;color:#2b2f36;margin:0 0 16px">${esc(brand)}</p>
        <h1 style="font-size:20px;margin:0 0 8px">Nový dopyt: ${esc(x.part_name)}</h1>
        <p>Kupujúci hľadá diel na vozidlo <b>${esc(car)}</b>${x.city ? ` (${esc(x.city)})` : ""}.</p>
        <div style="border-left:3px solid #ffc61a;background:#f5f6f7;padding:10px 14px;margin:12px 0">
          <b>${esc(x.part_name)}</b>${x.category ? `<br><span style="color:#565e69">${esc(x.category)}</span>` : ""}${x.note ? `<br>${esc(x.note).replace(/\r?\n/g, "<br>")}` : ""}
        </div>
        <p><a href="${link}" style="display:inline-block;background:#ffc61a;color:#1d2127;padding:10px 18px;border-radius:3px;font-weight:700;text-decoration:none">Pozrieť dopyt a poslať ponuku</a></p>
        <p style="font-size:14px">Kontakt na kupujúceho uvidíte po prihlásení v portáli predajcu, v záložke Dopyty na diely.</p>
        <hr style="border:0;border-top:1px solid #dde1e5;margin:24px 0 12px">
        <p style="font-size:12px;color:#565e69">Tento e-mail ste dostali ako predajca na ${esc(brand)}, lebo predávate diely na značku ${esc(x.brand)}. E-maily o dopytoch si vypnete v portáli: Profil a nastavenia → „Posielať e-mail o nových dopytoch“. Na tento e-mail neodpovedajte.${env.OPERATOR ? "<br>" + esc(env.OPERATOR) : ""}</p></body></html>`;
      const r = await f(env.BREVO_URL || "https://api.brevo.com/v3/smtp/email", {
        method: "POST",
        headers: { "api-key": env.BREVO_API_KEY, "Content-Type": "application/json", accept: "application/json" },
        body: JSON.stringify({ sender: { email: env.MAIL_FROM, name: brand }, to: [{ email: x.to_email, name: x.seller_name.slice(0, 70) }],
          subject: `Nový dopyt: ${x.part_name} – ${car}`.slice(0, 150), htmlContent: html,
          headers: { "List-Unsubscribe": `<${site}/predajca#prof>` } }),
      });
      if (!r.ok) throw new Error(`Brevo ${r.status}: ${await r.text()}`);
      await rpc("request_mark", { p_request: x.request_id, p_seller: x.seller_id, p_error: null });
      sent++;
    } catch (e) {
      const msg = (e as Error).message.slice(0, 300); errors.push(`dopyt ${x.request_id}: ${msg}`);
      await rpc("request_mark", { p_request: x.request_id, p_seller: x.seller_id, p_error: msg }).catch(() => {});
    }
  }
  // ---- odkaz pre kupujúceho (supabase/41; bez nej funkcia request_buyer_outbox neexistuje – vtedy sa preskočí) ----
  let buyers = 0;
  const brows: BuyerRow[] = await rpc("request_buyer_outbox", { p_limit: 200 }).catch((e: Error) => { if (!/request_buyer_outbox|PGRST202|404/.test(e.message)) errors.push(e.message); return []; }) || [];
  for (const x of brows) {
    try {
      const car = [x.brand, x.model, x.year ? String(x.year) : ""].filter(Boolean).join(" ");
      const link = `${site}/dopyt/${x.token}`;
      const until = new Date(x.expires_at).toLocaleDateString("sk-SK", { timeZone: "Europe/Bratislava" });
      const html = `<!doctype html><html lang="sk"><body style="font-family:system-ui,Segoe UI,sans-serif;color:#1d2127;max-width:560px;margin:0 auto;padding:16px">
        <p style="font-weight:700;color:#2b2f36;margin:0 0 16px">${esc(brand)}</p>
        <h1 style="font-size:20px;margin:0 0 8px">Váš dopyt: ${esc(x.part_name)}</h1>
        <p>Dobrý deň${x.contact_name ? ` ${esc(x.contact_name.split(/\s+/)[0])}` : ""}, dopyt na diel <b>${esc(x.part_name)}</b> na vozidlo <b>${esc(car)}</b> sme poslali predajcom.</p>
        <p>Ponuky, ktoré vám predajcovia pošlú, nájdete na tejto adrese. Uložte si ju – vidí ich len ten, kto má odkaz:</p>
        <p><a href="${link}" style="display:inline-block;background:#ffc61a;color:#1d2127;padding:10px 18px;border-radius:3px;font-weight:700;text-decoration:none">Zobraziť ponuky</a></p>
        <p style="font-size:13px;color:#565e69;word-break:break-all">${esc(link)}</p>
        <p style="font-size:14px">Predajcovia vás môžu kontaktovať aj priamo na tento e-mail. Dopyt platí do ${esc(until)}; keď diel zoženiete, na tej istej stránke ho uzavriete.</p>
        <hr style="border:0;border-top:1px solid #dde1e5;margin:24px 0 12px">
        <p style="font-size:12px;color:#565e69">Tento e-mail sme poslali raz, lebo ste na ${esc(brand)} zadali dopyt na diel s týmto e-mailom. Ak ste dopyt nezadali vy, e-mail ignorujte – na stránke dopytu ho môžete uzavrieť. Na tento e-mail neodpovedajte.${env.OPERATOR ? "<br>" + esc(env.OPERATOR) : ""}</p></body></html>`;
      const r = await f(env.BREVO_URL || "https://api.brevo.com/v3/smtp/email", {
        method: "POST",
        headers: { "api-key": env.BREVO_API_KEY, "Content-Type": "application/json", accept: "application/json" },
        body: JSON.stringify({ sender: { email: env.MAIL_FROM, name: brand }, to: [{ email: x.to_email, name: (x.contact_name || "").slice(0, 70) || undefined }],
          subject: `Váš dopyt: ${x.part_name} – odkaz na ponuky`.slice(0, 150), htmlContent: html }),
      });
      if (!r.ok) throw new Error(`Brevo ${r.status}: ${await r.text()}`);
      await rpc("request_buyer_mark", { p_request: x.request_id, p_error: null });
      buyers++;
    } catch (e) {
      const msg = (e as Error).message.slice(0, 300); errors.push(`kupujúci ${x.request_id}: ${msg}`);
      await rpc("request_buyer_mark", { p_request: x.request_id, p_error: msg }).catch(() => {});
    }
  }
  return { sent, buyers, errors };
}
