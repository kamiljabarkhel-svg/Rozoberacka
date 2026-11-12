"use client";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { LogoMark, Wordmark } from "./Logo";
import { STATIC_PREVIEW, homeHref, sellersHref } from "@/lib/paths";
import { getSession, onAuthChange } from "@/lib/seller";
import HeaderSearch, { type Pick } from "./HeaderSearch";
import { CARS_ENABLED } from "@/lib/features";

/** Hlavička: logo, hľadanie (na úvode filtruje hneď), „Pre predajcov“. */
export default function Header() {
  const path = usePathname();
  // sekcia „Pneumatiky a disky“ = úvod s kategóriou kol (úvod ohlási zmenu adresy udalosťou rz-url)
  const [wheels, setWheels] = useState(false);
  useEffect(() => {
    const h = () => { try { setWheels(new URLSearchParams(window.location.search).get("kat") === "kol"); } catch {} };
    h(); window.addEventListener("rz-url", h); return () => window.removeEventListener("rz-url", h);
  }, [path]);
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
        <Brand className="brand" href={homeHref} aria-label="autosuciastky.eu – úvod"><LogoMark size={34} /><Wordmark /></Brand>
        <form className="gs" role="search" onSubmit={(e) => { e.preventDefault(); send(q, true); }}>
          <HeaderSearch value={q} onChange={(v) => { setQ(v); if (onHome) send(v, false); }} onPick={pick} />
        </form>
        <div id="user">
          {STATIC_PREVIEW ? <a className="ubtn" href={sellersHref}>Prihlásenie predajcu</a> : <Link className="ubtn" href={logged ? "/predajca" : sellersHref}>{logged ? "Portál predajcu" : "Prihlásenie predajcu"}</Link>}
        </div>
      </div>
    </header>
      {!STATIC_PREVIEW && <nav className="snav" aria-label="Sekcie">
        {/* obyčajné odkazy: úvod si filtre prečíta z adresy pri načítaní */}
        {/* eslint-disable @next/next/no-html-link-for-pages */}
        <a href="/" aria-current={path === "/" && !wheels ? "page" : undefined}>Autodiely</a>
        <a href="/?kat=kol#pneu" aria-current={path === "/" && wheels ? "page" : undefined}>Pneumatiky a disky</a>
        {/* eslint-enable @next/next/no-html-link-for-pages */}
        {CARS_ENABLED && <Link href="/havarovane-vozidla" aria-current={path?.startsWith("/havarovane-vozidla") || path?.startsWith("/vozidlo/") ? "page" : undefined}>Havarované vozidlá</Link>}
        <Link href="/dopyt" aria-current={path?.startsWith("/dopyt") ? "page" : undefined}>Dopyt na diel</Link>
        <Link href="/blog" aria-current={path?.startsWith("/blog") ? "page" : undefined}>Blog</Link>
      </nav>}
    </>
  );
}
