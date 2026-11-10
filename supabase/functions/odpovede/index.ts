// Supabase Edge Function „odpovede“ – posiela e-mailom odpovede v konverzáciách predajca ↔ kupujúci (cez Brevo).
// Spúšťa ju pg_cron každú minútu (návod: supabase/README.md, časť Odpovede na správy e-mailom).
// Premenné prostredia (Supabase → Edge Functions → Secrets): BREVO_API_KEY, SITE_URL, MAIL_FROM, MAIL_FROM_NAME, OPERATOR, CRON_SECRET.
// SUPABASE_URL a SUPABASE_SERVICE_ROLE_KEY doplní Supabase sám.
import { run } from "./handler.ts";

Deno.serve(async (req) => {
  const secret = Deno.env.get("CRON_SECRET");
  if (!secret || req.headers.get("x-cron-secret") !== secret) return new Response("Forbidden", { status: 403 });
  const need = ["SUPABASE_URL", "SUPABASE_SERVICE_ROLE_KEY", "BREVO_API_KEY", "SITE_URL", "MAIL_FROM"];
  const miss = need.filter((k) => !Deno.env.get(k));
  if (miss.length) return new Response("Chýba nastavenie: " + miss.join(", "), { status: 500 });
  const out = await run({
    SUPABASE_URL: Deno.env.get("SUPABASE_URL")!, SUPABASE_SERVICE_ROLE_KEY: Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    BREVO_API_KEY: Deno.env.get("BREVO_API_KEY")!, SITE_URL: Deno.env.get("SITE_URL")!, MAIL_FROM: Deno.env.get("MAIL_FROM")!,
    MAIL_FROM_NAME: Deno.env.get("MAIL_FROM_NAME") || "autosuciastky.eu", OPERATOR: Deno.env.get("OPERATOR") || "",
  });
  return new Response(JSON.stringify(out), { headers: { "Content-Type": "application/json" } });
});
