// Ukážkové inzeráty pre režim bez databázy. Prevzaté z prototyp.html (9 inzerátov so značkami z katalógu)
// a doplnené o 3 ukážky: zhoda OEM (vymyslené OEM „UKAZKA-0001“) a inzerát bez OEM a bez fotky.
// Nie sú to skutočné inzeráty ani overené údaje o zhode dielov.
import type { Catalog, Condition, Listing, Vehicle } from "../types";

type Raw = {
  id: number; cat: string; sub: string; name: string; brand: string; model: string; engine?: string; year: number;
  oem: string; price: number; city: string; cond: Condition; phone: string; seller: [string, string, boolean];
  ago: number; warranty: string; shipping: string; photos: number; desc: string;
  fits?: [string, string, string?][];
};

const RAW: Raw[] = [
  { id: 1, cat: "el", sub: "Alternátory", name: "Alternátor 140A", brand: "Škoda", model: "Octavia II", engine: "2.0 TDI 103 kW", year: 2009, oem: "03G903023", price: 55, city: "Žilina", cond: "Dobrý", phone: "+421900111222", seller: ["Autovrakovisko Žilina", "Firma", true], ago: 2, warranty: "3 mesiace", shipping: "Zasielam kuriérom", photos: 4,
    desc: "Alternátor 140 A z Octavie II 2.0 TDI. Demontovaný z auta po nehode zozadu, motor bol nepoškodený. Odskúšaný, nabíja správne." },
  { id: 2, cat: "kar", sub: "Nárazníky", name: "Predný nárazník", brand: "Škoda", model: "Octavia III", year: 2016, oem: "5E0807221", price: 90, city: "Nitra", cond: "Veľmi dobrý", phone: "+421900222333", seller: ["Auto-diely Nitra", "Firma", true], ago: 0, warranty: "14 dní", shipping: "Zasielam kuriérom", photos: 3,
    desc: "Predný nárazník v pôvodnej farbe, bez prasklín. Drobné škrabance na spodnej hrane. Zahŕňa aj držiaky.\nOEM číslo si overte podľa vášho auta." },
  { id: 3, cat: "motor", sub: "Riadiace jednotky motora", name: "Riadiaca jednotka motora", brand: "Volkswagen", model: "Golf VI", engine: "1.6 TDI 77 kW", year: 2011, oem: "03L906023", price: 120, city: "Košice", cond: "Dobrý", phone: "+421900333444", seller: ["Peter K.", "Súkromná osoba", false], ago: 5, warranty: "Bez záruky", shipping: "Len osobný odber", photos: 2,
    desc: "Riadiaca jednotka motora 1.6 TDI. Vyberaná z funkčného auta, bez zásahov. Pri montáži treba kódovanie u servisu." },
  { id: 4, cat: "sv", sub: "Predné svetlá", name: "Pravé predné svetlo", brand: "BMW", model: "3 (E90)", year: 2008, oem: "63117161666", price: 70, city: "Bratislava", cond: "Na opravu", phone: "+421900444555", seller: ["Rozoberačka Bratislava", "Firma", true], ago: 1, warranty: "14 dní", shipping: "Zasielam kuriérom", photos: 1,
    desc: "Pravé predné svetlo, halogén. Praskliny na jednom úchyte, sklo bez poškodenia. Vhodné na opravu alebo ako náhrada." },
  { id: 7, cat: "int", sub: "Sedadlá", name: "Sedadlo vodiča, koža", brand: "Audi", model: "A4 B8", year: 2012, oem: "8K0881105", price: 150, city: "Banská Bystrica", cond: "Dobrý", phone: "+421900777888", seller: ["Auto Banská Bystrica", "Firma", true], ago: 4, warranty: "3 mesiace", shipping: "Zasielam kuriérom", photos: 4,
    desc: "Sedadlo vodiča, čierna koža, elektrické nastavenie. Bez rozpárania, mierne sedenie na boku." },
  { id: 9, cat: "kar", sub: "Kapoty", name: "Kapota", brand: "Volkswagen", model: "Passat B7", year: 2013, oem: "3AA823031", price: 85, city: "Bratislava", cond: "Dobrý", phone: "+421900123456", seller: ["Autodiely Bratislava", "Firma", true], ago: 0, warranty: "3 mesiace", shipping: "Zasielam kuriérom", photos: 3,
    desc: "Kapota Passat B7, bez promáčknutí, pôvodný lak. Osobný odber, dá sa aj dovoz." },
  { id: 10, cat: "sv", sub: "Zadné svetlá", name: "Zadné svetlo ľavé LED", brand: "Škoda", model: "Superb III", year: 2018, oem: "3V5945095", price: 95, city: "Žilina", cond: "Veľmi dobrý", phone: "+421900234567", seller: ["Autovrakovisko Žilina", "Firma", true], ago: 1, warranty: "3 mesiace", shipping: "Zasielam kuriérom", photos: 4,
    desc: "Zadné svetlo ľavé LED, plne funkčné, bez vlhkosti. Z auta po náraze spredu." },
  { id: 11, cat: "motor", sub: "Motory kompletné", name: "Motor 1.9 TDI 77 kW", brand: "Volkswagen", model: "Passat B6", engine: "1.9 TDI 77 kW", year: 2007, oem: "BXE", price: 480, city: "Nitra", cond: "Dobrý", phone: "+421900345678", seller: ["Motory Nitra", "Firma", true], ago: 6, warranty: "3 mesiace", shipping: "Len osobný odber", photos: 2,
    desc: "Kompletný motor 1.9 TDI 77 kW (BXE) bez príslušenstva. Počet kilometrov podľa predajcu 220 000. Možnosť prehliadky." },
  { id: 12, cat: "int", sub: "Volanty a airbagy", name: "Volant multifunkčný", brand: "BMW", model: "5 (F10)", year: 2012, oem: "32306854480", price: 140, city: "Košice", cond: "Veľmi dobrý", phone: "+421900456789", seller: ["Rozoberačka Košice", "Firma", false], ago: 2, warranty: "14 dní", shipping: "Zasielam kuriérom", photos: 3,
    desc: "Multifunkčný volant s ovládaním tempomatu a rádia. Koža v dobrom stave, bez airbagu." },
  // Ukážka zhody OEM: dva inzeráty s rovnakým (vymysleným) OEM v rôznom zápise.
  { id: 13, cat: "kar", sub: "Spätné zrkadlá", name: "Spätné zrkadlo pravé, elektrické", brand: "Škoda", model: "Octavia III", year: 2015, oem: "UKAZKA-0001", price: 65, city: "Trnava", cond: "Veľmi dobrý", phone: "+421900000013", seller: ["Vrakovisko Trnava", "Firma", false], ago: 3, warranty: "14 dní", shipping: "Zasielam kuriérom", photos: 2,
    desc: "Ukážkový inzerát. OEM číslo je vymyslené, slúži len na ukážku zhody „Pasuje na“. Inzerát nemá vyplnenú motorizáciu, preto pasuje na všetky motorizácie modelu." },
  { id: 14, cat: "kar", sub: "Spätné zrkadlá", name: "Spätné zrkadlo pravé", brand: "Volkswagen", model: "Golf VII", engine: "1.6 TDI 81 kW", year: 2014, oem: "ukazka 0001", price: 59, city: "Prešov", cond: "Dobrý", phone: "+421900000014", seller: ["Vrakovisko Prešov", "Firma", false], ago: 7, warranty: "Bez záruky", shipping: "Zasielam kuriérom", photos: 1,
    desc: "Ukážkový inzerát. Rovnaké vymyslené OEM ako pri zrkadle zo Škody, len inak napísané (malé písmená, medzera). Portál ich spojí a diel sa zobrazí aj pri hľadaní Škoda Octavia III.",
    fits: [["Volkswagen", "Golf VII", "2.0 TDI 110 kW"]] },
  { id: 15, cat: "sv", sub: "Predné svetlá", name: "Ľavé predné svetlo, halogén", brand: "Škoda", model: "Octavia III", year: 2015, oem: "", price: 75, city: "Trnava", cond: "Dobrý", phone: "+421900000015", seller: ["Vrakovisko Trnava", "Firma", false], ago: 8, warranty: "Bez záruky", shipping: "Len osobný odber", photos: 0,
    desc: "Ukážkový inzerát bez OEM čísla a bez fotky." },
];

