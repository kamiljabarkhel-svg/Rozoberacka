-- Testy pre 40: okruh v km – hľadanie vo viacerých mestách naraz (p.cities), kľúč "v".
\set ON_ERROR_STOP 1
create or replace function pg_temp.ok(cond boolean, msg text) returns void language plpgsql as $$
begin if not coalesce(cond, false) then raise exception 'ZLYHAL: %', msg; end if; raise notice 'OK  %', msg; end $$;
create or replace function pg_temp.n(p jsonb) returns int language sql as $$
  select (public.search_listings(p || jsonb_build_object('seller', 'a4011111-0000-0000-0000-0000000000a1')) ->> 'total')::int $$;
insert into auth.users (id, email, email_confirmed_at) values ('a4011111-0000-0000-0000-0000000000a1', 'okruh40@test.invalid', now());
insert into public.sellers (id, name, city, seller_type) values ('a4011111-0000-0000-0000-0000000000a1', 'Okruh 40', 'Nitra', 'Súkromná osoba');
insert into public.listings (seller_id, name, category_id, oem, price, city, description, warranty, condition)
values ('a4011111-0000-0000-0000-0000000000a1', 'Diel Nitra', 'ine', '11111111', 20, 'Nitra', 'Popis dielu dosť dlhý na kontrolu.', 'Bez záruky', 'Dobrý'),
       ('a4011111-0000-0000-0000-0000000000a1', 'Diel Trnava', 'ine', '22222222', 20, 'Trnava', 'Popis dielu dosť dlhý na kontrolu.', 'Bez záruky', 'Dobrý'),
       ('a4011111-0000-0000-0000-0000000000a1', 'Diel Košice', 'ine', '33333333', 20, 'Košice', 'Popis dielu dosť dlhý na kontrolu.', 'Bez záruky', 'Dobrý');

select pg_temp.ok(pg_temp.n('{}') = 3, '40: bez mesta všetky 3');
select pg_temp.ok(pg_temp.n('{"city":"Nitra"}') = 1, '40: jedno mesto');
select pg_temp.ok(pg_temp.n('{"cities":["Nitra","Trnava"]}') = 2, '40: okruh – dve mestá');
select pg_temp.ok(pg_temp.n('{"cities":["Žilina"]}') = 0, '40: mesto bez inzerátov');
select pg_temp.ok(pg_temp.n('{"cities":"Nitra"}') = 3, '40: zlý tvar cities sa ignoruje');
select pg_temp.ok((public.search_listings('{}') ->> 'v')::int = 40, '40: výsledok má v = 40');

\echo HOTOVO
