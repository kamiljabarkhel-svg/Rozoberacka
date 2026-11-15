import type { Metadata } from "next";
import { notFound } from "next/navigation";
import AlertAction from "@/components/AlertAction";

// /strazca/potvrdit/<kód> a /strazca/zrusit/<kód> – odkazy z e-mailov strážcu.
export const metadata: Metadata = { title: "Upozornenie na nové diely", robots: { index: false, follow: false } };

export default async function Page({ params }: { params: Promise<{ akcia: string; token: string }> }) {
  const { akcia, token } = await params;
  if (akcia !== "potvrdit" && akcia !== "zrusit") notFound();
  return <main id="main" className="main legal"><AlertAction action={akcia} token={token} /></main>;
}
