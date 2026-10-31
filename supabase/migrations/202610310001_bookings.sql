begin;
create schema if not exists bhangra_private;
revoke all on schema bhangra_private from public, anon, authenticated;
create table if not exists bhangra_private.booking_orders (
  id uuid not null,
  mode text not null check (mode in ('test','live')),
  workshop_id text not null,
  ticket_id text not null,
  quantity integer not null check (quantity > 0),
  unit_amount integer not null check (unit_amount > 0),
  title text not null,
  label text not null,
  starts_at text not null,
  location text not null,
  state text not null default 'creating' check (state in ('creating','open','paid','expired','failed')),
  session_id text,
  expires_at bigint not null,
  email text,
  tickets jsonb,
  email_sent boolean not null default false,
  last_checked_at bigint not null default 0,
  created_at bigint not null,
  primary key (mode,id),
  unique (mode,session_id)
);
create index if not exists booking_orders_ticket_state on bhangra_private.booking_orders(mode,ticket_id,state);
alter table bhangra_private.booking_orders enable row level security;
revoke all on bhangra_private.booking_orders from public, anon, authenticated;
create table if not exists bhangra_private.maintenance_leases (name text primary key, expires_at timestamptz not null);
alter table bhangra_private.maintenance_leases enable row level security;
revoke all on bhangra_private.maintenance_leases from public, anon, authenticated;

create or replace function public.bhangra_read_booking(p_id uuid default null, p_session_id text default null, p_mode text default 'test')
returns jsonb language sql security definer set search_path = '' as $$
  select to_jsonb(booking) from bhangra_private.booking_orders booking
  where booking.mode = p_mode and ((p_id is not null and booking.id = p_id) or (p_id is null and p_session_id is not null and booking.session_id = p_session_id));
$$;
create or replace function public.bhangra_booking_remaining(p_ticket_id text, p_capacity integer, p_mode text default 'test')
returns integer language sql security definer set search_path = '' as $$
  select greatest(0, p_capacity::bigint - coalesce(sum(quantity), 0))::integer
  from bhangra_private.booking_orders where mode = p_mode and ticket_id = p_ticket_id and state in ('creating','open','paid');
$$;
create or replace function public.bhangra_reserve_booking(p_id uuid, p_workshop jsonb, p_ticket jsonb, p_quantity integer, p_mode text default 'test')
returns jsonb language plpgsql security definer set search_path = '' as $$
declare booking bhangra_private.booking_orders%rowtype; available integer; capacity integer; amount integer;
begin
  perform pg_advisory_xact_lock(hashtextextended('bhangra-order:' || p_mode || ':' || p_id::text, 0));
  select * into booking from bhangra_private.booking_orders where id = p_id and mode = p_mode;
  if found then
    if booking.workshop_id != p_workshop->>'id' or booking.ticket_id != p_ticket->>'id' or booking.quantity != p_quantity then
      raise exception 'REQUEST_CONFLICT';
    end if;
    return to_jsonb(booking);
  end if;
  capacity := (p_ticket->>'capacity')::integer;
  amount := (p_ticket->>'amount')::integer;
  if (p_ticket->>'active')::boolean is not true or capacity is null or capacity <= 0 or amount is null or amount <= 0
    or p_ticket->>'startsAt' is null or (p_ticket->>'startsAt')::timestamptz <= now() + interval '35 minutes' then
    raise exception 'BOOKING_UNAVAILABLE';
  end if;
  if p_quantity is null or p_quantity < 1 or amount::bigint * p_quantity > 99999999 then raise exception 'INVALID_QUANTITY'; end if;
  perform pg_advisory_xact_lock(hashtextextended('bhangra-ticket:' || p_mode || ':' || (p_ticket->>'id'), 0));
  select public.bhangra_booking_remaining(p_ticket->>'id', capacity, p_mode) into available;
  if p_quantity > available then raise exception 'INSUFFICIENT_PLACES'; end if;
  insert into bhangra_private.booking_orders(id,mode,workshop_id,ticket_id,quantity,unit_amount,title,label,starts_at,location,expires_at,created_at)
  values(p_id,p_mode,p_workshop->>'id',p_ticket->>'id',p_quantity,amount,p_workshop->>'title',p_ticket->>'label',p_ticket->>'startsAt',
    p_workshop->>'location',floor(extract(epoch from now()))::bigint + 2100,floor(extract(epoch from now()))::bigint)
  returning * into booking;
  return to_jsonb(booking);
end;
$$;
create or replace function public.bhangra_attach_session(p_id uuid, p_session_id text, p_mode text default 'test')
returns jsonb language plpgsql security definer set search_path = '' as $$
declare booking bhangra_private.booking_orders%rowtype;
begin
  select * into booking from bhangra_private.booking_orders where id = p_id and mode = p_mode for update;
  if not found then raise exception 'BOOKING_NOT_FOUND'; end if;
  if booking.session_id is not null and booking.session_id != p_session_id then raise exception 'SESSION_CONFLICT'; end if;
  update bhangra_private.booking_orders set session_id = p_session_id,
    state = case when state = 'creating' then 'open' else state end where id = p_id and mode = p_mode returning * into booking;
  return to_jsonb(booking);
