import type { MetadataRoute } from "next";
import { getCatalog, getSeoCounts, getSitemapListings } from "@/lib/data";
import { SITE_URL, carName, landingPath, listingPath, type Landing } from "@/lib/seo";

export const revalidate = 3600;

// Zoznam stránok pre Google: úvod, právne stránky, stránky áut a kategórií s inzerátmi a všetky aktívne inzeráty.
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const now = new Date();
  const out: MetadataRoute.Sitemap = [
    { url: SITE_URL + "/", lastModified: now, changeFrequency: "hourly", priority: 1 },
    { url: SITE_URL + "/dopyt", changeFrequency: "monthly", priority: 0.6 },
    { url: SITE_URL + "/pre-predajcov", changeFrequency: "monthly", priority: 0.5 },
    { url: SITE_URL + "/obchodne-podmienky", changeFrequency: "yearly", priority: 0.2 },
    { url: SITE_URL + "/ochrana-osobnych-udajov", changeFrequency: "yearly", priority: 0.2 },
    { url: SITE_URL + "/cookies", changeFrequency: "yearly", priority: 0.1 },
  ];
  try {
    const [cat, counts, listings] = await Promise.all([getCatalog(), getSeoCounts(), getSitemapListings()]);
    const pages = new Set<string>();
    const add = (x: Landing) => pages.add(landingPath(x, cat));
    for (const c of counts) {
      add({ brandId: c.brandId, modelId: null, cat: "", sub: null });
      add({ brandId: c.brandId, modelId: c.modelId, cat: "", sub: null });
      add({ brandId: c.brandId, modelId: c.modelId, cat: c.categoryId, sub: null });
      add({ brandId: null, modelId: null, cat: c.categoryId, sub: null });
      if (c.subcategoryId != null) add({ brandId: null, modelId: null, cat: c.categoryId, sub: c.subcategoryId });
    }
    for (const p of pages) out.push({ url: SITE_URL + p, changeFrequency: "daily", priority: 0.7 });
    for (const l of listings) out.push({ url: SITE_URL + listingPath(l.id, l.name, carName(l, cat)), lastModified: new Date(l.updatedAt), changeFrequency: "weekly", priority: 0.6 });
  } catch { /* pri výpadku databázy aspoň základné stránky */ }
  return out;
}
