-- 13: nové stavy dielu „Nový“ (nepoužitý) a „Repasovaný“ (7. 11. 2026).
-- Záruka: firma pri novom diele 24 mesiacov (spotrebiteľský tovar), pri použitom aj repasovanom aspoň 12 mesiacov.
-- Súkromná osoba môže predávať aj „Bez záruky“. Pravidlá overiť s právnikom.

alter table public.listings drop constraint if exists listings_condition_check;
alter table public.listings add constraint listings_condition_check
  check (condition in ('Nový', 'Repasovaný', 'Veľmi dobrý', 'Dobrý', 'Na opravu'));

create or replace function public.guard_listing() returns trigger
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

-- Keď sa predajca zmení na firmu, jeho inzeráty dostanú zákonnú záruku (nové diely 24 mesiacov).
create or replace function public.seller_type_changed() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if new.seller_type = 'Firma' and old.seller_type is distinct from 'Firma' then
    update public.listings set warranty = '24 mesiacov' where seller_id = new.id and condition = 'Nový' and warranty <> '24 mesiacov';
    update public.listings set warranty = '12 mesiacov' where seller_id = new.id and warranty = 'Bez záruky';
    update public.listings set returns_14d = true where seller_id = new.id;
  end if;
  return new;
end $$;
