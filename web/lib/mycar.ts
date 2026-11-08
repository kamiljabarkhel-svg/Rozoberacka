"use client";
// „Moje auto“ – kupujúci si raz zadá svoje auto; web ho pamätá len v tomto prehliadači (bez účtu).
import { useCallback, useEffect, useState } from "react";
import type { Catalog, Vehicle } from "./types";

const KEY = "rozoberacka-moje-auto";
const EVT = "rz-mycar";
export type MyCar = { brand: number; model: number | null; engine: number | null; year: number | null; label?: string };

export function readMyCar(): MyCar | null { return read(); }
function read(): MyCar | null {
  try {
    const v = JSON.parse(localStorage.getItem(KEY) || "null");
    return v && Number(v.brand) > 0 ? { brand: Number(v.brand), model: v.model ? Number(v.model) : null, engine: v.engine ? Number(v.engine) : null, year: v.year ? Number(v.year) : null, label: typeof v.label === "string" ? v.label.slice(0, 120) : undefined } : null;
  } catch { return null; }
}

export function useMyCar() {
  const [car, setCar] = useState<MyCar | null>(null);
  const [ready, setReady] = useState(false);
  useEffect(() => {
    setCar(read()); setReady(true);
    const h = () => setCar(read());
    window.addEventListener(EVT, h); window.addEventListener("storage", h);
    return () => { window.removeEventListener(EVT, h); window.removeEventListener("storage", h); };
  }, []);
  const save = useCallback((c: MyCar | null) => {
    try { if (c) localStorage.setItem(KEY, JSON.stringify(c)); else localStorage.removeItem(KEY); } catch {}
    setCar(c);
    window.dispatchEvent(new Event(EVT));
  }, []);
  return { car, save, ready };
}

/** Názov auta z katalógu. Stránky dielov majú len časť katalógu – vtedy sa použije názov uložený pri „Uložiť ako moje auto“. */
export function myCarName(c: MyCar, cat: Catalog | null, withEngine = true): string {
  const b = cat?.brands.find((x) => x.id === c.brand)?.name, m = cat?.models.find((x) => x.id === c.model)?.name, e = cat?.engines.find((x) => x.id === c.engine)?.name;
  const known = !!b && (c.model == null || !!m) && (!withEngine || c.engine == null || !!e);
  if (!known && c.label) return withEngine ? c.label : c.label.split(" · ")[0];
  return [b, m, withEngine ? e : null].filter(Boolean).join(" ") + (c.year ? `, ${c.year}` : "");
}
/** Názov na uloženie: „Škoda Octavia III · 1.6 TDI 77 kW, 2015“. */
export function myCarLabel(c: MyCar, cat: Catalog): string {
  const b = cat.brands.find((x) => x.id === c.brand)?.name, m = cat.models.find((x) => x.id === c.model)?.name, e = cat.engines.find((x) => x.id === c.engine)?.name;
  return [[b, m].filter(Boolean).join(" "), e].filter(Boolean).join(" · ") + (c.year ? `, ${c.year}` : "");
}

/** Pasuje diel na moje auto? Zoznam „pasuje na“ bez modelu/motorizácie = všetky. */
export function fitsMyCar(vehicles: Vehicle[], c: MyCar): boolean {
  return vehicles.some((v) => v.brandId === c.brand
    && (v.modelId == null || c.model == null || v.modelId === c.model)
    && (v.engineId == null || c.engine == null || v.engineId === c.engine));
}
