"use client";
// Detail havarovaného vozidla: galéria, parametre, poškodenie, predajca, telefón na klik, správa, nahlásenie.
import { Fragment, useEffect, useState } from "react";
import Link from "next/link";
import type { CarListing } from "@/lib/types";
import { VEHICLE_TYPES } from "@/lib/types";
import { logCarView } from "@/lib/data";
import { price } from "@/lib/format";
import PhoneButton from "./PhoneButton";
import ContactBox from "./ContactBox";
import ReportBox from "./ReportBox";
import SellerNotice from "./SellerNotice";

const seenKey = (id: number) => "rz-carview-" + id;

export default function CarDetail({ c, title, engine, path, sellerHref }: { c: CarListing; title: string; engine: string; path: string; sellerHref: string }) {
  const [i, setI] = useState(0);
  useEffect(() => {
    try { if (sessionStorage.getItem(seenKey(c.id))) return; sessionStorage.setItem(seenKey(c.id), "1"); } catch {}
    logCarView(c.id).catch(() => {});
  }, [c.id]);
  const vt = VEHICLE_TYPES.find((t) => t.id === c.vehicleType)?.name;
  const rows: [string, string | null | undefined][] = [
    ["Druh vozidla", vt], ["Motorizácia", engine], ["Ročník", String(c.year)], ["Najazdené", c.km != null ? `${c.km.toLocaleString("sk-SK")} km` : null],
    ["Palivo", c.fuel], ["Prevodovka", c.gearbox], ["Farba", c.color], ["Stav", c.condition],
    ["Naštartuje", c.starts == null ? null : c.starts ? "Áno" : "Nie"], ["Doklady", c.docs],
    ["STK a EK do", c.stkUntil ? new Date(c.stkUntil).toLocaleDateString("sk-SK") : null], ["Mesto", c.city],
    ["Pridané", new Date(c.createdAt).toLocaleDateString("sk-SK")],
  ];
  return (
    <div className="cd-grid">
      <div>
        <div className="cd-main">{c.photos.length ? <img src={c.mediums[i] || c.photos[i]} alt={`${title} – fotka ${i + 1}`} onError={(e) => { if (e.currentTarget.src !== c.photos[i]) e.currentTarget.src = c.photos[i]; }} /> : <div className="nop"><span>Bez fotky</span></div>}</div>
        {c.photos.length > 1 && <div className="cd-thumbs">{c.thumbs.map((t, k) => <button key={t} aria-current={k === i} aria-label={`Fotka ${k + 1}`} onClick={() => setI(k)}><img src={t} alt="" loading="lazy" /></button>)}</div>}
        {c.photos.length > 0 && <p className="mute"><a href={c.photos[i]} target="_blank" rel="noreferrer">Otvoriť fotku vo veľkom</a></p>}
        <h2 className="sh">Popis</h2>
        <p className="cd-desc">{c.description}</p>
        {c.damage.length > 0 && <><h2 className="sh">Poškodené časti (podľa predajcu)</h2><div className="cd-dmg">{c.damage.map((d) => <span key={d}>{d}</span>)}</div></>}
      </div>
      <aside className="cd-box">
        <p className="price">{price(c.price)}</p>
        <PhoneButton id={c.id} car />
        <ContactBox id={c.id} name={title} seller={c.seller.name} path={path} car />
        <dl className="cd-params">{rows.filter(([, v]) => v).map(([k, v]) => <Fragment key={k}><dt>{k}</dt><dd>{v}</dd></Fragment>)}</dl>
        <div><b>Predajca:</b> <Link href={sellerHref}>{c.seller.name}</Link>{c.seller.verified && <span className="tg ok"> ✓ Overený</span>}<br /><span className="mute">{c.seller.type}{c.seller.city ? ", " + c.seller.city : ""}</span></div>
        <SellerNotice type={c.seller.type} name={c.seller.name} ico={c.seller.ico} address={c.seller.address} />
        <p className="mute">Údaje o vozidle uvádza predajca, portál ich neoveruje. Pred kúpou si vozidlo pozrite osobne, porovnajte VIN v dokladoch a na karosérii a pri prepise postupujte podľa pokynov dopravného inšpektorátu.</p>
        <ReportBox id={c.id} car />
      </aside>
    </div>
  );
}
