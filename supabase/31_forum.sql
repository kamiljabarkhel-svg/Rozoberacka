-- 31: Fórum – technické otázky a poruchy podľa značiek. 14. 11. 2026. Spúšťa sa po 30.
--  * Čítať môže každý bez účtu. Písať môže prihlásený používateľ s profilom fóra (prezývka) a potvrdeným e-mailom
--    (registrácia len pre fórum alebo účet predajcu).
--  * Príspevky sa zobrazia hneď. Výnimka: prvé 3 príspevky nového používateľa schvaľuje správca (status 'pending');
--    po 3 schválených je používateľ „dôveryhodný“. Predajcovia sú dôveryhodní hneď.
--  * Ktokoľvek môže príspevok nahlásiť (DSA čl. 16) – rovnaké náležitosti ako pri inzeráte. O skrytí rozhoduje človek.
--  * Do tabuliek sa zapisuje len cez funkcie nižšie (limity proti spamu, kontrola zákazu).
--  * Zrušenie účtu zmaže profil fóra aj všetky príspevky a témy používateľa (kaskáda z auth.users).

begin;

create table if not exists public.forum_sections (
  id          text primary key check (id ~ '^[a-z0-9-]{2,40}$'),
  parent_id   text references public.forum_sections (id),
  name        text not null,
  description text,
  sort        int not null default 0
);

create table if not exists public.forum_profiles (
  user_id           uuid primary key references auth.users (id) on delete cascade,
  nick              text not null check (nick ~ '^[0-9A-Za-zÁÄČĎÉÍĹĽŇÓÔŔŠŤÚÝŽáäčďéíĺľňóôŕšťúýž_. -]{3,30}$' and nick = btrim(nick)),
  trusted           boolean not null default false,
  banned            boolean not null default false,
  terms_version     text,
  terms_accepted_at timestamptz,
  created_at        timestamptz not null default now()
);
create unique index if not exists forum_profiles_nick on public.forum_profiles (lower(nick));

create table if not exists public.forum_threads (
  id           bigserial primary key,
  section_id   text not null references public.forum_sections (id),
  user_id      uuid not null references public.forum_profiles (user_id) on delete cascade,
  title        text not null check (char_length(title) between 5 and 140),
  status       text not null default 'visible' check (status in ('visible', 'pending', 'hidden')),
  locked       boolean not null default false,
  pinned       boolean not null default false,
  post_count   int not null default 0,
  created_at   timestamptz not null default now(),
  last_post_at timestamptz not null default now()
);
create index if not exists forum_threads_list on public.forum_threads (section_id, status, pinned desc, last_post_at desc);

create table if not exists public.forum_posts (
  id            bigserial primary key,
  thread_id     bigint not null references public.forum_threads (id) on delete cascade,
  user_id       uuid not null references public.forum_profiles (user_id) on delete cascade,
  body          text not null check (char_length(body) between 2 and 5000),
  status        text not null default 'visible' check (status in ('visible', 'pending', 'hidden')),
  hidden_reason text,
  created_at    timestamptz not null default now(),
  edited_at     timestamptz
);
create index if not exists forum_posts_thread on public.forum_posts (thread_id, created_at);
create index if not exists forum_posts_user on public.forum_posts (user_id, created_at desc);
create index if not exists forum_posts_pending on public.forum_posts (status) where status = 'pending';

create table if not exists public.forum_reports (
  id         bigserial primary key,
  post_id    bigint not null references public.forum_posts (id) on delete cascade,
  reason     text not null check (reason in ('Spam alebo reklama', 'Urážlivý alebo nenávistný obsah', 'Podvod', 'Nelegálny obsah',
                                              'Porušenie autorských práv', 'Osobné údaje inej osoby', 'Iné')),
  note       text check (note is null or char_length(note) <= 500),
  contact    text check (contact is null or char_length(contact) <= 120),
  ip_key     text,
  status     text not null default 'open' check (status in ('open', 'resolved', 'rejected')),
  created_at timestamptz not null default now()
);

alter table public.forum_sections enable row level security;
alter table public.forum_profiles enable row level security;
alter table public.forum_threads enable row level security;
alter table public.forum_posts enable row level security;
alter table public.forum_reports enable row level security;

