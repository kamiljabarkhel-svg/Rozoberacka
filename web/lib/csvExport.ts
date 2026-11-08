// Export inzerátov predajcu do CSV v rovnakom formáte, aký prijíma import (oddeľovač ;, kódovanie UTF-8 s BOM pre Excel).
import type { Catalog, Specs } from "./types";
import type { MyListing } from "./seller";

/** Stĺpce parametrov kolies (len pre kategóriu Pneumatiky a disky). Rovnaké ako pri exporte. */
export const SPEC_COLS: [string, keyof Specs][] = [["pneu_sirka", "tw"], ["pneu_profil", "tp"], ["priemer", "rd"], ["sezona", "season"], ["dezen_mm", "tread"], ["dot", "dot"], ["index_nosnosti", "li"], ["index_rychlosti", "si"], ["sirka_disku", "rw"], ["roztec", "pcd"], ["et", "et"], ["stredovy_otvor", "cb"], ["kusy", "pcs"], ["material", "mat"]];

const ST: Record<string, string> = { active: "aktívny", paused: "pozastavený", sold: "predaný", blocked: "skrytý správcom" };
const q = (v: unknown) => { const s = v == null ? "" : String(v); return /[;"\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s; };

export function listingsCsv(items: MyListing[], cat: Catalog | null): string {
  const n = <T extends { id: number | string; name: string }>(list: T[] | undefined, id: unknown) => list?.find((x) => x.id === id)?.name || "";
  const head = ["nazov", "znacka", "model", "motorizacia", "rocnik", "oem", "cena", "kategoria", "podkategoria", "stav", "zaruka", "popis", "mesto", "telefon",
    "pasuje", "strana", "odskusany", "vratenie", "km", "vyrobca", ...SPEC_COLS.map(([c]) => c), "stav_inzeratu", "id", "zobrazenia", "telefony", "pridany"];
  const rows = items.map((l) => [
    l.name, n(cat?.brands, l.brandId), n(cat?.models, l.modelId), n(cat?.engines, l.engineId), l.year, l.oem, l.price.toFixed(2).replace(".", ","),
    n(cat?.categories, l.categoryId), n(cat?.subcategories, l.subcategoryId), l.condition, l.warranty, l.description, l.city, l.phone,
    l.fits.map((f) => [n(cat?.brands, f.brandId), f.modelId ? n(cat?.models, f.modelId) : ""].filter(Boolean).join(" ")).join(" | "),
    l.side, l.tested ? "áno" : "", l.returns14 ? "áno" : "", l.km ?? "", l.partMaker, ...SPEC_COLS.map(([, k]) => l.specs?.[k] ?? ""), ST[l.status] || l.status, l.id, l.views, l.calls, l.createdAt.slice(0, 10),
  ]);
  return "﻿" + [head, ...rows].map((r) => r.map(q).join(";")).join("\r\n") + "\r\n";
}

export function download(name: string, text: string, type = "text/csv;charset=utf-8") {
  const a = document.createElement("a");
  a.href = URL.createObjectURL(new Blob([text], { type })); a.download = name;
  document.body.appendChild(a); a.click(); a.remove();
  window.setTimeout(() => URL.revokeObjectURL(a.href), 2000);
}
