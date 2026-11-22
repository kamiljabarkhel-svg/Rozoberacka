// Názvy súborov fotiek v úložisku. Veľká fotka je vždy JPEG (funguje všade, aj pri zdieľaní odkazu),
// zmenšené verzie sú WebP, ak ich prehliadač predajcu vedel vytvoriť (menej dát na mobile):
//   nové (od 6. 11. 2026):  X.w.jpg  +  X.w_m.webp (960 px)  +  X.w_t.webp (480 px)
//   bez WebP / staršie:     X.jpg    +  X_m.jpg              +  X_t.jpg  (X_m.jpg nemajú fotky pred 6. 11. 2026)
const ext = (p: string) => /^https?:|^data:/.test(p);
export function thumbPath(path: string): string {
  if (ext(path)) return path;
  return /\.w\.jpg$/.test(path) ? path.replace(/\.w\.jpg$/, ".w_t.webp") : path.replace(/\.jpg$/, "_t.jpg");
}
export function mediumPath(path: string): string {
  if (ext(path)) return path;
  return /\.w\.jpg$/.test(path) ? path.replace(/\.w\.jpg$/, ".w_m.webp") : path.replace(/\.jpg$/, "_m.jpg");
}
/** Všetky súbory jednej fotky (na zmazanie). */
export const filesOf = (path: string) => [path, mediumPath(path), thumbPath(path)];

/** Najväčšia fotka, ktorú prijmeme od predajcu (pred zmenšením v prehliadači). Bežná fotka z mobilu má 2 – 8 MB,
 *  fotky s 50 – 200 Mpx až okolo 20 MB. Na portál sa aj tak ukladá zmenšená verzia (pár stoviek kB). */
export const MAX_PHOTO_MB = 20;
/** Rozdelí vybrané súbory na obrázky v povolenej veľkosti a príliš veľké (len názvy). */
export function splitPhotoFiles(files: Iterable<File>): { ok: File[]; tooBig: string[] } {
  const ok: File[] = [], tooBig: string[] = [];
  for (const f of files) {
    if (!f.type.startsWith("image/") && !/\.(jpe?g|png|webp)$/i.test(f.name)) continue;
    if (f.size > MAX_PHOTO_MB * 1024 * 1024) tooBig.push(f.name); else ok.push(f);
  }
  return { ok, tooBig };
}
export const tooBigMsg = (names: string[]) => names.length
  ? `${names.length === 1 ? "Fotka" : `${names.length} fotky`} ${names.length === 1 ? "je" : "sú"} väčšia ako ${MAX_PHOTO_MB} MB a nepridala sa: ${names.slice(0, 3).join(", ")}${names.length > 3 ? "…" : ""}. Zmenšite ju alebo ju odfoťte v nižšom rozlíšení.`
  : "";
