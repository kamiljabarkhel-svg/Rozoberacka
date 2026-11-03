-- 05_bezpecnost_hladanie.sql – etapa 1 „Bezpečný základ“ (3. 11. 2026)
-- Spúšťa sa po 01–04. Nič nemaže, existujúce inzeráty a účty ostávajú.
--  A. Limity podľa IP adresy (telefón, správy, zobrazenia, nahlásenia)
--  B. Predajca už nemôže sám meniť zobrazenia, telefóny, TOP, overenie ani text správ kupujúcich
--  C. Záruka podľa zákona: firma pri použitom diele najmenej 12 mesiacov, odstúpenie do 14 dní pri kúpe na diaľku
--  D. Nahlásenie inzerátu, správcovia (admin), blokovanie a záznam akcií správcu
--  E. Hľadanie na serveri: bez diakritiky, s preklepmi a tvarmi slov, OEM, auto vrátane „pasuje aj na“ a rovnakého OEM
--  F. Limity fotiek v úložisku

create schema if not exists extensions;
create extension if not exists pg_trgm with schema extensions;
create extension if not exists unaccent with schema extensions;

-- ===================== A. LIMITY PODĽA IP =====================
create table public.rate_events (
  id         bigserial primary key,
  kind       text not null,             -- phone | view | message | report
  ip_key     text not null,             -- hash IP adresy (nie samotná IP)
  listing_id bigint,
  created_at timestamptz not null default now()
);
create index rate_events_ip on public.rate_events (kind, ip_key, created_at desc);
create index rate_events_listing on public.rate_events (kind, ip_key, listing_id, created_at desc);
alter table public.rate_events enable row level security;   -- žiadne pravidlá = nikto okrem funkcií

-- Hash IP adresy návštevníka (Supabase posiela IP v hlavičke x-forwarded-for).
create function public.client_ip_key() returns text
language sql stable set search_path = public as $$
  select encode(sha256(convert_to('rz|' || coalesce(
    nullif(split_part(coalesce(nullif(current_setting('request.headers', true), '')::json ->> 'x-forwarded-for', ''), ',', 1), ''),
    nullif(current_setting('request.headers', true), '')::json ->> 'cf-connecting-ip',
    'unknown'), 'UTF8')), 'hex');
$$;

-- Počet udalostí z tejto IP za obdobie.
create function public.rate_count(p_kind text, p_key text, p_since interval, p_listing bigint default null) returns int
language sql stable set search_path = public as $$
  select count(*)::int from public.rate_events
  where kind = p_kind and ip_key = p_key and created_at > now() - p_since
    and (p_listing is null or listing_id = p_listing);
$$;

create or replace function public.reveal_phone(p_listing bigint) returns text
language plpgsql security definer set search_path = public as $$
declare v_phone text; v_owner uuid; v_key text := public.client_ip_key();
begin
  select c.phone, l.seller_id into v_phone, v_owner
  from public.listing_contacts c join public.listings l on l.id = c.listing_id
  where c.listing_id = p_listing and l.status = 'active';
  if v_phone is null then return null; end if;
  if v_owner is not distinct from auth.uid() then return v_phone; end if;
  -- opakované odkrytie toho istého telefónu do 24 h sa nepočíta a neobmedzuje
  if public.rate_count('phone', v_key, interval '24 hours', p_listing) > 0 then return v_phone; end if;
  if public.rate_count('phone', v_key, interval '1 hour') >= 40 or public.rate_count('phone', v_key, interval '24 hours') >= 150 then
    raise exception 'Príliš veľa zobrazení telefónov z vášho pripojenia. Skúste to neskôr.' using errcode = 'P0001';
  end if;
  insert into public.rate_events (kind, ip_key, listing_id) values ('phone', v_key, p_listing);
  update public.listings set calls = calls + 1 where id = p_listing;
  return v_phone;
end $$;

create or replace function public.log_view(p_listing bigint) returns void
language plpgsql security definer set search_path = public as $$
declare v_key text := public.client_ip_key();
begin
  if random() < 0.01 then delete from public.rate_events where created_at < now() - interval '3 days'; end if;
  if not exists (select 1 from public.listings where id = p_listing and status = 'active' and seller_id is distinct from auth.uid()) then return; end if;
  if public.rate_count('view', v_key, interval '24 hours', p_listing) > 0 then return; end if;   -- 1 zobrazenie na IP a deň
  if public.rate_count('view', v_key, interval '1 hour') >= 300 then return; end if;             -- robot
  insert into public.rate_events (kind, ip_key, listing_id) values ('view', v_key, p_listing);
  update public.listings set views = views + 1 where id = p_listing and status = 'active';
