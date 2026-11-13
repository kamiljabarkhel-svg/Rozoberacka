// Po novom príspevku, úprave alebo zmazaní obnoví verejné stránky fóra (inak by sa zmena ukázala až o minútu).
import { revalidatePath } from "next/cache";

const hits: number[] = [];
export async function POST() {
  const now = Date.now();
  while (hits.length && hits[0] < now - 60_000) hits.shift();
  if (hits.length >= 60) return Response.json({ ok: false }, { status: 429 });
  hits.push(now);
  revalidatePath("/forum");
  revalidatePath("/forum/[sekcia]", "page");
  revalidatePath("/forum/[sekcia]/[tema]", "page");
  return Response.json({ ok: true });
}
