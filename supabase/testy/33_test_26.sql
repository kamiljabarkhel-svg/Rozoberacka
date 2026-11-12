-- Testy pre 26: puklice (povinný priemer, hľadanie) a filter „použité“ (všetko okrem nového).
\set ON_ERROR_STOP 1
create or replace function pg_temp.ok(cond boolean, msg text) returns void language plpgsql as $$
begin if not coalesce(cond, false) then raise exception 'ZLYHAL: %', msg; end if; raise notice 'OK  %', msg; end $$;
create or replace function pg_temp.as_user(u uuid) returns void language plpgsql as $$
begin perform set_config('request.jwt.claims', json_build_object('sub', u, 'role', 'authenticated')::text, false); end $$;
insert into auth.users (id, email) values ('a2611111-0000-0000-0000-0000000000a1', 'puklice26@test.invalid');
select pg_temp.as_user('a2611111-0000-0000-0000-0000000000a1'); set role authenticated;
insert into public.sellers (id, name, city, seller_type) values ('a2611111-0000-0000-0000-0000000000a1', 'Puklice 26', 'Nitra', 'Súkromná osoba');
do $$ begin
  insert into public.listings (seller_id, name, category_id, subcategory_id, price, city, description, warranty, condition, specs)
  select 'a2611111-0000-0000-0000-0000000000a1', 'Puklice bez priemeru', 'kol', id, 20, 'Nitra', 'Sada štyroch puklíc, bez prasklín.', 'Bez záruky', 'Dobrý', '{"pcs":"4"}'
  from public.subcategories where category_id = 'kol' and name = 'Puklice';
  raise exception 'ZLYHAL: puklice bez priemeru prešli';
exception when check_violation then raise notice 'OK  26: puklice bez priemeru odmietnuté'; end $$;
insert into public.listings (seller_id, name, category_id, subcategory_id, price, city, description, warranty, condition, specs)
select 'a2611111-0000-0000-0000-0000000000a1', 'Puklice 15 palcov', 'kol', id, 25, 'Nitra', 'Sada štyroch puklíc, bez prasklín.', 'Bez záruky', 'Dobrý', '{"rd":"15","pcs":"4"}'
from public.subcategories where category_id = 'kol' and name = 'Puklice';
insert into public.listings (seller_id, name, category_id, subcategory_id, price, city, description, warranty, condition, specs)
select 'a2611111-0000-0000-0000-0000000000a1', 'Nové pneumatiky 26', 'kol', id, 300, 'Nitra', 'Nové zimné pneumatiky, nepoužité.', 'Bez záruky', 'Nový', '{"tw":"205","tp":"55","rd":"16","season":"zimné","pcs":"4"}'
from public.subcategories where category_id = 'kol' and name = 'Pneumatiky zimné';
insert into public.listings (seller_id, name, category_id, subcategory_id, price, city, description, warranty, condition, specs)
select 'a2611111-0000-0000-0000-0000000000a1', 'Použité pneumatiky 26', 'kol', id, 120, 'Nitra', 'Zimné pneumatiky, dezén 6 mm.', 'Bez záruky', 'Veľmi dobrý', '{"tw":"205","tp":"55","rd":"16","season":"zimné","tread":"6","pcs":"4"}'
from public.subcategories where category_id = 'kol' and name = 'Pneumatiky zimné';
select pg_temp.ok(true, '26: puklice s priemerom a pneumatiky uložené');
reset role; set role anon;
select pg_temp.ok((public.search_listings('{"cat":"kol","wtype":"puklice","seller":"a2611111-0000-0000-0000-0000000000a1"}') ->> 'total')::int = 1, '26: wtype puklice nájde len puklice');
select pg_temp.ok((public.search_listings('{"cat":"kol","wtype":"puklice","seller":"a2611111-0000-0000-0000-0000000000a1","specs":{"rd":"16"}}') ->> 'total')::int = 0, '26: puklice iného priemeru sa nenájdu');
select pg_temp.ok((public.search_listings('{"cat":"kol","wtype":"pneu","seller":"a2611111-0000-0000-0000-0000000000a1","cond":"pouzite"}') ->> 'total')::int = 1, '26: stav použité = bez nových');
select pg_temp.ok((public.search_listings('{"cat":"kol","wtype":"pneu","seller":"a2611111-0000-0000-0000-0000000000a1","cond":"Nový"}') ->> 'total')::int = 1, '26: stav nový funguje ďalej');
select pg_temp.ok((public.search_listings('{"cat":"kol","seller":"a2611111-0000-0000-0000-0000000000a1"}') ->> 'total')::int = 3, '26: bez typu všetko z pneumatík a diskov');
reset role;
\echo HOTOVO
