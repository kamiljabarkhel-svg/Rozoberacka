-- Testy pre 31: fórum – prezývka, schvaľovanie nováčikov, viditeľnosť, nahlásenie, správca, mazanie.
\set ON_ERROR_STOP 1
create or replace function pg_temp.ok(cond boolean, msg text) returns void language plpgsql as $$
begin if not coalesce(cond, false) then raise exception 'ZLYHAL: %', msg; end if; raise notice 'OK  %', msg; end $$;
create or replace function pg_temp.as_user(uid uuid) returns void language plpgsql as $$
begin
  perform set_config('request.jwt.claims', case when uid is null then '{"role":"anon"}' else json_build_object('sub', uid, 'role', 'authenticated', 'aal', 'aal2')::text end, false);
  execute case when uid is null then 'set role anon' else 'set role authenticated' end;
end $$;
create or replace function pg_temp.fails(q text) returns boolean language plpgsql as $$
begin execute q; return false; exception when others then return true; end $$;

reset role;
insert into auth.users (id, email) values
  ('f3100000-0000-0000-0000-000000000001', 'novacik@test.invalid'),
  ('f3100000-0000-0000-0000-000000000002', 'predajca31@test.invalid'),
  ('f3100000-0000-0000-0000-000000000003', 'druhy@test.invalid'),
  ('f3100000-0000-0000-0000-0000000000ad', 'admin31@test.invalid');
insert into public.admins values ('f3100000-0000-0000-0000-0000000000ad') on conflict do nothing;
insert into public.sellers (id, name, city, seller_type) values ('f3100000-0000-0000-0000-000000000002', 'Vrakovisko 31', 'Nitra', 'Súkromná osoba');

-- prezývky
select pg_temp.as_user('f3100000-0000-0000-0000-000000000001');
select pg_temp.ok(pg_temp.fails($q$select public.forum_new_thread('skoda', 'Klepe motor 1.9 TDI', 'Text otázky')$q$), '31: bez prezývky sa nedá písať');
select public.forum_join('Jano 85', '2026-11-14');
select pg_temp.ok((public.forum_me() ->> 'nick') = 'Jano 85' and not (public.forum_me() ->> 'trusted')::boolean, '31: nováčik má prezývku, nie je dôveryhodný');
select pg_temp.as_user('f3100000-0000-0000-0000-000000000003');
select pg_temp.ok(pg_temp.fails($q$select public.forum_join('jano 85', 'x')$q$), '31: prezývka je jedinečná (aj s inými veľkými písmenami)');
select pg_temp.ok(pg_temp.fails($q$select public.forum_join('Admin', 'x')$q$), '31: rezervovaná prezývka');
select pg_temp.ok(pg_temp.fails($q$select public.forum_join('ab', 'x')$q$), '31: prekrátka prezývka');
select public.forum_join('Druhy', '2026-11-14');
select pg_temp.as_user('f3100000-0000-0000-0000-000000000002');
select public.forum_join('Vrakovisko 31', '2026-11-14');
select pg_temp.ok((public.forum_me() ->> 'trusted')::boolean and (public.forum_me() ->> 'seller')::boolean, '31: predajca je dôveryhodný hneď');

-- nováčik: téma čaká na schválenie
select pg_temp.as_user('f3100000-0000-0000-0000-000000000001');
select pg_temp.ok(pg_temp.fails($q$select public.forum_new_thread('technika', 'Klepe motor 1.9 TDI', 'Text otázky')$q$), '31: do nadradenej sekcie sa nedá písať');
select pg_temp.ok(pg_temp.fails($q$select public.forum_new_thread('skoda', 'Kr', 'Text otázky')$q$), '31: prekrátky nadpis');
select public.forum_new_thread('skoda', 'Klepe motor 1.9 TDI pri studenom štarte', 'Octavia II, 2008, klepe pri studenom štarte. Čo skontrolovať?');
select pg_temp.ok((select status from public.forum_threads where title like 'Klepe motor%') = 'pending', '31: téma nováčika čaká na schválenie');
select pg_temp.ok((public.forum_thread((select id from public.forum_threads where title like 'Klepe motor%')) -> 'posts' -> 0 ->> 'status') = 'pending', '31: autor vidí svoju čakajúcu tému');
select pg_temp.as_user(null);
select pg_temp.ok(public.forum_thread((select id from public.forum_threads where title like 'Klepe motor%')) is null, '31: návštevník čakajúcu tému nevidí');
select pg_temp.ok((public.forum_threads_page('skoda') ->> 'total')::int = 0, '31: v zozname nie je');

