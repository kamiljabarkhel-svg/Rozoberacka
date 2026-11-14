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
  // Google Analytics 4 (len po súhlase) – domény podľa návodu Google pre CSP
  const ga = /^G-[A-Z0-9]+$/.test((process.env.NEXT_PUBLIC_GA_ID || "").trim());
  const gaScript = ga ? " https://www.googletagmanager.com" : "";
  const gaConnect = ga ? " https://*.google-analytics.com https://*.analytics.google.com https://www.googletagmanager.com" : "";
  const gaImg = ga ? " https://*.google-analytics.com https://www.googletagmanager.com" : "";
  // Cloudflare Turnstile (ochrana proti robotom) – len ak je zapnutý
  const ts = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY ? " https://challenges.cloudflare.com" : "";
  const csp = [
    "default-src 'self'",
    // 'unsafe-inline' potrebuje Next.js pre vložené skripty stránky; 'wasm-unsafe-eval' a blob: čítanie čísla z fotky (tesseract.js)
    `script-src 'self' 'unsafe-inline' 'wasm-unsafe-eval' blob:${dev ? " 'unsafe-eval'" : ""}${an ? " " + an : ""}${gaScript}${ts}`,
    "worker-src 'self' blob:",
    "style-src 'self' 'unsafe-inline'",
    `img-src 'self' data: blob: ${supa}${gaImg}`.trim(),
    "font-src 'self' data:",
    `connect-src 'self' ${supa} ${ws} ${an}${gaConnect}${ts}`.trim(),
    "manifest-src 'self'",
    "media-src 'self' blob:",
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    `frame-src https://www.openstreetmap.org${ts}`,
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
  // fotky blogu z Unsplash podávame cez náš server (/_next/image) – prehliadač návštevníka sa na Unsplash nepripája
  ...(preview ? {} : { images: { remotePatterns: [{ protocol: "https" as const, hostname: "images.unsplash.com", pathname: "/photo-*" }], deviceSizes: [400, 640, 960, 1200, 1600, 1920], imageSizes: [64, 128, 256], formats: ["image/avif" as const, "image/webp" as const], minimumCacheTTL: 2678400 } }),
  ...(preview ? {} : { async headers() { return [{ source: "/:path*", headers: securityHeaders() }]; } }),
  // nahradený článok (12. 11. 2026)
  ...(preview ? {} : { async redirects() {
    // Po nastavení NEXT_PUBLIC_SITE_URL (vlastná doména) presmeruje starú adresu rozoberacka.vercel.app na doménu.
    const site = (process.env.NEXT_PUBLIC_SITE_URL || "").replace(/\/$/, "");
    const toDomain = /^https:\/\/(?!rozoberacka\.vercel\.app)[a-z0-9.-]+$/.test(site)
      ? [{ source: "/:path*", has: [{ type: "host" as const, value: "rozoberacka.vercel.app" }], destination: site + "/:path*", permanent: true }] : [];
    return [...toDomain, { source: "/blog/pouzite-diely-z-vrakoviska", destination: "/blog", permanent: true }];
  } }),
};

export default nextConfig;
