// Návod pre predajcov: hromadný import dielov z CSV (Excel) alebo XML (sklad/e-shop). Odkaz z portálu → Import z CSV / XML.
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import Crumbs from "@/components/Crumbs";
import { sampleCsvHref, sampleXmlHref } from "@/lib/importSamples";

export const metadata: Metadata = {
  title: "Import dielov z CSV a XML – návod pre predajcov",
  description: "Ako hromadne nahrať použité diely na autosuciastky.eu: vzor CSV pre Excel, export XML zo skladu či e-shopu, povinné stĺpce, pneumatiky a disky, fotky.",
  alternates: { canonical: "/pre-predajcov/import" },
};

type P = { params: Promise<{ lang: string }> };
type Row = [string, string, string?];   // stĺpec, čo doň patrí, príklad

const REQUIRED: Row[] = [
  ["nazov", "názov dielu", "Predné ľavé svetlo"],
  ["cena", "cena v eurách", "120"],
  ["kategoria", "časť auta (ako na webe)", "Svetlá"],
];
const REQUIRED_CAR: Row[] = [
  ["znacka", "značka vozidla", "Škoda"],
  ["model", "model vozidla", "Octavia III"],
  ["oem", "číslo dielu z nálepky alebo zo starého dielu", "5E1941015"],
];
const OPTIONAL: Row[] = [
  ["druh", "druh vozidla: osobné, veterány, dodávky, nákladné, autobusy, motorky", "osobné"],
  ["motorizacia", "motor (prázdne = pasuje na všetky)", "2.0 TDI 110 kW"],
  ["rocnik", "rok výroby vozidla", "2015"],
  ["podkategoria", "presnejšie zaradenie", "Predné svetlá"],
  ["stav", "Nový, Repasovaný, Veľmi dobrý, Dobrý alebo Na opravu", "Dobrý"],
  ["zaruka", "záruka", "12 mesiacov"],
  ["popis", "popis dielu, aspoň 20 znakov", "Funkčné, bez prasklín, úchyty celé."],
  ["mesto", "mesto (ak chýba, vezme sa z profilu)", "Žilina"],
  ["telefon", "telefón (ak chýba, vezme sa z profilu)", "0900 123 456"],
  ["pasuje", "ďalšie vozidlá, na ktoré diel pasuje, oddelené znakom |", "Škoda Octavia III | VW Golf VII"],
  ["nahradne_cisla", "iné čísla toho istého dielu (staršie, novšie, iného výrobcu), oddelené |, najviac 10", "5E1941015A | 5E1941015B"],
  ["strana", "ľavá alebo pravá", "ľavá"],
  ["odskusany", "áno, ak je diel odskúšaný", "áno"],
  ["vratenie", "áno, ak umožníte vrátenie do 14 dní", "áno"],
  ["km", "najazdené km vozidla, z ktorého je diel", "185000"],
  ["vyrobca", "výrobca dielu", "Hella"],
  ["fotky", "názvy súborov fotiek, oddelené |", "svetlo1.jpg | svetlo2.jpg"],
];
const WHEELS: Row[] = [
  ["pneu_sirka", "šírka pneumatiky", "205"], ["pneu_profil", "profil", "55"], ["priemer", "priemer v palcoch", "16"],
  ["sezona", "letné, zimné alebo celoročné", "zimné"], ["dezen_mm", "hĺbka dezénu v mm", "6"], ["dot", "rok výroby pneumatiky", "2022"],
  ["index_nosnosti", "index nosnosti", "91"], ["index_rychlosti", "index rýchlosti", "H"],
  ["sirka_disku", "šírka disku v palcoch", "7"], ["roztec", "rozteč skrutiek", "5x112"], ["et", "zálisovanie", "49"],
  ["stredovy_otvor", "stredový otvor v mm", "57.1"], ["kusy", "počet kusov", "4"], ["material", "Hliník alebo Oceľ", "Hliník"],
];

function Table({ rows }: { rows: Row[] }) {
  return (
    <table className="legal-t">
      <thead><tr><th>Stĺpec</th><th>Čo doň patrí</th><th>Príklad</th></tr></thead>
      <tbody>{rows.map(([c, w, e]) => <tr key={c}><td><code>{c}</code></td><td>{w}</td><td>{e}</td></tr>)}</tbody>
    </table>
  );
}

