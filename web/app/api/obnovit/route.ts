// Po zmene inzerátu v portáli predajcu obnoví verejné stránky dielov (inak by sa zmena ukázala až o pár minút).
// Neprijíma žiadne údaje okrem čísla inzerátu; proti zneužitiu má jednoduchý limit.
import { revalidatePath } from "next/cache";

const hits: number[] = [];
export async function POST(req: Request) {
  const now = Date.now();
  while (hits.length && hits[0] < now - 60_000) hits.shift();
  if (hits.length >= 120) return Response.json({ ok: false, error: "Príliš veľa požiadaviek" }, { status: 429 });
  hits.push(now);
  let ids: unknown = [];
  try { ids = (await req.json())?.ids; } catch {}
  if (!Array.isArray(ids) || !ids.length || ids.length > 500 || !ids.every((x) => Number.isInteger(x) && x > 0)) return Response.json({ ok: false }, { status: 400 });
  revalidatePath("/diel/[slug]", "page");   // všetky detaily (prepočítajú sa pri ďalšej návšteve)
  revalidatePath("/predajci/[slug]", "page");
  return Response.json({ ok: true });
}
