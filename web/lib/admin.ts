"use client";
// Správa portálu: len pre používateľov v tabuľke admins. Každú akciu kontroluje a zapisuje databáza (05_bezpecnost_hladanie.sql).
import { sellerClient, skError } from "./seller";

type Row = Record<string, unknown>;
const c = () => sellerClient();
const must = <T,>(r: { data: T | null; error: { message: string } | null }): T => { if (r.error) throw new Error(skError(r.error)); return r.data as T; };

export async function isAdmin(): Promise<boolean> { return !!must(await c().rpc("is_admin")); }
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
export async function setListing(id: number, block: boolean, note: string) { must(await c().rpc("admin_set_listing", { p_listing: id, p_block: block, p_note: note })); }

export type LogRow = { id: number; action: string; target: string; detail: string; createdAt: string };
export async function log(): Promise<LogRow[]> {
  return (must(await c().from("admin_log").select("*").order("created_at", { ascending: false }).limit(100)) as Row[]).map((r) => ({
    id: Number(r.id), action: String(r.action), target: String(r.target), detail: JSON.stringify(r.detail), createdAt: String(r.created_at),
  }));
}
