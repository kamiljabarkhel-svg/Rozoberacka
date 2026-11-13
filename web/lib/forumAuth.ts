"use client";
// Fórum – účet a písanie (prehliadač). Prihlásenie zdieľa Supabase Auth s portálom predajcu:
// predajca píše so svojím účtom, ostatní si vytvoria účet len pre fórum (user_metadata.role = "forum").
import type { Session } from "@supabase/supabase-js";
import { sellerClient, skError } from "./seller";
import { FORUM_DEMO, FORUM_TERMS, type ForumMe, type ForumThread, type MyForumPost } from "./forum";

const c = () => sellerClient();
const must = <T,>(r: { data: T | null; error: { message: string } | null }): T => { if (r.error) throw new Error(skError(r.error)); return r.data as T; };

export const isForumOnly = (s: Session | null) => s?.user.user_metadata?.role === "forum";

export async function forumSession(): Promise<Session | null> {
  if (FORUM_DEMO) return null;
  return (await c().auth.getSession()).data.session;
}
export async function forumSignUp(email: string, password: string, nick: string): Promise<boolean> {
  const { data, error } = await c().auth.signUp({
    email: email.trim(), password,
    options: { data: { role: "forum", nick: nick.trim(), terms_version: FORUM_TERMS, terms_accepted_at: new Date().toISOString() }, emailRedirectTo: window.location.origin + "/forum/ucet" },
  });
  if (error) throw new Error(skError(error));
  return !data.session;   // true = treba potvrdiť e-mail
}
export async function forumSignIn(email: string, password: string) {
  const { error } = await c().auth.signInWithPassword({ email: email.trim(), password });
  if (error) throw new Error(skError(error));
}
export async function forumSignOut() { await c().auth.signOut(); }

export async function forumMe(): Promise<ForumMe> { return (must(await c().rpc("forum_me")) as ForumMe) || null; }
export async function forumJoin(nick: string) { must(await c().rpc("forum_join", { p_nick: nick.trim(), p_terms: FORUM_TERMS })); }
/** Prihlásený bez profilu: prezývka z registrácie (alebo názov predajcu) sa nastaví sama, ak je voľná. */
export async function forumEnsureProfile(s: Session): Promise<ForumMe> {
  const me = await forumMe();
  if (me) return me;
  const nick = String(s.user.user_metadata?.nick || "").trim();
  if (nick) { try { await forumJoin(nick); return await forumMe(); } catch { /* obsadená – používateľ si zvolí inú */ } }
  return null;
}
export async function forumNewThread(section: string, title: string, body: string): Promise<number> {
  return Number(must(await c().rpc("forum_new_thread", { p_section: section, p_title: title.trim(), p_body: body })));
}
export async function forumReply(thread: number, body: string): Promise<number> {
  return Number(must(await c().rpc("forum_reply", { p_thread: thread, p_body: body })));
}
export async function forumEdit(post: number, body: string) { must(await c().rpc("forum_edit_post", { p_post: post, p_body: body })); }
export async function forumDelete(post: number) { must(await c().rpc("forum_delete_post", { p_post: post })); }
/** Téma vrátane vlastných čakajúcich a skrytých príspevkov (s dôvodom). */
export async function forumThreadMine(id: number): Promise<ForumThread | null> { return (must(await c().rpc("forum_thread", { p_id: id })) as ForumThread | null) || null; }
export async function forumMyPosts(): Promise<MyForumPost[]> { return (must(await c().rpc("forum_my_posts")) as MyForumPost[]) || []; }
export async function forumExport(): Promise<unknown> { return must(await c().rpc("forum_export_my_data")); }
export async function forumDeleteAccount() { must(await c().rpc("forum_delete_account")); await c().auth.signOut(); }
export async function forumResetPassword(email: string) {
  const { error } = await c().auth.resetPasswordForEmail(email.trim(), { redirectTo: window.location.origin + "/forum/ucet?heslo=1" });
  if (error) throw new Error(skError(error));
}
/** Obnoví verejné stránky fóra po zmene (Next.js si ich inak pamätá minútu). */
export function forumRefresh() { fetch("/api/forum-obnovit", { method: "POST" }).catch(() => {}); }
export async function forumChangePassword(pw: string) {
  const { error } = await c().auth.updateUser({ password: pw });
  if (error) throw new Error(skError(error));
}
