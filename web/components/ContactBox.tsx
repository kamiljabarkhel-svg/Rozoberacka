"use client";
// Napísať predajcovi a Poslať odkaz mechanikovi (detail inzerátu).
import { useState } from "react";
import { sendCarMessage, sendMessage, IS_DEMO } from "@/lib/data";
import type { Catalog } from "@/lib/types";
import { myCarName, readMyCar } from "@/lib/mycar";

export default function ContactBox({ id, name, seller, path, cat, car = false }: { id: number; name: string; seller: string; path?: string; cat?: Catalog; car?: boolean }) {
  const [mode, setMode] = useState<"" | "msg" | "share">("");
  const [nm, setNm] = useState(""); const [ct, setCt] = useState("");
  const [tx, setTx] = useState("");
  const [st, setSt] = useState<{ busy?: boolean; ok?: boolean; err?: string }>({});
  const p = path || "/diel/" + id;
  const url = typeof window !== "undefined" ? window.location.origin + p : p;
  const openMsg = () => {
    if (!tx) { // predvyplnená správa; ak si kupujúci uložil „Moje auto“, doplníme ho
      if (car) setTx(`Dobrý deň, je vozidlo ${name} ešte na predaj? Kedy by sa dalo pozrieť?`);
      else { const my = readMyCar(); const car = my && cat ? myCarName(my, cat) : ""; setTx(`Dobrý deň, je diel „${name}“ ešte k dispozícii?${car ? ` Pasuje na moje auto ${car}?` : ""}`); }
    }
    setMode(mode === "msg" ? "" : "msg"); setSt({});
  };
  const share = async () => {
    if (typeof navigator !== "undefined" && "share" in navigator && window.matchMedia("(pointer: coarse)").matches) { // mobil: ponuka zdieľania (WhatsApp, SMS…)
      try { await navigator.share({ title: name, url }); return; } catch (e) { if ((e as Error).name === "AbortError") return; }
    }
    setMode(mode === "share" ? "" : "share"); setSt({});
  };

  const send = async () => {
    if (nm.trim().length < 2 || ct.trim().length < 5 || tx.trim().length < 5) { setSt({ err: "Vyplňte meno, telefón alebo e-mail a správu." }); return; }
    setSt({ busy: true });
    try { await (car ? sendCarMessage : sendMessage)(id, nm, ct, tx); setSt({ ok: true }); }
    catch (e) { setSt({ err: "Správu sa nepodarilo odoslať: " + String((e as Error).message || e) }); }
  };
  const copy = async () => {
    try { await navigator.clipboard.writeText(url); setSt({ ok: true }); }
    catch { const i = document.getElementById("shareUrl") as HTMLInputElement | null; i?.select(); setSt({ err: "Odkaz je označený, skopírujte ho Ctrl+C." }); }
  };

  return (
    <>
      <div className="hbtns cbtns">
        <button className="chip" aria-expanded={mode === "msg"} onClick={openMsg}>✉ Napísať predajcovi</button>
        <button className="chip" aria-expanded={mode === "share"} onClick={share}>{car ? "↗ Poslať odkaz" : "↗ Poslať odkaz mechanikovi"}</button>
      </div>
      {mode === "msg" && (st.ok ? <div className="warn">Správa bola odoslaná predajcovi. Ozve sa vám na kontakt, ktorý ste uviedli – ak ste zadali e-mail, odpoveď vám príde e-mailom (pozrite aj priečinok Spam).</div> : (
        <div className="msgbox">
          <b>Správa pre {seller}</b>
          <label>Vaše meno<input value={nm} onChange={(e) => setNm(e.target.value)} autoComplete="name" /></label>
          <label>Telefón alebo e-mail na odpoveď<input value={ct} onChange={(e) => setCt(e.target.value)} autoComplete="email" /><small className="mute">Ak zadáte e-mail, predajca vám môže odpísať e-mailom.</small></label>
          <label>Správa<textarea value={tx} maxLength={800} onChange={(e) => setTx(e.target.value)} /></label>
          <button className="call" disabled={st.busy} onClick={send}>{st.busy ? "Odosielam…" : "Odoslať správu"}</button>
          {st.err && <p className="ferr2" role="alert">{st.err}</p>}
          {IS_DEMO && <p className="mute">Ukážkový režim: správa sa nikam neodošle.</p>}
          <p className="mute">Meno, kontakt a správu dostane len tento predajca. Správu uchováme 12 mesiacov. <a href="/ochrana-osobnych-udajov" target="_blank">Ochrana osobných údajov</a></p>
        </div>
      ))}
      {mode === "share" && (
        <div className="msgbox">
          <b>Pošlite odkaz mechanikovi alebo známemu</b>
          <div className="sharebox"><input id="shareUrl" readOnly value={url} onFocus={(e) => e.target.select()} /><button className="call" onClick={copy}>Kopírovať</button></div>
          {st.ok && <p className="mute">Odkaz je skopírovaný.</p>}{st.err && <p className="mute">{st.err}</p>}
        </div>
      )}
    </>
  );
}
