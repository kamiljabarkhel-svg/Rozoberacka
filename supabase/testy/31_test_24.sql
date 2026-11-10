-- Testy pre 24: odpovede predajcu, konverzácia kupujúceho cez tajný odkaz, fronta e-mailov.
\set ON_ERROR_STOP 1
create or replace function pg_temp.ok(cond boolean, msg text) returns void language plpgsql as $$
begin if not coalesce(cond, false) then raise exception 'ZLYHAL: %', msg; end if; raise notice 'OK  %', msg; end $$;
create or replace function pg_temp.as_user(u uuid) returns void language plpgsql as $$
begin perform set_config('request.jwt.claims', json_build_object('sub', u, 'role', 'authenticated')::text, false); end $$;
create or replace function pg_temp.fails(sql text, msg text) returns void language plpgsql as $$
begin
  begin execute sql; exception when others then raise notice 'OK  % (%)', msg, sqlerrm; return; end;
  raise exception 'ZLYHAL: % (prešlo)', msg;
end $$;

insert into auth.users (id, email) values ('a2411111-0000-0000-0000-0000000000a1', 'predajca24@test.invalid'), ('a2422222-0000-0000-0000-0000000000a2', 'iny24@test.invalid');
select pg_temp.as_user('a2411111-0000-0000-0000-0000000000a1'); set role authenticated;
insert into public.sellers (id, name, city, seller_type) values ('a2411111-0000-0000-0000-0000000000a1', 'Vrakovisko 24', 'Trnava', 'Súkromná osoba');
insert into public.listings (seller_id, name, brand_id, model_id, year, category_id, oem, price, city, description, warranty, condition)
select 'a2411111-0000-0000-0000-0000000000a1', 'Ľavé zrkadlo 24', b.id, m.id, 2016, 'kar', '5E1857507', 60, 'Trnava', 'Elektrické zrkadlo, bez prasklín.', 'Bez záruky', 'Dobrý'
from public.brands b join public.models m on m.brand_id = b.id where b.name = 'Škoda' order by m.id limit 1;
reset role;
select pg_temp.as_user('a2422222-0000-0000-0000-0000000000a2'); set role authenticated;
insert into public.sellers (id, name, city, seller_type) values ('a2422222-0000-0000-0000-0000000000a2', 'Iný predajca', 'Nitra', 'Súkromná osoba');
reset role;

-- kupujúci napíše (anon)
set role anon;
select public.send_message((select id from public.listings where name = 'Ľavé zrkadlo 24'), 'Jana24', 'Jana.Kup@Example.com', 'Dobrý deň, je zrkadlo ešte k dispozícii?');
select public.send_message((select id from public.listings where name = 'Ľavé zrkadlo 24'), 'Peter24', '0905 123 456', 'Pošlete aj fotku zboku?');
reset role;
select pg_temp.ok((select buyer_email from public.messages where sender_name = 'Jana24') = 'jana.kup@example.com', '24: e-mail kupujúceho rozpoznaný');
select pg_temp.ok((select buyer_email from public.messages where sender_name = 'Peter24') is null, '24: telefón nie je e-mail');

-- predajca
select pg_temp.as_user('a2411111-0000-0000-0000-0000000000a1'); set role authenticated;
select pg_temp.fails($q$select reply_token from public.messages$q$, '24: predajca nevidí tajný kľúč konverzácie');
select pg_temp.ok((select count(*) from public.messages) = 2, '24: predajca vidí svoje správy');
select pg_temp.fails($q$select public.seller_reply((select id from public.messages where sender_name = 'Peter24'), 'Áno, je.')$q$, '24: odpoveď bez e-mailu kupujúceho odmietnutá');
select pg_temp.ok(public.seller_reply((select id from public.messages where sender_name = 'Jana24'), 'Áno, zrkadlo je k dispozícii, môžete prísť.') > 0, '24: predajca odpovedal');
select pg_temp.fails($q$insert into public.message_replies (message_id, author, body) select id, 'seller', 'priamo' from public.messages limit 1$q$, '24: priamy zápis do odpovedí zakázaný');
select pg_temp.ok((select count(*) from public.message_replies) = 1, '24: predajca vidí svoju odpoveď');
reset role;

-- iný predajca nevidí a nemôže odpovedať
select pg_temp.as_user('a2422222-0000-0000-0000-0000000000a2'); set role authenticated;
select pg_temp.ok((select count(*) from public.message_replies) = 0, '24: cudzí predajca odpovede nevidí');
select pg_temp.fails($q$select public.seller_reply((select id from public.messages where sender_name = 'Jana24'), 'Kúpte u mňa')$q$, '24: cudzí predajca nemôže odpovedať');
reset role;

-- kupujúci cez tajný odkaz
create temp table t24 as select reply_token as t from public.messages where sender_name = 'Jana24';
create temp table t24b as select reply_token as t from public.messages where sender_name = 'Peter24';
grant select on t24, t24b to anon;
set role anon;
select pg_temp.ok((select (public.thread_get(t) -> 'replies' -> 0 ->> 'author') = 'seller' and public.thread_get(t) ->> 'seller_name' = 'Vrakovisko 24' from t24), '24: kupujúci vidí konverzáciu');
select pg_temp.ok((select public.thread_get(t) ->> 'buyer_email' is null and position('example.com' in public.thread_get(t)::text) = 0 from t24), '24: v konverzácii nie je e-mail');
select pg_temp.ok(public.thread_get(gen_random_uuid()) is null, '24: neznámy odkaz nič nevráti');
select pg_temp.fails($q$select public.thread_reply((select t from t24b), 'Haló?')$q$, '24: kupujúci nepíše, kým predajca neodpovie');
select pg_temp.ok((select public.thread_reply(t, 'Ďakujem, prídem zajtra o 10.') from t24), '24: kupujúci odpovedal');
select pg_temp.fails($q$select * from public.reply_outbox()$q$, '24: fronta e-mailov nie je pre návštevníka');
reset role;
select pg_temp.ok((select read_at is null from public.messages where sender_name = 'Jana24'), '24: odpoveď kupujúceho je pre predajcu nová');

-- fronta e-mailov (service_role)
set role service_role;
select pg_temp.ok((select count(*) from public.reply_outbox()) = 2, '24: vo fronte 2 e-maily');
select pg_temp.ok((select to_email from public.reply_outbox() where author = 'seller') = 'jana.kup@example.com', '24: odpoveď predajcu ide kupujúcemu');
select pg_temp.ok((select to_email from public.reply_outbox() where author = 'buyer') = 'predajca24@test.invalid', '24: odpoveď kupujúceho ide predajcovi');
select public.reply_mark(reply_id) from public.reply_outbox() where author = 'seller';
select pg_temp.ok((select count(*) from public.reply_outbox()) = 1, '24: odoslaný e-mail z fronty zmizol');
reset role;
\echo HOTOVO
