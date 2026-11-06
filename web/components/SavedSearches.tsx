"use client";
// Pás „Uložené hľadania“ nad výsledkami: názov hľadania, počet nových dielov od poslednej návštevy, odstránenie.
import { useEffect, useState } from "react";
import type { Catalog, Filters } from "@/lib/types";
import { searchListings } from "@/lib/data";
import { describe, type Saved } from "@/lib/saved";

export default function SavedSearches({ list, cat, onOpen, onRemove }: { list: Saved[]; cat: Catalog | null; onOpen: (s: Saved) => void; onRemove: (id: string) => void }) {
  const [fresh, setFresh] = useState<Record<string, number>>({});
  const key = list.map((s) => s.id + s.seenAt).join("|");
  useEffect(() => {
    let off = false;
    Promise.all(list.map(async (s) => {
      try {
        const r = await searchListings({ ...s.f, sort: "new" } as Filters, [], 0, 30);
        return [s.id, r.items.filter((l) => l.createdAt > s.seenAt).length] as const;
      } catch { return [s.id, 0] as const; }
    })).then((x) => { if (!off) setFresh(Object.fromEntries(x)); });
    return () => { off = true; };
  }, [key]); // eslint-disable-line react-hooks/exhaustive-deps
  if (!list.length) return null;
  return (
    <div className="saved" aria-label="Uložené hľadania">
      <b>Uložené hľadania</b>
      {list.map((s) => (
        <span key={s.id} className="saved-i">
          <button className="chip" onClick={() => { setFresh((o) => ({ ...o, [s.id]: 0 })); onOpen(s); }} title="Zobraziť výsledky">
            {describe(s.f, cat)}{fresh[s.id] ? <em className="saved-n">{fresh[s.id] >= 30 ? "30+" : fresh[s.id]} {fresh[s.id] === 1 ? "nový" : fresh[s.id] < 5 ? "nové" : "nových"}</em> : null}
          </button>
          <button className="saved-x" aria-label={"Odstrániť hľadanie " + describe(s.f, cat)} onClick={() => onRemove(s.id)}>×</button>
        </span>
      ))}
    </div>
  );
}
