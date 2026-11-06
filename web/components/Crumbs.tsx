import Link from "next/link";

/** Drobčeky: Úvod › Škoda › Octavia III › Svetlá */
export default function Crumbs({ items, last }: { items: { name: string; href: string }[]; last?: string }) {
  return (
    <nav className="crumbs" aria-label="Kde sa nachádzate">
      {items.map((it, i) => <span key={it.href}>{i > 0 && <i aria-hidden>›</i>}<Link href={it.href}>{it.name}</Link></span>)}
      {last && <span><i aria-hidden>›</i><b>{last}</b></span>}
    </nav>
  );
}
