import type { Metadata } from "next";
import ListingDetail from "@/components/ListingDetail";
import { IS_DEMO, demoListingIds } from "@/lib/data";

export const metadata: Metadata = { title: "Inzerát – Rozoberačka" };

// Ukážkové inzeráty sa pripravia vopred. Ostatné (zo Supabase) sa vykreslia pri otvorení.
export function generateStaticParams() {
  return IS_DEMO ? demoListingIds().map((id) => ({ id: String(id) })) : [];
}

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <main id="main" className="dpage"><ListingDetail id={Number(id)} /></main>;
}
