import type { Metadata } from "next";
import Auth from "@/components/seller/Auth";

export const metadata: Metadata = {
  title: "Pre predajcov – predávajte použité autodiely zadarmo",
  description: "Vrakoviská a predajcovia autodielov: registrácia zadarmo, inzeráty s fotkami, import z CSV, štatistiky zobrazení a telefónov, správy od kupujúcich.",
  alternates: { canonical: "/pre-predajcov" },
};

export default function Page() {
  return <main id="main" className="main"><Auth /></main>;
}
