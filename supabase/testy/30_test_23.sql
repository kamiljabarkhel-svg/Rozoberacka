-- Testy pre 23: povinný rozmer pri pneumatikách a diskoch, nové polia vozidiel.
\set ON_ERROR_STOP 1
create or replace function pg_temp.ok(cond boolean, msg text) returns void language plpgsql as $$
begin if not coalesce(cond, false) then raise exception 'ZLYHAL: %', msg; end if; raise notice 'OK  %', msg; end $$;
create or replace function pg_temp.as_user(u uuid) returns void language plpgsql as $$
begin perform set_config('request.jwt.claims', json_build_object('sub', u, 'role', 'authenticated')::text, false); end $$;
create or replace function pg_temp.bad(sql text, msg text) returns void language plpgsql as $$
begin
  begin execute sql; exception when check_violation then raise notice 'OK  %', msg; return; end;
  raise exception 'ZLYHAL: % (prešlo)', msg;
end $$;

insert into auth.users (id, email) values ('f1111111-0000-0000-0000-0000000000f1', 'kolesa@test.invalid');
select pg_temp.as_user('f1111111-0000-0000-0000-0000000000f1'); set role authenticated;
insert into public.sellers (id, name, city, seller_type) values ('f1111111-0000-0000-0000-0000000000f1', 'Kolesá Fero', 'Žilina', 'Súkromná osoba');

select pg_temp.bad($q$insert into public.listings (seller_id, name, category_id, price, city, description, warranty, condition, specs)
  values ('f1111111-0000-0000-0000-0000000000f1', 'Pneumatiky bez druhu', 'kol', 100, 'Žilina', 'Sada 4 ks v dobrom stave, dezén 6 mm.', 'Bez záruky', 'Dobrý', '{"tw":"205","tp":"55","rd":"16"}')$q$,
  '23: pneumatiky bez podkategórie odmietnuté');
select pg_temp.bad($q$insert into public.listings (seller_id, name, category_id, subcategory_id, price, city, description, warranty, condition, specs)
  select 'f1111111-0000-0000-0000-0000000000f1', 'Pneumatiky bez rozmeru', 'kol', id, 100, 'Žilina', 'Sada 4 ks v dobrom stave, dezén 6 mm.', 'Bez záruky', 'Dobrý', '{"season":"letné"}'
  from public.subcategories where category_id = 'kol' and name = 'Pneumatiky letné'$q$,
  '23: pneumatiky bez rozmeru odmietnuté');
select pg_temp.bad($q$insert into public.listings (seller_id, name, category_id, subcategory_id, price, city, description, warranty, condition, specs)
  select 'f1111111-0000-0000-0000-0000000000f1', 'Disky bez rozteče', 'kol', id, 100, 'Žilina', 'Sada 4 diskov, bez prasklín a ohnutia.', 'Bez záruky', 'Dobrý', '{"rd":"16"}'
  from public.subcategories where category_id = 'kol' and name = 'Disky oceľové'$q$,
  '23: disky bez rozteče odmietnuté');
select pg_temp.bad($q$insert into public.listings (seller_id, name, category_id, subcategory_id, price, city, description, warranty, condition, specs)
  select 'f1111111-0000-0000-0000-0000000000f1', 'Kolesá bez rozmeru', 'kol', id, 100, 'Žilina', 'Kolesá komplet, pneumatiky 5 mm.', 'Bez záruky', 'Dobrý', '{"season":"zimné"}'
  from public.subcategories where category_id = 'kol' and name = 'Kolesá s pneumatikami'$q$,
  '25: kolesá bez rozmeru pneumatiky aj disku odmietnuté');
insert into public.listings (seller_id, name, category_id, subcategory_id, price, city, description, warranty, condition, specs)
select 'f1111111-0000-0000-0000-0000000000f1', 'Kolesá 205/55 R16 5x112', 'kol', id, 300, 'Žilina', 'Kolesá komplet, pneumatiky zimné 5 mm.', 'Bez záruky', 'Dobrý',
       '{"tw":"205","tp":"55","rd":"16","pcd":"5x112","season":"zimné","tread":"5","pcs":"4"}'
from public.subcategories where category_id = 'kol' and name = 'Kolesá s pneumatikami';
select pg_temp.ok(true, '23: kompletné kolesá uložené');
insert into public.listings (seller_id, name, category_id, subcategory_id, price, city, description, warranty, condition)
select 'f1111111-0000-0000-0000-0000000000f1', 'Snehové reťaze', 'kol', id, 30, 'Žilina', 'Reťaze na 15 a 16 palcov, použité raz.', 'Bez záruky', 'Veľmi dobrý'
from public.subcategories where category_id = 'kol' and name = 'Snehové reťaze';
select pg_temp.ok(true, '23: reťaze bez rozmeru uložené');

-- vozidlá
insert into public.car_listings (seller_id, brand_id, model_id, year, km, fuel, condition, damage, docs, price, city, description, body, power_kw, keys, origin)
select 'f1111111-0000-0000-0000-0000000000f1', b.id, m.id, 2015, 180000, 'Nafta', 'Havarované – nepojazdné', '{Predok,Airbagy}', 'S dokladmi – odhlásené', 2500, 'Žilina',
       'Čelný náraz, airbagy vystrelené, motor v poriadku.', 'Kombi', 110, true, 'Slovensko'
from public.brands b join public.models m on m.brand_id = b.id where b.name = 'Škoda' and coalesce(m.vehicle_type, 'osobne') = 'osobne' order by m.id limit 1;
select pg_temp.ok(true, '23: vozidlo s karosériou, výkonom a kľúčmi uložené');
select pg_temp.bad($q$insert into public.car_listings (seller_id, brand_id, year, condition, docs, price, city, description)
  select 'f1111111-0000-0000-0000-0000000000f1', id, 2014, 'Na diely', 'S dokladmi – prihlásené', 900, 'Žilina', 'Auto na diely bez paliva v inzeráte.' from public.brands where name = 'Škoda'$q$,
  '23: vozidlo bez paliva odmietnuté');
select pg_temp.bad($q$insert into public.car_listings (seller_id, brand_id, year, fuel, condition, docs, price, city, description, body)
  select 'f1111111-0000-0000-0000-0000000000f1', id, 2014, 'Benzín', 'Na diely', 'S dokladmi – prihlásené', 900, 'Žilina', 'Auto na diely so zlou karosériou.', 'Lietadlo' from public.brands where name = 'Škoda'$q$,
  '23: neznáma karoséria odmietnutá');
reset role; set role anon;
select pg_temp.ok((select (x ->> 'power_kw')::int = 110 and x ->> 'body' = 'Kombi' and (x ->> 'keys')::boolean from (select jsonb_array_elements(public.search_cars('{"vtype":""}') -> 'items') x) t
  where x ->> 'city' = 'Žilina' limit 1), '23: verejný zoznam vracia karosériu, výkon a kľúče');
select pg_temp.ok((public.search_listings('{"cat":"kol","wtype":"kolesa","seller":"f1111111-0000-0000-0000-0000000000f1"}') ->> 'total')::int = 1, '23: kolesá nájdené');
reset role;
\echo HOTOVO
