-- 10_predane_navrhy_hodnotenia_strazca.sql – (6. 11. 2026). Spúšťa sa po 09.
--  A. Predaný alebo pozastavený diel: stránka ostane („Predané“ + podobné diely), bez kontaktu na predajcu
--  B. Našepkávanie pri písaní (názvy dielov z aktívnych inzerátov)
--  C. Hodnotenie predajcov – len kupujúci, ktorý od predajcu dostal ponuku na svoj dopyt (overené cez súkromný kód)
--  D. Strážca e-mailom – kupujúci bez účtu, dvojité potvrdenie e-mailu; e-maily posiela funkcia supabase/functions/strazca
--  E. Verejné stĺpce predajcov (čas súhlasu s podmienkami už nie je verejný)

-- ===================== A. PREDANÝ / POZASTAVENÝ DIEL =====================
alter table public.listings add column sold_at timestamptz;
create or replace function public.listing_sold_at() returns trigger language plpgsql set search_path = public as $$
begin
  if new.status = 'sold' and old.status is distinct from 'sold' then new.sold_at := now();
  elsif new.status <> 'sold' then new.sold_at := null; end if;
  return new;
end $$;
create trigger listings_sold_at before update of status on public.listings for each row execute function public.listing_sold_at();
revoke all on function public.listing_sold_at() from public, anon, authenticated;

-- Základné údaje o neaktívnom inzeráte (predaný do 180 dní, pozastavený). Bez telefónu, popisu a predajcu.
create function public.listing_gone(p_id bigint) returns jsonb
language sql stable security definer set search_path = public as $$
  select jsonb_build_object('id', l.id, 'name', l.name, 'status', l.status, 'brand_id', l.brand_id, 'model_id', l.model_id,
    'engine_id', l.engine_id, 'year', l.year, 'category_id', l.category_id, 'subcategory_id', l.subcategory_id, 'oem', l.oem,
    'sold_at', l.sold_at, 'photo', (select path from public.listing_photos p where p.listing_id = l.id order by position limit 1))
  from public.listings l join public.sellers s on s.id = l.seller_id
  where l.id = p_id and not s.blocked
    and ((l.status = 'sold' and coalesce(l.sold_at, l.updated_at) > now() - interval '180 days') or l.status = 'paused');
$$;

-- ===================== B. NAŠEPKÁVANIE =====================
create function public.search_suggest(p_q text) returns table (name text, n bigint)
language sql stable set search_path = public, extensions as $$
  with w as (select array(select x from unnest(regexp_split_to_array(public.norm_text(trim(coalesce(p_q, ''))), '[^a-z0-9]+')) x
                          where char_length(x) >= 2) as words)
  select min(l.name), count(*)
  from public.listings l, w
  where l.status = 'active' and cardinality(w.words) > 0 and char_length(trim(p_q)) between 2 and 60
    and (select bool_and(public.norm_text(l.name) like '%' || x || '%') from unnest(w.words) x)
  group by public.norm_text(l.name)
  order by count(*) desc, min(l.name)
  limit 6;
$$;

-- ===================== C. HODNOTENIE PREDAJCOV =====================
alter table public.sellers add column rating_avg numeric(2,1), add column rating_count int not null default 0;

create table public.seller_reviews (
  id          bigserial primary key,
  seller_id   uuid not null references public.sellers(id) on delete cascade,
  request_id  bigint references public.part_requests(id) on delete set null,   -- dopyt sa po 60 dňoch zmaže, hodnotenie ostane
  stars       int not null check (stars between 1 and 5),
  body        text check (char_length(body) <= 500),
  author      text not null check (char_length(author) between 1 and 40),     -- krstné meno z dopytu
  hidden      boolean not null default false,                                   -- skryté správcom
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  unique (request_id, seller_id)
);
create index seller_reviews_seller on public.seller_reviews (seller_id, created_at desc);
alter table public.seller_reviews enable row level security;
create policy reviews_read on public.seller_reviews for select using (not hidden or (select public.is_admin()));
revoke all on public.seller_reviews from anon, authenticated;
grant select (id, seller_id, stars, body, author, created_at, hidden) on public.seller_reviews to anon, authenticated;

create function public.seller_rating_refresh() returns trigger
language plpgsql security definer set search_path = public as $$
declare v uuid := coalesce(new.seller_id, old.seller_id);
begin
  update public.sellers s set rating_count = x.n, rating_avg = x.a
  from (select count(*)::int n, round(avg(stars)::numeric, 1) a from public.seller_reviews where seller_id = v and not hidden) x
  where s.id = v;
  return null;
end $$;
revoke all on function public.seller_rating_refresh() from public, anon, authenticated;
create trigger seller_reviews_rating after insert or update or delete on public.seller_reviews
  for each row execute function public.seller_rating_refresh();

