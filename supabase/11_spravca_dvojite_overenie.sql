-- 11_spravca_dvojite_overenie.sql – (7. 11. 2026). Spúšťa sa po 10.
-- Správca portálu musí byť prihlásený s dvojitým overením (heslo + kód z aplikácie v mobile, TOTP).
-- Databáza mu práva správcu dá, len ak jeho prihlásenie má úroveň „aal2“. Ukradnuté heslo samo nestačí.
-- Platí pre všetko, čo kontroluje is_admin(): pravidlá prístupu (skryté inzeráty, nahlásenia, záznam akcií, dopyty,
-- hodnotenia, súkromné údaje predajcov) a všetky funkcie správcu (admin_check).

create or replace function public.is_admin() returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.admins where user_id = auth.uid())
     and coalesce(nullif(current_setting('request.jwt.claims', true), '')::jsonb ->> 'aal', '') = 'aal2';
$$;

-- Je používateľ v zozname správcov (bez ohľadu na dvojité overenie)? Web podľa toho ponúkne zadanie kódu.
create function public.admin_candidate() returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.admins where user_id = auth.uid());
$$;
revoke all on function public.admin_candidate() from public, anon;
grant execute on function public.admin_candidate() to authenticated;

create or replace function public.admin_check() returns void
language plpgsql stable security definer set search_path = public as $$
begin
  if not public.is_admin() then
    if public.admin_candidate() then raise exception 'Potvrďte prihlásenie kódom z aplikácie v mobile'; end if;
    raise exception 'Len pre správcu portálu';
  end if;
end $$;
