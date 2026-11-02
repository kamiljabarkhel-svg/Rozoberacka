-- Rozoberačka – databáza pre Supabase (PostgreSQL)
-- Spúšťa sa raz v Supabase: SQL Editor → vložiť → Run.
-- Poradie súborov: 01_schema.sql, 02_kategorie.sql, 03_katalog.sql

-- ============ PREDAJCOVIA ============
-- Verejné údaje predajcu (vidí ich každý)
create table public.sellers (
  id          uuid primary key references auth.users(id) on delete cascade,
  name        text not null check (char_length(name) between 2 and 120),
  seller_type text not null default 'Firma' check (seller_type in ('Firma','Súkromná osoba')),
  city        text,
  verified    boolean not null default false,   -- mení len správca
  created_at  timestamptz not null default now()
);

-- Súkromné údaje predajcu (vidí ich len on sám)
create table public.seller_private (
  seller_id  uuid primary key references public.sellers(id) on delete cascade,
  phone      text,
  ico        text,
  updated_at timestamptz not null default now()
);

-- ============ KATALÓG ÁUT ============
create table public.brands (
  id      serial primary key,
  name    text not null unique,
  popular boolean not null default false        -- zobrazí sa medzi rýchlymi značkami
);
create table public.models (
  id        serial primary key,
  brand_id  int  not null references public.brands(id) on delete cascade,
  name      text not null,
  year_from int  not null,
  year_to   int,                                -- null = vyrába sa doteraz
  unique (brand_id, name)
);
create table public.engines (
  id       serial primary key,
  model_id int  not null references public.models(id) on delete cascade,
  name     text not null,
  unique (model_id, name)
);

-- ============ KATEGÓRIE DIELOV ============
create table public.categories (
  id   text primary key,
  name text not null,
  sort int  not null default 0
);
create table public.subcategories (
  id          serial primary key,
  category_id text not null references public.categories(id) on delete cascade,
  name        text not null,
  sort        int  not null default 0,
  unique (category_id, name)
);

-- ============ INZERÁTY ============
create table public.listings (
  id             bigserial primary key,
  seller_id      uuid not null references public.sellers(id) on delete cascade,
  name           text not null check (char_length(name) between 2 and 120),
  brand_id       int references public.brands(id),
  model_id       int references public.models(id),
  engine_id      int references public.engines(id),   -- null = pasuje na všetky motorizácie modelu
  year           int,
  category_id    text not null references public.categories(id),
  subcategory_id int references public.subcategories(id),
  oem            text,
  oem_key        text generated always as (upper(regexp_replace(coalesce(oem,''), '[^A-Za-z0-9]', '', 'g'))) stored,
  price          numeric(10,2) not null check (price >= 0),
  city           text,
  condition      text not null default 'Dobrý' check (condition in ('Veľmi dobrý','Dobrý','Na opravu')),
  description    text check (char_length(description) <= 1000),
  warranty       text not null default 'Bez záruky' check (warranty in ('Bez záruky','14 dní','3 mesiace')),
  shipping       text not null default 'Len osobný odber',
  status         text not null default 'active' check (status in ('active','paused','sold')),
  views          int  not null default 0,
  calls          int  not null default 0,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now(),
  search         tsvector generated always as (
                   to_tsvector('simple', coalesce(name,'') || ' ' || coalesce(oem,'') || ' ' || coalesce(description,''))
                 ) stored
);
create index listings_status_created on public.listings (status, created_at desc);
create index listings_vehicle        on public.listings (brand_id, model_id, engine_id);
create index listings_category       on public.listings (category_id, subcategory_id);
create index listings_oem_key        on public.listings (oem_key);
create index listings_search         on public.listings using gin (search);

-- Telefón k inzerátu je oddelený, aby sa nedal hromadne stiahnuť zo zoznamu
create table public.listing_contacts (
  listing_id bigint primary key references public.listings(id) on delete cascade,
  phone      text not null
);

-- „Pasuje aj na“ ďalšie autá
create table public.listing_fits (
  id         bigserial primary key,
  listing_id bigint not null references public.listings(id) on delete cascade,
  brand_id   int not null references public.brands(id),
  model_id   int references public.models(id),
  engine_id  int references public.engines(id),          -- null = všetky motorizácie
  unique (listing_id, brand_id, model_id, engine_id)
);

-- Fotky (súbory sú v Storage, tu je len cesta a poradie)
create table public.listing_photos (
  id         bigserial primary key,
  listing_id bigint not null references public.listings(id) on delete cascade,
  path       text not null,
  position   int  not null default 0
);
create index listing_photos_listing on public.listing_photos (listing_id, position);

-- Automatický čas poslednej úpravy
create function public.touch_updated_at() returns trigger language plpgsql as $$
begin new.updated_at := now(); return new; end $$;
create trigger listings_touch before update on public.listings
  for each row execute function public.touch_updated_at();

-- ============ BEZPEČNOSŤ (Row Level Security) ============
alter table public.sellers          enable row level security;
alter table public.seller_private   enable row level security;
alter table public.brands           enable row level security;
alter table public.models           enable row level security;
alter table public.engines          enable row level security;
alter table public.categories       enable row level security;
alter table public.subcategories    enable row level security;
alter table public.listings         enable row level security;
alter table public.listing_contacts enable row level security;
alter table public.listing_fits     enable row level security;
alter table public.listing_photos   enable row level security;

