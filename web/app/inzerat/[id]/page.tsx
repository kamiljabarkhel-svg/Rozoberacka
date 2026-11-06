import { permanentRedirect } from "next/navigation";

// Staré adresy /inzerat/12 presmerujú natrvalo na /diel/12-… (Google prenesie poradie na novú adresu).
export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  permanentRedirect(`/diel/${encodeURIComponent(id)}`);
}
