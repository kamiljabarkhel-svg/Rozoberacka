-- Testy pre 11 (správca len s dvojitým overením).
\set ON_ERROR_STOP 1
create or replace function pg_temp.as_user(uid text, aal text) returns void language plpgsql as $$
begin
  perform set_config('request.jwt.claims', json_build_object('sub', uid, 'role', 'authenticated', 'aal', aal)::text, false);
  perform set_config('request.jwt.claim.sub', uid, false);
  perform set_config('request.headers', '{"x-forwarded-for":"9.9.9.9"}', false);
end $$;
create or replace function pg_temp.ok(cond boolean, msg text) returns void language plpgsql as $$
begin if not coalesce(cond, false) then raise exception 'ZLYHAL: %', msg; end if; raise notice 'OK  %', msg; end $$;

insert into auth.users (id, email) values ('a1111111-0000-0000-0000-0000000000a1','spravca@t.sk'),('a2222222-0000-0000-0000-0000000000a2','predajca@t.sk') on conflict do nothing;
insert into public.sellers (id, name, city) values ('a2222222-0000-0000-0000-0000000000a2','Vrak A2','Senica') on conflict do nothing;
insert into public.admins (user_id) values ('a1111111-0000-0000-0000-0000000000a1') on conflict do nothing;
insert into public.listings (seller_id,name,brand_id,model_id,year,category_id,oem,price,city,description,warranty)
select 'a2222222-0000-0000-0000-0000000000a2','Zrkadlo test A2',b.id,m.id,2014,'kar','5J1857507',30,'Senica','Zrkadlo ľavé, funkčné, bez prasklín.','12 mesiacov'
from brands b join models m on m.brand_id = b.id where b.name = 'Škoda' limit 1;
insert into public.reports (listing_id, reason, note) select id, 'Iné', 'test nahlásenia' from public.listings where name = 'Zrkadlo test A2';

-- správca len s heslom (aal1)
select pg_temp.as_user('a1111111-0000-0000-0000-0000000000a1', 'aal1'); set role authenticated;
select pg_temp.ok(not public.is_admin(), 'správca bez kódu z mobilu nie je správca');
select pg_temp.ok(public.admin_candidate(), 'web vie, že má ponúknuť zadanie kódu');
do $$ begin
  begin perform public.admin_stats(); raise exception 'x';
  exception when others then perform pg_temp.ok(sqlerrm like 'Potvrďte prihlásenie kódom%', 'funkcie správcu bez kódu odmietnu'); end;
end $$;
select pg_temp.ok((select count(*) from public.reports) = 0, 'nahlásenia bez kódu nevidí');
select pg_temp.ok((select count(*) from public.admin_log) = 0, 'záznam akcií bez kódu nevidí');
reset role;

-- správca s kódom (aal2)
select pg_temp.as_user('a1111111-0000-0000-0000-0000000000a1', 'aal2'); set role authenticated;
select pg_temp.ok(public.is_admin(), 'správca s kódom z mobilu je správca');
select pg_temp.ok((select count(*) from public.reports where note = 'test nahlásenia') = 1, 'nahlásenia s kódom vidí');
select pg_temp.ok((public.admin_stats() ->> 'sellers') is not null, 'funkcie správcu s kódom fungujú');
reset role;

-- predajca s kódom nie je správca
select pg_temp.as_user('a2222222-0000-0000-0000-0000000000a2', 'aal2'); set role authenticated;
select pg_temp.ok(not public.is_admin() and not public.admin_candidate(), 'predajca ani s kódom nie je správca');
do $$ begin
  begin perform public.admin_stats(); raise exception 'x';
  exception when others then perform pg_temp.ok(sqlerrm like 'Len pre správcu%', 'predajcovi funkcie správcu odmietnu'); end;
end $$;
reset role;

-- verejnosť
select set_config('request.jwt.claims', '{"role":"anon"}', false); set role anon;
do $$ begin
  begin perform public.admin_candidate(); raise exception 'x';
  exception when insufficient_privilege then perform pg_temp.ok(true, 'verejnosť funkciu admin_candidate nemôže volať'); end;
end $$;
reset role;
\echo HOTOVO
