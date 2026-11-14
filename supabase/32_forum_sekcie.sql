-- 32: Fórum – všeobecná diskusia a rady k súčiastkam nad sekciami podľa značiek (želanie majiteľa 14. 11. 2026).
begin;
insert into public.forum_sections (id, parent_id, name, description, sort) values
  ('diskusia', null, 'Diskusia', 'Všeobecné témy, rady a nápady – nielen k jednej značke.', 0)
on conflict (id) do update set name = excluded.name, description = excluded.description, sort = excluded.sort, parent_id = null;
insert into public.forum_sections (id, parent_id, name, description, sort) values
  ('vseobecna-diskusia', 'diskusia', 'Všeobecná diskusia', 'O autách, cestovaní, servisoch, STK a všetkom ostatnom okolo vozidiel.', 1),
  ('rady-suciastky', 'diskusia', 'Rady a nápady k súčiastkam', 'Kde zohnať diel, čím ho nahradiť, ako zistiť číslo dielu, skúsenosti s výrobcami dielov.', 2)
on conflict (id) do update set parent_id = excluded.parent_id, name = excluded.name, description = excluded.description, sort = excluded.sort;
update public.forum_sections set name = 'Technické otázky a poruchy podľa značky', sort = 1 where id = 'technika';
commit;