drop policy if exists forum_sections_read on public.forum_sections;
create policy forum_sections_read on public.forum_sections for select using (true);
drop policy if exists forum_profiles_read on public.forum_profiles;
create policy forum_profiles_read on public.forum_profiles for select using (true);
drop policy if exists forum_threads_read on public.forum_threads;
create policy forum_threads_read on public.forum_threads for select
  using (status = 'visible' or user_id = auth.uid() or public.is_admin());
drop policy if exists forum_posts_read on public.forum_posts;
create policy forum_posts_read on public.forum_posts for select
  using ((status = 'visible' and exists (select 1 from public.forum_threads t where t.id = thread_id and t.status = 'visible'))
         or user_id = auth.uid() or public.is_admin());
-- nahlásenia nečíta nikto okrem funkcií správcu (žiadne pravidlo)

revoke all on public.forum_sections, public.forum_profiles, public.forum_threads, public.forum_posts, public.forum_reports from anon, authenticated;
grant select on public.forum_sections, public.forum_threads to anon, authenticated;
grant select (id, thread_id, user_id, body, status, created_at, edited_at) on public.forum_posts to anon, authenticated;
grant select (user_id, nick, created_at) on public.forum_profiles to anon, authenticated;

-- ===================== Pomocné =====================
create or replace function public.forum_is_seller(p uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.sellers where id = p and not blocked) $$;

create or replace function public.forum_recount(p_thread bigint) returns void
language sql security definer set search_path = public as $$
  update public.forum_threads t set
    post_count = (select count(*) from public.forum_posts p where p.thread_id = t.id and p.status = 'visible'),
    last_post_at = coalesce((select max(created_at) from public.forum_posts p where p.thread_id = t.id and p.status = 'visible'), t.created_at)
  where t.id = p_thread $$;

create or replace function public.forum_author() returns public.forum_profiles
language plpgsql stable security definer set search_path = public as $$
declare v public.forum_profiles;
begin
  if auth.uid() is null then raise exception 'Najprv sa prihláste.'; end if;
  select * into v from public.forum_profiles where user_id = auth.uid();
  if v.user_id is null then raise exception 'Najprv si zvoľte prezývku vo fóre.'; end if;
  if v.banned then raise exception 'Váš účet vo fóre je zablokovaný. Ak si myslíte, že ide o omyl, napíšte nám.'; end if;
  return v;
end $$;

create or replace function public.forum_check_body(p_body text) returns text
language plpgsql immutable as $$
declare b text := btrim(coalesce(p_body, ''));
begin
  if char_length(b) < 2 then raise exception 'Napíšte text príspevku.' using errcode = 'check_violation'; end if;
  if char_length(b) > 5000 then raise exception 'Príspevok môže mať najviac 5000 znakov.' using errcode = 'check_violation'; end if;
  return b;
end $$;

-- ===================== Používateľ =====================
-- Profil fóra (prezývka). Predajca je dôveryhodný hneď.
create or replace function public.forum_join(p_nick text, p_terms text) returns void
language plpgsql security definer set search_path = public as $$
declare n text := btrim(coalesce(p_nick, ''));
begin
  if auth.uid() is null then raise exception 'Najprv sa prihláste.'; end if;
  if n !~ '^[0-9A-Za-zÁÄČĎÉÍĹĽŇÓÔŔŠŤÚÝŽáäčďéíĺľňóôŕšťúýž_. -]{3,30}$' then
    raise exception 'Prezývka musí mať 3 až 30 znakov (písmená, číslice, medzera, bodka, pomlčka alebo _).' using errcode = 'check_violation';
  end if;
  if lower(n) in ('admin', 'administrator', 'spravca', 'správca', 'moderator', 'moderátor', 'autosuciastky', 'autosuciastky.eu') then
    raise exception 'Túto prezývku nemôžete použiť.' using errcode = 'check_violation';
  end if;
  if exists (select 1 from public.forum_profiles where lower(nick) = lower(n) and user_id <> auth.uid()) then
    raise exception 'Túto prezývku už niekto používa. Zvoľte inú.' using errcode = 'unique_violation';
  end if;
  insert into public.forum_profiles (user_id, nick, trusted, terms_version, terms_accepted_at)
  values (auth.uid(), n, public.forum_is_seller(auth.uid()), p_terms, now())
  on conflict (user_id) do update set nick = excluded.nick;
end $$;

