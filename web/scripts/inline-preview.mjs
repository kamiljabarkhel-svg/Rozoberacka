// Statický náhľad v JEDNOM súbore: z out/index.html (STATIC_PREVIEW=1 next build) vloží CSS, JS a písma priamo do HTML.
// Výsledok sa dá otvoriť dvojklikom (file://), bez servera. Len ukážkové údaje.
// Použitie: node scripts/inline-preview.mjs [cieľový priečinok]   (predvolene out-single/)
import { readFileSync, writeFileSync, mkdirSync, existsSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const web = join(dirname(fileURLToPath(import.meta.url)), "..");
const out = join(web, "out");
const dest = resolve(process.argv[2] || join(web, "out-single"));
if (!existsSync(join(out, "index.html"))) throw new Error("Chýba out/index.html – najprv STATIC_PREVIEW=1 next build");

const file = (href) => join(out, href.replace(/^\.?\//, "").split("?")[0]);
const mime = { woff2: "font/woff2", woff: "font/woff", svg: "image/svg+xml", png: "image/png" };

let html = readFileSync(join(out, "index.html"), "utf8");

// CSS: vložiť a písma zmeniť na data: URL
html = html.replace(/<link rel="stylesheet" href="([^"]+)"[^>]*>/g, (_, href) => {
  const p = file(href);
  let css = readFileSync(p, "utf8");
  css = css.replace(/url\(([^)]+)\)/g, (m, u) => {
    u = u.replace(/["']/g, "");
    if (u.startsWith("data:") || u.startsWith("#")) return m;
    const f = u.includes("_next/") ? file(u.slice(u.indexOf("_next/"))) : resolve(dirname(p), u);
    const ext = f.split(".").pop();
    return `url(data:${mime[ext] || "application/octet-stream"};base64,${readFileSync(f).toString("base64")})`;
  });
  return `<style>${css}</style>`;
});
// JS: vložiť skripty v pôvodnom poradí
html = html.replace(/<script src="([^"]+)"[^>]*><\/script>/g, (_, src) => {
  const js = readFileSync(file(src), "utf8").replace(/<\/script/gi, "<\\/script");
  return `<script>${js}</script>`;
});
// Odstrániť prednačítanie súborov, ktoré už sú vložené
// Odkazy na CSS v dátach pre React: CSS je už vložené, nahradiť prázdnym data: URL (inak chyba pri file://)
html = html.replace(/\.\/_next\/static\/css\/[a-z0-9]+\.css/g, "data:text/css,");
html = html.replace(/<link rel="preload"[^>]*>/g, "").replace(/<link rel="icon"[^>]*>/g, "");

mkdirSync(dest, { recursive: true });
writeFileSync(join(dest, "index.html"), html);
console.log("Hotovo:", join(dest, "index.html"), Math.round(html.length / 1024) + " kB");
