// Logika funkcie „preklady“ (bez závislosti na Deno, aby sa dala otestovať aj lokálne).
// Z fronty translate_outbox() preloží názov a popis inzerátov zo slovenčiny do poľštiny cez DeepL API a uloží translate_save().
// Telefónne čísla, e-maily a čísla dielov (OEM) sa do DeepL neposielajú – nahradia sa značkou a po preklade sa vrátia.

export type Env = {
  SUPABASE_URL: string;
  SUPABASE_SERVICE_ROLE_KEY: string;
  DEEPL_API_KEY: string;
  DEEPL_URL?: string;      // len pre testy
  LIMIT?: number;
};
type Row = { id: number; name: string; description: string | null; src_hash: string };

const escX = (s: string) => s.replace(/[&<>]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;" }[c]!));
const unX = (s: string) => s.replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&quot;/g, '"').replace(/&apos;/g, "'").replace(/&amp;/g, "&");
// e-mail | telefón (aspoň 9 číslic) | slovo s číslicou (číslo dielu, rozmer, kód motora)
const KEEP = /[\w.+-]+@[\w-]+\.[\w.-]+|\+?\d[\d \/-]{7,}\d|\b(?=[A-Za-z0-9-]*\d)[A-Za-z0-9][A-Za-z0-9.\/-]*[A-Za-z0-9]\b/g;

/** Text → XML pre DeepL, chránené časti ako <k i="n"/>. */
export function protect(s: string): { xml: string; keep: string[] } {
  const keep: string[] = []; let xml = "", last = 0;
  for (const m of s.matchAll(KEEP)) { xml += escX(s.slice(last, m.index)) + `<k i="${keep.length}"/>`; keep.push(m[0]); last = m.index! + m[0].length; }
  return { xml: xml + escX(s.slice(last)), keep };
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
  // Kľúč z bezplatného plánu končí na „:fx“ a má inú adresu.
  const url = env.DEEPL_URL || (env.DEEPL_API_KEY.endsWith(":fx") ? "https://api-free.deepl.com/v2/translate" : "https://api.deepl.com/v2/translate");
  const rows: Row[] = (await rpc("translate_outbox", { p_lang: "pl", p_limit: env.LIMIT || 40 })) || [];
  let translated = 0; const errors: string[] = [];
  for (let i = 0; i < rows.length; i += 20) {
    const batch = rows.slice(i, i + 20);
    const parts = batch.flatMap((x) => [protect(x.name), protect(x.description || "")]);
    try {
      const r = await f(url, {
        method: "POST", headers: { Authorization: "DeepL-Auth-Key " + env.DEEPL_API_KEY, "Content-Type": "application/json" },
        body: JSON.stringify({ text: parts.map((p) => p.xml || " "), source_lang: "SK", target_lang: "PL", tag_handling: "xml", ignore_tags: ["k"], preserve_formatting: true }),
      });
      if (!r.ok) throw new Error(`DeepL ${r.status} ${(await r.text()).slice(0, 200)}`);
      const out = ((await r.json()).translations || []) as { text: string }[];
      for (let k = 0; k < batch.length; k++) {
        const x = batch[k];
        const name = restore(out[2 * k]?.text || "", parts[2 * k].keep) || x.name;
        const desc = x.description ? restore(out[2 * k + 1]?.text || "", parts[2 * k + 1].keep) : null;
        if (await rpc("translate_save", { p_lang: "pl", p_id: x.id, p_name: name, p_desc: desc, p_hash: x.src_hash })) translated++;
      }
    } catch (e) { errors.push(String((e as Error).message || e)); break; }   // pri chybe (limit, zlý kľúč) skúsi znova pri ďalšom spustení
  }
  return { translated, errors };
}
