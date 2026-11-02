"use client";
// Obľúbené inzeráty – len v tomto prehliadači (bez účtu).
import { useCallback, useEffect, useState } from "react";

const KEY = "rozoberacka-fav";
const EVT = "rz-favs";

function read(): number[] {
  try { const a = JSON.parse(localStorage.getItem(KEY) || "[]"); return Array.isArray(a) ? a.map(Number) : []; } catch { return []; }
}

export function useFavs() {
  const [favs, setFavs] = useState<number[]>([]);
  useEffect(() => {
    setFavs(read());
    const h = () => setFavs(read());
    window.addEventListener(EVT, h);
    window.addEventListener("storage", h);
    return () => { window.removeEventListener(EVT, h); window.removeEventListener("storage", h); };
  }, []);
  const toggle = useCallback((id: number) => {
    const cur = read();
    const next = cur.includes(id) ? cur.filter((x) => x !== id) : [...cur, id];
    try { localStorage.setItem(KEY, JSON.stringify(next)); } catch {}
    setFavs(next);
    window.dispatchEvent(new Event(EVT));
  }, []);
  return { favs, toggle };
}
