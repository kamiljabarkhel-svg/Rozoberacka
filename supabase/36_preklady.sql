-- 36: Strojový preklad textov inzerátov (názov a popis) do poľštiny (15. 11. 2026).
-- Preklady sú v samostatnej tabuľke; prekladá Edge Function „preklady“ (DeepL) z fronty translate_outbox().
-- Keď predajca zmení názov alebo popis, zmení sa odtlačok (src_hash) a inzerát sa preloží znova.
-- Kým preklad nie je, web ukáže pôvodný slovenský text.
create table if not exists public.listing_tr (
  listing_id bigint not null references public.listings on delete cascade,
  lang text not null check (lang in ('pl', 'cs')),
  name text not null check (length(name) between 1 and 300),
  description text check (length(description) <= 3000),
  src_hash text not null,
  created_at timestamptz not null default now(),
  primary key (listing_id, lang)
);
alter table public.listing_tr enable row level security;
drop policy if exists listing_tr_read on public.listing_tr;
create policy listing_tr_read on public.listing_tr for select to anon, authenticated
  using (exists (select 1 from public.listings l where l.id = listing_id and l.status = 'active'));
revoke all on public.listing_tr from anon, authenticated;
grant select on public.listing_tr to anon, authenticated;

create or replace function public.listing_src_hash(p_name text, p_desc text) returns text
language sql immutable as $$ select md5(coalesce(p_name, '') || chr(1) || coalesce(p_desc, '')) $$;

-- Fronta: aktívne inzeráty bez prekladu alebo so zastaraným prekladom (najnovšie prvé).
create or replace function public.translate_outbox(p_lang text, p_limit int default 40)
returns table (id bigint, name text, description text, src_hash text)
language sql stable security definer set search_path = public as $$
  select l.id, l.name, l.description, public.listing_src_hash(l.name, l.description)
  from public.listings l
  left join public.listing_tr t on t.listing_id = l.id and t.lang = p_lang
  where l.status = 'active' and (t.listing_id is null or t.src_hash <> public.listing_src_hash(l.name, l.description))
  order by l.created_at desc
  limit least(greatest(p_limit, 1), 200)
$$;

-- Uloží preklad, len ak sa text inzerátu medzitým nezmenil.
create or replace function public.translate_save(p_lang text, p_id bigint, p_name text, p_desc text, p_hash text)
returns boolean language plpgsql security definer set search_path = public as $$
begin
  if not exists (select 1 from public.listings where id = p_id and public.listing_src_hash(name, description) = p_hash) then return false; end if;
  insert into public.listing_tr (listing_id, lang, name, description, src_hash)
  values (p_id, p_lang, left(p_name, 300), left(p_desc, 3000), p_hash)
  on conflict (listing_id, lang) do update set name = excluded.name, description = excluded.description, src_hash = excluded.src_hash, created_at = now();
  return true;
end $$;

revoke all on function public.translate_outbox(text, int) from public, anon, authenticated;
revoke all on function public.translate_save(text, bigint, text, text, text) from public, anon, authenticated;
grant execute on function public.translate_outbox(text, int) to service_role;
grant execute on function public.translate_save(text, bigint, text, text, text) to service_role;
