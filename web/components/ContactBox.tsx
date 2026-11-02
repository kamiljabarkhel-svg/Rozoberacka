"use client";
// Napísať predajcovi a Poslať odkaz mechanikovi (detail inzerátu).
import { useState } from "react";
import { sendMessage, IS_DEMO } from "@/lib/data";

export default function ContactBox({ id, name, seller }: { id: number; name: string; seller: string }) {
  const [mode, setMode] = useState<"" | "msg" | "share">("");
  const [nm, setNm] = useState(""); const [ct, setCt] = useState("");
  const [tx, setTx] = useState(`Dobrý deň, je diel „${name}“ ešte k dispozícii? Pasuje na moje auto: `);
  const [st, setSt] = useState<{ busy?: boolean; ok?: boolean; err?: string }>({});
  const url = typeof window !== "undefined" ? window.location.origin + "/inzerat/" + id : "/inzerat/" + id;

  const send = async () => {
    if (nm.trim().length < 2 || ct.trim().length < 5 || tx.trim().length < 5) { setSt({ err: "Vyplňte meno, telefón alebo e-mail a správu." }); return; }
    setSt({ busy: true });
    try { await sendMessage(id, nm, ct, tx); setSt({ ok: true }); }
    catch (e) { setSt({ err: "Správu sa nepodarilo odoslať: " + String((e as Error).message || e) }); }
  };
  const copy = async () => {
    try { await navigator.clipboard.writeText(url); setSt({ ok: true }); }
    catch { const i = document.getElementById("shareUrl") as HTMLInputElement | null; i?.select(); setSt({ err: "Odkaz je označený, skopírujte ho Ctrl+C." }); }
  };

  return (
    <>
      <div className="hbtns">
        <button className="chip" aria-expanded={mode === "msg"} onClick={() => { setMode(mode === "msg" ? "" : "msg"); setSt({}); }}>✉ Napísať predajcovi</button>
        <button className="chip" aria-expanded={mode === "share"} onClick={() => { setMode(mode === "share" ? "" : "share"); setSt({}); }}>↗ Poslať odkaz mechanikovi</button>
      </div>
      {mode === "msg" && (st.ok ? <div className="warn">Správa bola odoslaná predajcovi. Ozve sa vám na kontakt, ktorý ste uviedli.</div> : (
        <div className="msgbox">
          <b>Správa pre {seller}</b>
          <label>Vaše meno<input value={nm} onChange={(e) => setNm(e.target.value)} autoComplete="name" /></label>
          <label>Telefón alebo e-mail na odpoveď<input value={ct} onChange={(e) => setCt(e.target.value)} autoComplete="email" /></label>
          <label>Správa<textarea value={tx} maxLength={800} onChange={(e) => setTx(e.target.value)} /></label>
          <button className="call" disabled={st.busy} onClick={send}>{st.busy ? "Odosielam…" : "Odoslať správu"}</button>
          {st.err && <p className="ferr2" role="alert">{st.err}</p>}
          {IS_DEMO && <p className="mute">Ukážkový režim: správa sa nikam neodošle.</p>}
          <p className="mute">Vaše meno a kontakt uvidí len tento predajca.</p>
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
