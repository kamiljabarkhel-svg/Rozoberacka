-- Testy pre 25: kolesá s rozmerom len pneumatiky alebo len disku – uloženie aj hľadanie.
\set ON_ERROR_STOP 1
create or replace function pg_temp.ok(cond boolean, msg text) returns void language plpgsql as $$
begin if not coalesce(cond, false) then raise exception 'ZLYHAL: %', msg; end if; raise notice 'OK  %', msg; end $$;
create or replace function pg_temp.as_user(u uuid) returns void language plpgsql as $$
begin perform set_config('request.jwt.claims', json_build_object('sub', u, 'role', 'authenticated')::text, false); end $$;
insert into auth.users (id, email) values ('a2511111-0000-0000-0000-0000000000a1', 'kolesa25@test.invalid');
select pg_temp.as_user('a2511111-0000-0000-0000-0000000000a1'); set role authenticated;
insert into public.sellers (id, name, city, seller_type) values ('a2511111-0000-0000-0000-0000000000a1', 'Kolesá 25', 'Poprad', 'Súkromná osoba');
insert into public.listings (seller_id, name, category_id, subcategory_id, price, city, description, warranty, condition, specs)
select 'a2511111-0000-0000-0000-0000000000a1', 'Kolesá len pneu 25', 'kol', id, 250, 'Poprad', 'Zimné kolesá, dezén 6 mm, disky neviem.', 'Bez záruky', 'Dobrý',
       '{"tw":"195","tp":"65","rd":"15","season":"zimné","tread":"6","pcs":"4"}'
from public.subcategories where category_id = 'kol' and name = 'Kolesá s pneumatikami';
insert into public.listings (seller_id, name, category_id, subcategory_id, price, city, description, warranty, condition, specs)
select 'a2511111-0000-0000-0000-0000000000a1', 'Kolesá len disk 25', 'kol', id, 300, 'Poprad', 'Hliníkové kolesá 5x100, pneumatiky na výmenu.', 'Bez záruky', 'Na opravu',
       '{"pcd":"5x100","rd":"15","pcs":"4"}'
from public.subcategories where category_id = 'kol' and name = 'Kolesá s pneumatikami';
select pg_temp.ok(true, '25: kolesá s rozmerom len pneumatiky aj len disku uložené');
reset role; set role anon;
select pg_temp.ok((public.search_listings('{"cat":"kol","wtype":"kolesa","seller":"a2511111-0000-0000-0000-0000000000a1","specs":{"tw":"195","tp":"65","rd":"15"}}') ->> 'total')::int = 1, '25: hľadanie podľa pneumatiky nájde koleso s rozmerom pneumatiky');
select pg_temp.ok((public.search_listings('{"cat":"kol","wtype":"kolesa","seller":"a2511111-0000-0000-0000-0000000000a1","specs":{"pcd":"5x100"}}') ->> 'total')::int = 1, '25: hľadanie podľa rozteče nájde koleso s rozmerom disku');
select pg_temp.ok((public.search_listings('{"cat":"kol","wtype":"kolesa","seller":"a2511111-0000-0000-0000-0000000000a1","specs":{"rd":"15"}}') ->> 'total')::int = 2, '25: hľadanie len podľa priemeru nájde obe');
select pg_temp.ok((public.search_listings('{"cat":"kol","wtype":"kolesa","seller":"a2511111-0000-0000-0000-0000000000a1"}') ->> 'total')::int = 2, '25: bez rozmeru sa ukážu všetky kolesá');
reset role;
\echo HOTOVO
