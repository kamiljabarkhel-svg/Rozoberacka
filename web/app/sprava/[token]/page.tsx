// Konverzácia kupujúceho s predajcom (tajný odkaz z e-mailu). Kupujúci nemá účet – prístup dáva len odkaz.
import type { Metadata } from "next";
import ThreadView from "@/components/ThreadView";

export const metadata: Metadata = { title: "Konverzácia s predajcom", robots: { index: false, follow: false }, referrer: "no-referrer" };

export default async function Page({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  return <main id="main" className="main rq"><ThreadView token={token} /></main>;
}
