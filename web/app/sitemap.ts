import type { MetadataRoute } from "next";
import { getActiveSellers, getCatalog, getCities, getSeoCounts, getSitemapListings, sitemapCars } from "@/lib/data";
import { NAVODY, navodPath } from "@/lib/navody";
import { BLOG, blogPath } from "@/lib/blog";
import { SITE_URL, carName, landingPath, listingPath, sellerPath, vehiclePath, vehicleTitle, type Landing } from "@/lib/seo";
import { CARS_ENABLED } from "@/lib/features";
import { forumOverview, forumSitemap, sectionPath, threadPath } from "@/lib/forum";

export const revalidate = 3600;

// Zoznam stránok pre Google: úvod, návody, právne stránky, stránky áut, kategórií a miest s inzerátmi, predajcovia a všetky aktívne inzeráty.
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const now = new Date();
  const out: MetadataRoute.Sitemap = [
    { url: SITE_URL + "/", lastModified: now, changeFrequency: "hourly", priority: 1 },
    { url: SITE_URL + "/dopyt", changeFrequency: "monthly", priority: 0.6 },
    ...(CARS_ENABLED ? [{ url: SITE_URL + "/havarovane-vozidla", changeFrequency: "daily" as const, priority: 0.7 }] : []),
    { url: SITE_URL + "/pre-predajcov", changeFrequency: "monthly", priority: 0.5 },
    { url: SITE_URL + "/obchodne-podmienky", changeFrequency: "yearly", priority: 0.2 },
    { url: SITE_URL + "/ochrana-osobnych-udajov", changeFrequency: "yearly", priority: 0.2 },
    { url: SITE_URL + "/cookies", changeFrequency: "yearly", priority: 0.1 },
    { url: SITE_URL + "/navody", changeFrequency: "monthly", priority: 0.4 },
    { url: SITE_URL + "/blog", changeFrequency: "weekly", priority: 0.5 },
    ...BLOG.map((b) => ({ url: SITE_URL + blogPath(b.slug), lastModified: new Date(b.updated || b.date), changeFrequency: "monthly" as const, priority: 0.5 })),
    { url: SITE_URL + "/ako-zoradujeme", changeFrequency: "yearly", priority: 0.2 },
    { url: SITE_URL + "/forum", changeFrequency: "daily", priority: 0.6 },
    { url: SITE_URL + "/forum/pravidla", changeFrequency: "yearly", priority: 0.2 },
    ...NAVODY.map((n) => ({ url: SITE_URL + navodPath(n.slug), lastModified: new Date(n.updated), changeFrequency: "monthly" as const, priority: 0.5 })),
  ];
  try {   // fórum: sekcie s témami a všetky verejné témy
    const [secs, threads] = await Promise.all([forumOverview(), forumSitemap()]);
    for (const x of secs) if (x.parent && x.threads > 0) out.push({ url: SITE_URL + sectionPath(x.id), changeFrequency: "daily", priority: 0.5 });
    for (const t of threads) out.push({ url: SITE_URL + threadPath(t.section, t.id, t.title), lastModified: new Date(t.last_post_at), changeFrequency: "weekly", priority: 0.5 });
  } catch { /* fórum ešte nie je v databáze */ }
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
    if (CARS_ENABLED) for (const c of await sitemapCars().catch(() => [])) out.push({ url: SITE_URL + vehiclePath(c.id, vehicleTitle(c, cat), c.condition), lastModified: new Date(c.updatedAt), changeFrequency: "weekly", priority: 0.5 });
    for (const l of listings) out.push({ url: SITE_URL + listingPath(l.id, l.name, carName(l, cat)), lastModified: new Date(l.updatedAt), changeFrequency: "weekly", priority: 0.6 });
  } catch { /* pri výpadku databázy aspoň základné stránky */ }
  return out;
}