create or replace function public.forum_me() returns jsonb
language sql stable security definer set search_path = public as $$
  select case when auth.uid() is null then null else (
    select jsonb_build_object('nick', p.nick, 'trusted', p.trusted, 'banned', p.banned, 'seller', public.forum_is_seller(p.user_id),
           'pending', (select count(*) from public.forum_posts x where x.user_id = p.user_id and x.status = 'pending'))
    from public.forum_profiles p where p.user_id = auth.uid()) end $$;

create or replace function public.forum_new_thread(p_section text, p_title text, p_body text) returns bigint
language plpgsql security definer set search_path = public as $$
declare a public.forum_profiles := public.forum_author(); t text := btrim(coalesce(p_title, '')); b text := public.forum_check_body(p_body);
        st text; v_id bigint;
begin
  if not exists (select 1 from public.forum_sections s where s.id = p_section and not exists (select 1 from public.forum_sections c where c.parent_id = s.id)) then
    raise exception 'Vyberte sekciu fóra.' using errcode = 'check_violation';
  end if;
  if char_length(t) < 5 or char_length(t) > 140 then raise exception 'Nadpis témy musí mať 5 až 140 znakov.' using errcode = 'check_violation'; end if;
  if (select count(*) from public.forum_threads where user_id = a.user_id and created_at > now() - interval '1 day') >= 5 then
    raise exception 'Za deň môžete založiť najviac 5 tém. Skúste to zajtra.';
  end if;
  if (select count(*) from public.forum_posts where user_id = a.user_id and created_at > now() - interval '1 hour') >= 20 then
    raise exception 'Príliš veľa príspevkov za hodinu. Skúste to neskôr.';
  end if;
  st := case when a.trusted then 'visible' else 'pending' end;
  insert into public.forum_threads (section_id, user_id, title, status) values (p_section, a.user_id, t, st) returning id into v_id;
  insert into public.forum_posts (thread_id, user_id, body, status) values (v_id, a.user_id, b, st);
  perform public.forum_recount(v_id);
  return v_id;
end $$;

create or replace function public.forum_reply(p_thread bigint, p_body text) returns bigint
language plpgsql security definer set search_path = public as $$
declare a public.forum_profiles := public.forum_author(); b text := public.forum_check_body(p_body); v_id bigint;
begin
  if not exists (select 1 from public.forum_threads where id = p_thread and status = 'visible') then raise exception 'Téma neexistuje.'; end if;
  if exists (select 1 from public.forum_threads where id = p_thread and locked) then raise exception 'Téma je uzamknutá, nedá sa do nej písať.'; end if;
  if (select count(*) from public.forum_posts where user_id = a.user_id and created_at > now() - interval '1 hour') >= 20 then
    raise exception 'Príliš veľa príspevkov za hodinu. Skúste to neskôr.';
  end if;
  if exists (select 1 from public.forum_posts where user_id = a.user_id and thread_id = p_thread and body = b and created_at > now() - interval '10 minutes') then
    raise exception 'Tento príspevok ste už poslali.';
  end if;
  insert into public.forum_posts (thread_id, user_id, body, status)
  values (p_thread, a.user_id, b, case when a.trusted then 'visible' else 'pending' end) returning id into v_id;
  perform public.forum_recount(p_thread);
  return v_id;
end $$;

-- Úprava vlastného príspevku (do 24 hodín, skrytý sa upraviť nedá).
create or replace function public.forum_edit_post(p_post bigint, p_body text) returns void
language plpgsql security definer set search_path = public as $$
declare a public.forum_profiles := public.forum_author(); b text := public.forum_check_body(p_body);
begin
  update public.forum_posts set body = b, edited_at = now()
  where id = p_post and user_id = a.user_id and status <> 'hidden' and created_at > now() - interval '24 hours';
  if not found then raise exception 'Príspevok sa už nedá upraviť (dá sa to do 24 hodín od napísania).'; end if;
end $$;

-- Zmazanie vlastného príspevku; prvý príspevok zmaže celú tému.
create or replace function public.forum_delete_post(p_post bigint) returns void
language plpgsql security definer set search_path = public as $$
declare v_thread bigint; v_first bigint;
begin
  if auth.uid() is null then raise exception 'Najprv sa prihláste.'; end if;
  select thread_id into v_thread from public.forum_posts where id = p_post and user_id = auth.uid();
  if v_thread is null then raise exception 'Príspevok neexistuje.'; end if;
  select id into v_first from public.forum_posts where thread_id = v_thread order by created_at, id limit 1;
  if v_first = p_post then delete from public.forum_threads where id = v_thread;
  else delete from public.forum_posts where id = p_post; perform public.forum_recount(v_thread); end if;
