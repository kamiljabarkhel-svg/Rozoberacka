"use client";
// Príspevky témy, odpoveď, úprava a zmazanie vlastného príspevku, nahlásenie (DSA čl. 16).
// Server pošle verejné príspevky (pre Google); prihlásenému sa doplnia jeho čakajúce a skryté príspevky.
import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { FORUM_DEMO, FORUM_REPORT_REASONS, fmtForumDate, forumReport, sectionPath, type ForumMe, type ForumPost, type ForumThread } from "@/lib/forum";
import { forumDelete, forumEdit, forumEnsureProfile, forumRefresh, forumReply, forumSession, forumThreadMine } from "@/lib/forumAuth";
import { sellerPath } from "@/lib/seo";
import ConfirmDelete from "../seller/ConfirmDelete";

export default function ForumThreadView({ initial }: { initial: ForumThread }) {
  const router = useRouter();
  const [t, setT] = useState(initial);
  const [st, setSt] = useState<"load" | "out" | "nonick" | "in">("load");
  const [me, setMe] = useState<ForumMe>(null);

  const reload = useCallback(async () => { const x = await forumThreadMine(initial.id).catch(() => null); if (x) setT(x); }, [initial.id]);
  useEffect(() => {
    forumSession().then(async (s) => {
      if (!s) return setSt("out");
      const m = await forumEnsureProfile(s).catch(() => null);
      setMe(m); setSt(m ? "in" : "nonick");
      await reload();
    }).catch(() => setSt("out"));
  }, [reload]);

  return (
    <>
      <p className="mute fo-meta">Založil(a) <b>{t.nick}</b> {fmtForumDate(t.created_at)} · <Link href={sectionPath(t.section)}>späť na zoznam tém</Link>{t.locked && " · téma je uzamknutá"}</p>
      <ol className="fo-posts">{t.posts.map((p, i) => <Post key={p.id} p={p} first={i === 0} onChanged={async (deletedThread) => { forumRefresh(); if (deletedThread) router.push(sectionPath(t.section)); else await reload(); }} />)}</ol>
      <Reply thread={t} st={st} me={me} onSent={async () => { forumRefresh(); await reload(); }} />
    </>
  );
}

function Post({ p, first, onChanged }: { p: ForumPost; first: boolean; onChanged: (deletedThread: boolean) => Promise<void> }) {
  const [mode, setMode] = useState<"" | "edit" | "del" | "rep">("");
  const [body, setBody] = useState(p.body), [err, setErr] = useState(""), [busy, setBusy] = useState(false);
  const save = async () => {
    if (body.trim().length < 2) return setErr("Napíšte text príspevku.");
    setBusy(true); setErr("");
    try { await forumEdit(p.id, body); setMode(""); await onChanged(false); } catch (x) { setErr(String((x as Error).message || x)); } finally { setBusy(false); }
  };
  return (
    <li id={"p" + p.id} className={"fo-post" + (p.status !== "visible" ? " is-" + p.status : "")}>
      <header className="fo-post-h">
        <b>{p.nick}</b>
        {p.seller && (p.seller_id ? <Link className="fo-seller" href={sellerPath(p.seller_id, p.nick)}>Predajca</Link> : <span className="fo-seller">Predajca</span>)}
        <span className="mute">{fmtForumDate(p.created_at)}{p.edited_at && " · upravené"}</span>
      </header>
      {p.status === "pending" && <p className="fo-flag">Čaká na schválenie správcom – zatiaľ ho vidíte len vy.</p>}
      {p.status === "hidden" && <p className="fo-flag bad">Príspevok skryl správca (rozhodol človek). Dôvod: {p.hidden_reason || "porušenie pravidiel fóra"}. Ak nesúhlasíte, napíšte nám – postup je v <Link href="/obchodne-podmienky#forum">podmienkach</Link>.</p>}
      {mode === "edit"
        ? <div className="pp-form fo-form"><textarea value={body} onChange={(e) => setBody(e.target.value)} maxLength={5000} rows={6} aria-label="Upraviť príspevok" />
            {err && <p className="pp-err">{err}</p>}
            <div className="fo-form-a"><button className="btn" disabled={busy} onClick={save}>{busy ? "Ukladám…" : "Uložiť"}</button><button className="lnk" onClick={() => { setMode(""); setBody(p.body); }}>Zrušiť</button></div></div>
        : <div className="fo-body">{p.body}</div>}
      {mode === "del" && <ConfirmDelete title={first ? "Zmazať celú tému?" : "Zmazať príspevok?"} note={first ? "Je to prvý príspevok – zmaže sa celá téma aj s odpoveďami ostatných." : "Príspevok sa zmaže natrvalo."}
        onConfirm={async () => { try { await forumDelete(p.id); await onChanged(first); } catch (x) { setErr(String((x as Error).message || x)); setMode(""); } }} onCancel={() => setMode("")} />}
      {mode === "rep" && <ReportForm post={p.id} onClose={() => setMode("")} />}
      {mode === "" && <div className="fo-post-a">
        {p.mine && p.editable && <button className="lnk" onClick={() => setMode("edit")}>Upraviť</button>}
        {p.mine && <button className="lnk" onClick={() => setMode("del")}>Zmazať</button>}
        {!p.mine && p.status === "visible" && <button className="lnk rep-open" onClick={() => setMode("rep")}>⚑ Nahlásiť</button>}
        {err && <span className="pp-err">{err}</span>}
      </div>}
    </li>
  );
}

