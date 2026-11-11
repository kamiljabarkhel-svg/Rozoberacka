// Dekódovanie VIN (norma ISO 3779): z prvých 3 znakov (WMI) výrobca a druh vozidla, z 10. znaku približný modelový rok.
// Tabuľka WMI je z pamäte a neúplná (prepracovaná 11. 11. 2026 pre osobné autá, dodávky, nákladné autá, autobusy a motorky).
// Model a motorizáciu z VIN neurčujeme – každý výrobca ich kóduje inak (na to treba licencovaný katalóg, napr. TecDoc).
//
// Rok: 10. znak je povinný len v Severnej Amerike. V Európe ho mnohí výrobcovia nepoužívajú (Mercedes-Benz, BMW, Renault,
// PSA, Fiat, Opel, väčšina nákladných áut a autobusov) a Ford Európa má rok v 11. znaku. Rok preto čítame len pri výrobcoch,
// ktorí ho tam spoľahlivo zapisujú, a kód sa opakuje každých 30 rokov (S = 1995 aj 2025) – vtedy vrátime obe možnosti.

export type VinVehicle = "osobne" | "dodavky" | "nakladne" | "autobusy" | "motorky";
/** [značka v katalógu, druh vozidla (ak ho WMI určuje), 10. znak = rok, kód používaný od roku (nové závody)] */
type W = [string, VinVehicle | null, boolean, number?];

const car = (b: string, year = false, since?: number): W => [b, null, year, since];
const only = (b: string, vt: VinVehicle, year = false): W => [b, vt, year];

