import CookieBar, { CookieSettingsLink } from "@/components/CookieBar";
import type { Metadata, Viewport } from "next";
// Písmo Inter (balík @fontsource-variable, web ho podáva sám – návštevník nevolá Google, lepšie pre GDPR; má ľ, ť, ď).
// Jedno písmo na všetko (vzhľad C „Bez rečí“, 11. 11. 2026); čísla dielov tučne s rovnakou šírkou číslic.
import "@fontsource-variable/inter";
import "../globals.css";
import Header from "@/components/Header";
import Pwa from "@/components/Pwa";
import Link from "next/link";
import { notFound } from "next/navigation";
import { IconSprite } from "@/components/Icons";
import { IS_DEMO } from "@/lib/data";
import { OPERATOR } from "@/lib/operator";
import { SITE_URL } from "@/lib/seo";
import { CARS_ENABLED } from "@/lib/features";
import { LANGS, lhref, tr, type Lang } from "@/lib/i18n";

// Jazyky: /pl/... poľsky, ostatné slovensky (adresy bez predpony sa vnútorne prepíšu na /sk – next.config.ts).
export function generateStaticParams() { return LANGS.map((lang) => ({ lang })); }

export async function generateMetadata({ params }: { params: Promise<{ lang: string }> }): Promise<Metadata> {
  const pl = (await params).lang === "pl";
  return {
    metadataBase: new URL(SITE_URL),
    title: pl ? { default: "autosuciastky.eu – używane części samochodowe ze Słowacji", template: "%s | autosuciastky.eu" }
      : { default: "autosuciastky.eu – použité autodiely", template: "%s | autosuciastky.eu" },
    description: pl ? "Używane części samochodowe dokładnie do Twojego auta – od sprzedawców ze Słowacji. Szukaj według marki, modelu, silnika i numeru części (OEM), dzwoń bez rejestracji."
      : "Použité autodiely presne na vaše auto. Hľadajte podľa značky, modelu a motorizácie, predajcovi zavoláte bez registrácie.",
    applicationName: "autosuciastky.eu",
    openGraph: { siteName: "autosuciastky.eu", locale: pl ? "pl_PL" : "sk_SK", type: "website" },
    formatDetection: { telephone: false },
    appleWebApp: { capable: true, title: "autosuciastky.eu", statusBarStyle: "default" },
  };
}
export const viewport: Viewport = { width: "device-width", initialScale: 1, viewportFit: "cover",
  themeColor: [{ media: "(prefers-color-scheme: light)", color: "#2b2f36" }, { media: "(prefers-color-scheme: dark)", color: "#2b2f36" }] };

