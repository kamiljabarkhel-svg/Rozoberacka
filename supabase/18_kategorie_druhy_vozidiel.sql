-- 18_kategorie_druhy_vozidiel.sql – oveľa viac kategórií a podkategórií, druhy vozidiel, parametre pneumatík a diskov (8. 11. 2026). Spúšťa sa po 17.
-- Druh vozidla je pri modeli (models.vehicle_type), lebo jedna značka vyrába viac druhov (Mercedes-Benz: autá, dodávky, nákladné, autobusy).
-- Kategória s vtypes platí len pre uvedené druhy (napr. kapotáž len pre motorky); null = pre všetky.
alter table public.models add column if not exists vehicle_type text not null default 'osobne'
  check (vehicle_type in ('osobne', 'dodavky', 'nakladne', 'autobusy', 'motorky'));
create index if not exists models_vehicle_type on public.models (vehicle_type, brand_id);
alter table public.categories add column if not exists vtypes text[];
grant select on public.models, public.categories, public.subcategories to anon, authenticated;

insert into public.categories (id, name, sort) values ('bez', 'Airbagy a bezpečnosť', 12) on conflict (id) do update set name = excluded.name, sort = excluded.sort;
insert into public.categories (id, name, sort) values ('mm', 'Audio, navigácia a multimédiá', 13) on conflict (id) do update set name = excluded.name, sort = excluded.sort;
insert into public.categories (id, name, sort) values ('ev', 'Hybrid a elektropohon', 14) on conflict (id) do update set name = excluded.name, sort = excluded.sort;
insert into public.categories (id, name, sort) values ('vyb', 'Príslušenstvo a výbava', 15) on conflict (id) do update set name = excluded.name, sort = excluded.sort;
insert into public.categories (id, name, sort) values ('nad', 'Nadstavby a hydraulika', 16) on conflict (id) do update set name = excluded.name, sort = excluded.sort;
insert into public.categories (id, name, sort) values ('bus', 'Vybavenie autobusu', 17) on conflict (id) do update set name = excluded.name, sort = excluded.sort;
insert into public.categories (id, name, sort) values ('mrm', 'Rám, kapotáž a sedlo', 18) on conflict (id) do update set name = excluded.name, sort = excluded.sort;
insert into public.categories (id, name, sort) values ('mpo', 'Pohon a reťaz', 19) on conflict (id) do update set name = excluded.name, sort = excluded.sort;
insert into public.categories (id, name, sort) values ('mri', 'Riadidlá a ovládanie', 20) on conflict (id) do update set name = excluded.name, sort = excluded.sort;
insert into public.categories (id, name, sort) values ('mvi', 'Vidlice a tlmiče', 21) on conflict (id) do update set name = excluded.name, sort = excluded.sort;
update public.categories set name = 'Pneumatiky a disky' where id = 'kol';
update public.categories set vtypes = '{dodavky,nakladne}' where id = 'nad';
update public.categories set vtypes = '{autobusy}' where id = 'bus';
update public.categories set vtypes = '{motorky}' where id = 'mrm';
update public.categories set vtypes = '{motorky}' where id = 'mpo';
update public.categories set vtypes = '{motorky}' where id = 'mri';
update public.categories set vtypes = '{motorky}' where id = 'mvi';
update public.categories set vtypes = '{osobne,dodavky,nakladne,autobusy}' where id = 'int';
insert into public.subcategories (category_id, name, sort) values ('kar', 'Prahy a podlahy', 20) on conflict (category_id, name) do nothing;
insert into public.subcategories (category_id, name, sort) values ('kar', 'Strechy a strešné okná', 21) on conflict (category_id, name) do nothing;
insert into public.subcategories (category_id, name, sort) values ('kar', 'Zámky a kľučky', 22) on conflict (category_id, name) do nothing;
insert into public.subcategories (category_id, name, sort) values ('kar', 'Lišty a spojlery', 23) on conflict (category_id, name) do nothing;
insert into public.subcategories (category_id, name, sort) values ('kar', 'Výstuhy nárazníkov', 24) on conflict (category_id, name) do nothing;
insert into public.subcategories (category_id, name, sort) values ('kar', 'Predné čelá a nosníky chladiča', 25) on conflict (category_id, name) do nothing;
insert into public.subcategories (category_id, name, sort) values ('kar', 'Podbehy', 26) on conflict (category_id, name) do nothing;
insert into public.subcategories (category_id, name, sort) values ('kar', 'Kryty motora a podvozku', 27) on conflict (category_id, name) do nothing;
insert into public.subcategories (category_id, name, sort) values ('kar', 'Zadné panely a štvrte', 28) on conflict (category_id, name) do nothing;
insert into public.subcategories (category_id, name, sort) values ('kar', 'Stĺpiky a skelet', 29) on conflict (category_id, name) do nothing;
insert into public.subcategories (category_id, name, sort) values ('kar', 'Pánty a dorazy dverí', 30) on conflict (category_id, name) do nothing;
insert into public.subcategories (category_id, name, sort) values ('kar', 'Mechanizmy okien', 31) on conflict (category_id, name) do nothing;
insert into public.subcategories (category_id, name, sort) values ('kar', 'Tesnenia', 32) on conflict (category_id, name) do nothing;
insert into public.subcategories (category_id, name, sort) values ('kar', 'Palivové dvierka', 33) on conflict (category_id, name) do nothing;
insert into public.subcategories (category_id, name, sort) values ('kar', 'Emblémy a nápisy', 34) on conflict (category_id, name) do nothing;
insert into public.subcategories (category_id, name, sort) values ('kar', 'Stierače a ostrekovače', 35) on conflict (category_id, name) do nothing;
insert into public.subcategories (category_id, name, sort) values ('kar', 'Kabíny (nákladné)', 36) on conflict (category_id, name) do nothing;
insert into public.subcategories (category_id, name, sort) values ('kar', 'Rámy a podvozky (nákladné)', 37) on conflict (category_id, name) do nothing;
insert into public.subcategories (category_id, name, sort) values ('sv', 'Brzdové svetlá', 20) on conflict (category_id, name) do nothing;
insert into public.subcategories (category_id, name, sort) values ('sv', 'Denné svietenie', 21) on conflict (category_id, name) do nothing;
insert into public.subcategories (category_id, name, sort) values ('sv', 'Osvetlenie ŠPZ', 22) on conflict (category_id, name) do nothing;
insert into public.subcategories (category_id, name, sort) values ('sv', 'Vnútorné osvetlenie', 23) on conflict (category_id, name) do nothing;
insert into public.subcategories (category_id, name, sort) values ('sv', 'Xenónové výbojky a zapaľovače', 24) on conflict (category_id, name) do nothing;
insert into public.subcategories (category_id, name, sort) values ('sv', 'LED a xenónové moduly', 25) on conflict (category_id, name) do nothing;
insert into public.subcategories (category_id, name, sort) values ('sv', 'Riadiace jednotky svetiel', 26) on conflict (category_id, name) do nothing;
insert into public.subcategories (category_id, name, sort) values ('sv', 'Pracovné a výstražné svetlá', 27) on conflict (category_id, name) do nothing;
insert into public.subcategories (category_id, name, sort) values ('sv', 'Odrazky', 28) on conflict (category_id, name) do nothing;
insert into public.subcategories (category_id, name, sort) values ('sv', 'Ostrekovače svetlometov', 29) on conflict (category_id, name) do nothing;
insert into public.subcategories (category_id, name, sort) values ('el', 'Snímače a senzory', 20) on conflict (category_id, name) do nothing;
insert into public.subcategories (category_id, name, sort) values ('el', 'Poistkové skrine a relé', 21) on conflict (category_id, name) do nothing;
insert into public.subcategories (category_id, name, sort) values ('el', 'Motorčeky stieračov', 22) on conflict (category_id, name) do nothing;
insert into public.subcategories (category_id, name, sort) values ('el', 'Motorčeky okien', 23) on conflict (category_id, name) do nothing;
insert into public.subcategories (category_id, name, sort) values ('el', 'Akumulátory 12 V / 24 V', 24) on conflict (category_id, name) do nothing;
insert into public.subcategories (category_id, name, sort) values ('el', 'Zapaľovacie cievky', 25) on conflict (category_id, name) do nothing;
insert into public.subcategories (category_id, name, sort) values ('el', 'Zapaľovacie a žeraviace sviečky', 26) on conflict (category_id, name) do nothing;
insert into public.subcategories (category_id, name, sort) values ('el', 'Klaksóny', 27) on conflict (category_id, name) do nothing;
insert into public.subcategories (category_id, name, sort) values ('el', 'Centrálne zamykanie', 28) on conflict (category_id, name) do nothing;
insert into public.subcategories (category_id, name, sort) values ('el', 'Kľúče a imobilizéry', 29) on conflict (category_id, name) do nothing;
insert into public.subcategories (category_id, name, sort) values ('el', 'Komfortné jednotky (BCM)', 30) on conflict (category_id, name) do nothing;
insert into public.subcategories (category_id, name, sort) values ('el', 'Ovládače na volante', 31) on conflict (category_id, name) do nothing;
insert into public.subcategories (category_id, name, sort) values ('el', 'Snímače dažďa a svetla', 32) on conflict (category_id, name) do nothing;
insert into public.subcategories (category_id, name, sort) values ('el', 'Tachografy', 33) on conflict (category_id, name) do nothing;
insert into public.subcategories (category_id, name, sort) values ('motor', 'Bloky motora', 20) on conflict (category_id, name) do nothing;
insert into public.subcategories (category_id, name, sort) values ('motor', 'Kľukové hriadele', 21) on conflict (category_id, name) do nothing;
insert into public.subcategories (category_id, name, sort) values ('motor', 'Vačkové hriadele', 22) on conflict (category_id, name) do nothing;
insert into public.subcategories (category_id, name, sort) values ('motor', 'Piesty a ojnice', 23) on conflict (category_id, name) do nothing;
insert into public.subcategories (category_id, name, sort) values ('motor', 'Olejové čerpadlá', 24) on conflict (category_id, name) do nothing;
insert into public.subcategories (category_id, name, sort) values ('motor', 'Olejové vane', 25) on conflict (category_id, name) do nothing;
insert into public.subcategories (category_id, name, sort) values ('motor', 'Chladiče oleja', 26) on conflict (category_id, name) do nothing;
insert into public.subcategories (category_id, name, sort) values ('motor', 'Sacie potrubia', 27) on conflict (category_id, name) do nothing;
insert into public.subcategories (category_id, name, sort) values ('motor', 'Výfukové zvody', 28) on conflict (category_id, name) do nothing;
insert into public.subcategories (category_id, name, sort) values ('motor', 'Škrtiace klapky', 29) on conflict (category_id, name) do nothing;
insert into public.subcategories (category_id, name, sort) values ('motor', 'EGR ventily a chladiče', 30) on conflict (category_id, name) do nothing;
insert into public.subcategories (category_id, name, sort) values ('motor', 'Uloženia motora', 31) on conflict (category_id, name) do nothing;
insert into public.subcategories (category_id, name, sort) values ('motor', 'Veká ventilov', 32) on conflict (category_id, name) do nothing;
insert into public.subcategories (category_id, name, sort) values ('motor', 'Kryty rozvodov', 33) on conflict (category_id, name) do nothing;
insert into public.subcategories (category_id, name, sort) values ('motor', 'Remenice a napínače', 34) on conflict (category_id, name) do nothing;
insert into public.subcategories (category_id, name, sort) values ('motor', 'Vákuové pumpy', 35) on conflict (category_id, name) do nothing;
insert into public.subcategories (category_id, name, sort) values ('motor', 'Snímače motora', 36) on conflict (category_id, name) do nothing;
insert into public.subcategories (category_id, name, sort) values ('motor', 'Motory s prevodovkou (sady)', 37) on conflict (category_id, name) do nothing;
insert into public.subcategories (category_id, name, sort) values ('pr', 'Rozdeľovacie prevodovky', 20) on conflict (category_id, name) do nothing;
insert into public.subcategories (category_id, name, sort) values ('pr', 'Diferenciály', 21) on conflict (category_id, name) do nothing;
insert into public.subcategories (category_id, name, sort) values ('pr', 'Kardany', 22) on conflict (category_id, name) do nothing;
insert into public.subcategories (category_id, name, sort) values ('pr', 'Radiace páky a lanká', 23) on conflict (category_id, name) do nothing;
insert into public.subcategories (category_id, name, sort) values ('pr', 'Mechatroniky a riadiace jednotky prevodovky', 24) on conflict (category_id, name) do nothing;
insert into public.subcategories (category_id, name, sort) values ('pr', 'Meniče momentu', 25) on conflict (category_id, name) do nothing;
insert into public.subcategories (category_id, name, sort) values ('pr', 'Retardéry', 26) on conflict (category_id, name) do nothing;
insert into public.subcategories (category_id, name, sort) values ('pr', 'Ložiská a hriadele prevodovky', 27) on conflict (category_id, name) do nothing;
insert into public.subcategories (category_id, name, sort) values ('pod', 'Stabilizátory a tyčky', 20) on conflict (category_id, name) do nothing;
insert into public.subcategories (category_id, name, sort) values ('pod', 'Riadiace tyče a čapy', 21) on conflict (category_id, name) do nothing;
insert into public.subcategories (category_id, name, sort) values ('pod', 'Hrebeňové riadenie', 22) on conflict (category_id, name) do nothing;
insert into public.subcategories (category_id, name, sort) values ('pod', 'Servočerpadlá', 23) on conflict (category_id, name) do nothing;
insert into public.subcategories (category_id, name, sort) values ('pod', 'Elektrické posilňovače riadenia', 24) on conflict (category_id, name) do nothing;
insert into public.subcategories (category_id, name, sort) values ('pod', 'Nápravnice', 25) on conflict (category_id, name) do nothing;
insert into public.subcategories (category_id, name, sort) values ('pod', 'Pneumatické pruženie', 26) on conflict (category_id, name) do nothing;
insert into public.subcategories (category_id, name, sort) values ('pod', 'Silentbloky', 27) on conflict (category_id, name) do nothing;
insert into public.subcategories (category_id, name, sort) values ('pod', 'Listové pružiny (nákladné)', 28) on conflict (category_id, name) do nothing;
insert into public.subcategories (category_id, name, sort) values ('pod', 'Nápravy (nákladné)', 29) on conflict (category_id, name) do nothing;
insert into public.subcategories (category_id, name, sort) values ('brz', 'Brzdové doštičky', 20) on conflict (category_id, name) do nothing;
insert into public.subcategories (category_id, name, sort) values ('brz', 'Brzdové čeľuste', 21) on conflict (category_id, name) do nothing;
insert into public.subcategories (category_id, name, sort) values ('brz', 'Bubny', 22) on conflict (category_id, name) do nothing;
insert into public.subcategories (category_id, name, sort) values ('brz', 'Brzdové valčeky', 23) on conflict (category_id, name) do nothing;
insert into public.subcategories (category_id, name, sort) values ('brz', 'Hadice a potrubia', 24) on conflict (category_id, name) do nothing;
insert into public.subcategories (category_id, name, sort) values ('brz', 'Ručná brzda a lanká', 25) on conflict (category_id, name) do nothing;
insert into public.subcategories (category_id, name, sort) values ('brz', 'Elektrická parkovacia brzda', 26) on conflict (category_id, name) do nothing;
insert into public.subcategories (category_id, name, sort) values ('brz', 'Posilňovače bŕzd', 27) on conflict (category_id, name) do nothing;
insert into public.subcategories (category_id, name, sort) values ('brz', 'Hlavné brzdové valce', 28) on conflict (category_id, name) do nothing;
insert into public.subcategories (category_id, name, sort) values ('brz', 'Snímače ABS', 29) on conflict (category_id, name) do nothing;
insert into public.subcategories (category_id, name, sort) values ('brz', 'Vzduchové brzdy a kompresory', 30) on conflict (category_id, name) do nothing;
insert into public.subcategories (category_id, name, sort) values ('chl', 'Kondenzátory', 20) on conflict (category_id, name) do nothing;
insert into public.subcategories (category_id, name, sort) values ('chl', 'Výparníky', 21) on conflict (category_id, name) do nothing;
insert into public.subcategories (category_id, name, sort) values ('chl', 'Termostaty', 22) on conflict (category_id, name) do nothing;
insert into public.subcategories (category_id, name, sort) values ('chl', 'Vodné čerpadlá', 23) on conflict (category_id, name) do nothing;
insert into public.subcategories (category_id, name, sort) values ('chl', 'Výmenníky kúrenia', 24) on conflict (category_id, name) do nothing;
insert into public.subcategories (category_id, name, sort) values ('chl', 'Ventilátory kúrenia', 25) on conflict (category_id, name) do nothing;
insert into public.subcategories (category_id, name, sort) values ('chl', 'Nezávislé kúrenie (Webasto, Eberspächer)', 26) on conflict (category_id, name) do nothing;
insert into public.subcategories (category_id, name, sort) values ('chl', 'Medzichladiče (intercooler)', 27) on conflict (category_id, name) do nothing;
insert into public.subcategories (category_id, name, sort) values ('chl', 'Hadice chladenia', 28) on conflict (category_id, name) do nothing;
insert into public.subcategories (category_id, name, sort) values ('chl', 'Expanzné nádobky', 29) on conflict (category_id, name) do nothing;
insert into public.subcategories (category_id, name, sort) values ('chl', 'Ovládacie panely klimatizácie', 30) on conflict (category_id, name) do nothing;
insert into public.subcategories (category_id, name, sort) values ('chl', 'Sušiče a ventily klimatizácie', 31) on conflict (category_id, name) do nothing;
insert into public.subcategories (category_id, name, sort) values ('pal', 'Vstrekovacie čerpadlá', 20) on conflict (category_id, name) do nothing;
insert into public.subcategories (category_id, name, sort) values ('pal', 'Palivové lišty', 21) on conflict (category_id, name) do nothing;
insert into public.subcategories (category_id, name, sort) values ('pal', 'Palivové filtre', 22) on conflict (category_id, name) do nothing;
insert into public.subcategories (category_id, name, sort) values ('pal', 'Regulátory tlaku', 23) on conflict (category_id, name) do nothing;
insert into public.subcategories (category_id, name, sort) values ('pal', 'AdBlue systém', 24) on conflict (category_id, name) do nothing;
insert into public.subcategories (category_id, name, sort) values ('pal', 'Lambda sondy', 25) on conflict (category_id, name) do nothing;
insert into public.subcategories (category_id, name, sort) values ('pal', 'Tlmiče výfuku', 26) on conflict (category_id, name) do nothing;
insert into public.subcategories (category_id, name, sort) values ('pal', 'Výfukové koncovky', 27) on conflict (category_id, name) do nothing;
insert into public.subcategories (category_id, name, sort) values ('pal', 'LPG a CNG zariadenia', 28) on conflict (category_id, name) do nothing;
insert into public.subcategories (category_id, name, sort) values ('pal', 'Vzduchové filtre a boxy', 29) on conflict (category_id, name) do nothing;
insert into public.subcategories (category_id, name, sort) values ('pal', 'Plniace hrdlá', 30) on conflict (category_id, name) do nothing;
insert into public.subcategories (category_id, name, sort) values ('int', 'Zadné sedadlá', 20) on conflict (category_id, name) do nothing;
insert into public.subcategories (category_id, name, sort) values ('int', 'Opierky hlavy', 21) on conflict (category_id, name) do nothing;
insert into public.subcategories (category_id, name, sort) values ('int', 'Stropy', 22) on conflict (category_id, name) do nothing;
insert into public.subcategories (category_id, name, sort) values ('int', 'Slnečné clony', 23) on conflict (category_id, name) do nothing;
insert into public.subcategories (category_id, name, sort) values ('int', 'Koberce a podlahy', 24) on conflict (category_id, name) do nothing;
insert into public.subcategories (category_id, name, sort) values ('int', 'Stredové konzoly', 25) on conflict (category_id, name) do nothing;
insert into public.subcategories (category_id, name, sort) values ('int', 'Lakťové opierky', 26) on conflict (category_id, name) do nothing;
insert into public.subcategories (category_id, name, sort) values ('int', 'Radiace kulisy a manžety', 27) on conflict (category_id, name) do nothing;
insert into public.subcategories (category_id, name, sort) values ('int', 'Pedále', 28) on conflict (category_id, name) do nothing;
insert into public.subcategories (category_id, name, sort) values ('int', 'Vnútorné kľučky', 29) on conflict (category_id, name) do nothing;
insert into public.subcategories (category_id, name, sort) values ('int', 'Odkladacie priečinky', 30) on conflict (category_id, name) do nothing;
insert into public.subcategories (category_id, name, sort) values ('int', 'Výplne kufra a kryty batožiny', 31) on conflict (category_id, name) do nothing;
insert into public.subcategories (category_id, name, sort) values ('int', 'Vnútorné spätné zrkadlá', 32) on conflict (category_id, name) do nothing;
insert into public.subcategories (category_id, name, sort) values ('int', 'Výdychy ventilácie', 33) on conflict (category_id, name) do nothing;
insert into public.subcategories (category_id, name, sort) values ('kol', 'Pneumatiky letné', 20) on conflict (category_id, name) do nothing;
insert into public.subcategories (category_id, name, sort) values ('kol', 'Pneumatiky zimné', 21) on conflict (category_id, name) do nothing;
insert into public.subcategories (category_id, name, sort) values ('kol', 'Pneumatiky celoročné', 22) on conflict (category_id, name) do nothing;
insert into public.subcategories (category_id, name, sort) values ('kol', 'Pneumatiky nákladné a autobusové', 23) on conflict (category_id, name) do nothing;
insert into public.subcategories (category_id, name, sort) values ('kol', 'Pneumatiky na motorky', 24) on conflict (category_id, name) do nothing;
insert into public.subcategories (category_id, name, sort) values ('kol', 'Rezervné a dojazdové kolesá', 25) on conflict (category_id, name) do nothing;
insert into public.subcategories (category_id, name, sort) values ('kol', 'Puklice', 26) on conflict (category_id, name) do nothing;
insert into public.subcategories (category_id, name, sort) values ('kol', 'Skrutky, matice a podložky', 27) on conflict (category_id, name) do nothing;
insert into public.subcategories (category_id, name, sort) values ('kol', 'Rozširovacie podložky', 28) on conflict (category_id, name) do nothing;
insert into public.subcategories (category_id, name, sort) values ('kol', 'Snímače tlaku (TPMS)', 29) on conflict (category_id, name) do nothing;
insert into public.subcategories (category_id, name, sort) values ('kol', 'Snehové reťaze', 30) on conflict (category_id, name) do nothing;
insert into public.subcategories (category_id, name, sort) values ('bez', 'Airbagy vodiča', 20) on conflict (category_id, name) do nothing;
insert into public.subcategories (category_id, name, sort) values ('bez', 'Airbagy spolujazdca', 21) on conflict (category_id, name) do nothing;
insert into public.subcategories (category_id, name, sort) values ('bez', 'Bočné a hlavové airbagy', 22) on conflict (category_id, name) do nothing;
insert into public.subcategories (category_id, name, sort) values ('bez', 'Riadiace jednotky airbagov', 23) on conflict (category_id, name) do nothing;
insert into public.subcategories (category_id, name, sort) values ('bez', 'Bezpečnostné pásy a predpínače', 24) on conflict (category_id, name) do nothing;
insert into public.subcategories (category_id, name, sort) values ('bez', 'Parkovacie senzory', 25) on conflict (category_id, name) do nothing;
insert into public.subcategories (category_id, name, sort) values ('bez', 'Cúvacie kamery', 26) on conflict (category_id, name) do nothing;
insert into public.subcategories (category_id, name, sort) values ('bez', 'Radary a asistenčné systémy', 27) on conflict (category_id, name) do nothing;
insert into public.subcategories (category_id, name, sort) values ('bez', 'Snímače nárazu', 28) on conflict (category_id, name) do nothing;
insert into public.subcategories (category_id, name, sort) values ('mm', 'Rádiá a autorádiá', 20) on conflict (category_id, name) do nothing;
insert into public.subcategories (category_id, name, sort) values ('mm', 'Navigácie a displeje', 21) on conflict (category_id, name) do nothing;
insert into public.subcategories (category_id, name, sort) values ('mm', 'Reproduktory a zosilňovače', 22) on conflict (category_id, name) do nothing;
insert into public.subcategories (category_id, name, sort) values ('mm', 'Antény', 23) on conflict (category_id, name) do nothing;
insert into public.subcategories (category_id, name, sort) values ('mm', 'Handsfree a moduly telefónu', 24) on conflict (category_id, name) do nothing;
insert into public.subcategories (category_id, name, sort) values ('mm', 'USB a AUX vstupy', 25) on conflict (category_id, name) do nothing;
insert into public.subcategories (category_id, name, sort) values ('mm', 'Zadné obrazovky', 26) on conflict (category_id, name) do nothing;
insert into public.subcategories (category_id, name, sort) values ('ev', 'Trakčné batérie', 20) on conflict (category_id, name) do nothing;
insert into public.subcategories (category_id, name, sort) values ('ev', 'Moduly a články batérií', 21) on conflict (category_id, name) do nothing;
insert into public.subcategories (category_id, name, sort) values ('ev', 'Elektromotory', 22) on conflict (category_id, name) do nothing;
insert into public.subcategories (category_id, name, sort) values ('ev', 'Meniče a nabíjačky', 23) on conflict (category_id, name) do nothing;
insert into public.subcategories (category_id, name, sort) values ('ev', 'Nabíjacie zásuvky a káble', 24) on conflict (category_id, name) do nothing;
insert into public.subcategories (category_id, name, sort) values ('ev', 'Hybridné moduly a generátory', 25) on conflict (category_id, name) do nothing;
insert into public.subcategories (category_id, name, sort) values ('ev', 'Vysokonapäťové káble', 26) on conflict (category_id, name) do nothing;
insert into public.subcategories (category_id, name, sort) values ('ev', 'Chladenie batérie', 27) on conflict (category_id, name) do nothing;
insert into public.subcategories (category_id, name, sort) values ('vyb', 'Ťažné zariadenia', 20) on conflict (category_id, name) do nothing;
insert into public.subcategories (category_id, name, sort) values ('vyb', 'Strešné nosiče a boxy', 21) on conflict (category_id, name) do nothing;
insert into public.subcategories (category_id, name, sort) values ('vyb', 'Koberce a vane do kufra', 22) on conflict (category_id, name) do nothing;
insert into public.subcategories (category_id, name, sort) values ('vyb', 'Rezervné kolesá a náradie', 23) on conflict (category_id, name) do nothing;
insert into public.subcategories (category_id, name, sort) values ('vyb', 'Kryty a plachty', 24) on conflict (category_id, name) do nothing;
insert into public.subcategories (category_id, name, sort) values ('vyb', 'Držiaky bicyklov', 25) on conflict (category_id, name) do nothing;
insert into public.subcategories (category_id, name, sort) values ('vyb', 'Deliace mreže a siete', 26) on conflict (category_id, name) do nothing;
insert into public.subcategories (category_id, name, sort) values ('vyb', 'Lekárničky a výstražné trojuholníky', 27) on conflict (category_id, name) do nothing;
insert into public.subcategories (category_id, name, sort) values ('nad', 'Hydraulické ruky a žeriavy', 20) on conflict (category_id, name) do nothing;
insert into public.subcategories (category_id, name, sort) values ('nad', 'Sklápače a valníky', 21) on conflict (category_id, name) do nothing;
insert into public.subcategories (category_id, name, sort) values ('nad', 'Chladiarenské agregáty', 22) on conflict (category_id, name) do nothing;
insert into public.subcategories (category_id, name, sort) values ('nad', 'Hydraulické čerpadlá a valce', 23) on conflict (category_id, name) do nothing;
insert into public.subcategories (category_id, name, sort) values ('nad', 'Točnice a ťažné zariadenia', 24) on conflict (category_id, name) do nothing;
insert into public.subcategories (category_id, name, sort) values ('nad', 'Plachty a bočnice', 25) on conflict (category_id, name) do nothing;
insert into public.subcategories (category_id, name, sort) values ('nad', 'Hydraulické čelá', 26) on conflict (category_id, name) do nothing;
insert into public.subcategories (category_id, name, sort) values ('nad', 'Skrine a nadstavby', 27) on conflict (category_id, name) do nothing;
insert into public.subcategories (category_id, name, sort) values ('bus', 'Dvere a ovládanie dverí', 20) on conflict (category_id, name) do nothing;
insert into public.subcategories (category_id, name, sort) values ('bus', 'Sedadlá pre cestujúcich', 21) on conflict (category_id, name) do nothing;
insert into public.subcategories (category_id, name, sort) values ('bus', 'Okná a poklopy', 22) on conflict (category_id, name) do nothing;
insert into public.subcategories (category_id, name, sort) values ('bus', 'Informačné panely', 23) on conflict (category_id, name) do nothing;
insert into public.subcategories (category_id, name, sort) values ('bus', 'Klimatizácia autobusu', 24) on conflict (category_id, name) do nothing;
insert into public.subcategories (category_id, name, sort) values ('bus', 'Rampy pre vozíčkarov', 25) on conflict (category_id, name) do nothing;
insert into public.subcategories (category_id, name, sort) values ('bus', 'Označovače a pokladne', 26) on conflict (category_id, name) do nothing;
insert into public.subcategories (category_id, name, sort) values ('mrm', 'Rámy', 20) on conflict (category_id, name) do nothing;
insert into public.subcategories (category_id, name, sort) values ('mrm', 'Kapotáže a plasty', 21) on conflict (category_id, name) do nothing;
insert into public.subcategories (category_id, name, sort) values ('mrm', 'Nádrže', 22) on conflict (category_id, name) do nothing;
insert into public.subcategories (category_id, name, sort) values ('mrm', 'Sedlá', 23) on conflict (category_id, name) do nothing;
insert into public.subcategories (category_id, name, sort) values ('mrm', 'Blatníky', 24) on conflict (category_id, name) do nothing;
insert into public.subcategories (category_id, name, sort) values ('mrm', 'Plexi a štíty', 25) on conflict (category_id, name) do nothing;
insert into public.subcategories (category_id, name, sort) values ('mrm', 'Stupačky', 26) on conflict (category_id, name) do nothing;
insert into public.subcategories (category_id, name, sort) values ('mrm', 'Kufre a nosiče', 27) on conflict (category_id, name) do nothing;
insert into public.subcategories (category_id, name, sort) values ('mpo', 'Reťazové sady', 20) on conflict (category_id, name) do nothing;
insert into public.subcategories (category_id, name, sort) values ('mpo', 'Rozety a pastorky', 21) on conflict (category_id, name) do nothing;
insert into public.subcategories (category_id, name, sort) values ('mpo', 'Kardany a koncové prevody', 22) on conflict (category_id, name) do nothing;
insert into public.subcategories (category_id, name, sort) values ('mpo', 'Spojky', 23) on conflict (category_id, name) do nothing;
insert into public.subcategories (category_id, name, sort) values ('mpo', 'Variátory (skútre)', 24) on conflict (category_id, name) do nothing;
insert into public.subcategories (category_id, name, sort) values ('mpo', 'Remene (skútre)', 25) on conflict (category_id, name) do nothing;
insert into public.subcategories (category_id, name, sort) values ('mri', 'Riadidlá', 20) on conflict (category_id, name) do nothing;
insert into public.subcategories (category_id, name, sort) values ('mri', 'Páčky a ovládače', 21) on conflict (category_id, name) do nothing;
insert into public.subcategories (category_id, name, sort) values ('mri', 'Zrkadlá', 22) on conflict (category_id, name) do nothing;
insert into public.subcategories (category_id, name, sort) values ('mri', 'Prístroje a tachometre', 23) on conflict (category_id, name) do nothing;
insert into public.subcategories (category_id, name, sort) values ('mri', 'Plynové rukoväte a lanká', 24) on conflict (category_id, name) do nothing;
insert into public.subcategories (category_id, name, sort) values ('mvi', 'Predné vidlice', 20) on conflict (category_id, name) do nothing;
insert into public.subcategories (category_id, name, sort) values ('mvi', 'Zadné tlmiče', 21) on conflict (category_id, name) do nothing;
insert into public.subcategories (category_id, name, sort) values ('mvi', 'Kyvné vidlice', 22) on conflict (category_id, name) do nothing;
insert into public.subcategories (category_id, name, sort) values ('mvi', 'Ložiská riadenia', 23) on conflict (category_id, name) do nothing;

