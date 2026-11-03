// Spoločný vzhľad právnych stránok.
import Link from "next/link";
import { OPERATOR, TERMS_VERSION, fill } from "@/lib/operator";

export function LegalPage({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <main id="main" className="main legal">
      <h1>{title}</h1>
      <p className="mute">Účinné od {TERMS_VERSION.split("-").reverse().map(Number).join(". ")} · <Link href="/ochrana-osobnych-udajov">Ochrana osobných údajov</Link> · <Link href="/obchodne-podmienky">Obchodné podmienky</Link> · <Link href="/cookies">Cookies</Link></p>
      {children}
    </main>
  );
}

export function OperatorBox() {
  return (
    <dl className="dl legal-op">
      <dt>Prevádzkovateľ</dt><dd>{OPERATOR.name}</dd>
      <dt>IČO</dt><dd>{OPERATOR.ico}</dd>
      {OPERATOR.dic && <><dt>DIČ</dt><dd>{OPERATOR.dic}</dd></>}
      <dt>Sídlo</dt><dd>{fill(OPERATOR.address)}</dd>
      <dt>Zápis</dt><dd>{fill(OPERATOR.register)}</dd>
      <dt>E-mail</dt><dd>{OPERATOR.email ? <a href={"mailto:" + OPERATOR.email}>{OPERATOR.email}</a> : fill("")}</dd>
    </dl>
  );
}
