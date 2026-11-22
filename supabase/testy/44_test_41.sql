-- Test pre 41: komu ide dopyt (auto inzerátu, „Pasuje aj na“, značky z profilu, všetky značky) a odkaz kupujúcemu e-mailom
\set ON_ERROR_STOP 1
create or replace function pg_temp.ok(cond boolean, msg text) returns void language plpgsql as $$
begin if not coalesce(cond, false) then raise exception 'ZLYHAL: %', msg; end if; raise notice 'OK  %', msg; end $$;
create or replace function pg_temp.to_req(part text) returns setof uuid language sql as $$
  select o.seller_id from public.request_outbox(500) o where o.part_name = part order by 1 $$;
insert into auth.users (id, email, email_confirmed_at) values
  ('a4100000-0000-0000-0000-000000000001', 'vw41@test.invalid', now()),
  ('a4100000-0000-0000-0000-000000000002', 'skodafits41@test.invalid', now()),
  ('a4100000-0000-0000-0000-000000000003', 'profil41@test.invalid', now()),
  ('a4100000-0000-0000-0000-000000000004', 'vsetky41@test.invalid', now()),
  ('a4100000-0000-0000-0000-000000000005', 'bmw41@test.invalid', now());
insert into public.sellers (id, name, city, seller_type)
select ('a4100000-0000-0000-0000-00000000000' || i)::uuid, 'Predajca 41-' || i, 'Žilina', 'Súkromná osoba' from generate_series(1, 5) i;
insert into public.listings (seller_id, name, category_id, brand_id, price, city, description, warranty, condition, vtype)
select s::uuid, 'Doplnok 41', 'ine', (select id from public.brands where name = b), 20, 'Žilina', 'Univerzálny diel na test dopytov 41.', 'Bez záruky', 'Dobrý', 'osobne'
from (values ('a4100000-0000-0000-0000-000000000001', 'Volkswagen'), ('a4100000-0000-0000-0000-000000000002', 'Škoda'),
             ('a4100000-0000-0000-0000-000000000005', 'BMW')) v(s, b);
-- Škodovka má diel, ktorý pasuje aj na VW
insert into public.listing_fits (listing_id, brand_id)
select l.id, (select id from public.brands where name = 'Volkswagen') from public.listings l where l.seller_id = 'a4100000-0000-0000-0000-000000000002';
-- predajca 3: bez inzerátov, v profile si vybral VW; predajca 4: všetky značky
insert into public.seller_private (seller_id, request_brands) values ('a4100000-0000-0000-0000-000000000003', array[(select id from public.brands where name = 'Volkswagen')]);
insert into public.seller_private (seller_id, request_all) values ('a4100000-0000-0000-0000-000000000004', true);

insert into public.part_requests (brand_id, part_name, contact_name, contact) values
  ((select id from public.brands where name = 'Volkswagen'), 'Svetlo VW test 41', 'Jano', 'Jano@Test.invalid'),
  ((select id from public.brands where name = 'BMW'), 'Zrkadlo BMW test 41', 'Fero', '0911 222 333');

select pg_temp.ok(array(select pg_temp.to_req('Svetlo VW test 41')) = array['a4100000-0000-0000-0000-000000000001','a4100000-0000-0000-0000-000000000002',
  'a4100000-0000-0000-0000-000000000003','a4100000-0000-0000-0000-000000000004']::uuid[], '41: VW dopyt – auto VW, pasuje aj na VW, VW v profile, všetky značky (nie BMW)');
select pg_temp.ok(array(select pg_temp.to_req('Zrkadlo BMW test 41')) = array['a4100000-0000-0000-0000-000000000004','a4100000-0000-0000-0000-000000000005']::uuid[], '41: BMW dopyt – predajca BMW a „všetky značky“');
-- pozastavený inzerát sa nepočíta
update public.listings set status = 'paused' where seller_id = 'a4100000-0000-0000-0000-000000000002';
select pg_temp.ok(not public.seller_matches_brand('a4100000-0000-0000-0000-000000000002', (select id from public.brands where name = 'Volkswagen')), '41: pozastavený diel nepočíta');

-- odkaz kupujúcemu: len e-mailový kontakt, raz
select pg_temp.ok((select count(*) from public.request_buyer_outbox(500) o where o.part_name like '%test 41') = 1, '41: odkaz len pri e-mailovom kontakte');
select pg_temp.ok((select to_email from public.request_buyer_outbox(500) o where o.part_name = 'Svetlo VW test 41') = 'jano@test.invalid', '41: e-mail malými písmenami');
select public.request_buyer_mark((select id from public.part_requests where part_name = 'Svetlo VW test 41'), null);
select pg_temp.ok((select count(*) from public.request_buyer_outbox(500) o where o.part_name like '%test 41') = 0, '41: po odoslaní už nie');
set role anon;
select pg_temp.ok(not has_function_privilege('public.request_buyer_outbox(int)', 'execute'), '41: návštevník nemôže čítať frontu kupujúcich');
select pg_temp.ok(not has_function_privilege('public.seller_matches_brand(uuid,int)', 'execute'), '41: návštevník nemôže volať zhodu');
reset role;
set role authenticated;
select pg_temp.ok(not has_function_privilege('public.request_buyer_mark(bigint,text)', 'execute'), '41: predajca nemôže označiť odkaz');
reset role;
-- upratať (aby „všetky značky“ neovplyvnili iné testy)
delete from public.part_requests where part_name like '%test 41';
delete from public.sellers where id::text like 'a4100000%';
delete from auth.users where id::text like 'a4100000%';
\echo HOTOVO
