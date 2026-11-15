-- Test pre 36: strojové preklady inzerátov
\set ON_ERROR_STOP 1
create or replace function pg_temp.ok(cond boolean, msg text) returns void language plpgsql as $$
begin if not coalesce(cond, false) then raise exception 'ZLYHAL: %', msg; end if; raise notice 'OK  %', msg; end $$;
insert into auth.users (id, email, email_confirmed_at) values ('a3600000-0000-0000-0000-000000000001', 'preklad36@test.invalid', now());
insert into public.sellers (id, name, city, seller_type) values ('a3600000-0000-0000-0000-000000000001', 'Preklad 36', 'Žilina', 'Súkromná osoba');
insert into public.listings (seller_id, name, category_id, brand_id, price, city, description, warranty, condition, vtype)
values ('a3600000-0000-0000-0000-000000000001', 'Preklad test 36', 'ine', (select id from public.brands where name = 'Škoda'), 20, 'Žilina', 'Univerzálny diel na test prekladov.', 'Bez záruky', 'Dobrý', 'osobne');
create temp table t36 as select id from public.listings where name = 'Preklad test 36';
grant select on t36 to anon;
select pg_temp.ok((select count(*) from public.translate_outbox('pl', 200) o where o.id = (select id from t36)) = 1, '36: nový inzerát je vo fronte');
select pg_temp.ok(public.translate_save('pl', (select id from t36), 'Test tłumaczenia 36', 'Opis', (select o.src_hash from public.translate_outbox('pl', 200) o where o.id = (select id from t36))), '36: preklad sa uloží');
select pg_temp.ok((select count(*) from public.translate_outbox('pl', 200) o where o.id = (select id from t36)) = 0, '36: preložený inzerát už nie je vo fronte');
select pg_temp.ok(not public.translate_save('pl', (select id from t36), 'X', 'Y', 'zly'), '36: zastaraný preklad sa neuloží');
update public.listings set description = description || ' Zmena.' where id = (select id from t36);
select pg_temp.ok((select count(*) from public.translate_outbox('pl', 200) o where o.id = (select id from t36)) = 1, '36: po zmene popisu sa preloží znova');
set role anon;
select pg_temp.ok((select count(*) from public.listing_tr where listing_id = (select id from t36)) = 1, '36: návštevník vidí preklad aktívneho inzerátu');
select pg_temp.ok(not has_function_privilege('public.translate_outbox(text,int)', 'execute'), '36: návštevník nemôže čítať frontu');
select pg_temp.ok(not has_function_privilege('public.translate_save(text,bigint,text,text,text)', 'execute'), '36: návštevník nemôže ukladať preklady');
reset role;
update public.listings set status = 'paused' where id = (select id from t36);
set role anon;
select pg_temp.ok((select count(*) from public.listing_tr where listing_id = (select id from t36)) = 0, '36: preklad pozastaveného inzerátu nie je verejný');
reset role;
