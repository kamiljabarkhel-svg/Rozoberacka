import type { Metadata } from "next";
import RequestForm from "@/components/RequestForm";

export const metadata: Metadata = {
  title: "Dopyt na autodiel – vrakoviská vám pošlú ponuku",
  description: "Nenašli ste použitý diel? Zadajte auto a diel, vrakoviská a predajcovia z celého Slovenska vám pošlú ponuku. Bez registrácie a zadarmo.",
  alternates: { canonical: "/dopyt" },
};

export default function Page() {
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
