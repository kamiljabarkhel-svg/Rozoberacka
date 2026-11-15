-- 39: Náhradné čísla dielu a podobné čísla (15. 11. 2026).
-- 1) listings.oem_alt – predajca môže zapísať aj iné čísla toho istého dielu (staršie/novšie číslo, číslo iného výrobcu).
--    Diel sa nájde aj podľa nich (search_text + hľadanie čísla v search_listings) a zobrazí sa na stránke každého z nich.
-- 2) similar_oems(kľúč) – čísla s rovnakým základom (03L130277 → 03L130277A, 03L130277Q…), na samostatný odkaz
--    „Podobné čísla“. Nie je to zhoda – kupujúci musí sám overiť, či podobné číslo pasuje.
-- Funkcia search_listings je kópia z 38_hladanie_pl.sql, pribudli len náhradné čísla (podmienka čísla a 'oem_alt' v items).

create or replace function public.oem_norm(t text) returns text
language sql immutable parallel safe as $$ select upper(regexp_replace(coalesce(t, ''), '[^A-Za-z0-9]', '', 'g')) $$;

-- najviac 10 čísel, každé 4 – 40 znakov a aspoň 4 písmená/číslice
create or replace function public.oem_alt_ok(a text[]) returns boolean
language sql immutable parallel safe as $$
  select a is null or (cardinality(a) <= 10 and not exists (
    select 1 from unnest(a) x where x is null or char_length(x) > 40 or char_length(public.oem_norm(x)) < 4))
$$;

alter table public.listings add column if not exists oem_alt text[];
alter table public.listings drop constraint if exists listings_oem_alt_ok;
alter table public.listings add constraint listings_oem_alt_ok check (public.oem_alt_ok(oem_alt));
-- predajca smie stĺpec zapisovať (zápis do listings je povolený len po stĺpcoch, pozri 05)
grant insert (oem_alt), update (oem_alt) on public.listings to authenticated;

-- text na hľadanie obsahuje aj náhradné čísla (zapísané aj bez medzier a pomlčiek)
create or replace function public.listing_search_text() returns trigger
language plpgsql security definer set search_path = public, extensions as $$
begin
  new.search_text := public.norm_text(concat_ws(' ',
    new.name, new.oem, public.oem_norm(new.oem),
    array_to_string(new.oem_alt, ' '), (select string_agg(public.oem_norm(a), ' ') from unnest(new.oem_alt) a),
    new.part_maker, new.description, new.city, new.side, new.donor_gearbox,
    (select name from public.brands where id = new.brand_id),
    (select name from public.models where id = new.model_id),
    (select name from public.engines where id = new.engine_id),
    (select name from public.categories where id = new.category_id),
    (select name from public.subcategories where id = new.subcategory_id)));
  return new;
end $$;
revoke all on function public.listing_search_text() from public, anon, authenticated;

