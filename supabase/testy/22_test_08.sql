-- Testy pre 08 (darcovské autá, dopyty, seo_counts) a 09 (katalóg). Na kópii databázy s napodobeninou Supabase.
\set ON_ERROR_STOP 1
create or replace function pg_temp.as_user(uid text, ip text) returns void language plpgsql as $$
begin
  perform set_config('request.jwt.claims', case when uid is null then '{"role":"anon"}' else json_build_object('sub', uid, 'role', 'authenticated')::text end, false);
  perform set_config('request.jwt.claim.sub', coalesce(uid, ''), false);
  perform set_config('request.headers', json_build_object('x-forwarded-for', ip)::text, false);
end $$;
create or replace function pg_temp.ok(cond boolean, msg text) returns void language plpgsql as $$
begin if not coalesce(cond, false) then raise exception 'ZLYHAL: %', msg; end if; raise notice 'OK  %', msg; end $$;

insert into auth.users (id, email) values ('d1111111-0000-0000-0000-000000000001','d1@t.sk'),('d2222222-0000-0000-0000-000000000002','d2@t.sk') on conflict do nothing;
insert into public.sellers (id, name, seller_type, city) values ('d1111111-0000-0000-0000-000000000001','Vrak D1','Firma','Martin'),('d2222222-0000-0000-0000-000000000002','Vrak D2','Firma','Trnava');

-- ===== darcovské auto =====
select pg_temp.as_user('d1111111-0000-0000-0000-000000000001', '7.7.7.1'); set role authenticated;
insert into public.donor_cars (seller_id, brand_id, model_id, year, km, gearbox, vin)
select 'd1111111-0000-0000-0000-000000000001', b.id, m.id, 2016, 184000, 'Manuálna', 'TMBJJ7NE0G0123456' from brands b join models m on m.brand_id=b.id where b.name='Škoda' and m.name='Octavia III';
insert into public.listings (seller_id,name,brand_id,model_id,year,category_id,oem,price,city,description,donor_id)
select 'd1111111-0000-0000-0000-000000000001','Kapota z Octavie',brand_id,model_id,2016,'kar','5E0823031',90,'Martin','Kapota bez hrdze, drobné škrabance.',id from donor_cars;
insert into public.listings (seller_id,name,brand_id,model_id,year,category_id,oem,price,city,description,donor_id)
select 'd1111111-0000-0000-0000-000000000001','Alternátor z Octavie',brand_id,model_id,2016,'el','04L903023',70,'Martin','Alternátor nabíja, odskúšaný na aute.',id from donor_cars;
reset role;
select pg_temp.ok((public.search_listings(jsonb_build_object('donor', (select id from donor_cars limit 1))) ->> 'total')::int = 2, 'hľadanie dielov z jedného auta');
select pg_temp.ok((public.search_listings('{"q":"kapota"}') -> 'items' -> 0 ->> 'donor_id') is not null, 'výsledok hľadania obsahuje donor_id');
select set_config('rz.donor', (select id::text from donor_cars limit 1), false);
select pg_temp.as_user('d2222222-0000-0000-0000-000000000002', '7.7.7.2'); set role authenticated;
select pg_temp.ok((select count(*) from donor_cars) = 0, 'cudzie darcovské auto (aj VIN) predajca nevidí');
do $$ begin
  begin
    insert into public.listings (seller_id,name,brand_id,model_id,year,category_id,oem,price,city,description,donor_id)
    select 'd2222222-0000-0000-0000-000000000002','Cudzí diel',1,(select id from models where brand_id=1 limit 1),2016,'kar','12345678',10,'Trnava','Popis dielu dlhší ako dvadsať znakov.',current_setting('rz.donor')::bigint;
    raise exception 'x';
  exception when others then perform pg_temp.ok(sqlerrm like 'Darcovské auto nepatrí vám%', 'diel nejde priradiť k cudziemu autu'); end;
end $$;
reset role;
select pg_temp.as_user(null, '7.7.7.9'); set role anon;
do $$ begin
  begin perform * from public.donor_cars; raise exception 'x';
  exception when insufficient_privilege then perform pg_temp.ok(true, 'verejnosť nevidí darcovské autá ani VIN'); end;
end $$;

-- ===== dopyt na diel =====
select pg_temp.ok(public.create_part_request(jsonb_build_object('brand', (select id from brands where name='Škoda'), 'model', (select id from models where name='Octavia III'),
  'year', 2016, 'part', 'Ľavé predné svetlo LED', 'name', 'Jano', 'contact', '0911 000 111', 'city', 'Žilina', 'vin', 'tmbjj7ne0g0123456')) is not null, 'kupujúci bez účtu zadá dopyt');
