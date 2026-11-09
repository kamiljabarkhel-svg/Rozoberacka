"use client";
// Všetko pre predajcu: prihlásenie, profil, vlastné inzeráty, fotky, import, správy.
// Používa Supabase Auth (e-mail + heslo) a Row Level Security z supabase/01_schema.sql a 04_funkcie.sql,
// takže predajca vidí a mení len svoje údaje. Do prehliadača ide len verejný anon kľúč.
import { createClient, type Session, type SupabaseClient } from "@supabase/supabase-js";
import { IS_DEMO, PHOTO_BUCKET } from "./data";
import { filesOf, mediumPath, thumbPath } from "./photos";
import { cleanSpecs, WHEEL_CAT, type Condition, type Specs, type VehicleType } from "./types";
import { TERMS_VERSION } from "./operator";

const URL_ = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
const KEY_ = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "";

let sb: SupabaseClient | null = null;
export function sellerClient(): SupabaseClient {
  if (!sb) sb = createClient(URL_, KEY_, { auth: { persistSession: true, autoRefreshToken: true, storageKey: "rozoberacka-auth" } });
  return sb;
}

export type Profile = { id: string; email: string; name: string; type: string; city: string; phone: string; ico: string; address: string; verified: boolean; ratingAvg?: number | null; ratingCount?: number };
export type Status = "active" | "paused" | "sold" | "blocked";
export type MyListing = {
  id: number; name: string; brandId: number; modelId: number; engineId: number | null; year: number; // 0 = bez auta (univerzálny diel)
  vtype: VehicleType | null;
  categoryId: string; subcategoryId: number | null; oem: string; partMaker: string; price: number; city: string;
  condition: Condition; description: string; warranty: string; shipping: string; status: Status;
  views: number; calls: number; createdAt: string; updatedAt: string; phone: string;
  side: string; gearbox: string; km: number | null; tested: boolean; returns14: boolean; top: boolean; moderationNote: string; donorId: number | null;
  specs: Specs;
  photos: { path: string; url: string }[]; fits: { brandId: number; modelId: number | null; engineId: number | null }[];
};
export type ListingInput = Omit<MyListing, "id" | "status" | "views" | "calls" | "createdAt" | "updatedAt" | "top" | "photos" | "moderationNote">;
export type Message = { id: number; listingId: number; carId?: number | null; listingName: string; name: string; contact: string; body: string; createdAt: string; read: boolean };

const SKMSG: [RegExp, string][] = [
  [/Invalid login credentials/i, "Nesprávny e-mail alebo heslo."],
  [/Email not confirmed/i, "E-mail ešte nie je potvrdený. Kliknite na odkaz v e-maile od nás."],
  [/User already registered/i, "Tento e-mail je už zaregistrovaný. Prihláste sa."],
  [/Password should be at least/i, "Heslo musí mať aspoň 8 znakov."],
  [/rate limit/i, "Príliš veľa pokusov. Skúste to o chvíľu."],
  [/Email address not authorized|not authorized/i, "E-maily z portálu sa ešte nedajú posielať (chýba nastavenie odosielania e-mailov). Skúste to neskôr."],
  [/weak|Password should contain/i, "Heslo je príliš slabé. Použite aspoň 8 znakov."],
  [/listings_oem_required/i, "Zadajte OEM číslo dielu (aspoň 4 písmená alebo číslice)."],
  [/listings_desc_required/i, "Popis musí mať aspoň 20 znakov."],
  [/sellers_ico_check/i, "IČO musí mať 8 číslic."],
  [/sellers_address_check/i, "Sídlo (adresa) musí mať aspoň 5 znakov."],
  [/contacts_phone_digits/i, "Telefón musí mať aspoň 9 číslic."],
  [/permission denied/i, "Na túto zmenu nemáte oprávnenie."],
  [/listings_warranty_check/i, "Vyberte platnú záruku."],
];
export function skError(e: unknown): string {
  const m = String((e as Error)?.message || e);
  for (const [r, t] of SKMSG) if (r.test(m)) return t;
  return m;
}

