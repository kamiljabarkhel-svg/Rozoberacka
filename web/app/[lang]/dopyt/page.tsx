import type { Metadata } from "next";
import RequestForm from "@/components/RequestForm";
import { langOf } from "@/lib/i18n";
import { altLangs } from "@/lib/hreflang";

type P = { params: Promise<{ lang: string }> };
export async function generateMetadata({ params }: P): Promise<Metadata> {
  const pl = langOf("/" + (await params).lang) === "pl";
  return pl ? {
    title: "Zapytanie o część – sprzedawcy prześlą Ci ofertę",
    description: "Nie znalazłeś używanej części? Podaj samochód i część, a sprzedawcy ze Słowacji prześlą Ci ofertę. Bez rejestracji i za darmo.",
    alternates: { canonical: "/pl/dopyt", languages: altLangs("/dopyt") },
  } : {
    title: "Dopyt na autodiel – predajcovia vám pošlú ponuku",
    description: "Nenašli ste použitý diel? Zadajte auto a diel, predajcovia z celého Slovenska vám pošlú ponuku. Bez registrácie a zadarmo.",
    alternates: { canonical: "/dopyt", languages: altLangs("/dopyt") },
  };
}

export default async function Page({ params }: P) {
  const pl = langOf("/" + (await params).lang) === "pl";
  if (pl) return (
    <main id="main" className="main rq">
      <h1>Nie znalazłeś części? Wyślij zapytanie</h1>
      <p className="landing-lead">Napisz, jaki masz samochód i jakiej części szukasz. Zapytanie zobaczą złomowiska i sprzedawcy na autosuciastky.eu (ze Słowacji) i odezwą się z ofertą – bez rejestracji i za darmo.</p>
      <ul className="rq-how">
        <li><b>Do kogo trafi zapytanie?</b> Do wszystkich złomowisk i sprzedawców zarejestrowanych na autosuciastky.eu. Zobaczą je w portalu sprzedawcy w zakładce „Zapytania” – najpierw ci, którzy sprzedają części do Twojej marki.</li>
        <li><b>Kto zobaczy Twój kontakt?</b> Tylko zalogowani sprzedawcy, nie publicznie ani wyszukiwarki.</li>
        <li><b>Jak dowiesz się o ofercie?</b> Sprzedawca zadzwoni lub napisze albo prześle ofertę z ceną. Wszystkie oferty zobaczysz pod prywatnym adresem, który dostaniesz po wysłaniu.</li>
        <li><b>W jakim języku?</b> Sprzedawcy piszą zwykle po słowacku – języki są podobne. Możesz pisać po polsku, najlepiej krótko i prosto.</li>
        <li><b>Jak długo jest ważne?</b> 30 dni, potem zapytanie zostanie ukryte, a po 60 dniach usunięte.</li>
      </ul>
      <RequestForm />
    </main>
  );
  return (
    <main id="main" className="main rq">
      <h1>Nenašli ste diel? Zadajte dopyt</h1>
      <p className="landing-lead">Napíšte, aké máte auto a aký diel hľadáte. Dopyt uvidia vrakoviská a predajcovia na autosuciastky.eu a ozvú sa vám s ponukou – bez registrácie a zadarmo.</p>
      <ul className="rq-how">
        <li><b>Komu sa dopyt odošle?</b> Všetkým vrakoviskám a predajcom registrovaným na autosuciastky.eu. Uvidia ho v portáli predajcu v záložke „Dopyty“ – najprv tí, ktorí predávajú diely na vašu značku auta.</li>
        <li><b>Kto uvidí váš kontakt?</b> Len prihlásení predajcovia, nie verejnosť ani vyhľadávače.</li>
        <li><b>Ako sa dozviete o ponuke?</b> Predajca vám zavolá alebo napíše, alebo pošle ponuku s cenou. Všetky ponuky uvidíte na súkromnej adrese, ktorú dostanete po odoslaní.</li>
        <li><b>Ako dlho platí?</b> 30 dní, potom sa dopyt skryje a po 60 dňoch zmaže.</li>
      </ul>
      <RequestForm />
    </main>
  );
}
