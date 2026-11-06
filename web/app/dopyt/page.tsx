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
      <p className="landing-lead">Napíšte, aké máte auto a aký diel hľadáte. Dopyt uvidia vrakoviská a predajcovia na Rozoberačke a ozvú sa vám s ponukou – bez registrácie a zadarmo.</p>
      <RequestForm />
    </main>
  );
}
