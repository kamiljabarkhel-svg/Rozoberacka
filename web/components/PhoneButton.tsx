"use client";
import { useEffect, useState } from "react";
import { revealCarPhone, revealPhone } from "@/lib/data";
import { useT } from "@/lib/i18n/client";

// Odkryté čísla zdieľajú všetky tlačidlá toho istého inzerátu (napr. hlavné tlačidlo a lišta dole na mobile).
const known = new Map<string, string>();
const EVT = "rz-phone";

/** „Zobraziť telefón“ – číslo sa načíta až po kliknutí (v databáze cez funkciu reveal_phone). */
export default function PhoneButton({ id, className = "call", car = false }: { id: number; className?: string; car?: boolean }) {
  const tl = useT();
  const key = (car ? "a" : "") + id;
  const [st, setSt] = useState<{ phone?: string; busy?: boolean; err?: string }>(() => (known.has(key) ? { phone: known.get(key) } : {}));
  useEffect(() => {
    const h = (e: Event) => { const d = (e as CustomEvent<{ id: string; phone: string }>).detail; if (d.id === key) setSt({ phone: d.phone }); };
    window.addEventListener(EVT, h);
    return () => window.removeEventListener(EVT, h);
  }, [key]);
  if (st.phone) return <a className={className} href={"tel:" + st.phone.replace(/\s/g, "")}>{st.phone}</a>;
  return (
    <button className={className} disabled={st.busy} title={st.err}
      onClick={async (e) => {
        e.preventDefault(); e.stopPropagation();
        setSt({ busy: true });
        try {
          const p = car ? await revealCarPhone(id) : await revealPhone(id);
          if (p) { known.set(key, p); window.dispatchEvent(new CustomEvent(EVT, { detail: { id: key, phone: p } })); }
          setSt(p ? { phone: p } : { err: tl("Telefón nie je dostupný.") });
        } catch (x) {
          const m = String((x as Error)?.message || "");
          setSt({ err: /Príliš veľa/.test(m) ? m.replace(/^reveal_(car_)?phone: /, "") : tl("Telefón sa nepodarilo načítať. Skúste znova.") });
        }
      }}>
      {st.busy ? tl("Načítavam…") : st.err ? (/Príliš veľa/.test(st.err) ? tl("Skúste neskôr") : tl("Skúsiť znova")) : tl("Zobraziť telefón")}
    </button>
  );
}