// ---------- PRIHLÁSENIE ----------
export async function getSession(): Promise<Session | null> {
  if (IS_DEMO) return null;
  const { data } = await sellerClient().auth.getSession();
  return data.session;
}
export function onAuthChange(cb: (s: Session | null) => void): () => void {
  if (IS_DEMO) return () => {};
  const { data } = sellerClient().auth.onAuthStateChange((_e, s) => cb(s));
  return () => data.subscription.unsubscribe();
}
export async function signIn(email: string, password: string) {
  const { error } = await sellerClient().auth.signInWithPassword({ email: email.trim(), password });
  if (error) throw new Error(skError(error));
}
/** Vráti true, ak je treba potvrdiť e-mail. */
export type SignUpInfo = { name: string; type: "Firma" | "Súkromná osoba"; ico: string; address: string };
export async function signUp(email: string, password: string, info: SignUpInfo): Promise<boolean> {
  const firm = info.type === "Firma";
  const { data, error } = await sellerClient().auth.signUp({
    email: email.trim(), password,
    options: { data: { name: info.name.trim(), seller_type: info.type, ico: firm ? info.ico.replace(/\s/g, "") : null, address: firm ? info.address.trim() : null,
      terms_version: TERMS_VERSION, terms_accepted_at: new Date().toISOString() }, emailRedirectTo: window.location.origin + "/predajca" },
  });
  if (error) throw new Error(skError(error));
  return !data.session;
}
export async function resetPassword(email: string) {
  const { error } = await sellerClient().auth.resetPasswordForEmail(email.trim(), { redirectTo: window.location.origin + "/predajca?heslo=1" });
  if (error) throw new Error(skError(error));
}
export async function changePassword(pw: string) {
  const { error } = await sellerClient().auth.updateUser({ password: pw });
  if (error) throw new Error(skError(error));
}
/** Obnoví verejné stránky dielov po zmene (beží na pozadí, chyba nevadí – stránky sa obnovia aj samé o pár minút). */
function refreshPublic(ids: number[]) {
  if (IS_DEMO || typeof window === "undefined" || !ids.length) return;
  fetch("/api/obnovit", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ids: ids.slice(0, 500) }) }).catch(() => {});
}

export async function signOut() { await sellerClient().auth.signOut(); }

// ---------- PROFIL ----------
export async function ensureProfile(s: Session): Promise<Profile> {
  const c = sellerClient(), uid = s.user.id;
  const cols = "id,name,seller_type,city,verified,rating_avg,rating_count,ico,address";
  let { data: sel } = await c.from("sellers").select(cols).eq("id", uid).maybeSingle();
  if (!sel) {
    const raw = String(s.user.user_metadata?.name || "").trim().slice(0, 120); // nikdy nie časť e-mailu – názov je verejný
    // upsert + ignoreDuplicates: dve otvorené karty naraz nespôsobia chybu „duplicate key“
    const md = s.user.user_metadata || {};
    const type = md.seller_type === "Súkromná osoba" ? "Súkromná osoba" : "Firma"; // vyhlásenie z registrácie
    const ico = type === "Firma" && /^[0-9]{8}$/.test(String(md.ico || "")) ? String(md.ico) : null;
    const address = type === "Firma" && String(md.address || "").trim().length >= 5 ? String(md.address).trim().slice(0, 200) : null;
    const ins = await c.from("sellers").upsert({ id: uid, name: raw.length >= 2 ? raw : "Predajca", seller_type: type, ico, address,
      terms_version: String(md.terms_version || TERMS_VERSION), terms_accepted_at: String(md.terms_accepted_at || s.user.created_at || new Date().toISOString()) },
      { onConflict: "id", ignoreDuplicates: true });
    if (ins.error) throw new Error(skError(ins.error));
    const again = await c.from("sellers").select(cols).eq("id", uid).single();
    if (again.error) throw new Error(skError(again.error));
    sel = again.data;
  }
  const { data: pr } = await c.from("seller_private").select("phone").eq("seller_id", uid).maybeSingle();
  return { id: uid, email: s.user.email || "", name: sel.name, type: sel.seller_type, city: sel.city || "", phone: pr?.phone || "", ico: sel.ico || "", address: sel.address || "", verified: !!sel.verified,
    ratingAvg: sel.rating_avg != null ? Number(sel.rating_avg) : null, ratingCount: Number(sel.rating_count || 0) };
}
export async function saveProfile(p: Profile) {
  const c = sellerClient();
  const firm = p.type === "Firma";
  const a = await c.from("sellers").update({ name: p.name.trim(), seller_type: p.type, city: p.city.trim() || null,
    ico: firm ? p.ico.replace(/\s/g, "") || null : null, address: firm ? p.address.trim() || null : null }).eq("id", p.id);
  if (a.error) throw new Error(skError(a.error));
  const b = await c.from("seller_private").upsert({ seller_id: p.id, phone: p.phone.trim() || null, updated_at: new Date().toISOString() });
  if (b.error) throw new Error(skError(b.error));
}

