"use client";
// Správa portálu: len pre používateľov v tabuľke admins. Každú akciu kontroluje a zapisuje databáza (05_bezpecnost_hladanie.sql).
import { sellerClient, skError } from "./seller";

type Row = Record<string, unknown>;
const c = () => sellerClient();
const must = <T,>(r: { data: T | null; error: { message: string } | null }): T => { if (r.error) throw new Error(skError(r.error)); return r.data as T; };

export async function isAdmin(): Promise<boolean> { return !!must(await c().rpc("is_admin")); }
/** Je v zozname správcov? (aj bez kódu z mobilu – vtedy web ponúkne dvojité overenie) */
export async function isAdminCandidate(): Promise<boolean> { return !!must(await c().rpc("admin_candidate")); }

// ---------- DVOJITÉ OVERENIE (kód z aplikácie v mobile, TOTP) ----------
export type MfaState = { level: string; factorId: string | null };
/** Aktuálna úroveň prihlásenia (aal1 = len heslo, aal2 = heslo + kód) a overená aplikácia, ak je nastavená. */
export async function mfaState(): Promise<MfaState> {
  const [lv, fs] = await Promise.all([c().auth.mfa.getAuthenticatorAssuranceLevel(), c().auth.mfa.listFactors()]);
  if (lv.error) throw new Error(skError(lv.error));
  if (fs.error) throw new Error(skError(fs.error));
  return { level: String(lv.data?.currentLevel || "aal1"), factorId: fs.data?.totp?.[0]?.id ?? null };
}
/** Prvé nastavenie: vytvorí tajný kľúč pre aplikáciu (Google Authenticator, Microsoft Authenticator…) a QR kód. */
export async function enrollTotp(): Promise<{ factorId: string; qr: string; secret: string }> {
  const fs = await c().auth.mfa.listFactors();
  for (const f of fs.data?.all || []) if (f.status !== "verified") await c().auth.mfa.unenroll({ factorId: f.id }); // staré nedokončené pokusy
  const r = await c().auth.mfa.enroll({ factorType: "totp", friendlyName: "Rozoberačka " + new Date().toLocaleDateString("sk-SK"), issuer: "Rozoberačka" });
  if (r.error || !r.data) throw new Error(skError(r.error || { message: "Nepodarilo sa začať nastavenie" }));
  return { factorId: r.data.id, qr: r.data.totp.qr_code, secret: r.data.totp.secret };
}
/** Overí 6-miestny kód z aplikácie; po úspechu je prihlásenie na úrovni aal2. */
export async function verifyTotp(factorId: string, code: string): Promise<void> {
  const ch = await c().auth.mfa.challenge({ factorId });
  if (ch.error || !ch.data) throw new Error(skError(ch.error || { message: "Overenie sa nepodarilo začať" }));
  const v = await c().auth.mfa.verify({ factorId, challengeId: ch.data.id, code: code.replace(/\D/g, "") });
  if (v.error) throw new Error(/invalid|verification/i.test(v.error.message) ? "Kód nesedí. Skontrolujte čas v mobile a zadajte nový kód." : skError(v.error));
}
export async function adminStats(): Promise<Record<string, number>> { return must(await c().rpc("admin_stats")) as Record<string, number>; }

export type Report = { id: number; listingId: number; listingName: string; listingStatus: string; reason: string; note: string; contact: string; status: string; createdAt: string };
export async function reports(status: string): Promise<Report[]> {
  let q = c().from("reports").select("id,listing_id,reason,note,contact,status,created_at,listings(name,status)").order("created_at", { ascending: false }).limit(200);
  if (status) q = q.eq("status", status);
  return (must(await q) as Row[]).map((r) => ({
    id: Number(r.id), listingId: Number(r.listing_id), listingName: String((r.listings as Row)?.name || "zmazaný"), listingStatus: String((r.listings as Row)?.status || ""),
    reason: String(r.reason), note: String(r.note || ""), contact: String(r.contact || ""), status: String(r.status), createdAt: String(r.created_at),
  }));
}
export async function resolveReport(id: number, status: "resolved" | "rejected" | "open") { must(await c().rpc("admin_resolve_report", { p_report: id, p_status: status })); }

