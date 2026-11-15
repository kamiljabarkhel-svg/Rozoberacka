// Jazyky webu: slovenčina (hlavná, adresy bez predpony) a poľština (adresy /pl/...).
// Preklad: kľúčom je slovenský text, slovník je v ./pl.ts. Chýbajúci preklad = ostane slovenský text.
import { PL } from "./pl";

export type Lang = "sk" | "pl";
export const LANGS: Lang[] = ["sk", "pl"];

/** Jazyk podľa adresy stránky. */
export const langOf = (path: string | null | undefined): Lang => (path && (path === "/pl" || path.startsWith("/pl/")) ? "pl" : "sk");

/** Preloží slovenský text do jazyka. Podporuje zástupné znaky {0}, {1} … */
export function tr(lang: Lang, s: string, ...args: (string | number)[]): string {
  let out = lang === "pl" ? (PL[s] ?? PL[s.trim()] ?? s) : s;
  args.forEach((a, i) => { out = out.split(`{${i}}`).join(String(a)); });
  return out;
}

/** Odkaz v jazyku: slovenské adresy ostávajú, poľské dostanú predponu /pl. Externé a #kotvy sa nemenia. */
export function lhref(lang: Lang, href: string): string {
  if (lang !== "pl" || !href.startsWith("/") || href.startsWith("/pl/") || href === "/pl") return href;
  if (!PL_PATHS.some((p) => href === p || href.startsWith(p + "/") || href.startsWith(p + "?") || href.startsWith(p + "#") || (p === "/" && /^\/(\?|#|$)/.test(href)))) return href;
  return href === "/" ? "/pl" : /^\/[?#]/.test(href) ? "/pl" + href.slice(1) : "/pl" + href;
}
/** Stránky, ktoré majú poľskú verziu (ostatné – portál predajcu, fórum, blog – ostávajú po slovensky). */
export const PL_PATHS = ["/", "/diel", "/diely", "/kategoria", "/mesto", "/predajci", "/dopyt", "/navody", "/obchodne-podmienky", "/ochrana-osobnych-udajov", "/cookies", "/ako-zoradujeme", "/strazca", "/sprava"];

/** Adresa tej istej stránky v druhom jazyku (pre prepínač a hreflang). */
export function switchPath(path: string, to: Lang): string {
  const skPath = path === "/pl" ? "/" : path.startsWith("/pl/") ? path.slice(3) : path;
  if (to === "sk") return skPath;
  const out = lhref("pl", skPath);
  return out.startsWith("/pl") ? out : "/pl";
}

// ---------- slovenské/poľské tvary čísel ----------
export function plural(lang: Lang, n: number, sk: [string, string, string], pl: [string, string, string]): string {
  const [one, few, many] = lang === "pl" ? pl : sk;
  if (n === 1) return one;
  if (lang === "pl") { const d = n % 10, h = n % 100; return d >= 2 && d <= 4 && !(h >= 12 && h <= 14) ? few : many; }
  return n >= 2 && n <= 4 ? few : many;
}
export const piecesL = (lang: Lang, n: number) => n + " " + plural(lang, n, ["diel", "diely", "dielov"], ["część", "części", "części"]);
export const LOCALE: Record<Lang, string> = { sk: "sk-SK", pl: "pl-PL" };
/** „3 oferty“ – číslo s poľským tvarom slova. */
export const plPl = (n: number, forms: [string, string, string]) => n + " " + plural("pl", n, forms, forms);
