"use client";
// Nahlásenie inzerátu správcovi portálu (bez účtu). V databáze funkcia report_listing s limitom podľa IP.
import { useState } from "react";
import { IS_DEMO, reportListing } from "@/lib/data";

const REASONS = ["Podvod", "Diel nie je na predaj", "Nepravdivé údaje", "Duplicitný inzerát", "Nevhodný obsah", "Iné"];

export default function ReportBox({ id }: { id: number }) {
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState(""), [note, setNote] = useState(""), [contact, setContact] = useState("");
  const [st, setSt] = useState<{ busy?: boolean; ok?: boolean; err?: string }>({});
  if (st.ok) return <p className="mute rep-ok" role="status">Ďakujeme, nahlásenie sme prijali. Správca inzerát skontroluje.</p>;
  if (!open) return <button className="lnk rep-open" onClick={() => setOpen(true)}>⚑ Nahlásiť inzerát</button>;
  const send = async () => {
    if (!reason) { setSt({ err: "Vyberte dôvod." }); return; }
    setSt({ busy: true });
    try { await reportListing(id, reason, note, contact); setSt({ ok: true }); }
    catch (e) { setSt({ err: String((e as Error).message || e) }); }
  };
  return (
    <div className="msgbox rep">
      <b>Nahlásiť inzerát</b>
      <label>Dôvod<select value={reason} onChange={(e) => setReason(e.target.value)}><option value="">Vyberte…</option>{REASONS.map((r) => <option key={r}>{r}</option>)}</select></label>
      <label>Čo je zle? (nepovinné)<textarea value={note} maxLength={500} onChange={(e) => setNote(e.target.value)} /></label>
      <label>Váš kontakt, ak chcete odpoveď (nepovinné)<input value={contact} maxLength={120} onChange={(e) => setContact(e.target.value)} /></label>
      <div className="rep-a"><button className="call" disabled={st.busy} onClick={send}>{st.busy ? "Odosielam…" : "Odoslať nahlásenie"}</button><button className="lnk" onClick={() => setOpen(false)}>Zrušiť</button></div>
      {st.err && <p className="ferr2" role="alert">{st.err}</p>}
      <p className="mute">Nahlásenie vidí len správca portálu, predajca nie. Uchováme ho 12 mesiacov po vybavení. <a href="/ochrana-osobnych-udajov" target="_blank">Ochrana osobných údajov</a></p>
      {IS_DEMO && <p className="mute">Ukážkový režim: nahlásenie sa nikam neodošle.</p>}
    </div>
  );
}
