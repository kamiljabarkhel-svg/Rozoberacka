import type { Metadata } from "next";
import RequestView from "@/components/RequestView";

export const metadata: Metadata = { title: "Môj dopyt a ponuky", robots: { index: false, follow: false } };

export default async function Page({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  return <main id="main" className="main rq"><RequestView token={token} /></main>;
}