export default async function RootLayout({ children, params }: Readonly<{ children: React.ReactNode; params: Promise<{ lang: string }> }>) {
  const { lang: raw } = await params;
  if (raw !== "sk" && raw !== "pl") notFound();
  const lang = raw as Lang, t = (s: string) => tr(lang, s), h = (x: string) => lhref(lang, x);
  return (
    <html lang={lang}>
      <body>
        <IconSprite />
        <a className="skip" href="#main">{t("Preskočiť na obsah")}</a>
        <Header />
        {IS_DEMO && <div className="demo" role="note">{t("Ukážkový režim – údaje nie sú skutočné")} <span>· {t("inzeráty, predajcovia a telefóny sú vymyslené")}</span></div>}
        {children}
        <footer className="foot2">
          <b>autosuciastky.eu</b>
          {lang === "pl"
            ? <span><b>Portal ogłoszeniowy</b> z częściami samochodowymi od sprzedawców ze Słowacji. Operator {OPERATOR.name} nie sprzedaje towarów, nie sprawdza ich i nie jest stroną umowy sprzedaży. Za ogłoszenia, poprawność danych, dopasowanie części do pojazdu, wady i reklamacje odpowiada sprzedawca – przed zakupem zawsze porównaj numer części (OEM). <Link href={h("/obchodne-podmienky#zodpovednost")}>Odpowiedzialność</Link></span>
            : <span><b>Inzertný portál</b> na autodiely{CARS_ENABLED ? " a havarované vozidlá" : ""}. Prevádzkovateľ {OPERATOR.name} tovar nepredáva, neoveruje ho a nie je stranou kúpnej zmluvy. Za inzeráty, správnosť údajov, zhodu dielu s vozidlom, vady a reklamácie zodpovedá predajca – pred nákupom preto vždy porovnajte číslo dielu (OEM). <Link href="/obchodne-podmienky#zodpovednost">Zodpovednosť</Link></span>}
          <span>{t("Katalóg vozidiel je predbežný (zostavený bez licencovaných dát) a môže obsahovať chyby.")}</span>
          <Pwa />
          <nav className="foot-l" aria-label={t("Pomoc")}>
            {lang === "sk" && <><Link href="/forum">Fórum</Link><Link href="/blog">Blog</Link></>}
            <Link href={h("/navody/oem-cislo")}>{t("Kde nájdem OEM číslo")}</Link><Link href={h("/navody/vin")}>{t("Kde nájdem VIN")}</Link><Link href={h("/navody/bezpecny-nakup")}>{t("Bezpečný nákup")}</Link><Link href={h("/dopyt")}>{t("Dopyt na diel")}</Link>{CARS_ENABLED && lang === "sk" && <Link href="/havarovane-vozidla">Havarované vozidlá</Link>}<Link href="/pre-predajcov">{t("Pre predajcov")}</Link><Link href={h("/ako-zoradujeme")}>{t("Ako zoraďujeme ponuky")}</Link>
          </nav>
          <nav className="foot-l" aria-label={t("Právne informácie")}>
            <a href={h("/obchodne-podmienky")}>{t("Obchodné podmienky")}</a><a href={h("/ochrana-osobnych-udajov")}>{t("Ochrana osobných údajov")}</a><a href={h("/cookies")}>Cookies</a><CookieSettingsLink />
            {OPERATOR.email && <a href={"mailto:" + OPERATOR.email}>{t("Kontakt")}</a>}
          </nav>
          {lang === "pl"
            ? <span>Operator: {OPERATOR.name}, IČO (nr identyfikacyjny) {OPERATOR.ico}{OPERATOR.address ? ", " + OPERATOR.address + ", Słowacja" : ""}{OPERATOR.register ? ", wpisana do rejestru handlowego Sądu Miejskiego Bratysława III" : ""}{OPERATOR.email ? <>, <a href={"mailto:" + OPERATOR.email}>{OPERATOR.email}</a></> : null}{OPERATOR.phone ? <>, tel. <a href={"tel:" + OPERATOR.phone.replace(/\s/g, "")}>{OPERATOR.phone}</a></> : null}. Organ nadzoru: Słowacka Inspekcja Handlowa (Slovenská obchodná inšpekcia), Bajkalská 21/A, 827 99 Bratysława. Koordynator usług cyfrowych: Rada pre mediálne služby (Słowacja).</span>
            : <span>Prevádzkovateľ: {OPERATOR.name}, IČO {OPERATOR.ico}{OPERATOR.address ? ", " + OPERATOR.address : ""}{OPERATOR.register ? ", zapísaná v " + OPERATOR.register.replace(/^Obchodný register/, "Obchodnom registri") : ""}{OPERATOR.email ? <>, <a href={"mailto:" + OPERATOR.email}>{OPERATOR.email}</a></> : null}{OPERATOR.phone ? <>, tel. <a href={"tel:" + OPERATOR.phone.replace(/\s/g, "")}>{OPERATOR.phone}</a></> : null}. Orgán dozoru: Slovenská obchodná inšpekcia, Bajkalská 21/A, 827 99 Bratislava. Koordinátor digitálnych služieb: Rada pre mediálne služby.</span>}
        </footer>
        <CookieBar />
      </body>
    </html>
  );
}