// ---------- INZERÁTY ----------
const COLS = "id,name,brand_id,model_id,engine_id,year,category_id,subcategory_id,oem,part_maker,price,city,condition,description,warranty,shipping,status,views,calls,created_at,updated_at,moderation_note,donor_id," +
  "side,donor_gearbox,donor_km,tested,returns_14d,top_until,specs,vtype,listing_contacts(phone),listing_photos(path,position),listing_fits(brand_id,model_id,engine_id)";

type Row = Record<string, unknown>;
export function photoUrl(path: string) {
  return `${URL_}/storage/v1/object/public/${PHOTO_BUCKET}/${path.split("/").map(encodeURIComponent).join("/")}`;
}
function toMine(r: Row): MyListing {
  const ph = ((r.listing_photos || []) as Row[]).slice().sort((a, b) => Number(a.position) - Number(b.position));
  const ct = r.listing_contacts as Row | Row[] | null;
  const phone = Array.isArray(ct) ? String(ct[0]?.phone || "") : String(ct?.phone || "");
  return {
    id: Number(r.id), name: String(r.name), brandId: Number(r.brand_id), modelId: Number(r.model_id), engineId: (r.engine_id as number) ?? null,
    year: Number(r.year || 0), vtype: (r.vtype as VehicleType) ?? null, categoryId: String(r.category_id), subcategoryId: (r.subcategory_id as number) ?? null, oem: String(r.oem || ""),
    partMaker: String(r.part_maker || ""), price: Number(r.price), city: String(r.city || ""), condition: r.condition as Condition,
    description: String(r.description || ""), warranty: String(r.warranty), shipping: String(r.shipping), status: r.status as Status,
    views: Number(r.views || 0), calls: Number(r.calls || 0), createdAt: String(r.created_at), updatedAt: String(r.updated_at || r.created_at), phone,
    side: String(r.side || ""), gearbox: String(r.donor_gearbox || ""), km: (r.donor_km as number) ?? null, tested: !!r.tested, returns14: !!r.returns_14d,
    top: !!r.top_until && Date.parse(String(r.top_until)) > Date.now(), moderationNote: String(r.moderation_note || ""), donorId: (r.donor_id as number) ?? null,
    specs: (r.specs && typeof r.specs === "object" ? r.specs : {}) as Specs,
    photos: ph.map((p) => ({ path: String(p.path), url: photoUrl(String(p.path)) })),
    fits: ((r.listing_fits || []) as Row[]).map((f) => ({ brandId: Number(f.brand_id), modelId: (f.model_id as number) ?? null, engineId: (f.engine_id as number) ?? null })),
  };
}
export async function myListings(uid: string): Promise<MyListing[]> {
  const { data, error } = await sellerClient().from("listings").select(COLS).eq("seller_id", uid).order("created_at", { ascending: false });
  if (error) throw new Error(skError(error));
  return ((data || []) as unknown as Row[]).map(toMine);
}

function dbRow(x: ListingInput) {
  return {
    name: x.name.trim(), brand_id: x.brandId || null, model_id: x.modelId || null, engine_id: x.modelId ? x.engineId : null, year: x.year || null, vtype: x.vtype,
    category_id: x.categoryId, subcategory_id: x.subcategoryId, oem: x.oem.trim() || null, part_maker: x.partMaker.trim() || null,
    price: x.price, city: x.city.trim(), condition: x.condition, description: x.description.trim(), warranty: x.warranty, shipping: x.shipping,
    side: x.side || null, donor_gearbox: x.gearbox || null, donor_km: x.km, tested: x.tested, returns_14d: x.returns14, donor_id: x.donorId ?? null,
    specs: x.categoryId === WHEEL_CAT ? cleanSpecs(x.specs) : {},
  };
}

/** Zmenší fotku: veľká 1600 px JPEG (detail na počítači, zdieľanie), stredná 960 px (detail na mobile) a náhľad 480 px (karty).
 *  Menšie verzie sú WebP, ak ho prehliadač vie vytvoriť (menej dát), inak JPEG. */
