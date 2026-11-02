"use client";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Icon } from "./Icons";
import { STATIC_PREVIEW, homeHref, sellersHref } from "@/lib/paths";

/** Hlavička: logo, hľadanie (na úvode filtruje hneď), „Pre predajcov“. */
export default function Header() {
  const path = usePathname();
  const router = useRouter();
  const onHome = STATIC_PREVIEW || path === "/";
  const [q, setQ] = useState("");

  useEffect(() => {
    try { setQ(new URLSearchParams(window.location.search).get("q") || ""); } catch {}
    const h = (e: Event) => setQ((e as CustomEvent<string>).detail);
    window.addEventListener("rz-q-set", h);
    return () => window.removeEventListener("rz-q-set", h);
  }, []);

  const send = (v: string, scroll: boolean) => {
    if (onHome) window.dispatchEvent(new CustomEvent("rz-q", { detail: { q: v, scroll } }));
    else if (scroll) router.push("/?q=" + encodeURIComponent(v) + "#vysledky");
  };

  const Brand = STATIC_PREVIEW ? "a" : Link;
  return (
    <header className="top">
      <div className="tb">
        <Brand className="brand" href={homeHref}><Icon id="i-pr" />Rozoberačka</Brand>
        <form className="gs" role="search" onSubmit={(e) => { e.preventDefault(); send(q, true); }}>
          <input type="search" value={q} placeholder="Hľadajte diel, OEM číslo alebo auto" aria-label="Hľadať"
            onChange={(e) => { setQ(e.target.value); if (onHome) send(e.target.value, false); }} />
          <button type="submit" aria-label="Hľadať"><Icon id="i-q" /></button>
        </form>
        <div id="user">
          {STATIC_PREVIEW ? <a className="ubtn" href={sellersHref}>Pre predajcov</a> : <Link className="ubtn" href={sellersHref}>Pre predajcov</Link>}
        </div>
      </div>
    </header>
  );
}
