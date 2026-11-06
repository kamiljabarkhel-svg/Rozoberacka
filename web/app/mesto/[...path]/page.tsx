import { notFound } from "next/navigation";
import LandingPage, { landingMetadata } from "@/components/LandingPage";
import { getCatalog, getCities } from "@/lib/data";
import { resolveMesto } from "@/lib/seo";

export const revalidate = 600;

// /mesto/zilina a /mesto/zilina/svetla – diely od predajcov z jedného mesta (osobný odber).
async function resolve(params: Promise<{ path: string[] }>) {
  const { path } = await params;
  const [cat, cities] = await Promise.all([getCatalog(), getCities().catch(() => [] as string[])]);
  return resolveMesto(path.map((p) => decodeURIComponent(p).toLowerCase()), cities, cat);
}
export async function generateMetadata({ params }: { params: Promise<{ path: string[] }> }) { return landingMetadata(await resolve(params)); }
export default async function Page({ params }: { params: Promise<{ path: string[] }> }) {
  const x = await resolve(params);
  if (!x) notFound();
  return <LandingPage x={x} />;
}
