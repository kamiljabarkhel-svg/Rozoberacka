import { lhref } from "./i18n";
/** hreflang pre Google: slovenská a poľská verzia tej istej stránky (x-default = slovenská). */
export function altLangs(skPath: string): Record<string, string> {
  const pl = lhref("pl", skPath);
  return pl === skPath ? { sk: skPath } : { "sk-SK": skPath, "pl-PL": pl, "x-default": skPath };
}
