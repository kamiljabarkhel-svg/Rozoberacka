-- 19_havarovane_auta.sql – predaj celých havarovaných a nepojazdných vozidiel (8. 11. 2026). Spúšťa sa po 18.
-- Majiteľ rozhodol: len havarované, nepojazdné a na diely (nie bežný autobazár).
-- Verejnosť číta inzeráty len cez funkcie (security definer) s presne vybranými stĺpcami; telefón a VIN sú v súkromnej tabuľke.

-- ===================== TABUĽKY =====================
create table public.car_listings (
  id           bigserial primary key,
  seller_id    uuid not null references public.sellers(id) on delete cascade,
  vehicle_type text not null default 'osobne' check (vehicle_type in ('osobne', 'dodavky', 'nakladne', 'autobusy', 'motorky')),
  brand_id     int  not null references public.brands(id),
  model_id     int  references public.models(id),
  engine_id    int  references public.engines(id),
  year         int  not null check (year between 1950 and 2100),
  km           int  check (km between 0 and 5000000),
  fuel         text check (fuel in ('Benzín', 'Nafta', 'LPG', 'CNG', 'Hybrid', 'Plug-in hybrid', 'Elektro')),
  gearbox      text check (gearbox in ('Manuálna', 'Automatická')),
  color        text check (char_length(color) <= 40),
  condition    text not null check (condition in ('Havarované – pojazdné', 'Havarované – nepojazdné', 'Nepojazdné – porucha', 'Na diely', 'Po požiari alebo povodni')),
  damage       text[] not null default '{}' check (damage <@ array['Predok', 'Zadok', 'Ľavý bok', 'Pravý bok', 'Strecha', 'Podvozok', 'Motor', 'Prevodovka', 'Elektrika', 'Interiér']::text[]),
  starts       boolean,
  docs         text not null check (docs in ('S dokladmi – prihlásené', 'S dokladmi – odhlásené', 'Bez dokladov – len na diely')),
  stk_until    date,
  price        numeric(10,2) not null check (price > 0 and price < 10000000),
  city         text not null check (char_length(trim(city)) between 2 and 60),
  description  text not null check (char_length(trim(description)) between 20 and 3000),
  donor_id     bigint references public.donor_cars(id) on delete set null,
  status       text not null default 'active' check (status in ('active', 'paused', 'sold', 'blocked')),
  moderation_note text,
  views        int not null default 0,
  calls        int not null default 0,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now(),
  sold_at      timestamptz
);
create index car_listings_active on public.car_listings (status, created_at desc);
create index car_listings_brand on public.car_listings (brand_id, model_id) where status = 'active';
create index car_listings_seller on public.car_listings (seller_id, created_at desc);
create index car_listings_vtype on public.car_listings (vehicle_type) where status = 'active';

-- Súkromné údaje inzerátu: telefón a VIN (VIN nikdy verejne).
create table public.car_contacts (
  car_id  bigint primary key references public.car_listings(id) on delete cascade,
  phone   text not null check (char_length(regexp_replace(phone, '[^0-9]', '', 'g')) >= 9),
  vin     text check (vin is null or vin ~ '^[A-HJ-NPR-Z0-9]{17}$')
);
create table public.car_photos (
  id       bigserial primary key,
  car_id   bigint not null references public.car_listings(id) on delete cascade,
  path     text not null check (path ~ '^[0-9a-f-]{36}/a[0-9]+/[A-Za-z0-9._-]+$'),
  position int not null default 0 check (position between 0 and 30)
);
create index car_photos_car on public.car_photos (car_id, position);

-- ===================== OCHRANA (RLS + práva) =====================
alter table public.car_listings enable row level security;
alter table public.car_contacts enable row level security;
alter table public.car_photos enable row level security;
create policy cars_read on public.car_listings for select using (status = 'active' or seller_id = (select auth.uid()) or (select public.is_admin()));
create policy cars_insert on public.car_listings for insert with check (seller_id = (select auth.uid()));
create policy cars_update on public.car_listings for update using (seller_id = (select auth.uid())) with check (seller_id = (select auth.uid()));
create policy cars_delete on public.car_listings for delete using (seller_id = (select auth.uid()));
create policy car_contacts_own on public.car_contacts for all
  using (exists (select 1 from public.car_listings c where c.id = car_id and c.seller_id = (select auth.uid())) or (select public.is_admin()))
  with check (exists (select 1 from public.car_listings c where c.id = car_id and c.seller_id = (select auth.uid())));
