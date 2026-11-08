// Karta havarovaného / nepojazdného vozidla v zozname.
import Link from "next/link";
import type { CarListing, Catalog } from "@/lib/types";
import { VEHICLE_TYPES } from "@/lib/types";
import { price } from "@/lib/format";
import { vehiclePath, vehicleTitle } from "@/lib/seo";

export default function CarCard({ c, cat }: { c: CarListing; cat: Catalog }) {
  const title = vehicleTitle(c, cat);
  const eng = c.engineId ? cat.engines.find((e) => e.id === c.engineId)?.name : "";
  return (
    <article className="card carcard">
      <Link href={vehiclePath(c.id, title, c.condition)} className="carlink">
        <div className="ph">
          {c.thumbs.length ? <img loading="lazy" alt={title} src={c.thumbs[0]} /> : <div className="nop"><span>Bez fotky</span></div>}
          {c.photos.length > 1 && <span className="pc">{c.photos.length} fotiek</span>}
        </div>
        <div className="bd">
          <h3>{title}</h3>
          <p className="price">{price(c.price)}</p>
          <p className="carcond"><b>{c.condition}</b>{c.damage.length > 0 && <> · poškodené: {c.damage.join(", ").toLowerCase()}</>}</p>
          <p className="mute">{[VEHICLE_TYPES.find((t) => t.id === c.vehicleType)?.short, eng, c.km != null && `${c.km.toLocaleString("sk-SK")} km`, c.fuel, c.docs.startsWith("Bez") ? "bez dokladov" : "s dokladmi"].filter(Boolean).join(" · ")}</p>
          <p className="mute">{c.city}{c.parts > 0 && <> · <b>{c.parts}</b> dielov z vozidla</>}</p>
        </div>
      </Link>
    </article>
  );
}
