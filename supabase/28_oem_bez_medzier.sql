-- 28: Číslo dielu sa nájde s medzerami aj bez nich (12. 11. 2026).
-- Chyba: search_text mal obsahovať aj normalizované číslo dielu (oem_key), ale v triggri BEFORE ešte generovaný
-- stĺpec oem_key nie je vypočítaný (je NULL). Preto „nárazník 5E1941015“ nenašlo diel zapísaný ako „5E1 941 015“.
-- Oprava: normalizované číslo sa počíta priamo z oem. Samotné hľadanie čísla (qk ↔ oem_key) fungovalo už predtým.
create or replace function public.listing_search_text() returns trigger
language plpgsql security definer set search_path = public, extensions as $$
begin
  new.search_text := public.norm_text(concat_ws(' ',
    new.name, new.oem, upper(regexp_replace(coalesce(new.oem, ''), '[^A-Za-z0-9]', '', 'g')),
    new.part_maker, new.description, new.city, new.side, new.donor_gearbox,
    (select name from public.brands where id = new.brand_id),
    (select name from public.models where id = new.model_id),
    (select name from public.engines where id = new.engine_id),
    (select name from public.categories where id = new.category_id),
    (select name from public.subcategories where id = new.subcategory_id)));
  return new;
end $$;
revoke all on function public.listing_search_text() from public, anon, authenticated;

-- doplní text existujúcim inzerátom (spustí trigger); čas „upravené“ sa pri tom nemení
alter table public.listings disable trigger listings_touch;
update public.listings set search_text = search_text;
alter table public.listings enable trigger listings_touch;

-- Skracovanie koncoviek (word_stem) a preklepy sa tolerujú len v slovách (napr. „nárazníky“, „naraznik“), nie v slovách
-- s číslicami (čísla dielov): „5E1941016“ nesmie nájsť „5E1941015“ – iné číslo dielu je iný diel.
create or replace function public.text_matches(p_text text, p_words text[]) returns boolean
language sql stable set search_path = public, extensions as $$
  select coalesce(bool_and(
           p_text like '%' || case when w ~ '[0-9]' then w else public.word_stem(w) end || '%'
        or exists (select 1 from public.search_synonyms s where s.word = w and p_text like '%' || s.alt || '%')
        or (char_length(w) >= 5 and w !~ '[0-9]' and w operator(extensions.<%) p_text)), true)
  from unnest(p_words) w where char_length(w) >= 3;
$$;
