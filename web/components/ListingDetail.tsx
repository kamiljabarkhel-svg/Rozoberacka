"use client";
// Detail inzerátu: galéria, cena, telefón, predajca, popis, parametre, „Pasuje na“, podobné inzeráty.
import { Fragment, useCallback, useEffect, useRef, useState } from "react";
import { loadDetail, logView, type DetailData } from "@/lib/data";
import { groupVehicles } from "@/lib/search";
import { agoText, condDot, price } from "@/lib/format";
import { useFavs } from "@/lib/favs";
import { condLabel } from "@/lib/types";
import { STATIC_PREVIEW, homeHref } from "@/lib/paths";
import { Icon, catIcon } from "./Icons";
import PhoneButton from "./PhoneButton";
import ListingLink from "./ListingLink";
import Link from "next/link";
import Tags from "./Tags";
import ContactBox from "./ContactBox";
import ReportBox from "./ReportBox";
import Crumbs from "./Crumbs";
import { carName, landingCrumbs, listingPath, sellerPath } from "@/lib/seo";
import Stars from "./Stars";
import MyCarFit from "./MyCarFit";
import SellerNotice from "./SellerNotice";
import { isTrader, liabilityText, sellerKind, withdrawalText } from "@/lib/legal";

type State =
  | { st: "loading" }
  | { st: "missing" }
  | { st: "error"; msg: string }
  | ({ st: "ok" } & DetailData);

type MiniItem = DetailData["similar"][number];
function Mini({ x, cat }: { x: MiniItem; cat: DetailData["cat"] }) {
  return <>
    <div className="ph">{x.photos.length ? <img alt="" loading="lazy" src={x.thumbs[0]} onError={(e) => { e.currentTarget.src = x.photos[0]; }} /> : <div className="nop"><Icon id={catIcon(x.categoryId)} /></div>}</div>
    <span>{x.name}</span><small className="mute">{[carName(x, cat), x.year].filter(Boolean).join(", ")}</small><b>{price(x.price)}</b>
  </>;
}

