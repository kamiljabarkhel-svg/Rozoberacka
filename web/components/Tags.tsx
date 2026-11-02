import type { Listing } from "@/lib/types";

/** Štítky inzerátu: odskúšané, vrátenie, strana, km. */
export default function Tags({ l }: { l: Listing }) {
  const t: [string, string][] = [];
  if (l.tested) t.push(["tg ok", "✓ Odskúšané"]);
  if (l.returns14) t.push(["tg ret", "Vrátenie 14 dní"]);
  if (l.side) t.push(["tg", l.side + " strana"]);
  if (l.km) t.push(["tg", l.km.toLocaleString("sk-SK") + " km"]);
  if (!t.length) return null;
  return <div className="bdgs">{t.map(([c, x]) => <span key={x} className={c}>{x}</span>)}</div>;
}
