"use client";
// Číslo dielu (OEM) je hlavný spôsob, ako overiť, či diel pasuje – aj pri rovnakom modeli auta sa diely líšia (výbava, rok, motor).
import { useState } from "react";
import Link from "next/link";

export default function OemBox({ oem, vtype = "osobne" }: { oem: string | null; vtype?: string }) {
  const [copied, setCopied] = useState(false);
  if (!oem) return <div className="oembox none"><span className="oeml">Číslo dielu (OEM)</span><b>Predajca ho neuviedol</b>
    <p>Pred kúpou si číslo dielu vyžiadajte od predajcu a porovnajte ho s vaším starým dielom.</p></div>;
  const copy = async () => { try { await navigator.clipboard.writeText(oem); setCopied(true); setTimeout(() => setCopied(false), 1800); } catch {} };
  return (
    <div className="oembox">
      <span className="oeml">Číslo dielu (OEM)</span>
      <div className="oem-line"><b className="oemnum">{oem}</b>
        <button type="button" className="lnk" onClick={copy}>{copied ? "Skopírované ✓" : "Kopírovať"}</button>
        <Link className="lnk" href={"/?q=" + encodeURIComponent(oem) + (vtype !== "osobne" ? "&druh=" + vtype : "") + "#vysledky"}>Rovnaké číslo u iných predajcov</Link></div>
      <p><b>Porovnajte ho s číslom na vašom starom diele.</b> Aj pri rovnakom modeli auta sa diely líšia podľa motora, výbavy či roku výroby – rozhoduje číslo dielu, nie len auto.</p>
    </div>
  );
}
