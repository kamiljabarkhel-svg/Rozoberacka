-- 25: Kolesá s pneumatikami – stačí rozmer pneumatiky ALEBO disku (11. 11. 2026).
-- Predajca ojazdených kolies často pozná len rozmer pneumatiky (napísaný na boku) alebo len disku.
-- Hľadanie porovnáva len vyplnené údaje (search_listings: l.specs @> zadané parametre), takže koleso s rozmerom
-- pneumatiky nájde kupujúci, ktorý hľadá podľa pneumatiky, a koleso s rozmerom disku ten, kto hľadá podľa disku.
create or replace function public.listing_required() returns trigger
language plpgsql set search_path = public as $$
declare u boolean; sn text; k text; tire boolean; disk boolean;
begin
  select universal into u from public.categories where id = new.category_id;
  if new.model_id is not null then
    select brand_id, vehicle_type into new.brand_id, new.vtype from public.models where id = new.model_id;
  end if;
  if not coalesce(u, false) then
    if new.brand_id is null then raise exception 'Vyberte značku vozidla.' using errcode = 'check_violation'; end if;
    if new.model_id is null then raise exception 'Vyberte model vozidla.' using errcode = 'check_violation'; end if;
    if new.year is null then raise exception 'Vyberte ročník vozidla.' using errcode = 'check_violation'; end if;
    -- oem_key je generovaný stĺpec, v triggri ešte nie je vypočítaný – počítame z oem
    if new.oem is not null and char_length(regexp_replace(new.oem, '[^A-Za-z0-9]', '', 'g')) < 4 then
      raise exception 'Zadajte číslo dielu (OEM) – aspoň 4 písmená alebo číslice.' using errcode = 'check_violation';
    end if;
  end if;
  if new.category_id = 'kol' then
    if new.subcategory_id is null then
      raise exception 'Vyberte, čo predávate (pneumatiky, disky, kolesá…).' using errcode = 'check_violation';
    end if;
    select name into sn from public.subcategories where id = new.subcategory_id;
    k := case when sn like 'Pneumatiky%' then 'pneu' when sn like 'Disky%' then 'disk'
              when sn in ('Kolesá s pneumatikami', 'Rezervné a dojazdové kolesá') then 'kolesa' else 'ine' end;
    tire := coalesce(new.specs ->> 'tw', '') <> '' and coalesce(new.specs ->> 'tp', '') <> '' and coalesce(new.specs ->> 'rd', '') <> '';
    disk := coalesce(new.specs ->> 'pcd', '') <> '' and coalesce(new.specs ->> 'rd', '') <> '';
    if k = 'pneu' and not tire then
      raise exception 'Zadajte rozmer pneumatiky (šírka, profil, priemer).' using errcode = 'check_violation';
    end if;
    if k = 'disk' and not disk then
      raise exception 'Zadajte rozteč skrutiek a priemer disku.' using errcode = 'check_violation';
    end if;
    if k = 'kolesa' and not tire and not disk then
      raise exception 'Zadajte rozmer pneumatiky (šírka, profil, priemer) alebo disku (rozteč, priemer).' using errcode = 'check_violation';
    end if;
  end if;
  return new;
end $$;
revoke all on function public.listing_required() from public, anon, authenticated;
