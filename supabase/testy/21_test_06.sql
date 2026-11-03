-- Testy pre 06_gdpr.sql (na kópii databázy s napodobeninou Supabase).
\set ON_ERROR_STOP 1
create or replace function pg_temp.as_user(uid text, ip text) returns void language plpgsql as $$
begin
  perform set_config('request.jwt.claims', case when uid is null then '{"role":"anon"}' else json_build_object('sub', uid, 'role', 'authenticated')::text end, false);
  perform set_config('request.jwt.claim.sub', coalesce(uid, ''), false);
  perform set_config('request.headers', json_build_object('x-forwarded-for', ip)::text, false);
end $$;
create or replace function pg_temp.ok(cond boolean, msg text) returns void language plpgsql as $$
begin if not coalesce(cond, false) then raise exception 'ZLYHAL: %', msg; end if; raise notice 'OK  %', msg; end $$;

insert into auth.users (id, email) values ('33333333-3333-3333-3333-333333333333','c@t.sk'),('99999999-9999-9999-9999-999999999999','admin@t.sk');
insert into public.admins values ('99999999-9999-9999-9999-999999999999');
select pg_temp.as_user('33333333-3333-3333-3333-333333333333', '4.4.4.4');
set role authenticated;
insert into public.sellers (id, name, seller_type, city, terms_accepted_at, terms_version) values ('33333333-3333-3333-3333-333333333333','Test C','Firma','Martin', now(), '2026-11-03');
insert into public.seller_private (seller_id, phone, ico) values ('33333333-3333-3333-3333-333333333333', '0905 000 111', '12345678');
insert into public.listings (seller_id,name,brand_id,model_id,year,category_id,oem,price,city,description)
select '33333333-3333-3333-3333-333333333333','Kapota',b.id,m.id,2016,'kar','5E0823031',90,'Martin','Kapota bez hrdze, drobné škrabance.' from brands b join models m on m.brand_id=b.id where b.name='Škoda' limit 1;
insert into public.listing_contacts select id, '0905 000 111' from listings where name='Kapota';
reset role;
select pg_temp.as_user(null, '5.5.5.5'); set role anon;
select public.send_message((select id from listings where name='Kapota'), 'Jano', 'jano@x.sk', 'Je kapota ešte dostupná?');
do $$ begin
  begin perform * from public.app_secrets; raise exception 'x';
  exception when insufficient_privilege then perform pg_temp.ok(true, 'tajný kľúč nevidí verejnosť'); end;
  begin perform public.client_ip_key(); raise exception 'x';
  exception when insufficient_privilege then perform pg_temp.ok(true, 'funkciu odtlačku IP nevolá verejnosť'); end;
  begin perform public.export_my_data(); raise exception 'x';
  exception when insufficient_privilege then perform pg_temp.ok(true, 'anon nemá export'); end;
end $$;
reset role;
select pg_temp.ok((select ip_key from rate_events limit 1) <> encode(sha256(convert_to('rz|5.5.5.5','UTF8')),'hex'), 'odtlačok IP používa tajný kľúč');
select pg_temp.ok((select terms_version from sellers where id='33333333-3333-3333-3333-333333333333') = '2026-11-03', 'súhlas s podmienkami uložený');

-- moderácia s dôvodom
select pg_temp.as_user('99999999-9999-9999-9999-999999999999', '9.9.9.9'); set role authenticated;
select public.admin_set_listing((select id from listings where name='Kapota'), true, 'Fotka nepatrí k dielu');
reset role;
select pg_temp.ok((select moderation_note from listings where name='Kapota') = 'Fotka nepatrí k dielu', 'dôvod skrytia uložený');

-- mazanie starých údajov
update messages set created_at = now() - interval '13 months';
insert into rate_events (kind, ip_key, created_at) values ('view', 'x', now() - interval '5 days');
select public.purge_old_data();
select pg_temp.ok((select count(*) from messages) = 0, 'správy staršie ako 12 mesiacov zmazané');
select pg_temp.ok((select count(*) from rate_events where created_at < now() - interval '3 days') = 0, 'záznamy IP staršie ako 3 dni zmazané');

-- export a zrušenie účtu
select pg_temp.as_user('33333333-3333-3333-3333-333333333333', '4.4.4.4'); set role authenticated;
select pg_temp.ok((public.export_my_data() -> 'sukromne_udaje' ->> 'ico') = '12345678' and jsonb_array_length(public.export_my_data() -> 'inzeraty') = 1
  and (public.export_my_data() -> 'inzeraty' -> 0 ->> 'telefon') = '0905 000 111', 'export obsahuje profil, IČO, inzeráty a telefón');
select public.delete_my_account();
reset role;
select pg_temp.ok(not exists (select 1 from auth.users where id='33333333-3333-3333-3333-333333333333')
  and not exists (select 1 from sellers where id='33333333-3333-3333-3333-333333333333')
  and not exists (select 1 from seller_private where seller_id='33333333-3333-3333-3333-333333333333')
  and not exists (select 1 from listings where name='Kapota')
  and not exists (select 1 from listing_contacts where phone = '0905 000 111'), 'zrušenie účtu zmaže prihlásenie, profil, súkromné údaje, inzeráty a telefóny');
\echo HOTOVO