-- ===================== PARAMETRE PNEUMATÍK A DISKOV =====================
-- listings.specs: tw šírka pneu (mm), tp profil (%), rd priemer (palce, R), season (letné/zimné/celoročné), tread dezén (mm),
-- dot rok výroby pneu, li index nosnosti, si index rýchlosti, rw šírka disku (J), pcd rozteč (napr. 5x112), et (mm),
-- cb stredový otvor (mm), pcs počet kusov, mat materiál disku (Hliník/Oceľ). Všetko nepovinné, kontroluje funkcia nižšie.
alter table public.listings add column if not exists specs jsonb not null default '{}';
create or replace function public.specs_ok(s jsonb) returns boolean language sql immutable as $$
  select jsonb_typeof(s) = 'object'
    and (select coalesce(bool_and(k in ('tw','tp','rd','season','tread','dot','li','si','rw','pcd','et','cb','pcs','mat')), true) from jsonb_object_keys(s) k)
    and (s->>'tw' is null or (s->>'tw') ~ '^\d{2,3}$' and (s->>'tw')::int between 100 and 460)
    and (s->>'tp' is null or (s->>'tp') ~ '^\d{2,3}$' and (s->>'tp')::int between 25 and 100)
    and (s->>'rd' is null or (s->>'rd') ~ '^\d{2}(\.5)?$' and (s->>'rd')::numeric between 10 and 26)
    and (s->>'season' is null or s->>'season' in ('letné','zimné','celoročné'))
    and (s->>'tread' is null or (s->>'tread') ~ '^\d{1,2}(\.\d)?$' and (s->>'tread')::numeric between 0 and 30)
    and (s->>'dot' is null or (s->>'dot') ~ '^(19|20)\d{2}$')
    and (s->>'li' is null or (s->>'li') ~ '^\d{2,3}(/\d{2,3})?$')
    and (s->>'si' is null or (s->>'si') ~ '^[A-Z]{1,2}$')
    and (s->>'rw' is null or (s->>'rw') ~ '^\d{1,2}(\.5)?$' and (s->>'rw')::numeric between 3 and 15)
    and (s->>'pcd' is null or (s->>'pcd') ~ '^[3-8]x\d{2,3}(\.\d)?$')
    and (s->>'et' is null or (s->>'et') ~ '^-?\d{1,3}$' and (s->>'et')::int between -100 and 200)
    and (s->>'cb' is null or (s->>'cb') ~ '^\d{2,3}(\.\d)?$')
    and (s->>'pcs' is null or (s->>'pcs') ~ '^\d{1,2}$' and (s->>'pcs')::int between 1 and 12)
    and (s->>'mat' is null or s->>'mat' in ('Hliník','Oceľ'))
