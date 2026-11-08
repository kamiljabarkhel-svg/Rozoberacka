"use client";
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
  const [r, setR] = useState<RV | null | undefined>(undefined);
  const [cat, setCat] = useState<Catalog | null>(null);
  const [err, setErr] = useState(""), [confirm, setConfirm] = useState(false);
  const load = useCallback(() => getRequest(token).then(setR).catch((e) => setErr(String(e.message || e))), [token]);
  useEffect(() => { load(); getCatalog().then(setCat).catch(() => {}); }, [load]);
  if (err) return <p className="pp-err">{err}</p>;
  if (r === undefined) return <p className="mute">Načítavam dopyt…</p>;
  if (r === null) return <div className="empty">Dopyt sa nenašiel. Mohol byť zmazaný (po 60 dňoch) alebo je odkaz neúplný.<br /><Link className="add" href="/dopyt">Zadať nový dopyt</Link></div>;
  const car = [cat?.brands.find((b) => b.id === r.brandId)?.name, cat?.models.find((m) => m.id === r.modelId)?.name, cat?.engines.find((e) => e.id === r.engineId)?.name].filter(Boolean).join(" ") + (r.year ? `, ${r.year}` : "");
  const st = r.status === "open" ? `Otvorený do ${new Date(r.expiresAt).toLocaleDateString("sk-SK")}` : r.status === "expired" ? "Platnosť skončila" : "Uzavretý";
  return (
    <>
      <h1>{r.partName}</h1>
      <p className="landing-lead">{car} · zadaný {new Date(r.createdAt).toLocaleDateString("sk-SK")} · <b>{st}</b>{r.note ? <><br />{r.note}</> : null}</p>
      <h2 className="sh">Ponuky od predajcov ({r.offers.length})</h2>
      <Disclaimer kind="request" />
      {r.offers.length > 0 && <p className="mute small">Pri kúpe od podnikateľa máte práva spotrebiteľa (zodpovednosť za vady, pri kúpe na diaľku odstúpenie do 14 dní). Pri kúpe od súkromnej osoby sa predpisy na ochranu spotrebiteľa nepoužijú. Typ predajcu vychádza z jeho vyhlásenia.</p>}
      {!r.offers.length && <div className="empty">Zatiaľ žiadna ponuka. Predajcovia vidia dopyt vo svojom portáli a ozvú sa vám aj priamo na kontakt, ktorý ste uviedli. Stránku si uložte a pozrite sa neskôr.</div>}
      <ul className="pp-msgs">{r.offers.map((o, i) => (
        <li key={i}>
          <div className="pp-mh"><b>{o.sellerId ? <Link href={sellerPath(o.sellerId, o.seller)}>{o.seller}</Link> : o.seller}{o.verified && <span className="bdg">Overený predajca</span>}</b><b className="rq-price">{price(o.price)}</b></div>
          <div className="mute">{sellerKind(o.sellerType)}{isTrader(o.sellerType) ? "" : " (bez práv spotrebiteľa)"}{o.sellerCity ? ` · ${o.sellerCity}` : ""} · {new Date(o.createdAt).toLocaleDateString("sk-SK")}
            {o.ratingCount > 0 && <> · <Stars value={o.ratingAvg} count={o.ratingCount} small /></>}</div>
          {o.note && <p>{o.note}</p>}
          <div className="pp-mf"><a className="call" href={"tel:" + o.phone.replace(/\s/g, "")}>Zavolať {o.phone}</a>
            {o.listingId && o.listingName && <Link className="lnk" href={listingHref(o.listingId, o.listingName)}>Pozrieť inzerát: {o.listingName}</Link>}</div>
          {o.sellerId && <RateSeller token={token} sellerId={o.sellerId} seller={o.seller} stars={o.myStars} review={o.myReview} onDone={load} />}
        </li>))}</ul>
      {r.status === "open" && <p>{confirm
        ? <><button className="del" onClick={async () => { await closeRequest(token).catch((e) => setErr(String(e.message || e))); setConfirm(false); load(); }}>Áno, diel už nehľadám</button> <button className="lnk" onClick={() => setConfirm(false)}>Nie</button></>
        : <button className="ubtn" onClick={() => setConfirm(true)}>Uzavrieť dopyt (diel už mám)</button>}</p>}
      <p className="mute">Neposielajte zálohy vopred neznámym predajcom. Pred kúpou porovnajte OEM číslo so starým dielom.</p>
    </>
  );
}