export async function shrink(file: File): Promise<{ big: Blob; medium: Blob; thumb: Blob; small: "webp" | "jpg" }> {
  const url = URL.createObjectURL(file);
  try {
    const img = await new Promise<HTMLImageElement>((ok, bad) => { const i = new Image(); i.onload = () => ok(i); i.onerror = () => bad(new Error("Súbor nie je fotka alebo je poškodený.")); i.src = url; });
    const draw = (max: number, q: number, type: string) => {
      const k = Math.min(1, max / Math.max(img.naturalWidth, img.naturalHeight));
      const cv = document.createElement("canvas");
      cv.width = Math.round(img.naturalWidth * k); cv.height = Math.round(img.naturalHeight * k);
      cv.getContext("2d")!.drawImage(img, 0, 0, cv.width, cv.height);
      return new Promise<Blob>((ok, bad) => cv.toBlob((b) => (b ? ok(b) : bad(new Error("Fotku sa nepodarilo spracovať."))), type, q));
    };
    const probe = await draw(480, 0.78, "image/webp");
    const webp = probe.type === "image/webp"; // starší Safari vráti PNG → použijeme JPEG
    const st = webp ? "image/webp" : "image/jpeg";
    return { big: await draw(1600, 0.82, "image/jpeg"), medium: await draw(960, 0.8, st), thumb: webp ? probe : await draw(480, 0.78, st), small: webp ? "webp" : "jpg" };
  } finally { URL.revokeObjectURL(url); }
}

export type PhotoItem = { path?: string; url: string; file?: File };

/** Uloží nový alebo upravený inzerát vrátane telefónu, „pasuje aj na“ a fotiek. */
export async function saveListing(uid: string, id: number | null, x: ListingInput, photos: PhotoItem[], oldPaths: string[]): Promise<number> {
  const c = sellerClient();
  let lid = id;
  if (lid == null) {
    const r = await c.from("listings").insert({ seller_id: uid, ...dbRow(x) }).select("id").single();
    if (r.error) throw new Error(skError(r.error));
    lid = Number(r.data.id);
  } else {
    const r = await c.from("listings").update(dbRow(x)).eq("id", lid);
    if (r.error) throw new Error(skError(r.error));
  }
  const ct = await c.from("listing_contacts").upsert({ listing_id: lid, phone: x.phone.trim() });
  if (ct.error) throw new Error(skError(ct.error));
  const del = await c.from("listing_fits").delete().eq("listing_id", lid);
  if (del.error) throw new Error(skError(del.error));
  if (x.fits.length) {
    const fi = await c.from("listing_fits").insert(x.fits.map((f) => ({ listing_id: lid, brand_id: f.brandId, model_id: f.modelId, engine_id: f.engineId })));
    if (fi.error) throw new Error(skError(fi.error));
  }
  // fotky: nahrať nové, zmazať odstránené, zapísať poradie
  const paths: string[] = [];
  for (let k = 0; k < photos.length; k++) {
    const p = photos[k];
    if (p.path) { paths.push(p.path); continue; }
    if (!p.file) continue;
    const { big, medium, thumb, small } = await shrink(p.file);
    const path = `${uid}/${lid}/${Date.now()}-${k}${small === "webp" ? ".w" : ""}.jpg`;
    const up = await c.storage.from(PHOTO_BUCKET).upload(path, big, { contentType: "image/jpeg", upsert: false });
    if (up.error) throw new Error("Fotku sa nepodarilo nahrať: " + up.error.message);
    // menšie verzie; ak zlyhajú, web použije veľkú
    const st = small === "webp" ? "image/webp" : "image/jpeg";
    await c.storage.from(PHOTO_BUCKET).upload(thumbPath(path), thumb, { contentType: st, upsert: false });
    await c.storage.from(PHOTO_BUCKET).upload(mediumPath(path), medium, { contentType: st, upsert: false });
    paths.push(path);
  }
  const gone = oldPaths.filter((p) => !paths.includes(p));
  if (gone.length) await c.storage.from(PHOTO_BUCKET).remove(gone.flatMap(filesOf));
  const dp = await c.from("listing_photos").delete().eq("listing_id", lid);
  if (dp.error) throw new Error(skError(dp.error));
  if (paths.length) {
    const ip = await c.from("listing_photos").insert(paths.map((path, position) => ({ listing_id: lid, path, position })));
    if (ip.error) throw new Error(skError(ip.error));
  }
  refreshPublic([lid]);
  return lid;
}