end $$;

create or replace function public.send_message(p_listing bigint, p_name text, p_contact text, p_body text)
returns boolean language plpgsql security definer set search_path = public as $$
declare v_seller uuid; v_recent int; v_key text := public.client_ip_key();
begin
  select seller_id into v_seller from public.listings where id = p_listing and status = 'active';
  if v_seller is null then raise exception 'Inzerát neexistuje alebo nie je aktívny'; end if;
  if public.rate_count('message', v_key, interval '1 hour') >= 5 or public.rate_count('message', v_key, interval '24 hours') >= 20 then
    raise exception 'Príliš veľa správ z vášho pripojenia. Skúste to neskôr.';
  end if;
  select count(*) into v_recent from public.messages
   where lower(trim(sender_contact)) = lower(trim(p_contact)) and created_at > now() - interval '1 hour';
  if v_recent >= 5 then raise exception 'Príliš veľa správ za hodinu, skúste neskôr'; end if;
  select count(*) into v_recent from public.messages
   where listing_id = p_listing and created_at > now() - interval '1 hour';
  if v_recent >= 20 then raise exception 'K inzerátu prišlo veľa správ, skúste neskôr'; end if;
  insert into public.rate_events (kind, ip_key, listing_id) values ('message', v_key, p_listing);
  insert into public.messages (listing_id, seller_id, sender_name, sender_contact, body)
  values (p_listing, v_seller, trim(p_name), trim(p_contact), trim(p_body));
  return true;
end $$;

-- ===================== D1. SPRÁVCOVIA (potrebné pre B a C) =====================
create table public.admins (user_id uuid primary key references auth.users(id) on delete cascade, created_at timestamptz not null default now());
alter table public.admins enable row level security;
create policy admins_self on public.admins for select using (user_id = auth.uid());

create function public.is_admin() returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.admins where user_id = auth.uid());
$$;

create table public.admin_log (
  id         bigserial primary key,
  admin_id   uuid not null,
  action     text not null,
  target     text not null,
  detail     jsonb not null default '{}',
  created_at timestamptz not null default now()
);
alter table public.admin_log enable row level security;
create policy admin_log_read on public.admin_log for select using (public.is_admin());

alter table public.sellers add column blocked boolean not null default false;

-- ===================== B. STĹPCOVÉ PRÁVA =====================
-- Predajca mení len údaje inzerátu, nie počítadlá, TOP ani vlastníka.
revoke insert, update on public.listings from anon, authenticated;
grant insert (seller_id, name, brand_id, model_id, engine_id, year, category_id, subcategory_id, oem, price, city, condition,
              description, warranty, shipping, status, side, donor_gearbox, donor_km, tested, returns_14d, part_maker)
  on public.listings to authenticated;
grant update (name, brand_id, model_id, engine_id, year, category_id, subcategory_id, oem, price, city, condition,
              description, warranty, shipping, status, side, donor_gearbox, donor_km, tested, returns_14d, part_maker)
  on public.listings to authenticated;
-- Predajca nemení overenie ani blokovanie svojho profilu.
revoke insert, update on public.sellers from anon, authenticated;
grant insert (id, name, seller_type, city) on public.sellers to authenticated;
grant update (name, seller_type, city) on public.sellers to authenticated;
-- Pri správe od kupujúceho predajca mení len „prečítané“.
revoke insert, update on public.messages from anon, authenticated;
grant update (read_at) on public.messages to authenticated;

-- TOP zatiaľ zadarmo (pilot), najviac 3 naraz na predajcu, na 30 dní. Neskôr platené.
create function public.toggle_top(p_listing bigint, p_on boolean) returns timestamptz
language plpgsql security definer set search_path = public as $$
declare v_until timestamptz;
begin
  if not exists (select 1 from public.listings where id = p_listing and seller_id = auth.uid()) then
    raise exception 'Inzerát nepatrí vám';
  end if;
  if p_on then
    if not exists (select 1 from public.listings where id = p_listing and status = 'active') then
      raise exception 'TOP sa dá zapnúť len pri aktívnom inzeráte';
    end if;
    if (select count(*) from public.listings where seller_id = auth.uid() and status = 'active' and top_until > now() and id <> p_listing) >= 3 then
      raise exception 'Naraz môžete mať najviac 3 TOP inzeráty';
    end if;
    v_until := now() + interval '30 days';
  end if;
  update public.listings set top_until = v_until where id = p_listing;
  return v_until;
