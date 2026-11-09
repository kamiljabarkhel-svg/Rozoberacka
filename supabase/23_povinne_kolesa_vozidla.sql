-- 23: Povinné údaje pri pneumatikách a diskoch, nové polia havarovaných vozidiel.
-- Pneumatiky a disky (kol): treba vybrať, čo sa predáva (podkategória), a rozmer:
--   pneumatiky šírka + profil + priemer, disky rozteč + priemer, kolesá s pneumatikami oboje.
-- Vozidlá: karoséria, výkon (kW), kľúče, pôvod, nové poškodenia (airbagy, sklá, kolesá a náprava, rám), palivo povinné.

create or replace function public.listing_required() returns trigger
language plpgsql set search_path = public as $$
declare u boolean; sn text; k text;
begin
  select universal into u from public.categories where id = new.category_id;
  if new.model_id is not null then
    select brand_id, vehicle_type into new.brand_id, new.vtype from public.models where id = new.model_id;
  end if;
  if not coalesce(u, false) then
    if new.brand_id is null then raise exception 'Vyberte značku vozidla.' using errcode = 'check_violation'; end if;
    if new.model_id is null then raise exception 'Vyberte model vozidla.' using errcode = 'check_violation'; end if;
    if new.year is null then raise exception 'Vyberte ročník vozidla.' using errcode = 'check_violation'; end if;
    -- oem_key je generovaný stĺpec, v triggri ešte nie je vypočítaný – počítame z oem
    if new.oem is not null and char_length(regexp_replace(new.oem, '[^A-Za-z0-9]', '', 'g')) < 4 then
      raise exception 'Zadajte číslo dielu (OEM) – aspoň 4 písmená alebo číslice.' using errcode = 'check_violation';
    end if;
  end if;
  if new.category_id = 'kol' then
    if new.subcategory_id is null then
      raise exception 'Vyberte, čo predávate (pneumatiky, disky, kolesá…).' using errcode = 'check_violation';
    end if;
    select name into sn from public.subcategories where id = new.subcategory_id;
    k := case when sn like 'Pneumatiky%' then 'pneu' when sn like 'Disky%' then 'disk'
              when sn in ('Kolesá s pneumatikami', 'Rezervné a dojazdové kolesá') then 'kolesa' else 'ine' end;
    if k in ('pneu', 'kolesa') and (coalesce(new.specs ->> 'tw', '') = '' or coalesce(new.specs ->> 'tp', '') = '' or coalesce(new.specs ->> 'rd', '') = '') then
      raise exception 'Zadajte rozmer pneumatiky (šírka, profil, priemer).' using errcode = 'check_violation';
    end if;
    if k in ('disk', 'kolesa') and (coalesce(new.specs ->> 'pcd', '') = '' or coalesce(new.specs ->> 'rd', '') = '') then
      raise exception 'Zadajte rozteč skrutiek a priemer disku.' using errcode = 'check_violation';
    end if;
  end if;
  return new;
end $$;
revoke all on function public.listing_required() from public, anon, authenticated;

-- ===================== Havarované vozidlá =====================
alter table public.car_listings
  add column if not exists body text check (body is null or body in (
    'Hatchback', 'Sedan', 'Kombi', 'SUV', 'MPV', 'Kupé', 'Kabriolet', 'Pick-up',
    'Skriňová dodávka', 'Valník', 'Sklápač', 'Podvozok s kabínou', 'Obytné vozidlo', 'Minibus',
    'Ťahač', 'Skriňa', 'Chladiarenské', 'Cisterna', 'Podvozok',
    'Mestský', 'Medzimestský', 'Diaľkový',
    'Cestná', 'Športová', 'Naked', 'Chopper', 'Enduro', 'Cross', 'Skúter', 'Štvorkolka')),
  add column if not exists power_kw int check (power_kw is null or power_kw between 1 and 2000),
  add column if not exists keys boolean,
  add column if not exists origin text check (origin is null or origin in ('Slovensko', 'Dovoz'));

alter table public.car_listings drop constraint if exists car_listings_damage_check;
alter table public.car_listings add constraint car_listings_damage_check check (damage <@ array['Predok', 'Zadok', 'Ľavý bok', 'Pravý bok', 'Strecha', 'Podvozok',
  'Motor', 'Prevodovka', 'Elektrika', 'Interiér', 'Airbagy', 'Sklá', 'Kolesá a náprava', 'Rám']::text[]);
-- palivo povinné pre nové a upravené inzeráty (staré riadky bez paliva ostávajú)
alter table public.car_listings drop constraint if exists car_listings_fuel_required;
alter table public.car_listings add constraint car_listings_fuel_required check (fuel is not null) not valid;

grant insert (body, power_kw, keys, origin), update (body, power_kw, keys, origin) on public.car_listings to authenticated;

