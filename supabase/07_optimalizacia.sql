-- 07_optimalizacia.sql – podľa Security a Performance Advisora v Supabase (3. 11. 2026). Spúšťa sa po 06.
--  A. Pravidlá prístupu (RLS) volajú auth.uid() a is_admin() raz na dotaz, nie pre každý riadok: (select auth.uid())
--  B. Pre každú tabuľku a akciu len jedno pravidlo (žiadne prekrývajúce sa pravidlá pri čítaní)
--  C. Indexy pre cudzie kľúče (portál predajcu, mazanie, správy, nahlásenia)
--  D. Pevná search_path pre všetky funkcie
--  E. Katalóg a synonymá: verejnosť a predajcovia môžu len čítať (aj bez spoliehania sa na RLS)
-- Správanie sa nemení; testy supabase/testy/20 a 21 musia prejsť rovnako.

-- ===================== A + B. PRAVIDLÁ PRÍSTUPU =====================
-- predajcovia
drop policy if exists sellers_insert on public.sellers;
drop policy if exists sellers_update on public.sellers;
create policy sellers_insert on public.sellers for insert with check (id = (select auth.uid()));
create policy sellers_update on public.sellers for update using (id = (select auth.uid())) with check (id = (select auth.uid()));

-- súkromné údaje predajcov
drop policy if exists private_own on public.seller_private;
drop policy if exists private_admin_read on public.seller_private;
create policy private_read   on public.seller_private for select using (seller_id = (select auth.uid()) or (select public.is_admin()));
create policy private_insert on public.seller_private for insert with check (seller_id = (select auth.uid()));
create policy private_update on public.seller_private for update using (seller_id = (select auth.uid())) with check (seller_id = (select auth.uid()));
create policy private_delete on public.seller_private for delete using (seller_id = (select auth.uid()));

-- inzeráty
drop policy if exists listings_read on public.listings;
drop policy if exists listings_admin_read on public.listings;
drop policy if exists listings_insert on public.listings;
drop policy if exists listings_update on public.listings;
drop policy if exists listings_delete on public.listings;
create policy listings_read   on public.listings for select using (status = 'active' or seller_id = (select auth.uid()) or (select public.is_admin()));
create policy listings_insert on public.listings for insert with check (seller_id = (select auth.uid()));
create policy listings_update on public.listings for update using (seller_id = (select auth.uid())) with check (seller_id = (select auth.uid()));
create policy listings_delete on public.listings for delete using (seller_id = (select auth.uid()));

-- telefóny v inzerátoch (verejnosť ich číta len cez reveal_phone)
drop policy if exists contacts_own on public.listing_contacts;
create policy contacts_own on public.listing_contacts for all
  using (exists (select 1 from public.listings l where l.id = listing_id and l.seller_id = (select auth.uid())))
  with check (exists (select 1 from public.listings l where l.id = listing_id and l.seller_id = (select auth.uid())));

-- „pasuje aj na“
drop policy if exists fits_read on public.listing_fits;
drop policy if exists fits_write on public.listing_fits;
create policy fits_read on public.listing_fits for select
  using (exists (select 1 from public.listings l where l.id = listing_id and (l.status = 'active' or l.seller_id = (select auth.uid()))));
create policy fits_insert on public.listing_fits for insert
  with check (exists (select 1 from public.listings l where l.id = listing_id and l.seller_id = (select auth.uid())));
create policy fits_update on public.listing_fits for update
  using (exists (select 1 from public.listings l where l.id = listing_id and l.seller_id = (select auth.uid())))
  with check (exists (select 1 from public.listings l where l.id = listing_id and l.seller_id = (select auth.uid())));
create policy fits_delete on public.listing_fits for delete
  using (exists (select 1 from public.listings l where l.id = listing_id and l.seller_id = (select auth.uid())));

-- fotky (záznamy v databáze)
drop policy if exists photos_read on public.listing_photos;
drop policy if exists photos_write on public.listing_photos;
drop policy if exists photos_admin_read on public.listing_photos;
create policy photos_read on public.listing_photos for select
  using (exists (select 1 from public.listings l where l.id = listing_id and (l.status = 'active' or l.seller_id = (select auth.uid())))
         or (select public.is_admin()));
create policy photos_insert on public.listing_photos for insert
  with check (exists (select 1 from public.listings l where l.id = listing_id and l.seller_id = (select auth.uid())));
create policy photos_update on public.listing_photos for update
  using (exists (select 1 from public.listings l where l.id = listing_id and l.seller_id = (select auth.uid())))
  with check (exists (select 1 from public.listings l where l.id = listing_id and l.seller_id = (select auth.uid())));
create policy photos_delete on public.listing_photos for delete
  using (exists (select 1 from public.listings l where l.id = listing_id and l.seller_id = (select auth.uid())));

-- správy od kupujúcich
drop policy if exists messages_own_read on public.messages;
drop policy if exists messages_own_update on public.messages;
drop policy if exists messages_own_delete on public.messages;
create policy messages_own_read   on public.messages for select using (seller_id = (select auth.uid()));
create policy messages_own_update on public.messages for update using (seller_id = (select auth.uid())) with check (seller_id = (select auth.uid()));
create policy messages_own_delete on public.messages for delete using (seller_id = (select auth.uid()));

-- správcovia, záznam akcií, nahlásenia
drop policy if exists admins_self on public.admins;
create policy admins_self on public.admins for select using (user_id = (select auth.uid()));
drop policy if exists admin_log_read on public.admin_log;
create policy admin_log_read on public.admin_log for select using ((select public.is_admin()));
drop policy if exists reports_admin_read on public.reports;
create policy reports_admin_read on public.reports for select using ((select public.is_admin()));

-- úložisko fotiek: zápis a mazanie len vo vlastnom priečinku <id predajcu>/…
drop policy if exists photos_upload on storage.objects;
drop policy if exists photos_own_read on storage.objects;
drop policy if exists photos_delete on storage.objects;
create policy photos_upload on storage.objects for insert to authenticated
  with check (bucket_id = 'listing-photos' and (storage.foldername(name))[1] = (select auth.uid())::text);
create policy photos_own_read on storage.objects for select to authenticated
  using (bucket_id = 'listing-photos' and (storage.foldername(name))[1] = (select auth.uid())::text);
create policy photos_delete on storage.objects for delete to authenticated
  using (bucket_id = 'listing-photos' and (storage.foldername(name))[1] = (select auth.uid())::text);

-- ===================== C. INDEXY PRE CUDZIE KĽÚČE =====================
create index if not exists listings_seller      on public.listings (seller_id, created_at desc);
create index if not exists listings_model       on public.listings (model_id);
create index if not exists listings_engine      on public.listings (engine_id);
create index if not exists listings_subcategory on public.listings (subcategory_id);
create index if not exists listing_fits_model   on public.listing_fits (model_id);
create index if not exists listing_fits_engine  on public.listing_fits (engine_id);
create index if not exists messages_listing     on public.messages (listing_id);
create index if not exists reports_listing      on public.reports (listing_id);

-- ===================== D. SEARCH_PATH =====================
alter function public.touch_updated_at() set search_path = public;
alter function public.word_stem(text) set search_path = public;

-- ===================== E. KATALÓG LEN NA ČÍTANIE =====================
revoke insert, update, delete, truncate on public.brands, public.models, public.engines, public.categories, public.subcategories,
  public.search_synonyms from anon, authenticated;
revoke insert, update, delete, truncate on public.reports, public.admin_log, public.admins, public.rate_events, public.app_secrets
  from anon, authenticated;
revoke truncate on all tables in schema public from anon, authenticated;
