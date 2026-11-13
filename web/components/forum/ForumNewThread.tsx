"use client";
// Tlačidlo „Nová téma“ a formulár (nadpis + text). Bez prihlásenia ponúkne prihlásenie alebo registráciu do fóra.
import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { FORUM_DEMO, threadPath, type ForumMe } from "@/lib/forum";
import { forumEnsureProfile, forumNewThread, forumRefresh, forumSession } from "@/lib/forumAuth";

export default function ForumNewThread({ section, sectionName }: { section: string; sectionName: string }) {
  const router = useRouter();
  const [st, setSt] = useState<"load" | "out" | "nonick" | "in">("load");
  const [me, setMe] = useState<ForumMe>(null);
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState(""), [body, setBody] = useState("");
  const [busy, setBusy] = useState(false), [err, setErr] = useState(""), [bad, setBad] = useState(""), [done, setDone] = useState("");

  useEffect(() => {
    forumSession().then(async (s) => {
      if (!s) return setSt("out");
      const m = await forumEnsureProfile(s).catch(() => null);
      setMe(m); setSt(m ? "in" : "nonick");
    }).catch(() => setSt("out"));
  }, []);

  const back = "/forum/ucet?spat=" + encodeURIComponent("/forum/" + section);
  if (st === "load") return <div className="fo-new"><button className="btn" disabled>Nová téma</button></div>;
  if (FORUM_DEMO) return <div className="fo-new"><button className="btn" disabled>Nová téma</button><span className="mute">Ukážkový režim – písanie začne fungovať po pripojení databázy.</span></div>;
  if (st === "out") return <div className="fo-new"><Link className="btn" href={back}>Nová téma</Link><span className="mute">Na písanie sa prihláste alebo si vytvorte účet do fóra (zadarmo, stačí e-mail). Čítať môžete bez účtu.</span></div>;
  if (st === "nonick") return <div className="fo-new"><Link className="btn" href={back}>Nová téma</Link><span className="mute">Najprv si vo svojom účte zvoľte prezývku.</span></div>;
  if (me?.banned) return <div className="fo-new"><span className="mute">Váš účet vo fóre je zablokovaný.</span></div>;
  if (done) return <div className="fo-new"><p className="pp-ok" role="status">{done}</p></div>;
  if (!open) return <div className="fo-new"><button className="btn" onClick={() => setOpen(true)}>Nová téma</button><span className="mute">Píšete ako <b>{me?.nick}</b>.</span></div>;

  const fe = (k: string) => (bad === k && err ? <small className="f-err" role="alert">{err}</small> : null);
  const send = async (e: React.FormEvent) => {
    e.preventDefault(); setErr(""); setBad("");
    if (title.trim().length < 5) { setErr("Napíšte nadpis aspoň s 5 znakmi – napr. „Octavia II 1.9 TDI – klepe pri štarte“."); setBad("title"); return; }
    if (body.trim().length < 10) { setErr("Opíšte problém aspoň pár slovami (model, rok, motor, čo sa deje)."); setBad("body"); return; }
    setBusy(true);
    try {
      const id = await forumNewThread(section, title, body);
      forumRefresh();
      if (me?.trusted) router.push(threadPath(section, id, title.trim()));
      else setDone("Ďakujeme, téma bola odoslaná. Prvé príspevky nových používateľov schvaľuje správca – zvyčajne do niekoľkých hodín. Stav uvidíte v „Môj účet vo fóre“.");
    } catch (x) { setErr(String((x as Error).message || x)); }
    finally { setBusy(false); }
  };
  return (
    <form className="pp-form fo-form" onSubmit={send} noValidate>
      <h2>Nová téma v sekcii {sectionName}</h2>
      <label className={bad === "title" ? "bad" : ""}><span>Nadpis <em className="req">*</em></span>
        <input value={title} onChange={(e) => setTitle(e.target.value)} maxLength={140} placeholder="napr. Octavia II 1.9 TDI – klepe pri studenom štarte" aria-invalid={bad === "title"} />{fe("title")}</label>
      <label className={bad === "body" ? "bad" : ""}><span>Text <em className="req">*</em> <small className="mute">model, rok, motor, číslo dielu, čo ste už skúšali</small></span>
        <textarea value={body} onChange={(e) => setBody(e.target.value)} maxLength={5000} rows={7} aria-invalid={bad === "body"} />{fe("body")}</label>
      {err && !bad && <p className="pp-err" role="alert">{err}</p>}
      {!me?.trusted && <p className="mute small">Prvé 3 príspevky nových používateľov skontroluje správca, potom sa zobrazujú hneď.</p>}
      <div className="fo-form-a"><button className="btn" disabled={busy}>{busy ? "Odosielam…" : "Zverejniť tému"}</button><button type="button" className="lnk" onClick={() => setOpen(false)}>Zrušiť</button></div>
      <p className="mute small">Nepíšte telefónne čísla ani osobné údaje iných ľudí. <Link href="/forum/pravidla" target="_blank">Pravidlá fóra</Link></p>
    </form>
  );
}
