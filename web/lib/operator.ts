// Údaje prevádzkovateľa portálu. Používajú ich právne stránky, pätička a registrácia.
// Prázdny údaj sa na webe zobrazí ako „doplníme pred spustením“ – pred spustením ho treba vyplniť.
export const OPERATOR = {
  name: "KJ trade s. r. o.",   // presne podľa Obchodného registra (overené 8. 11. 2026)
  ico: "57598142",
  dic: "",
  address: "Kvetná 1505/4D, 900 41 Rovinka",
  register: "Obchodný register Mestského súdu Bratislava III, oddiel: Sro, vložka č. 198932/B",
  email: "autosuciastky.eu@gmail.com",
  phone: "+421 952 121 864",   // telefón prevádzkovateľa – vyžaduje § 4 ods. 1 písm. c) zákona č. 22/2004 Z. z.
  /** Orgán dozoru podľa § 4 ods. 1 písm. e) zákona č. 22/2004 Z. z. (adresa overená vo výročnej správe SOI 2025). */
  supervisor: "Slovenská obchodná inšpekcia, Inšpektorát SOI pre Bratislavský kraj; ústredný inšpektorát: Bajkalská 21/A, 827 99 Bratislava 27",
};
/** Verzia podmienok a zásad. Pri zmene textov zvýšiť – uloží sa pri registrácii predajcu. */
export const TERMS_VERSION = "2026-11-12";
export const fill = (v: string) => v || "údaj doplníme pred spustením";