// Doplnkové údaje ako v prototype (strana, prevodovka, km, odskúšané, vrátenie, TOP).
const EXTRA: Record<number, Partial<Pick<Listing, "side" | "gearbox" | "km" | "tested" | "returns14" | "top">>> = {
  1: { tested: true, gearbox: "Manuálna", km: 212000, returns14: true }, 2: { top: true, returns14: true }, 3: { tested: true, gearbox: "Manuálna", km: 168000 },
  4: { side: "Pravá" }, 9: { top: true }, 10: { side: "Ľavá", tested: true, returns14: true }, 11: { tested: true, gearbox: "Manuálna", km: 231000, returns14: true },
  12: { tested: true }, 13: { side: "Pravá" }, 14: { side: "Pravá" }, 15: { side: "Ľavá" },
};

/** Náhradná ukážková fotka (SVG), rovnaká ako v prototype. */
export function demoPhoto(id: number, k: number): string {
  const h = 185 + ((id * 13 + k * 9) % 40), l = 88 - ((id + k) % 4) * 2;
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 300"><defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="hsl(${h},30%,${l + 4}%)"/><stop offset="1" stop-color="hsl(${h + 12},32%,${l - 8}%)"/></linearGradient></defs><rect width="400" height="300" fill="url(#g)"/><circle cx="200" cy="138" r="52" fill="none" stroke="hsl(${h},40%,32%)" stroke-width="9" opacity=".8"/><circle cx="200" cy="138" r="16" fill="hsl(${h},40%,32%)" opacity=".8"/><text x="200" y="244" text-anchor="middle" font-family="sans-serif" font-weight="600" font-size="17" fill="hsl(${h},40%,24%)">Ukážková fotka ${k + 1}</text></svg>`;
  return "data:image/svg+xml;charset=utf-8," + encodeURIComponent(svg);
}

// Pevný dátum, aby server aj prehliadač zoradili rovnako.
const BASE = Date.parse("2026-11-02T10:00:00Z");

export function buildDemoListings(cat: Catalog): { listings: Listing[]; phones: Record<number, string> } {
  const brandId = (n: string) => {
    const b = cat.brands.find((x) => x.name === n);
    if (!b) throw new Error("Demo: neznáma značka " + n);
    return b.id;
  };
  const modelId = (b: number, n: string) => {
    const m = cat.models.find((x) => x.brandId === b && x.name === n);
    if (!m) throw new Error("Demo: neznámy model " + n);
    return m.id;
  };
  const engineId = (m: number, n?: string) => {
    if (!n) return null;
    const e = cat.engines.find((x) => x.modelId === m && x.name === n);
    if (!e) throw new Error("Demo: neznáma motorizácia " + n);
    return e.id;
  };
  const subId = (c: string, n: string) => {
    const s = cat.subcategories.find((x) => x.categoryId === c && x.name === n);
    if (!s) throw new Error("Demo: neznáma podkategória " + n);
    return s.id;
  };
  const phones: Record<number, string> = {};
  const listings = RAW.map((r): Listing => {
    const b = brandId(r.brand), m = modelId(b, r.model);
    phones[r.id] = r.phone;
    const fits: Vehicle[] = (r.fits || []).map(([fb, fm, fe]) => {
      const bb = brandId(fb), mm = modelId(bb, fm);
      return { brandId: bb, modelId: mm, engineId: engineId(mm, fe) };
    });
    const firm = r.seller[1] === "Firma";
    const created = new Date(BASE - r.ago * 86400000 - r.id * 60000).toISOString();
    const photos = Array.from({ length: r.photos }, (_, k) => demoPhoto(r.id, k));
    return {
      id: r.id, name: r.name, brandId: b, modelId: m, engineId: engineId(m, r.engine), year: r.year,
      categoryId: r.cat, subcategoryId: subId(r.cat, r.sub), oem: r.oem || null, price: r.price, city: r.city,
      condition: r.cond, description: r.desc,
      // záruka podľa zákona: firma pri použitom diele najmenej 12 mesiacov (pôvodné hodnoty z prototypu sa prepočítajú)
      warranty: firm ? "12 mesiacov" : "Bez záruky", shipping: r.shipping,
      createdAt: created, updatedAt: created, photos, thumbs: photos,
      fits, sellerId: r.seller[0], donorId: null, seller: { name: r.seller[0], type: r.seller[1], city: r.city, verified: r.seller[2] },
      side: EXTRA[r.id]?.side ?? null, gearbox: EXTRA[r.id]?.gearbox ?? null, km: EXTRA[r.id]?.km ?? null,
      tested: !!EXTRA[r.id]?.tested, returns14: firm || !!EXTRA[r.id]?.returns14, top: !!EXTRA[r.id]?.top, partMaker: null,
    };
  });
  return { listings, phones };
}
