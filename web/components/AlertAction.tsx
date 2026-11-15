"use client";
import { useHref, useT } from "@/lib/i18n/client";
// Potvrdenie alebo zrušenie strážcu z odkazu v e-maile. Potvrdenie až po kliknutí (ochrana pred automatickými kontrolami odkazov).
import { useEffect, useState } from "react";
import Link from "next/link";
import { cancelAlert, confirmAlert } from "@/lib/data";

export default function AlertAction({ action, token }: { action: "potvrdit" | "zrusit"; token: string }) {
  const hl = useHref();
  const tl = useT();
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
    <h1>{tl("Upozornenie na nové diely")}</h1>
    {st === "ask" && <><p>{tl("Kliknutím potvrdíte, že vám máme raz denne posielať nové diely pre uložené hľadanie.")}</p><p><button className="btn" onClick={go}>{tl("Potvrdiť upozornenie")}</button></p></>}
    {st === "busy" && <p className="mute">{tl("Potvrdzujem…")}</p>}
    {st === "ok" && <p>{tl("✓ Hotovo. Nové diely pre „")}<b>{label}</b>{tl("“ vám pošleme raz denne, keď pribudnú. Zrušiť sa dá odkazom v každom e-maile.")}</p>}
    {st === "none" && <p>{tl("Upozornenie sa nenašlo. Možno už bolo zrušené alebo nepotvrdené dlhšie ako 3 dni – zapnite ho znova pri hľadaní.")}</p>}
    {st === "err" && <p className="pp-err">{err}</p>}
    <p><Link href={hl("/")}>{tl("Späť na hľadanie dielov")}</Link></p>
  </>);
  return (<>
    <h1>{tl("Zrušenie upozornenia")}</h1>
    {(st === "ask" || st === "busy") && <p className="mute">{tl("Ruším upozornenie…")}</p>}
    {st === "ok" && <p>{tl("✓ Upozornenie „")}<b>{label}</b>{tl("“ je zrušené a váš e-mail sme pri ňom zmazali.")}</p>}
    {st === "none" && <p>{tl("Upozornenie už neexistuje – nič vám posielať nebudeme.")}</p>}
    {st === "err" && <p className="pp-err">{err}</p>}
    <p><Link href={hl("/")}>{tl("Späť na hľadanie dielov")}</Link></p>
  </>);
}
