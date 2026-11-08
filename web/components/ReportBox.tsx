"use client";
// Nahlásenie inzerátu správcovi portálu (bez účtu) – mechanizmus podľa čl. 16 nariadenia (EÚ) 2022/2065 (DSA):
// dôvod a vysvetlenie, adresa inzerátu (id), nepovinne meno a kontakt, vyhlásenie o dobrej viere. V databáze report_listing s limitom podľa IP.
import { useState } from "react";
import { IS_DEMO, reportCar, reportListing } from "@/lib/data";

const REASONS = ["Podvod", "Diel nie je na predaj", "Nepravdivé údaje", "Duplicitný inzerát", "Nevhodný obsah", "Iné"];
const CAR_REASONS = ["Podvod", "Podozrenie na kradnuté vozidlo", "Vozidlo nie je na predaj", "Nepravdivé údaje", "Duplicitný inzerát", "Nevhodný obsah", "Iné"];

export default function ReportBox({ id, car = false }: { id: number; car?: boolean }) {
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState(""), [note, setNote] = useState(""), [contact, setContact] = useState(""), [good, setGood] = useState(false);
  const [st, setSt] = useState<{ busy?: boolean; ok?: boolean; err?: string }>({});
  if (st.ok) return <p className="mute rep-ok" role="status">Ďakujeme, nahlásenie sme prijali. Správca inzerát skontroluje; ak ste zadali kontakt, oznámime vám, ako sme rozhodli.</p>;
  if (!open) return <button className="lnk rep-open" onClick={() => setOpen(true)}>⚑ Nahlásiť inzerát</button>;
  const send = async () => {
    if (!reason) { setSt({ err: "Vyberte dôvod." }); return; }
    if (reason === "Iné" && note.trim().length < 10) { setSt({ err: "Pri dôvode „Iné“ napíšte, čo je zle (aspoň pár slov)." }); return; }
    if (!good) { setSt({ err: "Potvrďte, že údaje v nahlásení sú podľa vášho vedomia pravdivé." }); return; }
    setSt({ busy: true });
    try { await (car ? reportCar : reportListing)(id, reason, note, contact); setSt({ ok: true }); }
    catch (e) { setSt({ err: String((e as Error).message || e) }); }
  };
  return (
    <div className="msgbox rep">
      <b>Nahlásiť inzerát</b>
      <label>Dôvod<select value={reason} onChange={(e) => setReason(e.target.value)}><option value="">Vyberte…</option>{(car ? CAR_REASONS : REASONS).map((r) => <option key={r}>{r}</option>)}</select></label>
      <label>Prečo je inzerát v rozpore so zákonom alebo s podmienkami? (napr. kradnutý diel alebo vozidlo, falošná ponuka)<textarea value={note} maxLength={500} onChange={(e) => setNote(e.target.value)} /></label>
      <label>Vaše meno a e-mail, ak chcete odpoveď (nepovinné)<input value={contact} maxLength={120} onChange={(e) => setContact(e.target.value)} /></label>
      <label className="pp-chk"><input type="checkbox" checked={good} onChange={(e) => setGood(e.target.checked)} /> <span>Vyhlasujem v dobrej viere, že údaje v nahlásení sú podľa môjho vedomia presné a úplné.</span></label>
      <div className="rep-a"><button className="call" disabled={st.busy} onClick={send}>{st.busy ? "Odosielam…" : "Odoslať nahlásenie"}</button><button className="lnk" onClick={() => setOpen(false)}>Zrušiť</button></div>
      {st.err && <p className="ferr2" role="alert">{st.err}</p>}
      <p className="mute">Nahlásenie vidí len správca portálu, predajca nie. Uchováme ho 12 mesiacov po vybavení. <a href="/ochrana-osobnych-udajov" target="_blank">Ochrana osobných údajov</a></p>
      {IS_DEMO && <p className="mute">Ukážkový režim: nahlásenie sa nikam neodošle.</p>}
    </div>
  );
}
