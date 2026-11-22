// Obce a mestá Slovenska so súradnicami (public/obce.json, generuje scripts/gen-obce.py z údajov Wikidaty, CC0).
// Používa sa pri výbere mesta v inzeráte a pri filtri „okruh v km“. Súbor sa načíta až keď je treba (~90 kB, prehliadač si ho pamätá).

export type Obec = [name: string, lat: number, lon: number];

let cache: Promise<Obec[]> | null = null;
export function loadObce(): Promise<Obec[]> {
  if (!cache) cache = fetch("/obce.json").then((r) => { if (!r.ok) throw new Error("obce " + r.status); return r.json() as Promise<Obec[]>; })
    .catch((e) => { cache = null; throw e; });
  return cache;
}

/** Porovnanie názvov bez diakritiky a veľkých písmen. */
export function normCity(s: string): string {
  return s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().replace(/\s+/g, " ").trim();
}

/** Obec podľa názvu – presne, alebo bez prívlastku „(pri meste …)“; pri viacerých rovnakých menách prvá. */
export function findObec(list: Obec[], name: string): Obec | null {
  const n = normCity(name);
  if (!n) return null;
  return list.find((o) => normCity(o[0]) === n) || list.find((o) => normCity(o[0].replace(/ \(pri meste .*\)$/, "")) === n) || null;
}

/** Vzdušná vzdialenosť v km. */
export function distKm(a: [number, number], b: [number, number]): number {
  const r = Math.PI / 180, dLat = (b[0] - a[0]) * r, dLon = (b[1] - a[1]) * r;
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(a[0] * r) * Math.cos(b[0] * r) * Math.sin(dLon / 2) ** 2;
  return 12742 * Math.asin(Math.sqrt(h));
}

/** Z mestských názvov inzerátov vyberie tie, ktoré sú do `km` od mesta `center` (vrátane neho). Neznáme mestá sa vynechajú. */
export function citiesWithin(list: Obec[], center: string, km: number, candidates: string[]): string[] {
  const c = findObec(list, center);
  if (!c) return [center];
  const out = candidates.filter((x) => {
    if (normCity(x) === normCity(center)) return true;
    const o = findObec(list, x);
    return !!o && distKm([c[1], c[2]], [o[1], o[2]]) <= km;
  });
  return out.includes(center) ? out : [center, ...out];
}

/** Možnosti filtra „Okruh“. */
export const RADII = [10, 20, 30, 50, 100] as const;
