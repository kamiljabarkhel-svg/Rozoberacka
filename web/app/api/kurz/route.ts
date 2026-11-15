import { NextResponse } from "next/server";

// Kurz EUR → PLN z Európskej centrálnej banky (denný referenčný kurz). Server si ho pamätá 12 hodín.
export const revalidate = 43200;
export async function GET() {
  let rate = 4.25;   // záloha, keby ECB neodpovedala
  try {
    const x = await (await fetch("https://www.ecb.europa.eu/stats/eurofxref/eurofxref-daily.xml", { next: { revalidate: 43200 } })).text();
    const m = x.match(/currency='PLN'\s+rate='([\d.]+)'/);
    if (m) rate = Number(m[1]);
  } catch { /* záloha */ }
  return NextResponse.json({ pln: rate }, { headers: { "Cache-Control": "public, s-maxage=43200, stale-while-revalidate=86400" } });
}
