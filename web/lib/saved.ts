"use client";
// Uložené hľadania („strážca dielov“) – len v tomto prehliadači, bez účtu a bez e-mailu.
// Pri návrate na web ukáže, koľko nových dielov pribudlo od poslednej návštevy daného hľadania.
import { useCallback, useEffect, useState } from "react";
import type { Catalog, Filters } from "./types";
import { emptyFilters, specsLine, VEHICLE_TYPES } from "./types";

const KEY = "rozoberacka-hladania";
const EVT = "rz-saved";
export const MAX_SAVED = 10;
export type Saved = { id: string; f: Filters; seenAt: string };

function read(): Saved[] {
  try { const a = JSON.parse(localStorage.getItem(KEY) || "[]"); return Array.isArray(a) ? a.filter((x) => x && x.f).map((x) => ({ ...x, f: { ...emptyFilters, ...x.f, specs: x.f.specs || {} } })) : []; } catch { return []; }
}
function write(v: Saved[]) {
  try { localStorage.setItem(KEY, JSON.stringify(v)); } catch {}
  window.dispatchEvent(new Event(EVT));
}
/** Kľúč hľadania – rovnaké filtre = rovnaké hľadanie. */
export function filterKey(f: Filters): string {
  const { fav: _fav, sort: _sort, ...rest } = f; // eslint-disable-line @typescript-eslint/no-unused-vars
  return JSON.stringify({ ...rest, q: rest.q.trim().toLowerCase() });
}
export function hasCriteria(f: Filters): boolean {
  return filterKey(f) !== filterKey(emptyFilters);
}
/** Čitateľný názov hľadania, napr. „Škoda Octavia III · Svetlá · do 100 €“. */
export function describe(f: Filters, cat: Catalog | null): string {
  const p: string[] = [];
  if (f.vtype) p.push(VEHICLE_TYPES.find((t) => t.id === f.vtype)?.short || f.vtype);
  const car = [cat?.brands.find((x) => x.id === f.brand)?.name, cat?.models.find((x) => x.id === f.model)?.name, cat?.engines.find((x) => x.id === f.engine)?.name].filter(Boolean).join(" ");
  if (car) p.push(car + (f.year ? `, ${f.year}` : ""));
  if (f.q.trim()) p.push(`„${f.q.trim()}“`);
  const c = cat?.categories.find((x) => x.id === f.cat)?.name, s = cat?.subcategories.find((x) => x.id === f.sub)?.name;
  if (c) p.push(s ? `${c} – ${s}` : c);
  const sp = specsLine(f.specs); if (sp) p.push(sp);
  if (f.max != null) p.push(`do ${f.max} €`);
  if (f.cond) p.push(f.cond);
  if (f.city) p.push(f.city);
  if (f.side) p.push(`${f.side} strana`);
  if (f.tested) p.push("odskúšané");
  if (f.ret) p.push("s vrátením");
  return p.join(" · ") || "Všetky diely";
}

export function useSaved() {
  const [list, setList] = useState<Saved[]>([]);
  useEffect(() => {
    setList(read());
    const h = () => setList(read());
    window.addEventListener(EVT, h); window.addEventListener("storage", h);
    return () => { window.removeEventListener(EVT, h); window.removeEventListener("storage", h); };
  }, []);
  const add = useCallback((f: Filters) => {
    const cur = read();
    if (cur.some((x) => filterKey(x.f) === filterKey(f))) return;
    write([{ id: String(Date.now()), f: { ...f, fav: false }, seenAt: new Date().toISOString() }, ...cur].slice(0, MAX_SAVED));
  }, []);
  const remove = useCallback((id: string) => write(read().filter((x) => x.id !== id)), []);
  const seen = useCallback((id: string) => write(read().map((x) => (x.id === id ? { ...x, seenAt: new Date().toISOString() } : x))), []);
  return { list, add, remove, seen };
}