end $$;

-- ===================== C. ZÁRUKA A ODSTÚPENIE PODĽA ZÁKONA =====================
alter table public.listings drop constraint if exists listings_warranty_check;
update public.listings set warranty = '12 mesiacov' where warranty in ('14 dní', '3 mesiace');
update public.listings l set warranty = '12 mesiacov' from public.sellers s
  where s.id = l.seller_id and s.seller_type = 'Firma' and l.warranty = 'Bez záruky';
update public.listings l set returns_14d = true from public.sellers s where s.id = l.seller_id and s.seller_type = 'Firma';
alter table public.listings alter column warranty set default '12 mesiacov';
alter table public.listings add constraint listings_warranty_check check (warranty in ('Bez záruky', '12 mesiacov', '24 mesiacov'));

-- Stav „blocked“ = skrytý správcom.
alter table public.listings drop constraint if exists listings_status_check;
alter table public.listings add constraint listings_status_check check (status in ('active', 'paused', 'sold', 'blocked'));

-- Beží s právami volajúceho: current_user je „authenticated“ pri predajcovi, „postgres“ vo funkciách správcu a počítadiel.
create function public.guard_listing() returns trigger
language plpgsql set search_path = public as $$
declare v_type text; v_blocked boolean;
begin
  select seller_type, blocked into v_type, v_blocked from public.sellers where id = new.seller_id;
  if not public.is_admin() and current_user in ('authenticated', 'anon') then
    if v_blocked then raise exception 'Účet predajcu je zablokovaný. Kontaktujte správcu portálu.'; end if;
    if tg_op = 'INSERT' and new.status = 'blocked' then raise exception 'Neplatný stav inzerátu'; end if;
    if tg_op = 'UPDATE' and (old.status = 'blocked' or new.status = 'blocked') and new.status is distinct from old.status then
      raise exception 'Inzerát skryl správca portálu. Kontaktujte správcu.';
    end if;
  end if;
  if v_type = 'Firma' then
    if new.warranty = 'Bez záruky' then
      raise exception 'Firma musí pri použitom diele poskytnúť spotrebiteľovi záruku aspoň 12 mesiacov.';
    end if;
    new.returns_14d := true;   -- pri kúpe na diaľku od firmy má spotrebiteľ právo odstúpiť do 14 dní
  end if;
  return new;
end $$;
create trigger listings_guard before insert or update on public.listings for each row execute function public.guard_listing();

-- Keď sa predajca zmení na firmu, jeho inzeráty dostanú zákonnú záruku.
create function public.seller_type_changed() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if new.seller_type = 'Firma' and old.seller_type is distinct from 'Firma' then
    update public.listings set warranty = '12 mesiacov' where seller_id = new.id and warranty = 'Bez záruky';
    update public.listings set returns_14d = true where seller_id = new.id;
  end if;
  return new;
end $$;
create trigger sellers_type after update of seller_type on public.sellers for each row execute function public.seller_type_changed();

-- ===================== D2. NAHLÁSENIA A AKCIE SPRÁVCU =====================
create table public.reports (
  id          bigserial primary key,
  listing_id  bigint not null references public.listings(id) on delete cascade,
  reason      text not null check (reason in ('Podvod', 'Diel nie je na predaj', 'Nepravdivé údaje', 'Duplicitný inzerát', 'Nevhodný obsah', 'Iné')),
  note        text check (char_length(note) <= 500),
  contact     text check (char_length(contact) <= 120),
  ip_key      text,
  status      text not null default 'open' check (status in ('open', 'resolved', 'rejected')),
  created_at  timestamptz not null default now(),
  resolved_at timestamptz,
  resolved_by uuid
);
create index reports_open on public.reports (status, created_at desc);
alter table public.reports enable row level security;
create policy reports_admin_read on public.reports for select using (public.is_admin());

