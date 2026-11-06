"use client";
// Tlačidlo „Odfotiť“: prečíta OEM číslo alebo VIN z fotky priamo v telefóne a ponúkne nájdené čísla.
import { useRef, useState } from "react";
import { oemCandidates, readText, vinCandidates } from "@/lib/ocr";

export default function ScanText({ kind, onResult }: { kind: "oem" | "vin"; onResult: (v: string) => void }) {
  const inp = useRef<HTMLInputElement>(null);
  const [st, setSt] = useState<{ s: "idle" } | { s: "busy"; pct: number } | { s: "done"; list: string[]; raw: string } | { s: "err"; msg: string }>({ s: "idle" });
  const label = kind === "vin" ? "VIN" : "číslo dielu";

  const onFile = async (f: File | undefined) => {
    if (!f) return;
    setSt({ s: "busy", pct: 0 });
    try {
      const text = await readText(f, (pct) => setSt({ s: "busy", pct }));
      const list = kind === "vin" ? vinCandidates(text) : oemCandidates(text);
      if (list.length === 1 && kind === "vin") { onResult(list[0]); setSt({ s: "idle" }); return; }
      setSt({ s: "done", list, raw: text.replace(/\s+/g, " ").trim().slice(0, 80) });
    } catch (e) {
      setSt({ s: "err", msg: String((e as Error)?.message || e) });
    } finally { if (inp.current) inp.current.value = ""; }
  };

  return (
    <span className="scan">
      <button type="button" className="scan-b" aria-label={`Odfotiť ${label}`} title={`Odfotiť ${label} – text sa prečíta v telefóne, fotka sa nikam neposiela`}
        disabled={st.s === "busy"} onClick={() => inp.current?.click()}>
        <svg viewBox="0 0 24 24" width="20" height="20" aria-hidden><path fill="currentColor" d="M9 4 7.2 6H4a2 2 0 0 0-2 2v10a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V8a2 2 0 0 0-2-2h-3.2L15 4H9zm3 4.5a4.5 4.5 0 1 1 0 9 4.5 4.5 0 0 1 0-9zm0 2a2.5 2.5 0 1 0 0 5 2.5 2.5 0 0 0 0-5z" /></svg>
      </button>
      <input ref={inp} type="file" accept="image/*" capture="environment" hidden onChange={(e) => onFile(e.target.files?.[0])} />
      {st.s !== "idle" && (
        <span className="scan-r" role="status">
          {st.s === "busy" && <>Čítam {label} z fotky… {st.pct ? st.pct + " %" : ""}</>}
          {st.s === "err" && <>Fotku sa nepodarilo prečítať. <button type="button" className="lnk" onClick={() => setSt({ s: "idle" })}>Zavrieť</button></>}
          {st.s === "done" && (st.list.length
            ? <>Nájdené – klepnite na správne: {st.list.map((v) => <button type="button" key={v} className="chip" onClick={() => { onResult(v); setSt({ s: "idle" }); }}>{v}</button>)}
                <button type="button" className="lnk" onClick={() => setSt({ s: "idle" })}>Zavrieť</button></>
            : <>Na fotke sme {label} nenašli{st.raw ? <> (prečítané: „{st.raw}“)</> : null}. Odfoťte ho zblízka a ostro, alebo ho opíšte. <button type="button" className="lnk" onClick={() => setSt({ s: "idle" })}>Zavrieť</button></>)}
        </span>
      )}
    </span>
  );
}
