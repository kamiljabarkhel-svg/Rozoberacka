"use client";
import { useT } from "@/lib/i18n/client";
/** Preklad textu v komponentoch bez prístupu k jazyku: <T>Hľadať</T> */
export default function T({ children }: { children: string }) { const t = useT(); return <>{t(children)}</>; }
