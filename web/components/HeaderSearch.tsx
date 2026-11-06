"use client";
// Hľadanie v hlavičke s našepkávaním: autá a kategórie z katalógu, názvy dielov z inzerátov, OEM číslo.
import { useEffect, useMemo, useRef, useState } from "react";
import { getCatalog, suggestNames } from "@/lib/data";
import type { Catalog } from "@/lib/types";
import { Icon } from "./Icons";

export type Pick = { kind: "q"; q: string } | { kind: "f"; label: string; patch: { brand?: number | null; model?: number | null; cat?: string; sub?: number | null } };
type Item = { key: string; group: string; label: string; hint?: string; pick: Pick };

const norm = (s: string) => s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();
const OEM_RE = /^(?=.*\d)(?=.*[a-z])[a-z0-9 .\-/]{5,24}$/i;

let catCache: Promise<Catalog> | null = null;

export default function HeaderSearch({ value, onChange, onPick }: { value: string; onChange: (v: string) => void; onPick: (p: Pick) => void }) {
  const [open, setOpen] = useState(false);
  const [act, setAct] = useState(-1);
  const [cat, setCat] = useState<Catalog | null>(null);
  const [names, setNames] = useState<{ name: string; n: number }[]>([]);
  const box = useRef<HTMLDivElement>(null);
  const seq = useRef(0);

  const loadCat = () => { if (!catCache) catCache = getCatalog().catch((e) => { catCache = null; throw e; }); catCache.then(setCat).catch(() => {}); };

  // názvy dielov z databázy (s krátkym oneskorením)
  useEffect(() => {
    const t = value.trim(), my = ++seq.current;
    if (t.length < 2) { setNames([]); return; }
    const h = window.setTimeout(() => { suggestNames(t).then((r) => { if (my === seq.current) setNames(r); }).catch(() => {}); }, 180);
    return () => window.clearTimeout(h);
  }, [value]);

  const items = useMemo<Item[]>(() => {
    const t = norm(value.trim());
    if (t.length < 2) return [];
    const words = t.split(/[^a-z0-9]+/).filter(Boolean);
    const has = (s: string) => { const n = norm(s); return words.every((w) => n.includes(w)); };
    const out: Item[] = [];
    if (cat) {
      const cars: Item[] = [];
      for (const m of cat.models) {
        const b = cat.brands.find((x) => x.id === m.brandId);
        if (b && has(`${b.name} ${m.name}`)) cars.push({ key: "m" + m.id, group: "Auto", label: `${b.name} ${m.name}`, hint: `${m.yearFrom}–${m.yearTo || "dnes"}`, pick: { kind: "f", label: `${b.name} ${m.name}`, patch: { brand: b.id, model: m.id } } });
      }
      for (const b of cat.brands) if (has(b.name)) cars.unshift({ key: "b" + b.id, group: "Auto", label: b.name, hint: "všetky modely", pick: { kind: "f", label: b.name, patch: { brand: b.id, model: null } } });
      out.push(...cars.slice(0, 5));
      const cs: Item[] = [];
      for (const c of cat.categories) if (has(c.name)) cs.push({ key: "c" + c.id, group: "Kategória", label: c.name, pick: { kind: "f", label: c.name, patch: { cat: c.id, sub: null } } });
      for (const s of cat.subcategories) if (has(s.name)) cs.push({ key: "s" + s.id, group: "Kategória", label: s.name, hint: cat.categories.find((c) => c.id === s.categoryId)?.name, pick: { kind: "f", label: s.name, patch: { cat: s.categoryId, sub: s.id } } });
      out.push(...cs.slice(0, 4));
    }
    for (const n of names) out.push({ key: "n" + n.name, group: "Diely v ponuke", label: n.name, hint: n.n > 1 ? `${n.n}×` : undefined, pick: { kind: "q", q: n.name } });
    if (OEM_RE.test(value.trim()) && /\d/.test(value)) out.unshift({ key: "oem", group: "Číslo dielu", label: `Hľadať číslo dielu ${value.trim().toUpperCase()}`, pick: { kind: "q", q: value.trim() } });
    return out;
  }, [value, cat, names]);

  useEffect(() => { setAct(-1); }, [value]);
  useEffect(() => {
    const h = (e: MouseEvent) => { if (!box.current?.contains(e.target as Node)) setOpen(false); };
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, []);

  const choose = (it: Item) => { setOpen(false); onPick(it.pick); };
  const show = open && items.length > 0;

  return (
    <div className="hs" ref={box}>
      <input type="search" value={value} placeholder="Hľadajte diel, OEM číslo alebo auto" aria-label="Hľadať"
        role="combobox" aria-expanded={show} aria-controls="hs-list" aria-autocomplete="list" autoComplete="off"
        aria-activedescendant={show && act >= 0 ? "hs-" + act : undefined}
        onFocus={() => { loadCat(); setOpen(true); }}
        onChange={(e) => { onChange(e.target.value); setOpen(true); }}
        onKeyDown={(e) => {
          if (e.key === "Escape") { setOpen(false); return; }
          if (!show) return;
          if (e.key === "ArrowDown") { e.preventDefault(); setAct((a) => Math.min(items.length - 1, a + 1)); }
          else if (e.key === "ArrowUp") { e.preventDefault(); setAct((a) => Math.max(-1, a - 1)); }
          else if (e.key === "Enter" && act >= 0) { e.preventDefault(); choose(items[act]); }
        }} />
      <button type="submit" aria-label="Hľadať" onClick={() => setOpen(false)}><Icon id="i-q" /></button>
      {show && (
        <ul id="hs-list" role="listbox" className="hs-list">
          {items.map((it, i) => (
            <li key={it.key} id={"hs-" + i} role="option" aria-selected={i === act} className={i === act ? "on" : ""}
              onMouseDown={(e) => { e.preventDefault(); choose(it); }} onMouseEnter={() => setAct(i)}>
              {(i === 0 || items[i - 1].group !== it.group) && <span className="hs-g">{it.group}</span>}
              <span className="hs-l">{it.label}</span>{it.hint && <span className="hs-h">{it.hint}</span>}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
