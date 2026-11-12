import type { MetadataRoute } from "next";

// Web sa dá pridať na plochu mobilu ako aplikácia (ikona, celá obrazovka, skratky).
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "autosuciastky.eu – použité autodiely",
    short_name: "autosuciastky.eu",
    description: "Použité autodiely z vrakovísk presne na vaše auto.",
    lang: "sk",
    start_url: "/",
    scope: "/",
    display: "standalone",
    orientation: "portrait",
    background_color: "#f3f4f6",
    theme_color: "#24282e",
    categories: ["shopping", "auto"],
    icons: [
      { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/icons/maskable-192.png", sizes: "192x192", type: "image/png", purpose: "maskable" },
      { src: "/icons/maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
    shortcuts: [
      { name: "Dopyt na diel", url: "/dopyt", icons: [{ src: "/icons/icon-192.png", sizes: "192x192" }] },
      { name: "Obľúbené diely", url: "/?oblubene=1#vysledky", icons: [{ src: "/icons/icon-192.png", sizes: "192x192" }] },
      { name: "Portál predajcu", url: "/predajca", icons: [{ src: "/icons/icon-192.png", sizes: "192x192" }] },
    ],
  };
}
