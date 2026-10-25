-- Run once in Supabase Dashboard -> SQL Editor. Safe to re-run.

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  name text,
  phone_number text,
  created_at timestamptz not null default now()
);

create table if not exists public.focus_sessions (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references public.profiles(id) on delete cascade,
  starter_id uuid not null references public.profiles(id) on delete cascade,
  expiry_at timestamptz not null,
  focus_content text,
  created_at timestamptz not null default now()
);

-- Self-lock model: owner_id = starter_id = the user who locked themselves in.
-- The accountability contact is who gets texted if they bail on the session.
alter table public.focus_sessions add column if not exists contact_name text;
alter table public.focus_sessions add column if not exists contact_phone text;

create index if not exists focus_sessions_owner_expiry_idx
  on public.focus_sessions (owner_id, expiry_at);

alter table public.profiles enable row level security;
alter table public.focus_sessions enable row level security;

drop policy if exists "profiles readable by signed-in users" on public.profiles;
create policy "profiles readable by signed-in users"
  on public.profiles for select to authenticated using (true);

drop policy if exists "users insert own profile" on public.profiles;
create policy "users insert own profile"
  on public.profiles for insert to authenticated with check (id = auth.uid());

drop policy if exists "users update own profile" on public.profiles;
create policy "users update own profile"
  on public.profiles for update to authenticated
  using (id = auth.uid()) with check (id = auth.uid());

-- Replaces the old "readable by all" policy: a session row now holds a
-- contact's phone number, so each user can only read their own sessions.
-- The notification job uses the service role, which bypasses RLS.
drop policy if exists "sessions readable by signed-in users" on public.focus_sessions;
drop policy if exists "users read own sessions" on public.focus_sessions;
create policy "users read own sessions"
  on public.focus_sessions for select to authenticated
  using (owner_id = auth.uid());

drop policy if exists "users start sessions as themselves" on public.focus_sessions;
drop policy if exists "users lock themselves in" on public.focus_sessions;
create policy "users lock themselves in"
  on public.focus_sessions for insert to authenticated
  with check (owner_id = auth.uid() and starter_id = auth.uid());

-- Tamper reporting: set by the notify-contact Edge Function (service role)
-- once the accountability contact has been texted. Users cannot write it.
alter table public.focus_sessions add column if not exists tamper_notified_at timestamptz;
alter table public.focus_sessions add column if not exists tamper_reason text;

-- Heartbeat: the app pings while a session runs. stale-session sweeps compare
-- this against now() to spot an app that was killed or deleted mid-session.
alter table public.focus_sessions
  add column if not exists heartbeat_at timestamptz not null default now();

create or replace function public.session_heartbeat()
returns void
language sql
security definer
set search_path = public
as $$
  update public.focus_sessions
  set heartbeat_at = now()
  where owner_id = auth.uid() and expiry_at > now();
$$;

revoke all on function public.session_heartbeat() from public;
grant execute on function public.session_heartbeat() to authenticated;

-- Status: 'active' while running, 'finished' once expiry_at passes. The app
-- derives "active" from expiry_at, so this column is for people reading the
-- table; a per-minute job keeps it honest even if the phone is off.
alter table public.focus_sessions add column if not exists status text not null default 'active';

update public.focus_sessions set status = 'finished'
where expiry_at <= now() and status <> 'finished';

create extension if not exists pg_cron;
select cron.unschedule('finish-focus-sessions')
  where exists (select 1 from cron.job where jobname = 'finish-focus-sessions');
select cron.schedule(
  'finish-focus-sessions',
  '* * * * *',
  $$update public.focus_sessions set status = 'finished'
    where expiry_at <= now() and status <> 'finished'$$
);

-- Per-session expiry: inserting a session schedules a one-off job that marks
-- it finished at its end time (rounded up to the next minute) and then removes
-- itself. The per-minute job above stays as a safety net.
create or replace function public.schedule_session_expiry()
returns trigger
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  at_utc timestamp := date_trunc('minute', new.expiry_at at time zone 'utc') + interval '1 minute';
  job text := 'expire-' || new.owner_id || '-' || extract(epoch from new.expiry_at)::bigint;
begin
  perform cron.schedule(
    job,
    format('%s %s %s %s *',
      extract(minute from at_utc)::int, extract(hour from at_utc)::int,
      extract(day from at_utc)::int, extract(month from at_utc)::int),
    format($cmd$
      update public.focus_sessions set status = 'finished'
        where owner_id = %L and expiry_at = %L and status <> 'finished';
      select cron.unschedule(%L);
    $cmd$, new.owner_id, new.expiry_at, job)
  );
  return new;
end;
$$;

drop trigger if exists schedule_session_expiry on public.focus_sessions;
create trigger schedule_session_expiry
  after insert on public.focus_sessions
  for each row execute function public.schedule_session_expiry();

-- Ending early requires the accountability contact's approval. Users can't
-- end a session themselves: the request-end Edge Function texts the contact an
-- approve/deny link, and respond-end (service role) applies the answer. Only a
-- hash of the link token is stored, since users can read their own rows.
drop function if exists public.end_session_early();

alter table public.focus_sessions add column if not exists ended_early_at timestamptz;
alter table public.focus_sessions add column if not exists end_request_status text;
alter table public.focus_sessions add column if not exists end_request_token_hash text;
alter table public.focus_sessions add column if not exists end_requested_at timestamptz;
