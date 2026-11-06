-- 08_darcovske_auta_dopyty_seo.sql – darcovské autá, dopyt na diel, počty pre SEO stránky (6. 11. 2026). Spúšťa sa po 07.
--  A. Darcovské auto: predajca zadá auto raz, diely z neho majú predvyplnené údaje; VIN vidí len predajca
--  B. Dopyt na diel: kupujúci bez účtu zadá, čo hľadá; predajcovia v portáli vidia dopyty a posielajú ponuky;
--     kupujúci vidí ponuky na súkromnej adrese /dopyt/<kód>. Dopyt platí 30 dní, zmaže sa po 60 dňoch.
--  C. seo_counts(): počty aktívnych inzerátov podľa auta a kategórie (stránky značiek, modelov, sitemap)

-- ===================== A. DARCOVSKÉ AUTÁ =====================
create table public.donor_cars (
  id           bigserial primary key,
  seller_id    uuid not null references public.sellers(id) on delete cascade,
  brand_id     int  not null references public.brands(id),
  model_id     int  not null references public.models(id),
  engine_id    int  references public.engines(id),
  year         int  not null check (year between 1950 and 2100),
  km           int  check (km between 0 and 3000000),
  gearbox      text check (gearbox in ('Manuálna','Automatická')),
  color        text check (char_length(color) <= 40),
  vin          text check (vin is null or vin ~ '^[A-HJ-NPR-Z0-9]{17}$'),   -- len pre predajcu, nikdy verejne
  dismantled_at date,
  note         text check (char_length(note) <= 500),
  created_at   timestamptz not null default now()
);
create index donor_cars_seller on public.donor_cars (seller_id, created_at desc);
alter table public.donor_cars enable row level security;
create policy donor_read   on public.donor_cars for select using (seller_id = (select auth.uid()));
create policy donor_insert on public.donor_cars for insert with check (seller_id = (select auth.uid()));
create policy donor_update on public.donor_cars for update using (seller_id = (select auth.uid())) with check (seller_id = (select auth.uid()));
create policy donor_delete on public.donor_cars for delete using (seller_id = (select auth.uid()));
revoke all on public.donor_cars from anon;

alter table public.listings add column donor_id bigint references public.donor_cars(id) on delete set null;
create index listings_donor on public.listings (donor_id) where donor_id is not null;
grant insert (donor_id), update (donor_id) on public.listings to authenticated;

-- Diel môže patriť len k vlastnému darcovskému autu.
create function public.guard_listing_donor() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if new.donor_id is not null and not exists (select 1 from public.donor_cars d where d.id = new.donor_id and d.seller_id = new.seller_id) then
    raise exception 'Darcovské auto nepatrí vám';
  end if;
  return new;
end $$;
revoke all on function public.guard_listing_donor() from public, anon, authenticated;
create trigger listings_donor_guard before insert or update of donor_id on public.listings for each row execute function public.guard_listing_donor();

-- ===================== HĽADANIE (nový parameter donor, v výsledkoch donor_id) =====================
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
        'tested', x.tested, 'returns_14d', x.returns_14d, 'top_until', x.top_until, 'part_maker', x.part_maker, 'seller_id', x.seller_id, 'donor_id', x.donor_id,
        'sellers', (select jsonb_build_object('name', s.name, 'seller_type', s.seller_type, 'city', s.city, 'verified', s.verified) from public.sellers s where s.id = x.seller_id),
        'listing_photos', coalesce((select jsonb_agg(jsonb_build_object('path', ph.path, 'position', ph.position) order by ph.position) from public.listing_photos ph where ph.listing_id = x.id), '[]'),
        'listing_fits', coalesce((select jsonb_agg(jsonb_build_object('brand_id', fi.brand_id, 'model_id', fi.model_id, 'engine_id', fi.engine_id)) from public.listing_fits fi where fi.listing_id = x.id), '[]')
      ) order by x.ord) from cut x), '[]')
  ) into res;
  return res;
end $$;

-- ===================== B. DOPYT NA DIEL =====================
create table public.part_requests (
  id           bigserial primary key,
  token        uuid not null unique default gen_random_uuid(),      -- súkromný kód pre kupujúceho
  brand_id     int  not null references public.brands(id),
  model_id     int  references public.models(id),
  engine_id    int  references public.engines(id),
  year         int  check (year between 1950 and 2100),
  vin          text check (vin is null or vin ~ '^[A-HJ-NPR-Z0-9]{17}$'),
  category_id  text references public.categories(id),
  part_name    text not null check (char_length(trim(part_name)) between 3 and 120),
  note         text check (char_length(note) <= 500),
  contact_name text not null check (char_length(trim(contact_name)) between 2 and 80),
  contact      text not null check (char_length(trim(contact)) between 5 and 120),
  city         text check (char_length(city) <= 60),
  status       text not null default 'open' check (status in ('open','closed')),
  ip_key       text,
  created_at   timestamptz not null default now(),
  expires_at   timestamptz not null default now() + interval '30 days'
);
create index part_requests_open on public.part_requests (status, expires_at desc);
create index part_requests_brand on public.part_requests (brand_id, model_id);
alter table public.part_requests enable row level security;
-- Otvorené dopyty vidia len prihlásení predajcovia (nie verejnosť, nie zablokovaní).
create policy requests_sellers_read on public.part_requests for select to authenticated
  using ((status = 'open' and expires_at > now() and exists (select 1 from public.sellers s where s.id = (select auth.uid()) and not s.blocked))
         or (select public.is_admin()));
