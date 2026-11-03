"use client";
// Všetko pre predajcu: prihlásenie, profil, vlastné inzeráty, fotky, import, správy.
// Používa Supabase Auth (e-mail + heslo) a Row Level Security z supabase/01_schema.sql a 04_funkcie.sql,
// takže predajca vidí a mení len svoje údaje. Do prehliadača ide len verejný anon kľúč.
import { createClient, type Session, type SupabaseClient } from "@supabase/supabase-js";
import { IS_DEMO, PHOTO_BUCKET } from "./data";
import type { Condition } from "./types";
import { TERMS_VERSION } from "./operator";

const URL_ = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
const KEY_ = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "";

let sb: SupabaseClient | null = null;
export function sellerClient(): SupabaseClient {
  if (!sb) sb = createClient(URL_, KEY_, { auth: { persistSession: true, autoRefreshToken: true, storageKey: "rozoberacka-auth" } });
  return sb;
}

export type Profile = { id: string; email: string; name: string; type: string; city: string; phone: string; ico: string; verified: boolean };
export type Status = "active" | "paused" | "sold" | "blocked";
export type MyListing = {
  id: number; name: string; brandId: number; modelId: number; engineId: number | null; year: number;
  categoryId: string; subcategoryId: number | null; oem: string; partMaker: string; price: number; city: string;
  condition: Condition; description: string; warranty: string; shipping: string; status: Status;
  views: number; calls: number; createdAt: string; phone: string;
  side: string; gearbox: string; km: number | null; tested: boolean; returns14: boolean; top: boolean; moderationNote: string;
  photos: { path: string; url: string }[]; fits: { brandId: number; modelId: number | null; engineId: number | null }[];
};
export type ListingInput = Omit<MyListing, "id" | "status" | "views" | "calls" | "createdAt" | "top" | "photos" | "moderationNote">;
export type Message = { id: number; listingId: number; listingName: string; name: string; contact: string; body: string; createdAt: string; read: boolean };

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
export async function signUp(email: string, password: string, name: string): Promise<boolean> {
  const { data, error } = await sellerClient().auth.signUp({
    email: email.trim(), password,
    options: { data: { name: name.trim(), terms_version: TERMS_VERSION, terms_accepted_at: new Date().toISOString() }, emailRedirectTo: window.location.origin + "/predajca" },
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
export async function signOut() { await sellerClient().auth.signOut(); }

// ---------- PROFIL ----------
export async function ensureProfile(s: Session): Promise<Profile> {
  const c = sellerClient(), uid = s.user.id;
  const cols = "id,name,seller_type,city,verified";
  let { data: sel } = await c.from("sellers").select(cols).eq("id", uid).maybeSingle();
  if (!sel) {
    const raw = String(s.user.user_metadata?.name || s.user.email?.split("@")[0] || "").trim().slice(0, 120);
    // upsert + ignoreDuplicates: dve otvorené karty naraz nespôsobia chybu „duplicate key“
    const md = s.user.user_metadata || {};
    const ins = await c.from("sellers").upsert({ id: uid, name: raw.length >= 2 ? raw : "Predajca",
      terms_version: String(md.terms_version || TERMS_VERSION), terms_accepted_at: String(md.terms_accepted_at || s.user.created_at || new Date().toISOString()) },
      { onConflict: "id", ignoreDuplicates: true });
    if (ins.error) throw new Error(skError(ins.error));
    const again = await c.from("sellers").select(cols).eq("id", uid).single();
    if (again.error) throw new Error(skError(again.error));
    sel = again.data;
  }
  const { data: pr } = await c.from("seller_private").select("phone,ico").eq("seller_id", uid).maybeSingle();
  return { id: uid, email: s.user.email || "", name: sel.name, type: sel.seller_type, city: sel.city || "", phone: pr?.phone || "", ico: pr?.ico || "", verified: !!sel.verified };
}
export async function saveProfile(p: Profile) {
  const c = sellerClient();
  const a = await c.from("sellers").update({ name: p.name.trim(), seller_type: p.type, city: p.city.trim() || null }).eq("id", p.id);
  if (a.error) throw new Error(skError(a.error));
  const b = await c.from("seller_private").upsert({ seller_id: p.id, phone: p.phone.trim() || null, ico: p.ico.trim() || null, updated_at: new Date().toISOString() });
  if (b.error) throw new Error(skError(b.error));
}

// ---------- INZERÁTY ----------
const COLS = "id,name,brand_id,model_id,engine_id,year,category_id,subcategory_id,oem,part_maker,price,city,condition,description,warranty,shipping,status,views,calls,created_at,moderation_note," +
  "side,donor_gearbox,donor_km,tested,returns_14d,top_until,listing_contacts(phone),listing_photos(path,position),listing_fits(brand_id,model_id,engine_id)";

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
    year: Number(r.year), categoryId: String(r.category_id), subcategoryId: (r.subcategory_id as number) ?? null, oem: String(r.oem || ""),
    partMaker: String(r.part_maker || ""), price: Number(r.price), city: String(r.city || ""), condition: r.condition as Condition,
    description: String(r.description || ""), warranty: String(r.warranty), shipping: String(r.shipping), status: r.status as Status,
    views: Number(r.views || 0), calls: Number(r.calls || 0), createdAt: String(r.created_at), phone,
    side: String(r.side || ""), gearbox: String(r.donor_gearbox || ""), km: (r.donor_km as number) ?? null, tested: !!r.tested, returns14: !!r.returns_14d,
    top: !!r.top_until && Date.parse(String(r.top_until)) > Date.now(), moderationNote: String(r.moderation_note || ""),
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
    name: x.name.trim(), brand_id: x.brandId, model_id: x.modelId, engine_id: x.engineId, year: x.year,
    category_id: x.categoryId, subcategory_id: x.subcategoryId, oem: x.oem.trim(), part_maker: x.partMaker.trim() || null,
    price: x.price, city: x.city.trim(), condition: x.condition, description: x.description.trim(), warranty: x.warranty, shipping: x.shipping,
    side: x.side || null, donor_gearbox: x.gearbox || null, donor_km: x.km, tested: x.tested, returns_14d: x.returns14,
  };
}

/** Zmenší fotku: veľká najviac 1600 px (detail) a náhľad 480 px (karty). JPEG = menej dát na mobile. */
export async function shrink(file: File): Promise<{ big: Blob; thumb: Blob }> {
  const url = URL.createObjectURL(file);
  try {
    const img = await new Promise<HTMLImageElement>((ok, bad) => { const i = new Image(); i.onload = () => ok(i); i.onerror = () => bad(new Error("Súbor nie je fotka alebo je poškodený.")); i.src = url; });
    const draw = (max: number, q: number) => {
      const k = Math.min(1, max / Math.max(img.naturalWidth, img.naturalHeight));
      const cv = document.createElement("canvas");
      cv.width = Math.round(img.naturalWidth * k); cv.height = Math.round(img.naturalHeight * k);
      cv.getContext("2d")!.drawImage(img, 0, 0, cv.width, cv.height);
      return new Promise<Blob>((ok, bad) => cv.toBlob((b) => (b ? ok(b) : bad(new Error("Fotku sa nepodarilo spracovať."))), "image/jpeg", q));
    };
    return { big: await draw(1600, 0.82), thumb: await draw(480, 0.78) };
  } finally { URL.revokeObjectURL(url); }
}
const thumbOf = (path: string) => path.replace(/\.jpg$/, "_t.jpg");

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
    const { big, thumb } = await shrink(p.file);
    const path = `${uid}/${lid}/${Date.now()}-${k}.jpg`;
    const up = await c.storage.from(PHOTO_BUCKET).upload(path, big, { contentType: "image/jpeg", upsert: false });
    if (up.error) throw new Error("Fotku sa nepodarilo nahrať: " + up.error.message);
    await c.storage.from(PHOTO_BUCKET).upload(thumbOf(path), thumb, { contentType: "image/jpeg", upsert: false }); // náhľad; ak zlyhá, karta použije veľkú
    paths.push(path);
  }
  const gone = oldPaths.filter((p) => !paths.includes(p));
  if (gone.length) await c.storage.from(PHOTO_BUCKET).remove(gone.flatMap((g) => [g, thumbOf(g)]));
  const dp = await c.from("listing_photos").delete().eq("listing_id", lid);
  if (dp.error) throw new Error(skError(dp.error));
  if (paths.length) {
    const ip = await c.from("listing_photos").insert(paths.map((path, position) => ({ listing_id: lid, path, position })));
    if (ip.error) throw new Error(skError(ip.error));
  }
  return lid;
}