-- Kupujúci ohodnotí predajcu, ktorý mu poslal ponuku. Zmena hodnotenia prepíše predchádzajúce.
create function public.rate_seller(p_token uuid, p_seller uuid, p_stars int, p_body text) returns void
language plpgsql security definer set search_path = public as $$
declare v_req public.part_requests; v_key text := public.client_ip_key();
begin
  select * into v_req from public.part_requests where token = p_token;
  if v_req.id is null then raise exception 'Dopyt sa nenašiel'; end if;
  if not exists (select 1 from public.part_offers where request_id = v_req.id and seller_id = p_seller) then
    raise exception 'Hodnotiť môžete len predajcu, ktorý vám poslal ponuku';
  end if;
  if p_stars is null or p_stars not between 1 and 5 then raise exception 'Vyberte 1 až 5 hviezdičiek'; end if;
  if public.rate_count('review', v_key, interval '1 hour') >= 10 then raise exception 'Príliš veľa hodnotení, skúste to neskôr.'; end if;
  insert into public.seller_reviews (seller_id, request_id, stars, body, author)
  values (p_seller, v_req.id, p_stars, nullif(trim(coalesce(p_body, '')), ''), left(split_part(trim(v_req.contact_name), ' ', 1), 40))
  on conflict (request_id, seller_id) do update set stars = excluded.stars, body = excluded.body, updated_at = now();
  insert into public.rate_events (kind, ip_key) values ('review', v_key);
end $$;

create function public.admin_hide_review(p_id bigint, p_hide boolean) returns void
language plpgsql security definer set search_path = public as $$
begin
  perform public.admin_check();
  update public.seller_reviews set hidden = p_hide where id = p_id;
  insert into public.admin_log (admin_id, action, target, detail)
  values (auth.uid(), case when p_hide then 'skryť hodnotenie' else 'obnoviť hodnotenie' end, 'review:' || p_id, '{}');
end $$;

-- Ponuky na dopyt teraz obsahujú aj id predajcu a moje hodnotenie (na hodnotenie a odkaz na jeho stránku).
create or replace function public.get_part_request(p_token uuid) returns jsonb
language sql stable security definer set search_path = public as $$
  select case when r.id is null then null else jsonb_build_object(
    'id', r.id, 'status', case when r.status = 'open' and r.expires_at <= now() then 'expired' else r.status end,
    'brand_id', r.brand_id, 'model_id', r.model_id, 'engine_id', r.engine_id, 'year', r.year, 'category_id', r.category_id,
    'part_name', r.part_name, 'note', r.note, 'city', r.city, 'created_at', r.created_at, 'expires_at', r.expires_at,
    'offers', coalesce((select jsonb_agg(jsonb_build_object(
        'price', o.price, 'phone', o.phone, 'note', o.note, 'listing_id', o.listing_id, 'listing_name', l.name, 'created_at', o.created_at,
        'seller_id', s.id, 'seller', s.name, 'seller_type', s.seller_type, 'seller_city', s.city, 'verified', s.verified,
        'rating_avg', s.rating_avg, 'rating_count', s.rating_count,
        'my_stars', (select v.stars from public.seller_reviews v where v.request_id = r.id and v.seller_id = s.id),
        'my_review', (select v.body from public.seller_reviews v where v.request_id = r.id and v.seller_id = s.id)) order by o.price)
      from public.part_offers o join public.sellers s on s.id = o.seller_id left join public.listings l on l.id = o.listing_id and l.status = 'active'
      where o.request_id = r.id and not s.blocked), '[]')) end
  from (select 1) x left join public.part_requests r on r.token = p_token;
$$;

-- ===================== D. STRÁŽCA E-MAILOM =====================
create table public.search_alerts (
  id              bigserial primary key,
  token           uuid not null unique default gen_random_uuid(),   -- odkaz na potvrdenie a zrušenie
  email           text not null check (email ~* '^[^@\s]+@[^@\s]+\.[a-z]{2,}$' and char_length(email) <= 200),
  filter          jsonb not null,
  label           text not null check (char_length(label) between 1 and 160),
  consent_at      timestamptz not null default now(),
  confirm_sent_at timestamptz,
  confirmed_at    timestamptz,
  last_sent_at    timestamptz,
  last_checked_at timestamptz not null default now(),
  ip_key          text,
  created_at      timestamptz not null default now()
);
create index search_alerts_email on public.search_alerts (lower(email));
create index search_alerts_due on public.search_alerts (confirmed_at, last_checked_at);
alter table public.search_alerts enable row level security;   -- žiadne pravidlá: číta len databáza a funkcia na e-maily
revoke all on public.search_alerts from anon, authenticated;

