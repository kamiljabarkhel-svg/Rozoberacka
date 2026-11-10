// Po zmene inzerátu v portáli predajcu obnoví verejné stránky dielov (inak by sa zmena ukázala až o pár minút).
// Neprijíma žiadne údaje okrem čísla inzerátu; proti zneužitiu má jednoduchý limit.
import { revalidatePath } from "next/cache";
import { CARS_ENABLED } from "@/lib/features";

const hits: number[] = [];
export async function POST(req: Request) {
  const now = Date.now();
  while (hits.length && hits[0] < now - 60_000) hits.shift();
  if (hits.length >= 120) return Response.json({ ok: false, error: "Príliš veľa požiadaviek" }, { status: 429 });
  hits.push(now);
  let ids: unknown = [];
  try { ids = (await req.json())?.ids; } catch {}
  if (!Array.isArray(ids) || !ids.length || ids.length > 500 || !ids.every((x) => Number.isInteger(x) && x > 0)) return Response.json({ ok: false }, { status: 400 });
  // Stránky sa prepočítajú pri ďalšej návšteve: detaily, predajcovia, úvod (najnovšie diely) a stránky áut, kategórií a miest.
  // Bez toho by kupujúci ešte pár minút videl zmazaný alebo predaný diel a po kliknutí dostal „Stránka neexistuje“.
  revalidatePath("/diel/[slug]", "page");
  revalidatePath("/predajci/[slug]", "page");
  revalidatePath("/");
  revalidatePath("/diely/[...path]", "page");
  revalidatePath("/kategoria/[...path]", "page");
  revalidatePath("/mesto/[...path]", "page");
  if (CARS_ENABLED) revalidatePath("/havarovane-vozidla");
  revalidatePath("/vozidlo/[slug]", "page");
  return Response.json({ ok: true });
}