create or replace function public.car_json(c public.car_listings) returns jsonb
language sql stable security definer set search_path = public as $$
  select jsonb_build_object(
    'id', c.id, 'vehicle_type', c.vehicle_type, 'brand_id', c.brand_id, 'model_id', c.model_id, 'engine_id', c.engine_id, 'year', c.year,
    'km', c.km, 'fuel', c.fuel, 'gearbox', c.gearbox, 'color', c.color, 'condition', c.condition, 'damage', to_jsonb(c.damage), 'starts', c.starts,
    'docs', c.docs, 'stk_until', c.stk_until, 'price', c.price, 'city', c.city, 'description', c.description, 'donor_id', c.donor_id,
    'body', c.body, 'power_kw', c.power_kw, 'keys', c.keys, 'origin', c.origin,
    'created_at', c.created_at, 'updated_at', c.updated_at, 'seller_id', c.seller_id,
    'seller', (select jsonb_build_object('name', s.name, 'seller_type', s.seller_type, 'city', s.city, 'verified', s.verified, 'ico', s.ico, 'address', s.address)
               from public.sellers s where s.id = c.seller_id),
    'photos', coalesce((select jsonb_agg(p.path order by p.position, p.id) from public.car_photos p where p.car_id = c.id), '[]'),
    'parts', case when c.donor_id is null then 0 else (select count(*) from public.listings l where l.donor_id = c.donor_id and l.status = 'active') end)
$$;
revoke all on function public.car_json(public.car_listings) from public, anon, authenticated;

-- search_cars skladá riadok vozidla stĺpec po stĺpci – doplnené nové stĺpce (na konci, v poradí tabuľky)
create or replace function public.search_cars(p jsonb) returns jsonb
language plpgsql stable security definer set search_path = public as $$
declare
  vt text := nullif(p ->> 'vtype', ''); b int := (p ->> 'brand')::int; m int := (p ->> 'model')::int;
  y1 int := (p ->> 'yfrom')::int; y2 int := (p ->> 'yto')::int; mx numeric := (p ->> 'max')::numeric;
  cnd text := nullif(p ->> 'cond', ''); fl text := nullif(p ->> 'fuel', ''); dc boolean := coalesce((p ->> 'docs')::boolean, false);
  cty text := nullif(p ->> 'city', ''); slr uuid := (p ->> 'seller')::uuid; excl bigint := (p ->> 'exclude')::bigint;
  words text[] := array(select x from unnest(regexp_split_to_array(public.norm_text(trim(coalesce(p ->> 'q', ''))), '[^a-z0-9]+')) x where x <> '');
  srt text := coalesce(p ->> 'sort', 'new');
  lim int := least(greatest(coalesce((p ->> 'limit')::int, 24), 1), 60); off int := greatest(coalesce((p ->> 'offset')::int, 0), 0);
  res jsonb;
begin
  with base as (
    select c.* from public.car_listings c
    where c.status = 'active'
      and (excl is null or c.id <> excl)
      and (vt is null or c.vehicle_type = vt)
      and (b is null or c.brand_id = b) and (m is null or c.model_id = m)
      and (y1 is null or c.year >= y1) and (y2 is null or c.year <= y2)
      and (mx is null or c.price <= mx) and (fl is null or c.fuel = fl) and (cty is null or c.city = cty)
      and (not dc or c.docs <> 'Bez dokladov – len na diely')
      and (slr is null or c.seller_id = slr)
      and (cardinality(words) = 0 or public.text_matches(public.norm_text(
            coalesce((select name from public.brands where id = c.brand_id), '') || ' ' || coalesce((select name from public.models where id = c.model_id), '') || ' ' ||
            coalesce((select name from public.engines where id = c.engine_id), '') || ' ' || c.description), words))
  ),
  hit as (select * from base where cnd is null or condition = cnd),
  page as (
    select h.*, row_number() over (order by
      case when srt = 'asc' then h.price end asc, case when srt = 'desc' then h.price end desc,
      case when srt = 'year' then h.year end desc, case when srt = 'km' then h.km end asc nulls last,
      h.created_at desc, h.id desc) as ord
    from hit h
  )
  select jsonb_build_object(
    'total', (select count(*) from hit),
    'conds', coalesce((select jsonb_object_agg(condition, n) from (select condition, count(*) n from base group by 1) z), '{}'),
    'items', coalesce((select jsonb_agg(public.car_json(row(x.id, x.seller_id, x.vehicle_type, x.brand_id, x.model_id, x.engine_id, x.year, x.km, x.fuel, x.gearbox, x.color,
        x.condition, x.damage, x.starts, x.docs, x.stk_until, x.price, x.city, x.description, x.donor_id, x.status, x.moderation_note, x.views, x.calls,
        x.created_at, x.updated_at, x.sold_at, x.body, x.power_kw, x.keys, x.origin)::public.car_listings) order by x.ord) from page x where x.ord > off and x.ord <= off + lim), '[]')
  ) into res;
  return res;
end $$;