revoke all on public.part_requests from anon;
revoke insert, update, delete, truncate on public.part_requests from authenticated;

create table public.part_offers (
  id          bigserial primary key,
  request_id  bigint not null references public.part_requests(id) on delete cascade,
  seller_id   uuid not null references public.sellers(id) on delete cascade,
  price       numeric(10,2) not null check (price > 0),
  phone       text not null check (char_length(regexp_replace(phone, '[^0-9]', '', 'g')) >= 9),
  listing_id  bigint references public.listings(id) on delete set null,
  note        text check (char_length(note) <= 500),
  created_at  timestamptz not null default now(),
  unique (request_id, seller_id)
);
create index part_offers_request on public.part_offers (request_id);
create index part_offers_seller on public.part_offers (seller_id);
create index part_offers_listing on public.part_offers (listing_id);
alter table public.part_offers enable row level security;
create policy offers_own_read on public.part_offers for select using (seller_id = (select auth.uid()) or (select public.is_admin()));
create policy offers_insert on public.part_offers for insert with check (
  seller_id = (select auth.uid())
  and exists (select 1 from public.part_requests r where r.id = request_id and r.status = 'open' and r.expires_at > now())
  and exists (select 1 from public.sellers s where s.id = (select auth.uid()) and not s.blocked)
  and (listing_id is null or exists (select 1 from public.listings l where l.id = listing_id and l.seller_id = (select auth.uid()))));
create policy offers_update on public.part_offers for update using (seller_id = (select auth.uid())) with check (seller_id = (select auth.uid()));
create policy offers_delete on public.part_offers for delete using (seller_id = (select auth.uid()));
revoke all on public.part_offers from anon;
revoke insert, update on public.part_offers from authenticated;
grant insert (request_id, seller_id, price, phone, listing_id, note), update (price, phone, listing_id, note) on public.part_offers to authenticated;

-- Kupujúci zadá dopyt (bez účtu). Limit 3 za hodinu a 10 za deň z jedného pripojenia.
create function public.create_part_request(p jsonb) returns uuid
language plpgsql security definer set search_path = public as $$
declare v_key text := public.client_ip_key(); v_token uuid; v_vin text;
begin
  if public.rate_count('request', v_key, interval '1 hour') >= 3 or public.rate_count('request', v_key, interval '24 hours') >= 10 then
    raise exception 'Príliš veľa dopytov z vášho pripojenia. Skúste to neskôr.';
  end if;
  v_vin := nullif(upper(regexp_replace(coalesce(p ->> 'vin', ''), '\s', '', 'g')), '');
  insert into public.part_requests (brand_id, model_id, engine_id, year, vin, category_id, part_name, note, contact_name, contact, city, ip_key)
  values ((p ->> 'brand')::int, (p ->> 'model')::int, (p ->> 'engine')::int, (p ->> 'year')::int, v_vin, nullif(p ->> 'cat', ''),
          trim(p ->> 'part'), nullif(trim(coalesce(p ->> 'note', '')), ''), trim(p ->> 'name'), trim(p ->> 'contact'),
          nullif(trim(coalesce(p ->> 'city', '')), ''), v_key)
  returning token into v_token;
  insert into public.rate_events (kind, ip_key) values ('request', v_key);
  return v_token;
end $$;

-- Kupujúci si pozrie svoj dopyt a ponuky (podľa súkromného kódu).
create function public.get_part_request(p_token uuid) returns jsonb
language sql stable security definer set search_path = public as $$
  select case when r.id is null then null else jsonb_build_object(
    'id', r.id, 'status', case when r.status = 'open' and r.expires_at <= now() then 'expired' else r.status end,
    'brand_id', r.brand_id, 'model_id', r.model_id, 'engine_id', r.engine_id, 'year', r.year, 'category_id', r.category_id,
    'part_name', r.part_name, 'note', r.note, 'city', r.city, 'created_at', r.created_at, 'expires_at', r.expires_at,
    'offers', coalesce((select jsonb_agg(jsonb_build_object(
        'price', o.price, 'phone', o.phone, 'note', o.note, 'listing_id', o.listing_id, 'listing_name', l.name, 'created_at', o.created_at,
        'seller', s.name, 'seller_type', s.seller_type, 'seller_city', s.city, 'verified', s.verified) order by o.price)
      from public.part_offers o join public.sellers s on s.id = o.seller_id left join public.listings l on l.id = o.listing_id and l.status = 'active'
      where o.request_id = r.id and not s.blocked), '[]')) end
  from (select 1) x left join public.part_requests r on r.token = p_token;
