// Logika funkcie „preklady“ (bez závislosti na Deno, aby sa dala otestovať aj lokálne).
// Z fronty translate_outbox() preloží názov a popis inzerátov zo slovenčiny do poľštiny a uloží translate_save().
// Prekladač podľa nastaveného kľúča: GOOGLE_TRANSLATE_KEY (Google Cloud Translation, zadarmo 500 000 znakov mesačne),
// AZURE_TRANSLATOR_KEY (Microsoft Translator) alebo DEEPL_API_KEY (DeepL).
// Telefónne čísla, e-maily a čísla dielov (OEM) sa prekladaču neposielajú – nahradia sa značkou a po preklade sa vrátia.

export type Env = {
  SUPABASE_URL: string;
  SUPABASE_SERVICE_ROLE_KEY: string;
  DEEPL_API_KEY?: string;
  DEEPL_URL?: string;      // len pre testy
  AZURE_TRANSLATOR_KEY?: string;
  AZURE_TRANSLATOR_REGION?: string;   // napr. westeurope (podľa zdroja v Azure)
  AZURE_URL?: string;      // len pre testy
  GOOGLE_TRANSLATE_KEY?: string;
  GOOGLE_URL?: string;     // len pre testy
  LIMIT?: number;
};
type Row = { id: number; name: string; description: string | null; src_hash: string };