export type AdminSeller = { id: string; name: string; type: string; city: string; verified: boolean; blocked: boolean; email: string; phone: string; ico: string; createdAt: string; active: number; total: number };
export async function sellers(): Promise<AdminSeller[]> {
  return (must(await c().rpc("admin_sellers")) as Row[]).map((r) => ({
    id: String(r.id), name: String(r.name), type: String(r.seller_type), city: String(r.city || ""), verified: !!r.verified, blocked: !!r.blocked,
    email: String(r.email || ""), phone: String(r.phone || ""), ico: String(r.ico || ""), createdAt: String(r.created_at), active: Number(r.active), total: Number(r.total),
  }));
}
export async function setSeller(id: string, verified: boolean | null, blocked: boolean | null) { must(await c().rpc("admin_set_seller", { p_seller: id, p_verified: verified, p_blocked: blocked })); }

export type AdminListing = { id: number; name: string; status: string; price: number; oem: string; seller: string; createdAt: string };
export async function listings(q: string, status: string): Promise<AdminListing[]> {
  let x = c().from("listings").select("id,name,status,price,oem,created_at,sellers(name)").order("created_at", { ascending: false }).limit(100);
  const t = q.trim();
  if (/^\d+$/.test(t)) x = x.eq("id", Number(t)); else if (t) x = x.ilike("name", `%${t.replace(/[%_,()]/g, " ")}%`);
  if (status) x = x.eq("status", status);
  return (must(await x) as Row[]).map((r) => ({ id: Number(r.id), name: String(r.name), status: String(r.status), price: Number(r.price), oem: String(r.oem || ""), seller: String((r.sellers as Row)?.name || ""), createdAt: String(r.created_at) }));
}
export async function setListing(id: number, block: boolean, note: string) {
  must(await c().rpc("admin_set_listing", { p_listing: id, p_block: block, p_note: note }));
  fetch("/api/obnovit", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ids: [id] }) }).catch(() => {}); // skrytý inzerát hneď zmizne
}

export type LogRow = { id: number; action: string; target: string; detail: string; createdAt: string };
export async function log(): Promise<LogRow[]> {
  return (must(await c().from("admin_log").select("*").order("created_at", { ascending: false }).limit(100)) as Row[]).map((r) => ({
    id: Number(r.id), action: String(r.action), target: String(r.target), detail: JSON.stringify(r.detail), createdAt: String(r.created_at),
  }));
}

export type AdminRequest = { id: number; part: string; contact: string; name: string; status: string; createdAt: string; expiresAt: string; brandId: number; modelId: number | null };
export async function requests(): Promise<AdminRequest[]> {
  return (must(await c().from("part_requests").select("id,part_name,contact,contact_name,status,created_at,expires_at,brand_id,model_id").order("created_at", { ascending: false }).limit(200)) as Row[]).map((r) => ({
    id: Number(r.id), part: String(r.part_name), contact: String(r.contact), name: String(r.contact_name), status: String(r.status), createdAt: String(r.created_at), expiresAt: String(r.expires_at),
    brandId: Number(r.brand_id), modelId: (r.model_id as number) ?? null,
  }));
}
export async function closeRequestAdmin(id: number) { must(await c().rpc("admin_close_request", { p_id: id })); }

export type AdminReview = { id: number; seller: string; sellerId: string; stars: number; body: string; author: string; hidden: boolean; createdAt: string };
export async function reviews(): Promise<AdminReview[]> {
  return (must(await c().rpc("admin_reviews")) as Row[] || []).map((r) => ({ id: Number(r.id), seller: String(r.seller), sellerId: String(r.seller_id), stars: Number(r.stars),
    body: String(r.body || ""), author: String(r.author), hidden: !!r.hidden, createdAt: String(r.created_at) }));
}
export async function hideReview(id: number, hide: boolean) { must(await c().rpc("admin_hide_review", { p_id: id, p_hide: hide })); }
