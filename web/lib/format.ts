export function pieces(n: number): string {
  return n + " " + (n === 1 ? "diel" : n >= 2 && n <= 4 ? "diely" : "dielov");
}
export function photosText(n: number): string {
  return n + " " + (n === 1 ? "fotka" : n < 5 ? "fotky" : "fotiek");
}
export function price(p: number): string {
  return new Intl.NumberFormat("sk-SK", { minimumFractionDigits: Number.isInteger(p) ? 0 : 2, maximumFractionDigits: 2 }).format(p) + " €";
}
export function agoText(iso: string, now = Date.now()): string {
  const d = Math.max(0, Math.floor((now - Date.parse(iso)) / 86400000));
  return d === 0 ? "dnes" : d === 1 ? "včera" : "pred " + d + " dňami";
}
export function condDot(c: string): string {
  return c === "Na opravu" ? "b" : c === "Dobrý" ? "w" : "";
}
export function sk(a: string, b: string): number {
  return a.localeCompare(b, "sk");
}
