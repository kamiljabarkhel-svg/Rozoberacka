import T from "@/components/T";
export default function SellersSoon() {
  return (
    <section className="soon">
      <h1><T>{"Pre predajcov"}</T></h1>
      <p className="mute"><T>{"Portál predajcu pripravujeme. Vrakoviská a predajcovia si tu čoskoro založia účet (e-mail a heslo) a budú môcť:"}</T></p>
      <ul>
        <li><T>{"pridávať a upravovať inzeráty s fotkami,"}</T></li>
        <li><T>{"hromadne nahrať diely zo súboru CSV alebo XML,"}</T></li>
        <li><T>{"sledovať zobrazenia a odkryté telefóny,"}</T></li>
        <li><T>{"označiť diel ako predaný alebo ho pozastaviť."}</T></li>
      </ul>
      <div className="warn"><T>{"Kupujúci účet nepotrebujú. Diely hľadajú podľa auta a predajcovi zavolajú priamo."}</T></div>
    </section>
  );
}