select public.create_part_request(jsonb_build_object('brand', 1, 'part', 'Zrkadlo', 'name', 'Jano', 'contact', '0911 000 111'));
select public.create_part_request(jsonb_build_object('brand', 1, 'part', 'Kapota', 'name', 'Jano', 'contact', '0911 000 111'));
do $$ begin
  begin perform public.create_part_request(jsonb_build_object('brand', 1, 'part', 'Dvere', 'name', 'Jano', 'contact', '0911 000 111')); raise exception 'x';
  exception when others then perform pg_temp.ok(sqlerrm like 'Príliš veľa dopytov%', 'limit 3 dopyty za hodinu z jedného pripojenia'); end;
  begin perform * from public.part_requests; raise exception 'x';
  exception when insufficient_privilege then perform pg_temp.ok(true, 'verejnosť nevidí dopyty ani kontakty'); end;
end $$;
reset role;
select pg_temp.ok((select vin from part_requests where part_name like 'Ľavé%') = 'TMBJJ7NE0G0123456', 'VIN v dopyte uložený veľkými písmenami');
select pg_temp.as_user('d1111111-0000-0000-0000-000000000001', '7.7.7.1'); set role authenticated;
select pg_temp.ok((select count(*) from part_requests) = 3, 'prihlásený predajca vidí otvorené dopyty');
insert into public.part_offers (request_id, seller_id, price, phone, note, listing_id)
select id, 'd1111111-0000-0000-0000-000000000001', 110, '0905 222 333', 'Mám LED, 12 mesiacov záruka', (select id from listings where name='Kapota z Octavie') from part_requests where part_name like 'Ľavé%';
do $$ begin
  begin insert into public.part_offers (request_id, seller_id, price, phone) select id, 'd1111111-0000-0000-0000-000000000001', 100, '0905 222 333' from part_requests where part_name like 'Ľavé%'; raise exception 'x';
  exception when unique_violation then perform pg_temp.ok(true, 'druhá ponuka na ten istý dopyt nejde'); end;
  begin insert into public.part_offers (request_id, seller_id, price, phone) select id, 'd2222222-0000-0000-0000-000000000002', 100, '0905 222 333' from part_requests limit 1; raise exception 'x';
  exception when insufficient_privilege then perform pg_temp.ok(true, 'ponuka za iného predajcu nejde'); end;
end $$;
reset role;
select set_config('rz.tok', (select token::text from part_requests where part_name like 'Ľavé%'), false);
select pg_temp.as_user(null, '7.7.7.9'); set role anon;
select pg_temp.ok(jsonb_array_length(public.get_part_request(current_setting('rz.tok')::uuid) -> 'offers') = 1
  and (public.get_part_request(current_setting('rz.tok')::uuid) -> 'offers' -> 0 ->> 'seller') = 'Vrak D1', 'kupujúci vidí ponuku podľa súkromného kódu');
select pg_temp.ok(public.get_part_request(gen_random_uuid()) is null, 'neplatný kód nič nevráti');
select public.close_part_request(current_setting('rz.tok')::uuid);
reset role;
select pg_temp.ok((select status from part_requests where part_name like 'Ľavé%') = 'closed', 'kupujúci uzavrie dopyt');
-- zablokovaný predajca nevidí dopyty
update public.sellers set blocked = true where id = 'd2222222-0000-0000-0000-000000000002';
select pg_temp.as_user('d2222222-0000-0000-0000-000000000002', '7.7.7.2'); set role authenticated;
select pg_temp.ok((select count(*) from part_requests) = 0, 'zablokovaný predajca nevidí dopyty');
reset role;
-- mazanie po 60 dňoch
update part_requests set created_at = now() - interval '61 days' where part_name = 'Zrkadlo';
select public.purge_old_data();
select pg_temp.ok(not exists (select 1 from part_requests where part_name = 'Zrkadlo'), 'dopyt starší ako 60 dní zmazaný');
-- seo_counts a katalóg 09
select pg_temp.ok((select sum(n) from public.seo_counts()) = (select count(*) from listings where status = 'active'), 'seo_counts sedí s počtom aktívnych');
select pg_temp.ok((select year_to from models where name = 'Superb III') = 2023 and exists (select 1 from models where name = 'Kodiaq II'), 'oprava katalógu 09');
\echo HOTOVO
