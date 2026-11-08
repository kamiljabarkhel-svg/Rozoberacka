// Údaje prevádzkovateľa portálu. Používajú ich právne stránky, pätička a registrácia.
// Prázdny údaj sa na webe zobrazí ako „doplníme pred spustením“ – pred spustením ho treba vyplniť.
export const OPERATOR = {
  name: "KJ trade s. r. o.",   // presne podľa Obchodného registra (overené 8. 11. 2026)
  ico: "57598142",
  dic: "",
  address: "Kvetná 1505/4D, 900 41 Rovinka",
  register: "Obchodný register Mestského súdu Bratislava III, oddiel: Sro, vložka č. 198932/B",
  email: "autosuciastky24@gmail.com",
};
/** Verzia podmienok a zásad. Pri zmene textov zvýšiť – uloží sa pri registrácii predajcu. */
export const TERMS_VERSION = "2026-11-07";
export const fill = (v: string) => v || "údaj doplníme pred spustením";