export async function setStatus(ids: number[], status: Status) {
  const { error } = await sellerClient().from("listings").update({ status }).in("id", ids).neq("status", "blocked");
  if (error) throw new Error(skError(error));
  refreshPublic(ids);
}
/** TOP na 30 dní (zatiaľ zadarmo, najviac 3 naraz). V databáze funkcia toggle_top. */
/** „Stále aktuálne“: predajca potvrdí, že diel má – obnoví sa dátum aktualizácie (zobrazí sa kupujúcim). */
export async function confirmFresh(ids: number[]) {
  const { error } = await sellerClient().from("listings").update({ status: "active" }).in("id", ids).eq("status", "active");
  if (error) throw new Error(skError(error));
}

export async function setTop(id: number, on: boolean) {
  const { error } = await sellerClient().rpc("toggle_top", { p_listing: id, p_on: on });
  if (error) throw new Error(skError(error));
  refreshPublic([id]);
}
export async function deleteListings(items: MyListing[]) {
  const c = sellerClient();
  const files = items.flatMap((i) => i.photos.flatMap((p) => filesOf(p.path)));
  if (files.length) await c.storage.from(PHOTO_BUCKET).remove(files);
  const { error } = await c.from("listings").delete().in("id", items.map((i) => i.id));
  if (error) throw new Error(skError(error));
  refreshPublic(items.map((i) => i.id));
}
/** Kópia inzerátu bez fotiek (fotky sa pridajú pri úprave). */
export async function duplicate(uid: string, l: MyListing): Promise<number> {
  const x: ListingInput = { ...l };
  const id = await saveListing(uid, null, x, [], []);
  await setStatus([id], "paused"); // kópia bez fotiek sa kupujúcim neukáže, kým ju predajca nedoplní
  return id;
}

// ---------- IMPORT ----------
export async function importMany(uid: string, rows: ListingInput[]): Promise<{ ok: number; errors: string[] }> {
  const errors: string[] = []; let ok = 0;
  for (let k = 0; k < rows.length; k++) {
    try { await saveListing(uid, null, rows[k], [], []); ok++; }
    catch (e) { errors.push(`Riadok ${k + 2}: ${skError(e)}`); }
  }
  return { ok, errors };
}

// ---------- SPRÁVY ----------
export async function myMessages(): Promise<Message[]> {
  const sel = "id,listing_id,car_id,sender_name,sender_contact,body,created_at,read_at,listings(name)";
  let r: { data: unknown; error: { message: string } | null } = await sellerClient().from("messages").select(sel).order("created_at", { ascending: false }).limit(300);
  if (r.error && /car_id/.test(r.error.message)) r = await sellerClient().from("messages").select(sel.replace("car_id,", "")).order("created_at", { ascending: false }).limit(300); // pred migráciou 19
  const { data, error } = r;
  if (error) throw new Error(skError(error));
  return ((data || []) as unknown as Row[]).map((m) => ({
    id: Number(m.id), listingId: Number(m.listing_id || 0), carId: (m.car_id as number) ?? null,
    listingName: m.car_id ? "Celé vozidlo (inzerát č. " + m.car_id + ")" : String((m.listings as Row | null)?.name || "zmazaný inzerát"),
    name: String(m.sender_name), contact: String(m.sender_contact), body: String(m.body), createdAt: String(m.created_at), read: !!m.read_at,
  }));
}
export async function markRead(ids: number[]) {
  if (!ids.length) return;
  const { error } = await sellerClient().from("messages").update({ read_at: new Date().toISOString() }).in("id", ids);
  if (error) throw new Error(skError(error));
}

// ---------- MOJE ÚDAJE (GDPR) ----------
/** Všetky údaje predajcu ako súbor JSON (právo na prístup a prenosnosť). */
export async function exportMyData(): Promise<void> {
  const { data, error } = await sellerClient().rpc("export_my_data");
  if (error) throw new Error(skError(error));
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob); a.download = `rozoberacka-moje-udaje-${new Date().toISOString().slice(0, 10)}.json`;
  document.body.appendChild(a); a.click(); a.remove();
  window.setTimeout(() => URL.revokeObjectURL(a.href), 2000);
}