export async function setStatus(ids: number[], status: Status) {
  const { error } = await sellerClient().from("listings").update({ status }).in("id", ids).neq("status", "blocked");
  if (error) throw new Error(skError(error));
}
/** TOP na 30 dní (zatiaľ zadarmo, najviac 3 naraz). V databáze funkcia toggle_top. */
export async function setTop(id: number, on: boolean) {
  const { error } = await sellerClient().rpc("toggle_top", { p_listing: id, p_on: on });
  if (error) throw new Error(skError(error));
}
export async function deleteListings(items: MyListing[]) {
  const c = sellerClient();
  const files = items.flatMap((i) => i.photos.flatMap((p) => [p.path, thumbOf(p.path)]));
  if (files.length) await c.storage.from(PHOTO_BUCKET).remove(files);
  const { error } = await c.from("listings").delete().in("id", items.map((i) => i.id));
  if (error) throw new Error(skError(error));
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
  const { data, error } = await sellerClient().from("messages").select("id,listing_id,sender_name,sender_contact,body,created_at,read_at,listings(name)").order("created_at", { ascending: false }).limit(300);
  if (error) throw new Error(skError(error));
  return ((data || []) as unknown as Row[]).map((m) => ({
    id: Number(m.id), listingId: Number(m.listing_id), listingName: String((m.listings as Row | null)?.name || "zmazaný inzerát"),
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
  for (const l of await myListings(uid)) for (const p of l.photos) { files.add(p.path); files.add(thumbOf(p.path)); }
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
  await c.auth.signOut().catch(() => {});
}
