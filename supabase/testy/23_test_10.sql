-- Testy pre 10 (predané diely, našepkávanie, hodnotenia, strážca e-mailom, verejné stĺpce predajcov).
\set ON_ERROR_STOP 1
create or replace function pg_temp.as_user(uid text, ip text) returns void language plpgsql as $$
begin
  perform set_config('request.jwt.claims', case when uid is null then '{"role":"anon"}' else json_build_object('sub', uid, 'role', 'authenticated', 'aal', 'aal2')::text end, false);  -- aal2 = prihlásenie s kódom z mobilu (test 24 skúša aal1)
  perform set_config('request.jwt.claim.sub', coalesce(uid, ''), false);
  perform set_config('request.headers', json_build_object('x-forwarded-for', ip)::text, false);
end $$;
create or replace function pg_temp.ok(cond boolean, msg text) returns void language plpgsql as $$
begin if not coalesce(cond, false) then raise exception 'ZLYHAL: %', msg; end if; raise notice 'OK  %', msg; end $$;

insert into auth.users (id, email) values ('e1111111-0000-0000-0000-000000000001','e1@t.sk'),('e2222222-0000-0000-0000-000000000002','e2@t.sk'),
  ('e3333333-0000-0000-0000-000000000003','e3@t.sk') on conflict do nothing;
insert into public.sellers (id, name, seller_type, city) values ('e1111111-0000-0000-0000-000000000001','Vrak E1','Firma','Nitra'),
  ('e2222222-0000-0000-0000-000000000002','Vrak E2','Firma','Košice');
insert into public.admins (user_id) values ('e3333333-0000-0000-0000-000000000003') on conflict do nothing;

-- ===== A. predaný diel =====
select pg_temp.as_user('e1111111-0000-0000-0000-000000000001', '8.8.8.1'); set role authenticated;
insert into public.listings (seller_id,name,brand_id,model_id,year,category_id,oem,price,city,description)
select 'e1111111-0000-0000-0000-000000000001','Predné svetlo Golf VII',b.id,m.id,2015,'sv','5G1941005',150,'Nitra','Svetlo bez prasklín, funkčné, úchyty celé.'
from brands b join models m on m.brand_id = b.id where b.name = 'Volkswagen' and m.name = 'Golf VII';
insert into public.listings (seller_id,name,brand_id,model_id,year,category_id,oem,price,city,description)
select 'e1111111-0000-0000-0000-000000000001','Predné svetlo Golf VII xenón',brand_id,model_id,2016,'sv','5G1941031',220,'Nitra','Xenón s riadiacou jednotkou, odskúšané.' from listings where name = 'Predné svetlo Golf VII';
insert into public.listing_contacts (listing_id, phone) select id, '0905 111 999' from listings where name = 'Predné svetlo Golf VII';
reset role;
select set_config('rz.l', (select id::text from listings where name = 'Predné svetlo Golf VII'), false);
select pg_temp.as_user(null, '8.8.8.9'); set role anon;
select pg_temp.ok(public.listing_gone(current_setting('rz.l')::bigint) is null, 'aktívny inzerát nie je „preč“');
reset role;
update listings set status = 'sold' where id = current_setting('rz.l')::bigint;
select pg_temp.ok((select sold_at is not null from listings where id = current_setting('rz.l')::bigint), 'pri predaji sa zapíše čas predaja');
select pg_temp.as_user(null, '8.8.8.9'); set role anon;
select pg_temp.ok(public.listing_gone(current_setting('rz.l')::bigint) ->> 'status' = 'sold'
  and not (public.listing_gone(current_setting('rz.l')::bigint) ? 'phone') and not (public.listing_gone(current_setting('rz.l')::bigint) ? 'description'),
  'predaný diel: názov a auto áno, telefón a popis nie');
reset role;
update sellers set blocked = true where id = 'e1111111-0000-0000-0000-000000000001';
select pg_temp.ok(public.listing_gone(current_setting('rz.l')::bigint) is null, 'zablokovaný predajca: stránka neexistuje');
update sellers set blocked = false where id = 'e1111111-0000-0000-0000-000000000001';
update listings set status = 'active' where id = current_setting('rz.l')::bigint;
select pg_temp.ok((select sold_at is null from listings where id = current_setting('rz.l')::bigint), 'znova aktívny: čas predaja sa vymaže');