const WMI: Record<string, W> = {
  // --- koncern VW (rok v 10. znaku zapisuje) ---
  TMB: car("Škoda", true), TMP: car("Škoda", true), WVW: car("Volkswagen", true), WVG: car("Volkswagen", true), WV1: car("Volkswagen", true),
  WV2: car("Volkswagen", true), WV3: only("Volkswagen", "nakladne"), VWV: car("Volkswagen", true), VWA: car("Volkswagen", true), WVM: car("Volkswagen", true),
  "3VW": car("Volkswagen", true), WAU: car("Audi", true), WUA: car("Audi", true), TRU: car("Audi", true), VSS: car("Seat", true), WP0: car("Porsche", true), WP1: car("Porsche", true),
  // --- ostatné európske osobné a dodávky ---
  WBA: car("BMW"), WBS: car("BMW"), WBY: car("BMW"), WBX: car("BMW"), "5UX": car("BMW", true), "4US": car("BMW", true), WMW: car("Mini"),
  WDB: car("Mercedes-Benz"), WDC: car("Mercedes-Benz"), WDD: car("Mercedes-Benz"), WDF: car("Mercedes-Benz"), W1K: car("Mercedes-Benz"), W1N: car("Mercedes-Benz"),
  W1V: only("Mercedes-Benz", "dodavky"), W1T: only("Mercedes-Benz", "nakladne"), "4JG": car("Mercedes-Benz", true), WME: car("Smart"),
  W0L: car("Opel"), W0V: car("Opel"), VXK: car("Opel"), VF3: car("Peugeot"), VR3: car("Peugeot"), VF7: car("Citroën"), VR7: car("Citroën"), VR1: car("DS"),
  VF1: car("Renault"), UU1: car("Dacia"), ZFA: car("Fiat"), ZFB: car("Fiat"), ZAR: car("Alfa Romeo"), ZLA: car("Lancia"), ZAC: car("Jeep"), ZFF: car("Ferrari"), ZHW: car("Lamborghini"), ZAM: car("Maserati"),
  WF0: car("Ford"), VS6: car("Ford"), SFA: car("Ford"), NM0: car("Ford"), "1FA": car("Ford", true), "1FT": car("Ford", true), "1FM": car("Ford", true),
  YV1: car("Volvo", true), YV4: car("Volvo", true), LYV: car("Volvo", true), YS3: car("Saab", true), LPS: car("Polestar", true),
  SAL: car("Land Rover", true), SAJ: car("Jaguar", true), SAD: car("Jaguar", true), SCB: car("Bentley"), SCA: car("Rolls-Royce"), SCF: car("Aston Martin"), SCC: car("Lotus"), SBM: car("McLaren"), SAR: car("Rover"),
  XTA: car("Lada"), ZCF: car("Iveco"),
  // --- ázijské (rok zapisujú) ---
  KMH: car("Hyundai", true), TMA: car("Hyundai", true, 2008), NLH: car("Hyundai", true), MAL: car("Hyundai", true), KMF: only("Hyundai", "dodavky", true),
  KNA: car("Kia", true), KND: car("Kia", true), KNE: car("Kia", true), U5Y: car("Kia", true, 2006), U6Y: car("Kia", true, 2006),
  JTD: car("Toyota", true), JTE: car("Toyota", true), JTN: car("Toyota", true), JTM: car("Toyota", true), JTG: car("Toyota", true), SB1: car("Toyota", true), VNK: car("Toyota", true), NMT: car("Toyota", true),
  JTH: car("Lexus", true), JTJ: car("Lexus", true), JHM: car("Honda", true), SHH: car("Honda", true), SHS: car("Honda", true),
  JN1: car("Nissan", true), SJN: car("Nissan"), VSK: car("Nissan"), JNK: car("Infiniti", true), SJK: car("Infiniti"),
  JMZ: car("Mazda"), JMB: car("Mitsubishi"), JMY: car("Mitsubishi"), XMC: car("Mitsubishi"), MMB: car("Mitsubishi"),
  JS2: car("Suzuki"), JSA: car("Suzuki"), TSM: car("Suzuki"), VSE: car("Suzuki"), MA3: car("Suzuki"), JF1: car("Subaru", true), JF2: car("Subaru", true), JDA: car("Daihatsu"),
  KLA: car("Daewoo"), KL1: car("Chevrolet", true), KPT: car("SsangYong (KGM)"), LSJ: car("MG"), LGX: car("BYD"), LC0: car("BYD"),
  "5YJ": car("Tesla", true), "7SA": car("Tesla", true), XP7: car("Tesla", true, 2022), LRW: car("Tesla", true, 2020),
  "1C4": car("Jeep", true), "1J4": car("Jeep", true), "1C3": car("Chrysler", true), "2C3": car("Chrysler", true), "1G6": car("Cadillac", true),
  // --- nákladné autá (rok v 10. znaku väčšinou nie je) ---
  WMA: car("MAN"), YS2: only("Scania", "nakladne"), YV2: only("Volvo", "nakladne"), XLR: only("DAF", "nakladne"), VF6: only("Renault Trucks", "nakladne"),
  TNT: only("Tatra", "nakladne"), JAL: car("Isuzu"), JL6: only("Mitsubishi Fuso", "nakladne"), NMB: only("Ford Trucks", "nakladne"),
  // --- autobusy ---
  WEB: only("Mercedes-Benz", "autobusy"), WKK: only("Setra", "autobusy"), WAG: only("Neoplan", "autobusy"), SUU: only("Solaris", "autobusy"), VNE: only("Iveco Bus", "autobusy"),
  TMK: only("Karosa", "autobusy"), YV3: only("Volvo", "autobusy"), YS4: only("Scania", "autobusy"), YE2: only("Van Hool", "autobusy"), NLT: only("Temsa", "autobusy"),
  // --- motorky a štvorkolky (japonské a severoamerické rok zapisujú) ---
  JH2: only("Honda", "motorky", true), JH3: only("Honda", "motorky", true), ZDC: only("Honda", "motorky"), JYA: only("Yamaha", "motorky", true), JYE: only("Yamaha", "motorky", true),
  VTL: only("Yamaha", "motorky"), JKA: only("Kawasaki", "motorky", true), JKB: only("Kawasaki", "motorky", true), JS1: only("Suzuki", "motorky", true),
  VBK: only("KTM", "motorky", true), WB1: only("BMW", "motorky"), WB3: only("BMW", "motorky"), ZDM: only("Ducati", "motorky", true), SMT: only("Triumph", "motorky", true),
  "1HD": only("Harley-Davidson", "motorky", true), "5HD": only("Harley-Davidson", "motorky", true), ZD4: only("Aprilia", "motorky"), ZAP: only("Piaggio", "motorky"),
  ZGU: only("Moto Guzzi", "motorky"), ZCG: only("MV Agusta", "motorky"), ME3: only("Royal Enfield", "motorky"), RFB: only("Kymco", "motorky"), LCE: only("CFMoto", "motorky"),
  "56K": only("Indian", "motorky", true), "3JB": only("Can-Am", "motorky", true), "2BP": only("Can-Am", "motorky", true), "4XA": only("Polaris", "motorky", true), VGA: only("Peugeot Motocycles", "motorky"),
};