create function public.report_listing(p_listing bigint, p_reason text, p_note text, p_contact text) returns boolean
language plpgsql security definer set search_path = public as $$
declare v_key text := public.client_ip_key();
begin
  if not exists (select 1 from public.listings where id = p_listing and status = 'active') then
    raise exception 'Inzerát neexistuje alebo nie je aktívny';
  end if;
  if public.rate_count('report', v_key, interval '1 hour') >= 5 then raise exception 'Príliš veľa nahlásení, skúste to neskôr.'; end if;
  if public.rate_count('report', v_key, interval '30 days', p_listing) > 0 then return true; end if;   -- už nahlásené
  insert into public.rate_events (kind, ip_key, listing_id) values ('report', v_key, p_listing);
  insert into public.reports (listing_id, reason, note, contact, ip_key)
  values (p_listing, p_reason, nullif(trim(coalesce(p_note, '')), ''), nullif(trim(coalesce(p_contact, '')), ''), v_key);
  return true;
end $$;

-- Správca vidí všetky inzeráty (aj pozastavené a skryté) a súkromné údaje predajcov.
create policy listings_admin_read on public.listings for select using (public.is_admin());
create policy photos_admin_read on public.listing_photos for select using (public.is_admin());
create policy private_admin_read on public.seller_private for select using (public.is_admin());

create function public.admin_check() returns void
language plpgsql stable security definer set search_path = public as $$
begin if not public.is_admin() then raise exception 'Len pre správcu portálu'; end if; end $$;

create function public.admin_set_listing(p_listing bigint, p_block boolean, p_note text) returns void
language plpgsql security definer set search_path = public as $$
begin
  perform public.admin_check();
  update public.listings set status = case when p_block then 'blocked' else 'paused' end where id = p_listing;
  if not found then raise exception 'Inzerát neexistuje'; end if;
  insert into public.admin_log (admin_id, action, target, detail)
  values (auth.uid(), case when p_block then 'skryť inzerát' else 'obnoviť inzerát (pozastavený)' end, 'listing:' || p_listing, jsonb_build_object('poznamka', p_note));
end $$;

create function public.admin_set_seller(p_seller uuid, p_verified boolean, p_blocked boolean) returns void
language plpgsql security definer set search_path = public as $$
declare v_old public.sellers;
begin
  perform public.admin_check();
  select * into v_old from public.sellers where id = p_seller;
  if not found then raise exception 'Predajca neexistuje'; end if;
  update public.sellers set verified = coalesce(p_verified, verified), blocked = coalesce(p_blocked, blocked) where id = p_seller;
  if p_blocked is true and not v_old.blocked then
    update public.listings set status = 'blocked' where seller_id = p_seller and status = 'active';
  elsif p_blocked is false and v_old.blocked then
    update public.listings set status = 'paused' where seller_id = p_seller and status = 'blocked';
  end if;
  insert into public.admin_log (admin_id, action, target, detail)
  values (auth.uid(), 'zmena predajcu', 'seller:' || p_seller, jsonb_build_object('overeny', p_verified, 'zablokovany', p_blocked));
end $$;

create function public.admin_resolve_report(p_report bigint, p_status text) returns void
language plpgsql security definer set search_path = public as $$
begin
  perform public.admin_check();
  if p_status not in ('resolved', 'rejected', 'open') then raise exception 'Neplatný stav'; end if;
  update public.reports set status = p_status, resolved_at = case when p_status = 'open' then null else now() end,
    resolved_by = case when p_status = 'open' then null else auth.uid() end where id = p_report;
  insert into public.admin_log (admin_id, action, target, detail) values (auth.uid(), 'nahlásenie: ' || p_status, 'report:' || p_report, '{}');
end $$;

-- Prehľad predajcov pre správcu (s e-mailom z prihlásenia a počtami inzerátov).
create function public.admin_sellers() returns table (id uuid, name text, seller_type text, city text, verified boolean, blocked boolean,
  email text, phone text, ico text, created_at timestamptz, active bigint, total bigint)
language plpgsql stable security definer set search_path = public as $$
begin
  perform public.admin_check();
  return query
  select s.id, s.name, s.seller_type, s.city, s.verified, s.blocked, u.email::text, p.phone, p.ico, s.created_at,
         (select count(*) from public.listings l where l.seller_id = s.id and l.status = 'active'),
         (select count(*) from public.listings l where l.seller_id = s.id)
  from public.sellers s left join auth.users u on u.id = s.id left join public.seller_private p on p.seller_id = s.id
  order by s.created_at desc;
