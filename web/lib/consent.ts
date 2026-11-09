"use client";
// Súhlas s cookies (§ 109 ods. 8 zákona č. 452/2021 Z. z. o elektronických komunikáciách a GDPR čl. 6 ods. 1 písm. a).
// Nevyhnutné úložisko (prihlásenie, obľúbené, uložené hľadania…) súhlas nepotrebuje. Voliteľné nástroje (meranie
// návštevnosti) sa načítajú až po súhlase. Zatiaľ žiadne nepoužívame – zapnú sa nastavením NEXT_PUBLIC_ANALYTICS_SRC.
// Odmietnuť je rovnako jednoduché ako prijať; súhlas sa dá kedykoľvek zmeniť v pätičke („Nastavenia cookies“).
import { useCallback, useEffect, useState } from "react";

const KEY = "rozoberacka-suhlas";
const EVT = "rz-consent";
const OPEN = "rz-consent-open";
/** Zvýšte, keď pribudne nový voliteľný nástroj – lišta sa zobrazí znova. */
export const CONSENT_VERSION = 2; // 2 = pribudol Google Analytics (9. 11. 2026)
/** Adresa skriptu merania návštevnosti (napr. https://plausible.io/js/script.js). Prázdne = žiadne voliteľné cookies. */
export const ANALYTICS_SRC = process.env.NEXT_PUBLIC_ANALYTICS_SRC || "";
/** Google Analytics 4 – ID merania (G-XXXXXXX) z nastavenia v Google Analytics. Prázdne = vypnuté. */
export const GA_ID = (process.env.NEXT_PUBLIC_GA_ID || "").trim();
export const HAS_OPTIONAL = !!ANALYTICS_SRC || /^G-[A-Z0-9]+$/.test(GA_ID);

export type Consent = { v: number; at: string; analytics: boolean };

export function readConsent(): Consent | null {
  try {
    const c = JSON.parse(localStorage.getItem(KEY) || "null");
    return c && c.v === CONSENT_VERSION ? { v: c.v, at: String(c.at), analytics: !!c.analytics } : null;
  } catch { return null; }
}

export function saveConsent(analytics: boolean) {
  const before = readConsent();
  const c: Consent = { v: CONSENT_VERSION, at: new Date().toISOString(), analytics };
  try { localStorage.setItem(KEY, JSON.stringify(c)); } catch {}
  window.dispatchEvent(new Event(EVT));
  if (before?.analytics && !analytics) {
    if (GA_ID) (window as unknown as Record<string, boolean>)["ga-disable-" + GA_ID] = true;
    // Odvolanie súhlasu: zmažeme cookies nastavené nástrojmi tretích strán (portál sám cookies nepoužíva) a načítame stránku bez nich.
    for (const part of document.cookie.split(";")) {
      const name = part.split("=")[0].trim();
      if (!name) continue;
      const host = location.hostname, parts = host.split(".");
      for (const d of ["", host, "." + host, parts.length > 1 ? "." + parts.slice(-2).join(".") : ""]) {
        document.cookie = `${name}=; Max-Age=0; path=/${d ? "; domain=" + d : ""}`;
      }
    }
    location.reload();
  }
}

export const openConsentSettings = () => window.dispatchEvent(new Event(OPEN));

export function useConsent() {
  const [c, setC] = useState<Consent | null>(null), [ready, setReady] = useState(false), [open, setOpen] = useState(false);
  useEffect(() => {
    setC(readConsent()); setReady(true);
    const h = () => setC(readConsent()), o = () => setOpen(true);
    window.addEventListener(EVT, h); window.addEventListener("storage", h); window.addEventListener(OPEN, o);
    return () => { window.removeEventListener(EVT, h); window.removeEventListener("storage", h); window.removeEventListener(OPEN, o); };
  }, []);
  const close = useCallback(() => setOpen(false), []);
  return { consent: c, ready, open, close };
}
