"use client";
// Hodnotenie predajcu kupujúcim (len z jeho súkromnej stránky dopytu, len predajca, ktorý poslal ponuku).
import { useState } from "react";
import { rateSeller } from "@/lib/data";

export default function RateSeller({ token, sellerId, seller, stars, review, onDone }: { token: string; sellerId: string; seller: string; stars: number | null; review: string; onDone: () => void }) {
  const [open, setOpen] = useState(false);
  const [v, setV] = useState(stars || 0), [t, setT] = useState(review);
  const [busy, setBusy] = useState(false), [err, setErr] = useState("");
  if (!open) return (
    <button className="lnk" onClick={() => setOpen(true)}>{stars ? `Vaše hodnotenie: ${"★".repeat(stars)} – zmeniť` : "Ohodnotiť predajcu"}</button>
  );
  return (
    <div className="rate">
      <span className="rate-s" role="radiogroup" aria-label={`Hodnotenie predajcu ${seller}`}>
        {[1, 2, 3, 4, 5].map((k) => (
          <button key={k} type="button" role="radio" aria-checked={v === k} aria-label={`${k} z 5`} className={k <= v ? "on" : ""} onClick={() => setV(k)}>★</button>
        ))}
      </span>
      <textarea value={t} maxLength={500} rows={2} placeholder="Ako prebehol nákup? (nepovinné, zobrazí sa s vaším krstným menom)" onChange={(e) => setT(e.target.value)} />
      {err && <p className="pp-err">{err}</p>}
      <span className="rate-a">
        <button className="btn2" disabled={!v || busy} onClick={async () => {
          setBusy(true); setErr("");
          try { await rateSeller(token, sellerId, v, t); setOpen(false); onDone(); } catch (e) { setErr(String((e as Error).message || e)); } finally { setBusy(false); }
        }}>{busy ? "Ukladám…" : "Uložiť hodnotenie"}</button>
        <button className="lnk" onClick={() => setOpen(false)}>Zrušiť</button>
      </span>
      <span className="mute small">Hodnotenie uvidia všetci na stránke predajcu. Píšte pravdivo a vecne, bez osobných údajov.</span>
    </div>
  );
}