end $$;

create function public.admin_stats() returns jsonb
language plpgsql stable security definer set search_path = public as $$
begin
  perform public.admin_check();
  return jsonb_build_object(
    'sellers', (select count(*) from public.sellers),
    'sellers_new_7d', (select count(*) from public.sellers where created_at > now() - interval '7 days'),
    'active', (select count(*) from public.listings where status = 'active'),
    'blocked', (select count(*) from public.listings where status = 'blocked'),
    'reports_open', (select count(*) from public.reports where status = 'open'),
    'messages_7d', (select count(*) from public.messages where created_at > now() - interval '7 days'),
    'phones_7d', (select count(*) from public.rate_events where kind = 'phone' and created_at > now() - interval '7 days'),
    'views_7d', (select count(*) from public.rate_events where kind = 'view' and created_at > now() - interval '7 days'));
end $$;

-- ===================== E. HĽADANIE NA SERVERI =====================
alter table public.listings add column search_text text not null default '';

create function public.norm_text(t text) returns text
language sql stable set search_path = public, extensions as $$
  select lower(extensions.unaccent(coalesce(t, '')));
$$;

create function public.listing_search_text() returns trigger
language plpgsql security definer set search_path = public, extensions as $$
begin
  new.search_text := public.norm_text(concat_ws(' ',
    new.name, new.oem, new.oem_key, new.part_maker, new.description, new.city, new.side, new.donor_gearbox,
    (select name from public.brands where id = new.brand_id),
    (select name from public.models where id = new.model_id),
    (select name from public.engines where id = new.engine_id),
    (select name from public.categories where id = new.category_id),
    (select name from public.subcategories where id = new.subcategory_id)));
  return new;
end $$;
create trigger listings_search_text before insert or update on public.listings for each row execute function public.listing_search_text();
update public.listings set search_text = search_text;   -- doplní text existujúcim inzerátom (spustí trigger)

create index listings_search_trgm on public.listings using gin (search_text extensions.gin_trgm_ops);
create index listings_active_price on public.listings (price) where status = 'active';
create index listing_fits_vehicle on public.listing_fits (brand_id, model_id, engine_id);

-- Synonymá a hovorové názvy (bez diakritiky, malými písmenami). Dopĺňa sa podľa toho, čo ľudia hľadajú.
create table public.search_synonyms (word text not null, alt text not null, primary key (word, alt));
alter table public.search_synonyms enable row level security;
create policy synonyms_read on public.search_synonyms for select using (true);
insert into public.search_synonyms (word, alt) values
  ('svetlo','svetlomet'),('svetlomet','svetlo'),('far','svetlo'),('reflektor','svetlo'),('lampa','svetlo'),('lampa','svetlomet'),
  ('alternator','dynamo'),('dynamo','alternator'),('turbo','turbodychadlo'),('turbodychadlo','turbo'),('turbina','turbo'),
  ('startér','starter'),('starter','starter'),('spatne','spatne zrkadlo'),('zrkadlo','spatne zrkadlo'),
  ('naraznik','naraznik'),('blatnik','blatnik'),('kapota','kapota'),('blinker','smerovka'),('smerovka','blinker'),
  ('volant','volant'),('airbag','airbag'),('vstrekovac','injektor'),('injektor','vstrekovac'),('tryska','vstrekovac'),
  ('riadiaca','ecu'),('ecu','riadiaca jednotka'),('jednotka','ecu'),('chladic','radiator'),('radiator','chladic'),
  ('prevodovka','prevodovka'),('kvalt','prevodovka'),('motor','motor'),('hlava','hlava valcov'),('tlmic','tlmic'),
  ('pneumatika','pneu'),('pneu','pneumatika'),('disk','disky'),('elektron','disky hlinikove'),('alu','disky hlinikove'),
  ('dpf','filter pevnych castic'),('fap','dpf'),('egr','egr'),('kompresor','kompresor klimatizacie'),('klima','klimatizacia')
on conflict do nothing;

