// Texty pre kupujúcich podľa toho, kto predáva (zákon č. 108/2024 Z. z. § 16, Občiansky zákonník § 597, 599, 619).
// Overené na Slov-Lexe 7. 11. 2026. Od 1. 7. 2027 platí nový Občiansky zákonník (č. 260/2026 Z. z.) – texty skontrolovať.
import type { Listing } from "./types";

export const isTrader = (type: string | null | undefined) => type === "Firma";
/** Označenie predajcu pre kupujúcich (v databáze „Firma“ / „Súkromná osoba“). */
export const sellerKind = (type: string | null | undefined) => (isTrader(type) ? "Podnikateľ" : "Súkromná osoba");

/** Zodpovednosť za vady – riadok v parametroch dielu. */
export function liabilityText(l: Pick<Listing, "warranty" | "condition" | "seller">): string {
  if (!isTrader(l.seller.type)) return "Súkromný predaj – predajca zodpovedá za vady, na ktoré vás neupozornil (§ 597 a 599 Občianskeho zákonníka)";
  if (l.warranty === "12 mesiacov") return "12 mesiacov od prevzatia – pri použitom diele dohodnutá kratšia doba (§ 619 ods. 3 Občianskeho zákonníka)";
  return "24 mesiacov od prevzatia";
}

/** Odstúpenie od zmluvy / vrátenie dielu. */
export function withdrawalText(l: Pick<Listing, "returns14" | "seller">): string {
  if (isTrader(l.seller.type)) return "Pri kúpe na diaľku (zaslanie kuriérom) môžete od zmluvy odstúpiť do 14 dní bez udania dôvodu. Pri osobnom odbere toto zákonné právo nemáte.";
  return l.returns14 ? "Predajca dobrovoľne ponúka vrátenie do 14 dní, ak diel nepasuje" : "Zákonné právo na odstúpenie nemáte (súkromný predaj) – dohodnite sa s predajcom";
}
