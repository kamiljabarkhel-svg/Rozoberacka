"use client";
import { useCallback, useEffect, useRef, useState } from "react";

// Cloudflare Turnstile – ochrana registrácie, prihlásenia a obnovy hesla proti robotom.
// Zapína sa premennou NEXT_PUBLIC_TURNSTILE_SITE_KEY (verejný kľúč). Tajný kľúč je len v Supabase
// (Authentication → Attack Protection), nikdy v kóde. Bez premennej sa nič nezobrazí.
export const CAPTCHA_KEY = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY || "";

type TS = { render: (el: HTMLElement, o: Record<string, unknown>) => string; reset: (id: string) => void; remove: (id: string) => void };
declare global { interface Window { turnstile?: TS; __tsLoad?: Promise<void> } }

function load(): Promise<void> {
  if (window.turnstile) return Promise.resolve();
  return (window.__tsLoad ||= new Promise<void>((res, rej) => {
    const s = document.createElement("script");
    s.src = "https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit";
    s.async = true; s.onload = () => res(); s.onerror = () => rej(new Error("captcha"));
    document.head.appendChild(s);
  }));
}

/** Vráti prvok s overením, aktuálny token a reset (token platí len na jeden pokus). */
export function useCaptcha() {
  const box = useRef<HTMLDivElement>(null), wid = useRef<string>("");
  const [token, setToken] = useState(""), [fail, setFail] = useState(false);
  useEffect(() => {
    if (!CAPTCHA_KEY) return;
    let gone = false;
    load().then(() => {
      if (gone || !box.current || !window.turnstile) return;
      wid.current = window.turnstile.render(box.current, {
        sitekey: CAPTCHA_KEY, language: "sk", theme: "auto",
        callback: (t: string) => setToken(t), "expired-callback": () => setToken(""), "error-callback": () => setToken(""),
      });
    }).catch(() => setFail(true));
    return () => { gone = true; if (wid.current && window.turnstile) window.turnstile.remove(wid.current); wid.current = ""; };
  }, []);
  const reset = useCallback(() => { setToken(""); if (wid.current && window.turnstile) window.turnstile.reset(wid.current); }, []);
  const el = CAPTCHA_KEY ? <div className="captcha">
    <div ref={box} />
    {fail && <small className="f-err" role="alert">Overenie proti robotom sa nenačítalo. Skontrolujte pripojenie alebo blokovanie reklám a obnovte stránku.</small>}
  </div> : null;
  return { el, token, reset, needed: !!CAPTCHA_KEY };
}
