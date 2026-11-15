"use client";
// „Podobné čísla dielov“ – samostatný odkaz pri hľadaní čísla dielu: čísla s rovnakým základom a iným písmenom na konci
// (03L130277 → 03L130277A, 03L130277Q…). Nie je to zhoda – výrobca môže písmenom odlíšiť iný diel, preto upozornenie.
import { useEffect, useState } from "react";
import Link from "next/link";
import { getSimilarOems } from "@/lib/data";
import { oemPath } from "@/lib/seo";
import { useHref, useLang, useT } from "@/lib/i18n/client";

/** Číslo dielu v hľadanom texte: celý text alebo jeho slovo s číslicou, aspoň 5 písmen/číslic („nárazník 5E1941015“ → 5E1941015). */
export function looksLikeOem(q: string): string {
  const whole = q.toUpperCase().replace(/[^A-Z0-9]/g, "");
  if (/^[A-Za-z0-9 .\-/]+$/.test(q.trim()) && (whole.match(/\d/g) || []).length >= 3 && whole.length >= 5 && whole.length <= 25 && q.trim().split(/\s+/).length <= 4 && !/[A-Za-z]{5,}/.test(q)) return whole;
  const tok = q.split(/\s+/).map((t) => t.toUpperCase().replace(/[^A-Z0-9]/g, "")).find((t) => t.length >= 5 && (t.match(/\d/g) || []).length >= 3);
  return tok || "";
}

export default function SimilarOems({ q, className = "simoem" }: { q: string; className?: string }) {
  const tl = useT(), hl = useHref(), lang = useLang();
  const key = looksLikeOem(q);
  const [list, setList] = useState<{ oem: string; n: number }[]>([]);
  useEffect(() => {
    let off = false;
    if (!key) { setList([]); return; }
    getSimilarOems(key).then((x) => { if (!off) setList(x); }).catch(() => { if (!off) setList([]); });
    return () => { off = true; };
  }, [key]);
  if (!key || !list.length) return null;
  const href = (o: string) => (lang === "sk" ? oemPath(o) : hl("/?q=" + encodeURIComponent(o) + "#vysledky"));
  return (
    <p className={className}>
      <b>{tl("Podobné čísla dielov:")}</b>{" "}
      {list.map((x, i) => <span key={x.oem}>{i > 0 && ", "}<Link href={href(x.oem)}>{x.oem}</Link> <span className="mute">({x.n})</span></span>)}
      <span className="mute small"> – {tl("nie je to to isté číslo; písmeno na konci môže znamenať inú verziu dielu. Overte si to u predajcu.")}</span>
    </p>
  );
}
