-- Testy pre 18 (kategórie, druhy vozidiel, parametre kolies) a 19 (havarované vozidlá).
\set ON_ERROR_STOP 1
create or replace function pg_temp.ok(cond boolean, msg text) returns void language plpgsql as $$
begin if not coalesce(cond, false) then raise exception 'ZLYHAL: %', msg; end if; raise notice 'OK  %', msg; end $$;
create or replace function pg_temp.denied(q text, msg text) returns void language plpgsql as $$
begin
  begin execute q; raise exception 'ZLYHAL (prešlo): %', msg;
  exception when insufficient_privilege then raise notice 'OK  %', msg;
            when others then if sqlerrm like 'ZLYHAL%' then raise; end if; raise notice 'OK  % (%)', msg, sqlerrm; end;
end $$;
create or replace function pg_temp.as_user(u uuid) returns void language plpgsql as $$
begin perform set_config('request.jwt.claims', json_build_object('sub', u, 'role', 'authenticated')::text, false); end $$;

insert into auth.users (id, email) values ('d1111111-0000-0000-0000-0000000000d1', 'vrak1@test.invalid'), ('d2222222-0000-0000-0000-0000000000d2', 'vrak2@test.invalid');
select pg_temp.as_user('d1111111-0000-0000-0000-0000000000d1'); set role authenticated;
insert into public.sellers (id, name, city, seller_type) values ('d1111111-0000-0000-0000-0000000000d1', 'Ján Vrak', 'Senica', 'Súkromná osoba');

-- 18: kategórie a druhy
select pg_temp.ok((select count(*) from public.categories) >= 21, '18: aspoň 21 kategórií');
select pg_temp.ok((select name from public.categories where id = 'kol') = 'Pneumatiky a disky', '18: kategória Pneumatiky a disky');
select pg_temp.ok((select vtypes from public.categories where id = 'mrm') = '{motorky}', '18: kapotáž len pre motorky');
select pg_temp.ok((select count(*) from public.categories) >= 33, '21: aspoň 33 kategórií');
select pg_temp.ok((select vtypes is null and sort = 99 from public.categories where id = 'ine'), '21: kategória Iné pre všetky vozidlá, posledná');
select pg_temp.ok((select vtypes from public.categories where id = 'nvz') = '{nakladne,autobusy}', '21: vzduchový systém pre nákladné a autobusy');
select pg_temp.ok((select count(*) from public.models where vehicle_type = 'motorky') > 0 or true, '18: stĺpec vehicle_type čitateľný');

-- diel s parametrami kolies
insert into public.listings (seller_id, name, brand_id, model_id, year, category_id, subcategory_id, oem, price, city, description, warranty, condition, specs)
select 'd1111111-0000-0000-0000-0000000000d1', 'Disky 17 Škoda', b.id, m.id, 2018, 'kol', (select id from public.subcategories where category_id = 'kol' and name = 'Disky hliníkové'), '5E0601025', 300, 'Senica',
       'Sada 4 diskov bez poškodenia, len bežné stopy.', 'Bez záruky', 'Dobrý', '{"pcd":"5x112","rd":"17","rw":"7","et":"49","pcs":"4","mat":"Hliník"}'
from public.brands b join public.models m on m.brand_id = b.id where b.name = 'Škoda' order by m.id limit 1;
select pg_temp.ok(true, '18: diel s parametrami kolies uložený');
do $$ begin
  begin
    insert into public.listings (seller_id, name, brand_id, model_id, year, category_id, subcategory_id, oem, price, city, description, warranty, condition, specs)
    select 'd1111111-0000-0000-0000-0000000000d1', 'Zlé disky', b.id, m.id, 2018, 'kol', (select id from public.subcategories where category_id = 'kol' and name = 'Disky hliníkové'), '5E0601026', 300, 'Senica', 'Popis má aspoň dvadsať znakov naozaj.', 'Bez záruky', 'Dobrý', '{"pcd":"112"}'
    from public.brands b join public.models m on m.brand_id = b.id where b.name = 'Škoda' order by m.id limit 1;
    raise exception 'ZLYHAL: zlá rozteč prešla';
  exception when check_violation then raise notice 'OK  18: zlá rozteč odmietnutá'; end;
end $$;
reset role; set role anon;
select pg_temp.ok((public.search_listings('{"specs":{"pcd":"5x112","rd":"17"}}') ->> 'total')::int = 1, '18: hľadanie podľa rozteče a priemeru');
select pg_temp.ok((public.search_listings('{"specs":{"pcd":"5x100"}}') ->> 'total')::int = 0, '18: iná rozteč nenájde');
select pg_temp.ok((public.search_listings('{"vtype":"motorky","seller":"d1111111-0000-0000-0000-0000000000d1"}') ->> 'total')::int = 0, '18: filter motorky nenájde diel z osobného auta');
select pg_temp.ok((public.search_listings('{"vtype":"osobne","seller":"d1111111-0000-0000-0000-0000000000d1"}') ->> 'total')::int = 1, '18: filter osobné nájde diel');
select pg_temp.ok((public.search_listings('{"seller":"d1111111-0000-0000-0000-0000000000d1"}') -> 'items' -> 0 -> 'specs' ->> 'pcd') = '5x112', '18: parametre vo výsledku');
reset role;

