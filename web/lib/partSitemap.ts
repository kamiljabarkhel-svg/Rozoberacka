// Adresy dielov a čísel dielov pre mapy webu (app/mapa-dielov/sitemap.ts) a robots.txt.
import type { MetadataRoute } from "next";
import { getCatalog, getSitemapListings } from "./data";
import { SITE_URL, carName, listingPath, oemPath } from "./seo";
import { oemKey } from "./search";

export const PER_MAP = 45_000;

/** Všetky adresy dielov a čísel dielov v stálom poradí (najnovšie diely navrchu prvej mapy). */
export async function partUrls(): Promise<MetadataRoute.Sitemap> {
  const [cat, listings] = await Promise.all([getCatalog(), getSitemapListings()]);
  const out: MetadataRoute.Sitemap = [];
  const oems = new Map<string, { n: number; last: string }>();
  for (const l of [...listings].sort((a, b) => b.id - a.id)) {
    out.push({ url: SITE_URL + listingPath(l.id, l.name, carName(l, cat), l.oem), lastModified: new Date(l.updatedAt), changeFrequency: "weekly", priority: 0.6 });
    const k = oemKey(l.oem);
    if (k.length >= 4) { const o = oems.get(k) || { n: 0, last: l.updatedAt }; o.n++; if (l.updatedAt > o.last) o.last = l.updatedAt; oems.set(k, o); }
  }
  for (const [k, o] of oems) if (o.n >= 2) out.push({ url: SITE_URL + oemPath(k), lastModified: new Date(o.last), changeFrequency: "daily", priority: 0.6 });
  // Prázdnu mapu Search Console hlási ako chybu („Missing XML tag“) – kým nie sú diely, obsahuje aspoň úvod.
  if (!out.length) out.push({ url: SITE_URL + "/", changeFrequency: "hourly", priority: 1 });
  return out;
}

export async function partMapCount(): Promise<number> {
  try { return Math.max(1, Math.ceil((await partUrls()).length / PER_MAP)); } catch { return 1; }
}

