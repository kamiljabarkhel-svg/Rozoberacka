// Údaje prevádzkovateľa portálu. Používajú ich právne stránky, pätička a registrácia.
// Prázdny údaj sa na webe zobrazí ako „doplníme pred spustením“ – pred spustením ho treba vyplniť.
export const OPERATOR = {
  name: "KJ Trade s.r.o.",
  ico: "57598142",
  dic: "",
  address: "",          // sídlo podľa obchodného registra
  register: "",         // napr. „Obchodný register Mestského súdu Bratislava III, oddiel Sro, vložka č. …“
  email: "",            // kontakt pre ochranu osobných údajov a nahlásenia
};
/** Verzia podmienok a zásad. Pri zmene textov zvýšiť – uloží sa pri registrácii predajcu. */
export const TERMS_VERSION = "2026-11-03";
export const fill = (v: string) => v || "údaj doplníme pred spustením";
