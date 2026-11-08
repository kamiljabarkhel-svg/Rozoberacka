-- 17_katalog_opravy.sql – oprava katalógu po kontrole (8. 11. 2026). Spúšťa sa po 16.
-- Arteon: facelift 2020 nie je nová generácia, výroba skončila 2024.
-- Odstránené neisté budúce generácie (zatiaľ ich nemožno overiť). Mažú sa len modely, na ktoré nič neodkazuje.
update public.models set year_to = 2024 where name = 'Arteon' and brand_id = (select id from public.brands where name = 'Volkswagen');
with x(b, m) as (values ('Volkswagen', 'Arteon II'), ('Škoda', 'Epiq'), ('Škoda', 'Octavia V'), ('Volkswagen', 'Touran III'), ('Volkswagen', 'Polo VII'),
  ('BMW', '3 (G50)'), ('Kia', 'Rio V'), ('Kia', 'Picanto IV'), ('Kia', 'Sportage VI'), ('Hyundai', 'i30 IV'), ('Hyundai', 'Tucson V')),
del as (
  select m.id from public.models m join public.brands b on b.id = m.brand_id join x on x.b = b.name and x.m = m.name
  where not exists (select 1 from public.listings l where l.model_id = m.id)
    and not exists (select 1 from public.listing_fits f where f.model_id = m.id)
    and not exists (select 1 from public.donor_cars d where d.model_id = m.id)
    and not exists (select 1 from public.part_requests r where r.model_id = m.id)
)
delete from public.models where id in (select id from del);   -- motorizácie sa zmažú s modelom (on delete cascade)
