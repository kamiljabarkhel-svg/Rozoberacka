-- 09_katalog_opravy.sql – kontrola katalógu (6. 11. 2026). Spúšťa sa po 08.
-- Doplnené koncové roky generácií, ktoré už skončili, a chýbajúce generácie častých áut.
-- Zdroje: Škoda Storyboard (Superb IV výroba v Bratislave od 12/2023, Kodiaq II 2024), VW (Passat B9 2024, B8 koniec 2023),
-- BMW 5 G60 (2023). Nové modely zatiaľ nemajú motorizácie – inzerát bez motorizácie pasuje na všetky.

update public.models set year_to = 2023 where name = 'Superb III' and brand_id = (select id from public.brands where name = 'Škoda');
update public.models set year_to = 2024 where name = 'Kodiaq' and brand_id = (select id from public.brands where name = 'Škoda');
update public.models set year_to = 2023 where name = 'Passat B8' and brand_id = (select id from public.brands where name = 'Volkswagen');
update public.models set year_to = 2024 where name = 'Tiguan II (AD)' and brand_id = (select id from public.brands where name = 'Volkswagen');
update public.models set year_to = 2023 where name = '5 (G30)' and brand_id = (select id from public.brands where name = 'BMW');
update public.models set year_to = 2023 where name = 'Kona' and brand_id = (select id from public.brands where name = 'Hyundai');

insert into public.models (brand_id, name, year_from, year_to) select id, 'Superb I', 2001, 2008 from public.brands where name = 'Škoda' on conflict (brand_id, name) do nothing;
insert into public.models (brand_id, name, year_from, year_to) select id, 'Superb IV', 2024, null from public.brands where name = 'Škoda' on conflict (brand_id, name) do nothing;
insert into public.models (brand_id, name, year_from, year_to) select id, 'Kodiaq II', 2024, null from public.brands where name = 'Škoda' on conflict (brand_id, name) do nothing;
insert into public.models (brand_id, name, year_from, year_to) select id, 'Passat B9', 2024, null from public.brands where name = 'Volkswagen' on conflict (brand_id, name) do nothing;
insert into public.models (brand_id, name, year_from, year_to) select id, 'Tiguan III', 2024, null from public.brands where name = 'Volkswagen' on conflict (brand_id, name) do nothing;
insert into public.models (brand_id, name, year_from, year_to) select id, '5 (G60)', 2023, null from public.brands where name = 'BMW' on conflict (brand_id, name) do nothing;
insert into public.models (brand_id, name, year_from, year_to) select id, 'A3 (8Y)', 2020, null from public.brands where name = 'Audi' on conflict (brand_id, name) do nothing;
insert into public.models (brand_id, name, year_from, year_to) select id, 'A6 C8', 2018, null from public.brands where name = 'Audi' on conflict (brand_id, name) do nothing;
insert into public.models (brand_id, name, year_from, year_to) select id, 'Q5 (FY)', 2017, null from public.brands where name = 'Audi' on conflict (brand_id, name) do nothing;
insert into public.models (brand_id, name, year_from, year_to) select id, 'Kona II', 2023, null from public.brands where name = 'Hyundai' on conflict (brand_id, name) do nothing;
insert into public.models (brand_id, name, year_from, year_to) select id, 'Tucson IV', 2020, null from public.brands where name = 'Hyundai' on conflict (brand_id, name) do nothing;
insert into public.models (brand_id, name, year_from, year_to) select id, 'i10 III', 2019, null from public.brands where name = 'Hyundai' on conflict (brand_id, name) do nothing;
insert into public.models (brand_id, name, year_from, year_to) select id, 'i20 III', 2020, null from public.brands where name = 'Hyundai' on conflict (brand_id, name) do nothing;
insert into public.models (brand_id, name, year_from, year_to) select id, 'Ceed III', 2018, null from public.brands where name = 'Kia' on conflict (brand_id, name) do nothing;
insert into public.models (brand_id, name, year_from, year_to) select id, 'Sportage V', 2021, null from public.brands where name = 'Kia' on conflict (brand_id, name) do nothing;
insert into public.models (brand_id, name, year_from, year_to) select id, 'Picanto III', 2017, null from public.brands where name = 'Kia' on conflict (brand_id, name) do nothing;
insert into public.models (brand_id, name, year_from, year_to) select id, 'Rio IV', 2017, null from public.brands where name = 'Kia' on conflict (brand_id, name) do nothing;
