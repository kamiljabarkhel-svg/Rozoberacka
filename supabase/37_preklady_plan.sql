-- 37: Plánovač prekladov (15. 11. 2026): každých 10 minút funkcia „preklady“ preloží nové a zmenené inzeráty do poľštiny.
-- Funkcia len spracuje frontu (každý text sa prekladá raz), preto v Supabase má vypnuté „Verify JWT“.
-- Spustiť až keď je funkcia nasadená a v Secrets je DEEPL_API_KEY.
do $$ begin
  if exists (select 1 from cron.job where jobname = 'autosuciastky-preklady') then perform cron.unschedule('autosuciastky-preklady'); end if;
end $$;
select cron.schedule('autosuciastky-preklady', '*/10 * * * *',
  $$select net.http_post(url := 'https://sbfhmlayemaiinuismhh.supabase.co/functions/v1/preklady', headers := '{"Content-Type":"application/json"}'::jsonb, body := '{}'::jsonb)$$);
