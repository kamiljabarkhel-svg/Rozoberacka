// Mapy webu pre diely: každý aktívny inzerát (/diel/…) a každé číslo dielu s aspoň 2 ponukami (/cislo-dielu/…).
// Google prijme najviac 50 000 adries v jednej mape, preto po 45 000: /mapa-dielov/sitemap/0.xml, /1.xml…
// Zoznam máp je v robots.txt. Hlavná /sitemap.xml obsahuje ostatné stránky (autá, kategórie, mestá, predajcovia, blog, fórum).
import type { MetadataRoute } from "next";
import { PER_MAP, partMapCount, partUrls } from "@/lib/partSitemap";

export const revalidate = 3600;

export async function generateSitemaps() {
  return Array.from({ length: await partMapCount() }, (_, id) => ({ id }));
}

export default async function sitemap(props: { id: Promise<string> }): Promise<MetadataRoute.Sitemap> {
  const id = Number(await props.id) || 0;
  try { return (await partUrls()).slice(id * PER_MAP, (id + 1) * PER_MAP); } catch { return []; }
}