-- ===== B. našepkávanie =====
select pg_temp.as_user(null, '8.8.8.9'); set role anon;
select pg_temp.ok((select count(*) from public.search_suggest('predne svetlo golf')) = 2 and exists (select 1 from public.search_suggest('golf vii xen') where name = 'Predné svetlo Golf VII xenón'), 'našepkávanie bez diakritiky nájde oba názvy');
select pg_temp.ok((select count(*) from public.search_suggest('x')) = 0, 'jeden znak nič nenavrhne');
reset role;

-- ===== C. hodnotenie predajcov =====
select pg_temp.as_user(null, '8.8.8.20'); set role anon;
select set_config('rz.tok', public.create_part_request(jsonb_build_object('brand', (select id from brands where name = 'Volkswagen'),
  'part', 'Zadné svetlo', 'name', 'Peter Novák', 'contact', '0911 222 333'))::text, false);
reset role;
select pg_temp.as_user('e1111111-0000-0000-0000-000000000001', '8.8.8.1'); set role authenticated;
insert into public.part_offers (request_id, seller_id, price, phone) select id, 'e1111111-0000-0000-0000-000000000001', 60, '0905 111 999'
from part_requests where token = current_setting('rz.tok')::uuid;
reset role;
select pg_temp.as_user(null, '8.8.8.20'); set role anon;
select public.rate_seller(current_setting('rz.tok')::uuid, 'e1111111-0000-0000-0000-000000000001', 4, 'Rýchla odpoveď.');
do $$ begin
  begin perform public.rate_seller(current_setting('rz.tok')::uuid, 'e2222222-0000-0000-0000-000000000002', 1, 'zlé'); raise exception 'x';
  exception when others then perform pg_temp.ok(sqlerrm like 'Hodnotiť môžete len%', 'predajcu bez ponuky hodnotiť nejde'); end;
  begin perform public.rate_seller(gen_random_uuid(), 'e1111111-0000-0000-0000-000000000001', 1, 'x'); raise exception 'x';
  exception when others then perform pg_temp.ok(sqlerrm like 'Dopyt sa nenašiel%', 'bez platného kódu hodnotiť nejde'); end;
  begin perform public.rate_seller(current_setting('rz.tok')::uuid, 'e1111111-0000-0000-0000-000000000001', 6, 'x'); raise exception 'x';
  exception when others then perform pg_temp.ok(sqlerrm like 'Vyberte 1 až 5%', 'hviezdičky len 1 až 5'); end;
end $$;
select public.rate_seller(current_setting('rz.tok')::uuid, 'e1111111-0000-0000-0000-000000000001', 5, 'Rýchla odpoveď, diel sedel.');
select pg_temp.ok((select rating_count = 1 and rating_avg = 5.0 from sellers where id = 'e1111111-0000-0000-0000-000000000001'), 'zmena hodnotenia ho prepíše, priemer 5,0 z 1');
select pg_temp.ok((select author from seller_reviews limit 1) = 'Peter', 'zobrazí sa len krstné meno');
select pg_temp.ok((public.get_part_request(current_setting('rz.tok')::uuid) -> 'offers' -> 0 ->> 'my_stars')::int = 5, 'kupujúci vidí svoje hodnotenie pri ponuke');
do $$ begin
  begin perform request_id from public.seller_reviews; raise exception 'x';
  exception when insufficient_privilege then perform pg_temp.ok(true, 'verejnosť nevidí, ku ktorému dopytu hodnotenie patrí'); end;
  begin insert into public.seller_reviews (seller_id, stars, author) values ('e2222222-0000-0000-0000-000000000002', 5, 'Ja'); raise exception 'x';
  exception when insufficient_privilege then perform pg_temp.ok(true, 'hodnotenie sa nedá vložiť priamo, len cez dopyt'); end;
end $$;
reset role;
select pg_temp.as_user('e1111111-0000-0000-0000-000000000001', '8.8.8.1'); set role authenticated;
do $$ begin
  begin update public.seller_reviews set stars = 5; raise exception 'x';
  exception when insufficient_privilege then perform pg_temp.ok(true, 'predajca si hodnotenie nezmení'); end;
  begin update public.sellers set rating_avg = 5 where id = 'e1111111-0000-0000-0000-000000000001'; raise exception 'x';
  exception when insufficient_privilege then perform pg_temp.ok(true, 'predajca si nezmení priemer hodnotení'); end;
