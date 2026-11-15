"use client";
// Preklad textu inzerátu (názov, popis) na poľskej verzii. Karty v zozname si pýtajú preklad po jednom,
// ale načíta sa to jednou požiadavkou (zbiera sa 30 ms).
import { useEffect, useState } from "react";
import { getListingTr, type ListingTr } from "@/lib/data";
import { useLang } from "./client";

const cache = new Map<number, ListingTr | null>();
const waiting = new Map<number, ((v: ListingTr | null) => void)[]>();
let timer: ReturnType<typeof setTimeout> | null = null;

function flush() {
  timer = null;
  const ids = [...waiting.keys()];
  const cbs = new Map(waiting); waiting.clear();
  getListingTr(ids, "pl").catch(() => new Map<number, ListingTr>()).then((m) => {
    for (const id of ids) { const v = m.get(id) || null; cache.set(id, v); cbs.get(id)?.forEach((f) => f(v)); }
  });
}
function load(id: number): Promise<ListingTr | null> {
  if (cache.has(id)) return Promise.resolve(cache.get(id)!);
  return new Promise((ok) => { const a = waiting.get(id) || []; a.push(ok); waiting.set(id, a); if (!timer) timer = setTimeout(flush, 30); });
}

/** Na /pl vráti poľský preklad inzerátu (ak už je), inak null. */
export function useListingTr(id: number): ListingTr | null {
  const lang = useLang();
  const [v, setV] = useState<ListingTr | null>(lang === "pl" ? cache.get(id) ?? null : null);
  useEffect(() => { if (lang !== "pl") return; let live = true; load(id).then((x) => { if (live) setV(x); }); return () => { live = false; }; }, [id, lang]);
  return lang === "pl" ? v : null;
}
