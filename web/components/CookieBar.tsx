"use client";
// Lišta a nastavenia cookies. Bez voliteľných nástrojov len krátko informuje, že nič nesledujeme (bez súhlasu netreba nič
// zapínať). Keď sa pridá meranie návštevnosti, ponúkne tri rovnocenné tlačidlá: Prijať všetky / Odmietnuť / Nastavenia.
import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { ANALYTICS_SRC, HAS_OPTIONAL, saveConsent, useConsent } from "@/lib/consent";

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
        <p><b>Cookies</b> – nevyhnutné úložisko používame vždy (prihlásenie, obľúbené, uložené hľadania). So súhlasom by sme merali aj návštevnosť, aby sme web zlepšovali. Súhlas môžete kedykoľvek zmeniť v pätičke. <Link href="/cookies">Podrobnosti</Link></p>
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
            <div><b>Meranie návštevnosti</b><span className="mute">{HAS_OPTIONAL ? "Anonymné štatistiky, ktoré stránky sa používajú, aby sme web zlepšovali." : "Momentálne nepoužívame žiadne nástroje na meranie návštevnosti ani reklamu."}</span></div>
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
