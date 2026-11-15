// Polskie tłumaczenie regulaminu (wiążąca jest wersja słowacka na /obchodne-podmienky).
import Link from "next/link";
import { LegalPage, OperatorBox } from "@/components/Legal";
import { OPERATOR, fill } from "@/lib/operator";
import { CARS_ENABLED } from "@/lib/features";

export default function TermsPl() {
  return (
    <LegalPage title="Regulamin" lang="pl" skPath="/obchodne-podmienky">
      <p>Niniejszy regulamin określa zasady korzystania z portalu ogłoszeniowego autosuciastky.eu. Przeglądanie ogłoszeń i kontakt ze sprzedawcami odbywa się bez rejestracji i za darmo. Rejestrując się, sprzedawca potwierdza, że akceptuje regulamin.</p>

      <h2>1. Operator</h2>
      <OperatorBox />
      <p>Punkt kontaktowy dla użytkowników i organów zgodnie z rozporządzeniem (UE) 2022/2065 o usługach cyfrowych: {OPERATOR.email || fill("")}; komunikujemy się po słowacku, wiadomości po polsku również przyjmujemy.</p>

      <h2>2. Co portal robi, a czego nie</h2>
      <ul>
        <li>Portal publikuje ogłoszenia sprzedawców części samochodowych (w tym opon i felg) do samochodów osobowych, pojazdów zabytkowych, dostawczych, ciężarowych, autobusów i motocykli{CARS_ENABLED && <> oraz ogłoszenia całych <b>pojazdów uszkodzonych, niejezdnych lub przeznaczonych na części</b></>}. Pośredniczy jedynie w kontakcie między sprzedawcą a kupującym.</li>
        <li>Operator <b>nie jest sprzedawcą ani stroną</b> umowy sprzedaży. Umowa zawierana jest bezpośrednio między sprzedawcą a kupującym, którzy uzgadniają cenę, płatność, odbiór i reklamację.</li>
        <li>Portal nie przyjmuje płatności i nie wysyła towaru.</li>
        <li>Ogłoszenia publikujemy tylko na tym portalu. Nie przekazujemy ich na inne strony ani do programów partnerskich; wyszukiwarki (np. Google) indeksują jednak publiczne strony portalu.</li>
        <li>Wszystkich sprzedawców traktujemy jednakowo. Operator sam nie sprzedaje na portalu i nie faworyzuje własnych ofert.</li>
        <li>Listę „Pasuje do” tworzymy z danych sprzedawców (własny samochód, „pasuje także do” i ogłoszenia z tym samym numerem OEM). Nie jest to zweryfikowany katalog. Nawet przy tym samym modelu samochodu części różnią się w zależności od silnika, wyposażenia czy roku – przed zakupem porównaj <b>numer części (OEM)</b> z oryginalną częścią.</li>
        <li>Katalog marek, modeli i silników jest pomocą w wyszukiwaniu, przygotowaną bez licencjonowanych danych, i może zawierać błędy.</li>
        <li>Polska wersja portalu wyświetla ogłoszenia sprzedawców ze Słowacji. Nazwy i opisy ogłoszeń mogą być <b>przetłumaczone automatycznie</b> (Google Cloud Translation); tłumaczenie może być niedokładne – wiążący jest oryginalny tekst sprzedawcy, który możesz wyświetlić przyciskiem „Pokaż oryginał”. Ceny w zł są orientacyjne (kurs Europejskiego Banku Centralnego); sprzedawca podaje cenę w euro.</li>
      </ul>

      <h2>3. Przedsiębiorca czy osoba prywatna – oświadczenie sprzedawcy</h2>
      <ul>
        <li>Przy rejestracji i w profilu sprzedawca <b>oświadcza, czy sprzedaje jako przedsiębiorca czy jako osoba prywatna</b>, która nie sprzedaje w ramach działalności gospodarczej. Na podstawie tego oświadczenia portal pokazuje kupującym, kto sprzedaje, i informuje ich o ich prawach (§ 16 słowackiej ustawy nr 108/2024 Z. z. o ochronie konsumenta).</li>
        <li><b>Przedsiębiorca</b> podaje nazwę firmy, numer IČO i siedzibę lub miejsce prowadzenia działalności. Dane te są publiczne, aby kupujący wiedział, z kim zawiera umowę. Bez nich przedsiębiorca nie może opublikować ogłoszenia.</li>
        <li><b>Osoba prywatna</b> sprzedaje tylko okazjonalnie, np. części z własnego samochodu. Kto sprzedaje części <b>stale i w celu osiągnięcia zysku</b> (np. skupuje samochody do rozbiórki), prowadzi działalność i musi zarejestrować się jako przedsiębiorca. Nieprawdziwe oświadczenie może być powodem ukrycia ogłoszeń lub zablokowania konta.</li>
        <li>Operator nie weryfikuje oświadczenia sprzedawcy; za jego prawdziwość odpowiada sprzedawca. Oznaczenie „Zweryfikowany sprzedawca” oznacza, że operator zweryfikował tożsamość sprzedawcy.</li>
        <li>Sprzedawcą może być tylko osoba, która ma co najmniej 18 lat, lub osoba prawna działająca przez osobę upoważnioną.</li>
      </ul>

      <h2>3a. Obowiązki sprzedawcy</h2>
      <ul>
        <li>Sprzedawca podaje prawdziwe dane o sobie i o części, w tym znane wady i uszkodzenia.</li>
        <li>Sprzedaje tylko części, które posiada lub którymi może rozporządzać. Zabronione są części kradzione, części ze zmienionym numerem identyfikacyjnym i rzeczy, których sprzedaży zakazuje prawo.</li>
        <li><b>Przedsiębiorca sprzedający konsumentowi</b> przestrzega przepisów o ochronie konsumentów: odpowiada za wady, które ujawnią się w ciągu 24 miesięcy od odbioru; przy części używanej (także regenerowanej) może uzgodnić z konsumentem krótszy okres, co najmniej 12 miesięcy (§ 619 słowackiego Kodeksu cywilnego) – uzgodniony okres podaje w ogłoszeniu i na dokumencie. Przy sprzedaży na odległość konsument ma prawo odstąpić od umowy w ciągu 14 dni (§ 20 ustawy nr 108/2024 Z. z.). Przy sprzedaży innemu przedsiębiorcy odpowiedzialność za wady regulują słowacki Kodeks handlowy i umowa stron.</li>
        <li><b>Osoba prywatna</b> odpowiada za wady, o których nie poinformowała kupującego (§ 597 i 599 słowackiego Kodeksu cywilnego). Przepisy o ochronie konsumentów nie mają zastosowania do sprzedaży prywatnej.</li>
        <li>Sprzedawca odpowiada za treść ogłoszenia, zdjęcia (muszą być jego lub musi mieć prawo do ich użycia) i za rozpatrzenie reklamacji.</li>
        <li>Prawa autorskie do zdjęć i tekstów pozostają przy sprzedawcy. Publikując ogłoszenie, udziela operatorowi nieodpłatnej, niewyłącznej zgody na ich wyświetlanie na portalu, zmniejszanie i zmianę formatu (np. miniatury) oraz na automatyczne tłumaczenie tekstów na inne języki portalu, na czas, gdy ogłoszenie jest na portalu. Usunięcie ogłoszenia lub konta powoduje wygaśnięcie zgody.</li>
        <li>Sprzedawca nie wysyła kupującym niezamówionej reklamy, a kontaktów kupujących (z wiadomości i zapytań o części) używa tylko do oferty i uzgodnień dotyczących danej części.</li>
        <li>VIN pojazdu na części{CARS_ENABLED ? " lub pojazdu uszkodzonego" : ""}, który sprzedawca wpisuje w portalu, nie jest publiczny; portal nie pokazuje go kupującym.</li>
        <li>Przy oponach i felgach sprzedawca podaje wymiary i parametry (np. szerokość, profil, średnica, rozstaw śrub, ET) zgodnie z rzeczywistością, a przy oponach także głębokość bieżnika i rok produkcji (DOT), jeśli je zna.</li>
        <li>Dostęp do konta chroni hasłem i nikomu go nie udostępnia.</li>
      </ul>

      {CARS_ENABLED && <>
      <h2>3a1. Sprzedaż całych pojazdów</h2>
      <ul>
        <li>Całe pojazdy sprzedawane są na portalu tylko jako <b>uszkodzone, niejezdne, po pożarze lub powodzi albo przeznaczone na części</b>.</li>
        <li>Zabronione są pojazdy kradzione, pojazdy ze zmienionym numerem VIN i pojazdy, których sprzedaży zakazuje prawo. Sprzedawca na życzenie umożliwi kupującemu porównanie VIN na pojeździe z dokumentami.</li>
        <li>Sprzedawca rzetelnie podaje stan, zakres uszkodzeń, przebieg i dokumenty. Pojazd bez dokumentów oferowany jest tylko na części.</li>
        <li>Pojazd będący odpadem (pojazd wycofany z eksploatacji) można przekazać tylko podmiotowi uprawnionemu do jego przetwarzania zgodnie ze słowacką ustawą nr 79/2015 Z. z. o odpadach. Za przestrzeganie tych zasad i obowiązki wobec urzędów odpowiadają sprzedawca i kupujący, nie operator.</li>
      </ul>
      </>}

      <h2>3b. Dane sprzedawcy i dostęp do nich</h2>
      <ul>
        <li><b>Sprzedawca widzi</b> swoje ogłoszenia, ich wyświetlenia i liczbę odkryć telefonu, wiadomości i zapytania kupujących (imię i kontakt podane przez kupującego) oraz oceny. Kontaktów kupujących może używać tylko do uzgodnień dotyczących danej części.</li>
        <li><b>Operator ma dostęp</b> do wszystkich danych, które sprzedawcy i kupujący wprowadzają na portalu, i używa ich tylko do prowadzenia portalu, ochrony przed nadużyciami i wypełniania obowiązków prawnych. Zbiorcze statystyki (np. liczbę ogłoszeń) może publikować tylko bez danych osobowych.</li>
        <li>Danych sprzedawców ani kupujących <b>nie sprzedajemy i nie przekazujemy osobom trzecim</b> poza podmiotami przetwarzającymi i organami zgodnie z <Link href="/pl/ochrana-osobnych-udajov">zasadami ochrony danych osobowych</Link>.</li>
        <li>Sprzedawca może w każdej chwili pobrać swoje dane. Po usunięciu konta dane są usuwane i dostęp do nich nie jest już możliwy.</li>
      </ul>

      <h2>3c. Kolejność ofert</h2>
      <p>Według czego sortujemy ogłoszenia w wynikach wyszukiwania (w tym wyróżnienie TOP), opisuje strona <Link href="/pl/ako-zoradujeme">Jak sortujemy oferty</Link>.</p>

      <h2>4. Zgłaszanie treści i moderacja</h2>
      <ul>
        <li>Każdy może zgłosić ogłoszenie przyciskiem „Zgłoś ogłoszenie” w szczegółach. W zgłoszeniu podaje powód i wyjaśnienie, opcjonalnie imię i e-mail, oraz potwierdza, że podaje dane w dobrej wierze. Przyjęcie zgłoszenia potwierdzamy od razu na stronie. Zgłoszenie rozpatrujemy bez zbędnej zwłoki, bezstronnie i starannie; jeśli zgłaszający podał kontakt, informujemy go o decyzji.</li>
        <li>O ukryciu ogłoszenia lub zablokowaniu konta <b>zawsze decyduje człowiek</b> (administrator portalu). Automatycznie ograniczamy tylko liczbę odkryć telefonu, wiadomości, zapytań i zgłoszeń z jednego połączenia (ochrona przed robotami); treści ogłoszeń nie oceniamy automatycznie.</li>
        <li>Ogłoszenie naruszające prawo lub niniejszy regulamin możemy ukryć. Sprzedawca najpóźniej w chwili ukrycia zobaczy w portalu, że ogłoszenie ukrył administrator, oraz konkretny powód. Może się od decyzji odwołać e-mailem na adres operatora; jego wniosek bezpłatnie i ponownie rozpatrzy człowiek. Może też zwrócić się do sądu lub do certyfikowanego organu pozasądowego rozstrzygania sporów zgodnie z art. 21 rozporządzenia (UE) 2022/2065, a skargę na naruszenie tego rozporządzenia złożyć koordynatorowi ds. usług cyfrowych – na Słowacji jest nim Rada pre mediálne služby (<a href="https://www.rpms.sk" rel="noreferrer">rpms.sk</a>).</li>
        <li>Przy powtarzającym się lub poważnym naruszeniu (oszustwo, części kradzione) możemy zablokować konto; powód podamy sprzedawcy e-mailem lub w portalu.</li>
        <li>Jeśli uzyskamy informacje o przestępstwie zagrażającym życiu lub bezpieczeństwu osób, powiadomimy organy ścigania.</li>
      </ul>

      <h2>4a. Ocena sprzedawców</h2>
      <ul>
        <li>Sprzedawcę może ocenić tylko kupujący, któremu sprzedawca wysłał ofertę na jego zapytanie o część. Ocena dodawana jest z prywatnej strony zapytania i wyświetla się z imieniem kupującego.</li>
        <li>Ocena musi być prawdziwa i rzeczowa, bez obelg i danych osobowych. Ocen nie kontrolujemy z góry i ich nie sprzedajemy; na kolejność ani średnią nie wpływa płatność.</li>
        <li>Ocenę naruszającą te zasady administrator może ukryć. Ukryta ocena nie jest wliczana do średniej.</li>
      </ul>

      <h2 id="forum">4b. Forum</h2>
      <p>Forum jest dostępne tylko w słowackiej wersji portalu; jego zasady opisuje część 4b <Link href="/obchodne-podmienky#forum" hrefLang="sk">słowackiego regulaminu</Link>.</p>

      <h2>5. Opłaty</h2>
      <p>Rejestracja, ogłoszenia i wyróżnienie TOP (maksymalnie 3 ogłoszenia jednocześnie na 30 dni) są w okresie próbnym bezpłatne. Jeśli wprowadzimy płatne usługi, ogłosimy to z wyprzedzeniem i bez zgody sprzedawcy nic nie będzie płatne. Dla kupujących portal jest zawsze bezpłatny.</p>

      <h2 id="zodpovednost">6. Odpowiedzialność – portal jest tylko ogłoszeniowy</h2>
      <ul>
        <li>autosuciastky.eu to <b>portal ogłoszeniowy</b>. Operator {OPERATOR.name} przechowuje i wyświetla ogłoszenia dodawane przez sprzedawców (usługa „hostingu” zgodnie z art. 6 rozporządzenia (UE) 2022/2065). Nie sprzedaje, nie kupuje ani nie magazynuje części i pojazdów, nie weryfikuje ich stanu ani pochodzenia i nie jest stroną umowy sprzedaży.</li>
        <li>Za treść ogłoszenia, poprawność danych (również numeru części, zgodności z pojazdem, parametrów, przebiegu i dokumentów), za wady towaru, <b>reklamacje</b>, zwrot pieniędzy, odstąpienie od umowy i dostawę <b>odpowiada sprzedawca</b>. Reklamację i inne roszczenia z zakupu kupujący zgłasza bezpośrednio sprzedawcy.</li>
        <li>Operator nie odpowiada zatem za błędy w ogłoszeniach i w ich automatycznym tłumaczeniu, za jakość i wady części i pojazdów, za to, czy część pasuje do pojazdu kupującego, ani za przebieg i skutki transakcji między sprzedawcą a kupującym – w zakresie dozwolonym przez przepisy prawa. Jeśli dowie się o niezgodnym z prawem ogłoszeniu (np. ze zgłoszenia), bez zbędnej zwłoki je oceni i ewentualnie ukryje.</li>
        <li>Nie wysyłaj zaliczek nieznanym sprzedawcom i obejrzyj część lub pojazd przed zapłatą. Staramy się, by portal działał bez przerw, nie gwarantujemy jednak nieprzerwanej dostępności.</li>
      </ul>

      <h2>7. Usunięcie konta</h2>
      <p>Sprzedawca może w każdej chwili usunąć konto w portalu. Usuwane są jego ogłoszenia, zdjęcia, wiadomości i dane osobowe zgodnie z <Link href="/pl/ochrana-osobnych-udajov">zasadami ochrony danych osobowych</Link>.</p>
      <p>Operator może wypowiedzieć umowę ze sprzedawcą (usunąć jego konto) z uzasadnieniem i z okresem wypowiedzenia co najmniej 30 dni. Bez okresu wypowiedzenia tylko wtedy, gdy nakazuje mu to prawo lub decyzja organu albo gdy sprzedawca wielokrotnie narusza regulamin.</p>

      <h2>8. Postanowienia końcowe</h2>
      <ul>
        <li>Regulamin podlega prawu Republiki Słowackiej. Nie pozbawia to konsumenta ochrony, którą zapewniają mu bezwzględnie obowiązujące przepisy państwa jego zwykłego pobytu.</li>
        <li>Konsument może zwrócić się w sprawie sporu także do podmiotu alternatywnego rozwiązywania sporów konsumenckich zgodnie ze słowacką ustawą nr 391/2015 Z. z., zwłaszcza do Słowackiej Inspekcji Handlowej (<a href="https://www.soi.sk" rel="noreferrer">soi.sk</a>), a przy sporze transgranicznym do Europejskiego Centrum Konsumenckiego (w Polsce: <a href="https://konsument.gov.pl" rel="noreferrer">konsument.gov.pl</a>). Najpierw jednak napisz do nas – większość spraw rozwiążemy od razu.</li>
        <li>Od 1. 7. 2027 dotychczasowy słowacki Kodeks cywilny zastępuje nowy Kodeks cywilny (ustawa nr 260/2026 Z. z.). Odwołania do przepisów w regulaminie odnoszą się wtedy do odpowiednich przepisów nowej ustawy.</li>
        <li>O zmianie regulaminu informujemy sprzedawców e-mailem co najmniej 15 dni wcześniej. Jeśli się nie zgadzają, mogą usunąć konto. Zmiany nie działają wstecz.</li>
        <li>Skargi i wnioski sprzedawców i kupujących rozpatrujemy bezpłatnie e-mailem na adres operatora. Organem nadzoru w zakresie handlu elektronicznego i ochrony konsumentów jest Słowacka Inspekcja Handlowa; w zakresie ochrony danych osobowych Úrad na ochranu osobných údajov SR; w zakresie rozporządzenia (UE) 2022/2065 Rada pre mediálne služby jako koordynator ds. usług cyfrowych.</li>
      </ul>
    </LegalPage>
  );
}
