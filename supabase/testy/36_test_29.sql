-- Testy pre 29 + 30: veterány ako druh vozidla, katalóg, inzerát bez čísla dielu, hľadanie podľa druhu.
\set ON_ERROR_STOP 1
create or replace function pg_temp.ok(cond boolean, msg text) returns void language plpgsql as $$
begin if not coalesce(cond, false) then raise exception 'ZLYHAL: %', msg; end if; raise notice 'OK  %', msg; end $$;
create or replace function pg_temp.as_user(u uuid) returns void language plpgsql as $$
begin perform set_config('request.jwt.claims', json_build_object('sub', u, 'role', 'authenticated')::text, false); end $$;
create or replace function pg_temp.mid(b text, m text) returns int language sql as $$
  select m2.id from public.models m2 join public.brands b2 on b2.id = m2.brand_id where b2.name = b and m2.name = m $$;
create or replace function pg_temp.has(vt text, nm text) returns boolean language sql as $$
  select exists (select 1 from jsonb_array_elements(public.search_listings(jsonb_build_object('vtype', vt, 'seller', 'a2911111-0000-0000-0000-0000000000a1')) -> 'items') i where i ->> 'name' = nm) $$;
select pg_temp.ok((select vehicle_type from public.models where id = pg_temp.mid('Škoda', '1000 MB')) = 'veterany', '29: Škoda 1000 MB je veterán');
select pg_temp.ok((select vehicle_type from public.models where id = pg_temp.mid('Škoda', 'Favorit')) = 'veterany', '29: Favorit presunutý medzi veterány');
select pg_temp.ok((select vehicle_type from public.models where id = pg_temp.mid('Škoda', 'Octavia I')) = 'osobne', '29: Octavia I ostala v osobných autách');
select pg_temp.ok((select count(*) from public.models where vehicle_type = 'veterany') >= 300, '29: katalóg má aspoň 300 modelov veteránov');
select pg_temp.ok(pg_temp.mid('Škoda', 'Iný model (veterán)') is not null and pg_temp.mid('Iná značka', 'Iný model (veterán)') is not null, '29: Iný model (veterán)');
select pg_temp.ok((select count(*) from public.engines where model_id = pg_temp.mid('Škoda', '105 / 120 / 125 (742)')) = 3, '29: motorizácie Škoda 120');
select pg_temp.ok((select not ('veterany' = any(vtypes)) from public.categories where id = 'ev'), '29: elektropohon nie pre veterány');
select pg_temp.ok((select 'veterany' = any(vtypes) from public.categories where id = 'int'), '29: interiér aj pre veterány');
select pg_temp.ok((select universal and vtypes = '{veterany}' from public.categories where id = 'vet'), '29: kategória dobové doplnky');
insert into auth.users (id, email) values ('a2911111-0000-0000-0000-0000000000a1', 'vet29@test.invalid');
select pg_temp.as_user('a2911111-0000-0000-0000-0000000000a1'); set role authenticated;
insert into public.sellers (id, name, city, seller_type) values ('a2911111-0000-0000-0000-0000000000a1', 'Veterán 29', 'Trnava', 'Súkromná osoba');
insert into public.listings (seller_id, name, category_id, brand_id, model_id, year, price, city, description, warranty, condition)
values ('a2911111-0000-0000-0000-0000000000a1', 'Predná kapota 1000 MB', 'kar', (select id from public.brands where name = 'Škoda'), pg_temp.mid('Škoda', '1000 MB'), 1966, 120, 'Trnava', 'Pôvodná kapota bez hrdze, pôvodný lak.', 'Bez záruky', 'Dobrý'),
       ('a2911111-0000-0000-0000-0000000000a1', 'Blatník Popular', 'kar', (select id from public.brands where name = 'Škoda'), pg_temp.mid('Škoda', 'Popular'), 1937, 300, 'Trnava', 'Pôvodný ľavý predný blatník Popular.', 'Bez záruky', 'Na opravu'),
       ('a2911111-0000-0000-0000-0000000000a1', 'Dielenská príručka Škoda 120', 'vet', null, null, null, 15, 'Trnava', 'Pôvodná dielenská príručka z roku 1980.', 'Bez záruky', 'Dobrý');
update public.listings set vtype = 'veterany' where name = 'Dielenská príručka Škoda 120';
reset role;
select pg_temp.ok((select vtype from public.listings where name = 'Predná kapota 1000 MB') = 'veterany', '29: inzerát dostal druh veterany z modelu');
set role anon;
select pg_temp.ok(pg_temp.has('veterany', 'Predná kapota 1000 MB'), '29: veterán sa nájde pri veteránoch');
select pg_temp.ok(pg_temp.has('veterany', 'Blatník Popular'), '29: ročník 1937 povolený');
select pg_temp.ok(not pg_temp.has('osobne', 'Predná kapota 1000 MB'), '29: veterán sa nenájde pri osobných autách');
select pg_temp.ok(pg_temp.has('veterany', 'Dielenská príručka Škoda 120'), '29: dobový doplnok bez auta pri veteránoch');
select pg_temp.ok(pg_temp.has(null, 'Predná kapota 1000 MB'), '29: veterán aj pri všetkých vozidlách');
reset role;
do $$ begin
  begin insert into public.models (brand_id, name, year_from, vehicle_type) values ((select id from public.brands where name = 'Škoda'), 'Test zlý druh', 1960, 'lietadla');
    raise exception 'ZLYHAL: zlý druh vozidla prešiel';
  exception when check_violation then raise notice 'OK  29: neznámy druh vozidla odmietnutý'; end;
end $$;
\echo HOTOVO
