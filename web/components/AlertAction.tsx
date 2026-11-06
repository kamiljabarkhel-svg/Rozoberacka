"use client";
// Potvrdenie alebo zrušenie strážcu z odkazu v e-maile. Potvrdenie až po kliknutí (ochrana pred automatickými kontrolami odkazov).
import { useEffect, useState } from "react";
import Link from "next/link";
import { cancelAlert, confirmAlert } from "@/lib/data";

export default function AlertAction({ action, token }: { action: "potvrdit" | "zrusit"; token: string }) {
  const [st, setSt] = useState<"ask" | "busy" | "ok" | "none" | "err">("ask");
  const [label, setLabel] = useState(""), [err, setErr] = useState("");
  const go = async () => {
    setSt("busy");
    try {
      const l = action === "potvrdit" ? await confirmAlert(token) : await cancelAlert(token);
      if (l == null) { setSt("none"); return; }
      setLabel(l); setSt("ok");
    } catch (e) { setErr(String((e as Error).message || e)); setSt("err"); }
  };
  useEffect(() => { if (action === "zrusit") go(); }, []); // eslint-disable-line react-hooks/exhaustive-deps
  if (action === "potvrdit") return (<>
    <h1>Upozornenie na nové diely</h1>
    {st === "ask" && <><p>Kliknutím potvrdíte, že vám máme raz denne posielať nové diely pre uložené hľadanie.</p><p><button className="btn" onClick={go}>Potvrdiť upozornenie</button></p></>}
    {st === "busy" && <p className="mute">Potvrdzujem…</p>}
    {st === "ok" && <p>✓ Hotovo. Nové diely pre „<b>{label}</b>“ vám pošleme raz denne, keď pribudnú. Zrušiť sa dá odkazom v každom e-maile.</p>}
    {st === "none" && <p>Upozornenie sa nenašlo. Možno už bolo zrušené alebo nepotvrdené dlhšie ako 3 dni – zapnite ho znova pri hľadaní.</p>}
    {st === "err" && <p className="pp-err">{err}</p>}
    <p><Link href="/">Späť na hľadanie dielov</Link></p>
  </>);
  return (<>
    <h1>Zrušenie upozornenia</h1>
    {(st === "ask" || st === "busy") && <p className="mute">Ruším upozornenie…</p>}
    {st === "ok" && <p>✓ Upozornenie „<b>{label}</b>“ je zrušené a váš e-mail sme pri ňom zmazali.</p>}
    {st === "none" && <p>Upozornenie už neexistuje – nič vám posielať nebudeme.</p>}
    {st === "err" && <p className="pp-err">{err}</p>}
    <p><Link href="/">Späť na hľadanie dielov</Link></p>
  </>);
}
