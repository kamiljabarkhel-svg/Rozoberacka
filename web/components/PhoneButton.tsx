"use client";
import { useState } from "react";
import { revealPhone } from "@/lib/data";

/** „Zobraziť telefón“ – číslo sa načíta až po kliknutí (v databáze cez funkciu reveal_phone). */
export default function PhoneButton({ id }: { id: number }) {
  const [st, setSt] = useState<{ phone?: string; busy?: boolean; err?: string }>({});
  if (st.phone) return <a className="call" href={"tel:" + st.phone.replace(/\s/g, "")}>{st.phone}</a>;
  return (
    <button className="call" disabled={st.busy} title={st.err}
      onClick={async (e) => {
        e.preventDefault(); e.stopPropagation();
        setSt({ busy: true });
        try {
          const p = await revealPhone(id);
          setSt(p ? { phone: p } : { err: "Telefón nie je dostupný." });
        } catch {
          setSt({ err: "Telefón sa nepodarilo načítať. Skúste znova." });
        }
      }}>
      {st.busy ? "Načítavam…" : st.err ? "Skúsiť znova" : "Zobraziť telefón"}
    </button>
  );
}
