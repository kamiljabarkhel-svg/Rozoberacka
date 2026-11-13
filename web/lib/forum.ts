// Fórum – čítanie (verejné, aj na serveri) a písanie (prihlásený používateľ). Databáza: supabase/31_forum.sql.
// Čítať môže každý bez účtu; písať len s profilom fóra (prezývka) a potvrdeným e-mailom.
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { slugify } from "./seo";

const URL_ = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
const KEY_ = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "";
export const FORUM_DEMO = process.env.NEXT_PUBLIC_STATIC_PREVIEW === "1" || !URL_ || !KEY_;

export type ForumSection = { id: string; parent: string | null; name: string; description: string | null; threads: number; posts: number; last: { id: number; title: string; at: string } | null };
export type ForumThreadRow = { id: number; section: string; title: string; pinned: boolean; locked: boolean; posts: number; created_at: string; last_post_at: string; nick: string; seller: boolean };
export type ForumPost = { id: number; body: string; status: "visible" | "pending" | "hidden"; created_at: string; edited_at: string | null; nick: string; seller: boolean; seller_id: string | null; mine: boolean; editable: boolean; hidden_reason: string | null };
export type ForumThread = { id: number; section: string; title: string; status: string; locked: boolean; created_at: string; last_post_at: string; nick: string; posts: ForumPost[] };
export type ForumMe = { nick: string; trusted: boolean; banned: boolean; seller: boolean; pending: number } | null;
export type MyForumPost = { id: number; thread_id: number; section: string; title: string; body: string; status: string; hidden_reason: string | null; created_at: string };

export const FORUM_REPORT_REASONS = ["Spam alebo reklama", "Urážlivý alebo nenávistný obsah", "Podvod", "Nelegálny obsah", "Porušenie autorských práv", "Osobné údaje inej osoby", "Iné"] as const;
export const FORUM_TERMS = "2026-11-14";

export const forumPath = () => "/forum";
export const sectionPath = (id: string) => `/forum/${id}`;
export const threadPath = (section: string, id: number, title: string) => `/forum/${section}/${id}-${slugify(title).slice(0, 70)}`;
/** „123-nazov-temy“ → 123 */
export const threadIdOf = (slug: string) => { const n = parseInt(slug, 10); return Number.isFinite(n) && n > 0 ? n : null; };

// Verejné čítanie – vlastný klient bez relácie (na serveri aj v prehliadači).
let pub: SupabaseClient | null = null;
const pc = () => (pub ||= createClient(URL_, KEY_, { auth: { persistSession: false } }));

