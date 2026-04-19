-- Phase 2 — Authentication & Legal
-- Requirements: AUTH-04 (email-verify helper), AUTH-06 (per-IP rate limit), AUTH-07 (disposable-email trigger)
-- See: .planning/phases/02-authentication-legal/02-RESEARCH.md Pattern 5

----------------------------------------------------------------------
-- 1. signup_attempts rate-limit table (AUTH-06)
----------------------------------------------------------------------
create table public.signup_attempts (
  ip text not null,
  day date not null default current_date,
  count int not null default 0,
  created_at timestamptz not null default now(),
  primary key (ip, day)
);

-- RLS enabled with ZERO policies: only SECURITY DEFINER functions can mutate.
alter table public.signup_attempts enable row level security;

----------------------------------------------------------------------
-- 2. check_signup_ip — increments + returns under-limit boolean
-- Called by lib/utils/rate-limit.ts via supabase.rpc('check_signup_ip', ...)
----------------------------------------------------------------------
create or replace function public.check_signup_ip(p_ip text)
returns boolean
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  current_count int;
begin
  -- Opportunistic GC: keep a 7-day rolling window.
  delete from public.signup_attempts where day < current_date - interval '7 days';

  insert into public.signup_attempts (ip, day, count)
  values (p_ip, current_date, 1)
  on conflict (ip, day) do update set count = public.signup_attempts.count + 1
  returning count into current_count;

  -- AUTH-06: 5 signups per IP per day. 6th attempt is blocked.
  return current_count <= 5;
end;
$$;

grant execute on function public.check_signup_ip(text) to anon, authenticated;

----------------------------------------------------------------------
-- 3. current_user_is_verified — AUTH-04 helper for Phase 3 RLS
--
-- NOTE: The RLS POLICY that uses current_user_is_verified() will be
-- applied to the profiles table in Phase 3 — the profiles table does
-- not exist yet in Phase 2. Phase 2 installs this helper function here
-- so Phase 3 can reference it without adding a migration dependency
-- between the auth-helper migration and the profiles-schema migration.
-- Phase 2 enforces AUTH-04 at the middleware layer (lib/supabase/
-- middleware.ts VERIFIED_REQUIRED_PREFIXES gate); the RLS-layer gate
-- completes in Phase 3.
----------------------------------------------------------------------
create or replace function public.current_user_is_verified()
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select exists (
    select 1 from auth.users
    where id = auth.uid() and email_confirmed_at is not null
  );
$$;

grant execute on function public.current_user_is_verified() to authenticated;

----------------------------------------------------------------------
-- 4. disposable_email_domains seed table (AUTH-07 defense-in-depth)
----------------------------------------------------------------------
create table public.disposable_email_domains (
  domain text primary key
);

-- Seed with a conservative starter list; the server-action check
-- (lib/utils/disposable-email.ts) uses the disposable-email-domains-js
-- package as the primary gate. This table is DEFENSE-IN-DEPTH only —
-- catches OAuth signups (which bypass the server action) using one of
-- these domains.
--
-- Quarterly refresh: rerun scripts/sync-disposable-domains.mjs to re-seed.
insert into public.disposable_email_domains (domain) values
  ('mailinator.com'),
  ('tempmail.com'),
  ('10minutemail.com'),
  ('guerrillamail.com'),
  ('throwaway.email'),
  ('yopmail.com'),
  ('maildrop.cc'),
  ('trashmail.com'),
  ('dispostable.com'),
  ('getnada.com'),
  ('mohmal.com'),
  ('mailnesia.com'),
  ('fakeinbox.com'),
  ('sharklasers.com'),
  ('tempail.com')
on conflict (domain) do nothing;

-- Read-only to everyone; writes are migrations only.
alter table public.disposable_email_domains enable row level security;
create policy "read disposable_email_domains"
  on public.disposable_email_domains
  for select
  to anon, authenticated
  using (true);

----------------------------------------------------------------------
-- 5. reject_disposable_email — trigger function on auth.users INSERT
----------------------------------------------------------------------
create or replace function public.reject_disposable_email()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  email_domain text;
begin
  if new.email is null then
    return new;
  end if;
  email_domain := lower(split_part(new.email, '@', 2));
  if email_domain = '' then
    return new;
  end if;
  if exists (select 1 from public.disposable_email_domains where domain = email_domain) then
    raise exception 'Disposable email domain rejected: %', email_domain
      using errcode = '23514'; -- check_violation
  end if;
  return new;
end;
$$;

drop trigger if exists reject_disposable_email_before_insert on auth.users;
create trigger reject_disposable_email_before_insert
  before insert on auth.users
  for each row execute function public.reject_disposable_email();
