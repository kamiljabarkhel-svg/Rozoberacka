import T from "@/components/T";
// Spoločný vzhľad právnych stránok.
import Link from "next/link";
import { OPERATOR, TERMS_VERSION, fill } from "@/lib/operator";
import { lhref, type Lang } from "@/lib/i18n";

export function LegalPage({ title, children, lang = "sk", skPath = "/" }: { title: string; children: React.ReactNode; lang?: Lang; skPath?: string }) {
  const L = (h: string) => lhref(lang, h);
  return (
    <main id="main" className="main legal" lang={lang}>
      <h1>{title}</h1>
      <p className="mute"><T>{"Účinné od"}</T> {TERMS_VERSION.split("-").reverse().map(Number).join(". ")} · <Link href={L("/ochrana-osobnych-udajov")}><T>{"Ochrana osobných údajov"}</T></Link> · <Link href={L("/obchodne-podmienky")}><T>{"Obchodné podmienky"}</T></Link> · <Link href={L("/cookies")}><T>{"Cookies"}</T></Link></p>
      {lang === "pl" && <p className="legal-tr">Jest to tłumaczenie informacyjne. Wiążąca jest <Link href={skPath} hrefLang="sk">wersja słowacka</Link> tego dokumentu; w razie rozbieżności decyduje tekst słowacki.</p>}
      {children}
    </main>
  );
}

export function OperatorBox() {
  return (
    <dl className="dl legal-op">
      <dt><T>{"Prevádzkovateľ"}</T></dt><dd>{OPERATOR.name}</dd>
      <dt><T>{"IČO"}</T></dt><dd>{OPERATOR.ico}</dd>
      {OPERATOR.dic && <><dt><T>{"DIČ"}</T></dt><dd>{OPERATOR.dic}</dd></>}
      <dt><T>{"Sídlo"}</T></dt><dd>{fill(OPERATOR.address)}</dd>
      <dt><T>{"Zápis"}</T></dt><dd>{fill(OPERATOR.register)}</dd>
      <dt><T>{"E-mail"}</T></dt><dd>{OPERATOR.email ? <a href={"mailto:" + OPERATOR.email}>{OPERATOR.email}</a> : fill("")}</dd>
      <dt><T>{"Telefón"}</T></dt><dd>{OPERATOR.phone ? <a href={"tel:" + OPERATOR.phone.replace(/\s/g, "")}>{OPERATOR.phone}</a> : fill("")}</dd>
      <dt><T>{"Orgán dozoru"}</T></dt><dd>{OPERATOR.supervisor}</dd>
    </dl>
  );
}
