"use client";
// „Moje auto“ – kupujúci si raz zadá svoje auto; web ho pamätá len v tomto prehliadači (bez účtu).
import { useCallback, useEffect, useState } from "react";
import type { Catalog, Vehicle } from "./types";

const KEY = "rozoberacka-moje-auto";
const EVT = "rz-mycar";
export type MyCar = { brand: number; model: number | null; engine: number | null; year: number | null };

export function readMyCar(): MyCar | null { return read(); }
function read(): MyCar | null {
  try {
    const v = JSON.parse(localStorage.getItem(KEY) || "null");
    return v && Number(v.brand) > 0 ? { brand: Number(v.brand), model: v.model ? Number(v.model) : null, engine: v.engine ? Number(v.engine) : null, year: v.year ? Number(v.year) : null } : null;
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

export function myCarName(c: MyCar, cat: Catalog | null, withEngine = true): string {
  return [cat?.brands.find((x) => x.id === c.brand)?.name, cat?.models.find((x) => x.id === c.model)?.name,
    withEngine ? cat?.engines.find((x) => x.id === c.engine)?.name : null].filter(Boolean).join(" ") + (c.year ? `, ${c.year}` : "");
}

/** Pasuje diel na moje auto? Zoznam „pasuje na“ bez modelu/motorizácie = všetky. */
export function fitsMyCar(vehicles: Vehicle[], c: MyCar): boolean {
  return vehicles.some((v) => v.brandId === c.brand
    && (v.modelId == null || c.model == null || v.modelId === c.model)
    && (v.engineId == null || c.engine == null || v.engineId === c.engine));
}
