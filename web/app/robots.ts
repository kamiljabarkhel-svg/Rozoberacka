import type { MetadataRoute } from "next";
import { SITE_URL } from "@/lib/seo";
import { partMapCount } from "@/lib/partSitemap";

export const revalidate = 3600;

export default async function robots(): Promise<MetadataRoute.Robots> {
  const n = await partMapCount();
  return {
    rules: [{ userAgent: "*", allow: "/", disallow: ["/predajca", "/admin", "/dopyt/", "/strazca/", "/sprava/", "/forum/ucet", "/*?*oblubene="] }],
    // hlavná mapa (autá, kategórie, mestá, predajcovia, blog, fórum) + mapy dielov a čísel dielov
    sitemap: [`${SITE_URL}/sitemap.xml`, ...Array.from({ length: n }, (_, i) => `${SITE_URL}/mapa-dielov/sitemap/${i}.xml`)],
  };
}
