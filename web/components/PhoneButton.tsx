"use client";
import { useEffect, useState } from "react";
import { revealPhone } from "@/lib/data";

// Odkryté čísla zdieľajú všetky tlačidlá toho istého inzerátu (napr. hlavné tlačidlo a lišta dole na mobile).
const known = new Map<number, string>();
const EVT = "rz-phone";

/** „Zobraziť telefón“ – číslo sa načíta až po kliknutí (v databáze cez funkciu reveal_phone). */
export default function PhoneButton({ id, className = "call" }: { id: number; className?: string }) {
  const [st, setSt] = useState<{ phone?: string; busy?: boolean; err?: string }>(() => (known.has(id) ? { phone: known.get(id) } : {}));
  useEffect(() => {
    const h = (e: Event) => { const d = (e as CustomEvent<{ id: number; phone: string }>).detail; if (d.id === id) setSt({ phone: d.phone }); };
    window.addEventListener(EVT, h);
    return () => window.removeEventListener(EVT, h);
  }, [id]);
  if (st.phone) return <a className={className} href={"tel:" + st.phone.replace(/\s/g, "")}>{st.phone}</a>;
  return (
    <button className={className} disabled={st.busy} title={st.err}
      onClick={async (e) => {
        e.preventDefault(); e.stopPropagation();
        setSt({ busy: true });
        try {
          const p = await revealPhone(id);
          if (p) { known.set(id, p); window.dispatchEvent(new CustomEvent(EVT, { detail: { id, phone: p } })); }
          setSt(p ? { phone: p } : { err: "Telefón nie je dostupný." });
        } catch (x) {
          const m = String((x as Error)?.message || "");
          setSt({ err: /Príliš veľa/.test(m) ? m.replace(/^reveal_phone: /, "") : "Telefón sa nepodarilo načítať. Skúste znova." });
        }
      }}>
      {st.busy ? "Načítavam…" : st.err ? (/Príliš veľa/.test(st.err) ? "Skúste neskôr" : "Skúsiť znova") : "Zobraziť telefón"}
    </button>
  );
}
