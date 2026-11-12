-- Testy pre 28: číslo dielu sa nájde s medzerami aj bez nich (aj spolu s názvom dielu).
\set ON_ERROR_STOP 1
create or replace function pg_temp.ok(cond boolean, msg text) returns void language plpgsql as $$
begin if not coalesce(cond, false) then raise exception 'ZLYHAL: %', msg; end if; raise notice 'OK  %', msg; end $$;
create or replace function pg_temp.as_user(u uuid) returns void language plpgsql as $$
begin perform set_config('request.jwt.claims', json_build_object('sub', u, 'role', 'authenticated')::text, false); end $$;
create or replace function pg_temp.has(q text, nm text) returns boolean language sql as $$
  select exists (select 1 from jsonb_array_elements(public.search_listings(jsonb_build_object('q', q, 'vtype', null, 'seller', 'a2811111-0000-0000-0000-0000000000a1')) -> 'items') i where i ->> 'name' = nm) $$;
insert into auth.users (id, email) values ('a2811111-0000-0000-0000-0000000000a1', 'oem28@test.invalid');
select pg_temp.as_user('a2811111-0000-0000-0000-0000000000a1'); set role authenticated;
insert into public.sellers (id, name, city, seller_type) values ('a2811111-0000-0000-0000-0000000000a1', 'OEM 28', 'Nitra', 'Súkromná osoba');
insert into public.listings (seller_id, name, category_id, oem, price, city, description, warranty, condition)
values ('a2811111-0000-0000-0000-0000000000a1', 'Držiak nárazníka', 'ine', '5E1 941 015', 20, 'Nitra', 'Držiak bez prasklín, odskúšaný.', 'Bez záruky', 'Dobrý'),
       ('a2811111-0000-0000-0000-0000000000a1', 'Cievka zapaľovania', 'ine', '1K0615301AA', 30, 'Nitra', 'Funkčná cievka z rozobratého auta.', 'Bez záruky', 'Dobrý');
reset role; set role anon;
select pg_temp.ok(pg_temp.has('5E1941015', 'Držiak nárazníka'), '28: zapísané s medzerami, hľadané bez');
select pg_temp.ok(pg_temp.has('1K0 615-301 AA', 'Cievka zapaľovania'), '28: zapísané bez medzier, hľadané s medzerami a pomlčkou');
select pg_temp.ok(pg_temp.has('držiak 5E1941015', 'Držiak nárazníka'), '28: názov + číslo bez medzier (predtým chyba)');
select pg_temp.ok(pg_temp.has('cievka 1K0 615 301AA', 'Cievka zapaľovania'), '28: názov + číslo s medzerami');
select pg_temp.ok(not pg_temp.has('5E1941016', 'Držiak nárazníka'), '28: iné číslo sa nenájde');
reset role;
select pg_temp.ok((select search_text like '%5e1941015%' from public.listings where name = 'Držiak nárazníka'), '28: search_text obsahuje číslo bez medzier');
\echo HOTOVO