/** Zruší účet: najprv zmaže súbory fotiek v úložisku, potom účet a všetky údaje v databáze. */
export async function deleteAccount(uid: string): Promise<void> {
  const c = sellerClient();
  const files = new Set<string>();
  const mine = await myListings(uid);
  for (const l of mine) for (const p of l.photos) for (const f of filesOf(p.path)) files.add(f);
  try { // aj súbory, ktoré už nie sú priradené k inzerátu
    const top = await c.storage.from(PHOTO_BUCKET).list(uid, { limit: 1000 });
    for (const d of top.data || []) {
      const sub = await c.storage.from(PHOTO_BUCKET).list(`${uid}/${d.name}`, { limit: 1000 });
      for (const f of sub.data || []) files.add(`${uid}/${d.name}/${f.name}`);
    }
  } catch { /* zoznam nie je nevyhnutný */ }
  const all = [...files];
  for (let i = 0; i < all.length; i += 100) await c.storage.from(PHOTO_BUCKET).remove(all.slice(i, i + 100));
  const { error } = await c.rpc("delete_my_account");
  if (error) throw new Error(skError(error));
  refreshPublic(mine.map((l) => l.id)); // zmazané diely zmiznú z verejných stránok hneď
  await c.auth.signOut().catch(() => {});
}

// ---------- DARCOVSKÉ AUTÁ ----------
export type Donor = { id: number; brandId: number; modelId: number; engineId: number | null; year: number; km: number | null; gearbox: string;
  color: string; vin: string; dismantledAt: string; note: string; createdAt: string };
const toDonor = (r: Row): Donor => ({
  id: Number(r.id), brandId: Number(r.brand_id), modelId: Number(r.model_id), engineId: (r.engine_id as number) ?? null, year: Number(r.year),
  km: (r.km as number) ?? null, gearbox: String(r.gearbox || ""), color: String(r.color || ""), vin: String(r.vin || ""),
  dismantledAt: String(r.dismantled_at || ""), note: String(r.note || ""), createdAt: String(r.created_at),
});
export async function myDonors(): Promise<Donor[]> {
  const { data, error } = await sellerClient().from("donor_cars").select("*").order("created_at", { ascending: false });
  if (error) throw new Error(skError(error));
  return ((data || []) as Row[]).map(toDonor);
}
export async function saveDonor(uid: string, d: Omit<Donor, "id" | "createdAt">, id: number | null): Promise<number> {
  const row = { brand_id: d.brandId, model_id: d.modelId, engine_id: d.engineId, year: d.year, km: d.km, gearbox: d.gearbox || null,
    color: d.color.trim() || null, vin: d.vin.trim().toUpperCase() || null, dismantled_at: d.dismantledAt || null, note: d.note.trim() || null };
  const c = sellerClient();
  const r = id == null ? await c.from("donor_cars").insert({ seller_id: uid, ...row }).select("id").single() : await c.from("donor_cars").update(row).eq("id", id).select("id").single();
  if (r.error) throw new Error(skError(r.error));
  return Number(r.data.id);
}
export async function deleteDonor(id: number) {
  const { error } = await sellerClient().from("donor_cars").delete().eq("id", id);
  if (error) throw new Error(skError(error));
}
/** Viac dielov z jedného auta naraz. Vzniknú pozastavené (bez fotiek) – predajca doplní fotky a aktivuje. */
export async function createFromDonor(uid: string, rows: ListingInput[]): Promise<{ ok: number; errors: string[] }> {
  const errors: string[] = []; let ok = 0;
  for (const x of rows) {
    try { const id = await saveListing(uid, null, x, [], []); await setStatus([id], "paused"); ok++; }
    catch (e) { errors.push(`${x.name}: ${skError(e)}`); }
  }
  return { ok, errors };
}

// ---------- EXPORT A HROMADNÉ CENY ----------
/** Nové ceny pre viac inzerátov naraz. */
export async function setPrices(rows: { id: number; price: number }[]) {
  const c = sellerClient();
  for (const r of rows) {
    const { error } = await c.from("listings").update({ price: r.price }).eq("id", r.id);
    if (error) throw new Error(skError(error));
  }
  refreshPublic(rows.map((r) => r.id));
}

// ---------- DOPYTY NA DIELY ----------
export type PartRequest = { id: number; brandId: number; modelId: number | null; engineId: number | null; year: number | null; vin: string; categoryId: string | null;
  partName: string; note: string; contactName: string; contact: string; city: string; createdAt: string; expiresAt: string };
