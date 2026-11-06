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
