-- Testy pre 27: Iná značka / Iný model a fronta e-mailov len s odpoveďami predajcu.
\set ON_ERROR_STOP 1
create or replace function pg_temp.ok(cond boolean, msg text) returns void language plpgsql as $$
begin if not coalesce(cond, false) then raise exception 'ZLYHAL: %', msg; end if; raise notice 'OK  %', msg; end $$;
select pg_temp.ok((select count(*) from public.models m join public.brands b on b.id = m.brand_id where b.name = 'Iná značka') = 5, '27: Iná značka má 5 modelov (všetky druhy vozidiel)');
select pg_temp.ok(not exists (select 1 from public.brands b where b.name <> 'Iná značka' and exists (select 1 from public.models m where m.brand_id = b.id and m.name not like 'Iný model%')
  and not exists (select 1 from public.models m where m.brand_id = b.id and m.name like 'Iný model%')), '27: každá značka má Iný model');
select pg_temp.ok((select count(*) from public.models m where m.name like 'Iný model%' and m.vehicle_type = 'motorky' and m.name <> 'Iný model (motorka)') = 0, '27: druh vozidla sedí s názvom');
-- inzerát s Iná značka / Iný model prejde kontrolou
insert into auth.users (id, email) values ('a2711111-0000-0000-0000-0000000000a1', 'ina27@test.invalid');
insert into public.sellers (id, name, city, seller_type) values ('a2711111-0000-0000-0000-0000000000a1', 'Iná 27', 'Košice', 'Súkromná osoba');
insert into public.listings (seller_id, name, category_id, brand_id, model_id, year, oem, price, city, description, warranty, condition)
select 'a2711111-0000-0000-0000-0000000000a1', 'Svetlo Tatra 815', 'sv', b.id, m.id, 1995, 'TAT12345', 50, 'Košice', 'Predné svetlo z Tatry 815.', 'Bez záruky', 'Dobrý'
from public.brands b join public.models m on m.brand_id = b.id where b.name = 'Iná značka' and m.name = 'Iný model (nákladné)';
select pg_temp.ok(exists (select 1 from public.listings where name = 'Svetlo Tatra 815' and vtype = 'nakladne'), '27: inzerát s inou značkou uložený, druh vozidla nákladné');
-- fronta: odpoveď kupujúceho sa nedostane do e-mailov
insert into public.messages (listing_id, seller_id, sender_name, sender_contact, body)
select l.id, l.seller_id, 'Kupujúci 27', 'kupujuci27@test.invalid', 'Dobrý deň, je svetlo ešte k dispozícii?' from public.listings l where l.name = 'Svetlo Tatra 815';
insert into public.message_replies (message_id, author, body) select id, 'seller', 'Áno, je.' from public.messages where sender_name = 'Kupujúci 27';
insert into public.message_replies (message_id, author, body) select id, 'buyer', 'Ďakujem, beriem.' from public.messages where sender_name = 'Kupujúci 27';
select pg_temp.ok((select count(*) from public.reply_outbox(200) o where o.buyer_name = 'Kupujúci 27') = 1, '27: do e-mailov ide len odpoveď predajcu');
select pg_temp.ok((select author from public.reply_outbox(200) o where o.buyer_name = 'Kupujúci 27') = 'seller', '27: e-mail ide kupujúcemu');
\echo HOTOVO