$$;
alter table public.listings add constraint listings_specs_ok check (public.specs_ok(specs));
grant insert (specs), update (specs) on public.listings to authenticated;
create index if not exists listings_specs on public.listings using gin (specs) where status = 'active';

-- Hľadanie s filtrom druhu vozidla (inak rovnaké ako v 08).
create or replace function public.search_listings(p jsonb) returns jsonb
language plpgsql stable set search_path = public, extensions as $$
declare
  q text := public.norm_text(trim(coalesce(p ->> 'q', '')));
  words text[] := array(select x from unnest(regexp_split_to_array(public.norm_text(trim(coalesce(p ->> 'q', ''))), '[^a-z0-9]+')) x where x <> '');
  qk text := upper(regexp_replace(coalesce(p ->> 'q', ''), '[^A-Za-z0-9]', '', 'g'));
  b int := (p ->> 'brand')::int; m int := (p ->> 'model')::int; e int := (p ->> 'engine')::int; y int := (p ->> 'year')::int;
  c text := nullif(p ->> 'cat', ''); sb int := (p ->> 'sub')::int; mx numeric := (p ->> 'max')::numeric;
  cnd text := nullif(p ->> 'cond', ''); cty text := nullif(p ->> 'city', ''); sd text := nullif(p ->> 'side', '');
  tst boolean := coalesce((p ->> 'tested')::boolean, false); rt boolean := coalesce((p ->> 'ret')::boolean, false);
  ids bigint[] := case when p ? 'ids' then array(select jsonb_array_elements_text(p -> 'ids')::bigint) end;
  excl bigint := (p ->> 'exclude')::bigint; slr uuid := (p ->> 'seller')::uuid; dn bigint := (p ->> 'donor')::bigint;
  srt text := coalesce(p ->> 'sort', 'new');
  vt text := nullif(p ->> 'vtype', '');   -- druh vozidla (osobne, dodavky, nakladne, autobusy, motorky)
  sp jsonb := coalesce(p -> 'specs', '{}');   -- parametre kolies, napr. {"pcd":"5x112","rd":"17"} (zhoda každého zadaného)
  lim int := least(greatest(coalesce((p ->> 'limit')::int, 24), 1), 60); off int := greatest(coalesce((p ->> 'offset')::int, 0), 0);
  res jsonb;
