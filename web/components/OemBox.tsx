"use client";
import { useHref, useLang, useT } from "@/lib/i18n/client";
import { oemPath } from "@/lib/seo";
import { oemKey } from "@/lib/search";
// Číslo dielu (OEM) je hlavný spôsob, ako overiť, či diel pasuje – aj pri rovnakom modeli auta sa diely líšia (výbava, rok, motor).
import { useState } from "react";
import Link from "next/link";

export default function OemBox({ oem, vtype = "osobne" }: { oem: string | null; vtype?: string }) {
  const hl = useHref();
  const tl = useT();
  const lang = useLang();
  const [copied, setCopied] = useState(false);
  if (!oem) return <div className="oembox none"><span className="oeml">{tl("Číslo dielu (OEM)")}</span><b>{tl("Predajca ho neuviedol")}</b>
    <p>{tl("Pred kúpou si číslo dielu vyžiadajte od predajcu a porovnajte ho s vaším starým dielom.")}</p></div>;
  const copy = async () => { try { await navigator.clipboard.writeText(oem); setCopied(true); setTimeout(() => setCopied(false), 1800); } catch {} };
  return (
    <div className="oembox">
      <span className="oeml">{tl("Číslo dielu (OEM)")}</span>
      <div className="oem-line"><b className="oemnum">{oem}</b>
        <button type="button" className="lnk" onClick={copy}>{copied ? tl("Skopírované ✓") : tl("Kopírovať")}</button>
        <Link className="lnk" href={lang === "sk" && oemKey(oem).length >= 4 ? oemPath(oem) : hl("/?q=" + encodeURIComponent(oem) + (vtype !== "osobne" ? "&druh=" + vtype : "") + "#vysledky")}>{tl("Rovnaké číslo u iných predajcov")}</Link></div>
      <p><b>{tl("Porovnajte ho s číslom na vašom starom diele.")}</b> {tl("Aj pri rovnakom modeli auta sa diely líšia podľa motora, výbavy či roku výroby – rozhoduje číslo dielu, nie len auto.")}</p>
    </div>
  );
}