-- Slovo zo zadania → podmienka. Slová kratšie ako 3 znaky sa ignorujú.
-- Tvary slov: od 6 znakov sa porovná začiatok bez posledných 2 znakov (svetla → svetl…), od 4 bez posledného.
create function public.word_stem(w text) returns text language sql immutable as $$
  select case when char_length(w) >= 6 then left(w, char_length(w) - 2) when char_length(w) >= 4 then left(w, char_length(w) - 1) else w end;
$$;

create function public.text_matches(p_text text, p_words text[]) returns boolean
language sql stable set search_path = public, extensions as $$
  select coalesce(bool_and(
           p_text like '%' || public.word_stem(w) || '%'
        or exists (select 1 from public.search_synonyms s where s.word = w and p_text like '%' || s.alt || '%')
        or (char_length(w) >= 5 and w operator(extensions.<%) p_text)), true)
  from unnest(p_words) w where char_length(w) >= 3;
$$;

-- Hlavné hľadanie. Parametre (všetky nepovinné): q, brand, model, engine, year, cat, sub, max, cond, city, side,
-- tested, ret, ids (obľúbené), exclude, seller, sort (new|asc|desc), limit (max 60), offset.
-- Vráti: { total, base, cats: {kat: počet}, subs: {pod: počet}, items: [inzerát ako v tabuľke + sellers, photos, fits] }.
create function public.search_listings(p jsonb) returns jsonb
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
  excl bigint := (p ->> 'exclude')::bigint; slr uuid := (p ->> 'seller')::uuid;
  srt text := coalesce(p ->> 'sort', 'new');
  lim int := least(greatest(coalesce((p ->> 'limit')::int, 24), 1), 60); off int := greatest(coalesce((p ->> 'offset')::int, 0), 0);
  res jsonb;
begin
  with base as (
    select l.* from public.listings l
    where l.status = 'active'
      and (excl is null or l.id <> excl)
      and (slr is null or l.seller_id = slr)
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
        'tested', x.tested, 'returns_14d', x.returns_14d, 'top_until', x.top_until, 'part_maker', x.part_maker, 'seller_id', x.seller_id,
        'sellers', (select jsonb_build_object('name', s.name, 'seller_type', s.seller_type, 'city', s.city, 'verified', s.verified) from public.sellers s where s.id = x.seller_id),
        'listing_photos', coalesce((select jsonb_agg(jsonb_build_object('path', ph.path, 'position', ph.position) order by ph.position) from public.listing_photos ph where ph.listing_id = x.id), '[]'),
        'listing_fits', coalesce((select jsonb_agg(jsonb_build_object('brand_id', fi.brand_id, 'model_id', fi.model_id, 'engine_id', fi.engine_id)) from public.listing_fits fi where fi.listing_id = x.id), '[]')
      ) order by x.ord) from cut x), '[]')
  ) into res;
  return res;
end $$;

-- Mestá s aktívnymi inzerátmi (filter „Mesto“).
create function public.listing_cities() returns setof text
language sql stable set search_path = public as $$
  select distinct city from public.listings where status = 'active' and city is not null order by 1;
$$;

-- ===================== PRÁVA NA FUNKCIE =====================
revoke all on function public.client_ip_key(), public.rate_count(text, text, interval, bigint), public.admin_check(),
  public.guard_listing(), public.seller_type_changed(), public.listing_search_text() from public, anon, authenticated;
grant execute on function public.reveal_phone(bigint), public.log_view(bigint), public.send_message(bigint, text, text, text),
  public.report_listing(bigint, text, text, text), public.search_listings(jsonb), public.listing_cities(),
  public.norm_text(text), public.word_stem(text), public.text_matches(text, text[]), public.is_admin() to anon, authenticated;
grant execute on function public.toggle_top(bigint, boolean), public.admin_set_listing(bigint, boolean, text),
  public.admin_set_seller(uuid, boolean, boolean), public.admin_resolve_report(bigint, text), public.admin_sellers(), public.admin_stats() to authenticated;
revoke execute on function public.toggle_top(bigint, boolean), public.admin_set_listing(bigint, boolean, text),
  public.admin_set_seller(uuid, boolean, boolean), public.admin_resolve_report(bigint, text), public.admin_sellers(), public.admin_stats() from anon, public;

-- ===================== F. LIMITY FOTIEK =====================
update storage.buckets set file_size_limit = 5242880, allowed_mime_types = array['image/jpeg', 'image/webp', 'image/png']
  where id = 'listing-photos';
