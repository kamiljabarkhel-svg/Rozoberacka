import Link from "next/link";
import type { ReactNode } from "react";
import { STATIC_PREVIEW, listingHref } from "@/lib/paths";

export default function ListingLink({ id, className, children }: { id: number; className?: string; children: ReactNode }) {
  if (STATIC_PREVIEW) return <a className={className} href={listingHref(id)}>{children}</a>;
  return <Link className={className} href={listingHref(id)}>{children}</Link>;
}
