// Skopíruje súbory na čítanie textu z fotky (tesseract.js) do public/ocr, aby sa načítavali z nášho webu,
// nie z cudzieho CDN (rýchlejšie a bez prenosu údajov tretej strane). Spúšťa sa pred `dev` a `build`.
import { copyFileSync, existsSync, mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const nm = join(root, "node_modules"), out = join(root, "public", "ocr");
mkdirSync(out, { recursive: true });
const files = [
  ["tesseract.js/dist/worker.min.js", "worker.min.js"],
  ["tesseract.js-core/tesseract-core-lstm.wasm.js", "tesseract-core-lstm.wasm.js"],
  ["tesseract.js-core/tesseract-core-simd-lstm.wasm.js", "tesseract-core-simd-lstm.wasm.js"],
  ["tesseract.js-core/tesseract-core-relaxedsimd-lstm.wasm.js", "tesseract-core-relaxedsimd-lstm.wasm.js"],
  ["@tesseract.js-data/eng/4.0.0_best_int/eng.traineddata.gz", "eng.traineddata.gz"],
];
for (const [from, to] of files) {
  const src = join(nm, from);
  if (!existsSync(src)) { console.warn("copy-ocr: chýba", from); continue; }
  copyFileSync(src, join(out, to));
}
console.log("copy-ocr: hotovo →", out);
