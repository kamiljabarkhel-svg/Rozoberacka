import type { Metadata } from "next";
import SellersSoon from "@/components/SellersSoon";

export const metadata: Metadata = { title: "Pre predajcov – Rozoberačka" };

export default function Page() {
  return <main id="main"><SellersSoon /></main>;
}