function ReportForm({ post, onClose }: { post: number; onClose: () => void }) {
  const [reason, setReason] = useState(""), [note, setNote] = useState(""), [contact, setContact] = useState(""), [good, setGood] = useState(false);
  const [s, setS] = useState<{ busy?: boolean; ok?: boolean; err?: string }>({});
  if (s.ok) return <p className="mute rep-ok" role="status">Ďakujeme, nahlásenie sme prijali. Správca príspevok skontroluje; ak ste zadali kontakt, oznámime vám, ako sme rozhodli.</p>;
  const send = async () => {
    if (!reason) return setS({ err: "Vyberte dôvod." });
    if (reason === "Iné" && note.trim().length < 10) return setS({ err: "Pri dôvode „Iné“ napíšte, čo je zle." });
    if (!good) return setS({ err: "Potvrďte, že údaje v nahlásení sú podľa vášho vedomia pravdivé." });
    setS({ busy: true });
    try { await forumReport(post, reason, note, contact); setS({ ok: true }); } catch (x) { setS({ err: String((x as Error).message || x) }); }
  };
  return (
    <div className="msgbox rep">
      <b>Nahlásiť príspevok</b>
      <label>Dôvod<select value={reason} onChange={(e) => setReason(e.target.value)}><option value="">Vyberte…</option>{FORUM_REPORT_REASONS.map((r) => <option key={r}>{r}</option>)}</select></label>
      <label>Prečo je príspevok v rozpore so zákonom alebo s pravidlami?<textarea value={note} maxLength={500} onChange={(e) => setNote(e.target.value)} /></label>
      <label>Vaše meno a e-mail, ak chcete odpoveď (nepovinné)<input value={contact} maxLength={120} onChange={(e) => setContact(e.target.value)} /></label>
      <label className="pp-chk"><input type="checkbox" checked={good} onChange={(e) => setGood(e.target.checked)} /> <span>Vyhlasujem v dobrej viere, že údaje v nahlásení sú podľa môjho vedomia presné a úplné.</span></label>
      <div className="rep-a"><button className="call" disabled={s.busy} onClick={send}>{s.busy ? "Odosielam…" : "Odoslať nahlásenie"}</button><button className="lnk" onClick={onClose}>Zrušiť</button></div>
      {s.err && <p className="ferr2" role="alert">{s.err}</p>}
      <p className="mute">Nahlásenie vidí len správca portálu, autor príspevku nie. <a href="/ochrana-osobnych-udajov" target="_blank">Ochrana osobných údajov</a></p>
      {FORUM_DEMO && <p className="mute">Ukážkový režim: nahlásenie sa nikam neodošle.</p>}
    </div>
  );
}

function Reply({ thread, st, me, onSent }: { thread: ForumThread; st: string; me: ForumMe; onSent: () => Promise<void> }) {
  const [body, setBody] = useState(""), [err, setErr] = useState(""), [busy, setBusy] = useState(false), [msg, setMsg] = useState("");
  const back = "/forum/ucet?spat=" + encodeURIComponent(typeof window !== "undefined" ? window.location.pathname : "/forum");
  if (thread.locked) return <p className="mute fo-reply-note">Téma je uzamknutá, nedá sa do nej písať.</p>;
  if (FORUM_DEMO) return <p className="mute fo-reply-note">Ukážkový režim – odpovedať sa dá po pripojení databázy.</p>;
  if (st === "load") return null;
  if (st === "out") return <div className="fo-reply-note"><Link className="btn" href={back}>Prihlásiť sa a odpovedať</Link><span className="mute">Účet do fóra je zadarmo, stačí e-mail a prezývka.</span></div>;
  if (st === "nonick") return <div className="fo-reply-note"><Link className="btn" href={back}>Zvoliť prezývku a odpovedať</Link></div>;
  if (me?.banned) return <p className="mute fo-reply-note">Váš účet vo fóre je zablokovaný.</p>;
  const send = async (e: React.FormEvent) => {
    e.preventDefault(); setErr(""); setMsg("");
    if (body.trim().length < 2) return setErr("Napíšte text odpovede.");
    setBusy(true);
    try { await forumReply(thread.id, body); setBody(""); if (!me?.trusted) setMsg("Odpoveď čaká na schválenie správcom – zatiaľ ju vidíte len vy."); await onSent(); }
    catch (x) { setErr(String((x as Error).message || x)); } finally { setBusy(false); }
  };
  return (
    <form className="pp-form fo-form fo-reply" onSubmit={send} noValidate>
      <h2>Odpovedať</h2>
      <label><span>Píšete ako <b>{me?.nick}</b></span><textarea value={body} onChange={(e) => setBody(e.target.value)} maxLength={5000} rows={5} aria-label="Text odpovede" /></label>
      {err && <p className="pp-err" role="alert">{err}</p>}
      {msg && <p className="pp-ok" role="status">{msg}</p>}
      <div className="fo-form-a"><button className="btn" disabled={busy}>{busy ? "Odosielam…" : "Odoslať odpoveď"}</button></div>
      <p className="mute small">Nepíšte telefónne čísla ani osobné údaje iných ľudí. <Link href="/forum/pravidla" target="_blank">Pravidlá fóra</Link></p>
    </form>
  );
}
