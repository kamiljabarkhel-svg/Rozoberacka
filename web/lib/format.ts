import type { Lang } from "./i18n";
/** Poľské tvary: 1 część, 2–4 części (okrem 12–14), 5+ części */
function plPl(n: number, one: string, few: string, many: string) { if (n === 1) return one; const d = n % 10, h = n % 100; return d >= 2 && d <= 4 && !(h >= 12 && h <= 14) ? few : many; }
export function pieces(n: number, lang: Lang = "sk"): string {
  if (lang === "pl") return n + " " + plPl(n, "część", "części", "części");
  return n + " " + (n === 1 ? "diel" : n >= 2 && n <= 4 ? "diely" : "dielov");
}
/** „je 1 diel“, „sú 3 diely“, „je 12 dielov“ */
export function jeSu(n: number, lang: Lang = "sk"): string { if (lang === "pl") return "jest"; return n >= 2 && n <= 4 ? "sú" : "je"; }
/** Jednotné/množné číslo: plural(3, "telefón", "telefóny", "telefónov") */
export function plural(n: number, one: string, few: string, many: string): string {
  return n + " " + (n === 1 ? one : n >= 2 && n <= 4 ? few : many);
}
export function photosText(n: number, lang: Lang = "sk"): string {
  if (lang === "pl") return n + " " + plPl(n, "zdjęcie", "zdjęcia", "zdjęć");
  return n + " " + (n === 1 ? "fotka" : n < 5 ? "fotky" : "fotiek");
}
export function price(p: number): string {
  return new Intl.NumberFormat("sk-SK", { minimumFractionDigits: Number.isInteger(p) ? 0 : 2, maximumFractionDigits: 2 }).format(p) + " €";
}
export function agoText(iso: string, now = Date.now(), lang: Lang = "sk"): string {
  const d = Math.max(0, Math.floor((now - Date.parse(iso)) / 86400000));
  if (lang === "pl") return d === 0 ? "dziś" : d === 1 ? "wczoraj" : d + " dni temu";
  return d === 0 ? "dnes" : d === 1 ? "včera" : "pred " + d + " dňami";
}
export function condDot(c: string): string {
  return c === "Na opravu" ? "b" : c === "Dobrý" ? "w" : c === "Nový" ? "n" : c === "Repasovaný" ? "r" : "";
}
export function sk(a: string, b: string): number {
  return a.localeCompare(b, "sk");
}