create policy car_photos_read on public.car_photos for select
  using (exists (select 1 from public.car_listings c where c.id = car_id and (c.status = 'active' or c.seller_id = (select auth.uid()))) or (select public.is_admin()));
create policy car_photos_write on public.car_photos for all
  using (exists (select 1 from public.car_listings c where c.id = car_id and c.seller_id = (select auth.uid())))
  with check (exists (select 1 from public.car_listings c where c.id = car_id and c.seller_id = (select auth.uid()))
              and path like (select auth.uid())::text || '/a' || car_id || '/%');

revoke all on public.car_listings, public.car_contacts, public.car_photos from anon;
revoke all on public.car_listings from authenticated;
grant select on public.car_listings to authenticated;
grant insert (seller_id, vehicle_type, brand_id, model_id, engine_id, year, km, fuel, gearbox, color, condition, damage, starts, docs, stk_until,
  price, city, description, donor_id, status) on public.car_listings to authenticated;
grant update (vehicle_type, brand_id, model_id, engine_id, year, km, fuel, gearbox, color, condition, damage, starts, docs, stk_until,
  price, city, description, donor_id, status) on public.car_listings to authenticated;
grant delete on public.car_listings to authenticated;
revoke truncate, references, trigger on public.car_contacts, public.car_photos from authenticated;
grant select, insert, update, delete on public.car_contacts, public.car_photos to authenticated;
grant usage on sequence public.car_listings_id_seq, public.car_photos_id_seq to authenticated;

-- Kontroly: model patrí značke, motorizácia modelu, auto na diely predajcovi; zablokovaný predajca nič nezverejní;
-- podnikateľ musí mať IČO a sídlo; „blocked“ mení len správca; druh vozidla sa berie z modelu.
create function public.guard_car_listing() returns trigger
language plpgsql security definer set search_path = public as $$
declare v_type text; v_blocked boolean; v_ico text; v_addr text; v_vt text;
begin
  if new.model_id is not null then
    select vehicle_type into v_vt from public.models where id = new.model_id and brand_id = new.brand_id;
    if v_vt is null then raise exception 'Model nepatrí k zvolenej značke'; end if;
    new.vehicle_type := v_vt;
  end if;
  if new.engine_id is not null and not exists (select 1 from public.engines where id = new.engine_id and model_id = new.model_id) then
    raise exception 'Motorizácia nepatrí k zvolenému modelu';
  end if;
  if new.donor_id is not null and not exists (select 1 from public.donor_cars d where d.id = new.donor_id and d.seller_id = new.seller_id) then
    raise exception 'Auto na diely nepatrí vám';
  end if;
  select seller_type, blocked, ico, address into v_type, v_blocked, v_ico, v_addr from public.sellers where id = new.seller_id;
  if not public.is_admin() and current_user in ('authenticated', 'anon') then
    if v_blocked then raise exception 'Účet predajcu je zablokovaný. Kontaktujte správcu portálu.'; end if;
    if tg_op = 'INSERT' and new.status = 'blocked' then raise exception 'Neplatný stav inzerátu'; end if;
    if tg_op = 'UPDATE' and (old.status = 'blocked' or new.status = 'blocked') and new.status is distinct from old.status then
      raise exception 'Inzerát skryl správca portálu. Kontaktujte správcu.';
    end if;
    if v_type = 'Firma' and new.status = 'active' and (tg_op = 'INSERT' or old.status <> 'active') and (v_ico is null or v_addr is null) then
      raise exception 'Ako podnikateľ doplňte v profile IČO a sídlo – kupujúci ich musia vidieť.';
    end if;
  end if;
  if tg_op = 'UPDATE' then new.updated_at := now(); end if;
  if new.status = 'sold' and (tg_op = 'INSERT' or old.status <> 'sold') then new.sold_at := now(); end if;
  if new.status <> 'sold' then new.sold_at := null; end if;
  return new;
end $$;
revoke all on function public.guard_car_listing() from public, anon, authenticated;
create trigger car_listings_guard before insert or update on public.car_listings for each row execute function public.guard_car_listing();

