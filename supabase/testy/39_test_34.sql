-- Test pre 34: e-maily predajcom o nových dopytoch
\set ON_ERROR_STOP 1
create or replace function pg_temp.ok(cond boolean, msg text) returns void language plpgsql as $$
begin if not coalesce(cond, false) then raise exception 'ZLYHAL: %', msg; end if; raise notice 'OK  %', msg; end $$;
insert into auth.users (id, email, email_confirmed_at) values
  ('a3400000-0000-0000-0000-000000000001', 'skoda34@test.invalid', now()),
  ('a3400000-0000-0000-0000-000000000002', 'bmw34@test.invalid', now()),
  ('a3400000-0000-0000-0000-000000000003', 'vypnute34@test.invalid', now());
insert into public.sellers (id, name, city, seller_type) values
  ('a3400000-0000-0000-0000-000000000001', 'Škodovka 34', 'Žilina', 'Súkromná osoba'),
  ('a3400000-0000-0000-0000-000000000002', 'Bavorák 34', 'Nitra', 'Súkromná osoba'),
  ('a3400000-0000-0000-0000-000000000003', 'Vypnuté 34', 'Košice', 'Súkromná osoba');
insert into public.seller_private (seller_id, notify_requests) values ('a3400000-0000-0000-0000-000000000003', false);
insert into public.listings (seller_id, name, category_id, brand_id, price, city, description, warranty, condition, vtype)
select s, 'Doplnok 34', 'ine', (select id from public.brands where name = b), 20, 'Žilina', 'Univerzálny diel na test e-mailov o dopytoch.', 'Bez záruky', 'Dobrý', 'osobne'
from (values ('a3400000-0000-0000-0000-000000000001'::uuid, 'Škoda'), ('a3400000-0000-0000-0000-000000000002'::uuid, 'BMW'), ('a3400000-0000-0000-0000-000000000003'::uuid, 'Škoda')) v(s, b);
insert into public.part_requests (brand_id, part_name, contact_name, contact) values ((select id from public.brands where name = 'Škoda'), 'Predné svetlo test 34', 'Jano', 'jano@test.invalid');

select pg_temp.ok((select count(*) from public.request_outbox(500) o where o.part_name = 'Predné svetlo test 34') = 1, '34: dopyt na Škodu ide len predajcovi Škody (nie BMW, nie s vypnutým upozornením)');
select pg_temp.ok((select o.seller_id from public.request_outbox(500) o where o.part_name = 'Predné svetlo test 34') = 'a3400000-0000-0000-0000-000000000001', '34: správny predajca');
select public.request_mark((select id from public.part_requests where part_name = 'Predné svetlo test 34'), 'a3400000-0000-0000-0000-000000000001', null);
select pg_temp.ok((select count(*) from public.request_outbox(500) o where o.part_name = 'Predné svetlo test 34') = 0, '34: po odoslaní sa už neposiela znova');
set role anon;
select pg_temp.ok(not has_function_privilege('public.request_outbox(int)', 'execute'), '34: návštevník nemôže čítať frontu');
reset role;
set role authenticated;
select pg_temp.ok(not has_table_privilege('public.request_notices', 'select'), '34: predajca nevidí záznamy upozornení');
reset role;
\echo HOTOVO
