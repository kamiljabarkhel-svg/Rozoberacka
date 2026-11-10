-- 24: Odpovede predajcu na správy kupujúcich a konverzácia cez tajný odkaz (10. 11. 2026).
-- Predajca odpíše v portáli („Správy“) → kupujúcemu príde e-mail z adresy portálu s odkazom /sprava/<token>.
-- Kupujúci tam vidí celú konverzáciu a odpovie; predajcovi príde upozornenie e-mailom a správa sa mu v portáli označí ako neprečítaná.
-- E-mail predajcu ani kupujúceho druhá strana nevidí. E-maily posiela Edge Function „odpovede“ (cez Brevo) z fronty reply_outbox().

-- E-mail kupujúceho (ak do kontaktu zadal e-mail) a tajný kľúč konverzácie
alter table public.messages
  add column if not exists buyer_email text generated always as (
    case when trim(sender_contact) ~* '^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$' then lower(trim(sender_contact)) end) stored,
  add column if not exists reply_token uuid not null default gen_random_uuid(),
  add column if not exists last_at timestamptz not null default now();
create unique index if not exists messages_reply_token on public.messages (reply_token);
update public.messages set last_at = created_at where last_at > created_at;

create table if not exists public.message_replies (
  id          bigserial primary key,
  message_id  bigint not null references public.messages(id) on delete cascade,
  author      text not null check (author in ('seller', 'buyer')),
  body        text not null check (char_length(trim(body)) between 2 and 2000),
  created_at  timestamptz not null default now(),
  emailed_at  timestamptz,                    -- kedy odišiel e-mail druhej strane
  email_error text                            -- posledná chyba odoslania (pre správcu)
);
create index if not exists message_replies_msg on public.message_replies (message_id, created_at);
create index if not exists message_replies_outbox on public.message_replies (created_at) where emailed_at is null;
alter table public.message_replies enable row level security;
-- predajca číta odpovede k svojim správam; zapisuje sa len cez funkcie
drop policy if exists message_replies_own on public.message_replies;
create policy message_replies_own on public.message_replies for select
  using (exists (select 1 from public.messages m where m.id = message_id and m.seller_id = (select auth.uid())));
revoke all on public.message_replies from anon;
revoke insert, update, delete, truncate, references, trigger on public.message_replies from authenticated;
grant select on public.message_replies to authenticated;
-- tajný kľúč konverzácie predajca nepotrebuje (odkaz dostane len kupujúci): čítanie po stĺpcoch bez reply_token
revoke select on public.messages from authenticated;
grant select (id, listing_id, car_id, seller_id, sender_name, sender_contact, body, created_at, read_at, buyer_email, last_at) on public.messages to authenticated;

-- ---------- predajca odpovedá ----------
create or replace function public.seller_reply(p_message bigint, p_body text) returns bigint
language plpgsql security definer set search_path = public as $$
declare m public.messages; v_id bigint; v_recent int;
begin
  select * into m from public.messages where id = p_message;
  if m.id is null or m.seller_id is distinct from auth.uid() then raise exception 'Správa neexistuje.'; end if;
  if m.buyer_email is null then raise exception 'Kupujúci nezadal e-mail – odpovedzte mu telefonicky.'; end if;
  if char_length(trim(coalesce(p_body, ''))) < 2 then raise exception 'Napíšte odpoveď.'; end if;
  if char_length(trim(p_body)) > 2000 then raise exception 'Odpoveď môže mať najviac 2000 znakov.'; end if;
  select count(*) into v_recent from public.message_replies r join public.messages x on x.id = r.message_id
   where x.seller_id = m.seller_id and r.author = 'seller' and r.created_at > now() - interval '1 hour';
  if v_recent >= 60 then raise exception 'Príliš veľa odpovedí za hodinu, skúste neskôr.'; end if;
  insert into public.message_replies (message_id, author, body) values (m.id, 'seller', trim(p_body)) returning id into v_id;
  update public.messages set read_at = coalesce(read_at, now()), last_at = now() where id = m.id;
  return v_id;
end $$;
revoke all on function public.seller_reply(bigint, text) from public, anon;
grant execute on function public.seller_reply(bigint, text) to authenticated;

