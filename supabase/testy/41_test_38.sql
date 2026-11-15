-- Test pre 38: hľadanie aj v poľských prekladoch
\set ON_ERROR_STOP 1
create or replace function pg_temp.ok(cond boolean, msg text) returns void language plpgsql as $$
begin if not coalesce(cond, false) then raise exception 'ZLYHAL: %', msg; end if; raise notice 'OK  %', msg; end $$;
insert into auth.users (id, email, email_confirmed_at) values ('a3800000-0000-0000-0000-000000000001', 'hladanie38@test.invalid', now());
insert into public.sellers (id, name, city, seller_type) values ('a3800000-0000-0000-0000-000000000001', 'Hľadanie 38', 'Žilina', 'Súkromná osoba');
insert into public.listings (seller_id, name, category_id, brand_id, price, city, description, warranty, condition, vtype)
values ('a3800000-0000-0000-0000-000000000001', 'Predné svetlo test38', 'ine', (select id from public.brands where name = 'Škoda'), 20, 'Žilina', 'Svetlo bez prasklín, úchyty celé, test.', 'Bez záruky', 'Dobrý', 'osobne');
create temp table t38 as select id from public.listings where name = 'Predné svetlo test38';
select public.translate_save('pl', (select id from t38), 'Reflektor przedni test38', 'Reflektor bez pęknięć, mocowania całe, test.', (select o.src_hash from public.translate_outbox('pl', 200) o where o.id = (select id from t38)));
select pg_temp.ok((select search_text from public.listing_tr where listing_id = (select id from t38)) like '%reflektor%', '38: preklad má text na hľadanie');
select pg_temp.ok((public.search_listings('{"q":"reflektor test38"}') -> 'total')::int = 1, '38: poľské slovo nájde slovenský inzerát');
select pg_temp.ok((public.search_listings('{"q":"pękniec test38"}') -> 'total')::int = 1, '38: poľský text s diakritikou aj bez nej');
select pg_temp.ok((public.search_listings('{"q":"svetlo test38"}') -> 'total')::int = 1, '38: slovenské hľadanie funguje ďalej');
select pg_temp.ok((public.search_listings('{"q":"kolo test38"}') -> 'total')::int = 0, '38: nesúvisiace slovo nenájde');
set role anon;
select pg_temp.ok((public.search_listings('{"q":"reflektor test38"}') -> 'total')::int = 1, '38: funguje aj pre návštevníka');
reset role;
