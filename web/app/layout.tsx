import type { Metadata, Viewport } from "next";
// Písma: balíky @fontsource, web ich podáva sám (návštevník nevolá Google – lepšie pre GDPR).
import "@fontsource/sora/600.css";
import "@fontsource/sora/700.css";
import "@fontsource/sora/800.css";
import "@fontsource/manrope/500.css";
import "@fontsource/manrope/600.css";
import "@fontsource/manrope/700.css";
import "@fontsource/manrope/800.css";
import "@fontsource/ibm-plex-mono/500.css";
import "@fontsource/ibm-plex-mono/600.css";
import "./globals.css";
import Header from "@/components/Header";
import { IconSprite } from "@/components/Icons";
import { IS_DEMO } from "@/lib/data";


export const metadata: Metadata = {
  title: "Rozoberačka – použité autodiely",
  description: "Použité autodiely presne na vaše auto. Hľadajte podľa značky, modelu a motorizácie, predajcovi zavoláte bez registrácie.",
};
export const viewport: Viewport = { width: "device-width", initialScale: 1, viewportFit: "cover" };

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
          <b>Rozoberačka</b>
          <span>Inzertný portál na použité autodiely. Portál sprostredkúva inzerciu a nie je účastníkom predaja. Za správnosť údajov a zhodu dielu s vozidlom zodpovedá predajca, pred nákupom preto vždy porovnajte OEM číslo.</span>
          <span>Katalóg áut je zatiaľ predbežný (6 značiek) a môže obsahovať chyby.</span>
        </footer>
      </body>
    </html>
  );
}
