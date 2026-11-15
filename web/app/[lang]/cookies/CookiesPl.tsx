// Polskie tłumaczenie strony /cookies (wiążąca jest wersja słowacka).
import { LegalPage } from "@/components/Legal";
import { CookieSettingsLink } from "@/components/CookieBar";

export default function CookiesPl({ gaOn }: { gaOn: boolean }) {
  return (
    <LegalPage title="Cookies i pamięć przeglądarki" lang="pl" skPath="/cookies">
      <p>autosuciastky.eu <b>nie używa reklamowych plików cookies</b>. Ruch mierzymy przez <b>Google Analytics</b>, ale <b>tylko jeśli się na to zgodzisz</b> – bez zgody kod Google w ogóle się nie wczytuje. Pozostałe dane w przeglądarce są niezbędne do działania usług, o które prosisz (czcionki serwujemy sami, nie z Google).{gaOn ? "" : " Pomiar nie jest jeszcze uruchomiony – jeśli się zgodzisz, zacznie działać dopiero po jego uruchomieniu; do tego czasu kod Google w ogóle się nie wczytuje."}</p>
      <h2>Jak działa zgoda</h2>
      <ul>
        <li><b>Niezbędna pamięć</b> jest zawsze włączona – bez niej nie działałoby logowanie sprzedawcy, ulubione części ani zapisane wyszukiwania.</li>
        <li><b>Narzędzia opcjonalne</b> (np. pomiar ruchu) wczytujemy dopiero po Twojej zgodzie (art. 6 ust. 1 lit. a RODO). Odmowa jest równie prosta jak akceptacja, a bez zgody cała strona działa. Używamy jednego narzędzia opcjonalnego: Google Analytics (Google Ireland Ltd.) bez funkcji reklamowych i bez Google signals. Dane mogą być przekazywane do USA – Google uczestniczy w ramach ochrony danych UE–USA.</li>
        <li>Swój wybór możesz w każdej chwili zmienić lub wycofać: <CookieSettingsLink /> (link jest też w stopce każdej strony). Po wycofaniu zgody usuwamy pliki cookies narzędzi opcjonalnych.</li>
      </ul>
      <h2>Co zapisujemy w Twojej przeglądarce</h2>
      <table className="legal-t lt-ck">
        <thead><tr><th>Nazwa</th><th>Rodzaj</th><th>Do czego służy</th><th>Kategoria</th><th>Jak długo</th></tr></thead>
        <tbody>
          <tr><td>rozoberacka-auth*</td><td>localStorage</td><td>logowanie sprzedawcy lub użytkownika forum (tylko po zalogowaniu)</td><td>niezbędne</td><td>do wylogowania</td></tr>
          <tr><td>rozoberacka-fav</td><td>localStorage</td><td>ulubione ogłoszenia, które oznaczyłeś</td><td>niezbędne (funkcja włączona przez Ciebie)</td><td>dopóki ich nie usuniesz</td></tr>
          <tr><td>rozoberacka-hladania</td><td>localStorage</td><td>zapisane wyszukiwania (strażnik części)</td><td>niezbędne (funkcja włączona przez Ciebie)</td><td>dopóki ich nie usuniesz</td></tr>
          <tr><td>rozoberacka-dopyty</td><td>localStorage</td><td>linki do Twoich zapytań o części, abyś mógł je znowu znaleźć</td><td>niezbędne (funkcja włączona przez Ciebie)</td><td>dopóki ich nie usuniesz</td></tr>
          <tr><td>rozoberacka-moje-auto</td><td>localStorage</td><td>samochód zapisany jako „Mój samochód”, by pokazać do niego części</td><td>niezbędne (funkcja włączona przez Ciebie)</td><td>dopóki go nie usuniesz</td></tr>
          <tr><td>rozoberacka-suhlas</td><td>localStorage</td><td>Twój wybór w ustawieniach cookies i jego data</td><td>niezbędne</td><td>dopóki go nie zmienisz lub nie usuniesz</td></tr>
          <tr><td>rozoberacka-druh</td><td>localStorage</td><td>ostatnio wybrany rodzaj pojazdu przy dodawaniu części – tylko w portalu sprzedawcy</td><td>niezbędne (ustawienie wybrane przez Ciebie)</td><td>dopóki go nie zmienisz lub nie usuniesz</td></tr>
          <tr><td>rz-tel-*, rz-view-*, rz-carview-*</td><td>sessionStorage</td><td>aby odkryty telefon i wyświetlenie części lub pojazdu nie były liczone ponownie</td><td>niezbędne</td><td>do zamknięcia przeglądarki</td></tr>
          <tr><td>_ga</td><td>cookie (Google Analytics)</td><td>rozróżnianie odwiedzających dla statystyk ruchu</td><td>pomiar – tylko za Twoją zgodą</td><td>2 lata</td></tr>
          <tr><td>_ga_*</td><td>cookie (Google Analytics)</td><td>utrzymanie sesji odwiedzin dla statystyk</td><td>pomiar – tylko za Twoją zgodą</td><td>2 lata</td></tr>
          <tr><td>sw.js (service worker)</td><td>skrypt przeglądarki</td><td>dodanie strony do ekranu głównego jako aplikacji i komunikat „brak internetu”; nie zapisuje żadnych danych</td><td>niezbędne</td><td>dopóki go nie usuniesz w ustawieniach przeglądarki</td></tr>
        </tbody>
      </table>
      <p>Odczyt numeru OEM lub VIN ze zdjęcia odbywa się bezpośrednio w Twojej przeglądarce – zdjęcie nigdzie nie jest wysyłane i nic nie jest zapisywane. Kurs złotego (orientacyjne ceny w zł) pobiera nasz serwer z Europejskiego Banku Centralnego – Twoja przeglądarka nie łączy się z nim.</p>
      <p>Dane możesz w każdej chwili usunąć także w ustawieniach przeglądarki (Wyczyść dane witryn). Więcej o przetwarzaniu danych osobowych znajdziesz w <a href="/pl/ochrana-osobnych-udajov">zasadach ochrony danych osobowych</a>.</p>
    </LegalPage>
  );
}
