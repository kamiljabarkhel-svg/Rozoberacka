"use client";
// Návštevníkovi s poľským prehliadačom na slovenskej stránke ponúkne poľskú verziu (lišta úplne hore, dá sa zavrieť).
import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { langOf, lhref, switchPath } from "@/lib/i18n";

const KEY = "rz-lang-hint";
export default function LangHint() {
  const path = usePathname() || "/";
  const [show, setShow] = useState(false);
  const target = switchPath(path, "pl");
  useEffect(() => {
    try {
      const pl = (navigator.languages || [navigator.language]).some((l) => /^pl\b/i.test(l || ""));
      const hasPl = lhref("pl", path) !== path;   // stránka má poľskú verziu (nie portál predajcu, fórum, blog)
      setShow(pl && hasPl && langOf(path) === "sk" && !sessionStorage.getItem(KEY));
    } catch { setShow(false); }
  }, [path, target]);
  if (!show) return null;
  const close = () => { try { sessionStorage.setItem(KEY, "1"); } catch { /* */ } setShow(false); };
  return (
    <div className="langhint" lang="pl" role="region" aria-label="Wersja polska">
      <span>Ta strona jest dostępna po polsku.</span>
      <a href={target + (typeof window !== "undefined" ? window.location.search : "")} hrefLang="pl">Przejdź na polską wersję</a>
      <button type="button" onClick={close} aria-label="Zamknij">×</button>
    </div>
  );
}