end $$;

-- Nahlásenie príspevku (aj bez účtu), limit podľa IP.
create or replace function public.forum_report(p_post bigint, p_reason text, p_note text, p_contact text) returns boolean
language plpgsql security definer set search_path = public as $$
declare v_key text := public.client_ip_key();
begin
  if not exists (select 1 from public.forum_posts where id = p_post and status = 'visible') then raise exception 'Príspevok neexistuje.'; end if;
  if public.rate_count('freport', v_key, interval '1 hour') >= 5 then raise exception 'Príliš veľa nahlásení, skúste to neskôr.'; end if;
  if public.rate_count('freport', v_key, interval '30 days', p_post) > 0 then return true; end if;
  insert into public.rate_events (kind, ip_key, listing_id) values ('freport', v_key, p_post);
  insert into public.forum_reports (post_id, reason, note, contact, ip_key)
  values (p_post, p_reason, nullif(btrim(coalesce(p_note, '')), ''), nullif(btrim(coalesce(p_contact, '')), ''), v_key);
  return true;
end $$;

-- Zrušenie účtu, ktorý je len pre fórum (predajca ruší účet v portáli predajcu).
create or replace function public.forum_delete_account() returns void
language plpgsql security definer set search_path = public, auth as $$
begin
  if auth.uid() is null then raise exception 'Najprv sa prihláste.'; end if;
  if exists (select 1 from public.sellers where id = auth.uid()) then
    raise exception 'Máte aj účet predajcu – zrušte ho v portáli predajcu (Profil a nastavenia), zmažú sa aj príspevky vo fóre.';
  end if;
  delete from auth.users where id = auth.uid();
end $$;

create or replace function public.forum_export_my_data() returns jsonb
language sql stable security definer set search_path = public, auth as $$
  select jsonb_build_object('vytvorene', now(),
    'ucet', (select jsonb_build_object('email', email, 'registrovany', created_at) from auth.users where id = auth.uid()),
    'profil_fora', (select to_jsonb(p) from public.forum_profiles p where p.user_id = auth.uid()),
    'temy', coalesce((select jsonb_agg(to_jsonb(t)) from public.forum_threads t where t.user_id = auth.uid()), '[]'),
    'prispevky', coalesce((select jsonb_agg(to_jsonb(x) - 'hidden_reason') from public.forum_posts x where x.user_id = auth.uid()), '[]')) $$;

-- ===================== Čítanie (verejné) =====================
create or replace function public.forum_overview() returns jsonb
language sql stable security definer set search_path = public as $$
  select coalesce(jsonb_agg(jsonb_build_object('id', s.id, 'parent', s.parent_id, 'name', s.name, 'description', s.description,
    'threads', (select count(*) from public.forum_threads t where t.section_id = s.id and t.status = 'visible'),
    'posts', (select coalesce(sum(post_count), 0) from public.forum_threads t where t.section_id = s.id and t.status = 'visible'),
    'last', (select jsonb_build_object('id', t.id, 'title', t.title, 'at', t.last_post_at) from public.forum_threads t
             where t.section_id = s.id and t.status = 'visible' order by t.last_post_at desc limit 1))
    order by s.sort, s.name), '[]') from public.forum_sections s $$;

create or replace function public.forum_threads_page(p_section text, p_offset int default 0, p_limit int default 30) returns jsonb
language sql stable security definer set search_path = public as $$
  select jsonb_build_object(
    'total', (select count(*) from public.forum_threads t where (p_section is null or t.section_id = p_section) and t.status = 'visible'),
    'items', coalesce((select jsonb_agg(x order by x.pinned desc, x.last_post_at desc) from (
      select t.id, t.section_id as section, t.title, t.pinned, t.locked, t.post_count as posts, t.created_at, t.last_post_at,
             p.nick, public.forum_is_seller(t.user_id) as seller
      from public.forum_threads t join public.forum_profiles p on p.user_id = t.user_id
      where (p_section is null or t.section_id = p_section) and t.status = 'visible'
      order by (p_section is not null and t.pinned) desc, t.last_post_at desc
      offset greatest(coalesce(p_offset, 0), 0) limit least(greatest(coalesce(p_limit, 30), 1), 60)) x), '[]')) $$;

