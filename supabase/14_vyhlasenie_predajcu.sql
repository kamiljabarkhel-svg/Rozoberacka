-- 14: vyhlásenie predajcu – podnikateľ (obchodník) alebo súkromná osoba (7. 11. 2026).
-- Zákon č. 108/2024 Z. z. § 16 ods. 1 písm. b) a c): portál musí kupujúcemu povedať, či je predajca obchodník podľa
-- svojho vyhlásenia, a poučiť ho, že pri súkromnej osobe sa predpisy na ochranu spotrebiteľa nepoužijú.
-- Obchodník musí kupujúcemu oznámiť svoju totožnosť (obchodné meno, IČO, sídlo) – preto sú pri podnikateľovi verejné.
-- Súkromná osoba IČO ani adresu nezadáva (minimalizácia údajov).

alter table public.sellers
  add column if not exists ico text check (ico ~ '^[0-9]{8}$'),
  add column if not exists address text check (char_length(address) between 5 and 200),
  add column if not exists type_declared_at timestamptz;

-- IČO doteraz bolo v súkromných údajoch – pri podnikateľoch ho presunieme medzi verejné údaje obchodníka.
update public.sellers s set ico = regexp_replace(p.ico, '\s', '', 'g')
  from public.seller_private p
  where p.seller_id = s.id and s.seller_type = 'Firma' and regexp_replace(coalesce(p.ico, ''), '\s', '', 'g') ~ '^[0-9]{8}$';
update public.seller_private set ico = null where ico is not null;
update public.sellers set type_declared_at = coalesce(type_declared_at, terms_accepted_at, created_at);

-- Pri každej zmene typu sa zapíše čas vyhlásenia; súkromná osoba nemá IČO ani sídlo.
create or replace function public.seller_declaration() returns trigger
language plpgsql set search_path = public as $$
begin
  if tg_op = 'INSERT' or new.seller_type is distinct from old.seller_type then new.type_declared_at := now(); end if;
  if new.seller_type = 'Súkromná osoba' then new.ico := null; new.address := null; end if;
  new.ico := nullif(regexp_replace(coalesce(new.ico, ''), '\s', '', 'g'), '');
  new.address := nullif(btrim(coalesce(new.address, '')), '');
  return new;
end $$;
drop trigger if exists sellers_declaration on public.sellers;
create trigger sellers_declaration before insert or update on public.sellers for each row execute function public.seller_declaration();

grant insert (ico, address) on public.sellers to authenticated;
grant update (ico, address) on public.sellers to authenticated;
grant select (id, name, seller_type, city, verified, blocked, created_at, rating_avg, rating_count, ico, address, type_declared_at)
  on public.sellers to anon, authenticated;

-- Podnikateľ bez IČO a sídla nemôže zverejniť (aktivovať) inzerát – kupujúci musí vidieť, s kým uzatvára zmluvu.
create or replace function public.guard_listing() returns trigger
language plpgsql set search_path = public as $$
declare v_type text; v_blocked boolean; v_ico text; v_addr text;
begin
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
  if v_type = 'Firma' then
    if new.condition = 'Nový' and new.warranty <> '24 mesiacov' then
      raise exception 'Firma musí pri novom diele poskytnúť spotrebiteľovi záruku 24 mesiacov.';
    end if;
    if new.warranty = 'Bez záruky' then
      raise exception 'Firma musí pri použitom diele poskytnúť spotrebiteľovi záruku aspoň 12 mesiacov.';
    end if;
    new.returns_14d := true;   -- pri kúpe na diaľku od firmy má spotrebiteľ právo odstúpiť do 14 dní
  end if;
  return new;
end $$;

-- Správca vidí IČO a sídlo z verejných údajov predajcu.
create or replace function public.admin_sellers() returns table (id uuid, name text, seller_type text, city text, verified boolean, blocked boolean,
  email text, phone text, ico text, created_at timestamptz, active bigint, total bigint)
language plpgsql stable security definer set search_path = public as $$
begin
  perform public.admin_check();
  return query
  select s.id, s.name, s.seller_type, s.city, s.verified, s.blocked, u.email::text, p.phone,
         concat_ws(', ', s.ico, s.address), s.created_at,
         (select count(*) from public.listings l where l.seller_id = s.id and l.status = 'active'),
         (select count(*) from public.listings l where l.seller_id = s.id)
  from public.sellers s left join auth.users u on u.id = s.id left join public.seller_private p on p.seller_id = s.id
  order by s.created_at desc;
end $$;
