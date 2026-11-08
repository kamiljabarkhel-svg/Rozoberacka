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
  const [type, setType] = useState<"Firma" | "Súkromná osoba" | "">(""), [ico, setIco] = useState(""), [addr, setAddr] = useState(""), [decl, setDecl] = useState(false);
  const firm = type === "Firma";
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
    if (mode === "up" && !type) return setErr("Vyberte, či predávate ako podnikateľ alebo ako súkromná osoba.");
    if (mode === "up" && name.trim().length < 2) return setErr(firm ? "Zadajte obchodné meno." : "Zadajte svoje meno.");
    if (mode === "up" && firm && !/^[0-9]{8}$/.test(ico.replace(/\s/g, ""))) return setErr("IČO musí mať 8 číslic.");
    if (mode === "up" && firm && addr.trim().length < 5) return setErr("Zadajte sídlo alebo miesto podnikania.");
    if (mode === "up" && !decl) return setErr("Potvrďte vyhlásenie o tom, ako predávate.");
    if (mode === "up" && !agree) return setErr("Na registráciu treba súhlasiť s obchodnými podmienkami.");
    setBusy(true);
    try {
      if (mode === "in") { await signIn(email, pw); router.replace("/predajca"); }
      else if (mode === "up") {
        const confirm = await signUp(email, pw, { name, type: type as "Firma" | "Súkromná osoba", ico, address: addr });
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
        {mode === "up" && <fieldset className="pp-type">
          <legend>Ako predávate?</legend>
          <label className={"pp-typeo" + (type === "Firma" ? " on" : "")}><input type="radio" name="typ" checked={type === "Firma"} onChange={() => { setType("Firma"); setDecl(false); }} />
            <span><b>Ako podnikateľ</b><small>živnosť, s.r.o., vrakovisko, servis – kupujúci uvidia obchodné meno, IČO a sídlo</small></span></label>
          <label className={"pp-typeo" + (type === "Súkromná osoba" ? " on" : "")}><input type="radio" name="typ" checked={type === "Súkromná osoba"} onChange={() => { setType("Súkromná osoba"); setDecl(false); }} />
            <span><b>Ako súkromná osoba</b><small>príležitostne predávam diely z vlastného auta, nie v rámci podnikania</small></span></label>
        </fieldset>}
        {mode === "up" && type && <label>{firm ? "Obchodné meno" : "Meno (zobrazí sa kupujúcim)"}<input value={name} onChange={(e) => setName(e.target.value)} autoComplete={firm ? "organization" : "name"} maxLength={120} placeholder={firm ? "napr. Autovrakovisko Novák s.r.o." : "napr. Jozef K."} /></label>}
        {mode === "up" && firm && <div className="pp-row2">
          <label>IČO<input value={ico} onChange={(e) => setIco(e.target.value)} inputMode="numeric" maxLength={11} placeholder="12345678" /></label>
          <label>Sídlo / miesto podnikania<input value={addr} onChange={(e) => setAddr(e.target.value)} autoComplete="street-address" maxLength={200} placeholder="Ulica 1, 900 01 Mesto" /></label>
        </div>}
        <label>E-mail<input type="email" value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="email" /></label>
        {mode !== "reset" && <label><span>Heslo{mode === "up" && <small className="mute"> (aspoň 8 znakov)</small>}</span><span className="pw"><input type={show ? "text" : "password"} value={pw} onChange={(e) => setPw(e.target.value)} autoComplete={mode === "up" ? "new-password" : "current-password"} /><button type="button" aria-pressed={show} onClick={() => setShow(!show)}>{show ? "Skryť" : "Zobraziť"}</button></span></label>}
        {mode === "up" && type && <label className="pp-chk"><input type="checkbox" checked={decl} onChange={(e) => setDecl(e.target.checked)} /> <span>{firm
          ? "Vyhlasujem, že diely predávam ako podnikateľ (obchodník) a uvedené údaje sú pravdivé. Kupujúcim – spotrebiteľom zodpovedám za vady a pri predaji na diaľku majú právo odstúpiť od zmluvy do 14 dní."
          : "Vyhlasujem, že diely nepredávam v rámci podnikania. Ak by som predával pravidelne za účelom zisku, zaregistrujem sa ako podnikateľ."}</span></label>}
        {mode === "up" && <label className="pp-chk"><input type="checkbox" checked={agree} onChange={(e) => setAgree(e.target.checked)} /> <span>Súhlasím s <a href="/obchodne-podmienky" target="_blank">obchodnými podmienkami</a>. Beriem na vedomie, že {OPERATOR.name} spracúva moje údaje podľa <a href="/ochrana-osobnych-udajov" target="_blank">zásad ochrany osobných údajov</a> a že meno, mesto a telefón z inzerátu (pri podnikateľovi aj IČO a sídlo) budú verejné.</span></label>}
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
