// Supabase Edge Function „preklady“ – strojový preklad názvov a popisov inzerátov do poľštiny (DeepL).
// Spúšťa ju pg_cron každých 10 minút (supabase/37_preklady_plan.sql). Secrets: DEEPL_API_KEY (vloží majiteľ).
// SUPABASE_URL a SUPABASE_SERVICE_ROLE_KEY doplní Supabase sám.
import { run } from "./handler.ts";

Deno.serve(async (req) => {
  const secret = Deno.env.get("CRON_SECRET");
  if (secret && req.headers.get("x-cron-secret") !== secret) return new Response("Forbidden", { status: 403 });
  const need = ["SUPABASE_URL", "SUPABASE_SERVICE_ROLE_KEY", "DEEPL_API_KEY"];
  const miss = need.filter((k) => !Deno.env.get(k));
  if (miss.length) return new Response("Chýba nastavenie: " + miss.join(", "), { status: 500 });
  const out = await run({ SUPABASE_URL: Deno.env.get("SUPABASE_URL")!, SUPABASE_SERVICE_ROLE_KEY: Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!, DEEPL_API_KEY: Deno.env.get("DEEPL_API_KEY")! });
  return new Response(JSON.stringify(out), { headers: { "Content-Type": "application/json" } });
});
