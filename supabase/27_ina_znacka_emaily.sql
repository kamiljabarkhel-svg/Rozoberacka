-- 27: „Iná značka“ / „Iný model“ v katalógu a e-maily len kupujúcim. 12. 11. 2026. Spúšťa sa po 26.
--  * Predajca, ktorého auto katalóg nepozná, vyberie pri značke „Iná značka“ alebo pri modeli „Iný model“
--    (presné auto napíše do názvu alebo popisu). Názvy modelov sa líšia podľa druhu vozidla, lebo
--    models má unique (brand_id, name).
--  * reply_outbox: e-mailom sa posielajú len odpovede predajcu kupujúcemu. Odpoveď kupujúceho predajca
--    uvidí iba v portáli (záložka Správy) – už mu nechodí e-mail.

insert into public.brands (name) values ('Iná značka') on conflict (name) do nothing;

with vt(t, nm) as (values ('osobne', 'Iný model'), ('dodavky', 'Iný model (dodávka)'), ('nakladne', 'Iný model (nákladné)'),
                          ('autobusy', 'Iný model (autobus)'), ('motorky', 'Iný model (motorka)'))
insert into public.models (brand_id, name, year_from, year_to, vehicle_type)
select b.id, vt.nm, 1950, null, vt.t from public.brands b, vt where b.name = 'Iná značka'
on conflict (brand_id, name) do nothing;

with vt(t, nm) as (values ('osobne', 'Iný model'), ('dodavky', 'Iný model (dodávka)'), ('nakladne', 'Iný model (nákladné)'),
                          ('autobusy', 'Iný model (autobus)'), ('motorky', 'Iný model (motorka)'))
insert into public.models (brand_id, name, year_from, year_to, vehicle_type)
select m.brand_id, vt.nm, least(min(m.year_from), 1990), null, vt.t
from public.models m join vt on vt.t = m.vehicle_type
join public.brands b on b.id = m.brand_id and b.name <> 'Iná značka'
where m.name not like 'Iný model%'
group by m.brand_id, vt.nm, vt.t
on conflict (brand_id, name) do nothing;

create or replace function public.reply_outbox(p_limit int default 50) returns table (
  reply_id bigint, author text, body text, created_at timestamptz, to_email text, to_name text,
  seller_name text, buyer_name text, listing_id bigint, listing_name text, token uuid, first_reply boolean)
language sql stable security definer set search_path = public, auth as $$
  select r.id, r.author, r.body, r.created_at,
         case when r.author = 'seller' then m.buyer_email else u.email::text end,
         case when r.author = 'seller' then m.sender_name else s.name end,
         s.name, m.sender_name, m.listing_id, coalesce(l.name, ''), m.reply_token,
         not exists (select 1 from public.message_replies p where p.message_id = m.id and p.id < r.id)
  from public.message_replies r
  join public.messages m on m.id = r.message_id
  join public.sellers s on s.id = m.seller_id
  join auth.users u on u.id = m.seller_id
  left join public.listings l on l.id = m.listing_id
  where r.author = 'seller' and r.emailed_at is null and r.created_at > now() - interval '2 days'
  order by r.id
  limit greatest(1, least(p_limit, 200))
$$;
revoke all on function public.reply_outbox(int) from public, anon, authenticated;
grant execute on function public.reply_outbox(int) to service_role;
