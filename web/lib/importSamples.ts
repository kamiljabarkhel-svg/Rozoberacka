// Vzorové súbory na import (portál predajcu aj návod /pre-predajcov/import).
export const SAMPLE_CSV = "nazov;znacka;model;motorizacia;rocnik;oem;cena;kategoria;podkategoria;stav;zaruka;popis;mesto;telefon;pasuje;fotky\n" +
    "Predné ľavé svetlo;Škoda;Octavia III;;2015;5E1941015;120;Svetlá;Predné svetlá;Dobrý;12 mesiacov;Funkčné, bez prasklín, úchyty celé.;Žilina;0900123456;Škoda Octavia III Combi;svetlo1.jpg|svetlo2.jpg\n";
export const SAMPLE_XML = `<?xml version="1.0" encoding="UTF-8"?>
<diely>
  <diel>
    <nazov>Predné ľavé svetlo</nazov>
    <znacka>Škoda</znacka>
    <model>Octavia III</model>
    <rocnik>2015</rocnik>
    <oem>5E1941015</oem>
    <nahradne_cisla><cislo>5E1941015A</cislo></nahradne_cisla>
    <cena>120</cena>
    <kategoria>Svetlá</kategoria>
    <podkategoria>Predné svetlá</podkategoria>
    <stav>Dobrý</stav>
    <zaruka>12 mesiacov</zaruka>
    <popis>Funkčné, bez prasklín, úchyty celé.</popis>
    <mesto>Žilina</mesto>
    <telefon>0900123456</telefon>
    <pasuje><auto>Škoda Octavia III Combi</auto></pasuje>
    <fotky><fotka>svetlo1.jpg</fotka><fotka>svetlo2.jpg</fotka></fotky>
  </diel>
</diely>
`;
export const sampleCsvHref = "data:text/csv;charset=utf-8," + encodeURIComponent("\uFEFF" + SAMPLE_CSV);
export const sampleXmlHref = "data:application/xml;charset=utf-8," + encodeURIComponent(SAMPLE_XML);