-- predajca: téma hneď viditeľná
select pg_temp.as_user('f3100000-0000-0000-0000-000000000002');
select public.forum_new_thread('skoda', 'Ako zistiť číslo dielu svetlometu Fabia', 'Číslo je na štítku zo zadnej strany svetlometu.');
select pg_temp.as_user(null);
select pg_temp.ok((public.forum_threads_page('skoda') ->> 'total')::int = 1, '31: téma predajcu je hneď vidieť');
select pg_temp.ok((public.forum_threads_page('skoda') -> 'items' -> 0 ->> 'seller')::boolean, '31: pri predajcovi je značka Predajca');
select pg_temp.ok(pg_temp.fails($q$select public.forum_reply(1, 'ahoj')$q$), '31: bez prihlásenia sa nedá odpovedať');
select pg_temp.ok(pg_temp.fails($q$insert into public.forum_posts (thread_id, user_id, body) values (1, 'f3100000-0000-0000-0000-000000000002', 'x')$q$), '31: priamy zápis do tabuľky zakázaný');

-- správca schváli prvý príspevok nováčika
select pg_temp.as_user('f3100000-0000-0000-0000-0000000000ad');
select pg_temp.ok(jsonb_array_length(public.admin_forum_queue() -> 'pending') = 1, '31: správca vidí 1 čakajúci príspevok');
select public.admin_forum_set_post((select min(id) from public.forum_posts where user_id = 'f3100000-0000-0000-0000-000000000001'), 'visible', null);
select pg_temp.as_user(null);
select pg_temp.ok((public.forum_threads_page('skoda') ->> 'total')::int = 2, '31: po schválení je téma nováčika vidieť');

-- nováčik odpovie ešte 2-krát, správca schváli → dôveryhodný
select pg_temp.as_user('f3100000-0000-0000-0000-000000000001');
select public.forum_reply((select id from public.forum_threads where title like 'Ako zistiť%'), 'Ďakujem, našiel som to.');
select public.forum_reply((select id from public.forum_threads where title like 'Ako zistiť%'), 'Ešte doplním, že štítok bol pod krytom.');
select pg_temp.ok(pg_temp.fails($q$select public.forum_reply((select id from public.forum_threads where title like 'Ako zistiť%'), 'Ešte doplním, že štítok bol pod krytom.')$q$), '31: rovnaký príspevok dvakrát za sebou nejde');
select pg_temp.as_user('f3100000-0000-0000-0000-0000000000ad');
select public.admin_forum_set_post(id, 'visible', null) from public.forum_posts where user_id = 'f3100000-0000-0000-0000-000000000001' and status = 'pending';
reset role;
select pg_temp.ok((select trusted from public.forum_profiles where user_id = 'f3100000-0000-0000-0000-000000000001'), '31: po 3 schválených príspevkoch je dôveryhodný');
select pg_temp.as_user('f3100000-0000-0000-0000-000000000001');
select public.forum_reply((select id from public.forum_threads where title like 'Ako zistiť%'), 'Teraz to už ide hneď.');
select pg_temp.ok((select status from public.forum_posts where body = 'Teraz to už ide hneď.') = 'visible', '31: dôveryhodný píše bez schvaľovania');
select pg_temp.ok((select post_count from public.forum_threads where title like 'Ako zistiť%') = 4, '31: počet príspevkov v téme');

