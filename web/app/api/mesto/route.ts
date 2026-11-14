import { NextResponse } from "next/server";

// Približná poloha mesta pre mapu v detaile dielu. Hľadá server (nie prehliadač návštevníka),
// takže OpenStreetMap nevidí IP návštevníka. Výsledok si server pamätá 30 dní.
// Väčšie mestá SR – bez volania OpenStreetMap (približný stred mesta).
const SK: Record<string, [number, number]> = {
  "bratislava": [48.1486, 17.1077], "kosice": [48.7164, 21.2611], "presov": [48.9984, 21.2339], "zilina": [49.2231, 18.7394],
  "nitra": [48.3069, 18.0864], "banska bystrica": [48.7363, 19.1462], "trnava": [48.3774, 17.5872], "trencin": [48.8945, 18.0444],
  "martin": [49.0665, 18.9238], "poprad": [49.0614, 20.2980], "prievidza": [48.7745, 18.6275], "zvolen": [48.5762, 19.1371],
  "povazska bystrica": [49.1214, 18.4214], "michalovce": [48.7543, 21.9195], "nove zamky": [47.9857, 18.1619], "spisska nova ves": [48.9446, 20.5615],
  "komarno": [47.7631, 18.1203], "levice": [48.2172, 18.6007], "humenne": [48.9371, 21.9063], "bardejov": [49.2918, 21.2727],
  "liptovsky mikulas": [49.0838, 19.6120], "lucenec": [48.3305, 19.6667], "piestany": [48.5918, 17.8270], "ruzomberok": [49.0748, 19.3034],
  "topolcany": [48.5590, 18.1771], "cadca": [49.4380, 18.7894], "dubnica nad vahom": [48.9590, 18.1717], "rimavska sobota": [48.3838, 20.0153],
  "partizanske": [48.6276, 18.3742], "senica": [48.6792, 17.3667], "dunajska streda": [47.9927, 17.6143], "vranov nad toplou": [48.8889, 21.6849],
  "pezinok": [48.2895, 17.2665], "sala": [48.1517, 17.8801], "hlohovec": [48.4310, 17.8028], "brezno": [48.8049, 19.6386],
  "senec": [48.2189, 17.3998], "malacky": [48.4364, 17.0182], "galanta": [48.1902, 17.7263], "skalica": [48.8449, 17.2265],
  "kezmarok": [49.1356, 20.4302], "puchov": [49.1236, 18.3261], "roznava": [48.6611, 20.5317], "snina": [48.9876, 22.1567],
  "dolny kubin": [49.2098, 19.2963], "stara lubovna": [49.2986, 20.6864], "sabinov": [49.1030, 21.0980], "myjava": [48.7580, 17.5687],
  "nove mesto nad vahom": [48.7552, 17.8303], "banovce nad bebravou": [48.7209, 18.2580], "ziar nad hronom": [48.5915, 18.8492], "detva": [48.5602, 19.4209],
  "velky krtis": [48.2109, 19.3480], "stupava": [48.2745, 17.0319], "samorin": [48.0300, 17.3083], "rovinka": [48.1003, 17.2311], "trebisov": [48.6286, 21.7196],
  "svidnik": [49.3069, 21.5672], "kysucke nove mesto": [49.3002, 18.7861], "namestovo": [49.4079, 19.4813], "tvrdosin": [49.3363, 19.5554],
};
const norm = (t: string) => t.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/\s+/g, " ").trim();

export async function GET(req: Request) {
  const q = (new URL(req.url).searchParams.get("q") || "").trim().slice(0, 80);
  if (q.length < 2) return NextResponse.json({ ok: false }, { status: 400 });
  const k = SK[norm(q)];
  if (k) return NextResponse.json({ ok: true, lat: k[0], lon: k[1] }, { headers: { "Cache-Control": "public, s-maxage=2592000" } });
  try {
    const u = `https://nominatim.openstreetmap.org/search?format=json&limit=1&countrycodes=sk,cz&q=${encodeURIComponent(q)}`;
    const r = await fetch(u, { headers: { "User-Agent": "autosuciastky.eu (autosuciastky.eu@gmail.com)", "Accept-Language": "sk" }, next: { revalidate: 60 * 60 * 24 * 30 } });
    const j = (await r.json()) as { lat: string; lon: string }[];
    if (!j[0]) return NextResponse.json({ ok: false }, { headers: { "Cache-Control": "public, s-maxage=86400" } });
    return NextResponse.json({ ok: true, lat: Number(j[0].lat), lon: Number(j[0].lon) }, { headers: { "Cache-Control": "public, s-maxage=2592000" } });
  } catch {
    return NextResponse.json({ ok: false }, { status: 502 });
  }
}
