"use client";
import { useEffect, useState } from "react";
import { price } from "@/lib/format";
import { useLang } from "@/lib/i18n/client";

// Cena v € a na poľskej verzii aj približne v zł (kurz ECB, /api/kurz).
let cached: number | null = null, pending: Promise<number> | null = null;
function loadRate(): Promise<number> {
  if (cached) return Promise.resolve(cached);
  return (pending ||= fetch("/api/kurz").then((r) => r.json()).then((j) => (cached = Number(j.pln) || 4.25)).catch(() => (cached = 4.25)));
}
export default function Price({ v, className }: { v: number; className?: string }) {
  const lang = useLang();
  const [rate, setRate] = useState<number | null>(cached);
  useEffect(() => { if (lang === "pl" && !rate) loadRate().then(setRate); }, [lang, rate]);
  if (lang !== "pl") return <span className={className}>{price(v)}</span>;
  const zl = rate ? Math.round(v * rate) : null;
  return <span className={className}>{price(v)}{zl != null && <small className="pln" title="Orientacyjnie, według kursu Europejskiego Banku Centralnego. Sprzedawca podaje cenę w euro."> ≈ {zl.toLocaleString("pl-PL")} zł</small>}</span>;
}
