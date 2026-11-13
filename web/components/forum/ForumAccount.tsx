"use client";
// Účet vo fóre: prihlásenie, registrácia (prezývka + e-mail + heslo), zabudnuté heslo, prezývka, moje príspevky,
// stiahnutie údajov a zrušenie účtu. Predajca sa prihlási svojím účtom predajcu.
import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type { Session } from "@supabase/supabase-js";
import { FORUM_DEMO, fmtForumDate, threadPath, type ForumMe, type MyForumPost } from "@/lib/forum";
import { forumChangePassword, forumDeleteAccount, forumEnsureProfile, forumExport, forumJoin, forumMe, forumMyPosts, forumResetPassword,
  forumSession, forumSignIn, forumSignOut, forumSignUp, isForumOnly } from "@/lib/forumAuth";
import { download } from "@/lib/csvExport";
import ConfirmDelete from "../seller/ConfirmDelete";

type Mode = "in" | "up" | "reset";
const NICK_RE = /^[0-9A-Za-zÁÄČĎÉÍĹĽŇÓÔŔŠŤÚÝŽáäčďéíĺľňóôŕšťúýž_. -]{3,30}$/;
const ST: Record<string, string> = { visible: "Zverejnený", pending: "Čaká na schválenie", hidden: "Skrytý správcom" };

export default function ForumAccount() {
  const router = useRouter();
  const [session, setSession] = useState<Session | null | undefined>(undefined);
  const [me, setMe] = useState<ForumMe>(null);
  const [posts, setPosts] = useState<MyForumPost[]>([]);
  const [back, setBack] = useState(""), [pwMode, setPwMode] = useState(false);

  const load = async (s: Session | null) => {
    setSession(s);
    if (!s) return;
    const m = await forumEnsureProfile(s).catch(() => null);
    setMe(m);
    if (m) setPosts(await forumMyPosts().catch(() => []));
  };
  useEffect(() => {
    const q = new URLSearchParams(window.location.search);
    const b = q.get("spat") || ""; if (b.startsWith("/forum")) setBack(b);
    setPwMode(q.get("heslo") === "1");
    forumSession().then(load).catch(() => setSession(null));
  }, []);

  if (FORUM_DEMO) return <section className="pp-auth"><h1>Účet vo fóre</h1><p className="mute">Ukážková verzia bez databázy – prihlásenie začne fungovať po pripojení Supabase.</p></section>;
  if (session === undefined) return <p className="mute">Načítavam…</p>;
  if (!session) return <AuthForm onIn={async () => { const s = await forumSession(); await load(s); if (back) router.push(back); }} />;
  if (pwMode) return <NewPassword onDone={() => setPwMode(false)} />;
  if (!me) return <NickForm session={session} onDone={async () => { const m = await forumMe(); setMe(m); if (back) router.push(back); }} />;
  return <Profile session={session} me={me} posts={posts} back={back} onOut={async () => { await forumSignOut(); setSession(null); setMe(null); }} />;
}