export type MyOffer = { id: number; requestId: number; price: number; phone: string; listingId: number | null; note: string; createdAt: string };
export async function openRequests(): Promise<PartRequest[]> {
  const { data, error } = await sellerClient().from("part_requests").select("id,brand_id,model_id,engine_id,year,vin,category_id,part_name,note,contact_name,contact,city,created_at,expires_at")
    .eq("status", "open").gt("expires_at", new Date().toISOString()).order("created_at", { ascending: false }).limit(300);
  if (error) throw new Error(skError(error));
  return ((data || []) as Row[]).map((r) => ({ id: Number(r.id), brandId: Number(r.brand_id), modelId: (r.model_id as number) ?? null, engineId: (r.engine_id as number) ?? null,
    year: (r.year as number) ?? null, vin: String(r.vin || ""), categoryId: (r.category_id as string) ?? null, partName: String(r.part_name), note: String(r.note || ""),
    contactName: String(r.contact_name), contact: String(r.contact), city: String(r.city || ""), createdAt: String(r.created_at), expiresAt: String(r.expires_at) }));
}
export async function myOffers(): Promise<MyOffer[]> {
  const { data, error } = await sellerClient().from("part_offers").select("id,request_id,price,phone,listing_id,note,created_at");
  if (error) throw new Error(skError(error));
  return ((data || []) as Row[]).map((r) => ({ id: Number(r.id), requestId: Number(r.request_id), price: Number(r.price), phone: String(r.phone), listingId: (r.listing_id as number) ?? null, note: String(r.note || ""), createdAt: String(r.created_at) }));
}
export async function sendOffer(uid: string, requestId: number, o: { price: number; phone: string; listingId: number | null; note: string }) {
  const { error } = await sellerClient().from("part_offers").insert({ request_id: requestId, seller_id: uid, price: o.price, phone: o.phone.trim(), listing_id: o.listingId, note: o.note.trim() || null });
  if (error) throw new Error(/duplicate|unique/i.test(error.message) ? "Na tento dopyt ste už ponuku poslali." : skError(error));
}

// ---------- HAVAROVANÉ A NEPOJAZDNÉ VOZIDLÁ (celé vozidlá na predaj, 19) ----------
export type MyCar = {
  id: number; vehicleType: VehicleType; brandId: number; modelId: number | null; engineId: number | null; year: number; km: number | null;
  fuel: string; gearbox: string; color: string; condition: string; damage: string[]; starts: boolean | null; docs: string; stkUntil: string;
  price: number; city: string; description: string; donorId: number | null; status: Status; moderationNote: string;
  body: string; powerKw: number | null; keys: boolean | null; origin: string;
  views: number; calls: number; createdAt: string; updatedAt: string; phone: string; vin: string; photos: { path: string; url: string }[];
};
export type CarInput = Omit<MyCar, "id" | "status" | "moderationNote" | "views" | "calls" | "createdAt" | "updatedAt" | "photos">;
const CAR_COLS = "id,vehicle_type,brand_id,model_id,engine_id,year,km,fuel,gearbox,color,condition,damage,starts,docs,stk_until,price,city,description,donor_id,body,power_kw,keys,origin," +
  "status,moderation_note,views,calls,created_at,updated_at,car_contacts(phone,vin),car_photos(path,position)";
