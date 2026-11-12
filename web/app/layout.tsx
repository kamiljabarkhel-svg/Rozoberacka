import CookieBar, { CookieSettingsLink } from "@/components/CookieBar";
import type { Metadata, Viewport } from "next";
// Písmo Inter (balík @fontsource-variable, web ho podáva sám – návštevník nevolá Google, lepšie pre GDPR; má ľ, ť, ď).
// Jedno písmo na všetko (vzhľad C „Bez rečí“, 11. 11. 2026); čísla dielov tučne s rovnakou šírkou číslic.
import "@fontsource-variable/inter";
import "./globals.css";
import Header from "@/components/Header";
import Pwa from "@/components/Pwa";
import Link from "next/link";
import { IconSprite } from "@/components/Icons";
import { IS_DEMO } from "@/lib/data";
import { OPERATOR } from "@/lib/operator";
import { SITE_URL } from "@/lib/seo";
import { CARS_ENABLED } from "@/lib/features";


export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: { default: "autosuciastky.eu – použité autodiely", template: "%s | autosuciastky.eu" },
  description: "Použité autodiely presne na vaše auto. Hľadajte podľa značky, modelu a motorizácie, predajcovi zavoláte bez registrácie.",
  applicationName: "autosuciastky.eu",
  openGraph: { siteName: "autosuciastky.eu", locale: "sk_SK", type: "website" },
  formatDetection: { telephone: false },
  appleWebApp: { capable: true, title: "autosuciastky.eu", statusBarStyle: "default" },
};
export const viewport: Viewport = { width: "device-width", initialScale: 1, viewportFit: "cover",
  themeColor: [{ media: "(prefers-color-scheme: light)", color: "#2b2f36" }, { media: "(prefers-color-scheme: dark)", color: "#2b2f36" }] };

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="sk">
      <body>
        <IconSprite />
        <a className="skip" href="#main">Preskočiť na obsah</a>
        <Header />
        {IS_DEMO && <div className="demo" role="note">Ukážkový režim – údaje nie sú skutočné <span>· inzeráty, predajcovia a telefóny sú vymyslené</span></div>}
        {children}
        <footer className="foot2">
          <b>autosuciastky.eu</b>
          <span><b>Inzertný portál</b> na autodiely{CARS_ENABLED ? " a havarované vozidlá" : ""}. Prevádzkovateľ {OPERATOR.name} tovar nepredáva, neoveruje ho a nie je stranou kúpnej zmluvy. Za inzeráty, správnosť údajov, zhodu dielu s vozidlom, vady a reklamácie zodpovedá predajca – pred nákupom preto vždy porovnajte číslo dielu (OEM). <Link href="/obchodne-podmienky#zodpovednost">Zodpovednosť</Link></span>
          <span>Katalóg vozidiel je predbežný (zostavený bez licencovaných dát) a môže obsahovať chyby.</span>
          <Pwa />
          <nav className="foot-l" aria-label="Pomoc">
            <Link href="/blog">Blog</Link><Link href="/navody/oem-cislo">Kde nájdem OEM číslo</Link><Link href="/navody/vin">Kde nájdem VIN</Link><Link href="/navody/bezpecny-nakup">Bezpečný nákup</Link><Link href="/dopyt">Dopyt na diel</Link>{CARS_ENABLED && <Link href="/havarovane-vozidla">Havarované vozidlá</Link>}<Link href="/pre-predajcov">Pre predajcov</Link><Link href="/ako-zoradujeme">Ako zoraďujeme ponuky</Link>
          </nav>
          <nav className="foot-l" aria-label="Právne informácie">
            <a href="/obchodne-podmienky">Obchodné podmienky</a><a href="/ochrana-osobnych-udajov">Ochrana osobných údajov</a><a href="/cookies">Cookies</a><CookieSettingsLink />
            {OPERATOR.email && <a href={"mailto:" + OPERATOR.email}>Kontakt</a>}
          </nav>
          <span>Prevádzkovateľ: {OPERATOR.name}, IČO {OPERATOR.ico}{OPERATOR.address ? ", " + OPERATOR.address : ""}{OPERATOR.register ? ", zapísaná v " + OPERATOR.register.replace(/^Obchodný register/, "Obchodnom registri") : ""}{OPERATOR.email ? <>, <a href={"mailto:" + OPERATOR.email}>{OPERATOR.email}</a></> : null}{OPERATOR.phone ? <>, tel. <a href={"tel:" + OPERATOR.phone.replace(/\s/g, "")}>{OPERATOR.phone}</a></> : null}. Orgán dozoru: Slovenská obchodná inšpekcia, Bajkalská 21/A, 827 99 Bratislava. Koordinátor digitálnych služieb: Rada pre mediálne služby.</span>
        </footer>
        <CookieBar />
      </body>
    </html>
  );
}
