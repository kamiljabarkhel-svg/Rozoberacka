-- Testy pre 05_bezpecnost_hladanie.sql (spúšťať na kópii databázy s napodobeninou Supabase, nie na ostrej).
\set ON_ERROR_STOP 1
set client_min_messages = warning;
create or replace function pg_temp.as_user(uid text, ip text) returns void language plpgsql as $$
begin
  perform set_config('request.jwt.claims', case when uid is null then '{"role":"anon"}' else json_build_object('sub', uid, 'role', 'authenticated', 'aal', 'aal2')::text end, false);  -- aal2 = prihlásenie s kódom z mobilu (test 24 skúša aal1)
  perform set_config('request.jwt.claim.sub', coalesce(uid, ''), false);
  perform set_config('request.headers', json_build_object('x-forwarded-for', ip || ', 10.0.0.1')::text, false);
end $$;
create or replace function pg_temp.ok(cond boolean, msg text) returns void language plpgsql as $$
begin if not coalesce(cond, false) then raise exception 'ZLYHAL: %', msg; end if; raise notice 'OK  %', msg; end $$;
set client_min_messages = notice;

insert into auth.users (id, email) values ('11111111-1111-1111-1111-111111111111','a@t.sk'),('22222222-2222-2222-2222-222222222222','b@t.sk'),('99999999-9999-9999-9999-999999999999','admin@t.sk');
insert into public.sellers (id, name, seller_type, city) values ('11111111-1111-1111-1111-111111111111','Vrakovisko A','Firma','Žilina'),('22222222-2222-2222-2222-222222222222','Peter B','Súkromná osoba','Nitra');
insert into public.admins values ('99999999-9999-9999-9999-999999999999');

-- ===== predajca A (firma) =====
select pg_temp.as_user('11111111-1111-1111-1111-111111111111', '1.1.1.1');
set role authenticated;
do $$ begin
  begin
    insert into public.listings (seller_id,name,brand_id,model_id,year,category_id,oem,price,city,description,warranty)
    values ('11111111-1111-1111-1111-111111111111','Predné ľavé svetlo',1,(select id from models where brand_id=1 and name like 'Octavia III%' limit 1),2016,'sv','5E1 941 015',120,'Žilina','Funkčné svetlo bez prasklín, úchyty celé.','Bez záruky');
    raise exception 'malo zlyhať';
  exception when others then perform pg_temp.ok(sqlerrm like 'Firma musí%', 'firma nemôže dať „Bez záruky“'); end;
end $$;
insert into public.listings (seller_id,name,brand_id,model_id,year,category_id,subcategory_id,oem,price,city,description,warranty,returns_14d)
select '11111111-1111-1111-1111-111111111111','Predné ľavé svetlo LED',b.id,m.id,2016,'sv',(select id from subcategories where name='Predné svetlá'),'5E1 941 015',120,'Žilina','Funkčné svetlo bez prasklín, úchyty celé.','12 mesiacov',false
from brands b join models m on m.brand_id=b.id where b.name='Škoda' and m.name like 'Octavia III%' limit 1;
select pg_temp.ok((select returns_14d from listings where name='Predné ľavé svetlo LED'), 'firma: vrátenie 14 dní nastavené automaticky');
insert into public.listing_contacts select id, '0905 111 222' from listings where name='Predné ľavé svetlo LED';
-- Alternátor VW Golf VII s „pasuje aj na“ Audi A3
insert into public.listings (seller_id,name,brand_id,model_id,year,category_id,oem,price,city,description,warranty)
select '11111111-1111-1111-1111-111111111111','Alternátor 140A Bosch',b.id,m.id,2015,'el','03L 903 023',85,'Žilina','Odskúšaný alternátor, nabíja správne.','12 mesiacov'
from brands b join models m on m.brand_id=b.id where b.name='Volkswagen' and m.name like 'Golf VII%' limit 1;
insert into public.listing_fits (listing_id, brand_id, model_id) select l.id, b.id, null from listings l, brands b where l.name like 'Alternátor%' and b.name='Audi';
insert into public.listing_contacts select id, '0905 111 222' from listings where name like 'Alternátor%';
do $$ begin
  begin update public.listings set views = 999 where name like 'Alternátor%'; raise exception 'x';
  exception when insufficient_privilege then perform pg_temp.ok(true, 'predajca nemení zobrazenia'); end;
  begin update public.listings set top_until = now() + interval '1 year'; raise exception 'x';
  exception when insufficient_privilege then perform pg_temp.ok(true, 'predajca nemení TOP priamo'); end;
  begin update public.sellers set verified = true; raise exception 'x';
  exception when insufficient_privilege then perform pg_temp.ok(true, 'predajca sa nemôže sám overiť'); end;
