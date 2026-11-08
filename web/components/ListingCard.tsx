"use client";
import { useRouter } from "next/navigation";
import { specsLine, type Catalog, type Listing } from "@/lib/types";
import { condDot, photosText, price } from "@/lib/format";
import { STATIC_PREVIEW, listingHref } from "@/lib/paths";
import { Icon, catIcon } from "./Icons";
import PhoneButton from "./PhoneButton";
import ListingLink from "./ListingLink";
import Tags from "./Tags";
import { carName } from "@/lib/seo";

export function carText(l: Listing, cat: Catalog): string {
  const b = cat.brands.find((x) => x.id === l.brandId)?.name || "";
  const m = cat.models.find((x) => x.id === l.modelId)?.name || "";
  const e = cat.engines.find((x) => x.id === l.engineId)?.name || "";
  return [b, m, e].filter(Boolean).join(" ") + (l.year ? ", " + l.year : "");
}

export default function ListingCard({ l, cat, fav, onFav }: { l: Listing; cat: Catalog; fav: boolean; onFav: (id: number) => void }) {
  const router = useRouter();
  const n = l.photos.length;
  const href = listingHref(l.id, l.name, carName(l, cat));
  return (
    <article className={"card" + (l.top ? " is-top" : "")} onClick={(e) => {
      if ((e.target as HTMLElement).closest("button,a")) return;
      if (STATIC_PREVIEW) window.location.hash = href.slice(1);
      else router.push(href);
    }}>
      <div className="ph">
        {n ? <img loading="lazy" alt={l.name} src={l.thumbs[0]} onError={(e) => { if (e.currentTarget.src !== l.photos[0]) e.currentTarget.src = l.photos[0]; }} /> : <div className="nop"><Icon id={catIcon(l.categoryId)} /><span>Bez fotky</span></div>}
        {l.top && <span className="toptag">TOP</span>}
        {n > 1 && <span className="pc">{photosText(n)}</span>}
        <button className="fav" aria-label={fav ? "Odobrať z obľúbených" : "Pridať do obľúbených"} aria-pressed={fav} onClick={() => onFav(l.id)}>{fav ? "♥" : "♡"}</button>
      </div>
      <div className="cb">
        <h2><ListingLink id={l.id} name={l.name} car={carName(l, cat)}>{l.name}</ListingLink></h2>
        <p className="car">{carText(l, cat)}</p>
        <p className="cardoem">{l.oem ? <>Číslo dielu: <b>{l.oem}</b></> : <span className="mute">Číslo dielu neuvedené</span>}</p>
        {specsLine(l.specs) && <p className="specs-line">{specsLine(l.specs)}</p>}
        <Tags l={l} />
        <div className="meta">
          <span className="cond"><i className={"dot " + condDot(l.condition)} />{l.condition}</span>
          {l.city && <span>{l.city}</span>}
          {l.warranty && l.warranty !== "Bez záruky" && l.seller.type === "Firma" && <span>Záruka {l.warranty}</span>}
          {l.seller.type !== "Firma" && <span>Súkromná osoba</span>}
        </div>
      </div>
      <div className="side">
        <span className="price">{price(l.price)}</span>
        <PhoneButton id={l.id} />
      </div>
    </article>
  );
}