export default async function Page({ params }: P) {
  if ((await params).lang !== "sk") notFound();
  return (
    <main id="main" className="main legal navod">
      <Crumbs items={[{ name: "Úvod", href: "/" }, { name: "Pre predajcov", href: "/pre-predajcov" }]} last="Import dielov" />
      <h1>Import dielov z CSV a XML</h1>
      <p>Namiesto pridávania dielov po jednom môžete nahrať naraz až <b>500 dielov</b> zo súboru. Pred importom vždy uvidíte náhľad s chybami a upozorneniami – nič sa nezverejní bez vášho potvrdenia.</p>

      <h2>Postup v 4 krokoch</h2>
      <ol>
        <li><b>Stiahnite si vzor:</b> <a href={sampleCsvHref} download="vzor-autosuciastky.csv">vzor CSV pre Excel</a> alebo <a href={sampleXmlHref} download="vzor-autosuciastky.xml">vzor XML</a>.</li>
        <li><b>Vyplňte ho:</b> v Exceli prepíšte vzorový riadok svojimi dielmi – jeden riadok = jeden diel. Prvý riadok (názvy stĺpcov) nechajte tak.</li>
        <li><b>Uložte ako CSV:</b> v Exceli <i>Súbor → Uložiť ako → CSV (oddelený bodkočiarkou)</i>.</li>
        <li><b>Nahrajte:</b> v <Link href="/predajca#csv">portáli predajcu</Link> v časti <i>Import z CSV / XML</i> vyberte súbor, pridajte fotky, skontrolujte náhľad a kliknite na <i>Importovať</i>.</li>
      </ol>

      <h2>Povinné stĺpce</h2>
      <p>Vždy:</p>
      <Table rows={REQUIRED} />
      <p>Pri dieloch na konkrétne vozidlo navyše:</p>
      <Table rows={REQUIRED_CAR} />
      <p className="mute small">Pri pneumatikách, diskoch, výbave jazdca, príslušenstve a kategórii „Iné“ stačia prvé tri stĺpce (vozidlo je nepovinné – vtedy vyplňte stĺpec <code>druh</code>). Pri veteránoch je číslo dielu nepovinné.</p>

      <h2>Nepovinné stĺpce</h2>
      <Table rows={OPTIONAL} />

      <h2>Pneumatiky a disky</h2>
      <p>Pri kategórii „Pneumatiky a disky“ vyplňte rozmery – podľa nich ich kupujúci hľadajú. Pri pneumatikách aspoň šírku, profil a priemer, pri diskoch aspoň rozteč a priemer.</p>
      <Table rows={WHEELS} />

      <h2>Fotky</h2>
      <p>V portáli pri importe vyberte fotky alebo celý priečinok. K dielom sa priradia:</p>
      <ul>
        <li>podľa stĺpca <code>fotky</code> (napr. <code>svetlo1.jpg | svetlo2.jpg</code>), alebo</li>
        <li>podľa <b>čísla dielu v názve súboru</b>: <code>5E1941015.jpg</code>, <code>5E1941015_2.jpg</code>.</li>
      </ul>
      <p>Najviac 8 fotiek na diel. Diel bez fotky sa naimportuje <b>pozastavený</b> – kupujúci ho neuvidia, kým fotku nedoplníte.</p>

      <h2>XML zo skladu alebo e-shopu</h2>
      <p>Ak váš skladový program alebo e-shop vie exportovať XML, môžete ho nahrať priamo. Každý diel je jeden prvok (napr. <code>&lt;diel&gt;</code>, <code>&lt;item&gt;</code> alebo <code>&lt;SHOPITEM&gt;</code>) a v ňom prvky s rovnakými názvami ako stĺpce CSV (<code>&lt;nazov&gt;</code>, <code>&lt;znacka&gt;</code>, <code>&lt;oem&gt;</code>, <code>&lt;cena&gt;</code>…). Viac hodnôt zapíšte ako vnorené prvky, napr. <code>&lt;fotky&gt;&lt;fotka&gt;a.jpg&lt;/fotka&gt;&lt;/fotky&gt;</code>.</p>
      <p>Rozumieme aj anglickým a bežným názvom z e-shopov: <code>name</code>, <code>brand</code>, <code>price</code>, <code>description</code>, <code>category</code>, <code>PRODUCTNAME</code>, <code>PRICE_VAT</code>, <code>IMGURL</code>… Ak si nie ste istí, pozrite si <a href={sampleXmlHref} download="vzor-autosuciastky.xml">vzor XML</a> alebo nám napíšte.</p>

      <h2>Časté problémy</h2>
      <ul>
        <li><b>Diakritika sa zobrazí zle</b> – uložte súbor ako „CSV UTF-8“ (novší Excel) alebo použite náš vzor.</li>
        <li><b>„Neznáma kategória“ alebo „neznámy model“</b> – názov musí byť ako na webe (napr. „Svetlá“, „Octavia III“). Náhľad vám ukáže, v ktorom riadku je chyba.</li>
        <li><b>Číslo dielu má menej ako 4 znaky</b> – zapíšte celé číslo z nálepky (medzery a pomlčky nevadia).</li>
        <li><b>Popis je krátky</b> – popis musí mať aspoň 20 znakov.</li>
      </ul>
      <p><Link href="/predajca#csv">Prejsť na import v portáli predajcu</Link></p>
    </main>
  );
}
