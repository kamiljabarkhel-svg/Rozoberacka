"use client";
import { useHref, useLang, useT } from "@/lib/i18n/client";
import { switchPath } from "@/lib/i18n";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import type { Session } from "@supabase/supabase-js";
import { LogoMark, Wordmark } from "./Logo";
import { STATIC_PREVIEW, homeHref, sellersHref } from "@/lib/paths";
import { getSession, onAuthChange } from "@/lib/seller";
import HeaderSearch, { type Pick } from "./HeaderSearch";
import { CARS_ENABLED } from "@/lib/features";

/** Hlavička: logo, hľadanie (na úvode filtruje hneď), „Pre predajcov“. */
export default function Header() {
  const hl = useHref();
  const tl = useT();
  const lang = useLang();
  const fullPath = usePathname() || "/";
  const path = switchPath(fullPath, "sk");   // slovenská podoba adresy (pre porovnania)
  // sekcia „Pneumatiky a disky“ = úvod s kategóriou kol (úvod ohlási zmenu adresy udalosťou rz-url)
  const [wheels, setWheels] = useState(false);
  useEffect(() => {
    const h = () => { try { setWheels(new URLSearchParams(window.location.search).get("kat") === "kol"); } catch {} };
    h(); window.addEventListener("rz-url", h); return () => window.removeEventListener("rz-url", h);
  }, [path]);
  const router = useRouter();
  const onHome = STATIC_PREVIEW || path === "/";
  const [q, setQ] = useState("");
  const [logged, setLogged] = useState(false), [forumOnly, setForumOnly] = useState(false);   // účet len do fóra (supabase/31) – nie predajca
  useEffect(() => {
    const set = (x: Session | null) => { setLogged(!!x); setForumOnly(x?.user.user_metadata?.role === "forum"); };
    getSession().then(set).catch(() => {}); return onAuthChange(set);
  }, []);

  useEffect(() => {
    try { setQ(new URLSearchParams(window.location.search).get("q") || ""); } catch {}
    const h = (e: Event) => setQ((e as CustomEvent<string>).detail);
    window.addEventListener("rz-q-set", h);
    return () => window.removeEventListener("rz-q-set", h);
  }, []);

  const send = (v: string, scroll: boolean) => {
    if (onHome) window.dispatchEvent(new CustomEvent("rz-q", { detail: { q: v, scroll } }));
    else if (scroll) router.push(hl("/?q=") + "" + encodeURIComponent(v) + "#vysledky");
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
    router.push(hl("/?" + u.toString() + "#vysledky"));
  };

  const Brand = STATIC_PREVIEW ? "a" : Link;
  return (
    <>
    <header className="site-header">
      <div className="tb">
        <Brand className="brand" href={hl(homeHref)} aria-label={tl("autosuciastky.eu – úvod")}><LogoMark size={34} /><Wordmark /></Brand>
        <form className="gs" role="search" onSubmit={(e) => { e.preventDefault(); send(q, true); }}>
          <HeaderSearch value={q} onChange={(v) => { setQ(v); if (onHome) send(v, false); }} onPick={pick} />
        </form>
        <div id="user">
          {STATIC_PREVIEW ? <a className="ubtn" href={hl(sellersHref)}>{tl("Prihlásenie predajcu")}</a> : <Link className="ubtn" href={hl(logged ? (forumOnly ? "/forum/ucet" : "/predajca") : sellersHref)}><svg className="ubtn-i" viewBox="0 0 24 24" width="16" height="16" aria-hidden="true"><circle cx="12" cy="8" r="4" fill="none" stroke="currentColor" strokeWidth="2" /><path d="M4 21c0-4.4 3.6-7 8-7s8 2.6 8 7" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" /></svg><span>{logged ? (forumOnly ? tl("Môj účet") : tl("Portál predajcu")) : <>{tl("Prihlásenie")}<span className="hide-s"> {tl("predajcu")}</span></>}</span></Link>}
          {/* obyčajný odkaz: formulár si „registracia=1“ prečíta pri načítaní */}
          {!STATIC_PREVIEW && <span className="langsw" role="group" aria-label={tl("Jazyk")}>
            <a href={switchPath(fullPath, "sk")} hrefLang="sk" lang="sk" aria-current={lang === "sk" ? "true" : undefined}>SK</a>
            <a href={switchPath(fullPath, "pl")} hrefLang="pl" lang="pl" aria-current={lang === "pl" ? "true" : undefined}>PL</a>
          </span>}
          {!logged && <a className="regbtn" href={hl(STATIC_PREVIEW ? sellersHref : "/pre-predajcov?registracia=1")}>{tl("Registrácia")}</a>}
        </div>
      </div>
    </header>
      {!STATIC_PREVIEW && <nav className="snav" aria-label={tl("Sekcie")}>
        {/* obyčajné odkazy: úvod si filtre prečíta z adresy pri načítaní */}
        {/* eslint-disable @next/next/no-html-link-for-pages */}
        <a href={hl("/")} aria-current={path === "/" && !wheels ? "page" : undefined}>{tl("Autodiely")}</a>
        <a href={hl("/?kat=kol#pneu")} aria-current={path === "/" && wheels ? "page" : undefined}>{tl("Pneumatiky")}<span className="hide-s"> {tl("a disky")}</span></a>
        {/* eslint-enable @next/next/no-html-link-for-pages */}
        {CARS_ENABLED && <Link href={hl("/havarovane-vozidla")} aria-current={path?.startsWith("/havarovane-vozidla") || path?.startsWith("/vozidlo/") ? "page" : undefined}>{tl("Havarované vozidlá")}</Link>}
        <Link href={hl("/dopyt")} aria-current={path?.startsWith("/dopyt") ? "page" : undefined}>{tl("Dopyt")}<span className="hide-s"> {tl("na diel")}</span></Link>
        {lang === "sk" && <Link href="/forum" aria-current={path?.startsWith("/forum") ? "page" : undefined}>Fórum</Link>}
        {lang === "sk" && <Link href="/blog" aria-current={path?.startsWith("/blog") ? "page" : undefined}>Blog</Link>}
        {lang === "pl" && <Link href={hl("/navody")} aria-current={path?.startsWith("/navody") ? "page" : undefined}>{tl("Rady a návody")}</Link>}
      </nav>}
    </>
  );
}
