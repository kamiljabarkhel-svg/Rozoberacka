-- 06_gdpr.sql – ochrana osobných údajov (3. 11. 2026). Spúšťa sa po 05.
--  A. IP adresy: odtlačok s tajným kľúčom, ktorý sa mení každý mesiac (nedá sa spätne zistiť IP)
--  B. Automatické mazanie starých údajov (správy a nahlásenia po 12 mesiacoch, záznamy o IP po 3 dňoch)
--  C. Predajca si stiahne všetky svoje údaje a môže zrušiť účet (právo na prístup, prenosnosť a vymazanie)
--  D. Záznam súhlasu s podmienkami pri registrácii
--  E. Dôvod skrytia inzerátu pre predajcu (nariadenie o digitálnych službách, čl. 17)

-- ===================== A. TAJNÝ KĽÚČ PRE ODTLAČOK IP =====================
create table public.app_secrets (name text primary key, value text not null, created_at timestamptz not null default now());
alter table public.app_secrets enable row level security;   -- žiadne pravidlá: čítajú ho len funkcie databázy
revoke all on public.app_secrets from anon, authenticated;
insert into public.app_secrets (name, value)
values ('ip_salt', encode(sha256(convert_to(gen_random_uuid()::text || clock_timestamp()::text || random()::text, 'UTF8')), 'hex'))
on conflict (name) do nothing;

create or replace function public.client_ip_key() returns text
language sql stable security definer set search_path = public as $$
  select encode(sha256(convert_to(
    (select value from public.app_secrets where name = 'ip_salt') || '|' || to_char(now() at time zone 'UTC', 'YYYY-MM') || '|' ||
    coalesce(
      nullif(split_part(coalesce(nullif(current_setting('request.headers', true), '')::json ->> 'x-forwarded-for', ''), ',', 1), ''),
      nullif(current_setting('request.headers', true), '')::json ->> 'cf-connecting-ip',
      'unknown'), 'UTF8')), 'hex');
$$;
revoke all on function public.client_ip_key() from public, anon, authenticated;

-- ===================== B. MAZANIE STARÝCH ÚDAJOV =====================
create function public.purge_old_data() returns void
language plpgsql security definer set search_path = public as $$
begin
  delete from public.rate_events where created_at < now() - interval '3 days';
  delete from public.messages where created_at < now() - interval '12 months';
  update public.reports set ip_key = null where ip_key is not null and created_at < now() - interval '30 days';
  delete from public.reports where created_at < now() - interval '12 months' and status <> 'open';
  delete from public.admin_log where created_at < now() - interval '3 years';
end $$;
revoke all on function public.purge_old_data() from public, anon, authenticated;

-- Spúšťa sa denne cez pg_cron, ak je k dispozícii; inak príležitostne pri zobrazení inzerátu (nižšie).
do $$ begin
  create extension if not exists pg_cron;
  perform cron.schedule('rozoberacka-purge', '17 3 * * *', 'select public.purge_old_data()');
exception when others then raise notice 'pg_cron nie je k dispozícii (%), mazanie pobeží príležitostne', sqlerrm;
end $$;

create or replace function public.log_view(p_listing bigint) returns void
language plpgsql security definer set search_path = public as $$
declare v_key text := public.client_ip_key();
begin
  if random() < 0.002 then perform public.purge_old_data(); end if;
  if not exists (select 1 from public.listings where id = p_listing and status = 'active' and seller_id is distinct from auth.uid()) then return; end if;
  if public.rate_count('view', v_key, interval '24 hours', p_listing) > 0 then return; end if;   -- 1 zobrazenie na IP a deň
  if public.rate_count('view', v_key, interval '1 hour') >= 300 then return; end if;             -- robot
  insert into public.rate_events (kind, ip_key, listing_id) values ('view', v_key, p_listing);
  update public.listings set views = views + 1 where id = p_listing and status = 'active';
end $$;

-- ===================== D. SÚHLAS PRI REGISTRÁCII =====================
alter table public.sellers add column terms_accepted_at timestamptz, add column terms_version text;
grant insert (terms_accepted_at, terms_version) on public.sellers to authenticated;

-- ===================== E. DÔVOD SKRYTIA INZERÁTU =====================
alter table public.listings add column moderation_note text;
create or replace function public.admin_set_listing(p_listing bigint, p_block boolean, p_note text) returns void
language plpgsql security definer set search_path = public as $$
begin
  perform public.admin_check();
  update public.listings set status = case when p_block then 'blocked' else 'paused' end,
    moderation_note = case when p_block then nullif(trim(coalesce(p_note, '')), '') end
  where id = p_listing;
  if not found then raise exception 'Inzerát neexistuje'; end if;
  insert into public.admin_log (admin_id, action, target, detail)
  values (auth.uid(), case when p_block then 'skryť inzerát' else 'obnoviť inzerát (pozastavený)' end, 'listing:' || p_listing, jsonb_build_object('poznamka', p_note));
end $$;

-- ===================== C. MOJE ÚDAJE: EXPORT A ZRUŠENIE ÚČTU =====================
create function public.export_my_data() returns jsonb
language plpgsql stable security definer set search_path = public as $$
declare v uuid := auth.uid();
begin
  if v is null then raise exception 'Najprv sa prihláste'; end if;
  return jsonb_build_object(
    'vytvorene', now(),
    'ucet', (select jsonb_build_object('email', email, 'registrovany', created_at, 'posledne_prihlasenie', last_sign_in_at) from auth.users where id = v),
    'profil', (select to_jsonb(s) from public.sellers s where s.id = v),
    'sukromne_udaje', (select to_jsonb(p) from public.seller_private p where p.seller_id = v),
    'inzeraty', coalesce((select jsonb_agg(to_jsonb(l) - 'search_text' || jsonb_build_object(
        'telefon', (select phone from public.listing_contacts c where c.listing_id = l.id),
        'fotky', (select coalesce(jsonb_agg(path order by position), '[]') from public.listing_photos ph where ph.listing_id = l.id),
        'pasuje_aj_na', (select coalesce(jsonb_agg(jsonb_build_object('brand_id', brand_id, 'model_id', model_id, 'engine_id', engine_id)), '[]') from public.listing_fits f where f.listing_id = l.id)))
      from public.listings l where l.seller_id = v), '[]'),
    'spravy_od_kupujucich', coalesce((select jsonb_agg(to_jsonb(m)) from public.messages m where m.seller_id = v), '[]'));
end $$;

-- Zruší účet: prihlásenie, profil, inzeráty, telefóny, „pasuje aj na“, záznamy o fotkách a správy (kaskádou).
-- Súbory fotiek zmaže web cez úložisko ešte pred volaním tejto funkcie.
create function public.delete_my_account() returns void
language plpgsql security definer set search_path = public as $$
declare v uuid := auth.uid();
begin
  if v is null then raise exception 'Najprv sa prihláste'; end if;
  delete from public.listings where seller_id = v;      -- spustí kaskádu na kontakty, fotky, fits, správy, nahlásenia
  delete from public.messages where seller_id = v;
  delete from public.sellers where id = v;
  delete from auth.users where id = v;
end $$;

revoke all on function public.export_my_data(), public.delete_my_account() from public, anon;
grant execute on function public.export_my_data(), public.delete_my_account() to authenticated;
