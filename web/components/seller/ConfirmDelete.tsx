"use client";
// Potvrdenie zmazania priamo na stránke (žiadne okno prehliadača): jasná otázka, čo sa stane, a dve rovnocenne
// čitateľné tlačidlá. Predvolene je zameraný „Ponechať“, Escape zruší.
import { useEffect, useRef } from "react";

export default function ConfirmDelete({ title, note, label = "Zmazať natrvalo", onConfirm, onCancel }: {
  title: string; note?: string; label?: string; onConfirm: () => void; onCancel: () => void;
}) {
  const keep = useRef<HTMLButtonElement>(null);
  useEffect(() => { keep.current?.focus(); }, []);
  return (
    <div className="cdel" role="alertdialog" aria-label={title} onKeyDown={(e) => { if (e.key === "Escape") onCancel(); }}>
      <div className="cdel-t"><b>{title}</b>{note && <span>{note}</span>}</div>
      <div className="cdel-b">
        <button type="button" className="cdel-yes" onClick={onConfirm}>{label}</button>
        <button type="button" className="cdel-no" ref={keep} onClick={onCancel}>Ponechať</button>
      </div>
    </div>
  );
}
