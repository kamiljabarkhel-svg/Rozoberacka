// Hromadné fotky: priradenie súborov k inzerátom podľa názvu súboru.
// Pravidlá (rovnaké v importe CSV aj pri dopĺňaní fotiek):
//  - stĺpec „fotky“ v CSV: presné názvy súborov oddelené |  (napr. svetlo1.jpg | svetlo2.jpg)
//  - podľa čísla dielu: 5E1941015.jpg, 5E1941015_1.jpg, 5E1941015-2.jpg, „5E1941015 (3).jpg“
//  - podľa čísla inzerátu: ID123.jpg, ID123_2.jpg (číslo vidno v adrese inzerátu /diel/123-…)

export const MAX_PHOTOS = 8;
/** Formáty, ktoré prehliadač vie spracovať (HEIC z iPhonu nie – treba nastaviť „Najkompatibilnejší“ formát). */
export const PHOTO_EXT = /\.(jpe?g|png|webp|gif|bmp|avif)$/i;

export const keyOf = (s: string) => s.normalize("NFD").replace(/[̀-ͯ]/g, "").toUpperCase().replace(/[^A-Z0-9]/g, "");
/** Názov súboru bez priečinka. */
export const baseName = (f: { name: string; webkitRelativePath?: string }) => f.name.split(/[\\/]/).pop() || f.name;
const stem = (name: string) => name.replace(/\.[^.]+$/, "");
const numSuffix = /(?:[ _-]+\(?(\d{1,2})\)?|\s*\((\d{1,2})\))$/;

/** Kľúče súboru: celý názov a názov bez poradového čísla na konci. order = poradové číslo (pre zoradenie fotiek). */
export function fileKeys(name: string): { full: string; short: string | null; order: number; id: number | null } {
  const s = stem(name).trim();
  const m = s.match(numSuffix);
  const shortStem = m ? s.slice(0, m.index).trim() : null;
  const order = m ? Number(m[1] || m[2]) : 0;
  const idm = (shortStem ?? s).match(/^ID\s*[-_ ]?\s*(\d+)$/i) || s.match(/^ID\s*[-_ ]?\s*(\d+)$/i);
  return { full: keyOf(s), short: shortStem ? keyOf(shortStem) : null, order, id: idm ? Number(idm[1]) : null };
}

export function isPhoto(f: File) { return f.type.startsWith("image/") || PHOTO_EXT.test(f.name); }

/** Zoradí súbory podľa poradového čísla v názve (bez čísla = prvá), potom podľa názvu. */
export function sortPhotos(files: File[]): File[] {
  return [...files].sort((a, b) => fileKeys(baseName(a)).order - fileKeys(baseName(b)).order || baseName(a).localeCompare(baseName(b), "sk", { numeric: true }));
}

/** Súbory podľa presného názvu (bez ohľadu na veľké/malé písmená). */
export function byExactName(files: File[]): Map<string, File> {
  const m = new Map<string, File>();
  for (const f of files) m.set(baseName(f).toLowerCase(), f);
  return m;
}

/** Súbory zoskupené podľa kľúča (číslo dielu alebo ID). Súbor patrí pod celý názov aj pod názov bez poradového čísla. */
export function groupByKey(files: File[]): { byKey: Map<string, File[]>; byId: Map<number, File[]> } {
  const byKey = new Map<string, File[]>(), byId = new Map<number, File[]>();
  const add = <K,>(m: Map<K, File[]>, k: K, f: File) => { const a = m.get(k); if (a) { if (!a.includes(f)) a.push(f); } else m.set(k, [f]); };
  for (const f of files) {
    const k = fileKeys(baseName(f));
    if (k.id != null) { add(byId, k.id, f); continue; }
    if (k.full.length >= 4) add(byKey, k.full, f);
    if (k.short && k.short.length >= 4) add(byKey, k.short, f);
  }
  return { byKey, byId };
}

/** Rozdelí text zo stĺpca „fotky“ na názvy súborov. */
export function splitNames(v: string): string[] {
  return v.split("|").map((x) => x.trim().split(/[\\/]/).pop() || "").filter(Boolean);
}
