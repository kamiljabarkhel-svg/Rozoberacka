// Riadok havarovaného / nepojazdného vozidla v zozname (široký ako v autobazári: fotka, údaje, cena).
import Link from "next/link";
import type { CarListing, Catalog } from "@/lib/types";
import { VEHICLE_TYPES } from "@/lib/types";
import { price } from "@/lib/format";
import { vehiclePath, vehicleTitle } from "@/lib/seo";

export default function CarCard({ c, cat }: { c: CarListing; cat: Catalog }) {
  const title = vehicleTitle(c, cat);
  const eng = c.engineId ? cat.engines.find((e) => e.id === c.engineId)?.name : "";
  const facts = [
    String(c.year), c.km != null && `${c.km.toLocaleString("sk-SK")} km`, eng, c.fuel, c.gearbox,
    c.starts === true ? "naštartuje" : c.starts === false ? "nenaštartuje" : "",
  ].filter(Boolean) as string[];
  return (
    <article className="carcard">
      <Link href={vehiclePath(c.id, title, c.condition)} className="carlink">
        <div className="ph">
          {c.thumbs.length ? <img loading="lazy" alt={title} src={c.thumbs[0]} /> : <div className="nop"><span>Bez fotky</span></div>}
          {c.photos.length > 1 && <span className="pc">{c.photos.length} fotiek</span>}
        </div>
        <div className="bd">
          <h3>{title.split(",")[0]}{eng ? <span className="mute"> {eng}</span> : null}</h3>
          <p className="cc-cond"><span className="cc-badge">{c.condition}</span>{c.vehicleType !== "osobne" && <span className="tg">{VEHICLE_TYPES.find((t) => t.id === c.vehicleType)?.short}</span>}</p>
          <ul className="cc-facts">{facts.map((x) => <li key={x}>{x}</li>)}</ul>
          {c.damage.length > 0 && <p className="cc-dmg">Poškodené: {c.damage.join(", ").toLowerCase()}</p>}
          <p className="mute cc-docs">{c.docs}{c.parts > 0 && <> · <b>{c.parts}</b> dielov z vozidla aj samostatne</>}</p>
        </div>
        <div className="cc-side">
          <p className="price">{price(c.price)}</p>
          <p className="mute">{c.city}</p>
          <span className="cc-more">Pozrieť vozidlo</span>
        </div>
      </Link>
    </article>
  );
}
