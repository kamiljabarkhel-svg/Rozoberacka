"use client";
// Karty inzerátov na stránkach značiek a kategórií (obľúbené fungujú aj tu).
import type { Catalog, Listing } from "@/lib/types";
import { useFavs } from "@/lib/favs";
import ListingCard from "./ListingCard";

export default function LandingGrid({ items, cat }: { items: Listing[]; cat: Catalog }) {
  const { favs, toggle } = useFavs();
  return <div className="grid">{items.map((l) => <ListingCard key={l.id} l={l} cat={cat} fav={favs.includes(l.id)} onFav={toggle} />)}</div>;
}