-- Téma s príspevkami. Vlastné neschválené aj skryté príspevky (s dôvodom skrytia) vidí len autor.
create or replace function public.forum_thread(p_id bigint) returns jsonb
language plpgsql stable security definer set search_path = public as $$
declare t public.forum_threads;
begin
  select * into t from public.forum_threads where id = p_id and (status = 'visible' or user_id = auth.uid());
  if t.id is null then return null; end if;
  return jsonb_build_object(
    'id', t.id, 'section', t.section_id, 'title', t.title, 'status', t.status, 'locked', t.locked, 'created_at', t.created_at,
    'last_post_at', t.last_post_at, 'nick', (select nick from public.forum_profiles where user_id = t.user_id),
    'posts', coalesce((select jsonb_agg(jsonb_build_object('id', x.id, 'body', x.body, 'status', x.status, 'created_at', x.created_at,
              'edited_at', x.edited_at, 'nick', p.nick, 'seller', public.forum_is_seller(x.user_id),
              'seller_id', case when public.forum_is_seller(x.user_id) then x.user_id end,
              'mine', x.user_id = auth.uid(), 'editable', x.user_id = auth.uid() and x.status <> 'hidden' and x.created_at > now() - interval '24 hours',
              'hidden_reason', case when x.user_id = auth.uid() then x.hidden_reason end)
              order by x.created_at, x.id)
      from public.forum_posts x join public.forum_profiles p on p.user_id = x.user_id
      where x.thread_id = t.id and (x.status = 'visible' or x.user_id = auth.uid())), '[]'));
end $$;

-- Moje príspevky (stav, dôvod skrytia) – stránka účtu vo fóre.
create or replace function public.forum_my_posts() returns jsonb
language sql stable security definer set search_path = public as $$
  select coalesce(jsonb_agg(jsonb_build_object('id', x.id, 'thread_id', x.thread_id, 'section', t.section_id, 'title', t.title,
    'body', left(x.body, 200), 'status', x.status, 'hidden_reason', x.hidden_reason, 'created_at', x.created_at) order by x.created_at desc), '[]')
  from public.forum_posts x join public.forum_threads t on t.id = x.thread_id where x.user_id = auth.uid() $$;

create or replace function public.forum_sitemap() returns table (id bigint, section text, title text, last_post_at timestamptz)
language sql stable security definer set search_path = public as $$
  select id, section_id, title, last_post_at from public.forum_threads where status = 'visible' order by last_post_at desc limit 5000 $$;

-- ===================== Správca =====================
create or replace function public.admin_forum_queue() returns jsonb
language plpgsql stable security definer set search_path = public as $$
begin
  perform public.admin_check();
  return jsonb_build_object(
    'pending', coalesce((select jsonb_agg(jsonb_build_object('id', x.id, 'thread_id', x.thread_id, 'title', t.title, 'section', t.section_id,
        'body', x.body, 'nick', p.nick, 'user_id', x.user_id, 'created_at', x.created_at,
        'first', x.id = (select min(id) from public.forum_posts y where y.thread_id = x.thread_id)) order by x.created_at)
      from public.forum_posts x join public.forum_threads t on t.id = x.thread_id join public.forum_profiles p on p.user_id = x.user_id
      where x.status = 'pending'), '[]'),
    'reports', coalesce((select jsonb_agg(jsonb_build_object('id', r.id, 'post_id', r.post_id, 'reason', r.reason, 'note', r.note, 'contact', r.contact,
        'created_at', r.created_at, 'status', r.status, 'body', x.body, 'post_status', x.status, 'nick', p.nick, 'user_id', x.user_id,
        'thread_id', x.thread_id, 'title', t.title, 'section', t.section_id) order by r.created_at desc)
      from public.forum_reports r join public.forum_posts x on x.id = r.post_id join public.forum_threads t on t.id = x.thread_id
      join public.forum_profiles p on p.user_id = x.user_id where r.status = 'open'), '[]'));
end $$;

