"use client";
// Registrácia service workera a tlačidlo „Pridať na plochu“ (zobrazí sa, len keď to prehliadač ponúkne).
import { useEffect, useState } from "react";

type BIP = Event & { prompt: () => Promise<void>; userChoice: Promise<{ outcome: string }> };

export default function Pwa() {
  const [evt, setEvt] = useState<BIP | null>(null);
  useEffect(() => {
    if (process.env.NODE_ENV === "production" && "serviceWorker" in navigator) navigator.serviceWorker.register("/sw.js").catch(() => {});
    const h = (e: Event) => { e.preventDefault(); setEvt(e as BIP); };
    window.addEventListener("beforeinstallprompt", h);
    const done = () => setEvt(null);
    window.addEventListener("appinstalled", done);
    return () => { window.removeEventListener("beforeinstallprompt", h); window.removeEventListener("appinstalled", done); };
  }, []);
  if (!evt) return null;
  return <button className="lnk" onClick={async () => { await evt.prompt(); await evt.userChoice.catch(() => null); setEvt(null); }}>📱 Pridať Rozoberačku na plochu</button>;
}
