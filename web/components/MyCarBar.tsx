"use client";
import { useT } from "@/lib/i18n/client";
// Pás „Moje auto“ nad hľadaním: uložené auto (len v tomto prehliadači) a rýchle prepnutie na diely preň.
import type { Catalog, Filters } from "@/lib/types";
import { myCarName, type MyCar } from "@/lib/mycar";

export default function MyCarBar({ car, cat, f, onUse, onAll, onSave, onForget }: {
  car: MyCar | null; cat: Catalog | null; f: Filters; onUse: () => void; onAll: () => void; onSave: () => void; onForget: () => void;
}) {
  const tl = useT();
  if (!cat) return null;
  if (!car) {
    if (f.brand == null || f.model == null) return null;
    return (
      <div className="mycar">
        <span>{tl("Hľadáte diely na svoje auto? Prehliadač si ho zapamätá a nabudúce vám hneď ukáže diely naň.")}</span>
        <button className="chip" onClick={onSave}>{tl("🚗 Uložiť ako moje auto")}</button>
      </div>
    );
  }
  const on = f.brand === car.brand && f.model === car.model && f.engine === car.engine;
  return (
    <div className={"mycar" + (on ? " on" : "")}>
      <span>{tl("🚗 Moje auto:")} <b>{myCarName(car, cat)}</b>{on && <span className="mute"> {tl("· zobrazujeme diely naň")}</span>}</span>
      <span className="mycar-a">
        {on ? <button className="lnk" onClick={onAll}>{tl("Všetky autá")}</button> : <button className="chip" onClick={onUse}>{tl("Diely na moje auto")}</button>}
        <button className="lnk" onClick={onForget}>{tl("Zabudnúť auto")}</button>
      </span>
    </div>
  );
}