-- ---------- kupujúci: konverzácia cez tajný odkaz ----------
create or replace function public.thread_get(p_token uuid) returns jsonb
language sql stable security definer set search_path = public as $$
  select jsonb_build_object(
    'listing_id', m.listing_id, 'listing_name', coalesce(l.name, ''), 'listing_active', coalesce(l.status = 'active', false),
    'seller_name', s.name, 'seller_city', s.city,
    'buyer_name', m.sender_name, 'body', m.body, 'created_at', m.created_at,
    'replies', coalesce((select jsonb_agg(jsonb_build_object('author', r.author, 'body', r.body, 'created_at', r.created_at) order by r.created_at, r.id)
                         from public.message_replies r where r.message_id = m.id), '[]'))
  from public.messages m
  join public.sellers s on s.id = m.seller_id
  left join public.listings l on l.id = m.listing_id
  where m.reply_token = p_token
$$;
revoke all on function public.thread_get(uuid) from public;
grant execute on function public.thread_get(uuid) to anon, authenticated;

create or replace function public.thread_reply(p_token uuid, p_body text) returns boolean
language plpgsql security definer set search_path = public as $$
declare m public.messages; v_key text := public.client_ip_key(); v_recent int;
begin
  select * into m from public.messages where reply_token = p_token;
  if m.id is null then raise exception 'Konverzácia neexistuje alebo už bola zmazaná.'; end if;
  if char_length(trim(coalesce(p_body, ''))) < 2 then raise exception 'Napíšte odpoveď.'; end if;
  if char_length(trim(p_body)) > 2000 then raise exception 'Odpoveď môže mať najviac 2000 znakov.'; end if;
  -- kupujúci môže písať, až keď mu predajca odpovedal (inak by odkaz slúžil na spam)
  if not exists (select 1 from public.message_replies where message_id = m.id and author = 'seller') then
    raise exception 'Počkajte na odpoveď predajcu.';
  end if;
  if public.rate_count('reply', v_key, interval '1 hour') >= 20 then raise exception 'Príliš veľa správ z vášho pripojenia. Skúste to neskôr.'; end if;
  select count(*) into v_recent from public.message_replies where message_id = m.id and author = 'buyer' and created_at > now() - interval '1 hour';
  if v_recent >= 10 then raise exception 'Príliš veľa správ za hodinu, skúste neskôr.'; end if;
  insert into public.rate_events (kind, ip_key, listing_id) values ('reply', v_key, m.listing_id);
  insert into public.message_replies (message_id, author, body) values (m.id, 'buyer', trim(p_body));
  update public.messages set read_at = null, last_at = now() where id = m.id;   -- predajcovi sa ukáže ako nová
  return true;
end $$;
revoke all on function public.thread_reply(uuid, text) from public;
grant execute on function public.thread_reply(uuid, text) to anon, authenticated;

-- ---------- fronta e-mailov pre Edge Function „odpovede“ (len service_role) ----------
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
  where r.emailed_at is null and r.created_at > now() - interval '2 days'
  order by r.id
  limit greatest(1, least(p_limit, 200))
$$;
revoke all on function public.reply_outbox(int) from public, anon, authenticated;
grant execute on function public.reply_outbox(int) to service_role;

create or replace function public.reply_mark(p_id bigint, p_error text default null) returns void
language sql security definer set search_path = public as $$
  update public.message_replies set emailed_at = case when p_error is null then now() else emailed_at end, email_error = p_error where id = p_id
$$;
revoke all on function public.reply_mark(bigint, text) from public, anon, authenticated;
grant execute on function public.reply_mark(bigint, text) to service_role;

-- ---------- uchovávanie: konverzácia sa maže 12 mesiacov po poslednej správe ----------
do $$
declare src text;
begin
  select pg_get_functiondef('public.purge_old_data()'::regprocedure) into src;
  if position('message_replies r where r.message_id = m.id' in src) = 0 then
    src := replace(src, 'delete from public.messages where created_at < now() - interval ''12 months''',
                        'delete from public.messages m where coalesce((select max(r.created_at) from public.message_replies r where r.message_id = m.id), m.created_at) < now() - interval ''12 months''');
    execute src;
  end if;
end $$;
