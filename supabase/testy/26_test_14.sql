-- Testy pre 14 (vyhlásenie predajcu, IČO a sídlo podnikateľa).
\set ON_ERROR_STOP 1
create or replace function pg_temp.as_user(uid text) returns void language plpgsql as $$
begin
  perform set_config('request.jwt.claims', json_build_object('sub', uid, 'role', 'authenticated', 'aal', 'aal1')::text, false);
  perform set_config('request.jwt.claim.sub', uid, false);
end $$;
create or replace function pg_temp.ok(cond boolean, msg text) returns void language plpgsql as $$
begin if not coalesce(cond, false) then raise exception 'ZLYHAL: %', msg; end if; raise notice 'OK  %', msg; end $$;
create or replace function pg_temp.add(sid uuid, nm text) returns void language sql as $$
  insert into public.listings (seller_id,name,brand_id,model_id,year,category_id,oem,price,city,description,warranty,condition)
  select sid, nm, b.id, m.id, 2018, 'el', '04L903023', 150, 'Senica', 'Diel v poriadku, popis má aspoň dvadsať znakov.',
         case when (select seller_type from public.sellers where id = sid) = 'Firma' then '12 mesiacov' else 'Bez záruky' end, 'Dobrý'
  from public.brands b join public.models m on m.brand_id = b.id where b.name = 'Škoda' limit 1;
$$;

insert into auth.users (id, email) values ('c1111111-0000-0000-0000-0000000000c1','firma14@t.sk'),('c2222222-0000-0000-0000-0000000000c2','osoba14@t.sk') on conflict do nothing;

select pg_temp.as_user('c1111111-0000-0000-0000-0000000000c1'); set role authenticated;
insert into public.sellers (id, name, city, seller_type) values ('c1111111-0000-0000-0000-0000000000c1', 'Firma 14 s.r.o.', 'Senica', 'Firma');
select pg_temp.ok((select type_declared_at is not null from public.sellers where id = 'c1111111-0000-0000-0000-0000000000c1'), 'registrácia: čas vyhlásenia zapísaný');
do $$ begin
  begin perform pg_temp.add('c1111111-0000-0000-0000-0000000000c1', 'Bez IČO'); raise exception 'x';
  exception when others then perform pg_temp.ok(sqlerrm like 'Ako podnikateľ doplňte%', 'podnikateľ bez IČO a sídla nezverejní inzerát'); end;
end $$;
do $$ begin
  begin update public.sellers set ico = '123' where id = 'c1111111-0000-0000-0000-0000000000c1'; raise exception 'x';
  exception when check_violation then perform pg_temp.ok(true, 'neplatné IČO odmietnuté'); end;
end $$;
update public.sellers set ico = '12 345 678', address = 'Hlavná 1, 905 01 Senica' where id = 'c1111111-0000-0000-0000-0000000000c1';
select pg_temp.ok((select ico from public.sellers where id = 'c1111111-0000-0000-0000-0000000000c1') = '12345678', 'IČO sa uloží bez medzier');
select pg_temp.add('c1111111-0000-0000-0000-0000000000c1', 'S IČO');
select pg_temp.ok(exists (select 1 from public.listings where name = 'S IČO' and status = 'active'), 'podnikateľ s IČO a sídlom zverejní inzerát');
reset role;

select pg_temp.as_user('c2222222-0000-0000-0000-0000000000c2'); set role authenticated;
insert into public.sellers (id, name, city, seller_type, ico, address) values ('c2222222-0000-0000-0000-0000000000c2', 'Jozef', 'Senica', 'Súkromná osoba', '87654321', 'Domov 5, Senica');
select pg_temp.ok((select ico is null and address is null from public.sellers where id = 'c2222222-0000-0000-0000-0000000000c2'), 'súkromná osoba: IČO ani adresa sa neukladajú');
select pg_temp.add('c2222222-0000-0000-0000-0000000000c2', 'Osoba diel');
select pg_temp.ok(exists (select 1 from public.listings where name = 'Osoba diel'), 'súkromná osoba zverejní inzerát bez IČO');
reset role;

-- verejnosť vidí údaje obchodníka
select set_config('request.jwt.claims', '{"role":"anon"}', false); set role anon;
select pg_temp.ok((select ico = '12345678' and address like 'Hlavná%' from public.sellers where id = 'c1111111-0000-0000-0000-0000000000c1'), 'verejnosť vidí IČO a sídlo podnikateľa');
do $$ declare n int; begin
  begin select count(*) into n from public.seller_private; exception when insufficient_privilege then n := 0; end;
  perform pg_temp.ok(n = 0, 'súkromné údaje (telefón) verejnosť nevidí');
end $$;
reset role;

-- zmena typu zapíše nový čas vyhlásenia
update public.sellers set type_declared_at = now() - interval '1 day' where id = 'c2222222-0000-0000-0000-0000000000c2';
update public.sellers set seller_type = 'Firma', ico = '11223344', address = 'Nová 2, Senica' where id = 'c2222222-0000-0000-0000-0000000000c2';
select pg_temp.ok((select type_declared_at > now() - interval '1 minute' from public.sellers where id = 'c2222222-0000-0000-0000-0000000000c2'), 'zmena na podnikateľa: nové vyhlásenie s časom');
\echo HOTOVO
