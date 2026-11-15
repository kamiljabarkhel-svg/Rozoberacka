"use client";
import { usePathname } from "next/navigation";
import { langOf, lhref, tr, type Lang } from "./index";

/** Jazyk aktuálnej stránky (v klientskych komponentoch). */
export function useLang(): Lang { return langOf(usePathname()); }
/** Funkcia na preklad: const t = useT(); t("Hľadať") */
export function useT() { const lang = useLang(); return (s: string, ...a: (string | number)[]) => tr(lang, s, ...a); }
/** Odkaz v aktuálnom jazyku. */
export function useHref() { const lang = useLang(); return (h: string) => lhref(lang, h); }
