// Odkazy. V statickom náhľade (jeden súbor index.html) sa detail otvára cez # v adrese.
export const STATIC_PREVIEW = process.env.NEXT_PUBLIC_STATIC_PREVIEW === "1";
export const listingHref = (id: number) => (STATIC_PREVIEW ? `#inzerat-${id}` : `/inzerat/${id}`);
export const homeHref = STATIC_PREVIEW ? "#" : "/";
export const sellersHref = STATIC_PREVIEW ? "#pre-predajcov" : "/pre-predajcov";