end;
$$;
create or replace function public.bhangra_fulfill_booking(p_id uuid,p_session_id text,p_currency text,p_total bigint,p_paid boolean,p_email text,p_mode text default 'test')
returns jsonb language plpgsql security definer set search_path = '' as $$
declare booking bhangra_private.booking_orders%rowtype; codes jsonb;
begin
  select * into booking from bhangra_private.booking_orders where id = p_id and mode = p_mode for update;
  if not found then raise exception 'BOOKING_NOT_FOUND'; end if;
  if p_paid is not true or p_currency is distinct from 'aud' or p_total is distinct from booking.quantity::bigint * booking.unit_amount
    or p_session_id is null or (booking.session_id is not null and booking.session_id != p_session_id) then raise exception 'PAYMENT_MISMATCH'; end if;
  if booking.state = 'paid' then return to_jsonb(booking); end if;
  select jsonb_agg(gen_random_uuid()::text) into codes from generate_series(1,booking.quantity);
  update bhangra_private.booking_orders set state = 'paid',session_id = p_session_id,email = p_email,tickets = codes
    where id = p_id and mode = p_mode returning * into booking;
  return to_jsonb(booking);
end;
$$;
create or replace function public.bhangra_release_booking(p_id uuid,p_state text,p_mode text default 'test')
returns jsonb language plpgsql security definer set search_path = '' as $$
begin
  if p_state is null or p_state not in ('expired','failed') then raise exception 'INVALID_STATE'; end if;
  update bhangra_private.booking_orders set state = p_state where id = p_id and mode = p_mode and state != 'paid';
  return public.bhangra_read_booking(p_id, null, p_mode);
end;
$$;
create or replace function public.bhangra_pending_bookings(p_mode text default 'test')
returns jsonb language sql security definer set search_path = '' as $$
  select coalesce(jsonb_agg(to_jsonb(booking)), '[]'::jsonb) from
    (select * from bhangra_private.booking_orders where mode = p_mode and state in ('creating','open') order by last_checked_at,created_at,id limit 100) booking;
$$;
  create or replace function public.bhangra_mark_checked(p_id uuid,p_mode text default 'test')
returns void language sql security definer set search_path = '' as $$
  update bhangra_private.booking_orders set last_checked_at = floor(extract(epoch from clock_timestamp()) * 1000)::bigint where id = p_id and mode = p_mode;
$$;
create or replace function public.bhangra_unsent_bookings(p_mode text default 'test')
returns jsonb language sql security definer set search_path = '' as $$
  select coalesce(jsonb_agg(to_jsonb(booking)), '[]'::jsonb) from
    (select * from bhangra_private.booking_orders where mode = p_mode and state = 'paid' and email_sent = false and email is not null order by last_checked_at,created_at,id limit 100) booking;
$$;
  create or replace function public.bhangra_mark_email_sent(p_id uuid,p_mode text default 'test')
returns void language sql security definer set search_path = '' as $$
  update bhangra_private.booking_orders set email_sent = true where id = p_id and mode = p_mode and state = 'paid';
$$;
create or replace function public.bhangra_take_maintenance_lease(p_seconds integer default 90,p_mode text default 'test')
returns boolean language plpgsql security definer set search_path = '' as $$
declare acquired text;
begin
  if p_seconds is null or p_seconds < 1 or p_seconds > 300 then raise exception 'INVALID_STATE'; end if;
  insert into bhangra_private.maintenance_leases(name,expires_at) values('bookings-' || p_mode,now() + make_interval(secs => p_seconds))
    on conflict(name) do update set expires_at = excluded.expires_at
    where bhangra_private.maintenance_leases.expires_at <= now() returning name into acquired;
  return acquired is not null;
end;
$$;
create table if not exists bhangra_private.booking_limits (
  mode text not null check (mode in ('test','live')),
  request_key text not null,
  window_at bigint not null,
  hits integer not null,
  primary key (mode,request_key)
);
create index if not exists booking_limits_window on bhangra_private.booking_limits(window_at);
alter table bhangra_private.booking_limits enable row level security;
revoke all on bhangra_private.booking_limits from public,anon,authenticated;
create or replace function public.bhangra_check_booking_limit(p_key text,p_mode text default 'test')
returns boolean language plpgsql security definer set search_path = '' as $$
declare bucket bigint := floor(extract(epoch from clock_timestamp()) / 60)::bigint; used integer;
begin
  if p_key is null or p_key !~ '^[a-f0-9]{64}$' then raise exception 'INVALID_STATE'; end if;
  delete from bhangra_private.booking_limits where window_at < bucket - 10;
  insert into bhangra_private.booking_limits(mode,request_key,window_at,hits) values(p_mode,p_key,bucket,1)
    on conflict(mode,request_key) do update set window_at = excluded.window_at,
      hits = case when bhangra_private.booking_limits.window_at != bucket then 1 else least(bhangra_private.booking_limits.hits + 1,21) end
    returning hits into used;
  return used <= 20;
end;
$$;
do $$
declare booking_function regprocedure;
begin
  for booking_function in select oid::regprocedure from pg_proc
    where pronamespace = 'public'::regnamespace and proname in (
      'bhangra_read_booking','bhangra_booking_remaining','bhangra_reserve_booking','bhangra_attach_session',
      'bhangra_fulfill_booking','bhangra_release_booking','bhangra_pending_bookings','bhangra_unsent_bookings',
      'bhangra_mark_email_sent','bhangra_take_maintenance_lease','bhangra_mark_checked','bhangra_check_booking_limit')
  loop
    execute format('revoke all on function %s from public, anon, authenticated',booking_function);
    execute format('grant execute on function %s to service_role',booking_function);
  end loop;
end;
$$;
commit;