-- Fotky najviac 12 na auto.
create function public.guard_car_photos() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if (select count(*) from public.car_photos where car_id = new.car_id) >= 12 then raise exception 'Najviac 12 fotiek na jedno vozidlo'; end if;
  return new;
end $$;
revoke all on function public.guard_car_photos() from public, anon, authenticated;
create trigger car_photos_guard before insert on public.car_photos for each row execute function public.guard_car_photos();

-- Správy a nahlásenia aj k celému vozidlu (presne jedno z: diel alebo vozidlo).
alter table public.messages alter column listing_id drop not null;
alter table public.messages add column if not exists car_id bigint references public.car_listings(id) on delete cascade;
alter table public.messages add constraint messages_one_target check (num_nonnulls(listing_id, car_id) = 1);
create index if not exists messages_car on public.messages (car_id) where car_id is not null;
alter table public.reports alter column listing_id drop not null;
alter table public.reports add column if not exists car_id bigint references public.car_listings(id) on delete cascade;
alter table public.reports add constraint reports_one_target check (num_nonnulls(listing_id, car_id) = 1);
alter table public.reports drop constraint if exists reports_reason_check;
alter table public.reports add constraint reports_reason_check check (reason in ('Podvod', 'Diel nie je na predaj', 'Nepravdivé údaje', 'Duplicitný inzerát',
  'Nevhodný obsah', 'Iné', 'Podozrenie na kradnuté vozidlo', 'Vozidlo nie je na predaj'));

-- Text chyby pri dieloch z auta na diely (premenovaná sekcia).
create or replace function public.guard_listing_donor() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if new.donor_id is not null and not exists (select 1 from public.donor_cars d where d.id = new.donor_id and d.seller_id = new.seller_id) then
    raise exception 'Auto na diely nepatrí vám';
  end if;
  return new;
end $$;

-- ===================== VEREJNÉ FUNKCIE =====================
-- Jeden riadok vozidla pre verejnosť (bez VIN, telefónu a poznámky správcu).
create function public.car_json(c public.car_listings) returns jsonb
language sql stable security definer set search_path = public as $$
  select jsonb_build_object(
    'id', c.id, 'vehicle_type', c.vehicle_type, 'brand_id', c.brand_id, 'model_id', c.model_id, 'engine_id', c.engine_id, 'year', c.year,
    'km', c.km, 'fuel', c.fuel, 'gearbox', c.gearbox, 'color', c.color, 'condition', c.condition, 'damage', to_jsonb(c.damage), 'starts', c.starts,
    'docs', c.docs, 'stk_until', c.stk_until, 'price', c.price, 'city', c.city, 'description', c.description, 'donor_id', c.donor_id,
    'created_at', c.created_at, 'updated_at', c.updated_at, 'seller_id', c.seller_id,
    'seller', (select jsonb_build_object('name', s.name, 'seller_type', s.seller_type, 'city', s.city, 'verified', s.verified, 'ico', s.ico, 'address', s.address)
               from public.sellers s where s.id = c.seller_id),
    'photos', coalesce((select jsonb_agg(p.path order by p.position, p.id) from public.car_photos p where p.car_id = c.id), '[]'),
    'parts', case when c.donor_id is null then 0 else (select count(*) from public.listings l where l.donor_id = c.donor_id and l.status = 'active') end)
$$;
revoke all on function public.car_json(public.car_listings) from public, anon, authenticated;

-- Hľadanie vozidiel. Filtre: vtype, brand, model, yfrom, yto, max, cond, fuel, docs (len s dokladmi), city, seller, q; sort: new, asc, desc, year, km.
create function public.search_cars(p jsonb) returns jsonb
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
        x.created_at, x.updated_at, x.sold_at)::public.car_listings) order by x.ord) from page x where x.ord > off and x.ord <= off + lim), '[]')
  ) into res;
  return res;
end $$;

