begin;
create extension if not exists pg_cron with schema pg_catalog;
create extension if not exists pg_net with schema extensions;
create extension if not exists supabase_vault with schema vault;

do $$
begin
  if not exists (select 1 from vault.secrets where name = 'bhangra_booking_cron') then
    perform vault.create_secret(gen_random_uuid()::text || gen_random_uuid()::text,'bhangra_booking_cron','Learn Bhangra scheduled maintenance');
  end if;
end;
$$;

create or replace function public.bhangra_authorize_maintenance(p_token text,p_mode text default 'test')
returns boolean language sql security definer set search_path = '' as $$
  select p_mode in ('test','live') and coalesce(p_token = (select decrypted_secret from vault.decrypted_secrets where name = 'bhangra_booking_cron'),false);
$$;
revoke all on function public.bhangra_authorize_maintenance(text,text) from public,anon,authenticated;
grant execute on function public.bhangra_authorize_maintenance(text,text) to service_role;

select cron.schedule('bhangra-test-maintenance','*/2 * * * *',$job$
  select net.http_get(
    url := 'https://gqogroabhqnxtmvgnqnh.supabase.co/functions/v1/bookings-test/maintenance',
    headers := jsonb_build_object('Authorization','Bearer ' || (select decrypted_secret from vault.decrypted_secrets where name = 'bhangra_booking_cron')),
    timeout_milliseconds := 10000
  );
$job$);
select cron.schedule('bhangra-live-maintenance','*/2 * * * *',$job$
  select net.http_get(
    url := 'https://gqogroabhqnxtmvgnqnh.supabase.co/functions/v1/bookings/maintenance',
    headers := jsonb_build_object('Authorization','Bearer ' || (select decrypted_secret from vault.decrypted_secrets where name = 'bhangra_booking_cron')),
    timeout_milliseconds := 10000
  );
$job$);
select cron.alter_job(jobid,active := false) from cron.job where jobname in ('bhangra-test-maintenance','bhangra-live-maintenance');
commit;