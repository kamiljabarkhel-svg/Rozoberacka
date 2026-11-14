"use client";
import { useState } from "react";

/** Mapa s približnou polohou (mesto predajcu). Načíta sa až po kliknutí – dovtedy sa nič neposiela do OpenStreetMap. */
export default function CityMap({ city }: { city: string }) {
  const [st, setSt] = useState<"idle" | "load" | "err" | { lat: number; lon: number }>("idle");
  if (!city) return null;
  const show = async () => {
    setSt("load");
    try {
      const j = await (await fetch(`/api/mesto?q=${encodeURIComponent(city)}`)).json();
      setSt(j.ok ? { lat: j.lat, lon: j.lon } : "err");
    } catch { setSt("err"); }
  };
  if (typeof st === "object") {
    const d = 0.08, bb = [st.lon - d * 1.6, st.lat - d, st.lon + d * 1.6, st.lat + d].map((x) => x.toFixed(4)).join(",");
    return <div className="citymap">
      <iframe title={`Mapa – ${city}`} loading="lazy" src={`https://www.openstreetmap.org/export/embed.html?bbox=${bb}&layer=mapnik&marker=${st.lat.toFixed(5)},${st.lon.toFixed(5)}`} />
      <small className="mute">Približná poloha: {city} (mesto z inzerátu, nie presná adresa). Mapa © <a href={`https://www.openstreetmap.org/?mlat=${st.lat}&mlon=${st.lon}#map=12/${st.lat}/${st.lon}`} target="_blank" rel="noopener">prispievatelia OpenStreetMap</a></small>
    </div>;
  }
  return <div className="citymap-b">
    <button type="button" className="ubtn" onClick={show} disabled={st === "load"}>{st === "load" ? "Načítavam mapu…" : `Zobraziť na mape: ${city}`}</button>
    {st === "err" && <small className="mute">Mesto „{city}“ sa na mape nepodarilo nájsť.</small>}
    {st === "idle" && <small className="mute">Mapa sa načíta z OpenStreetMap až po kliknutí.</small>}
  </div>;
}
