import type { Metadata } from "next";
import Portal from "@/components/seller/Portal";

export const metadata: Metadata = { title: "Portál predajcu – Rozoberačka", robots: { index: false } };

export default function Page() {
  return <main id="main" className="pp-main"><Portal /></main>;
}
