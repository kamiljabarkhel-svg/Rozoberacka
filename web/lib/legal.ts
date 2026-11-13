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

/** IČO podnikateľa: 8 číslic so správnou kontrolnou číslicou (váhy 8 až 2, modulo 11 – platí pre slovenské aj české IČO).
 *  Vráti text chyby alebo null. Príklad platného IČO: 57598142. */
export function icoError(raw: string): string | null {
  const v = raw.replace(/\s/g, "");
  if (!v) return "Zadajte IČO – podnikateľ ho musí uviesť.";
  if (!/^[0-9]{8}$/.test(v)) return "IČO musí mať 8 číslic.";
  const sum = [...v.slice(0, 7)].reduce((a, d, i) => a + Number(d) * (8 - i), 0);
  if ((11 - (sum % 11)) % 10 !== Number(v[7])) return "Toto IČO nie je platné – skontrolujte ho (nájdete ho na orsr.sk alebo zrsr.sk).";
  return null;
}