function AuthForm({ onIn }: { onIn: () => Promise<void> }) {
  const [mode, setMode] = useState<Mode>("in");
  const [nick, setNick] = useState(""), [email, setEmail] = useState(""), [pw, setPw] = useState(""), [agree, setAgree] = useState(false), [show, setShow] = useState(false);
  const [err, setErr] = useState(""), [bad, setBad] = useState(""), [ok, setOk] = useState(""), [busy, setBusy] = useState(false);
  const fail = (m: string, k = "") => { setErr(m); setBad(k); };
  const fe = (k: string) => (bad === k && err ? <small className="f-err" role="alert">{err}</small> : null);
  const submit = async (e: React.FormEvent) => {
    e.preventDefault(); setErr(""); setBad(""); setOk("");
    if (mode === "up" && !NICK_RE.test(nick.trim())) return fail("Prezývka musí mať 3 až 30 znakov (písmená, číslice, medzera, bodka, pomlčka alebo _).", "nick");
    if (!/^\S+@\S+\.\S+$/.test(email.trim())) return fail("Zadajte platný e-mail.", "email");
    if (mode !== "reset" && pw.length < 8) return fail("Heslo musí mať aspoň 8 znakov.", "pw");
    if (mode === "up" && !agree) return fail("Na registráciu treba súhlasiť s podmienkami a pravidlami fóra.");
    setBusy(true);
    try {
      if (mode === "in") { await forumSignIn(email, pw); await onIn(); }
      else if (mode === "up") { const confirm = await forumSignUp(email, pw, nick); if (confirm) setOk("Hotovo. Poslali sme vám e-mail – kliknite na odkaz v ňom a potom sa prihláste."); else await onIn(); }
      else { await forumResetPassword(email); setOk("Ak účet existuje, poslali sme e-mail s odkazom na nové heslo."); }
    } catch (x) { fail(String((x as Error).message || x)); } finally { setBusy(false); }
  };
  const tab = (m: Mode, l: string) => <button type="button" role="tab" aria-selected={mode === m} onClick={() => { setMode(m); setErr(""); setBad(""); setOk(""); }}>{l}</button>;
  return (
    <section className="pp-auth">
      <h1>{mode === "up" ? "Účet do fóra zadarmo" : mode === "reset" ? "Zabudnuté heslo" : "Prihlásenie do fóra"}</h1>
      <p className="mute">{mode === "up" ? "Na písanie vo fóre stačí prezývka a e-mail. Čítať môžete aj bez účtu." : "Predajcovia sa prihlasujú svojím účtom predajcu."}</p>
      <div className="pp-seg" role="tablist">{tab("in", "Prihlásiť sa")}{tab("up", "Registrácia")}</div>
      <form className="pp-form" onSubmit={submit} noValidate>
        {mode === "up" && <label className={bad === "nick" ? "bad" : ""}><span>Prezývka <em className="req">*</em> <small className="mute">zobrazí sa pri príspevkoch</small></span>
          <input value={nick} onChange={(e) => setNick(e.target.value)} maxLength={30} autoComplete="nickname" placeholder="napr. Jano85" aria-invalid={bad === "nick"} />{fe("nick")}</label>}
        <label className={bad === "email" ? "bad" : ""}><span>E-mail{mode === "up" && <> <em className="req">*</em> <small className="mute">nezobrazí sa</small></>}</span>
          <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="email" aria-invalid={bad === "email"} />{fe("email")}</label>
        {mode !== "reset" && <label className={bad === "pw" ? "bad" : ""}><span>Heslo{mode === "up" && <> <em className="req">*</em><small className="mute"> (aspoň 8 znakov)</small></>}</span>
          <span className="pw"><input type={show ? "text" : "password"} value={pw} onChange={(e) => setPw(e.target.value)} autoComplete={mode === "up" ? "new-password" : "current-password"} aria-invalid={bad === "pw"} />
            <button type="button" aria-pressed={show} onClick={() => setShow(!show)}>{show ? "Skryť" : "Zobraziť"}</button></span>{fe("pw")}</label>}
        {mode === "up" && <label className="pp-chk pp-legal"><input type="checkbox" checked={agree} onChange={(e) => setAgree(e.target.checked)} /> <span>Mám aspoň 18 rokov a súhlasím s <a href="/obchodne-podmienky#forum" target="_blank">obchodnými podmienkami</a> a <a href="/forum/pravidla" target="_blank">pravidlami fóra</a>. Beriem na vedomie <a href="/ochrana-osobnych-udajov" target="_blank">spracúvanie osobných údajov</a>.</span></label>}
        {err && !bad && <p className="pp-err" role="alert">{err}</p>}
        {ok && <p className="pp-ok" role="status">{ok}</p>}
        <button className="btn" disabled={busy}>{busy ? "Čakajte…" : mode === "up" ? "Vytvoriť účet" : mode === "reset" ? "Poslať odkaz" : "Prihlásiť sa"}</button>
        {mode === "in" && <button type="button" className="lnk" onClick={() => { setMode("reset"); setErr(""); setOk(""); }}>Zabudli ste heslo?</button>}
        {mode === "reset" && <button type="button" className="lnk" onClick={() => setMode("in")}>Späť na prihlásenie</button>}
      </form>
      <p className="mute small">Predávate diely? <Link href="/pre-predajcov?registracia=1">Vytvorte si účet predajcu</Link> – môžete s ním písať aj vo fóre.</p>
    </section>
  );
}

function NickForm({ session, onDone }: { session: Session; onDone: () => Promise<void> }) {
  const [nick, setNick] = useState(String(session.user.user_metadata?.nick || session.user.user_metadata?.name || "")), [err, setErr] = useState(""), [busy, setBusy] = useState(false);
  const save = async (e: React.FormEvent) => {
    e.preventDefault(); setErr("");
    if (!NICK_RE.test(nick.trim())) return setErr("Prezývka musí mať 3 až 30 znakov (písmená, číslice, medzera, bodka, pomlčka alebo _).");
    setBusy(true); try { await forumJoin(nick); await onDone(); } catch (x) { setErr(String((x as Error).message || x)); } finally { setBusy(false); }
  };
  return (
    <section className="pp-auth"><h1>Zvoľte si prezývku</h1>
      <p className="mute">Prezývka sa zobrazí pri vašich príspevkoch vo fóre. {!isForumOnly(session) && "Ako predajca dostanete pri príspevkoch značku „Predajca“."}</p>
      <form className="pp-form" onSubmit={save} noValidate>
        <label className={err ? "bad" : ""}><span>Prezývka <em className="req">*</em></span><input value={nick} onChange={(e) => setNick(e.target.value)} maxLength={30} aria-invalid={!!err} />{err && <small className="f-err" role="alert">{err}</small>}</label>
        <p className="mute small">Pokračovaním súhlasíte s <a href="/forum/pravidla" target="_blank">pravidlami fóra</a>.</p>
        <button className="btn" disabled={busy}>{busy ? "Ukladám…" : "Uložiť prezývku"}</button>
      </form>
    </section>
  );
}