-- 19: havarované vozidlá
select pg_temp.as_user('d1111111-0000-0000-0000-0000000000d1'); set role authenticated;
insert into public.car_listings (seller_id, brand_id, model_id, year, km, fuel, condition, damage, docs, price, city, description)
select 'd1111111-0000-0000-0000-0000000000d1', b.id, m.id, 2014, 210000, 'Nafta', 'Havarované – nepojazdné', '{Predok,Motor}', 'S dokladmi – odhlásené', 1500, 'Senica',
       'Čelný náraz, airbagy vystrelené, zadná časť v poriadku.'
from public.brands b join public.models m on m.brand_id = b.id where b.name = 'Škoda' order by m.id limit 1;
insert into public.car_contacts (car_id, phone, vin) select id, '0901 234 567', 'TMBJJ7NE8J0123456' from public.car_listings where city = 'Senica';
select pg_temp.ok((select vehicle_type from public.car_listings where city = 'Senica') = 'osobne', '19: druh vozidla z modelu');
do $$ begin
  begin
    insert into public.car_listings (seller_id, brand_id, year, condition, docs, price, city, description)
    select 'd1111111-0000-0000-0000-0000000000d1', id, 2014, 'Pojazdné', 'S dokladmi – prihlásené', 1500, 'Senica', 'Bežné jazdené auto bez poškodenia.' from public.brands where name = 'Škoda';
    raise exception 'ZLYHAL: nepovolený stav prešiel';
  exception when check_violation then raise notice 'OK  19: bežné jazdené auto (zlý stav) odmietnuté'; end;
end $$;
do $$ begin
  begin
    insert into public.car_listings (seller_id, brand_id, model_id, year, condition, docs, price, city, description)
    select 'd1111111-0000-0000-0000-0000000000d1', (select id from public.brands where name = 'BMW'), m.id, 2014, 'Na diely', 'S dokladmi – prihlásené', 1500, 'Senica', 'Model z inej značky nesmie prejsť.'
    from public.models m join public.brands b on b.id = m.brand_id where b.name = 'Škoda' limit 1;
    raise exception 'ZLYHAL: model inej značky prešiel';
  exception when others then if sqlerrm like 'ZLYHAL%' then raise; end if; raise notice 'OK  19: model inej značky odmietnutý'; end;
end $$;
reset role;
select max(id) as car from public.car_listings \gset
select set_config('request.jwt.claims', '{"role":"anon"}', false);
set role anon;
select pg_temp.denied('select * from public.car_listings', '19: anonym nečíta tabuľku vozidiel priamo');
select pg_temp.denied('select vin from public.car_contacts', '19: anonym nevidí VIN ani telefón');
select pg_temp.ok((public.search_cars('{}') ->> 'total')::int = 1, '19: hľadanie vozidiel');
select pg_temp.ok((public.search_cars('{"cond":"Na diely"}') ->> 'total')::int = 0, '19: filter stavu');
select pg_temp.ok((public.search_cars('{"q":"airbagy"}') ->> 'total')::int = 1, '19: hľadanie v popise');
select pg_temp.ok(not (public.search_cars('{}') -> 'items' -> 0) ? 'vin', '19: vo výsledku nie je VIN');
select pg_temp.ok(public.get_car(:car) ->> 'condition' = 'Havarované – nepojazdné', '19: detail vozidla');
select pg_temp.ok(public.reveal_car_phone(:car) = '0901 234 567', '19: telefón na klik');
select pg_temp.ok(public.send_car_message(:car, 'Peter', 'peter@test.invalid', 'Mám záujem o celé auto.'), '19: správa k vozidlu');
select pg_temp.ok(public.report_car(:car, 'Podozrenie na kradnuté vozidlo', 'test', null), '19: nahlásenie vozidla (kradnuté)');
reset role;
select pg_temp.ok((select count(*) from public.messages where car_id is not null) = 1, '19: správa uložená s car_id');
select pg_temp.ok((select calls from public.car_listings where city = 'Senica') = 1, '19: odkrytie telefónu sa započítalo');
-- iný predajca nesmie meniť cudzie vozidlo
select pg_temp.as_user('d2222222-0000-0000-0000-0000000000d2'); set role authenticated;
update public.car_listings set price = 1 where city = 'Senica';
reset role;
select pg_temp.ok((select price from public.car_listings where city = 'Senica') = 1500, '19: cudzie vozidlo sa nedá zmeniť');
-- predané -> get_car vráti len gone
update public.car_listings set status = 'sold' where city = 'Senica';
select pg_temp.ok((select sold_at is not null from public.car_listings where city = 'Senica'), '19: pri predaji sa zapíše čas');
set role anon;
select pg_temp.ok((public.get_car(:car) ->> 'gone')::boolean, '19: predané vozidlo len ako „Predané“');
reset role;
\echo HOTOVO
