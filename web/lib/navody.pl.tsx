// Poradniki dla kupujących – polska wersja (tłumaczenie lib/navody.tsx, te same adresy).
import Link from "next/link";
import type { Navod } from "./navody";

export const NAVODY_PL: Navod[] = [
  {
    slug: "oem-cislo",
    title: "Gdzie znajdę numer OEM części",
    short: "Numer OEM",
    description: "Czym jest numer OEM części samochodowej, gdzie go znaleźć na starej części i dlaczego warto go porównać przed zakupem używanej części.",
    updated: "2026-11-15",
    body: <>
      <p><b>Numer OEM to numer katalogowy części nadany przez producenta samochodu.</b> Ten sam numer oznacza tę samą część, nawet jeśli pasuje do kilku modeli. To najpewniejszy sposób, by sprawdzić, czy używana część będzie pasować.</p>
      <h2>Gdzie go znajdziesz</h2>
      <ul>
        <li><b>Na starej części</b> – na naklejce, tabliczce albo wybity lub odlany w plastiku i metalu. W lampach zwykle z tyłu obudowy, w sterownikach na naklejce, w alternatorze i rozruszniku na metalowej tabliczce.</li>
        <li><b>W serwisie lub u dealera marki</b> – wyszukają go w katalogu producenta na podstawie numeru VIN.</li>
        <li><b>Na fakturze</b> z wcześniejszej naprawy, jeśli część była już wymieniana.</li>
      </ul>
      <h2>Jak go porównać</h2>
      <ul>
        <li>Spacje, kropki i myślniki nie mają znaczenia: <code>5E0 823 031</code> i <code>5E0823031</code> to ten sam numer. autosuciastky.eu porównuje numery bez nich.</li>
        <li>Litera na końcu (np. <code>…031A</code>, <code>…031B</code>) często oznacza nowszą wersję części. Czasem jest zamienna, czasem nie – zapytaj sprzedawcę lub serwis.</li>
        <li>Numer producenta części (Bosch, Valeo, Hella…) nie jest numerem OEM samochodu. Jeśli sprzedawca go podaje, znajdziesz go w ogłoszeniu jako „Producent części”.</li>
      </ul>
      <h2>Wyszukiwanie na autosuciastky.eu</h2>
      <p>Na stronie głównej wpisz numer w pole <Link href="/pl#hladat">Szukaj po numerze części</Link>. Na telefonie możesz go też sfotografować – tekst jest odczytywany bezpośrednio w telefonie, zdjęcie nigdzie nie jest wysyłane.</p>
      <p className="mute">Lista „Pasuje do” w ogłoszeniach powstaje z danych sprzedawców i zgodności numerów OEM. Nie jest to zweryfikowany katalog producenta.</p>
    </>,
  },
  {
    slug: "vin",
    title: "Gdzie znajdę numer VIN samochodu",
    short: "Numer VIN",
    description: "Gdzie jest VIN (numer identyfikacyjny pojazdu) w samochodzie i w dowodzie rejestracyjnym oraz czego się z niego dowiesz: producent, rodzaj pojazdu i u niektórych marek rok modelowy.",
    updated: "2026-11-15",
    body: <>
      <p><b>VIN to 17-znakowy numer identyfikacyjny pojazdu.</b> Zawiera litery i cyfry, ale nigdy liter I, O i Q (żeby nie myliły się z 1 i 0).</p>
      <h2>Gdzie go znajdziesz</h2>
      <ul>
        <li><b>W dowodzie rejestracyjnym</b> – w polu <b>E</b>.</li>
        <li><b>Za przednią szybą</b> – w większości nowszych samochodów w dolnym rogu po stronie kierowcy, czytelny z zewnątrz.</li>
        <li><b>Na tabliczce</b> w słupku drzwi lub w komorze silnika oraz wybity na karoserii (miejsce zależy od producenta).</li>
      </ul>
      <h2>Czego się z niego dowiesz</h2>
      <ul>
        <li><b>Pierwsze 3 znaki</b> oznaczają producenta, na przykład <code>TMB</code> Škoda, <code>WVW</code> Volkswagen, <code>WAU</code> Audi, <code>WBA</code> BMW.</li>
        <li>Pierwsze 3 znaki zdradzają też <b>rodzaj pojazdu</b> – np. <code>JH2</code> to motocykl Honda, <code>JHM</code> samochód Honda, <code>YS2</code> ciężarówka Scania, <code>WKK</code> autobus Setra.</li>
        <li><b>10. znak</b> to rok modelowy – ale tylko u niektórych producentów (np. Škoda, Volkswagen, Audi, Seat, Hyundai, Kia, Toyota, Volvo, japońskie motocykle): … <code>G</code> 2016, <code>H</code> 2017, <code>J</code> 2018, <code>K</code> 2019, <code>L</code> 2020, <code>M</code> 2021, <code>N</code> 2022, <code>P</code> 2023, <code>R</code> 2024, <code>S</code> 2025, <code>T</code> 2026. Kod powtarza się co 30 lat (<code>S</code> to także 1995). Mercedes-Benz, BMW, Renault, Peugeot, Citroën, Fiat, Opel, Ford (Europa) oraz większość ciężarówek i autobusów nie zapisują roku w 10. znaku – rocznik znajdziesz w dowodzie rejestracyjnym. Rok modelowy może różnić się od roku produkcji.</li>
      </ul>
      <p>Na stronie głównej wpisz VIN w pole <Link href="/pl#vin">VIN</Link>, a autosuciastky.eu wybierze producenta i rodzaj pojazdu oraz pokaże przybliżony rocznik, jeśli producent zapisuje go w VIN. Dokładny model, silnik i rocznik wybierz sam. VIN możesz też sfotografować – jest odczytywany bezpośrednio w telefonie.</p>
      <p>VIN pomoże też sprzedawcy przy zapytaniu: <Link href="/pl/dopyt">wyślij zapytanie o część</Link> i dopisz VIN – sprzedawca go zobaczy, publicznie nie jest wyświetlany.</p>
    </>,
  },
  {
    slug: "bezpecny-nakup",
    title: "Jak bezpiecznie kupić używaną część samochodową",
    short: "Bezpieczny zakup",
    description: "Jak sprawdzić, czy używana część pasuje, o co pytać sprzedawcę, jak płacić i jakie masz prawa przy zakupie od firmy i od osoby prywatnej na Słowacji.",
    updated: "2026-11-15",
    body: <>
      <p><b>Najpierw sprawdź część, potem płać.</b> autosuciastky.eu to portal ogłoszeniowy – część kupujesz bezpośrednio od sprzedawcy, nie pośredniczymy w płatnościach. Sprzedawcy pochodzą ze Słowacji.</p>
      <h2>Przed zakupem</h2>
      <ol>
        <li>Porównaj <Link href="/pl/navody/oem-cislo">numer OEM</Link> ze starą częścią. Jeśli ogłoszenie go nie ma, poproś o zdjęcie tabliczki.</li>
        <li>Zapytaj o samochód, z którego pochodzi część: rocznik, silnik, przebieg. Przy elektronice – czy była sprawdzona.</li>
        <li>Przy lampach i karoserii poproś o zdjęcia mocowań i krawędzi – tam zwykle są pęknięcia.</li>
      </ol>
      <h2>Płatność i odbiór</h2>
      <ul>
        <li>Najbezpieczniejszy jest odbiór osobisty ze sprawdzeniem części na miejscu.</li>
        <li>Przy wysyłce wybierz pobranie albo sprzedawcę, którego znasz. Nie wysyłaj zaliczki nieznanemu sprzedawcy, zwłaszcza gdy naciska na szybką płatność.</li>
        <li>Podejrzane ogłoszenie zgłoś przyciskiem „Zgłoś ogłoszenie” w szczegółach.</li>
        <li>Sprzedawca porozumiewa się zwykle po słowacku – języki są podobne, w razie potrzeby napisz krótko i prosto.</li>
        <li>Wszyscy sprzedawcy są ze Słowacji. Wysyłkę do Polski, jej koszt i sposób płatności uzgodnij ze sprzedawcą przed zakupem – sprzedawca nie musi wysyłać za granicę.</li>
      </ul>
      <h2>Twoje prawa</h2>
      <ul>
        <li><b>Kto sprzedaje:</b> przy każdym ogłoszeniu zobaczysz, czy sprzedaje <b>przedsiębiorca</b> (z nazwą firmy, numerem IČO i siedzibą) czy <b>osoba prywatna</b>. Wynika to z oświadczenia sprzedawcy.</li>
        <li><b>Zakup od przedsiębiorcy:</b> masz prawa konsumenta wynikające z prawa UE. Umowa zwykle podlega prawu słowackiemu, ale jeśli sprzedawca kieruje swoją ofertę także do Polski, nie możesz przez to stracić ochrony, którą dają Ci bezwzględnie obowiązujące przepisy polskie. Sprzedawca odpowiada za wady, które ujawnią się w ciągu 24 miesięcy od odbioru; przy części używanej lub regenerowanej może uzgodnić z Tobą krótszy okres, co najmniej 12 miesięcy (zobaczysz to w ogłoszeniu). Wadą nie jest zwykłe zużycie odpowiadające wiekowi części. Przy zakupie na odległość (wysyłka) możesz odstąpić od umowy w ciągu 14 dni bez podania przyczyny; przy odbiorze osobistym nie masz tego prawa.</li>
        <li><b>Zakup od osoby prywatnej:</b> przepisy o ochronie konsumentów nie mają zastosowania (brak odstąpienia w ciągu 14 dni). Sprzedawca odpowiada za wady, o których Cię nie poinformował – zgłoś je jak najszybciej, najpóźniej w ciągu 24 miesięcy od odbioru (od 1. 7. 2027 według nowego słowackiego Kodeksu cywilnego z reguły w ciągu 6 miesięcy). Warunki uzgodnij z góry, najlepiej na piśmie (wystarczy wiadomość).</li>
        <li><b>Spór z przedsiębiorcą</b> rozwiąż najpierw reklamacją u sprzedawcy. Jeśli jej nie uwzględni, możesz zwrócić się do podmiotu alternatywnego rozwiązywania sporów konsumenckich, np. słowackiej inspekcji handlowej (soi.sk), do Europejskiego Centrum Konsumenckiego albo do sądu.</li>
        <li><b>Kupujesz dla firmy lub warsztatu?</b> Wtedy nie jesteś konsumentem – odpowiedzialność za wady regulują przepisy handlowe i umowa ze sprzedawcą.</li>
      </ul>
      <p className="mute">To informacja ogólna, nie porada prawna.</p>
      <h2>Nie znalazłeś części?</h2>
      <p><Link href="/pl/dopyt">Wyślij zapytanie</Link> – sprzedawcy prześlą Ci oferty. Możesz też włączyć w wyszukiwaniu strażnika i przy kolejnej wizycie zobaczysz nowe części.</p>
    </>,
  },
];
