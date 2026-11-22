-- 41: Dopyty – komu sa ukážu a kto dostane e-mail (22. 11. 2026).
-- Predtým: len predajca s aktívnym inzerátom, ktorého auto je značka dopytu. Diel, ktorý pasuje aj na iné autá
-- („Pasuje aj na“), ani vrakovisko, ktoré rozoberá všetky značky, sa nepočítali.
-- Teraz predajca „predáva značku“, ak platí aspoň jedno:
--   * má aktívny inzerát s autom tej značky,
--   * má aktívny inzerát, ktorý pasuje aj na tú značku (listing_fits),
--   * si ju vybral v profile (seller_private.request_brands),
--   * v profile zaškrtol „Všetky značky“ (seller_private.request_all).
-- Kupujúcemu, ktorý ako kontakt zadal e-mail, sa raz pošle odkaz na jeho dopyt (ponuky) – request_buyer_outbox().
-- E-maily posiela Edge Function `dopyty`. Test: supabase/testy/44_test_41.sql
begin;

alter table public.seller_private
  add column if not exists request_all boolean not null default false,
  add column if not exists request_brands int[] not null default '{}';
do $$ begin
  alter table public.seller_private add constraint seller_private_request_brands_max check (cardinality(request_brands) <= 300);
exception when duplicate_object then null; end $$;

-- Zhoda predajca × značka (len pre funkcie nižšie, nie pre verejnosť).
create or replace function public.seller_matches_brand(p_seller uuid, p_brand int) returns boolean
language sql stable security definer set search_path = public as $$
  select coalesce((select p.request_all or p_brand = any(p.request_brands) from public.seller_private p where p.seller_id = p_seller), false)
      or exists (select 1 from public.listings l where l.seller_id = p_seller and l.status = 'active' and l.brand_id = p_brand)
      or exists (select 1 from public.listing_fits f join public.listings l on l.id = f.listing_id
                 where l.seller_id = p_seller and l.status = 'active' and f.brand_id = p_brand)
$$;
revoke all on function public.seller_matches_brand(uuid, int) from public, anon, authenticated;

-- Fronta e-mailov predajcom (z 34) – nová zhoda značky.
create or replace function public.request_outbox(p_limit int default 100) returns table (
  request_id bigint, seller_id uuid, to_email text, seller_name text,
  brand text, model text, year int, category text, part_name text, note text, city text, created_at timestamptz)
language sql stable security definer set search_path = public, auth as $$
  select r.id, s.id, u.email::text, s.name,
         b.name, m.name, r.year, c.name, r.part_name, r.note, r.city, r.created_at
  from public.part_requests r
  join public.brands b on b.id = r.brand_id
  left join public.models m on m.id = r.model_id
  left join public.categories c on c.id = r.category_id
  join public.sellers s on not s.blocked
  join auth.users u on u.id = s.id and u.email is not null and u.email_confirmed_at is not null
  left join public.seller_private p on p.seller_id = s.id
  where r.status = 'open' and r.expires_at > now() and r.created_at > now() - interval '2 days'
    and coalesce(p.notify_requests, true)
    and public.seller_matches_brand(s.id, r.brand_id)
    and not exists (select 1 from public.request_notices n where n.request_id = r.id and n.seller_id = s.id)
    and (select count(*) from public.request_notices n where n.seller_id = s.id and n.created_at > now() - interval '1 day') < 20
  order by r.id, s.id
  limit greatest(1, least(p_limit, 500))
$$;
revoke all on function public.request_outbox(int) from public, anon, authenticated;
grant execute on function public.request_outbox(int) to service_role;

-- Odkaz pre kupujúceho e-mailom (raz, len ak kontakt vyzerá ako e-mail).
alter table public.part_requests
  add column if not exists link_sent_at timestamptz,
  add column if not exists link_error text;
-- staršie dopyty (zadané pred touto zmenou) už e-mail nedostanú
update public.part_requests set link_error = 'pred 41' where link_sent_at is null and link_error is null;

create or replace function public.request_buyer_outbox(p_limit int default 100) returns table (
  request_id bigint, to_email text, contact_name text, token uuid, part_name text, brand text, model text, year int, expires_at timestamptz)
language sql stable security definer set search_path = public as $$
  select r.id, lower(trim(r.contact)), r.contact_name, r.token, r.part_name, b.name, m.name, r.year, r.expires_at
  from public.part_requests r
  join public.brands b on b.id = r.brand_id
  left join public.models m on m.id = r.model_id
  where r.status = 'open' and r.created_at > now() - interval '2 days'
    and r.link_sent_at is null and r.link_error is null
    and trim(r.contact) ~* '^[^@\s<>]+@[^@\s<>]+\.[a-z]{2,}$'
  order by r.id
  limit greatest(1, least(p_limit, 500))
$$;
revoke all on function public.request_buyer_outbox(int) from public, anon, authenticated;
grant execute on function public.request_buyer_outbox(int) to service_role;

create or replace function public.request_buyer_mark(p_request bigint, p_error text default null) returns void
language sql security definer set search_path = public as $$
  update public.part_requests set link_sent_at = case when p_error is null then now() end, link_error = p_error where id = p_request
$$;
revoke all on function public.request_buyer_mark(bigint, text) from public, anon, authenticated;
grant execute on function public.request_buyer_mark(bigint, text) to service_role;

commit;
