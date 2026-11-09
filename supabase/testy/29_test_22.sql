-- Testy pre 22: univerzálne diely, druh vozidla bez modelu, hľadanie pneumatík / diskov.
\set ON_ERROR_STOP 1
create or replace function pg_temp.ok(cond boolean, msg text) returns void language plpgsql as $$
begin if not coalesce(cond, false) then raise exception 'ZLYHAL: %', msg; end if; raise notice 'OK  %', msg; end $$;
create or replace function pg_temp.as_user(u uuid) returns void language plpgsql as $$
begin perform set_config('request.jwt.claims', json_build_object('sub', u, 'role', 'authenticated')::text, false); end $$;

insert into auth.users (id, email) values ('e1111111-0000-0000-0000-0000000000e1', 'pneu@test.invalid');
select pg_temp.as_user('e1111111-0000-0000-0000-0000000000e1'); set role authenticated;
insert into public.sellers (id, name, city, seller_type) values ('e1111111-0000-0000-0000-0000000000e1', 'Pneu Jano', 'Nitra', 'Súkromná osoba');
-- pneumatiky bez auta a bez čísla dielu
insert into public.listings (seller_id, name, category_id, subcategory_id, price, city, description, warranty, condition, specs)
select 'e1111111-0000-0000-0000-0000000000e1', 'Zimné pneumatiky 205/55 R16', 'kol', s.id, 120, 'Nitra', 'Sada 4 ks, dezén 6 mm, rok 2021.', 'Bez záruky', 'Dobrý',
       '{"tw":"205","tp":"55","rd":"16","season":"zimné","pcs":"4"}'
from public.subcategories s where s.category_id = 'kol' and s.name = 'Pneumatiky zimné';
select pg_temp.ok(true, '22: pneumatika bez auta a čísla dielu uložená');
-- disky bez auta
insert into public.listings (seller_id, name, category_id, subcategory_id, price, city, description, warranty, condition, specs)
select 'e1111111-0000-0000-0000-0000000000e1', 'Disky 16 5x112', 'kol', s.id, 200, 'Nitra', 'Hliníkové disky bez poškodenia, sada 4 ks.', 'Bez záruky', 'Dobrý',
       '{"pcd":"5x112","rd":"16","mat":"Hliník"}'
from public.subcategories s where s.category_id = 'kol' and s.name = 'Disky hliníkové';
-- prilba na motorky
insert into public.listings (seller_id, name, category_id, price, city, description, warranty, condition, vtype)
values ('e1111111-0000-0000-0000-0000000000e1', 'Prilba Shoei M', 'mjz', 150, 'Nitra', 'Prilba veľkosť M, bez pádu, s plexi.', 'Bez záruky', 'Veľmi dobrý', 'motorky');
-- bežný diel bez čísla dielu neprejde
do $$ begin
  begin
    insert into public.listings (seller_id, name, brand_id, model_id, year, category_id, oem, price, city, description, warranty, condition)
    select 'e1111111-0000-0000-0000-0000000000e1', 'Svetlo s krátkym číslom', b.id, m.id, 2015, 'sv', '12', 50, 'Nitra', 'Predné svetlo bez poškodenia, funkčné.', 'Bez záruky', 'Dobrý'
    from public.brands b join public.models m on m.brand_id = b.id where b.name = 'Škoda' order by m.id limit 1;
    raise exception 'ZLYHAL: diel bez čísla prešiel';
  exception when check_violation then raise notice 'OK  22: bežný diel bez čísla dielu odmietnutý'; end;
end $$;
do $$ begin
  begin
    insert into public.listings (seller_id, name, category_id, oem, price, city, description, warranty, condition)
    values ('e1111111-0000-0000-0000-0000000000e1', 'Svetlo bez auta', 'sv', '1Z0941015', 50, 'Nitra', 'Predné svetlo bez poškodenia, funkčné.', 'Bez záruky', 'Dobrý');
    raise exception 'ZLYHAL: diel bez auta prešiel';
  exception when check_violation then raise notice 'OK  22: bežný diel bez auta odmietnutý'; end;
end $$;
reset role; set role anon;
select pg_temp.ok((public.search_listings('{"cat":"kol","wtype":"pneu","seller":"e1111111-0000-0000-0000-0000000000e1"}') ->> 'total')::int = 1, '22: len pneumatiky');
select pg_temp.ok((public.search_listings('{"cat":"kol","wtype":"disk","seller":"e1111111-0000-0000-0000-0000000000e1"}') ->> 'total')::int = 1, '22: len disky');
select pg_temp.ok((public.search_listings('{"cat":"kol","wtype":"pneu","specs":{"tw":"205","tp":"55","rd":"16"}}') ->> 'total')::int = 1, '22: rozmer 205/55 R16');
select pg_temp.ok((public.search_listings('{"vtype":"osobne","cat":"kol","seller":"e1111111-0000-0000-0000-0000000000e1"}') ->> 'total')::int = 2, '22: pneumatiky bez druhu pasujú aj pri osobných');
select pg_temp.ok((public.search_listings('{"vtype":"motorky","cat":"mjz"}') ->> 'total')::int = 1, '22: prilba pri motorkách');
select pg_temp.ok((public.search_listings('{"vtype":"osobne","cat":"mjz"}') ->> 'total')::int = 0, '22: prilba nie pri osobných');
reset role;
\echo HOTOVO