create or replace function public.search_listings(p jsonb) returns jsonb
language plpgsql stable set search_path = public, extensions as $$
declare
  q text := public.norm_text(trim(coalesce(p ->> 'q', '')));
  words text[] := array(select x from unnest(regexp_split_to_array(public.norm_text(trim(coalesce(p ->> 'q', ''))), '[^a-z0-9]+')) x where x <> '');
  qk text := upper(regexp_replace(coalesce(p ->> 'q', ''), '[^A-Za-z0-9]', '', 'g'));
  b int := (p ->> 'brand')::int; m int := (p ->> 'model')::int; e int := (p ->> 'engine')::int; y int := (p ->> 'year')::int;
  c text := nullif(p ->> 'cat', ''); sb int := (p ->> 'sub')::int; mx numeric := (p ->> 'max')::numeric; mn numeric := (p ->> 'min')::numeric;
  cnd text := nullif(p ->> 'cond', ''); cty text := nullif(p ->> 'city', ''); sd text := nullif(p ->> 'side', '');
  tst boolean := coalesce((p ->> 'tested')::boolean, false); rt boolean := coalesce((p ->> 'ret')::boolean, false);
  ids bigint[] := case when p ? 'ids' then array(select jsonb_array_elements_text(p -> 'ids')::bigint) end;
  excl bigint := (p ->> 'exclude')::bigint; slr uuid := (p ->> 'seller')::uuid; dn bigint := (p ->> 'donor')::bigint;
  srt text := coalesce(p ->> 'sort', 'new');
  vt text := nullif(p ->> 'vtype', '');   -- druh vozidla (osobne, dodavky, nakladne, autobusy, motorky)
  sp jsonb := coalesce(p -> 'specs', '{}');
  wt text := nullif(p ->> 'wtype', '');   -- pri kategórii Pneumatiky a disky: pneu, disk, kolesa   -- parametre kolies, napr. {"pcd":"5x112","rd":"17"} (zhoda každého zadaného)
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
      and (mn is null or l.price >= mn)
      and (cnd is null or l.condition = cnd or (cnd = 'pouzite' and l.condition <> 'Nový'))
      and (cty is null or l.city = cty)
      and (sd is null or l.side is null or l.side = sd)
      and (not tst or l.tested)
      and (not rt or l.returns_14d)
      and (sp = '{}' or l.specs @> sp)
      -- druh vozidla: z modelu, pri univerzálnom diele z listings.vtype; univerzálny diel bez druhu pasuje na všetky
      and (vt is null or exists (select 1 from public.models mm where mm.id = l.model_id and mm.vehicle_type = vt)
        or (l.model_id is null and (l.vtype = vt or l.vtype is null)))
      and (wt is null or exists (select 1 from public.subcategories ws where ws.id = l.subcategory_id and (
            (wt = 'pneu' and ws.name like 'Pneumatiky%') or (wt = 'disk' and ws.name like 'Disky%')
            or (wt = 'kolesa' and ws.name in ('Kolesá s pneumatikami', 'Rezervné a dojazdové kolesá'))
            or (wt = 'puklice' and ws.name = 'Puklice'))))
      and (q = '' or public.text_matches(l.search_text, words)
           or exists (select 1 from public.listing_tr t where t.listing_id = l.id and t.search_text is not null and public.text_matches(t.search_text, words))
           or (char_length(qk) >= 4 and (l.oem_key like '%' || qk || '%'
               or exists (select 1 from unnest(l.oem_alt) a where public.oem_norm(a) like '%' || qk || '%'))))
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
        'tested', x.tested, 'returns_14d', x.returns_14d, 'top_until', x.top_until, 'part_maker', x.part_maker, 'oem_alt', x.oem_alt, 'specs', x.specs, 'vtype', x.vtype, 'seller_id', x.seller_id, 'donor_id', x.donor_id,
        'sellers', (select jsonb_build_object('name', s.name, 'seller_type', s.seller_type, 'city', s.city, 'verified', s.verified) from public.sellers s where s.id = x.seller_id),
        'listing_photos', coalesce((select jsonb_agg(jsonb_build_object('path', ph.path, 'position', ph.position) order by ph.position) from public.listing_photos ph where ph.listing_id = x.id), '[]'),
        'listing_fits', coalesce((select jsonb_agg(jsonb_build_object('brand_id', fi.brand_id, 'model_id', fi.model_id, 'engine_id', fi.engine_id)) from public.listing_fits fi where fi.listing_id = x.id), '[]')
      ) order by x.ord) from cut x), '[]')
  ) into res;
  return res;
end $$;
grant execute on function public.search_listings(jsonb) to anon, authenticated;

-- Podobné čísla: rovnaký základ (číslo bez písmen na konci, ak ostane aspoň 6 znakov), najviac o 3 znaky dlhšie.
-- Vracia [{"oem": "03L130277Q", "n": 2}, …] – len aktívne inzeráty, bez hľadaného čísla, najviac 12.
create or replace function public.similar_oems(p_key text) returns jsonb
language sql stable security definer set search_path = public as $$
  with k as (select public.oem_norm(p_key) as key),
  b as (select key, case when char_length(regexp_replace(key, '[A-Z]+$', '')) >= 6 then regexp_replace(key, '[A-Z]+$', '') else key end as base from k),
  keys as (
    select l.oem_key as o from public.listings l, b where l.status = 'active' and l.oem_key like b.base || '%'
    union all
    select public.oem_norm(a) from public.listings l cross join lateral unnest(l.oem_alt) a, b
     where l.status = 'active' and public.oem_norm(a) like b.base || '%'
  )
  select coalesce(jsonb_agg(jsonb_build_object('oem', o, 'n', n) order by n desc, o), '[]')
  from (select o, count(*) n from keys, b where char_length(b.key) >= 4 and o <> b.key and char_length(o) <= char_length(b.base) + 3
        group by o order by count(*) desc, o limit 12) z
$$;
revoke all on function public.similar_oems(text) from public;
grant execute on function public.similar_oems(text) to anon, authenticated;

-- rýchle hľadanie podľa začiatku čísla
create index if not exists listings_oem_key_prefix on public.listings (oem_key text_pattern_ops) where status = 'active';