function NewPassword({ onDone }: { onDone: () => void }) {
  const [pw, setPw] = useState(""), [err, setErr] = useState(""), [ok, setOk] = useState(false), [busy, setBusy] = useState(false);
  if (ok) return <section className="pp-auth"><h1>Heslo zmenené</h1><p className="pp-ok">Nové heslo je uložené.</p><button className="btn" onClick={onDone}>Pokračovať</button></section>;
  return (
    <section className="pp-auth"><h1>Nové heslo</h1>
      <form className="pp-form" onSubmit={async (e) => { e.preventDefault(); if (pw.length < 8) return setErr("Heslo musí mať aspoň 8 znakov."); setBusy(true); try { await forumChangePassword(pw); setOk(true); } catch (x) { setErr(String((x as Error).message || x)); } finally { setBusy(false); } }} noValidate>
        <label className={err ? "bad" : ""}><span>Nové heslo <small className="mute">(aspoň 8 znakov)</small></span><input type="password" value={pw} onChange={(e) => setPw(e.target.value)} autoComplete="new-password" />{err && <small className="f-err">{err}</small>}</label>
        <button className="btn" disabled={busy}>{busy ? "Ukladám…" : "Uložiť heslo"}</button>
      </form>
    </section>
  );
}

function Profile({ session, me, posts, back, onOut }: { session: Session; me: NonNullable<ForumMe>; posts: MyForumPost[]; back: string; onOut: () => Promise<void> }) {
  const router = useRouter();
  const [del, setDel] = useState(false), [err, setErr] = useState("");
  const forumOnly = isForumOnly(session);
  return (
    <section className="fo-acc">
      <h1>Môj účet vo fóre</h1>
      {back && <p><Link className="btn" href={back}>Pokračovať tam, kde ste boli</Link></p>}
      <div className="pp-box">
        <p>Prezývka: <b>{me.nick}</b>{me.seller && <span className="fo-seller">Predajca</span>}</p>
        <p className="mute">{me.banned ? "Účet je zablokovaný – nemôžete písať." : me.trusted ? "Vaše príspevky sa zobrazujú hneď." : `Prvé 3 príspevky schvaľuje správca${me.pending ? ` – čaká ${me.pending}` : ""}.`}</p>
        <p className="mute small">E-mail (nezobrazuje sa): {session.user.email}</p>
      </div>
      <h2>Moje príspevky</h2>
      {posts.length ? <ul className="fo-my">{posts.map((p) => (
        <li key={p.id}><Link href={threadPath(p.section, p.thread_id, p.title) + "#p" + p.id}><b>{p.title}</b></Link>
          <span className={"pp-st " + (p.status === "visible" ? "active" : p.status === "pending" ? "paused" : "blocked")}>{ST[p.status]}</span>
          <span className="mute">{fmtForumDate(p.created_at)} – {p.body}</span>
          {p.status === "hidden" && <span className="fo-flag bad">Dôvod skrytia: {p.hidden_reason || "porušenie pravidiel"} (rozhodol človek). Ak nesúhlasíte, napíšte nám.</span>}</li>))}</ul>
        : <p className="mute">Zatiaľ ste nič nenapísali. <Link href="/forum">Prejsť do fóra</Link></p>}
      <h2>Účet</h2>
      <div className="fo-acc-a">
        <button className="ubtn" onClick={async () => { try { download("moje-udaje-forum.json", JSON.stringify(await forumExport(), null, 2), "application/json"); } catch (x) { setErr(String((x as Error).message || x)); } }}>Stiahnuť moje údaje</button>
        <button className="ubtn" onClick={onOut}>Odhlásiť sa</button>
        {forumOnly ? <button className="del" onClick={() => setDel(true)}>Zrušiť účet</button> : <Link className="lnk" href="/predajca">Účet predajcu spravujete v portáli predajcu</Link>}
      </div>
      {del && <ConfirmDelete title="Zrušiť účet vo fóre?" note="Zmaže sa účet, prezývka a všetky vaše témy a príspevky. Nedá sa to vrátiť." label="Zrušiť účet natrvalo"
        onConfirm={async () => { try { await forumDeleteAccount(); router.replace("/forum"); router.refresh(); } catch (x) { setErr(String((x as Error).message || x)); setDel(false); } }} onCancel={() => setDel(false)} />}
      {err && <p className="pp-err">{err}</p>}
    </section>
  );
}
