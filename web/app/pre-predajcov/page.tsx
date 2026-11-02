import type { Metadata } from "next";
import Auth from "@/components/seller/Auth";

export const metadata: Metadata = { title: "Prihlásenie predajcu – Rozoberačka" };

export default function Page() {
  return <main id="main" className="main"><Auth /></main>;
}
