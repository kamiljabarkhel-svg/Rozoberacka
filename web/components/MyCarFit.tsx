"use client";
import { useT } from "@/lib/i18n/client";
// V detaile: pasuje diel na „moje auto“? (podľa údajov predajcov a zhody OEM)
import type { Catalog, Vehicle } from "@/lib/types";
import { fitsMyCar, myCarName, useMyCar } from "@/lib/mycar";

export default function MyCarFit({ vehicles, cat }: { vehicles: Vehicle[]; cat: Catalog }) {
  const tl = useT();
  const { car } = useMyCar();
  if (!car) return null;
  const ok = fitsMyCar(vehicles, car);
  return (
    <p className={"mycar-fit " + (ok ? "yes" : "no")} role="status">
      {ok ? <>{tl("✓ Pasuje na vaše auto:")} <b>{myCarName(car, cat)}</b></>
        : <>{tl("Na vaše auto (")}<b>{myCarName(car, cat)}</b>{tl(") predajcovia tento diel neuvádzajú. Porovnajte OEM číslo so starým dielom.")}</>}
    </p>
  );
}
