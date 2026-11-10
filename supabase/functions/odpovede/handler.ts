// Logika funkcie „odpovede“ (bez závislosti na Deno, aby sa dala otestovať aj lokálne).
// Z fronty reply_outbox() pošle e-mail druhej strane konverzácie:
//  - odpoveď predajcu → kupujúcemu (odkaz na konverzáciu /sprava/<token>, kde môže odpovedať),
//  - odpoveď kupujúceho → predajcovi (odkaz do portálu, záložka Správy).
// E-mail predajcu ani kupujúceho druhá strana nevidí. Kľúče sú len v premenných prostredia funkcie.

export type Env = {
  SUPABASE_URL: string;
  SUPABASE_SERVICE_ROLE_KEY: string;
  BREVO_API_KEY: string;
  SITE_URL: string;          // napr. https://autosuciastky.eu
  MAIL_FROM: string;         // overená adresa odosielateľa v Brevo (napr. spravy@autosuciastky.eu)
  MAIL_FROM_NAME?: string;   // autosuciastky.eu
  OPERATOR?: string;         // údaje prevádzkovateľa do päty e-mailu
  BREVO_URL?: string;        // len pre testy
};

type Row = { reply_id: number; author: "seller" | "buyer"; body: string; created_at: string; to_email: string | null; to_name: string;
  seller_name: string; buyer_name: string; listing_id: number | null; listing_name: string; token: string; first_reply: boolean };

const esc = (s: string) => s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]!));
const para = (s: string) => esc(s).replace(/\r?\n/g, "<br>");

export async function run(env: Env, f: typeof fetch = fetch): Promise<{ sent: number; errors: string[] }> {
  const site = env.SITE_URL.replace(/\/$/, "");
  const rest = env.SUPABASE_URL.replace(/\/$/, "") + "/rest/v1";
  const H = { apikey: env.SUPABASE_SERVICE_ROLE_KEY, Authorization: "Bearer " + env.SUPABASE_SERVICE_ROLE_KEY, "Content-Type": "application/json" };
  const rpc = async (fn: string, args: Record<string, unknown>) => {
    const r = await f(`${rest}/rpc/${fn}`, { method: "POST", headers: H, body: JSON.stringify(args) });
    if (!r.ok) throw new Error(`${fn}: ${r.status} ${await r.text()}`);
    const t = await r.text(); return t ? JSON.parse(t) : null;
  };
  const brand = env.MAIL_FROM_NAME || "autosuciastky.eu";
  const mail = async (to: string, name: string, subject: string, html: string) => {
    const r = await f(env.BREVO_URL || "https://api.brevo.com/v3/smtp/email", {
      method: "POST",
      headers: { "api-key": env.BREVO_API_KEY, "Content-Type": "application/json", accept: "application/json" },
      body: JSON.stringify({ sender: { email: env.MAIL_FROM, name: brand }, to: [{ email: to, name: name.slice(0, 70) }], subject: subject.slice(0, 150), htmlContent: html }),
    });
    if (!r.ok) throw new Error(`Brevo ${r.status}: ${await r.text()}`);
  };
  const btn = (href: string, text: string) => `<p><a href="${href}" style="display:inline-block;background:#0f3d47;color:#fff;padding:10px 18px;border-radius:3px;font-weight:700;text-decoration:none">${text}</a></p>`;
  const quote = (s: string) => `<div style="border-left:3px solid #f2b300;background:#f5f7f8;padding:10px 14px;margin:12px 0">${para(s)}</div>`;
  const wrap = (body: string, why: string) => `<!doctype html><html lang="sk"><body style="font-family:system-ui,Segoe UI,sans-serif;color:#121d24;max-width:560px;margin:0 auto;padding:16px">
    <p style="font-weight:700;color:#0f3d47;margin:0 0 16px">${esc(brand)}</p>${body}
    <hr style="border:0;border-top:1px solid #d3dce0;margin:24px 0 12px">
    <p style="font-size:12px;color:#56656d">${why} Na tento e-mail neodpovedajte – odpoveď napíšte cez odkaz vyššie. Portál je len inzertný: tovar nepredáva a nie je stranou kúpnej zmluvy. Neposielajte zálohy vopred neznámym predajcom.${env.OPERATOR ? "<br>" + esc(env.OPERATOR) : ""}</p></body></html>`;

  const rows: Row[] = (await rpc("reply_outbox", { p_limit: 50 })) || [];
  let sent = 0; const errors: string[] = [];
  for (const x of rows) {
    try {
      if (!x.to_email) { await rpc("reply_mark", { p_id: x.reply_id, p_error: "chýba e-mail príjemcu" }); continue; }
      const part = x.listing_name ? `„${x.listing_name}“` : "váš dopyt";
      if (x.author === "seller") {
        const link = `${site}/sprava/${x.token}`;
        await mail(x.to_email, x.buyer_name, `${x.seller_name} vám odpovedal: ${x.listing_name || "správa"}`, wrap(`
          <h1 style="font-size:20px;margin:0 0 8px">Predajca vám odpovedal</h1>
          <p><b>${esc(x.seller_name)}</b> odpovedal na vašu správu k inzerátu ${esc(part)}:</p>${quote(x.body)}
          ${btn(link, "Zobraziť konverzáciu a odpovedať")}
          ${x.listing_id ? `<p style="font-size:14px"><a href="${site}/diel/${x.listing_id}">Otvoriť inzerát</a></p>` : ""}`,
          `Tento e-mail ste dostali, lebo ste na ${esc(brand)} napísali predajcovi a zadali svoj e-mail. Váš e-mail predajca nevidí.`));
      } else {
        await mail(x.to_email, x.seller_name, `Nová odpoveď od kupujúceho: ${x.listing_name || "správa"}`, wrap(`
          <h1 style="font-size:20px;margin:0 0 8px">Kupujúci vám odpísal</h1>
          <p><b>${esc(x.buyer_name)}</b> odpovedal v konverzácii k inzerátu ${esc(part)}:</p>${quote(x.body)}
          ${btn(`${site}/predajca#msg`, "Odpovedať v portáli")}`,
          `Tento e-mail ste dostali ako predajca na ${esc(brand)}, lebo kupujúci odpovedal na vašu správu.`));
      }
      await rpc("reply_mark", { p_id: x.reply_id, p_error: null });
      sent++;
    } catch (e) {
      const msg = (e as Error).message.slice(0, 300); errors.push(`odpoveď ${x.reply_id}: ${msg}`);
      await rpc("reply_mark", { p_id: x.reply_id, p_error: msg }).catch(() => {});
    }
  }
  return { sent, errors };
}
