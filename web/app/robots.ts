import type { MetadataRoute } from "next";
import { SITE_URL } from "@/lib/seo";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [{ userAgent: "*", allow: "/", disallow: ["/predajca", "/admin", "/dopyt/", "/strazca/", "/sprava/", "/forum/ucet", "/*?*oblubene="] }],
    sitemap: `${SITE_URL}/sitemap.xml`,
  };
}
