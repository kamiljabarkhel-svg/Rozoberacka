"use client";
// Konverzácia kupujúceho s predajcom cez tajný odkaz: história správ a odpoveď. E-maily strán sa nezobrazujú.
import { useEffect, useState } from "react";
import Link from "next/link";
import { getThread, threadReply, type Thread } from "@/lib/data";
import { listingPath } from "@/lib/seo";

const when = (d: string) => new Date(d).toLocaleString("sk-SK", { dateStyle: "medium", timeStyle: "short" });

export default function ThreadView({ token }: { token: string }) {
  const [t, setT] = useState<Thread | null | undefined>(undefined);
  const [err, setErr] = useState(""), [text, setText] = useState(""), [busy, setBusy] = useState(false), [sent, setSent] = useState(false);
  const load = () => getThread(token).then(setT).catch((e) => { setErr(String(e?.message || e)); setT(null); });
  useEffect(() => { load(); }, [token]); // eslint-disable-line react-hooks/exhaustive-deps

  if (t === undefined) return <p className="mute">Načítavam konverzáciu…</p>;
  if (!t) return <div className="empty"><h1>Konverzácia sa nenašla</h1><p>Odkaz je neplatný alebo konverzácia už bola zmazaná (uchovávame ju 12 mesiacov od poslednej správy).</p>{err && <p className="pp-err">{err}</p>}<p><Link href="/">Hľadať diely</Link></p></div>;

  const sellerAnswered = t.replies.some((r) => r.author === "seller");
  async function send() {
    if (text.trim().length < 2) return;
    setBusy(true); setErr("");
    try { await threadReply(token, text.trim()); setText(""); setSent(true); await load(); }
    catch (e) { setErr(String((e as Error).message || e)); }
    finally { setBusy(false); }
  }
  return (
    <div className="thr">
      <h1>Konverzácia s predajcom {t.sellerName}</h1>
      <p className="mute">K inzerátu: {t.listingId && t.listingActive ? <Link href={listingPath(t.listingId, t.listingName)}>{t.listingName}</Link> : <>{t.listingName || "inzerát už nie je zverejnený"}</>}{t.sellerCity ? ` · ${t.sellerCity}` : ""}</p>
      <ol className="thr-list">
        <li className="me"><span className="mute">Vy ({t.buyerName}) · {when(t.createdAt)}</span><p>{t.body}</p></li>
        {t.replies.map((r, i) => <li key={i} className={r.author === "buyer" ? "me" : "them"}><span className="mute">{r.author === "buyer" ? "Vy" : t.sellerName} · {when(r.createdAt)}</span><p>{r.body}</p></li>)}
      </ol>
      {sellerAnswered ? <div className="msgbox thr-reply">
        <label>Vaša odpoveď<textarea rows={4} maxLength={2000} value={text} onChange={(e) => { setText(e.target.value); setSent(false); }} placeholder="Napíšte predajcovi…" /></label>
        <button className="call" disabled={busy || text.trim().length < 2} onClick={send}>{busy ? "Odosielam…" : "Odoslať"}</button>
        {sent && <p className="mute" role="status">Odoslané. Predajca dostane upozornenie a odpovie vám e-mailom.</p>}
        {err && <p className="ferr2" role="alert">{err}</p>}
      </div> : <p className="warn">Predajca vám zatiaľ neodpovedal. Keď odpíše, príde vám e-mail.</p>}
      <p className="mute thr-note">Tento odkaz je len váš – neposielajte ho ďalej. Predajca nevidí váš e-mail a vy nevidíte jeho. Portál je len inzertný: neposielajte zálohy vopred neznámym predajcom a dohodnite si osobné odovzdanie alebo platbu na dobierku. Konverzáciu uchovávame 12 mesiacov od poslednej správy. <Link href="/ochrana-osobnych-udajov">Ochrana osobných údajov</Link></p>
    </div>
  );
}
