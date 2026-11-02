import type { NextConfig } from "next";

// STATIC_PREVIEW=1 vyrobí statický náhľad (len ukážkové údaje, bez servera) do priečinka out/.
// Bežný build (npm run build) zostáva serverový, aby sa neskôr dali pridať serverové funkcie.
const preview = process.env.STATIC_PREVIEW === "1";

const nextConfig: NextConfig = {
  ...(preview ? { output: "export" as const, assetPrefix: ".", trailingSlash: true, images: { unoptimized: true } } : {}),
  env: { NEXT_PUBLIC_STATIC_PREVIEW: preview ? "1" : "" },
  poweredByHeader: false,
};

export default nextConfig;
