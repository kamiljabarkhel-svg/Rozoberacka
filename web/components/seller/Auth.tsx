"use client";
// Prihlásenie, registrácia a zabudnuté heslo pre predajcov (Supabase Auth).
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { IS_DEMO } from "@/lib/data";
import { getSession, resetPassword, signIn, signUp } from "@/lib/seller";
import { OPERATOR } from "@/lib/operator";

type Mode = "in" | "up" | "reset";

export default function Auth() {
  const router = useRouter();
  const [mode, setMode] = useState<Mode>("in");
  const [email, setEmail] = useState(""), [pw, setPw] = useState(""), [name, setName] = useState("");
  const [agree, setAgree] = useState(false), [show, setShow] = useState(false);
  const [busy, setBusy] = useState(false), [err, setErr] = useState(""), [ok, setOk] = useState("");

  useEffect(() => {
    if (new URLSearchParams(window.location.search).get("registracia") === "1") setMode("up");
    getSession().then((s) => { if (s) router.replace("/predajca"); });
  }, [router]);

  async function submit(e: React.FormEvent) {
    e.preventDefault(); setErr(""); setOk("");
    if (!/^\S+@\S+\.\S+$/.test(email.trim())) return setErr("Zadajte platný e-mail.");
    if (mode !== "reset" && pw.length < 8) return setErr("Heslo musí mať aspoň 8 znakov.");
    if (mode === "up" && name.trim().length < 2) return setErr("Zadajte názov firmy alebo meno.");
    if (mode === "up" && !agree) return setErr("Na registráciu treba súhlasiť s obchodnými podmienkami.");
    setBusy(true);
    try {
      if (mode === "in") { await signIn(email, pw); router.replace("/predajca"); }
      else if (mode === "up") {
        const confirm = await signUp(email, pw, name);
        if (confirm) setOk("Hotovo. Poslali sme vám e-mail – kliknite na odkaz v ňom a potom sa prihláste.");
        else router.replace("/predajca");
      } else { await resetPassword(email); setOk("Ak účet existuje, poslali sme e-mail s odkazom na nové heslo."); }
    } catch (x) { setErr((x as Error).message); }
    finally { setBusy(false); }
  }

  if (IS_DEMO) return (
    <section className="pp-auth"><h1>Pre predajcov</h1>
      <p className="mute">Toto je ukážková verzia bez databázy. Prihlásenie predajcov začne fungovať po pripojení Supabase (premenné NEXT_PUBLIC_SUPABASE_URL a NEXT_PUBLIC_SUPABASE_ANON_KEY).</p></section>
  );

  return (
    <section className="pp-auth">
      <h1>{mode === "up" ? "Vytvorte si účet predajcu zadarmo" : mode === "reset" ? "Zabudnuté heslo" : "Prihlásenie predajcu"}</h1>
      <p className="mute">{mode === "up" ? "Pridávajte diely, sledujte zobrazenia a odpovedajte na správy. Kupujúci sa registrovať nemusia." : mode === "reset" ? "Pošleme vám odkaz na nastavenie nového hesla." : "Spravujte svoje inzeráty na jednom mieste."}</p>
      <div className="pp-seg" role="tablist">
        <button type="button" role="tab" aria-selected={mode === "in"} onClick={() => { setMode("in"); setErr(""); setOk(""); }}>Prihlásiť sa</button>
        <button type="button" role="tab" aria-selected={mode === "up"} onClick={() => { setMode("up"); setErr(""); setOk(""); }}>Registrácia</button>
      </div>
      {mode === "up" && <ul className="pp-why"><li>Inzeráty zadarmo, bez provízie z predaja</li><li>Kupujúci vám volajú alebo píšu priamo</li><li>Hromadný import skladu z CSV a diely z darcovského auta naraz</li></ul>}
      <form className="pp-form" onSubmit={submit} noValidate>
        {mode === "up" && <label>Názov firmy alebo meno<input value={name} onChange={(e) => setName(e.target.value)} autoComplete="organization" maxLength={120} /></label>}
        <label>E-mail<input type="email" value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="email" /></label>
        {mode !== "reset" && <label><span>Heslo{mode === "up" && <small className="mute"> (aspoň 8 znakov)</small>}</span><span className="pw"><input type={show ? "text" : "password"} value={pw} onChange={(e) => setPw(e.target.value)} autoComplete={mode === "up" ? "new-password" : "current-password"} /><button type="button" aria-pressed={show} onClick={() => setShow(!show)}>{show ? "Skryť" : "Zobraziť"}</button></span></label>}
        {mode === "up" && <label className="pp-chk"><input type="checkbox" checked={agree} onChange={(e) => setAgree(e.target.checked)} /> <span>Súhlasím s <a href="/obchodne-podmienky" target="_blank">obchodnými podmienkami</a>. Beriem na vedomie, že {OPERATOR.name} spracúva moje údaje podľa <a href="/ochrana-osobnych-udajov" target="_blank">zásad ochrany osobných údajov</a> a že názov, mesto a telefón z inzerátu budú verejné.</span></label>}
        {err && <p className="pp-err" role="alert">{err}</p>}
        {ok && <p className="pp-ok" role="status">{ok}</p>}
        <button className="btn" disabled={busy}>{busy ? "Čakajte…" : mode === "up" ? "Vytvoriť účet" : mode === "reset" ? "Poslať odkaz" : "Prihlásiť sa"}</button>
        {mode === "in" && <button type="button" className="lnk" onClick={() => { setMode("reset"); setErr(""); setOk(""); }}>Zabudli ste heslo?</button>}
        {mode === "in" && <p className="mute pp-new">Nemáte účet? <button type="button" className="lnk" onClick={() => { setMode("up"); setErr(""); setOk(""); }}>Vytvorte si ho zadarmo</button></p>}
        {mode === "reset" && <button type="button" className="lnk" onClick={() => setMode("in")}>Späť na prihlásenie</button>}
      </form>
    </section>
  );
}
