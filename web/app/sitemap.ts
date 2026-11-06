import type { MetadataRoute } from "next";
import { getActiveSellers, getCatalog, getCities, getSeoCounts, getSitemapListings } from "@/lib/data";
import { NAVODY, navodPath } from "@/lib/navody";
import { SITE_URL, carName, landingPath, listingPath, sellerPath, type Landing } from "@/lib/seo";

export const revalidate = 3600;

// Zoznam stránok pre Google: úvod, návody, právne stránky, stránky áut, kategórií a miest s inzerátmi, predajcovia a všetky aktívne inzeráty.
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const now = new Date();
  const out: MetadataRoute.Sitemap = [
    { url: SITE_URL + "/", lastModified: now, changeFrequency: "hourly", priority: 1 },
    { url: SITE_URL + "/dopyt", changeFrequency: "monthly", priority: 0.6 },
    { url: SITE_URL + "/pre-predajcov", changeFrequency: "monthly", priority: 0.5 },
    { url: SITE_URL + "/obchodne-podmienky", changeFrequency: "yearly", priority: 0.2 },
    { url: SITE_URL + "/ochrana-osobnych-udajov", changeFrequency: "yearly", priority: 0.2 },
    { url: SITE_URL + "/cookies", changeFrequency: "yearly", priority: 0.1 },
    { url: SITE_URL + "/navody", changeFrequency: "monthly", priority: 0.4 },
    ...NAVODY.map((n) => ({ url: SITE_URL + navodPath(n.slug), lastModified: new Date(n.updated), changeFrequency: "monthly" as const, priority: 0.5 })),
  ];
  try {
    const [cat, counts, listings, cities, sellers] = await Promise.all([getCatalog(), getSeoCounts(), getSitemapListings(), getCities().catch(() => [] as string[]), getActiveSellers().catch(() => [])]);
    const pages = new Set<string>();
    const add = (x: Landing) => pages.add(landingPath(x, cat));
    for (const c of counts) {
      add({ brandId: c.brandId, modelId: null, cat: "", sub: null });
      add({ brandId: c.brandId, modelId: c.modelId, cat: "", sub: null });
      add({ brandId: c.brandId, modelId: c.modelId, cat: c.categoryId, sub: null });
      add({ brandId: null, modelId: null, cat: c.categoryId, sub: null });
      if (c.subcategoryId != null) add({ brandId: null, modelId: null, cat: c.categoryId, sub: c.subcategoryId });
    }
    for (const c of cities) add({ brandId: null, modelId: null, cat: "", sub: null, city: c });
    for (const p of pages) out.push({ url: SITE_URL + p, changeFrequency: "daily", priority: 0.7 });
    for (const v of sellers) out.push({ url: SITE_URL + sellerPath(v.id, v.name), changeFrequency: "daily", priority: 0.5 });
    for (const l of listings) out.push({ url: SITE_URL + listingPath(l.id, l.name, carName(l, cat)), lastModified: new Date(l.updatedAt), changeFrequency: "weekly", priority: 0.6 });
  } catch { /* pri výpadku databázy aspoň základné stránky */ }
  return out;
}