end $$;
select pg_temp.ok(public.toggle_top((select id from listings where name like 'Alternátor%'), true) > now(), 'TOP cez funkciu');
reset role;

-- ===== predajca B (súkromná osoba) =====
select pg_temp.as_user('22222222-2222-2222-2222-222222222222', '2.2.2.2');
set role authenticated;
insert into public.listings (seller_id,name,brand_id,model_id,year,category_id,oem,price,city,description,warranty,side)
select '22222222-2222-2222-2222-222222222222','Zadné svetlo pravé',b.id,m.id,2014,'sv','1Z9945096',40,'Nitra','Zadné svetlo, mierne poškriabané, funkčné.','Bez záruky','Pravá'
from brands b join models m on m.brand_id=b.id where b.name='Škoda' and m.name like 'Octavia II%' and m.name not like 'Octavia III%' limit 1;
select pg_temp.ok((select warranty from listings where name='Zadné svetlo pravé') = 'Bez záruky', 'súkromná osoba môže predať bez záruky');
-- rovnaké OEM ako alternátor, ale na Seat → alternátor A sa nájde aj pod Seat cez OEM
insert into public.listings (seller_id,name,brand_id,model_id,year,category_id,oem,price,city,description,warranty)
select '22222222-2222-2222-2222-222222222222','Alternátor',b.id,m.id,2014,'el','03L903023',60,'Nitra','Alternátor z auta, nevyskúšaný, predám lacno.','Bez záruky'
from brands b join models m on m.brand_id=b.id where b.name='Kia' order by m.id limit 1;
do $$ begin
  begin update public.listings set price = 1 where seller_id = '11111111-1111-1111-1111-111111111111';
    perform pg_temp.ok((select count(*) from listings where price = 1) = 0, 'cudzí inzerát sa nedá zmeniť (RLS)');
  end;
end $$;
reset role;

-- ===== kupujúci bez účtu =====
select pg_temp.as_user(null, '3.3.3.3');
set role anon;
select pg_temp.ok(public.reveal_phone((select id from listings where name='Predné ľavé svetlo LED')) = '0905 111 222', 'telefón sa odkryje');
select public.reveal_phone((select id from listings where name='Predné ľavé svetlo LED'));
select public.log_view((select id from listings where name='Predné ľavé svetlo LED'));
select public.log_view((select id from listings where name='Predné ľavé svetlo LED'));
reset role;
select pg_temp.ok((select calls from listings where name='Predné ľavé svetlo LED') = 1, 'opakovaný telefón z rovnakej IP sa počíta raz');
select pg_temp.ok((select views from listings where name='Predné ľavé svetlo LED') = 1, 'opakované zobrazenie z rovnakej IP sa počíta raz');
select pg_temp.ok((select count(distinct ip_key) from rate_events) = 1 and (select ip_key from rate_events limit 1) !~ '3\.3', 'IP sa ukladá len ako hash');
-- limit 40 telefónov za hodinu
insert into rate_events (kind, ip_key, listing_id) select 'phone', public.client_ip_key(), -g from generate_series(1, 40) g;
set role anon;
do $$ begin
  begin perform public.reveal_phone((select id from listings where name like 'Alternátor 140A%')); raise exception 'x';
  exception when others then perform pg_temp.ok(sqlerrm like 'Príliš veľa zobrazení%', 'limit telefónov na IP'); end;
end $$;
select pg_temp.ok(public.send_message((select id from listings where name='Predné ľavé svetlo LED'), 'Jano', '0911 222 333', 'Je diel dostupný?'), 'správa odoslaná');
select pg_temp.ok(public.report_listing((select id from listings where name='Zadné svetlo pravé'), 'Podvod', 'Chce zálohu vopred', null), 'nahlásenie');
select pg_temp.ok((select count(*) from reports) = 0, 'anon nevidí nahlásenia');
do $$ begin
  begin perform public.admin_stats(); raise exception 'x';
  exception when insufficient_privilege then perform pg_temp.ok(true, 'anon nevolá funkcie správcu'); end;
