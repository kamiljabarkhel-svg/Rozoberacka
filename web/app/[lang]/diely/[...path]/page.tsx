import { langOf } from "@/lib/i18n";
import { notFound } from "next/navigation";
import LandingPage, { landingMetadata } from "@/components/LandingPage";
import { getCatalog } from "@/lib/data";
import { resolveDiely } from "@/lib/seo";

export const revalidate = 600;

async function resolve(params: Promise<{ path: string[]; lang: string }>) {
  const { path } = await params;
  return resolveDiely(path.map((p) => decodeURIComponent(p).toLowerCase()), await getCatalog());
}
export async function generateMetadata({ params }: { params: Promise<{ path: string[]; lang: string }> }) { return landingMetadata(await resolve(params), langOf("/" + (await params).lang)); }
export default async function Page({ params }: { params: Promise<{ path: string[]; lang: string }> }) {
  const x = await resolve(params);
  if (!x) notFound();
  return <LandingPage x={x} lang={langOf("/" + (await params).lang)} />;
}
