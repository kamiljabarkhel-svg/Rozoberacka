"use client";
// Lišta a nastavenia cookies. Bez voliteľných nástrojov len krátko informuje, že nič nesledujeme (bez súhlasu netreba nič
// zapínať). Keď sa pridá meranie návštevnosti, ponúkne tri rovnocenné tlačidlá: Prijať všetky / Odmietnuť / Nastavenia.
import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { ANALYTICS_SRC, GA_ID, HAS_OPTIONAL, saveConsent, useConsent } from "@/lib/consent";

export default function CookieBar() {
  const { consent, ready, open, close } = useConsent();
  const [settings, setSettings] = useState(false), [an, setAn] = useState(false);
  const dlg = useRef<HTMLDivElement>(null);
  useEffect(() => { if (open) { setAn(!!consent?.analytics); setSettings(true); } }, [open, consent]);
  useEffect(() => { if (settings) dlg.current?.focus(); }, [settings]);

  const done = (analytics: boolean) => { saveConsent(analytics); setSettings(false); close(); };
  const showBar = ready && !consent && !settings;

  return <>
    {HAS_OPTIONAL && consent?.analytics && <AnalyticsScript />}
    {showBar && (HAS_OPTIONAL ? (
      <div className="ckbar" role="region" aria-label="Súhlas s cookies">
        <p><b>Cookies</b> – nevyhnutné úložisko používame vždy (prihlásenie, obľúbené, uložené hľadania). So súhlasom meriame aj návštevnosť cez Google Analytics (Google), aby sme vedeli, čo na webe funguje a čo zlepšiť. Bez súhlasu sa Google Analytics vôbec nenačíta. Súhlas môžete kedykoľvek zmeniť v pätičke. <Link href="/cookies">Podrobnosti</Link></p>
        <div className="ckb"><button className="ckbtn" onClick={() => done(true)}>Prijať všetky</button><button className="ckbtn" onClick={() => done(false)}>Odmietnuť</button><button className="ckbtn ghost" onClick={() => { setAn(false); setSettings(true); }}>Nastavenia</button></div>
      </div>
    ) : (
      <div className="ckbar" role="region" aria-label="Informácia o cookies">
        <p><b>Nesledujeme vás.</b> autosuciastky.eu nepoužíva reklamné ani analytické cookies. V prehliadači ukladáme len to, čo potrebujete na fungovanie (prihlásenie predajcu, obľúbené diely, uložené hľadania, Moje auto). <Link href="/cookies">Podrobnosti</Link></p>
        <div className="ckb"><button className="ckbtn" onClick={() => done(false)}>Rozumiem</button></div>
      </div>
    ))}
    {settings && (
      <div className="overlay ckov" onClick={(e) => { if (e.target === e.currentTarget) { setSettings(false); close(); } }}>
        <div className="ckdlg" role="dialog" aria-modal="true" aria-labelledby="ck-h" tabIndex={-1} ref={dlg} onKeyDown={(e) => { if (e.key === "Escape") { setSettings(false); close(); } }}>
          <h2 id="ck-h">Nastavenia cookies</h2>
          <div className="ckcat">
            <div><b>Nevyhnutné</b><span className="mute">Prihlásenie predajcu, obľúbené diely, uložené hľadania, Moje auto, odkazy na vaše dopyty, táto voľba. Bez nich web nefunguje, preto sú vždy zapnuté (súhlas nie je potrebný).</span></div>
            <span className="ckon">Vždy zapnuté</span>
          </div>
          <div className="ckcat">
            <div><b>Meranie návštevnosti</b><span className="mute">{HAS_OPTIONAL ? "Google Analytics (Google Ireland Ltd.): koľko ľudí web navštívi, ktoré stránky a z akého zariadenia. Bez reklamy a bez prepájania s účtom Google. Cookies _ga a _ga_* (najviac 2 roky)." : "Momentálne nepoužívame žiadne nástroje na meranie návštevnosti ani reklamu."}</span></div>
            {HAS_OPTIONAL
              ? <label className="cksw"><input type="checkbox" checked={an} onChange={(e) => setAn(e.target.checked)} /> <span>{an ? "Zapnuté" : "Vypnuté"}</span></label>
              : <span className="ckoff">Nepoužívame</span>}
          </div>
          <p className="mute">{consent ? `Vaša voľba z ${new Date(consent.at).toLocaleString("sk-SK", { dateStyle: "short", timeStyle: "short" })} je uložená len v tomto prehliadači.` : "Vaša voľba sa uloží len v tomto prehliadači."} <Link href="/cookies" onClick={() => { setSettings(false); close(); }}>Zoznam všetkých údajov v prehliadači</Link></p>
          <div className="ckb">
            {HAS_OPTIONAL ? <>
              <button className="ckbtn" onClick={() => done(an)}>Uložiť voľbu</button>
              <button className="ckbtn" onClick={() => done(true)}>Prijať všetky</button>
              <button className="ckbtn" onClick={() => done(false)}>Odmietnuť všetky</button>
            </> : <button className="ckbtn" onClick={() => done(false)}>Zavrieť</button>}
          </div>
        </div>
      </div>
    )}
  </>;
}

/** Skript merania návštevnosti – vloží sa až po súhlase. Doménu treba doplniť aj do CSP (next.config.ts to robí samo). */
function AnalyticsScript() {
  useEffect(() => {
    if (GA_ID && /^G-[A-Z0-9]+$/.test(GA_ID) && !document.querySelector("script[data-rz-ga]")) {
      // Google Analytics 4 až po súhlase; bez Google signals a reklamných funkcií
      const w = window as unknown as { dataLayer: unknown[]; gtag: (...a: unknown[]) => void } & Record<string, unknown>;
      w["ga-disable-" + GA_ID] = false;
      w.dataLayer = w.dataLayer || [];
      w.gtag = function gtag() { w.dataLayer.push(arguments); }; // eslint-disable-line prefer-rest-params
      w.gtag("js", new Date());
      w.gtag("config", GA_ID, { allow_google_signals: false, allow_ad_personalization_signals: false });
      const g = document.createElement("script");
      g.src = "https://www.googletagmanager.com/gtag/js?id=" + GA_ID; g.async = true; g.dataset.rzGa = "1";
      document.head.appendChild(g);
    }
    if (!ANALYTICS_SRC || document.querySelector("script[data-rz-analytics]")) return;
    const s = document.createElement("script");
    s.src = ANALYTICS_SRC; s.defer = true; s.dataset.rzAnalytics = "1";
    try { s.dataset.domain = location.hostname; } catch {}
    document.head.appendChild(s);
  }, []);
  return null;
}

export function CookieSettingsLink() {
  return <button type="button" className="lnk ckl" onClick={() => window.dispatchEvent(new Event("rz-consent-open"))}>Nastavenia cookies</button>;
}
