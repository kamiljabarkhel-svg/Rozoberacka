"use client";
// Strážca e-mailom: kupujúci bez účtu dostane raz denne nové diely pre uložené hľadanie (po potvrdení e-mailu).
// Zapína sa premennou NEXT_PUBLIC_EMAIL_ALERTS=1, keď beží odosielanie e-mailov (Brevo + funkcia supabase/functions/strazca).
import { useState } from "react";
import Link from "next/link";
import type { Catalog, Filters } from "@/lib/types";
import { createAlert, filterParams } from "@/lib/data";
import { describe } from "@/lib/saved";

export const EMAIL_ALERTS = process.env.NEXT_PUBLIC_EMAIL_ALERTS === "1";

export default function AlertForm({ f, cat }: { f: Filters; cat: Catalog | null }) {
  const [open, setOpen] = useState(false);
  const [email, setEmail] = useState(""), [ok, setOk] = useState(false);
  const [st, setSt] = useState<"idle" | "busy" | "sent">("idle"), [err, setErr] = useState("");
  if (!EMAIL_ALERTS) return null;
  if (st === "sent") return <p className="alert-f ok" role="status">✓ Poslali sme vám e-mail. Upozornenie začne fungovať po kliknutí na odkaz v ňom.</p>;
  if (!open) return <button className="chip" onClick={() => setOpen(true)}>✉ Posielať nové diely e-mailom</button>;
  const label = describe(f, cat);
  return (
    <form className="alert-f" onSubmit={async (e) => {
      e.preventDefault(); setErr("");
      if (!ok) { setErr("Potvrďte súhlas so zasielaním."); return; }
      setSt("busy");
      try { await createAlert(email, filterParams(f), label); setSt("sent"); } catch (x) { setErr(String((x as Error).message || x)); setSt("idle"); }
    }}>
      <b>Nové diely e-mailom: {label}</b>
      <span className="alert-r">
        <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder="váš e-mail" autoComplete="email" aria-label="E-mail" />
        <button className="btn2" disabled={st === "busy"}>{st === "busy" ? "Odosielam…" : "Zapnúť"}</button>
        <button type="button" className="lnk" onClick={() => setOpen(false)}>Zrušiť</button>
      </span>
      <label className="pp-chk"><input type="checkbox" checked={ok} onChange={(e) => setOk(e.target.checked)} />
        <span>Súhlasím, aby mi Rozoberačka raz denne posielala nové diely pre toto hľadanie (najviac 6 mesiacov, zrušiť sa dá jedným klikom v každom e-maile). <Link href="/ochrana-osobnych-udajov#strazca">Ochrana osobných údajov</Link></span></label>
      {err && <p className="pp-err">{err}</p>}
    </form>
  );
}