const escX = (s: string) => s.replace(/[&<>]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;" }[c]!));
const unX = (s: string) => s.replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&quot;/g, '"').replace(/&apos;/g, "'").replace(/&#(\d+);/g, (_, n) => String.fromCharCode(Number(n))).replace(/&amp;/g, "&");
// odkaz | e-mail | telefón (aspoň 9 číslic) | slovo s číslicou (číslo dielu, rozmer, kód motora, ŠPZ, VIN)
const KEEP = /https?:\/\/\S+|www\.\S+|[\w.+-]+@[\w-]+\.[\w.-]+|\+?\d[\d \/-]{7,}\d|\b(?=[A-Za-z0-9-]*\d)[A-Za-z0-9][A-Za-z0-9.\/-]*[A-Za-z0-9]\b/g;

/** Text → XML pre DeepL, chránené časti ako <k i="n"/>. */
export function protect(s: string): { xml: string; keep: string[] } {
  const keep: string[] = []; let xml = "", last = 0;
  for (const m of s.matchAll(KEEP)) { xml += escX(s.slice(last, m.index)) + `<k i="${keep.length}"/>`; keep.push(m[0]); last = m.index! + m[0].length; }
  return { xml: xml + escX(s.slice(last)), keep };
}
/** Pre Google a Microsoft: chránené časti ako <span class="notranslate" translate="no">n</span>. */
export function protectHtml(s: string): { xml: string; keep: string[] } {
  const p = protect(s);
  return { xml: p.xml.replace(/<k i="(\d+)"\/>/g, '<span class="notranslate" translate="no">$1</span>'), keep: p.keep };
}
export function restoreHtml(html: string, keep: string[]): string {
  return restore(html.replace(/<span[^>]*notranslate[^>]*>\s*(\d+)\s*<\/span>/g, '<k i="$1"/>'), keep);
}
export function restore(xml: string, keep: string[]): string {
  return unX(xml.replace(/<k i="(\d+)"\s*\/>/g, (_, i) => escX(keep[Number(i)] ?? ""))).trim();
}

export async function run(env: Env, f: typeof fetch = fetch): Promise<{ translated: number; errors: string[] }> {
  const rest = env.SUPABASE_URL.replace(/\/$/, "") + "/rest/v1";
  const H = { apikey: env.SUPABASE_SERVICE_ROLE_KEY, Authorization: "Bearer " + env.SUPABASE_SERVICE_ROLE_KEY, "Content-Type": "application/json" };
  const rpc = async (fn: string, args: Record<string, unknown>) => {
    const r = await f(`${rest}/rpc/${fn}`, { method: "POST", headers: H, body: JSON.stringify(args) });
    if (!r.ok) throw new Error(`${fn}: ${r.status} ${await r.text()}`);
    const t = await r.text(); return t ? JSON.parse(t) : null;
  };
  const google = !!env.GOOGLE_TRANSLATE_KEY, azure = !google && !!env.AZURE_TRANSLATOR_KEY, html = google || azure;
  if (!html && !env.DEEPL_API_KEY) throw new Error("Chýba GOOGLE_TRANSLATE_KEY, AZURE_TRANSLATOR_KEY alebo DEEPL_API_KEY");
  // DeepL: kľúč z bezplatného plánu končí na „:fx“ a má inú adresu. Azure: európsky server (údaje sa spracúvajú v EÚ).
  const deeplUrl = env.DEEPL_URL || (env.DEEPL_API_KEY?.endsWith(":fx") ? "https://api-free.deepl.com/v2/translate" : "https://api.deepl.com/v2/translate");
  const azureUrl = (env.AZURE_URL || "https://api-eur.cognitive.microsofttranslator.com/translate") + "?api-version=3.0&from=sk&to=pl&textType=html";
  const rows: Row[] = (await rpc("translate_outbox", { p_lang: "pl", p_limit: env.LIMIT || 40 })) || [];
  let translated = 0; const errors: string[] = [];
  for (let i = 0; i < rows.length; i += 20) {
    const batch = rows.slice(i, i + 20);
    const parts = batch.flatMap((x) => html ? [protectHtml(x.name), protectHtml(x.description || "")] : [protect(x.name), protect(x.description || "")]);
    try {
      let texts: string[];
      if (google) {
        const r = await f((env.GOOGLE_URL || "https://translation.googleapis.com/language/translate/v2") + "?key=" + encodeURIComponent(env.GOOGLE_TRANSLATE_KEY!), {
          method: "POST", headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ q: parts.map((p) => p.xml || " "), source: "sk", target: "pl", format: "html" }),
        });
        if (!r.ok) throw new Error(`Google Translate ${r.status} ${(await r.text()).slice(0, 200)}`);
        texts = (((await r.json()).data?.translations || []) as { translatedText: string }[]).map((x) => x.translatedText);
      } else if (azure) {
        const h: Record<string, string> = { "Ocp-Apim-Subscription-Key": env.AZURE_TRANSLATOR_KEY!, "Content-Type": "application/json" };
        if (env.AZURE_TRANSLATOR_REGION) h["Ocp-Apim-Subscription-Region"] = env.AZURE_TRANSLATOR_REGION;
        const r = await f(azureUrl, { method: "POST", headers: h, body: JSON.stringify(parts.map((p) => ({ Text: p.xml || " " }))) });
        if (!r.ok) throw new Error(`Microsoft Translator ${r.status} ${(await r.text()).slice(0, 200)}`);
        texts = ((await r.json()) as { translations: { text: string }[] }[]).map((x) => x.translations?.[0]?.text || "");
      } else {
        const r = await f(deeplUrl, {
          method: "POST", headers: { Authorization: "DeepL-Auth-Key " + env.DEEPL_API_KEY, "Content-Type": "application/json" },
          body: JSON.stringify({ text: parts.map((p) => p.xml || " "), source_lang: "SK", target_lang: "PL", tag_handling: "xml", ignore_tags: ["k"], preserve_formatting: true }),
        });
        if (!r.ok) throw new Error(`DeepL ${r.status} ${(await r.text()).slice(0, 200)}`);
        texts = (((await r.json()).translations || []) as { text: string }[]).map((x) => x.text);
      }
      const back = (k: number) => html ? restoreHtml(texts[k] || "", parts[k].keep) : restore(texts[k] || "", parts[k].keep);
      for (let k = 0; k < batch.length; k++) {
        const x = batch[k];
        const name = back(2 * k) || x.name;
        const desc = x.description ? back(2 * k + 1) : null;
        if (await rpc("translate_save", { p_lang: "pl", p_id: x.id, p_name: name, p_desc: desc, p_hash: x.src_hash })) translated++;
      }
    } catch (e) { errors.push(String((e as Error).message || e)); break; }   // pri chybe (limit, zlý kľúč) skúsi znova pri ďalšom spustení
  }
  return { translated, errors };
}
