-- 29: Veterány – nový druh vozidla „veterany“ (osobné autá, ktorých výroba sa začala najneskôr v roku 1995). 13. 11. 2026. Spúšťa sa po 28.
--  * Kontroly druhu vozidla v models, listings a car_listings pripúšťajú 'veterany'.
--  * Ročník inzerátu môže byť od roku 1900 (predvojnové autá).
--  * Kategórie pre osobné autá platia aj pre veterány; „Hybrid a elektropohon“ pre veterány nie.
--  * Nová univerzálna kategória „Dobové doplnky, emblémy a literatúra“ (len pre veterány) – auto a číslo dielu nepovinné.
--  * Číslo dielu (OEM) bolo v databáze vždy nepovinné (overuje sa len dĺžka, ak je vyplnené) – pri veteránoch ho nepovinné robí aj formulár.
--  Katalóg veteránov je v 30_katalog_veterany.sql (spúšťa sa po tomto súbore).

begin;

-- kontroly druhu vozidla: zmazať staré (nech sa volajú akokoľvek) a pridať nové
do $$
declare r record;
begin
  for r in select c.conname, t.relname from pg_constraint c join pg_class t on t.oid = c.conrelid join pg_namespace n on n.oid = t.relnamespace
           where n.nspname = 'public' and c.contype = 'c' and t.relname in ('models', 'listings', 'car_listings')
             and pg_get_constraintdef(c.oid) like '%''motorky''%' and pg_get_constraintdef(c.oid) not like '%Štvorkolka%'
  loop
    execute format('alter table public.%I drop constraint %I', r.relname, r.conname);
  end loop;
end $$;
alter table public.models add constraint models_vehicle_type_check
  check (vehicle_type in ('osobne', 'dodavky', 'nakladne', 'autobusy', 'motorky', 'veterany'));
alter table public.listings add constraint listings_vtype_check
  check (vtype in ('osobne', 'dodavky', 'nakladne', 'autobusy', 'motorky', 'veterany'));
alter table public.car_listings add constraint car_listings_vehicle_type_check
  check (vehicle_type in ('osobne', 'dodavky', 'nakladne', 'autobusy', 'motorky', 'veterany'));

alter table public.listings drop constraint if exists listings_year_range;
alter table public.listings add constraint listings_year_range check (year is null or year between 1900 and 2100);

-- kategórie
update public.categories set vtypes = array_append(vtypes, 'veterany')
  where vtypes is not null and 'osobne' = any(vtypes) and not ('veterany' = any(vtypes));
update public.categories set vtypes = '{osobne,dodavky,nakladne,autobusy,motorky}' where id = 'ev';

insert into public.categories (id, name, sort, vtypes, universal)
  values ('vet', 'Dobové doplnky, emblémy a literatúra', 33, '{veterany}', true)
  on conflict (id) do update set name = excluded.name, sort = excluded.sort, vtypes = excluded.vtypes, universal = excluded.universal;
insert into public.subcategories (category_id, name, sort) values
  ('vet', 'Emblémy, znaky a nápisy', 1),
  ('vet', 'Chrómové lišty, nárazníky a ozdoby', 2),
  ('vet', 'Dobové rádiá a reproduktory', 3),
  ('vet', 'Dobové príslušenstvo a doplnky', 4),
  ('vet', 'Návody na obsluhu a servisné knižky', 5),
  ('vet', 'Dielenské príručky a katalógy dielov', 6),
  ('vet', 'Prospekty, plagáty a modely', 7),
  ('vet', 'Náradie a zdviháky z výbavy', 8),
  ('vet', 'Iné dobové doplnky', 9)
  on conflict (category_id, name) do nothing;

commit;
