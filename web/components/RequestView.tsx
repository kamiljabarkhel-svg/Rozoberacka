"use client";
import { useHref, useT } from "@/lib/i18n/client";
// Súkromná stránka kupujúceho: jeho dopyt a ponuky od predajcov (zoradené od najlacnejšej).
import { isTrader, sellerKind } from "@/lib/legal";
import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import type { Catalog } from "@/lib/types";
import { closeRequest, getCatalog, getRequest, type RequestView as RV } from "@/lib/data";
import { price } from "@/lib/format";
import { listingHref } from "@/lib/paths";
import { sellerPath } from "@/lib/seo";
import Stars from "./Stars";
import RateSeller from "./RateSeller";
import Disclaimer from "./Disclaimer";

export default function RequestView({ token }: { token: string }) {
  const hl = useHref();
  const tl = useT();
  const [r, setR] = useState<RV | null | undefined>(undefined);
  const [cat, setCat] = useState<Catalog | null>(null);
  const [err, setErr] = useState(""), [confirm, setConfirm] = useState(false);
  const load = useCallback(() => getRequest(token).then(setR).catch((e) => setErr(String(e.message || e))), [token]);
  useEffect(() => { load(); getCatalog().then(setCat).catch(() => {}); }, [load]);
  if (err) return <p className="pp-err">{err}</p>;
  if (r === undefined) return <p className="mute">{tl("Načítavam dopyt…")}</p>;
  if (r === null) return <div className="empty">{tl("Dopyt sa nenašiel. Mohol byť zmazaný (po 60 dňoch) alebo je odkaz neúplný.")}<br /><Link className="add" href={hl("/dopyt")}>{tl("Zadať nový dopyt")}</Link></div>;
  const car = [cat?.brands.find((b) => b.id === r.brandId)?.name, cat?.models.find((m) => m.id === r.modelId)?.name, cat?.engines.find((e) => e.id === r.engineId)?.name].filter(Boolean).join(" ") + (r.year ? `, ${r.year}` : "");
  const st = r.status === "open" ? tl("Otvorený do {0}", new Date(r.expiresAt).toLocaleDateString(tl("sk-SK"))) : r.status === "expired" ? tl("Platnosť skončila") : tl("Uzavretý");
  return (
    <>
      <h1>{r.partName}</h1>
      <p className="landing-lead">{car} {tl("· zadaný")} {new Date(r.createdAt).toLocaleDateString("sk-SK")} · <b>{st}</b>{r.note ? <><br />{r.note}</> : null}</p>
      <h2 className="sh">{tl("Ponuky od predajcov (")}{r.offers.length})</h2>
      <Disclaimer kind="request" />
      {r.offers.length > 0 && <p className="mute small">{tl("Pri kúpe od podnikateľa máte práva spotrebiteľa (zodpovednosť za vady, pri kúpe na diaľku odstúpenie do 14 dní). Pri kúpe od súkromnej osoby sa predpisy na ochranu spotrebiteľa nepoužijú. Typ predajcu vychádza z jeho vyhlásenia.")}</p>}
      {!r.offers.length && <div className="empty">{tl("Zatiaľ žiadna ponuka. Predajcovia vidia dopyt vo svojom portáli a ozvú sa vám aj priamo na kontakt, ktorý ste uviedli. Stránku si uložte a pozrite sa neskôr.")}</div>}
      <ul className="pp-msgs">{r.offers.map((o, i) => (
        <li key={i}>
          <div className="pp-mh"><b>{o.sellerId ? <Link href={hl(sellerPath(o.sellerId, o.seller))}>{o.seller}</Link> : o.seller}{o.verified && <span className="bdg">{tl("Overený predajca")}</span>}</b><b className="rq-price">{price(o.price)}</b></div>
          <div className="mute">{sellerKind(o.sellerType)}{isTrader(o.sellerType) ? "" : tl(" (bez práv spotrebiteľa)")}{o.sellerCity ? ` · ${o.sellerCity}` : ""} · {new Date(o.createdAt).toLocaleDateString("sk-SK")}
            {o.ratingCount > 0 && <> · <Stars value={o.ratingAvg} count={o.ratingCount} small /></>}</div>
          {o.note && <p>{o.note}</p>}
          <div className="pp-mf"><a className="call" href={hl("tel:" + o.phone.replace(/\s/g, ""))}>{tl("Zavolať")} {o.phone}</a>
            {o.listingId && o.listingName && <Link className="lnk" href={hl(listingHref(o.listingId, o.listingName))}>{tl("Pozrieť inzerát:")} {o.listingName}</Link>}</div>
          {o.sellerId && <RateSeller token={token} sellerId={o.sellerId} seller={o.seller} stars={o.myStars} review={o.myReview} onDone={load} />}
        </li>))}</ul>
      {r.status === "open" && <p>{confirm
        ? <><button className="del" onClick={async () => { await closeRequest(token).catch((e) => setErr(String(e.message || e))); setConfirm(false); load(); }}>{tl("Áno, diel už nehľadám")}</button> <button className="lnk" onClick={() => setConfirm(false)}>{tl("Nie")}</button></>
        : <button className="ubtn" onClick={() => setConfirm(true)}>{tl("Uzavrieť dopyt (diel už mám)")}</button>}</p>}
      <p className="mute">{tl("Neposielajte zálohy vopred neznámym predajcom. Pred kúpou porovnajte OEM číslo so starým dielom.")}</p>
    </>
  );
}
