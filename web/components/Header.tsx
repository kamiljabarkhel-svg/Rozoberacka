"use client";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Icon } from "./Icons";
import { STATIC_PREVIEW, homeHref, sellersHref } from "@/lib/paths";
import { getSession, onAuthChange } from "@/lib/seller";
import HeaderSearch, { type Pick } from "./HeaderSearch";

/** Hlavička: logo, hľadanie (na úvode filtruje hneď), „Pre predajcov“. */
export default function Header() {
  const path = usePathname();
  const router = useRouter();
  const onHome = STATIC_PREVIEW || path === "/";
  const [q, setQ] = useState("");
  const [logged, setLogged] = useState(false);
  useEffect(() => { getSession().then((x) => setLogged(!!x)).catch(() => {}); return onAuthChange((x) => setLogged(!!x)); }, []);

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

  const pick = (p: Pick) => {
    if (p.kind === "q") { setQ(p.q); send(p.q, true); return; }
    setQ("");
    if (onHome) { window.dispatchEvent(new CustomEvent("rz-f", { detail: p.patch })); return; }
    const u = new URLSearchParams();
    if (p.patch.brand != null) u.set("znacka", String(p.patch.brand));
    if (p.patch.model != null) u.set("model", String(p.patch.model));
    if (p.patch.cat) u.set("kat", p.patch.cat);
    if (p.patch.sub != null) u.set("pod", String(p.patch.sub));
    router.push("/?" + u.toString() + "#vysledky");
  };

  const Brand = STATIC_PREVIEW ? "a" : Link;
  return (
    <>
    <header className="site-header">
      <div className="tb">
        <Brand className="brand" href={homeHref}><Icon id="i-pr" />autosuciastky.eu</Brand>
        <form className="gs" role="search" onSubmit={(e) => { e.preventDefault(); send(q, true); }}>
          <HeaderSearch value={q} onChange={(v) => { setQ(v); if (onHome) send(v, false); }} onPick={pick} />
        </form>
        <div id="user">
          {STATIC_PREVIEW ? <a className="ubtn" href={sellersHref}>Prihlásenie predajcu</a> : <Link className="ubtn" href={logged ? "/predajca" : sellersHref}>{logged ? "Portál predajcu" : "Prihlásenie predajcu"}</Link>}
        </div>
      </div>
    </header>
      {!STATIC_PREVIEW && <nav className="snav" aria-label="Sekcie">
        <Link href="/" aria-current={path === "/" ? "page" : undefined}>Autodiely</Link>
        <Link href="/?kat=kol#vysledky">Pneumatiky a disky</Link>
        <Link href="/havarovane-vozidla" aria-current={path?.startsWith("/havarovane-vozidla") || path?.startsWith("/vozidlo/") ? "page" : undefined}>Havarované vozidlá</Link>
        <Link href="/dopyt" aria-current={path?.startsWith("/dopyt") ? "page" : undefined}>Dopyt na diel</Link>
      </nav>}
    </>
  );
}