// ---------- Ukážkový režim ----------
const D = (h: number) => new Date(Date.now() - h * 3600e3).toISOString();
const DEMO_SECTIONS: ForumSection[] = [
  { id: "technika", parent: null, name: "Technické otázky a poruchy", description: "Poradňa podľa značky vozidla – poruchy, opravy, výber a výmena dielov.", threads: 0, posts: 0, last: null },
  ...([["skoda", "Škoda", "Octavia, Fabia, Superb, Rapid, Kodiaq, Karoq, Favorit, Felicia…"], ["volkswagen", "Volkswagen", "Golf, Passat, Polo, Touran, Tiguan, Transporter…"],
    ["audi", "Audi", "A3, A4, A6, Q5, Q7…"], ["bmw", "BMW a Mini", "Rad 1, 3, 5, X1, X3, X5, Mini…"], ["ford", "Ford", "Focus, Fiesta, Mondeo, Kuga, Transit…"],
    ["veterany-tech", "Veterány", "Staršie autá – Škoda 100/120, Tatra, Trabant, Lada, Wartburg…"]] as const).map(([id, name, description], i) => ({
    id, parent: "technika", name, description, threads: i === 0 ? 2 : i === 1 ? 1 : 0, posts: i === 0 ? 5 : i === 1 ? 2 : 0,
    last: i === 0 ? { id: 1, title: "Octavia II 1.9 TDI – klepe pri studenom štarte", at: D(3) } : i === 1 ? { id: 3, title: "Golf VII – kde nájdem číslo dielu svetlometu?", at: D(30) } : null })),
];
const DEMO_THREADS: ForumThreadRow[] = [
  { id: 1, section: "skoda", title: "Octavia II 1.9 TDI – klepe pri studenom štarte", pinned: false, locked: false, posts: 3, created_at: D(26), last_post_at: D(3), nick: "Jano 85", seller: false },
  { id: 2, section: "skoda", title: "Fabia I – nejde centrálne zamykanie na ľavých dverách", pinned: false, locked: false, posts: 2, created_at: D(50), last_post_at: D(20), nick: "Mirka", seller: false },
  { id: 3, section: "volkswagen", title: "Golf VII – kde nájdem číslo dielu svetlometu?", pinned: false, locked: false, posts: 2, created_at: D(40), last_post_at: D(30), nick: "Peter G.", seller: false },
];
const DEMO_POSTS: Record<number, ForumPost[]> = {
  1: [
    { id: 11, body: "Ahojte, Octavia II combi 1.9 TDI (BXE), 2008, 245 000 km. Ráno po štarte asi minútu klepe, potom prestane. Olej menený pred 8 000 km. Čo by ste skontrolovali ako prvé?", status: "visible", created_at: D(26), edited_at: null, nick: "Jano 85", seller: false, seller_id: null, mine: false, editable: false, hidden_reason: null },
    { id: 12, body: "Pri BXE je to často vačkový hriadeľ alebo hydraulické zdvihátka. Dajte vypočuť mechanikovi a pozrite aj vstrekovače (čerpadlo-dýzy).", status: "visible", created_at: D(20), edited_at: null, nick: "Vrakovisko Ukážka", seller: true, seller_id: null, mine: false, editable: false, hidden_reason: null },
    { id: 13, body: "Ďakujem, bol to vačkový hriadeľ. Vymenený aj so zdvihátkami a je ticho.", status: "visible", created_at: D(3), edited_at: null, nick: "Jano 85", seller: false, seller_id: null, mine: false, editable: false, hidden_reason: null },
  ],
  2: [
    { id: 21, body: "Fabia I 2003 – centrál nezamyká ľavé zadné dvere. Motorček je asi v zámku. Oplatí sa kúpiť použitý zámok?", status: "visible", created_at: D(50), edited_at: null, nick: "Mirka", seller: false, seller_id: null, mine: false, editable: false, hidden_reason: null },
    { id: 22, body: "Áno, použitý zámok je bežný diel. Porovnajte číslo dielu na zámku a dajte pozor na stranu (ľavý / pravý).", status: "visible", created_at: D(20), edited_at: null, nick: "Peter G.", seller: false, seller_id: null, mine: false, editable: false, hidden_reason: null },
  ],
  3: [
    { id: 31, body: "Potrebujem ľavý svetlomet na Golf VII (2015), kde presne je číslo dielu?", status: "visible", created_at: D(40), edited_at: null, nick: "Peter G.", seller: false, seller_id: null, mine: false, editable: false, hidden_reason: null },
    { id: 32, body: "Na štítku na zadnej strane svetlometu, číslo začína 5G0 941…", status: "visible", created_at: D(30), edited_at: null, nick: "Mirka", seller: false, seller_id: null, mine: false, editable: false, hidden_reason: null },
  ],
};

const must = <T,>(r: { data: T | null; error: { message: string } | null }): T => { if (r.error) throw new Error(r.error.message); return r.data as T; };

export async function forumOverview(): Promise<ForumSection[]> {
  if (FORUM_DEMO) return DEMO_SECTIONS;
  return (must(await pc().rpc("forum_overview")) as ForumSection[]) || [];
}
export async function forumThreads(section: string | null, offset = 0, limit = 30): Promise<{ total: number; items: ForumThreadRow[] }> {
  if (FORUM_DEMO) { const items = DEMO_THREADS.filter((t) => !section || t.section === section); return { total: items.length, items: items.slice(offset, offset + limit) }; }
  return must(await pc().rpc("forum_threads_page", { p_section: section, p_offset: offset, p_limit: limit })) as { total: number; items: ForumThreadRow[] };
}
/** Téma len s verejnými príspevkami (server, pre Google). */
export async function forumThreadPublic(id: number): Promise<ForumThread | null> {
  if (FORUM_DEMO) { const t = DEMO_THREADS.find((x) => x.id === id); return t ? { id: t.id, section: t.section, title: t.title, status: "visible", locked: false, created_at: t.created_at, last_post_at: t.last_post_at, nick: t.nick, posts: DEMO_POSTS[id] || [] } : null; }
  return (must(await pc().rpc("forum_thread", { p_id: id })) as ForumThread | null) || null;
}
export async function forumSitemap(): Promise<{ id: number; section: string; title: string; last_post_at: string }[]> {
  if (FORUM_DEMO) return DEMO_THREADS.map((t) => ({ id: t.id, section: t.section, title: t.title, last_post_at: t.last_post_at }));
  return (must(await pc().rpc("forum_sitemap")) as { id: number; section: string; title: string; last_post_at: string }[]) || [];
}
export async function forumReport(post: number, reason: string, note: string, contact: string): Promise<void> {
  if (FORUM_DEMO) return;
  must(await pc().rpc("forum_report", { p_post: post, p_reason: reason, p_note: note, p_contact: contact }));
}

export const fmtForumDate = (s: string) => new Date(s).toLocaleString("sk-SK", { day: "numeric", month: "numeric", year: "numeric", hour: "2-digit", minute: "2-digit", timeZone: "Europe/Bratislava" });