-- Katalóg a kategórie: čítať môže každý, meniť len správca (service role obchádza RLS)
create policy catalog_read on public.brands        for select using (true);
create policy catalog_read on public.models        for select using (true);
create policy catalog_read on public.engines       for select using (true);
create policy catalog_read on public.categories    for select using (true);
create policy catalog_read on public.subcategories for select using (true);

-- Predajca: verejný profil číta každý, upravuje len vlastník
create policy sellers_read   on public.sellers for select using (true);
create policy sellers_insert on public.sellers for insert with check (id = auth.uid());
create policy sellers_update on public.sellers for update using (id = auth.uid()) with check (id = auth.uid() and verified = (select s.verified from public.sellers s where s.id = auth.uid()));

create policy private_own on public.seller_private for all
  using (seller_id = auth.uid()) with check (seller_id = auth.uid());

-- Inzeráty: aktívne vidí každý, vlastné vidí predajca vždy
create policy listings_read   on public.listings for select using (status = 'active' or seller_id = auth.uid());
create policy listings_insert on public.listings for insert with check (seller_id = auth.uid());
create policy listings_update on public.listings for update using (seller_id = auth.uid()) with check (seller_id = auth.uid());
create policy listings_delete on public.listings for delete using (seller_id = auth.uid());

-- Telefón k inzerátu: priamo ho vidí len vlastník, ostatní cez funkciu reveal_phone
create policy contacts_own on public.listing_contacts for all
  using (exists (select 1 from public.listings l where l.id = listing_id and l.seller_id = auth.uid()))
  with check (exists (select 1 from public.listings l where l.id = listing_id and l.seller_id = auth.uid()));

-- Fotky a „pasuje na“: čítať pri viditeľnom inzeráte, meniť len vlastník
create policy fits_read on public.listing_fits for select
  using (exists (select 1 from public.listings l where l.id = listing_id and (l.status = 'active' or l.seller_id = auth.uid())));
create policy fits_write on public.listing_fits for all
  using (exists (select 1 from public.listings l where l.id = listing_id and l.seller_id = auth.uid()))
  with check (exists (select 1 from public.listings l where l.id = listing_id and l.seller_id = auth.uid()));
create policy photos_read on public.listing_photos for select
  using (exists (select 1 from public.listings l where l.id = listing_id and (l.status = 'active' or l.seller_id = auth.uid())));
create policy photos_write on public.listing_photos for all
  using (exists (select 1 from public.listings l where l.id = listing_id and l.seller_id = auth.uid()))
  with check (exists (select 1 from public.listings l where l.id = listing_id and l.seller_id = auth.uid()));

-- ============ FUNKCIE PRE KUPUJÚCICH (bez účtu) ============
-- Odkrytie telefónu: vráti číslo len pri aktívnom inzeráte a pripočíta odkrytie
create function public.reveal_phone(p_listing bigint) returns text
language plpgsql security definer set search_path = public as $$
declare v_phone text; v_owner uuid;
begin
  select c.phone, l.seller_id into v_phone, v_owner
  from public.listing_contacts c join public.listings l on l.id = c.listing_id
  where c.listing_id = p_listing and l.status = 'active';
  if v_phone is not null and v_owner is distinct from auth.uid() then
    update public.listings set calls = calls + 1 where id = p_listing;
  end if;
  return v_phone;
end $$;

-- Zobrazenie inzerátu: pripočíta zobrazenie (nie vlastníkovi)
create function public.log_view(p_listing bigint) returns void
language plpgsql security definer set search_path = public as $$
begin
  update public.listings set views = views + 1
  where id = p_listing and status = 'active' and seller_id is distinct from auth.uid();
end $$;

-- Všetky autá, na ktoré diel pasuje: vlastné auto + „pasuje aj na“ + inzeráty s rovnakým OEM
create function public.listing_vehicles(p_listing bigint)
returns table (brand_id int, model_id int, engine_id int)
language sql stable security definer set search_path = public as $$
  with me as (select id, oem_key from public.listings where id = p_listing and status = 'active'),
  peers as (
    select l.id from public.listings l, me
    where l.status = 'active' and (l.id = me.id or (char_length(me.oem_key) >= 4 and l.oem_key = me.oem_key))
  )
  select distinct l.brand_id, l.model_id, l.engine_id from public.listings l join peers p on p.id = l.id where l.brand_id is not null
  union
  select distinct f.brand_id, f.model_id, f.engine_id from public.listing_fits f join peers p on p.id = f.listing_id;
$$;

revoke all on function public.reveal_phone(bigint)     from public;
revoke all on function public.log_view(bigint)         from public;
revoke all on function public.listing_vehicles(bigint) from public;
grant execute on function public.reveal_phone(bigint)     to anon, authenticated;
grant execute on function public.log_view(bigint)         to anon, authenticated;
grant execute on function public.listing_vehicles(bigint) to anon, authenticated;

-- ============ FOTKY V STORAGE ============
-- Verejný bucket; predajca smie nahrávať a mazať len vo vlastnom priečinku <user id>/...
insert into storage.buckets (id, name, public) values ('listing-photos', 'listing-photos', true)
  on conflict (id) do nothing;
create policy photos_upload on storage.objects for insert to authenticated
  with check (bucket_id = 'listing-photos' and (storage.foldername(name))[1] = auth.uid()::text);
create policy photos_own_read on storage.objects for select to authenticated
  using (bucket_id = 'listing-photos' and (storage.foldername(name))[1] = auth.uid()::text);
create policy photos_delete on storage.objects for delete to authenticated
  using (bucket_id = 'listing-photos' and (storage.foldername(name))[1] = auth.uid()::text);