-- Detail vozidla. Neaktívne (predané do 180 dní, pozastavené) vráti len základ s príznakom gone – stránka ukáže „Predané“ bez kontaktu.
create function public.get_car(p_id bigint) returns jsonb
language plpgsql stable security definer set search_path = public as $$
declare c public.car_listings;
begin
  select * into c from public.car_listings where id = p_id;
  if not found then return null; end if;
  if c.status = 'active' or c.seller_id = auth.uid() or public.is_admin() then return public.car_json(c) || jsonb_build_object('status', c.status); end if;
  if c.status = 'paused' or (c.status = 'sold' and c.sold_at > now() - interval '180 days') then
    return jsonb_build_object('id', c.id, 'gone', true, 'status', c.status, 'vehicle_type', c.vehicle_type, 'brand_id', c.brand_id, 'model_id', c.model_id, 'year', c.year);
  end if;
  return null;
end $$;

create function public.reveal_car_phone(p_id bigint) returns text
language plpgsql security definer set search_path = public as $$
declare v_phone text; v_owner uuid; v_key text := public.client_ip_key();
begin
  select k.phone, c.seller_id into v_phone, v_owner from public.car_contacts k join public.car_listings c on c.id = k.car_id
  where k.car_id = p_id and c.status = 'active';
  if v_phone is null then return null; end if;
  if v_owner is not distinct from auth.uid() then return v_phone; end if;
  if public.rate_count('carphone', v_key, interval '24 hours', p_id) > 0 then return v_phone; end if;
  if public.rate_count('phone', v_key, interval '1 hour') + public.rate_count('carphone', v_key, interval '1 hour') >= 40
     or public.rate_count('phone', v_key, interval '24 hours') + public.rate_count('carphone', v_key, interval '24 hours') >= 150 then
    raise exception 'Príliš veľa zobrazení telefónov z vášho pripojenia. Skúste to neskôr.' using errcode = 'P0001';
  end if;
  insert into public.rate_events (kind, ip_key, listing_id) values ('carphone', v_key, p_id);
  update public.car_listings set calls = calls + 1 where id = p_id;
  return v_phone;
end $$;

create function public.log_car_view(p_id bigint) returns void
language plpgsql security definer set search_path = public as $$
declare v_key text := public.client_ip_key();
begin
  if not exists (select 1 from public.car_listings where id = p_id and status = 'active' and seller_id is distinct from auth.uid()) then return; end if;
  if public.rate_count('carview', v_key, interval '24 hours', p_id) > 0 then return; end if;
  if public.rate_count('carview', v_key, interval '1 hour') >= 300 then return; end if;
  insert into public.rate_events (kind, ip_key, listing_id) values ('carview', v_key, p_id);
  update public.car_listings set views = views + 1 where id = p_id and status = 'active';
end $$;

create function public.send_car_message(p_id bigint, p_name text, p_contact text, p_body text) returns boolean
language plpgsql security definer set search_path = public as $$
declare v_seller uuid; v_recent int; v_key text := public.client_ip_key();
begin
  select seller_id into v_seller from public.car_listings where id = p_id and status = 'active';
  if v_seller is null then raise exception 'Inzerát neexistuje alebo nie je aktívny'; end if;
  if public.rate_count('message', v_key, interval '1 hour') >= 5 or public.rate_count('message', v_key, interval '24 hours') >= 20 then
    raise exception 'Príliš veľa správ z vášho pripojenia. Skúste to neskôr.';
  end if;
  select count(*) into v_recent from public.messages where lower(trim(sender_contact)) = lower(trim(p_contact)) and created_at > now() - interval '1 hour';
  if v_recent >= 5 then raise exception 'Príliš veľa správ za hodinu, skúste neskôr'; end if;
  insert into public.rate_events (kind, ip_key, listing_id) values ('message', v_key, p_id);
  insert into public.messages (car_id, seller_id, sender_name, sender_contact, body) values (p_id, v_seller, trim(p_name), trim(p_contact), trim(p_body));
  return true;
end $$;

create function public.report_car(p_id bigint, p_reason text, p_note text, p_contact text) returns boolean
language plpgsql security definer set search_path = public as $$
declare v_key text := public.client_ip_key();
begin
  if not exists (select 1 from public.car_listings where id = p_id and status = 'active') then raise exception 'Inzerát neexistuje alebo nie je aktívny'; end if;
  if public.rate_count('report', v_key, interval '1 hour') >= 5 then raise exception 'Príliš veľa nahlásení, skúste to neskôr.'; end if;
  if public.rate_count('carreport', v_key, interval '30 days', p_id) > 0 then return true; end if;
  insert into public.rate_events (kind, ip_key, listing_id) values ('report', v_key, p_id), ('carreport', v_key, p_id);
  insert into public.reports (car_id, reason, note, contact, ip_key)
  values (p_id, p_reason, nullif(trim(coalesce(p_note, '')), ''), nullif(trim(coalesce(p_contact, '')), ''), v_key);
  return true;