const YC = "ABCDEFGHJKLMNPRSTVWXY"; // písmená rokov (bez I, O, Q, U, Z); A = 1980 alebo 2010

/** Možné modelové roky z 10. znaku (najnovší prvý). Vynechá sa budúci rok a rok pred 1990 (také staré vozidlá na portáli takmer nie sú).
 *  na = severoamerický VIN (prvý znak 1–5): 7. znak číslica = roky 1980–2009, písmeno = 2010–2039. */
export function vinYears(v: string, now = new Date().getFullYear(), since = 1990): number[] {
  const c = v.charAt(9), k = YC.indexOf(c);
  let base: number;
  if (k > -1) base = 1980 + k;
  else if (/[1-9]/.test(c)) base = 2000 + Number(c);
  else return [];
  const all = [base, base + 30].filter((y) => y >= Math.max(1990, since) && y <= now + 1);
  if (/^[1-5]/.test(v) && all.length === 2) return /[0-9]/.test(v.charAt(6)) ? [base] : [base + 30];
  return all.sort((a, b) => b - a);
}
/** Spätná kompatibilita: najnovší možný rok z 10. znaku. */
export function vinYear(c: string, now = new Date().getFullYear()): number | null {
  return vinYears("XXXXXXXXX" + c, now)[0] ?? null;
}

export type VinResult =
  | { ok: false; msg: string }
  | { ok: true; brand: string | null; vtype: VinVehicle | null; year: number | null; years: number[]; yearCoded: boolean; wmi: string };

export function decodeVin(raw: string): VinResult {
  const v = raw.trim().toUpperCase().replace(/[\s-]/g, "");
  if (!v) return { ok: false, msg: "Zadajte VIN." };
  if (v.length !== 17) return { ok: false, msg: `VIN má 17 znakov, zadali ste ${v.length}. Nájdete ho v technickom preukaze (pole E) alebo pod čelným sklom.` };
  if (/[IOQ]/.test(v)) return { ok: false, msg: "VIN nesmie obsahovať písmená I, O ani Q – pravdepodobne ide o číslice 1 alebo 0." };
  if (!/^[A-HJ-NPR-Z0-9]{17}$/.test(v)) return { ok: false, msg: "VIN môže obsahovať len písmená a číslice." };
  const wmi = v.slice(0, 3), w = WMI[wmi];
  const yearCoded = !!w?.[2] || (!w && /^[1-5]/.test(v));   // neznámy severoamerický výrobca – rok podľa normy
  const years = yearCoded ? vinYears(v, undefined, w?.[3]) : [];
  return { ok: true, brand: w?.[0] ?? null, vtype: w?.[1] ?? null, year: years.length === 1 ? years[0] : null, years, yearCoded, wmi };
}

/** Text o roku pre používateľa. */
export function vinYearText(r: Extract<VinResult, { ok: true }>): string {
  if (r.years.length === 1) return `ročník približne ${r.years[0]}`;
  if (r.years.length === 2) return `ročník ${r.years[0]} alebo ${r.years[1]} (z VIN sa nedá rozlíšiť)`;
  return r.brand ? "ročník tento výrobca do VIN nezapisuje – vyberte ho ručne" : "";
}
