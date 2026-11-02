-- Rozoberačka – rozšírenie databázy (2. 11. 2026)
-- Funkcie podľa konkurencie a povinné polia formulára predajcu (CLAUDE.md).
-- Spúšťa sa raz, PO súboroch 01, 02 a 03.

-- ============ NOVÉ POLIA INZERÁTU ============
alter table public.listings
  add column side          text check (side in ('Ľavá','Pravá')),
  add column donor_gearbox text check (donor_gearbox in ('Manuálna','Automatická')),
  add column donor_km      int  check (donor_km between 0 and 3000000),
  add column tested        boolean not null default false,
  add column returns_14d   boolean not null default false,
  add column top_until     timestamptz,
  add column part_maker    text check (char_length(part_maker) <= 60);

-- ============ POVINNÉ POLIA (aj v databáze, nielen vo formulári) ============
alter table public.listings
  alter column brand_id set not null,
  alter column model_id set not null,
  alter column year     set not null,
  alter column city     set not null;
alter table public.listings
  add constraint listings_oem_required  check (char_length(oem_key) >= 4),
  add constraint listings_desc_required check (char_length(coalesce(description, '')) >= 20),
  add constraint listings_price_positive check (price > 0),
  add constraint listings_year_range    check (year between 1950 and 2100),
  add constraint listings_city_required check (char_length(trim(city)) >= 2);
alter table public.listing_contacts
  add constraint contacts_phone_digits check (char_length(regexp_replace(phone, '[^0-9]', '', 'g')) >= 9);

create index listings_top on public.listings (top_until desc nulls last) where status = 'active';

-- ============ SPRÁVY PREDAJCOVI ============
create table public.messages (
  id             bigserial primary key,
  listing_id     bigint not null references public.listings(id) on delete cascade,
  seller_id      uuid   not null references public.sellers(id)  on delete cascade,
  sender_name    text   not null check (char_length(trim(sender_name)) between 2 and 80),
  sender_contact text   not null check (char_length(trim(sender_contact)) between 5 and 120),
  body           text   not null check (char_length(trim(body)) between 5 and 800),
  created_at     timestamptz not null default now(),
  read_at        timestamptz
);
create index messages_seller on public.messages (seller_id, created_at desc);
alter table public.messages enable row level security;

-- Číta, označuje ako prečítané a maže len predajca, ktorému správa patrí.
create policy messages_own_read   on public.messages for select using (seller_id = auth.uid());
create policy messages_own_update on public.messages for update using (seller_id = auth.uid()) with check (seller_id = auth.uid());
create policy messages_own_delete on public.messages for delete using (seller_id = auth.uid());
-- Priamo vkladať nesmie nikto, len cez funkciu send_message (obmedzenie počtu správ).

create function public.send_message(p_listing bigint, p_name text, p_contact text, p_body text)
returns boolean language plpgsql security definer set search_path = public as $$
declare v_seller uuid; v_recent int;
begin
  select seller_id into v_seller from public.listings where id = p_listing and status = 'active';
  if v_seller is null then raise exception 'Inzerát neexistuje alebo nie je aktívny'; end if;
  select count(*) into v_recent from public.messages
   where lower(trim(sender_contact)) = lower(trim(p_contact)) and created_at > now() - interval '1 hour';
  if v_recent >= 5 then raise exception 'Príliš veľa správ za hodinu, skúste neskôr'; end if;
  select count(*) into v_recent from public.messages
   where listing_id = p_listing and created_at > now() - interval '1 hour';
  if v_recent >= 20 then raise exception 'K inzerátu prišlo veľa správ, skúste neskôr'; end if;
  insert into public.messages (listing_id, seller_id, sender_name, sender_contact, body)
  values (p_listing, v_seller, trim(p_name), trim(p_contact), trim(p_body));
  return true;
end $$;

-- ============ ČÍSLA NA ÚVODE ============
create function public.public_stats() returns table (parts bigint, sellers bigint)
language sql stable security definer set search_path = public as $$
  select count(*), count(distinct seller_id) from public.listings where status = 'active';
$$;

revoke all on function public.send_message(bigint, text, text, text) from public;
revoke all on function public.public_stats() from public;
grant execute on function public.send_message(bigint, text, text, text) to anon, authenticated;
grant execute on function public.public_stats() to anon, authenticated;
