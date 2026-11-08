-- 15: spevnenie práv anonymného návštevníka (8. 11. 2026).
-- Ochrana riadkov (RLS) už teraz bráni anonymovi čítať súkromné tabuľky (overené na ostrej databáze 8. 11. 2026).
-- Toto je druhá vrstva: anonym na ne nemá ani právo, takže ani chyba v pravidle by údaje neprezradila.
-- Verejný web číta len katalóg, aktívne inzeráty, verejné údaje predajcov a hodnotenia; všetko ostatné ide cez funkcie s kontrolami.

-- Súkromné tabuľky: telefóny, správy kupujúcich, nahlásenia, záznamy správcu, odtlačky IP.
revoke all on public.listing_contacts, public.seller_private, public.messages, public.reports,
  public.admin_log, public.admins, public.rate_events from anon;

-- Anonym do tabuliek priamo nezapisuje (správy, nahlásenia, dopyty, hodnotenia idú cez funkcie s obmedzením počtu).
revoke insert, update, delete, truncate, references, trigger on all tables in schema public from anon;
-- Prihlásený predajca nepotrebuje TRUNCATE ani spúšťače (RLS na TRUNCATE neplatí).
revoke truncate, references, trigger on all tables in schema public from authenticated;

-- Čas vyhlásenia o type predajcu netreba zverejňovať (minimalizácia údajov). Ostáva v databáze a v exporte „Moje údaje“.
revoke select (type_declared_at) on public.sellers from anon, authenticated;

-- Poznámka správcu k inzerátu (moderation_note) zámerne ostáva čitateľná: funkcia hľadania číta celé riadky inzerátov
-- s právami návštevníka a skrytie stĺpca by hľadanie rozbilo (zistené testom 20). Poznámka sa vypĺňa len pri skrytom
-- inzeráte a skryté inzeráty verejnosť nevidí (RLS: status = 'active').
