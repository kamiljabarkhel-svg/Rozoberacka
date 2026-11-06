// Odkazy. V statickom náhľade (jeden súbor index.html) sa detail otvára cez # v adrese.
export const STATIC_PREVIEW = process.env.NEXT_PUBLIC_STATIC_PREVIEW === "1";
import { listingPath } from "./seo";
/** Odkaz na detail. S názvom a autom vznikne adresa so slovami (lepšie pre Google); bez nich krátka, ktorá presmeruje. */
export const listingHref = (id: number, name = "", car = "") => (STATIC_PREVIEW ? `#inzerat-${id}` : name ? listingPath(id, name, car) : `/diel/${id}`);
export const homeHref = STATIC_PREVIEW ? "#" : "/";
export const sellersHref = STATIC_PREVIEW ? "#pre-predajcov" : "/pre-predajcov";