end $$;

-- ===== hľadanie =====
select pg_temp.ok((public.search_listings('{"q":"svetla"}') ->> 'total')::int = 2, 'tvar slova: „svetla“ nájde 2 svetlá');
select pg_temp.ok((public.search_listings('{"q":"zadne"}') ->> 'total')::int = 1, 'bez diakritiky: „zadne“');
select pg_temp.ok((public.search_listings('{"q":"alternatr"}') ->> 'total')::int = 2, 'preklep: „alternatr“');
select pg_temp.ok((public.search_listings('{"q":"dynamo"}') ->> 'total')::int = 2, 'synonymum: „dynamo“ = alternátor');
select pg_temp.ok((public.search_listings('{"q":"5e1-941"}') ->> 'total')::int = 1, 'časť OEM s pomlčkou');
select pg_temp.ok((public.search_listings('{"q":"bosch"}') ->> 'total')::int = 1, 'výrobca dielu v názve');
select pg_temp.ok((public.search_listings(jsonb_build_object('brand', (select id from brands where name='Audi'))) ->> 'total')::int = 2, 'auto cez „pasuje aj na“ (Audi) + rovnaké OEM');
select pg_temp.ok((public.search_listings(jsonb_build_object('brand', (select id from brands where name='Kia'))) -> 'items' -> 0 ->> 'name') is not null
  and (public.search_listings(jsonb_build_object('brand', (select id from brands where name='Kia'))) ->> 'total')::int = 2, 'auto cez rovnaké OEM iného predajcu (Kia)');
select pg_temp.ok((public.search_listings(jsonb_build_object('brand', (select id from brands where name='Škoda'), 'cat', 'sv')) -> 'cats' ->> 'sv')::int = 2, 'facety kategórií');
select pg_temp.ok((public.search_listings('{"side":"Ľavá"}') ->> 'total')::int = 3, 'strana: bez uvedenej strany ostáva');
select pg_temp.ok((public.search_listings('{"sort":"new"}') -> 'items' -> 0 ->> 'name') like 'Alternátor 140A%', 'TOP inzerát je prvý');
select pg_temp.ok((public.search_listings('{"sort":"asc","limit":2,"offset":1}') -> 'items' -> 0 ->> 'price')::numeric = 60, 'zoradenie a stránkovanie');
select pg_temp.ok((public.search_listings('{"ids":[]}') ->> 'total')::int = 0, 'prázdne obľúbené');
reset role;

-- ===== správca =====
select pg_temp.as_user('99999999-9999-9999-9999-999999999999', '9.9.9.9');
set role authenticated;
select pg_temp.ok((select count(*) from reports) = 1, 'správca vidí nahlásenie');
select public.admin_set_listing((select listing_id from reports limit 1), true, 'podvod');
select public.admin_resolve_report((select id from reports limit 1), 'resolved');
select pg_temp.ok((public.admin_stats() ->> 'blocked')::int = 1, 'štatistiky správcu');
select pg_temp.ok((select count(*) from admin_log) = 2, 'záznam akcií správcu');
reset role;
select pg_temp.ok((public.search_listings('{"q":"zadne"}') ->> 'total')::int = 0, 'skrytý inzerát sa nenájde');
select pg_temp.as_user('22222222-2222-2222-2222-222222222222', '2.2.2.2');
set role authenticated;
do $$ begin
  begin update public.listings set status = 'active' where name = 'Zadné svetlo pravé'; raise exception 'x';
  exception when others then perform pg_temp.ok(sqlerrm like 'Inzerát skryl správca%', 'predajca neodkryje skrytý inzerát'); end;
end $$;
do $$ begin
  begin update public.messages set body = 'iné'; raise exception 'x';
  exception when insufficient_privilege then perform pg_temp.ok(true, 'predajca neprepíše správu kupujúceho'); end;
end $$;
-- zmena B na firmu → zákonná záruka
update public.sellers set seller_type = 'Firma' where id = '22222222-2222-2222-2222-222222222222';
reset role;
select pg_temp.ok((select count(*) from listings where seller_id = '22222222-2222-2222-2222-222222222222' and warranty = 'Bez záruky') = 0, 'po zmene na firmu má každý inzerát 12 mesiacov');
select pg_temp.ok((select file_size_limit from storage.buckets where id = 'listing-photos') = 5242880, 'limit veľkosti fotky 5 MB');
\echo HOTOVO
