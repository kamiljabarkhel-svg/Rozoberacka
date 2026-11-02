// Dekódovanie VIN: z prvých 3 znakov (WMI) značka, z 10. znaku približný modelový rok.
// Tabuľka WMI je prevzatá z prototypu (neúplná). Model a motorizáciu z VIN neurčujeme.
const WMI: Record<string, string> = {TMB:"Škoda",WVW:"Volkswagen",WVG:"Volkswagen",WV1:"Volkswagen",WV2:"Volkswagen",VWV:"Volkswagen",WAU:"Audi",WUA:"Audi",TRU:"Audi",WBA:"BMW",WBS:"BMW",WBY:"BMW",WMW:"Mini",VSS:"Seat",VF3:"Peugeot",VR3:"Peugeot",VF7:"Citroën",VR7:"Citroën",VR1:"DS",VF1:"Renault",UU1:"Dacia",WF0:"Ford",WDB:"Mercedes-Benz",WDC:"Mercedes-Benz",WDD:"Mercedes-Benz",W1K:"Mercedes-Benz",W1N:"Mercedes-Benz",W0L:"Opel",W0V:"Opel",ZFA:"Fiat",ZAR:"Alfa Romeo",YV1:"Volvo",YV4:"Volvo",VNK:"Toyota",SB1:"Toyota",JTD:"Toyota",KMH:"Hyundai",TMA:"Hyundai",KNA:"Kia",KND:"Kia",U5Y:"Kia",JMZ:"Mazda",JHM:"Honda",SHH:"Honda",JN1:"Nissan",SJN:"Nissan",JS2:"Suzuki",TSM:"Suzuki",WP0:"Porsche",SAL:"Land Rover",SAJ:"Jaguar",JF1:"Subaru",JMB:"Mitsubishi","5YJ":"Tesla",XP7:"Tesla",LRW:"Tesla"};
const YC = "ABCDEFGHJKLMNPRSTVWXY";

/** Približný modelový rok z 10. znaku. Kód sa opakuje každých 30 rokov, berieme najbližší neskorší neprekračujúci budúci rok. */
export function vinYear(c: string, now = new Date().getFullYear()): number | null {
  let y = 0;
  const k = YC.indexOf(c);
  if (k > -1) y = 2010 + k;
  else if (/[1-9]/.test(c)) y = 2000 + Number(c);
  else return null;
  while (y > now + 1) y -= 30;
  return y;
}

export type VinResult =
  | { ok: false; msg: string }
  | { ok: true; brand: string | null; year: number | null };

export function decodeVin(raw: string): VinResult {
  const v = raw.trim().toUpperCase().replace(/\s/g, "");
  if (!v) return { ok: false, msg: "Zadajte VIN." };
  if (!/^[A-HJ-NPR-Z0-9]{17}$/.test(v)) return { ok: false, msg: "Neplatný VIN: musí mať 17 znakov a nesmie obsahovať písmená I, O, Q." };
  return { ok: true, brand: WMI[v.slice(0, 3)] || null, year: vinYear(v.charAt(9)) };
}
