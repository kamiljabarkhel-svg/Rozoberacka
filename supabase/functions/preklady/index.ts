// Supabase Edge Function „preklady“ – strojový preklad názvov a popisov inzerátov do poľštiny.
// Spúšťa ju pg_cron každých 5 minút (supabase/37_preklady_plan.sql).
// Secrets (vloží majiteľ): AZURE_TRANSLATOR_KEY + AZURE_TRANSLATOR_REGION (Microsoft Translator, zadarmo do 2 mil. znakov mesačne), alebo DEEPL_API_KEY.
// SUPABASE_URL a SUPABASE_SERVICE_ROLE_KEY doplní Supabase sám.
import { run } from "./handler.ts";

Deno.serve(async (req) => {
  const secret = Deno.env.get("CRON_SECRET");
  if (secret && req.headers.get("x-cron-secret") !== secret) return new Response("Forbidden", { status: 403 });
  if (!Deno.env.get("AZURE_TRANSLATOR_KEY") && !Deno.env.get("DEEPL_API_KEY")) return new Response("Chýba nastavenie: AZURE_TRANSLATOR_KEY", { status: 500 });
  const out = await run({ SUPABASE_URL: Deno.env.get("SUPABASE_URL")!, SUPABASE_SERVICE_ROLE_KEY: Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    AZURE_TRANSLATOR_KEY: Deno.env.get("AZURE_TRANSLATOR_KEY"), AZURE_TRANSLATOR_REGION: Deno.env.get("AZURE_TRANSLATOR_REGION"), DEEPL_API_KEY: Deno.env.get("DEEPL_API_KEY") });
  return new Response(JSON.stringify(out), { headers: { "Content-Type": "application/json" } });
});