-- Schváliť / skryť príspevok. Prvý príspevok mení aj stav témy. Po 3 schválených je autor dôveryhodný.
create or replace function public.admin_forum_set_post(p_post bigint, p_status text, p_reason text) returns void
language plpgsql security definer set search_path = public as $$
declare v_thread bigint; v_user uuid; v_first boolean;
begin
  perform public.admin_check();
  if p_status not in ('visible', 'hidden') then raise exception 'Neplatný stav'; end if;
  if p_status = 'hidden' and char_length(btrim(coalesce(p_reason, ''))) < 3 then raise exception 'Napíšte dôvod skrytia (uvidí ho autor).'; end if;
  update public.forum_posts set status = p_status, hidden_reason = case when p_status = 'hidden' then btrim(p_reason) end
  where id = p_post returning thread_id, user_id into v_thread, v_user;
  if v_thread is null then raise exception 'Príspevok neexistuje'; end if;
  v_first := p_post = (select min(id) from public.forum_posts where thread_id = v_thread);
  if v_first then update public.forum_threads set status = p_status where id = v_thread; end if;
  perform public.forum_recount(v_thread);
  if p_status = 'visible' and (select count(*) from public.forum_posts where user_id = v_user and status = 'visible') >= 3 then
    update public.forum_profiles set trusted = true where user_id = v_user;
  end if;
  insert into public.admin_log (admin_id, action, target, detail)
  values (auth.uid(), 'forum_post_' || p_status, 'forum_post:' || p_post, jsonb_build_object('reason', p_reason));
end $$;

create or replace function public.admin_forum_resolve_report(p_id bigint, p_status text) returns void
language plpgsql security definer set search_path = public as $$
begin
  perform public.admin_check();
  if p_status not in ('resolved', 'rejected') then raise exception 'Neplatný stav'; end if;
  update public.forum_reports set status = p_status where id = p_id;
  insert into public.admin_log (admin_id, action, target, detail) values (auth.uid(), 'forum_report_' || p_status, 'forum_report:' || p_id, '{}');
end $$;

-- Zablokovanie používateľa fóra: nemôže písať, jeho neschválené príspevky sa skryjú.
create or replace function public.admin_forum_ban(p_user uuid, p_ban boolean, p_reason text) returns void
language plpgsql security definer set search_path = public as $$
begin
  perform public.admin_check();
  update public.forum_profiles set banned = p_ban, trusted = case when p_ban then false else trusted end where user_id = p_user;
  if p_ban then update public.forum_posts set status = 'hidden', hidden_reason = coalesce(nullif(btrim(p_reason), ''), 'Zablokovaný používateľ')
                where user_id = p_user and status = 'pending'; end if;
  insert into public.admin_log (admin_id, action, target, detail)
  values (auth.uid(), case when p_ban then 'forum_ban' else 'forum_unban' end, 'forum_user:' || p_user, jsonb_build_object('reason', p_reason));
end $$;

create or replace function public.admin_forum_lock(p_thread bigint, p_locked boolean, p_pinned boolean) returns void
language plpgsql security definer set search_path = public as $$
begin
  perform public.admin_check();
  update public.forum_threads set locked = coalesce(p_locked, locked), pinned = coalesce(p_pinned, pinned) where id = p_thread;
end $$;

-- Mazanie starých údajov: k pôvodnému (10) pribudli nahlásenia vo fóre (odtlačok IP 30 dní, vybavené 12 mesiacov).
create or replace function public.purge_old_data() returns void
language plpgsql security definer set search_path = public as $$
begin
  delete from public.rate_events where created_at < now() - interval '3 days';
  delete from public.messages where created_at < now() - interval '12 months';
  update public.reports set ip_key = null where ip_key is not null and created_at < now() - interval '30 days';
  delete from public.reports where created_at < now() - interval '12 months' and status <> 'open';
  delete from public.admin_log where created_at < now() - interval '3 years';
  delete from public.part_requests where created_at < now() - interval '60 days';
  delete from public.search_alerts where confirmed_at is null and created_at < now() - interval '3 days';
  delete from public.search_alerts where created_at < now() - interval '6 months';
  update public.search_alerts set ip_key = null where ip_key is not null and created_at < now() - interval '3 days';
  update public.forum_reports set ip_key = null where ip_key is not null and created_at < now() - interval '30 days';
  delete from public.forum_reports where created_at < now() - interval '12 months' and status <> 'open';
end $$;

revoke all on function public.forum_is_seller(uuid), public.forum_recount(bigint), public.forum_author(), public.forum_check_body(text),
  public.forum_join(text, text), public.forum_me(), public.forum_new_thread(text, text, text), public.forum_reply(bigint, text),
  public.forum_edit_post(bigint, text), public.forum_delete_post(bigint), public.forum_report(bigint, text, text, text),
  public.forum_delete_account(), public.forum_export_my_data(), public.forum_overview(), public.forum_threads_page(text, int, int),
  public.forum_thread(bigint), public.forum_my_posts(), public.forum_sitemap(), public.admin_forum_queue(), public.admin_forum_set_post(bigint, text, text),
  public.admin_forum_resolve_report(bigint, text), public.admin_forum_ban(uuid, boolean, text), public.admin_forum_lock(bigint, boolean, boolean),
  public.purge_old_data() from public, anon, authenticated;
