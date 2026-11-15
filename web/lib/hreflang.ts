import { lhref } from "./i18n";
import { PL_ENABLED } from "./features";
/** hreflang pre Google: slovenská a poľská verzia tej istej stránky (x-default = slovenská). */
export function altLangs(skPath: string): Record<string, string> {
  if (!PL_ENABLED) return { sk: skPath };
  const pl = lhref("pl", skPath);
  return pl === skPath ? { sk: skPath } : { "sk-SK": skPath, "pl-PL": pl, "x-default": skPath };
}
