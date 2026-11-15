// Polskie tłumaczenie zasad ochrony danych (wiążąca jest wersja słowacka na /ochrana-osobnych-udajov).
import { LegalPage, OperatorBox } from "@/components/Legal";
import { OPERATOR, fill } from "@/lib/operator";
import { CARS_ENABLED } from "@/lib/features";

export default function PrivacyPl({ ga, gaOn, ts }: { ga: boolean; gaOn: boolean; ts: boolean }) {
  const notYet = gaOn ? "" : " Pomiar nie jest jeszcze uruchomiony – jeśli się zgodzisz, zacznie działać dopiero po jego uruchomieniu; do tego czasu kod Google w ogóle się nie wczytuje.";
  return (
    <LegalPage title="Ochrona danych osobowych" lang="pl" skPath="/ochrana-osobnych-udajov">
      <p>Wyjaśniamy tu, jakie dane osobowe przetwarzamy na portalu autosuciastky.eu, dlaczego, jak długo i jakie masz prawa. Postępujemy zgodnie z rozporządzeniem (UE) 2016/679 (RODO) i słowacką ustawą nr 18/2018 Z. z. o ochronie danych osobowych.</p>

      <h2 id="kontakt">1. Kto przetwarza Twoje dane</h2>
      <OperatorBox />
      <p>Nie wyznaczyliśmy inspektora ochrony danych, prawo tego od nas nie wymaga. Ze wszystkimi pytaniami dotyczącymi danych osobowych pisz na {OPERATOR.email || fill("")}.</p>

      <h2>2. Jakie dane, w jakim celu i na jakiej podstawie</h2>
      <table className="legal-t lt-gdpr">
        <thead><tr><th>Kogo dotyczy</th><th>Dane</th><th>Cel</th><th>Podstawa prawna</th><th>Jak długo</th></tr></thead>
        <tbody>
          <tr><td>Sprzedawca</td><td>e-mail, hasło (przechowywane tylko jako nieczytelny skrót), nazwa lub imię, oświadczenie o typie sprzedawcy (przedsiębiorca / osoba prywatna) i jego czas, miasto, telefon, czas akceptacji regulaminu</td><td>konto sprzedawcy i publikowanie ogłoszeń</td><td>umowa (art. 6 ust. 1 lit. b RODO)</td><td>do usunięcia konta</td></tr>
          <tr><td>Sprzedawca – przedsiębiorca</td><td>nazwa firmy, IČO, siedziba lub miejsce prowadzenia działalności</td><td>ujawnienie tożsamości przedsiębiorcy kupującym i informacja, czy sprzedaje przedsiębiorca</td><td>obowiązek prawny (art. 6 ust. 1 lit. c RODO; § 5 i § 16 ustawy nr 108/2024 Z. z.)</td><td>do usunięcia konta; osoba prywatna tych danych nie podaje</td></tr>
          <tr><td>Sprzedawca</td><td>ogłoszenia, zdjęcia, telefon w ogłoszeniu, liczba wyświetleń i odkryć telefonu</td><td>publikacja ogłoszenia i statystyki dla sprzedawcy</td><td>umowa</td><td>do usunięcia ogłoszenia lub konta</td></tr>
          <tr id="preklady"><td>Sprzedawca</td><td>nazwa i opis ogłoszenia (bez telefonów i e-maili)</td><td>automatyczne tłumaczenie na język polski, aby ogłoszenie zrozumieli kupujący z Polski</td><td>umowa – część publikacji ogłoszenia (art. 6 ust. 1 lit. b)</td><td>tłumaczenie usuwane jest razem z ogłoszeniem; po zmianie tekstu tłumaczy się go ponownie</td></tr>
          <tr><td>Kupujący, który pisze do sprzedawcy</td><td>imię, telefon lub e-mail, treść wiadomości, odpowiedzi w rozmowie ze sprzedawcą, skrót adresu IP przy odpowiedzi</td><td>doręczenie wiadomości sprzedawcy; jeśli podasz e-mail, doręczenie odpowiedzi sprzedawcy e-mailem z adresu portalu z linkiem do rozmowy; ochrona przed nadużyciami</td><td>Twoja prośba o kontakt (art. 6 ust. 1 lit. b) i nasz prawnie uzasadniony interes w ochronie przed nadużyciami (lit. f)</td><td>12 miesięcy od ostatniej wiadomości w rozmowie; skrót IP 3 dni</td></tr>
          <tr><td>Kupujący, który wysyła zapytanie o część</td><td>imię, telefon lub e-mail, samochód (marka, model, rocznik, opcjonalnie VIN), szukana część, uwaga, miasto, skrót IP</td><td>pokazanie zapytania zarejestrowanym sprzedawcom, aby przesłali Ci ofertę; ochrona przed spamem</td><td>Twoja zgoda (art. 6 ust. 1 lit. a RODO), którą możesz w każdej chwili wycofać; ochrona przed nadużyciami – prawnie uzasadniony interes (lit. f)</td><td>zapytanie jest ważne 30 dni, usuwane po 60 dniach razem z ofertami</td></tr>
          <tr><td>Sprzedawca</td><td>e-mail, marki, które sprzedaje, zapis wysłanych powiadomień</td><td>e-mail o nowym zapytaniu kupującego na markę, którą sprzedaje (maks. 20 dziennie; bez kontaktu kupującego)</td><td>umowa – część usługi dla sprzedawców; można to wyłączyć w profilu</td><td>zapis usuwany razem z zapytaniem (60 dni)</td></tr>
          <tr><td>Sprzedawca</td><td>pojazdy na części – pojazdy, które rozbiera (marka, model, rocznik, przebieg, kolor, VIN), oferty na zapytania</td><td>ewidencja części z jednego pojazdu, oferty dla kupujących</td><td>umowa</td><td>do usunięcia przez sprzedawcę lub usunięcia konta; VIN widzi tylko sprzedawca</td></tr>
          {CARS_ENABLED && <tr><td>Sprzedawca pojazdu uszkodzonego</td><td>ogłoszenie pojazdu, telefon, opcjonalnie VIN</td><td>publikacja ogłoszenia pojazdu; VIN tylko do ewidencji sprzedawcy</td><td>umowa</td><td>do usunięcia ogłoszenia lub konta</td></tr>}
          <tr id="strazca"><td>Kupujący, który włączy powiadomienie e-mailem (strażnik)</td><td>e-mail, zapisane wyszukiwanie (samochód, część, filtry), czas zgody i potwierdzenia, skrót IP</td><td>raz dziennie wysłać nowe części pasujące do wyszukiwania; ochrona przed nadużyciami</td><td>Twoja zgoda (art. 6 ust. 1 lit. a RODO) potwierdzona kliknięciem linku w e-mailu; możesz ją wycofać linkiem w każdym e-mailu</td><td>niepotwierdzone 3 dni, potwierdzone do rezygnacji, maks. 6 miesięcy; skrót IP 3 dni</td></tr>
          <tr><td>Kupujący, który oceni sprzedawcę</td><td>liczba gwiazdek, tekst, imię z zapytania</td><td>publikacja oceny na stronie sprzedawcy</td><td>Twoja zgoda (art. 6 ust. 1 lit. a) – ocenę dodajesz dobrowolnie</td><td>do usunięcia konta sprzedawcy lub na Twoje żądanie</td></tr>
          <tr><td>Sprzedawca</td><td>oceny od kupujących i ich średnia</td><td>informacja dla kupujących na stronie sprzedawcy</td><td>prawnie uzasadniony interes kupujących i operatora w wiarygodnych ogłoszeniach (art. 6 ust. 1 lit. f)</td><td>do usunięcia konta</td></tr>
          <tr><td>Każdy, kto zgłosi ogłoszenie</td><td>powód, tekst, opcjonalnie kontakt</td><td>sprawdzenie zgłoszenia</td><td>prawnie uzasadniony interes i obowiązki z rozporządzenia (UE) 2022/2065 (art. 6 ust. 1 lit. c i f)</td><td>12 miesięcy po rozpatrzeniu</td></tr>
          <tr><td>Każdy odwiedzający</td><td>skrót adresu IP tworzony tajnym kluczem zmienianym co miesiąc (samego adresu IP nie zapisujemy)</td><td>ochrona przed robotami i spamem, liczenie wyświetleń bez duplikatów</td><td>prawnie uzasadniony interes (art. 6 ust. 1 lit. f)</td><td>3 dni; przy zgłoszeniu 30 dni</td></tr>
          <tr><td>Każdy odwiedzający</td><td>techniczne logi serwera (adres IP, czas, przeglądarka) u dostawców hostingu</td><td>działanie i bezpieczeństwo strony</td><td>prawnie uzasadniony interes</td><td>według warunków dostawcy, zwykle od dni do tygodni</td></tr>
          <tr><td>Administrator portalu</td><td>zapis działań administratora (ukrycie ogłoszenia, weryfikacja sprzedawcy)</td><td>kontrola i udokumentowanie interwencji</td><td>prawnie uzasadniony interes i rozporządzenie o usługach cyfrowych</td><td>3 lata</td></tr>
        </tbody>
      </table>
      <p>Forum jest dostępne tylko po słowacku – przetwarzanie danych użytkowników forum opisuje <a href="/ochrana-osobnych-udajov#forum" hrefLang="sk">wersja słowacka</a>.</p>
      <p>Dane sprzedawcy będące częścią ogłoszenia (nazwa lub imię, czy jest przedsiębiorcą czy osobą prywatną, miasto i telefon w ogłoszeniu) są publiczne, a publiczne strony portalu indeksują także wyszukiwarki (np. Google). U przedsiębiorcy publiczne są też IČO i siedziba, bo prawo wymaga, by kupujący wiedział, z kim zawiera umowę. Telefon wyświetla się dopiero po kliknięciu „Pokaż telefon”, nie ma go w kodzie strony, a liczba odkryć z jednego połączenia jest ograniczona.</p>
      <p><b>Czy musisz podać dane?</b> Bez e-maila i hasła nie założysz konta sprzedawcy; bez imienia, miasta i telefonu nie opublikujesz ogłoszenia (wymóg umowny). IČO i siedzibę przedsiębiorcy wymaga prawo. Kupujący nie musi podawać niczego – bez kontaktu sprzedawca nie może jednak odpowiedzieć.</p>
      <p>Przy wgrywaniu zdjęcia strona usuwa ukryte dane pliku, w tym lokalizację GPS.</p>
      <p>Kupujący się nie rejestruje. Ulubione ogłoszenia, zapisane wyszukiwania i „Mój samochód” są zapisywane tylko w Twojej przeglądarce i ich nie widzimy.</p>
      <p>Przy fotografowaniu numeru OEM lub VIN tekst ze zdjęcia odczytywany jest bezpośrednio na Twoim urządzeniu. Zdjęcie nigdzie nie jest wysyłane ani zapisywane.</p>
      <p>Orientacyjne ceny w złotych liczymy według kursu Europejskiego Banku Centralnego, który pobiera nasz serwer – Twoja przeglądarka się z EBC nie łączy i nie są przekazywane żadne dane osobowe.</p>
      <p><b>Mapa na stronie sprzedawcy.</b> Mapa z przybliżoną lokalizacją (miasto sprzedawcy) wczytuje się z OpenStreetMap (OpenStreetMap Foundation, Wielka Brytania – kraj z decyzją UE stwierdzającą odpowiedni stopień ochrony) <b>dopiero po kliknięciu „Pokaż na mapie”</b>. Wtedy Twoja przeglądarka łączy się z www.openstreetmap.org, która widzi Twój adres IP i dane przeglądarki.</p>

      <h2>3. Komu przekazujemy dane</h2>
      <ul>
        <li><b>Sprzedawcy</b>: imię, kontakt i treść Twojej wiadomości otrzymuje tylko sprzedawca, do którego piszesz.</li>
        <li><b>Zarejestrowanym sprzedawcom</b>: zapytanie o część wraz z imieniem i kontaktem widzą zalogowani sprzedawcy na portalu (nie publicznie), aby mogli przesłać Ci ofertę.</li>
        <li><b>Kupującemu, który wysłał zapytanie</b>: ofertę sprzedawcy widzi tylko ten kupujący pod swoim niepublicznym adresem zapytania.</li>
        <li><b>Podmiotom przetwarzającym</b>, które zapewniają nam technikę: Supabase Inc. (baza danych, logowanie i zdjęcia; dane przechowywane w centrum danych we Frankfurcie, Niemcy), dostawca hostingu Vercel Inc. (wyświetlanie strony; serwery we Frankfurcie), Brevo (Sendinblue SAS, Francja – wysyłanie e-maili) oraz DeepL SE (Kolonia, Niemcy; bezpłatna usługa DeepL API Free) – automatyczne tłumaczenie nazwy i opisu ogłoszenia na język polski. Wysyłamy tylko tekst nazwy i opisu, który i tak jest publiczny na portalu; numery telefonów i e-maile z niego usuwamy. W ramach bezpłatnej usługi DeepL może przez ograniczony czas przechowywać te teksty i wykorzystywać je do ulepszania swojego tłumacza.{ga && " Za zgodą odwiedzającego także Google Ireland Ltd. (Google Analytics – pomiar ruchu, część 6)."}{ts && " Cloudflare, Inc. (Turnstile – ochrona rejestracji, logowania i odzyskiwania hasła przed robotami; przetwarza adres IP i dane techniczne przeglądarki, bez celów reklamowych; nasz prawnie uzasadniony interes w bezpieczeństwie, art. 6 ust. 1 lit. f)."}</li>
        <li><b>Organom władzy publicznej</b>, jeśli wymaga tego prawo.</li>
      </ul>
      <p>{ts ? "Supabase, Vercel i Cloudflare" : "Supabase i Vercel"} to spółki z siedzibą w USA. Jeśli w ramach ich usług dochodzi do przekazania danych poza UE, odbywa się to na podstawie standardowych klauzul umownych Komisji Europejskiej lub ram ochrony danych UE–USA. Danych nie sprzedajemy i nie używamy do reklamy.</p>

      <h2>4. Twoje prawa</h2>
      <ul>
        <li>dostęp do danych i ich przenoszenie,</li>
        <li>sprostowanie nieprawidłowych danych – w portalu lub e-mailem,</li>
        <li>usunięcie – sprzedawca usuwa konto w portalu; kupujący pisze do nas, którą wiadomość lub zapytanie mamy usunąć (zapytanie możesz też sam zamknąć na jego stronie),</li>
        <li>wycofanie zgody – zapytanie usuniemy na Twoją prośbę; powiadomienie e-mailem anulujesz linkiem w każdym e-mailu; wycofanie zgody nie wpływa na zgodność z prawem wcześniejszego przetwarzania,</li>
        <li>ograniczenie przetwarzania i sprzeciw wobec przetwarzania na podstawie prawnie uzasadnionego interesu,</li>
        <li>skarga do organu nadzorczego – na Słowacji Úrad na ochranu osobných údajov Slovenskej republiky, Hraničná 12, 820 07 Bratislava (<a href="https://dataprotection.gov.sk" rel="noreferrer">dataprotection.gov.sk</a>), w Polsce Prezes Urzędu Ochrony Danych Osobowych (<a href="https://uodo.gov.pl" rel="noreferrer">uodo.gov.pl</a>).</li>
      </ul>
      <p>Na żądanie odpowiemy bez zbędnej zwłoki, najpóźniej w ciągu miesiąca. Nie stosujemy zautomatyzowanego podejmowania decyzji ani profilowania wywołującego skutki prawne.</p>

      <h2>5. Bezpieczeństwo</h2>
      <p>Dostęp do danych chroni baza danych regułami dla każdego wiersza (sprzedawca widzi tylko swoje dane), komunikacja jest szyfrowana (HTTPS), hasła przechowywane są tylko jako skrót, a działania administratora są rejestrowane.</p>

      <h2>6. Cookies</h2>
      {ga && <p><b>Pomiar ruchu (Google Analytics).</b> Jeśli wyrazisz zgodę na pasku cookies, mierzymy ruch narzędziem Google Analytics 4 firmy Google Ireland Ltd. (Gordon House, Barrow Street, Dublin 4, Irlandia). Przetwarzane są dane o wizycie: odwiedzone strony, skąd przyszedłeś, przybliżona lokalizacja (kraj, miasto), typ urządzenia i przeglądarki oraz identyfikator w cookies _ga. Cel: poznać sposób korzystania ze strony i ją ulepszać. Podstawa prawna: Twoja zgoda (art. 6 ust. 1 lit. a RODO), którą możesz w każdej chwili wycofać w „Ustawieniach cookies” w stopce. Funkcje reklamowe i Google signals mamy wyłączone. Dane mogą być przekazywane do USA na podstawie ram ochrony danych UE–USA. Dane w Google Analytics przechowujemy 14 miesięcy.{notYet}</p>}
      <p>Szczegóły i lista wszystkich danych znajdują się na stronie <a href="/pl/cookies">Cookies</a>.</p>
    </LegalPage>
  );
}
