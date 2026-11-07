-- Testy pre 13 (stavy Nový a Repasovaný, záruka pri novom diele).
\set ON_ERROR_STOP 1
create or replace function pg_temp.as_user(uid text) returns void language plpgsql as $$
begin
  perform set_config('request.jwt.claims', json_build_object('sub', uid, 'role', 'authenticated', 'aal', 'aal1')::text, false);
  perform set_config('request.jwt.claim.sub', uid, false);
end $$;
create or replace function pg_temp.ok(cond boolean, msg text) returns void language plpgsql as $$
begin if not coalesce(cond, false) then raise exception 'ZLYHAL: %', msg; end if; raise notice 'OK  %', msg; end $$;
create or replace function pg_temp.add(sid uuid, nm text, cnd text, war text) returns void language sql as $$
  insert into public.listings (seller_id,name,brand_id,model_id,year,category_id,oem,price,city,description,warranty,condition)
  select sid, nm, b.id, m.id, 2018, 'el', '04L903023', 150, 'Senica', 'Diel v poriadku, popis má aspoň dvadsať znakov.', war, cnd
  from public.brands b join public.models m on m.brand_id = b.id where b.name = 'Škoda' limit 1;
$$;

insert into auth.users (id, email) values ('b1111111-0000-0000-0000-0000000000b1','firma13@t.sk'),('b2222222-0000-0000-0000-0000000000b2','osoba13@t.sk') on conflict do nothing;
insert into public.sellers (id, name, city, seller_type) values
  ('b1111111-0000-0000-0000-0000000000b1','Firma 13','Senica','Firma'),
  ('b2222222-0000-0000-0000-0000000000b2','Osoba 13','Senica','Súkromná osoba') on conflict do nothing;
-- od 14: podnikateľ musí mať IČO a sídlo, aby mohol zverejniť inzerát
update public.sellers set ico = '12345678', address = 'Testovacia 1, 900 01 Mesto' where seller_type = 'Firma' and ico is null;

select pg_temp.as_user('b1111111-0000-0000-0000-0000000000b1'); set role authenticated;
do $$ begin
  begin perform pg_temp.add('b1111111-0000-0000-0000-0000000000b1', 'Alternátor nový 12m', 'Nový', '12 mesiacov'); raise exception 'x';
  exception when others then perform pg_temp.ok(sqlerrm like 'Firma musí pri novom diele%', 'firma: nový diel s 12 mesiacmi odmietnutý'); end;
end $$;
select pg_temp.add('b1111111-0000-0000-0000-0000000000b1', 'Alternátor nový 24m', 'Nový', '24 mesiacov');
select pg_temp.ok(exists (select 1 from public.listings where name = 'Alternátor nový 24m' and condition = 'Nový'), 'firma: nový diel s 24 mesiacmi uložený');
select pg_temp.add('b1111111-0000-0000-0000-0000000000b1', 'Alternátor repas', 'Repasovaný', '12 mesiacov');
select pg_temp.ok(exists (select 1 from public.listings where name = 'Alternátor repas' and returns_14d), 'firma: repasovaný s 12 mesiacmi uložený, vrátenie do 14 dní');
do $$ begin
  begin perform pg_temp.add('b1111111-0000-0000-0000-0000000000b1', 'Zlý stav', 'Ako nový', '12 mesiacov'); raise exception 'x';
  exception when check_violation then perform pg_temp.ok(true, 'neznámy stav odmietnutý'); end;
end $$;
do $$ begin
  begin update public.listings set warranty = '12 mesiacov' where name = 'Alternátor nový 24m'; raise exception 'x';
  exception when others then perform pg_temp.ok(sqlerrm like 'Firma musí pri novom diele%', 'firma: zníženie záruky nového dielu odmietnuté'); end;
end $$;
reset role;

select pg_temp.as_user('b2222222-0000-0000-0000-0000000000b2'); set role authenticated;
select pg_temp.add('b2222222-0000-0000-0000-0000000000b2', 'Turbo nové osoba', 'Nový', 'Bez záruky');
select pg_temp.ok(exists (select 1 from public.listings where name = 'Turbo nové osoba'), 'súkromná osoba: nový diel bez záruky povolený');
reset role;

-- osoba sa zmení na firmu → nový diel dostane 24 mesiacov
update public.sellers set seller_type = 'Firma' where id = 'b2222222-0000-0000-0000-0000000000b2';
select pg_temp.ok((select warranty from public.listings where name = 'Turbo nové osoba') = '24 mesiacov', 'zmena na firmu: nový diel má 24 mesiacov');

-- hľadanie podľa stavu
select pg_temp.ok((public.search_listings(jsonb_build_object('cond', 'Repasovaný', 'limit', 50, 'offset', 0)) ->> 'total')::int >= 1, 'hľadanie: filter Repasovaný nájde diel');
\echo HOTOVO