grant execute on function public.forum_overview(), public.forum_threads_page(text, int, int), public.forum_thread(bigint), public.forum_sitemap(),
  public.forum_report(bigint, text, text, text), public.forum_me() to anon, authenticated;
grant execute on function public.forum_join(text, text), public.forum_new_thread(text, text, text), public.forum_reply(bigint, text),
  public.forum_edit_post(bigint, text), public.forum_delete_post(bigint), public.forum_delete_account(), public.forum_export_my_data(),
  public.forum_my_posts(), public.admin_forum_queue(), public.admin_forum_set_post(bigint, text, text), public.admin_forum_resolve_report(bigint, text),
  public.admin_forum_ban(uuid, boolean, text), public.admin_forum_lock(bigint, boolean, boolean) to authenticated;

-- ===================== Sekcie =====================
insert into public.forum_sections (id, parent_id, name, description, sort) values
  ('technika', null, 'Technické otázky a poruchy', 'Poradňa podľa značky vozidla – poruchy, opravy, výber a výmena dielov.', 1)
on conflict (id) do update set name = excluded.name, description = excluded.description, sort = excluded.sort;
insert into public.forum_sections (id, parent_id, name, description, sort) values
  ('skoda', 'technika', 'Škoda', 'Octavia, Fabia, Superb, Rapid, Kodiaq, Karoq, Favorit, Felicia…', 10),
  ('volkswagen', 'technika', 'Volkswagen', 'Golf, Passat, Polo, Touran, Tiguan, Transporter…', 11),
  ('audi', 'technika', 'Audi', 'A3, A4, A6, Q5, Q7…', 12),
  ('seat-cupra', 'technika', 'Seat a Cupra', 'Ibiza, Leon, Altea, Alhambra, Ateca, Formentor…', 13),
  ('bmw', 'technika', 'BMW a Mini', 'Rad 1, 3, 5, X1, X3, X5, Mini…', 14),
  ('mercedes', 'technika', 'Mercedes-Benz', 'A, C, E, S, Sprinter, Vito…', 15),
  ('opel', 'technika', 'Opel', 'Astra, Corsa, Insignia, Zafira, Vectra…', 16),
  ('ford', 'technika', 'Ford', 'Focus, Fiesta, Mondeo, Kuga, Transit…', 17),
  ('renault-dacia', 'technika', 'Renault a Dacia', 'Mégane, Clio, Scénic, Duster, Sandero, Logan…', 18),
  ('peugeot-citroen', 'technika', 'Peugeot, Citroën a DS', '206, 307, 308, 3008, C3, C4, Berlingo…', 19),
  ('fiat-alfa', 'technika', 'Fiat, Alfa Romeo a Lancia', 'Punto, Panda, Ducato, 159, Giulietta…', 20),
  ('hyundai-kia', 'technika', 'Hyundai a Kia', 'i30, Tucson, ix35, Ceed, Sportage…', 21),
  ('toyota', 'technika', 'Toyota a Lexus', 'Corolla, Yaris, Auris, RAV4…', 22),
  ('japonske', 'technika', 'Honda, Mazda, Nissan, Mitsubishi, Suzuki, Subaru', 'Ostatné japonské značky.', 23),
  ('volvo-ostatne', 'technika', 'Volvo a ostatné značky', 'Volvo, Saab, Land Rover, Tesla, čínske značky a ďalšie.', 24),
  ('veterany-tech', 'technika', 'Veterány', 'Staršie autá – Škoda 100/120, Tatra, Trabant, Lada, Wartburg…', 25),
  ('uzitkove', 'technika', 'Dodávky, nákladné autá a autobusy', 'Iveco, MAN, Scania, DAF, Volvo, Avia, Karosa…', 26),
  ('motorky', 'technika', 'Motorky a štvorkolky', 'Jawa, Honda, Yamaha, KTM, skútre, štvorkolky…', 27)
on conflict (id) do update set parent_id = excluded.parent_id, name = excluded.name, description = excluded.description, sort = excluded.sort;

commit;
