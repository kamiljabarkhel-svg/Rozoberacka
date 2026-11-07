import type { NextConfig } from "next";

// STATIC_PREVIEW=1 vyrobí statický náhľad (len ukážkové údaje, bez servera) do priečinka out/.
// Bežný build (npm run build) zostáva serverový, aby sa neskôr dali pridať serverové funkcie.
const preview = process.env.STATIC_PREVIEW === "1";
const dev = process.env.NODE_ENV !== "production";

// Bezpečnostné hlavičky: web sa nedá vložiť do cudzej stránky, prehliadač načíta skripty, obrázky a údaje
// len z nášho webu a zo Supabase (Content-Security-Policy) a vždy použije HTTPS.
function securityHeaders() {
  let supa = "";
  try { supa = new URL(process.env.NEXT_PUBLIC_SUPABASE_URL || "").origin; } catch {}
  const ws = supa.replace(/^http/, "ws");
  // meranie návštevnosti (len po súhlase s cookies) – jeho doména musí byť povolená
  let an = "";
  try { an = process.env.NEXT_PUBLIC_ANALYTICS_SRC ? new URL(process.env.NEXT_PUBLIC_ANALYTICS_SRC).origin : ""; } catch {}
  const csp = [
    "default-src 'self'",
    // 'unsafe-inline' potrebuje Next.js pre vložené skripty stránky; 'wasm-unsafe-eval' a blob: čítanie čísla z fotky (tesseract.js)
    `script-src 'self' 'unsafe-inline' 'wasm-unsafe-eval' blob:${dev ? " 'unsafe-eval'" : ""}${an ? " " + an : ""}`,
    "worker-src 'self' blob:",
    "style-src 'self' 'unsafe-inline'",
    `img-src 'self' data: blob: ${supa}`.trim(),
    "font-src 'self' data:",
    `connect-src 'self' ${supa} ${ws} ${an}`.trim(),
    "manifest-src 'self'",
    "media-src 'self' blob:",
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    "frame-ancestors 'none'",
  ].join("; ");
  return [
    { key: "Content-Security-Policy", value: csp },
    { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains" },
    { key: "X-Frame-Options", value: "DENY" },
    { key: "X-Content-Type-Options", value: "nosniff" },
    { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
    { key: "Permissions-Policy", value: "camera=(self), microphone=(), geolocation=(), payment=(), usb=(), browsing-topics=()" },
    { key: "Cross-Origin-Opener-Policy", value: "same-origin" },
  ];
}

const nextConfig: NextConfig = {
  ...(preview ? { output: "export" as const, assetPrefix: ".", trailingSlash: true, images: { unoptimized: true } } : {}),
  env: { NEXT_PUBLIC_STATIC_PREVIEW: preview ? "1" : "" },
  poweredByHeader: false,
  ...(preview ? {} : { async headers() { return [{ source: "/:path*", headers: securityHeaders() }]; } }),
};

export default nextConfig;
