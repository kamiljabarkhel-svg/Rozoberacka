import { notFound } from "next/navigation";
import LandingPage, { landingMetadata } from "@/components/LandingPage";
import { getCatalog } from "@/lib/data";
import { resolveKategoria } from "@/lib/seo";

export const revalidate = 600;

async function resolve(params: Promise<{ path: string[] }>) {
  const { path } = await params;
  return resolveKategoria(path.map((p) => decodeURIComponent(p).toLowerCase()), await getCatalog());
}
export async function generateMetadata({ params }: { params: Promise<{ path: string[] }> }) { return landingMetadata(await resolve(params)); }
export default async function Page({ params }: { params: Promise<{ path: string[] }> }) {
  const x = await resolve(params);
  if (!x) notFound();
  return <LandingPage x={x} />;
}
