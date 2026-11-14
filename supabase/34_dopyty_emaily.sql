-- 34: E-mail predajcom o novom dopyte na diel (14. 11. 2026).
-- Predajca dostane e-mail, keď kupujúci zadá dopyt na značku, ktorej aspoň jeden aktívny diel predáva.
-- Vypnúť si to môže v profile (seller_private.notify_requests). Kontakt kupujúceho v e-maile NIE JE –
-- predajca ho uvidí až po prihlásení v portáli (záložka Dopyty). Najviac 20 takých e-mailov na predajcu za deň.
-- E-maily posiela Edge Function `dopyty` (rovnaké tajomstvá ako `odpovede`).
begin;

alter table public.seller_private add column if not exists notify_requests boolean not null default true;

create table if not exists public.request_notices (
  request_id bigint not null references public.part_requests(id) on delete cascade,
  seller_id  uuid   not null references public.sellers(id) on delete cascade,
  sent_at    timestamptz,
  error      text,
  created_at timestamptz not null default now(),
  primary key (request_id, seller_id)
);
create index if not exists request_notices_seller_day on public.request_notices (seller_id, created_at);
alter table public.request_notices enable row level security;   -- bez politík: len cez funkcie nižšie
revoke all on public.request_notices from public, anon, authenticated;

-- Fronta: dopyty z posledných 2 dní × predajcovia, ktorí predávajú danú značku a ešte e-mail nedostali.
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
    and exists (select 1 from public.listings l where l.seller_id = s.id and l.status = 'active' and l.brand_id = r.brand_id)
    and not exists (select 1 from public.request_notices n where n.request_id = r.id and n.seller_id = s.id)
    and (select count(*) from public.request_notices n where n.seller_id = s.id and n.created_at > now() - interval '1 day') < 20
  order by r.id, s.id
  limit greatest(1, least(p_limit, 500))
$$;
revoke all on function public.request_outbox(int) from public, anon, authenticated;
grant execute on function public.request_outbox(int) to service_role;

create or replace function public.request_mark(p_request bigint, p_seller uuid, p_error text default null) returns void
language sql security definer set search_path = public as $$
  insert into public.request_notices (request_id, seller_id, sent_at, error)
  values (p_request, p_seller, case when p_error is null then now() end, p_error)
  on conflict (request_id, seller_id) do update set sent_at = excluded.sent_at, error = excluded.error
$$;
revoke all on function public.request_mark(bigint, uuid, text) from public, anon, authenticated;
grant execute on function public.request_mark(bigint, uuid, text) to service_role;

commit;