export default function ListingDetail({ id, onClose, initial }: { id: number; onClose?: () => void; initial?: DetailData | null }) {
  const [s, setS] = useState<State>(initial ? { st: "ok", ...initial } : { st: "loading" });
  const [gi, setGi] = useState(0);
  const { favs, toggle } = useFavs();
  // Na mobile: keď hlavné tlačidlo telefónu zíde z obrazovky, ukáže sa lišta s cenou a telefónom dole.
  const actsRef = useRef<HTMLDivElement>(null);
  const [bar, setBar] = useState(false);
  useEffect(() => {
    const el = actsRef.current;
    if (!el || typeof IntersectionObserver === "undefined") return;
    const o = new IntersectionObserver(([e]) => setBar(!e.isIntersecting && e.boundingClientRect.top < 0));
    o.observe(el);
    return () => o.disconnect();
  }, [s.st]);

  useEffect(() => {
    let off = false;
    if (initial && initial.l.id === id) { logView(id); return; } // údaje pripravil server (rýchlejšie a viditeľné pre Google)
    setS({ st: "loading" }); setGi(0);
    (async () => {
      try {
        const d = await loadDetail(id);
        if (off) return;
        if (!d) { setS({ st: "missing" }); return; }
        setS({ st: "ok", ...d });
        logView(d.l.id);
      } catch (e) {
        if (!off) setS({ st: "error", msg: String((e as Error)?.message || e) });
      }
    })();
    return () => { off = true; };
  }, [id, initial]);

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
  if (s.st === "missing") return <div className="dbox">{back}<h2 className="sh">Inzerát sa nenašiel</h2><p className="mute">Diel bol pravdepodobne predaný, pozastavený alebo zmazaný.</p><p><a className="btn2" href={homeHref}>Hľadať podobné diely</a></p></div>;
  if (s.st === "error") return <div className="dbox">{back}<div className="err" role="alert">Inzerát sa nepodarilo načítať: {s.msg}</div></div>;

  const { l, cat, vehicles, similar, more, sameCar } = s;
  const bName = cat.brands.find((x) => x.id === l.brandId)?.name || "";
  const mName = cat.models.find((x) => x.id === l.modelId)?.name || "";
  const eName = cat.engines.find((x) => x.id === l.engineId)?.name || "";
  const cName = cat.categories.find((x) => x.id === l.categoryId)?.name || "";
  const sName = cat.subcategories.find((x) => x.id === l.subcategoryId)?.name || "";
  const fav = favs.includes(l.id);
  const rows: [string, string][] = [
    ["Značka", bName || "neuvedené"], ["Model", mName || "neuvedené"], ["Motorizácia", eName || "Pasuje na všetky motorizácie"],
    ["Ročník", l.year ? String(l.year) : "neuvedené"], ["OEM číslo", l.oem || "neuvedené"], ["Kategória", cName + (sName ? " · " + sName : "")],
    ["Stav", condLabel(l.condition)], ["Zodpovednosť za vady", liabilityText(l)], ["Odovzdanie", l.shipping || "Len osobný odber"], ["Mesto", l.city || "neuvedené"],
  ];
  if (l.side) rows.splice(5, 0, ["Strana auta", l.side]);
  if (l.partMaker) rows.splice(5, 0, ["Výrobca dielu", l.partMaker]);
  if (l.gearbox) rows.push(["Prevodovka auta", l.gearbox]);
  if (l.km) rows.push(["Najazdené km auta", l.km.toLocaleString("sk-SK") + " km"]);
  rows.push(["Odskúšaný", l.tested ? "Áno, podľa predajcu" : "Neuvedené"]);
  rows.push(["Odstúpenie a vrátenie", withdrawalText(l)]);
  const groups = groupVehicles(vehicles, cat);

  return (
    <article className="dbox">
      {back}
      {!STATIC_PREVIEW && <Crumbs items={landingCrumbs({ brandId: l.brandId, modelId: l.modelId, cat: l.categoryId, sub: null }, cat)} />}
      <div className="dg">
        <div>
          {n ? (
            <div className="gal">
              <div className="main">
                <img key={gi} alt={l.name} src={l.photos[gi]} srcSet={l.mediums[gi] !== l.photos[gi] ? `${l.mediums[gi]} 960w, ${l.photos[gi]} 1600w` : undefined}
                  sizes="(max-width: 900px) 100vw, 640px" fetchPriority={gi === 0 ? "high" : "auto"}
                  ref={(im) => { if (im && im.complete && im.naturalWidth === 0 && im.getAttribute("srcset")) { im.removeAttribute("srcset"); im.src = l.photos[gi]; } }}
                  onError={(e) => { const im = e.currentTarget; if (im.getAttribute("srcset")) { im.removeAttribute("srcset"); im.src = l.photos[gi]; } }} />
                {n > 1 && <>
                  <button className="gn l" aria-label="Predchádzajúca fotka" onClick={() => go(gi - 1)}>‹</button>
                  <button className="gn r" aria-label="Ďalšia fotka" onClick={() => go(gi + 1)}>›</button>
                </>}
                <span className="gc">{gi + 1} / {n}</span>
              </div>
              {n > 1 && <div className="th">
                {l.photos.map((p, k) => (
                  <button key={k} aria-label={"Fotka " + (k + 1)} aria-current={k === gi} onClick={() => go(k)}><img alt="" loading="lazy" src={l.thumbs[k] || p} onError={(e) => { if (e.currentTarget.src !== p) e.currentTarget.src = p; }} /></button>
                ))}
              </div>}
            </div>
          ) : (
            <div className="gal"><div className="main"><div className="nop"><Icon id={catIcon(l.categoryId)} /><span>Predajca nepridal fotky</span></div></div></div>
          )}
        </div>
        <div className="di">
          <h1>{l.name}</h1>
          <div className="dpr"><span className="price">{price(l.price)}</span><span className="cond"><i className={"dot " + condDot(l.condition)} />{condLabel(l.condition)}</span></div>
          {isTrader(l.seller.type) && <p className="mute pnote">Konečná cena vrátane DPH. Cenu dopravy si dohodnite s predajcom pred kúpou.</p>}
          <p className="car">{[bName, mName, eName].filter(Boolean).join(" ")}{l.year ? ", " + l.year : ""}</p>
          <div className="dacts" ref={actsRef}>
            <PhoneButton id={l.id} />
            <button className="fav" aria-pressed={fav} onClick={() => toggle(l.id)}>{fav ? "♥" : "♡"} Obľúbené</button>
          </div>
          <ContactBox id={l.id} name={l.name} seller={l.seller.name} path={listingPath(l.id, l.name, carName(l, cat))} cat={cat} />
          <Tags l={l} />
          <MyCarFit vehicles={vehicles} cat={cat} />
          <div className="seller">
            <b>{l.sellerId && !STATIC_PREVIEW ? <Link href={sellerPath(l.sellerId, l.seller.name)}>{l.seller.name}</Link> : l.seller.name}{l.seller.verified && <span className="bdg">Overený predajca</span>}</b>
            <span className="mute">{sellerKind(l.seller.type)} · {l.seller.city || l.city}</span>
            {isTrader(l.seller.type) && (l.seller.ico || l.seller.address) && <span className="mute">{[l.seller.ico && `IČO ${l.seller.ico}`, l.seller.address].filter(Boolean).join(" · ")}</span>}
            {s.seller && s.seller.ratingCount > 0 && <span><Stars value={s.seller.ratingAvg} count={s.seller.ratingCount} small /></span>}
            {l.sellerId && !STATIC_PREVIEW && <Link className="lnk seller-all" href={sellerPath(l.sellerId, l.seller.name)}>Všetky diely predajcu{more.total ? ` (${more.total + 1})` : ""} →</Link>}
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
        <p className="mute fits-note">Zoznam skladáme z údajov predajcov (vlastné auto, „pasuje aj na“ a inzeráty s rovnakým OEM číslom). Nie je to overený katalóg.</p>
      </>}

      <SellerNotice type={l.seller.type} name={l.seller.name} ico={l.seller.ico} address={l.seller.address} />
      <div className="warn">Pred nákupom porovnajte OEM číslo so starým dielom a vyžiadajte si od predajcu ďalšie fotky. Neposielajte zálohy vopred neznámym predajcom.</div>
      <ReportBox id={l.id} />

      {sameCar.length > 0 && <>
        <h2 className="sh">Ďalšie diely z toho istého auta</h2>
        <p className="mute">Rovnaké auto ({[carName(l, cat, true), l.year].filter(Boolean).join(", ")}{l.km ? `, ${l.km.toLocaleString("sk-SK")} km` : ""}) rozoberá predajca {l.seller.name}.</p>
        <div className="sim">
          {sameCar.slice(0, 6).map((x) => (
            <ListingLink key={x.id} id={x.id} name={x.name} car={carName(x, cat)} className="simc">
              <Mini x={x} cat={cat} />
            </ListingLink>
          ))}
        </div>
      </>}

      {more.items.length > 0 && <>
        <h2 className="sh">Ďalšie diely od predajcu {l.seller.name}{more.total > more.items.length ? ` (${more.total})` : ""}
          {l.sellerId && !STATIC_PREVIEW && <> <Link className="lnk sh-more" href={sellerPath(l.sellerId, l.seller.name)}>Všetky diely predajcu →</Link></>}</h2>
        <div className="sim">
          {more.items.slice(0, 3).map((x) => (
            <ListingLink key={x.id} id={x.id} name={x.name} car={carName(x, cat)} className="simc">
              <Mini x={x} cat={cat} />
            </ListingLink>
          ))}
        </div>
      </>}

      {similar.length > 0 && <>
        <h2 className="sh">Podobné inzeráty</h2>
        <div className="sim">
          {similar.map((x) => (
            <ListingLink key={x.id} id={x.id} name={x.name} car={carName(x, cat)} className="simc">
              <Mini x={x} cat={cat} />
            </ListingLink>
          ))}
        </div>
      </>}
      {!onClose && <div className={"dbar" + (bar ? " on" : "")}>
        <span><b>{price(l.price)}</b><small>{l.name}</small></span>
        <PhoneButton id={l.id} />
      </div>}
    </article>
  );
}