function toMyCar(r: Row): MyCar {
  const ct = r.car_contacts as Row | Row[] | null; const c0 = (Array.isArray(ct) ? ct[0] : ct) || {};
  const ph = ((r.car_photos || []) as Row[]).slice().sort((a, b) => Number(a.position) - Number(b.position));
  return {
    id: Number(r.id), vehicleType: (r.vehicle_type as VehicleType) || "osobne", brandId: Number(r.brand_id), modelId: (r.model_id as number) ?? null,
    engineId: (r.engine_id as number) ?? null, year: Number(r.year), km: (r.km as number) ?? null, fuel: String(r.fuel || ""), gearbox: String(r.gearbox || ""),
    color: String(r.color || ""), condition: String(r.condition), damage: (r.damage as string[]) || [], starts: (r.starts as boolean) ?? null, docs: String(r.docs),
    stkUntil: String(r.stk_until || ""), price: Number(r.price), city: String(r.city || ""), description: String(r.description || ""), donorId: (r.donor_id as number) ?? null,
    body: String(r.body || ""), powerKw: (r.power_kw as number) ?? null, keys: (r.keys as boolean) ?? null, origin: String(r.origin || ""),
    status: r.status as Status, moderationNote: String(r.moderation_note || ""), views: Number(r.views || 0), calls: Number(r.calls || 0),
    createdAt: String(r.created_at), updatedAt: String(r.updated_at || r.created_at), phone: String((c0 as Row).phone || ""), vin: String((c0 as Row).vin || ""),
    photos: ph.map((p) => ({ path: String(p.path), url: photoUrl(String(p.path)) })),
  };
}
export async function myCars(uid: string): Promise<MyCar[]> {
  const { data, error } = await sellerClient().from("car_listings").select(CAR_COLS).eq("seller_id", uid).order("created_at", { ascending: false });
  if (error) throw new Error(skError(error));
  return ((data || []) as unknown as Row[]).map(toMyCar);
}
function refreshCars() {
  if (IS_DEMO || typeof window === "undefined") return;
  fetch("/api/obnovit", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ids: [1] }) }).catch(() => {});
}
export async function saveCar(uid: string, id: number | null, x: CarInput, photos: PhotoItem[], oldPaths: string[]): Promise<number> {
  const c = sellerClient();
  const row = {
    vehicle_type: x.vehicleType, brand_id: x.brandId, model_id: x.modelId, engine_id: x.engineId, year: x.year, km: x.km, fuel: x.fuel || null,
    gearbox: x.gearbox || null, color: x.color.trim() || null, condition: x.condition, damage: x.damage, starts: x.starts, docs: x.docs,
    stk_until: x.stkUntil || null, price: x.price, city: x.city.trim(), description: x.description.trim(), donor_id: x.donorId,
    body: x.body || null, power_kw: x.powerKw, keys: x.keys, origin: x.origin || null,
  };
  let cid = id;
  if (cid == null) {
    const r = await c.from("car_listings").insert({ seller_id: uid, ...row }).select("id").single();
    if (r.error) throw new Error(skError(r.error));
    cid = Number(r.data.id);
  } else {
    const r = await c.from("car_listings").update(row).eq("id", cid);
    if (r.error) throw new Error(skError(r.error));
  }
  const ct = await c.from("car_contacts").upsert({ car_id: cid, phone: x.phone.trim(), vin: x.vin.replace(/\s/g, "").toUpperCase() || null });
  if (ct.error) throw new Error(skError(ct.error));
  const paths: string[] = [];
  for (let k = 0; k < photos.length; k++) {
    const p = photos[k];
    if (p.path) { paths.push(p.path); continue; }
    if (!p.file) continue;
    const { big, medium, thumb, small } = await shrink(p.file);
    const path = `${uid}/a${cid}/${Date.now()}-${k}${small === "webp" ? ".w" : ""}.jpg`;
    const up = await c.storage.from(PHOTO_BUCKET).upload(path, big, { contentType: "image/jpeg", upsert: false });
    if (up.error) throw new Error("Fotku sa nepodarilo nahrať: " + up.error.message);
    const st = small === "webp" ? "image/webp" : "image/jpeg";
    await c.storage.from(PHOTO_BUCKET).upload(thumbPath(path), thumb, { contentType: st, upsert: false });
    await c.storage.from(PHOTO_BUCKET).upload(mediumPath(path), medium, { contentType: st, upsert: false });
    paths.push(path);
  }
  const gone = oldPaths.filter((p) => !paths.includes(p));
  if (gone.length) await c.storage.from(PHOTO_BUCKET).remove(gone.flatMap(filesOf));
  const dp = await c.from("car_photos").delete().eq("car_id", cid);
  if (dp.error) throw new Error(skError(dp.error));
  if (paths.length) {
    const ip = await c.from("car_photos").insert(paths.map((path, position) => ({ car_id: cid, path, position })));
    if (ip.error) throw new Error(skError(ip.error));
  }
  refreshCars();
  return cid;
}
export async function setCarStatus(id: number, status: Status) {
  const { error } = await sellerClient().from("car_listings").update({ status }).eq("id", id).neq("status", "blocked");
  if (error) throw new Error(skError(error));
  refreshCars();
}
export async function deleteCar(car: MyCar) {
  const c = sellerClient();
  const files = car.photos.flatMap((p) => filesOf(p.path));
  if (files.length) await c.storage.from(PHOTO_BUCKET).remove(files);
  const { error } = await c.from("car_listings").delete().eq("id", car.id);
  if (error) throw new Error(skError(error));
  refreshCars();
}
