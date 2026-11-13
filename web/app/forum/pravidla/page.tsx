import type { Metadata } from "next";
import Link from "next/link";
import Crumbs from "@/components/Crumbs";
import { OPERATOR } from "@/lib/operator";

export const metadata: Metadata = {
  title: "Pravidlá fóra",
  description: "Pravidlá fóra autosuciastky.eu: čo sa smie písať, ako schvaľujeme príspevky, ako nahlásiť nevhodný obsah a ako sa brániť proti skrytiu.",
  alternates: { canonical: "/forum/pravidla" },
};

export default function Page() {
  return (
    <main id="main" className="main legal">
      <Crumbs items={[{ name: "Úvod", href: "/" }, { name: "Fórum", href: "/forum" }]} last="Pravidlá fóra" />
      <h1>Pravidlá fóra</h1>
      <p className="lead">Fórum je poradňa o poruchách, opravách a dieloch. Aby bolo užitočné pre všetkých, platia tieto pravidlá. Sú súčasťou <Link href="/obchodne-podmienky#forum">obchodných podmienok</Link>.</p>
      <h2>1. Kto môže písať</h2>
      <ul>
        <li>Čítať môže každý bez účtu. Písať môže používateľ starší ako 18 rokov s účtom do fóra (prezývka, e-mail, heslo) alebo s účtom predajcu.</li>
        <li>Príspevky predajcov majú značku „Predajca“. Prvé 3 príspevky nového používateľa skontroluje správca, potom sa zobrazujú hneď.</li>
      </ul>
      <h2>2. Čo do fóra nepatrí</h2>
      <ul>
        <li>nelegálny obsah – napríklad ponuka kradnutých dielov, návody na obchádzanie emisných systémov alebo tachometrov, falšovanie dokladov,</li>
        <li>urážky, vyhrážky, nenávistné prejavy a obťažovanie,</li>
        <li>osobné údaje iných ľudí (telefón, adresa, EČV s menom…) a nepravdivé tvrdenia o konkrétnych osobách alebo firmách,</li>
        <li>reklama a spam – ponuky dielov patria do inzerátov, nie do fóra; odkaz na vlastný inzerát je v poriadku, ak odpovedá na otázku,</li>
        <li>cudzie texty a fotky bez súhlasu autora.</li>
      </ul>
      <h2>3. Ako moderujeme</h2>
      <ul>
        <li>Nevhodný príspevok môže ktokoľvek nahlásiť tlačidlom „⚑ Nahlásiť“. Nahlásenie posúdi správca bez zbytočného odkladu.</li>
        <li>O skrytí príspevku alebo zablokovaní účtu rozhoduje vždy človek. Autor uvidí pri príspevku dôvod skrytia.</li>
        <li>Automaticky len obmedzujeme počet príspevkov (najviac 20 za hodinu a 5 nových tém za deň) a nahlásení, aby fórum nezahltili roboty.</li>
        <li>Ak nesúhlasíte so skrytím alebo zablokovaním, napíšte nám na <a href={"mailto:" + OPERATOR.email}>{OPERATOR.email}</a>. Rozhodnutie preskúma človek. Ďalšie možnosti nápravy sú v <Link href="/obchodne-podmienky#forum">obchodných podmienkach</Link>.</li>
      </ul>
      <h2>4. Zodpovednosť</h2>
      <ul>
        <li>Za obsah príspevku zodpovedá jeho autor. Prevádzkovateľ príspevky vopred nekontroluje (okrem prvých príspevkov nováčikov) a za rady vo fóre neručí.</li>
        <li>Pri opravách dôležitých pre bezpečnosť (brzdy, riadenie, airbagy, pneumatiky) sa vždy poraďte s odborným servisom.</li>
      </ul>
      <h2>5. Vaše príspevky a údaje</h2>
      <ul>
        <li>Svoj príspevok môžete upraviť do 24 hodín a zmazať kedykoľvek. Zmazaním prvého príspevku zmažete celú tému.</li>
        <li>Účet zrušíte v „Môj účet vo fóre“ – zmažú sa aj všetky vaše príspevky. Tam si môžete stiahnuť aj svoje údaje.</li>
        <li>Prezývka a príspevky sú verejné. E-mail sa nezobrazuje. Podrobnosti sú v zásadách <Link href="/ochrana-osobnych-udajov">ochrany osobných údajov</Link>.</li>
      </ul>
    </main>
  );
}
