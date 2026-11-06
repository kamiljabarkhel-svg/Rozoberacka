"use client";
// Čítanie čísla z fotky (OEM číslo dielu, VIN) priamo v prehliadači – fotka sa nikam neposiela.
// Súbory rozpoznávania (tesseract.js) sú na našom webe v /ocr (scripts/copy-ocr.mjs), načítajú sa až pri prvom použití.

type Progress = (pct: number) => void;

/** Zmenší fotku a prevedie ju na čiernobielu s vyšším kontrastom (lepšie čítanie vyrazených a tlačených čísel). */
async function prepare(file: File): Promise<HTMLCanvasElement> {
  const url = URL.createObjectURL(file);
  try {
    const img = await new Promise<HTMLImageElement>((ok, bad) => { const i = new Image(); i.onload = () => ok(i); i.onerror = () => bad(new Error("Súbor nie je fotka.")); i.src = url; });
    const k = Math.min(1, 1800 / Math.max(img.naturalWidth, img.naturalHeight));
    const cv = document.createElement("canvas");
    cv.width = Math.round(img.naturalWidth * k); cv.height = Math.round(img.naturalHeight * k);
    const g = cv.getContext("2d", { willReadFrequently: true })!;
    g.drawImage(img, 0, 0, cv.width, cv.height);
    const d = g.getImageData(0, 0, cv.width, cv.height), p = d.data;
    for (let i = 0; i < p.length; i += 4) {
      const y = 0.299 * p[i] + 0.587 * p[i + 1] + 0.114 * p[i + 2];
      const v = Math.max(0, Math.min(255, (y - 128) * 1.5 + 128));
      p[i] = p[i + 1] = p[i + 2] = v;
    }
    g.putImageData(d, 0, 0);
    return cv;
  } finally { URL.revokeObjectURL(url); }
}

export async function readText(file: File, onProgress?: Progress): Promise<string> {
  const cv = await prepare(file);
  const { createWorker, OEM, PSM } = await import("tesseract.js");
  const worker = await createWorker("eng", OEM.LSTM_ONLY, {
    workerPath: "/ocr/worker.min.js", corePath: "/ocr", langPath: "/ocr", gzip: true, cacheMethod: "none", // nič neukladáme do zariadenia
    logger: (m) => { if (m.status === "recognizing text" && onProgress) onProgress(Math.round(m.progress * 100)); },
  });
  try {
    await worker.setParameters({ tessedit_pageseg_mode: PSM.SPARSE_TEXT, tessedit_char_whitelist: "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789 -./" });
    const { data } = await worker.recognize(cv);
    return data.text || "";
  } finally { await worker.terminate(); }
}

/** VIN: 17 znakov bez I, O, Q (časté zámeny O→0, I→1, Q→0 opravíme). Najprv celé slová, potom výrezy z riadku. */
export function vinCandidates(text: string): string[] {
  const out: string[] = [];
  const fix = (t: string) => t.replace(/[^A-Z0-9]/g, "").replace(/O/g, "0").replace(/Q/g, "0").replace(/I/g, "1");
  const ok = (c: string) => /^[A-HJ-NPR-Z0-9]{17}$/.test(c) && /\d/.test(c) && /[A-Z]/.test(c);
  const lines = text.toUpperCase().split(/\n/);
  for (const line of lines) {
    const w = line.split(/\s+/).filter(Boolean);
    for (let i = 0; i < w.length; i++) for (let j = i; j < Math.min(w.length, i + 4); j++) {
      const c = fix(w.slice(i, j + 1).join(""));
      if (c.length === 17 && ok(c) && !out.includes(c)) out.push(c);
    }
  }
  if (!out.length) for (const line of lines) {
    const t = fix(line);
    for (let i = 0; i + 17 <= t.length; i++) { const c = t.slice(i, i + 17); if (ok(c) && !out.includes(c)) out.push(c); }
  }
  return out.slice(0, 5);
}

/** Časté chyby čítania: „O“ medzi číslicami je nula, zdvojené „O0“ je jedna nula. */
function fixDigits(t: string): string {
  return t.replace(/O0|0O/g, "0").replace(/(?<=\d)O|O(?=\d)/g, "0");
}

/** OEM: skupiny písmen a číslic (aspoň 3 číslice, 6–15 znakov), aj rozdelené medzerami ako „5E0 823 031 A“. */
export function oemCandidates(text: string): string[] {
  const out: string[] = [];
  const add = (s: string) => { const c = s.toUpperCase().replace(/[^A-Z0-9]/g, ""); if (c.length >= 6 && c.length <= 15 && (c.match(/\d/g) || []).length >= 3 && !out.includes(c)) out.push(c); };
  const raw = text.toUpperCase();
  for (const T of [fixDigits(raw), raw]) {
    // formát VW/Škoda/Audi: 3 + 3 + 3 znaky a voliteľné písmená verzie
    for (const m of T.matchAll(/\b([0-9A-Z]{3})[ .\-]?(\d{3})[ .\-]?(\d{3})(?:[ .\-]?([A-Z]{1,2}))?\b/g)) add(m.slice(1).filter(Boolean).join(""));
    // skupiny oddelené medzerou, bodkou alebo pomlčkou (napr. 7 260 234, 0 986 4 5)
    for (const m of T.matchAll(/\b[0-9A-Z]*\d[0-9A-Z]*(?:[ .\-][0-9A-Z]*\d[0-9A-Z]*){1,4}(?:[ .\-][A-Z]{1,2}\b)?/g)) add(m[0]);
    for (const m of T.matchAll(/\b[0-9A-Z][0-9A-Z.\-]{4,18}[0-9A-Z]\b/g)) add(m[0]);
  }
  return out.slice(0, 6);
}