end $$;
reset role;
select pg_temp.as_user('e3333333-0000-0000-0000-000000000003', '8.8.8.3'); set role authenticated;
select public.admin_hide_review((select id from seller_reviews limit 1), true);
reset role;
select pg_temp.ok((select rating_count = 0 and rating_avg is null from sellers where id = 'e1111111-0000-0000-0000-000000000001'), 'skryté hodnotenie sa nepočíta do priemeru');
select pg_temp.as_user(null, '8.8.8.9'); set role anon;
select pg_temp.ok((select count(*) from public.seller_reviews) = 0, 'skryté hodnotenie verejnosť nevidí');
reset role;

-- ===== D. strážca e-mailom =====
select pg_temp.as_user(null, '8.8.8.30'); set role anon;
do $$ begin
  begin perform public.create_search_alert('jano@post.sk', '{"brand":1}', 'Škoda', false); raise exception 'x';
  exception when others then perform pg_temp.ok(sqlerrm like 'Potvrďte súhlas%', 'bez súhlasu sa upozornenie nezapne'); end;
  begin perform public.create_search_alert('jano@post', '{"brand":1}', 'Škoda', true); raise exception 'x';
  exception when others then perform pg_temp.ok(sqlerrm like 'Skontrolujte e-mail%', 'neplatný e-mail'); end;
end $$;
select public.create_search_alert(' Jano@Post.sk ', '{"brand":1}', 'Škoda Octavia', true);
do $$ begin
  begin perform * from public.search_alerts; raise exception 'x';
  exception when insufficient_privilege then perform pg_temp.ok(true, 'verejnosť nevidí e-maily zo strážcu'); end;
end $$;
select public.create_search_alert('a@b.sk', '{}', 'x', true); select public.create_search_alert('a@b.sk', '{}', 'x', true);
select public.create_search_alert('a@b.sk', '{}', 'x', true); select public.create_search_alert('a@b.sk', '{}', 'x', true);
do $$ begin
  begin perform public.create_search_alert('a@b.sk', '{}', 'x', true); raise exception 'x';
  exception when others then perform pg_temp.ok(sqlerrm like 'Príliš veľa%', 'limit 5 upozornení za hodinu z jedného pripojenia'); end;
end $$;
reset role;
select pg_temp.ok((select email from search_alerts where label = 'Škoda Octavia') = 'jano@post.sk' and (select confirmed_at is null from search_alerts where label = 'Škoda Octavia'),
  'e-mail uložený malými písmenami, zatiaľ nepotvrdený');
select set_config('rz.atok', (select token::text from search_alerts where label = 'Škoda Octavia'), false);
select pg_temp.as_user(null, '8.8.8.31'); set role anon;
select pg_temp.ok(public.confirm_search_alert(current_setting('rz.atok')::uuid) = 'Škoda Octavia', 'potvrdenie odkazom z e-mailu');
reset role;
select pg_temp.ok((select confirmed_at is not null from search_alerts where label = 'Škoda Octavia'), 'upozornenie je potvrdené');
update search_alerts set created_at = now() - interval '4 days' where label = 'x';
select public.purge_old_data();
select pg_temp.ok(not exists (select 1 from search_alerts where label = 'x') and exists (select 1 from search_alerts where label = 'Škoda Octavia'),
  'nepotvrdené po 3 dňoch zmazané, potvrdené ostáva');
select pg_temp.as_user(null, '8.8.8.31'); set role anon;
select pg_temp.ok(public.cancel_search_alert(current_setting('rz.atok')::uuid) = 'Škoda Octavia', 'zrušenie odkazom z e-mailu');
reset role;
select pg_temp.ok(not exists (select 1 from search_alerts where label = 'Škoda Octavia'), 'zrušené upozornenie je zmazané');

-- ===== E. verejné stĺpce predajcov =====
select pg_temp.as_user(null, '8.8.8.9'); set role anon;
select pg_temp.ok((select name from public.sellers where id = 'e1111111-0000-0000-0000-000000000001') = 'Vrak E1', 'meno predajcu je verejné');
do $$ begin
  begin perform terms_accepted_at from public.sellers; raise exception 'x';
  exception when insufficient_privilege then perform pg_temp.ok(true, 'čas súhlasu s podmienkami nie je verejný'); end;
end $$;
reset role;
\echo HOTOVO
