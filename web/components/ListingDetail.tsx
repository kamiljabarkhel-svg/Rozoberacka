"use client";
// Detail inzerátu: galéria, cena, telefón, predajca, popis, parametre, „Pasuje na“, podobné inzeráty.
import { Fragment, useCallback, useEffect, useState } from "react";
import type { Catalog, Listing, Vehicle } from "@/lib/types";
import { getCatalog, getListing, getListingVehicles, getSimilar, logView } from "@/lib/data";
import { groupVehicles } from "@/lib/search";
import { agoText, condDot, price } from "@/lib/format";
import { useFavs } from "@/lib/favs";
import { STATIC_PREVIEW, homeHref } from "@/lib/paths";
import { Icon, catIcon } from "./Icons";
import PhoneButton from "./PhoneButton";
import ListingLink from "./ListingLink";
import Link from "next/link";
import Tags from "./Tags";
import ContactBox from "./ContactBox";
import ReportBox from "./ReportBox";

type State =
  | { st: "loading" }
  | { st: "missing" }
  | { st: "error"; msg: string }
  | { st: "ok"; l: Listing; cat: Catalog; vehicles: Vehicle[]; similar: Listing[] };

export default function ListingDetail({ id, onClose }: { id: number; onClose?: () => void }) {
  const [s, setS] = useState<State>({ st: "loading" });
  const [gi, setGi] = useState(0);
  const { favs, toggle } = useFavs();

  useEffect(() => {
    let off = false;
    setS({ st: "loading" }); setGi(0);
    (async () => {
      try {
        const [cat, l] = await Promise.all([getCatalog(), getListing(id)]);
        if (off) return;
        if (!l) { setS({ st: "missing" }); return; }
        const [vehicles, similar] = await Promise.all([getListingVehicles(l), getSimilar(l).catch(() => [])]);
        if (off) return;
        setS({ st: "ok", l, cat, vehicles, similar });
        if (!onClose) document.title = `${l.name} – Rozoberačka`;
        logView(l.id);
      } catch (e) {
        if (!off) setS({ st: "error", msg: String((e as Error)?.message || e) });
      }
    })();
    return () => { off = true; };
  }, [id, onClose]);

  const n = s.st === "ok" ? s.l.photos.length : 0;
  const go = useCallback((k: number) => { if (n) setGi(((k % n) + n) % n); }, [n]);
  useEffect(() => {
    const h = (e: KeyboardEvent) => {
      if (e.key === "Escape" && onClose) onClose();
      if (n > 1 && e.key === "ArrowLeft") go(gi - 1);
      if (n > 1 && e.key === "ArrowRight") go(gi + 1);
    };
    document.addEventListener("keydown", h);
    return () => document.removeEventListener("keydown", h);
  }, [gi, n, go, onClose]);

  const back = onClose
    ? <button className="close" style={{ justifySelf: "start" }} onClick={onClose}>← Späť na výsledky</button>
    : STATIC_PREVIEW ? <a className="back" href={homeHref}>← Späť na výsledky</a> : <Link className="back" href="/#vysledky" onClick={(e) => { if (window.history.length > 1) { e.preventDefault(); window.history.back(); } }}>← Späť na výsledky</Link>;

  if (s.st === "loading") return <div className="dbox">{back}<p className="mute">Načítavam inzerát…</p></div>;
  if (s.st === "missing") return <div className="dbox">{back}<h2 className="sh">Inzerát sa nenašiel</h2><p className="mute">Mohol byť predaný, pozastavený alebo zmazaný.</p></div>;
  if (s.st === "error") return <div className="dbox">{back}<div className="err" role="alert">Inzerát sa nepodarilo načítať: {s.msg}</div></div>;

  const { l, cat, vehicles, similar } = s;
  const bName = cat.brands.find((x) => x.id === l.brandId)?.name || "";
  const mName = cat.models.find((x) => x.id === l.modelId)?.name || "";
  const eName = cat.engines.find((x) => x.id === l.engineId)?.name || "";
  const cName = cat.categories.find((x) => x.id === l.categoryId)?.name || "";
  const sName = cat.subcategories.find((x) => x.id === l.subcategoryId)?.name || "";
  const fav = favs.includes(l.id);
  const rows: [string, string][] = [
    ["Značka", bName || "neuvedené"], ["Model", mName || "neuvedené"], ["Motorizácia", eName || "Pasuje na všetky motorizácie"],
    ["Ročník", l.year ? String(l.year) : "neuvedené"], ["OEM číslo", l.oem || "neuvedené"], ["Kategória", cName + (sName ? " · " + sName : "")],
    ["Stav", l.condition], ["Záruka", l.warranty === "Bez záruky" ? "Bez záruky (predáva súkromná osoba)" : l.warranty], ["Zasielanie", l.shipping || "Len osobný odber"], ["Mesto", l.city || "neuvedené"],
  ];
  if (l.side) rows.splice(5, 0, ["Strana auta", l.side]);
  if (l.partMaker) rows.splice(5, 0, ["Výrobca dielu", l.partMaker]);
  if (l.gearbox) rows.push(["Prevodovka auta", l.gearbox]);
  if (l.km) rows.push(["Najazdené km auta", l.km.toLocaleString("sk-SK") + " km"]);
  rows.push(["Odskúšaný", l.tested ? "Áno, podľa predajcu" : "Neuvedené"]);
  rows.push(["Vrátenie", l.seller.type === "Firma"
    ? "Pri kúpe na diaľku (kuriér) môžete od zmluvy odstúpiť do 14 dní"
    : l.returns14 ? "Do 14 dní, ak diel nepasuje (ponuka predajcu)" : "Podľa dohody s predajcom"]);
  const groups = groupVehicles(vehicles, cat);

  return (
    <article className="dbox">
      {back}
      <div className="dg">
        <div>
          {n ? (
            <div className="gal">
              <div className="main">
                <img alt={l.name} src={l.photos[gi]} />
                {n > 1 && <>
                  <button className="gn l" aria-label="Predchádzajúca fotka" onClick={() => go(gi - 1)}>‹</button>
                  <button className="gn r" aria-label="Ďalšia fotka" onClick={() => go(gi + 1)}>›</button>
                </>}
                <span className="gc">{gi + 1} / {n}</span>
              </div>
              {n > 1 && <div className="th">
                {l.photos.map((p, k) => (
                  <button key={k} aria-label={"Fotka " + (k + 1)} aria-current={k === gi} onClick={() => go(k)}><img alt="" src={p} /></button>
                ))}
              </div>}
            </div>
          ) : (
            <div className="gal"><div className="main"><div className="nop"><Icon id={catIcon(l.categoryId)} /><span>Predajca nepridal fotky</span></div></div></div>
          )}
        </div>
        <div className="di">
          <h1>{l.name}</h1>
          <div className="dpr"><span className="price">{price(l.price)}</span><span className="cond"><i className={"dot " + condDot(l.condition)} />{l.condition}</span></div>
          <p className="car">{[bName, mName, eName].filter(Boolean).join(" ")}{l.year ? ", " + l.year : ""}</p>
          <div className="dacts">
            <PhoneButton id={l.id} />
            <button className="fav" aria-pressed={fav} onClick={() => toggle(l.id)}>{fav ? "♥" : "♡"} Obľúbené</button>
          </div>
          <ContactBox id={l.id} name={l.name} seller={l.seller.name} />
          <Tags l={l} />
          <div className="seller">
            <b>{l.seller.name}{l.seller.verified && <span className="bdg">Overený predajca</span>}</b>
            <span className="mute">{l.seller.type} · {l.seller.city || l.city}</span>
            <span className="mute">Inzerát pridaný {agoText(l.createdAt)}{l.updatedAt && Date.parse(l.updatedAt) - Date.parse(l.createdAt) > 3600000 ? ` · upravený ${agoText(l.updatedAt)}` : ""}</span>
          </div>
        </div>
      </div>

      <h2 className="sh">Popis</h2>
      <p className="desc">{l.description || "Predajca nepridal popis."}</p>

      <h2 className="sh">Parametre</h2>
      <dl className="dl">{rows.map(([k, v]) => <Fragment key={k}><dt>{k}</dt><dd>{v}</dd></Fragment>)}</dl>

      {groups.length > 0 && <>
        <h2 className="sh">Pasuje na</h2>
        <ul className="fits">
          {groups.map((g) => <li key={g.label}><b>{g.label}</b><br /><span className="mute">{g.engines ? g.engines.join(", ") : "všetky motorizácie"}</span></li>)}
        </ul>
        <p className="mute fits-note">Zoznam skladáme z údajov predajcov (vlastné auto, „pasuje aj na“ a inzeráty s rovnakým OEM číslom). Nie je to overený katalóg. Pred nákupom porovnajte OEM číslo s pôvodným dielom.</p>
      </>}

      <div className="warn">Pred nákupom porovnajte OEM číslo so starým dielom a vyžiadajte si od predajcu ďalšie fotky. Neposielajte zálohy vopred neznámym predajcom.</div>
      <ReportBox id={l.id} />

      {similar.length > 0 && <>
        <h2 className="sh">Podobné inzeráty</h2>
        <div className="sim">
          {similar.map((x) => (
            <ListingLink key={x.id} id={x.id} className="simc">
              <div className="ph">{x.photos.length ? <img alt="" loading="lazy" src={x.thumbs[0]} onError={(e) => { e.currentTarget.src = x.photos[0]; }} /> : <div className="nop"><Icon id={catIcon(x.categoryId)} /></div>}</div>
              <span>{x.name}</span><b>{price(x.price)}</b>
            </ListingLink>
          ))}
        </div>
      </>}
    </article>
  );
}
