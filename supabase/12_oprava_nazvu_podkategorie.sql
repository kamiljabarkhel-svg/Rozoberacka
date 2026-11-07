-- 12: oprava preklepu v názve podkategórie (7. 11. 2026). Správne „poloos – poloosi“.
-- Adresa stránky sa zmení z /kategoria/prevodovka/polosi-a-klby na /kategoria/prevodovka/poloosi-a-klby (zatiaľ bez inzerátov).
update public.subcategories set name = 'Poloosi a kĺby' where category_id = 'pr' and name = 'Polosi a kĺby';