end $$;

-- Mapa webu: aktívne vozidlá.
create function public.sitemap_cars() returns jsonb
language sql stable security definer set search_path = public as $$
  select coalesce(jsonb_agg(jsonb_build_object('id', id, 'brand_id', brand_id, 'model_id', model_id, 'year', year, 'condition', condition, 'updated_at', updated_at) order by id desc), '[]')
  from (select id, brand_id, model_id, year, condition, updated_at from public.car_listings where status = 'active' order by id desc limit 5000) x
$$;

-- Správca: skryť alebo obnoviť vozidlo (s dôvodom pre predajcu, zápis do záznamu správcu).
create function public.admin_set_car(p_id bigint, p_block boolean, p_note text) returns void
language plpgsql security definer set search_path = public as $$
begin
  perform public.admin_check();
  update public.car_listings set status = case when p_block then 'blocked' else 'paused' end,
    moderation_note = case when p_block then nullif(trim(coalesce(p_note, '')), '') end
  where id = p_id;
  if not found then raise exception 'Inzerát neexistuje'; end if;
  insert into public.admin_log (admin_id, action, target, detail)
  values (auth.uid(), case when p_block then 'skryť vozidlo' else 'obnoviť vozidlo (pozastavené)' end, 'car:' || p_id, jsonb_build_object('poznamka', p_note));
end $$;

revoke all on function public.search_cars(jsonb), public.get_car(bigint), public.reveal_car_phone(bigint), public.log_car_view(bigint),
  public.send_car_message(bigint, text, text, text), public.report_car(bigint, text, text, text), public.sitemap_cars(), public.admin_set_car(bigint, boolean, text) from public;
grant execute on function public.search_cars(jsonb), public.get_car(bigint), public.reveal_car_phone(bigint), public.log_car_view(bigint),
  public.send_car_message(bigint, text, text, text), public.report_car(bigint, text, text, text), public.sitemap_cars() to anon, authenticated;
grant execute on function public.admin_set_car(bigint, boolean, text) to authenticated;

-- ===================== MOJE ÚDAJE (GDPR) =====================
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
    'auta_na_diely', coalesce((select jsonb_agg(to_jsonb(d)) from public.donor_cars d where d.seller_id = v), '[]'),
    'inzeraty', coalesce((select jsonb_agg(to_jsonb(l) - 'search_text' || jsonb_build_object(
        'telefon', (select phone from public.listing_contacts c where c.listing_id = l.id),
        'fotky', (select coalesce(jsonb_agg(path order by position), '[]') from public.listing_photos ph where ph.listing_id = l.id),
        'pasuje_aj_na', (select coalesce(jsonb_agg(jsonb_build_object('brand_id', brand_id, 'model_id', model_id, 'engine_id', engine_id)), '[]') from public.listing_fits f where f.listing_id = l.id)))
      from public.listings l where l.seller_id = v), '[]'),
    'havarovane_vozidla', coalesce((select jsonb_agg(to_jsonb(c) || jsonb_build_object(
        'telefon', (select phone from public.car_contacts k where k.car_id = c.id),
        'vin', (select vin from public.car_contacts k where k.car_id = c.id),
        'fotky', (select coalesce(jsonb_agg(path order by position), '[]') from public.car_photos ph where ph.car_id = c.id)))
      from public.car_listings c where c.seller_id = v), '[]'),
    'ponuky_na_dopyty', coalesce((select jsonb_agg(to_jsonb(o)) from public.part_offers o where o.seller_id = v), '[]'),
    'hodnotenia_od_kupujucich', coalesce((select jsonb_agg(jsonb_build_object('hviezdicky', r.stars, 'text', r.body, 'autor', r.author, 'kedy', r.created_at, 'skryte', r.hidden))
      from public.seller_reviews r where r.seller_id = v), '[]'),
    'spravy_od_kupujucich', coalesce((select jsonb_agg(to_jsonb(m)) from public.messages m where m.seller_id = v), '[]'));
end $$;
