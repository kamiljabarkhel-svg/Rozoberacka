// Supabase Edge Function „preklady“ – strojový preklad názvov a popisov inzerátov do poľštiny.
// Spúšťa ju pg_cron každých 5 minút (supabase/37_preklady_plan.sql).
// Secrets (vloží majiteľ): GOOGLE_TRANSLATE_KEY (Google Cloud Translation, zadarmo 500 000 znakov mesačne),
// alebo AZURE_TRANSLATOR_KEY + AZURE_TRANSLATOR_REGION (Microsoft), alebo DEEPL_API_KEY.
// SUPABASE_URL a SUPABASE_SERVICE_ROLE_KEY doplní Supabase sám.
import { run } from "./handler.ts";

Deno.serve(async (req) => {
  const secret = Deno.env.get("CRON_SECRET");
  if (secret && req.headers.get("x-cron-secret") !== secret) return new Response("Forbidden", { status: 403 });
  if (!Deno.env.get("GOOGLE_TRANSLATE_KEY") && !Deno.env.get("AZURE_TRANSLATOR_KEY") && !Deno.env.get("DEEPL_API_KEY")) return new Response("Chýba nastavenie: GOOGLE_TRANSLATE_KEY", { status: 500 });
  // ?usage – kontrola kľúča DeepL: koľko znakov sa tento mesiac minulo z limitu (kľúč sa nevracia)
  const dk = Deno.env.get("DEEPL_API_KEY");
  if (new URL(req.url).searchParams.has("usage") && dk) {
    const r = await fetch((dk.endsWith(":fx") ? "https://api-free.deepl.com" : "https://api.deepl.com") + "/v2/usage", { headers: { Authorization: "DeepL-Auth-Key " + dk } });
    return new Response(JSON.stringify({ status: r.status, usage: r.ok ? await r.json() : (await r.text()).slice(0, 200) }), { headers: { "Content-Type": "application/json" } });
  }
  const out = await run({ SUPABASE_URL: Deno.env.get("SUPABASE_URL")!, SUPABASE_SERVICE_ROLE_KEY: Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    GOOGLE_TRANSLATE_KEY: Deno.env.get("GOOGLE_TRANSLATE_KEY"), AZURE_TRANSLATOR_KEY: Deno.env.get("AZURE_TRANSLATOR_KEY"), AZURE_TRANSLATOR_REGION: Deno.env.get("AZURE_TRANSLATOR_REGION"), DEEPL_API_KEY: Deno.env.get("DEEPL_API_KEY") });
  return new Response(JSON.stringify(out), { headers: { "Content-Type": "application/json" } });
});
