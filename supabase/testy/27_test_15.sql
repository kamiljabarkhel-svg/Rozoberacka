-- Testy pre 15 (spevnenie práv anonymného návštevníka).
\set ON_ERROR_STOP 1
create or replace function pg_temp.ok(cond boolean, msg text) returns void language plpgsql as $$
begin if not coalesce(cond, false) then raise exception 'ZLYHAL: %', msg; end if; raise notice 'OK  %', msg; end $$;
create or replace function pg_temp.denied(q text, msg text) returns void language plpgsql as $$
begin
  begin execute q; raise exception 'ZLYHAL (prešlo): %', msg;
  exception when insufficient_privilege then raise notice 'OK  %', msg; end;
end $$;

set role anon;
select pg_temp.denied('select phone from public.listing_contacts', 'anonym nemá právo na telefóny inzerátov');
select pg_temp.denied('select phone from public.seller_private', 'anonym nemá právo na súkromné údaje predajcov');
select pg_temp.denied('select body from public.messages', 'anonym nemá právo na správy');
select pg_temp.denied('select contact from public.reports', 'anonym nemá právo na nahlásenia');
select pg_temp.denied('select ip_key from public.rate_events', 'anonym nemá právo na odtlačky IP');
select pg_temp.denied('select type_declared_at from public.sellers', 'anonym nevidí čas vyhlásenia');
select pg_temp.denied($q$insert into public.messages (listing_id, seller_id, sender_name, sender_contact, body) values (1, gen_random_uuid(), 'a', 'b', 'c')$q$, 'anonym nezapisuje priamo do správ');
select pg_temp.denied('delete from public.listings', 'anonym nemaže inzeráty');
select pg_temp.ok((select count(*) >= 0 from (select id, name, price, city, oem, seller_id, status from public.listings) x), 'anonym číta verejné stĺpce inzerátov');
select pg_temp.ok((select count(*) >= 0 from (select id, name, seller_type, city, ico, address from public.sellers) x), 'anonym číta verejné údaje predajcov');
select pg_temp.ok((public.search_listings('{}') ->> 'total') is not null, 'hľadanie funguje aj po spevnení práv');
reset role;
set role authenticated;
select pg_temp.denied('truncate public.listings', 'prihlásený predajca nemôže vyprázdniť tabuľku');
reset role;
\echo HOTOVO