$$;

create function public.close_part_request(p_token uuid) returns void
language sql security definer set search_path = public as $$
  update public.part_requests set status = 'closed' where token = p_token;
$$;

create function public.admin_close_request(p_id bigint) returns void
language plpgsql security definer set search_path = public as $$
begin
  perform public.admin_check();
  update public.part_requests set status = 'closed' where id = p_id;
  insert into public.admin_log (admin_id, action, target, detail) values (auth.uid(), 'zavrieť dopyt', 'request:' || p_id, '{}');
end $$;

-- ===================== MAZANIE A EXPORT (doplnené) =====================
create or replace function public.purge_old_data() returns void
language plpgsql security definer set search_path = public as $$
begin
  delete from public.rate_events where created_at < now() - interval '3 days';
  delete from public.messages where created_at < now() - interval '12 months';
  update public.reports set ip_key = null where ip_key is not null and created_at < now() - interval '30 days';
  delete from public.reports where created_at < now() - interval '12 months' and status <> 'open';
  delete from public.admin_log where created_at < now() - interval '3 years';
  delete from public.part_requests where created_at < now() - interval '60 days';   -- dopyty aj s ponukami
end $$;

create or replace function public.export_my_data() returns jsonb
language plpgsql stable security definer set search_path = public as $$
declare v uuid := auth.uid();
begin
  if v is null then raise exception 'Najprv sa prihláste'; end if;
  return jsonb_build_object(
    'vytvorene', now(),
    'ucet', (select jsonb_build_object('email', email, 'registrovany', created_at, 'posledne_prihlasenie', last_sign_in_at) from auth.users where id = v),
    'profil', (select to_jsonb(s) from public.sellers s where s.id = v),
    'sukromne_udaje', (select to_jsonb(p) from public.seller_private p where p.seller_id = v),
    'darcovske_auta', coalesce((select jsonb_agg(to_jsonb(d)) from public.donor_cars d where d.seller_id = v), '[]'),
    'inzeraty', coalesce((select jsonb_agg(to_jsonb(l) - 'search_text' || jsonb_build_object(
        'telefon', (select phone from public.listing_contacts c where c.listing_id = l.id),
        'fotky', (select coalesce(jsonb_agg(path order by position), '[]') from public.listing_photos ph where ph.listing_id = l.id),
        'pasuje_aj_na', (select coalesce(jsonb_agg(jsonb_build_object('brand_id', brand_id, 'model_id', model_id, 'engine_id', engine_id)), '[]') from public.listing_fits f where f.listing_id = l.id)))
      from public.listings l where l.seller_id = v), '[]'),
    'ponuky_na_dopyty', coalesce((select jsonb_agg(to_jsonb(o)) from public.part_offers o where o.seller_id = v), '[]'),
    'spravy_od_kupujucich', coalesce((select jsonb_agg(to_jsonb(m)) from public.messages m where m.seller_id = v), '[]'));
end $$;

create or replace function public.admin_stats() returns jsonb
language plpgsql stable security definer set search_path = public as $$
begin
  perform public.admin_check();
  return jsonb_build_object(
    'sellers', (select count(*) from public.sellers),
    'sellers_new_7d', (select count(*) from public.sellers where created_at > now() - interval '7 days'),
    'active', (select count(*) from public.listings where status = 'active'),
    'blocked', (select count(*) from public.listings where status = 'blocked'),
    'reports_open', (select count(*) from public.reports where status = 'open'),
    'requests_open', (select count(*) from public.part_requests where status = 'open' and expires_at > now()),
    'messages_7d', (select count(*) from public.messages where created_at > now() - interval '7 days'),
    'phones_7d', (select count(*) from public.rate_events where kind = 'phone' and created_at > now() - interval '7 days'),
    'views_7d', (select count(*) from public.rate_events where kind = 'view' and created_at > now() - interval '7 days'));
end $$;

-- ===================== C. POČTY PRE SEO STRÁNKY =====================
create function public.seo_counts() returns table (brand_id int, model_id int, category_id text, subcategory_id int, n bigint)
language sql stable set search_path = public as $$
  select brand_id, model_id, category_id, subcategory_id, count(*) from public.listings where status = 'active'
  group by 1, 2, 3, 4;
$$;

-- ===================== PRÁVA =====================
revoke all on function public.create_part_request(jsonb), public.get_part_request(uuid), public.close_part_request(uuid),
  public.admin_close_request(bigint), public.seo_counts() from public;
grant execute on function public.create_part_request(jsonb), public.get_part_request(uuid), public.close_part_request(uuid), public.seo_counts() to anon, authenticated;
grant execute on function public.admin_close_request(bigint) to authenticated;
