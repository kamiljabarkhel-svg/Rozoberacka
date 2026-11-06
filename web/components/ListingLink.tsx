import Link from "next/link";
import type { ReactNode } from "react";
import { STATIC_PREVIEW, listingHref } from "@/lib/paths";

export default function ListingLink({ id, name = "", car = "", className, children }: { id: number; name?: string; car?: string; className?: string; children: ReactNode }) {
  const href = listingHref(id, name, car);
  if (STATIC_PREVIEW) return <a className={className} href={href}>{children}</a>;
  return <Link className={className} href={href}>{children}</Link>;
}
