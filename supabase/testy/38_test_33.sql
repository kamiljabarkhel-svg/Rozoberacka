-- Test pre 33: cena od – do
\set ON_ERROR_STOP 1
create or replace function pg_temp.ok(cond boolean, msg text) returns void language plpgsql as $$
begin if not coalesce(cond, false) then raise exception 'ZLYHAL: %', msg; end if; raise notice 'OK  %', msg; end $$;
insert into auth.users (id, email) values ('a3300000-0000-0000-0000-000000000001', 'cena33@test.invalid');
insert into public.sellers (id, name, city, seller_type) values ('a3300000-0000-0000-0000-000000000001', 'Cena 33', 'Žilina', 'Súkromná osoba');
insert into public.listings (seller_id, name, category_id, price, city, description, warranty, condition, vtype)
select 'a3300000-0000-0000-0000-000000000001', 'Cenový test ' || p, 'ine', p, 'Žilina', 'Univerzálny diel na test ceny od – do.', 'Bez záruky', 'Dobrý', 'osobne'
from unnest(array[10, 50, 120]) p;
set role anon;
select pg_temp.ok((public.search_listings('{"seller":"a3300000-0000-0000-0000-000000000001","min":40}') ->> 'total')::int = 2, '33: cena od 40 → 2 diely');
select pg_temp.ok((public.search_listings('{"seller":"a3300000-0000-0000-0000-000000000001","min":40,"max":100}') ->> 'total')::int = 1, '33: cena 40 – 100 → 1 diel');
select pg_temp.ok((public.search_listings('{"seller":"a3300000-0000-0000-0000-000000000001"}') ->> 'total')::int = 3, '33: bez ceny → 3 diely');
reset role;
\echo HOTOVO