-- Kupujúci zapne upozornenie. E-mail s odkazom na potvrdenie pošle funkcia „strazca“; bez potvrdenia sa nič neposiela.
create function public.create_search_alert(p_email text, p_filter jsonb, p_label text, p_consent boolean) returns void
language plpgsql security definer set search_path = public as $$
declare v_key text := public.client_ip_key(); v_email text := lower(trim(coalesce(p_email, '')));
begin
  if not coalesce(p_consent, false) then raise exception 'Potvrďte súhlas so zasielaním upozornení'; end if;
  if v_email !~* '^[^@\s]+@[^@\s]+\.[a-z]{2,}$' then raise exception 'Skontrolujte e-mailovú adresu'; end if;
  if jsonb_typeof(p_filter) <> 'object' or pg_column_size(p_filter) > 2000 then raise exception 'Neplatné hľadanie'; end if;
  if public.rate_count('alert', v_key, interval '1 hour') >= 5 then raise exception 'Príliš veľa žiadostí, skúste to neskôr.'; end if;
  if (select count(*) from public.search_alerts where lower(email) = v_email) >= 10 then
    raise exception 'Na tento e-mail je už 10 upozornení. Niektoré zrušte odkazom v e-maile.';
  end if;
  insert into public.search_alerts (email, filter, label, ip_key) values (v_email, p_filter, left(trim(p_label), 160), v_key);
  insert into public.rate_events (kind, ip_key) values ('alert', v_key);
end $$;

create function public.confirm_search_alert(p_token uuid) returns text
language sql security definer set search_path = public as $$
  update public.search_alerts set confirmed_at = coalesce(confirmed_at, now()), last_checked_at = now()
  where token = p_token returning label;
$$;

create function public.cancel_search_alert(p_token uuid) returns text
language sql security definer set search_path = public as $$
  delete from public.search_alerts where token = p_token returning label;
$$;

-- ===================== E. VEREJNÉ STĹPCE PREDAJCOV =====================
revoke select on public.sellers from anon, authenticated;
grant select (id, name, seller_type, city, verified, blocked, created_at, rating_avg, rating_count) on public.sellers to anon, authenticated;

-- ===================== MAZANIE A EXPORT (doplnené) =====================
create or replace function public.purge_old_data() returns void
language plpgsql security definer set search_path = public as $$
begin
  delete from public.rate_events where created_at < now() - interval '3 days';
  delete from public.messages where created_at < now() - interval '12 months';
  update public.reports set ip_key = null where ip_key is not null and created_at < now() - interval '30 days';
  delete from public.reports where created_at < now() - interval '12 months' and status <> 'open';
  delete from public.admin_log where created_at < now() - interval '3 years';
  delete from public.part_requests where created_at < now() - interval '60 days';
  delete from public.search_alerts where confirmed_at is null and created_at < now() - interval '3 days';   -- nepotvrdené
  delete from public.search_alerts where created_at < now() - interval '6 months';                         -- strážca platí pol roka
  update public.search_alerts set ip_key = null where ip_key is not null and created_at < now() - interval '3 days';
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
    'hodnotenia_od_kupujucich', coalesce((select jsonb_agg(jsonb_build_object('hviezdicky', r.stars, 'text', r.body, 'autor', r.author, 'kedy', r.created_at, 'skryte', r.hidden))
      from public.seller_reviews r where r.seller_id = v), '[]'),
    'spravy_od_kupujucich', coalesce((select jsonb_agg(to_jsonb(m)) from public.messages m where m.seller_id = v), '[]'));
end $$;

-- Správca: zoznam hodnotení (aj skrytých)
create function public.admin_reviews() returns jsonb
language plpgsql stable security definer set search_path = public as $$
begin
  perform public.admin_check();
  return coalesce((select jsonb_agg(jsonb_build_object('id', r.id, 'seller', s.name, 'seller_id', s.id, 'stars', r.stars, 'body', r.body,
    'author', r.author, 'hidden', r.hidden, 'created_at', r.created_at) order by r.created_at desc)
    from (select * from public.seller_reviews order by created_at desc limit 200) r join public.sellers s on s.id = r.seller_id), '[]');
end $$;

-- ===================== PRÁVA =====================
revoke all on function public.listing_gone(bigint), public.search_suggest(text), public.rate_seller(uuid, uuid, int, text),
  public.admin_hide_review(bigint, boolean), public.create_search_alert(text, jsonb, text, boolean),
  public.confirm_search_alert(uuid), public.cancel_search_alert(uuid), public.admin_reviews() from public;
grant execute on function public.listing_gone(bigint), public.search_suggest(text), public.rate_seller(uuid, uuid, int, text),
  public.create_search_alert(text, jsonb, text, boolean), public.confirm_search_alert(uuid), public.cancel_search_alert(uuid) to anon, authenticated;
grant execute on function public.admin_hide_review(bigint, boolean), public.admin_reviews() to authenticated;
