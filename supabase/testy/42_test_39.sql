-- Test pre 39: náhradné čísla dielu a podobné čísla
\set ON_ERROR_STOP 1
create or replace function pg_temp.ok(cond boolean, msg text) returns void language plpgsql as $$
begin if not coalesce(cond, false) then raise exception 'ZLYHAL: %', msg; end if; raise notice 'OK  %', msg; end $$;
insert into auth.users (id, email, email_confirmed_at) values ('a3900000-0000-0000-0000-000000000001', 'cisla39@test.invalid', now());
insert into public.sellers (id, name, city, seller_type) values ('a3900000-0000-0000-0000-000000000001', 'Čísla 39', 'Žilina', 'Súkromná osoba');
insert into public.listings (seller_id, name, category_id, brand_id, price, city, description, warranty, condition, vtype, oem, oem_alt) values
 ('a3900000-0000-0000-0000-000000000001', 'Vstrekovač t39a', 'ine', (select id from public.brands where name = 'Škoda'), 50, 'Žilina', 'Vstrekovač odskúšaný, bez netesností, test.', 'Bez záruky', 'Dobrý', 'osobne', '9ZZ 130 277', array['9ZZ130277B', '9yy-555-111']),
 ('a3900000-0000-0000-0000-000000000001', 'Vstrekovač t39b', 'ine', (select id from public.brands where name = 'Škoda'), 55, 'Žilina', 'Vstrekovač odskúšaný, bez netesností, test.', 'Bez záruky', 'Dobrý', 'osobne', '9ZZ130277Q', null),
 ('a3900000-0000-0000-0000-000000000001', 'Vstrekovač t39c', 'ine', (select id from public.brands where name = 'Škoda'), 60, 'Žilina', 'Vstrekovač odskúšaný, bez netesností, test.', 'Bez záruky', 'Dobrý', 'osobne', '9ZZ130999', null);
select pg_temp.ok((public.search_listings('{"q":"9YY555111"}') -> 'total')::int = 1, '39: náhradné číslo nájde diel (bez pomlčiek)');
select pg_temp.ok((public.search_listings('{"q":"9yy 555 111"}') -> 'total')::int = 1, '39: náhradné číslo s medzerami');
select pg_temp.ok((public.search_listings('{"q":"9ZZ130277"}') -> 'total')::int >= 1, '39: hlavné číslo funguje ďalej');
select pg_temp.ok((public.search_listings('{"q":"9YY555111"}') -> 'items' -> 0 -> 'oem_alt') ? '9yy-555-111', '39: výsledok obsahuje náhradné čísla');
select pg_temp.ok(public.similar_oems('9ZZ130277') @> '[{"oem":"9ZZ130277Q","n":1}]', '39: podobné číslo s písmenom na konci');
select pg_temp.ok(public.similar_oems('9ZZ130277') @> '[{"oem":"9ZZ130277B"}]', '39: podobné číslo aj z náhradných čísel');
select pg_temp.ok(not public.similar_oems('9ZZ130277') @> '[{"oem":"9ZZ130277"}]', '39: hľadané číslo nie je medzi podobnými');
select pg_temp.ok(not public.similar_oems('9ZZ130277') @> '[{"oem":"9ZZ130999"}]', '39: iné číslo nie je podobné');
select pg_temp.ok(public.similar_oems('9ZZ130277Q') @> '[{"oem":"9ZZ130277"}]', '39: z čísla s písmenom nájde základ');
select pg_temp.ok(public.similar_oems('ab') = '[]', '39: krátke číslo nič nevráti');
do $$ begin
  begin
    update public.listings set oem_alt = array['12'] where name = 'Vstrekovač t39c';
    raise exception 'ZLYHAL: 39: krátke náhradné číslo prešlo';
  exception when check_violation then raise notice 'OK  39: krátke náhradné číslo odmietnuté'; end;
  begin
    update public.listings set oem_alt = array['AAAA1','AAAA2','AAAA3','AAAA4','AAAA5','AAAA6','AAAA7','AAAA8','AAAA9','AAAA10','AAAA11'] where name = 'Vstrekovač t39c';
    raise exception 'ZLYHAL: 39: 11 čísel prešlo';
  exception when check_violation then raise notice 'OK  39: najviac 10 náhradných čísel'; end;
end $$;
update public.listings set status = 'paused' where name = 'Vstrekovač t39b';
select pg_temp.ok(not public.similar_oems('9ZZ130277') @> '[{"oem":"9ZZ130277Q"}]', '39: pozastavený diel sa neráta');
set role anon;
select pg_temp.ok(public.similar_oems('9ZZ130277') @> '[{"oem":"9ZZ130277B"}]', '39: podobné čísla vidí aj návštevník');
select pg_temp.ok((public.search_listings('{"q":"9YY555111"}') -> 'total')::int = 1, '39: náhradné číslo hľadá aj návštevník');
reset role;
