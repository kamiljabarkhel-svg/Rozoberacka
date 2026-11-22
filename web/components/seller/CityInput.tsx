"use client";
// Výber mesta alebo obce zo zoznamu všetkých obcí Slovenska (public/obce.json). Písaním sa zoznam zúži (datalist).
// Jednotné názvy sú potrebné pre filter Mesto a okruh v km na webe.
import { useEffect, useMemo, useState } from "react";
import { findObec, loadObce, type Obec } from "@/lib/obce";

let shared: Obec[] | null = null;
export function useObce(): Obec[] | null {
  const [list, setList] = useState<Obec[] | null>(shared);
  useEffect(() => { if (!shared) loadObce().then((l) => { shared = l; setList(l); }).catch(() => {}); }, []);
  return list;
}

/** Je názov obce zo zoznamu? Keď sa zoznam nenačítal, prijme sa akýkoľvek text (aspoň 2 znaky). */
export function cityOk(list: Obec[] | null, city: string): boolean {
  if (city.trim().length < 2) return false;
  return !list || !!findObec(list, city);
}
/** Presný názov zo zoznamu (oprava veľkých písmen / diakritiky), inak pôvodný text. */
export function cityCanon(list: Obec[] | null, city: string): string {
  const o = list ? findObec(list, city) : null;
  return o ? o[0] : city.trim();
}

export default function CityInput({ value, onChange, id, invalid }: { value: string; onChange: (v: string) => void; id?: string; invalid?: boolean }) {
  const list = useObce();
  const lid = (id || "obce") + "-list";
  const opts = useMemo(() => (list || []).map((o) => <option key={o[0]} value={o[0]} />), [list]);   // ~2 900 obcí – nevytvárať pri každom písmene
  return <>
    <input id={id} value={value} maxLength={60} list={lid} autoComplete="off" placeholder="Začnite písať, napr. Žilina" aria-invalid={invalid || undefined}
      onChange={(e) => onChange(e.target.value)} onBlur={() => { if (list) { const c = cityCanon(list, value); if (c !== value) onChange(c); } }} />
    <datalist id={lid}>{opts}</datalist>
  </>;
}
