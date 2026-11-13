import type { Metadata } from "next";
import ForumAccount from "@/components/forum/ForumAccount";

export const metadata: Metadata = { title: "Môj účet vo fóre", robots: { index: false, follow: false }, alternates: { canonical: "/forum/ucet" } };

export default function Page() {
  return <main id="main" className="main forum"><ForumAccount /></main>;
}
