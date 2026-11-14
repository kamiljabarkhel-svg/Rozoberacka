-- 35: Plánovač e-mailov (14. 11. 2026). Každú minútu odpovede predajcov, každých 5 minút dopyty, každých 10 minút strážca.
-- Funkcie len spracujú frontu (každá položka sa pošle raz), preto ich volanie nepotrebuje tajné heslo.
-- Pri funkciách odpovede, dopyty, strazca musí byť v Supabase vypnuté „Verify JWT“.
create extension if not exists pg_net;
do $$
declare j text;
begin
  foreach j in array array['autosuciastky-odpovede','autosuciastky-dopyty','autosuciastky-strazca','rozoberacka-strazca'] loop
    if exists (select 1 from cron.job where jobname = j) then perform cron.unschedule(j); end if;
  end loop;
end $$;
select cron.schedule('autosuciastky-odpovede', '* * * * *',
  $$select net.http_post(url := 'https://sbfhmlayemaiinuismhh.supabase.co/functions/v1/odpovede', headers := '{"Content-Type":"application/json"}'::jsonb, body := '{}'::jsonb)$$);
select cron.schedule('autosuciastky-dopyty', '*/5 * * * *',
  $$select net.http_post(url := 'https://sbfhmlayemaiinuismhh.supabase.co/functions/v1/dopyty', headers := '{"Content-Type":"application/json"}'::jsonb, body := '{}'::jsonb)$$);
select cron.schedule('autosuciastky-strazca', '*/10 * * * *',
  $$select net.http_post(url := 'https://sbfhmlayemaiinuismhh.supabase.co/functions/v1/strazca', headers := '{"Content-Type":"application/json"}'::jsonb, body := '{}'::jsonb)$$);