-- nahlásenie a skrytie
select pg_temp.as_user(null);
select public.forum_report((select id from public.forum_posts where body = 'Teraz to už ide hneď.'), 'Spam alebo reklama', 'Reklama', null);
select pg_temp.ok(pg_temp.fails($q$select public.forum_report(1, 'Nesprávny dôvod', null, null)$q$), '31: neplatný dôvod nahlásenia');
select pg_temp.as_user('f3100000-0000-0000-0000-0000000000ad');
select pg_temp.ok(jsonb_array_length(public.admin_forum_queue() -> 'reports') = 1, '31: správca vidí nahlásenie');
select pg_temp.ok(pg_temp.fails($q$select public.admin_forum_set_post(1, 'hidden', '')$q$), '31: skrytie bez dôvodu nejde');
select public.admin_forum_set_post((select id from public.forum_posts where body = 'Teraz to už ide hneď.'), 'hidden', 'Reklama mimo témy');
select public.admin_forum_resolve_report(((public.admin_forum_queue() -> 'reports' -> 0 ->> 'id')::bigint), 'resolved');
select pg_temp.as_user('f3100000-0000-0000-0000-000000000001');
select pg_temp.ok((select x ->> 'hidden_reason' from jsonb_array_elements(public.forum_thread((select id from public.forum_threads where title like 'Ako zistiť%')) -> 'posts') x where x ->> 'status' = 'hidden') = 'Reklama mimo témy', '31: autor vidí dôvod skrytia');
select pg_temp.as_user('f3100000-0000-0000-0000-000000000003');
select pg_temp.ok((select count(*) from jsonb_array_elements(public.forum_thread((select id from public.forum_threads where title like 'Ako zistiť%')) -> 'posts') x where x ->> 'status' = 'hidden') = 0, '31: iní skrytý príspevok nevidia');
select pg_temp.ok(pg_temp.fails($q$select 1 from public.forum_reports$q$), '31: nahlásenia nikto okrem správcu nečíta');

-- uzamknutie, zákaz, mazanie
select pg_temp.as_user('f3100000-0000-0000-0000-0000000000ad');
select public.admin_forum_lock((select id from public.forum_threads where title like 'Ako zistiť%'), true, null);
select public.admin_forum_ban('f3100000-0000-0000-0000-000000000003', true, 'Spam');
select pg_temp.as_user('f3100000-0000-0000-0000-000000000001');
select pg_temp.ok(pg_temp.fails($q$select public.forum_reply((select id from public.forum_threads where title like 'Ako zistiť%'), 'Do zamknutej')$q$), '31: do uzamknutej témy sa nedá písať');
select pg_temp.as_user('f3100000-0000-0000-0000-000000000003');
select pg_temp.ok(pg_temp.fails($q$select public.forum_new_thread('bmw', 'Zablokovaný píše tému', 'Text')$q$), '31: zablokovaný nemôže písať');
select pg_temp.as_user('f3100000-0000-0000-0000-000000000001');
select public.forum_delete_post((select min(id) from public.forum_posts where thread_id = (select id from public.forum_threads where title like 'Klepe motor%')));
select pg_temp.ok(not exists (select 1 from public.forum_threads where title like 'Klepe motor%'), '31: zmazanie prvého príspevku zmaže tému');
select pg_temp.ok(pg_temp.fails($q$select public.forum_delete_account()$q$) = false, '31: nováčik zruší účet fóra');
reset role;
select pg_temp.ok(not exists (select 1 from public.forum_profiles where user_id = 'f3100000-0000-0000-0000-000000000001')
  and not exists (select 1 from public.forum_posts where user_id = 'f3100000-0000-0000-0000-000000000001'), '31: po zrušení účtu sú príspevky preč');
select pg_temp.as_user('f3100000-0000-0000-0000-000000000002');
select pg_temp.ok(pg_temp.fails($q$select public.forum_delete_account()$q$), '31: predajca ruší účet v portáli, nie vo fóre');
reset role;
\echo HOTOVO
