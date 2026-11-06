import type { Metadata } from "next";
import Admin from "@/components/admin/Admin";

export const metadata: Metadata = { title: "Administrácia", robots: { index: false, follow: false } };

export default function Page() {
  return <main id="main" className="pp-main"><Admin /></main>;
}