begin
  with base as (
    select l.* from public.listings l
    where l.status = 'active'
      and (excl is null or l.id <> excl)
      and (slr is null or l.seller_id = slr)
      and (dn is null or l.donor_id = dn)
      and (ids is null or l.id = any(ids))
      and (mx is null or l.price <= mx)
      and (cnd is null or l.condition = cnd)
      and (cty is null or l.city = cty)
      and (sd is null or l.side is null or l.side = sd)
      and (not tst or l.tested)
      and (not rt or l.returns_14d)
      and (sp = '{}' or l.specs @> sp)
      and (vt is null or exists (select 1 from public.models mm where mm.id = l.model_id and mm.vehicle_type = vt)
        or (l.model_id is null and exists (select 1 from public.models mm where mm.brand_id = l.brand_id and mm.vehicle_type = vt)))
      and (q = '' or public.text_matches(l.search_text, words) or (char_length(qk) >= 4 and l.oem_key like '%' || qk || '%'))
      and (b is null
        or (l.brand_id = b and (m is null or l.model_id = m) and (e is null or l.engine_id is null or l.engine_id = e))
        or exists (select 1 from public.listing_fits f where f.listing_id = l.id and f.brand_id = b
                   and (m is null or f.model_id = m) and (e is null or f.engine_id is null or f.engine_id = e))
        or (char_length(l.oem_key) >= 4 and exists (
              select 1 from public.listings o where o.oem_key = l.oem_key and o.id <> l.id and o.status = 'active'
              and ((o.brand_id = b and (m is null or o.model_id = m) and (e is null or o.engine_id is null or o.engine_id = e))
                or exists (select 1 from public.listing_fits g where g.listing_id = o.id and g.brand_id = b
                           and (m is null or g.model_id = m) and (e is null or g.engine_id is null or g.engine_id = e))))))
      -- ročník platí pre vlastné auto inzerátu (pri zhode cez „pasuje aj na“ sa neporovnáva)
      and (y is null or l.year = y or not (b is null or (l.brand_id = b and (m is null or l.model_id = m))))
  ),
  hit as (select * from base where (c is null or category_id = c) and (sb is null or subcategory_id = sb)),
  page as (
    select h.*, row_number() over (order by
      (srt = 'new' and h.top_until is not null and h.top_until > now()) desc,
      case when srt = 'asc' then h.price end asc,
      case when srt = 'desc' then h.price end desc,
      case when q <> '' and srt = 'new' then (public.norm_text(h.name) like '%' || q || '%')::int end desc nulls last,
      h.created_at desc, h.id desc) as ord
    from hit h
  ),
  cut as (select * from page where ord > off and ord <= off + lim)
  select jsonb_build_object(
    'total', (select count(*) from hit),
    'base', (select count(*) from base),
    'cats', coalesce((select jsonb_object_agg(category_id, n) from (select category_id, count(*) n from base group by 1) z), '{}'),
    'subs', coalesce((select jsonb_object_agg(subcategory_id, n) from (select subcategory_id, count(*) n from base
                      where c is not null and category_id = c and subcategory_id is not null group by 1) z), '{}'),
    'items', coalesce((select jsonb_agg(jsonb_build_object(
        'id', x.id, 'name', x.name, 'brand_id', x.brand_id, 'model_id', x.model_id, 'engine_id', x.engine_id, 'year', x.year,
        'category_id', x.category_id, 'subcategory_id', x.subcategory_id, 'oem', x.oem, 'price', x.price, 'city', x.city,
        'condition', x.condition, 'description', x.description, 'warranty', x.warranty, 'shipping', x.shipping,
        'created_at', x.created_at, 'updated_at', x.updated_at, 'side', x.side, 'donor_gearbox', x.donor_gearbox, 'donor_km', x.donor_km,
        'tested', x.tested, 'returns_14d', x.returns_14d, 'top_until', x.top_until, 'part_maker', x.part_maker, 'specs', x.specs, 'seller_id', x.seller_id, 'donor_id', x.donor_id,
        'sellers', (select jsonb_build_object('name', s.name, 'seller_type', s.seller_type, 'city', s.city, 'verified', s.verified) from public.sellers s where s.id = x.seller_id),
        'listing_photos', coalesce((select jsonb_agg(jsonb_build_object('path', ph.path, 'position', ph.position) order by ph.position) from public.listing_photos ph where ph.listing_id = x.id), '[]'),
        'listing_fits', coalesce((select jsonb_agg(jsonb_build_object('brand_id', fi.brand_id, 'model_id', fi.model_id, 'engine_id', fi.engine_id)) from public.listing_fits fi where fi.listing_id = x.id), '[]')
      ) order by x.ord) from cut x), '[]')
  ) into res;
  return res;
end $$;
grant execute on function public.search_listings(jsonb) to anon, authenticated;
