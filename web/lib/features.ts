// Prepínače funkcií webu. Vypnutá funkcia zmizne z celého webu, ale kód a tabuľky v databáze ostávajú.
/** Havarované vozidlá (predaj celých vozidiel). Vypnuté na želanie majiteľa 10. 11. 2026; zapnutie: NEXT_PUBLIC_CARS=1 vo Verceli. */
export const CARS_ENABLED = process.env.NEXT_PUBLIC_CARS === "1";
/** Odpovede na správy e-mailom: zapnúť (NEXT_PUBLIC_EMAIL_REPLIES=1), keď beží Brevo a funkcia „odpovede“ (supabase/README.md).
 *  Vypnuté: odpoveď sa uloží a predajca ju kupujúcemu pošle zo svojej pošty tlačidlom. */
export const EMAIL_REPLIES = process.env.NEXT_PUBLIC_EMAIL_REPLIES === "1";
/** Poľská verzia pre kupujúcich (/pl). Skrytá na želanie majiteľa 15. 11. 2026 – kód, preklady a tabuľky ostávajú.
 *  Zapnutie: NEXT_PUBLIC_PL=1 vo Verceli + v Supabase znova zapnúť plánovač prekladov (supabase/37_preklady_plan.sql). */
/** Hľadanie podľa VIN (úvod, dopyt). Skryté na želanie majiteľa 15. 11. 2026 – dekódovanie (lib/vin.ts) ostáva v kóde.
 *  Zapnutie: NEXT_PUBLIC_VIN=1 vo Verceli. */
export const VIN_ENABLED = process.env.NEXT_PUBLIC_VIN === "1";
export const PL_ENABLED = process.env.NEXT_PUBLIC_PL === "1";
