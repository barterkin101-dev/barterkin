-- County referral unlocks — viral growth loop
-- When 3+ people from the same county join via a member's referral, award 25 credits
-- and send a "County unlocked" celebration email.
--
-- Depends on: profiles, referrals, credit_ledger, counties

-- ============================================================================
-- SECTION 1: county_referral_unlocks tracking table
-- ============================================================================
create table if not exists public.county_referral_unlocks (
  id              uuid primary key default gen_random_uuid(),
  inviter_id      uuid not null references public.profiles(id) on delete cascade,
  county_id       int not null references public.counties(id) on delete cascade,
  referral_count  int not null default 0,
  unlocked_at     timestamptz,
  credits_awarded int not null default 0,
  created_at      timestamptz not null default now(),
  unique (inviter_id, county_id)
);

-- Index for fast inviter + county lookups
create index if not exists county_referral_unlocks_inviter_county_idx
  on public.county_referral_unlocks(inviter_id, county_id);

-- Index for admin stats
create index if not exists county_referral_unlocks_unlocked_at_idx
  on public.county_referral_unlocks(unlocked_at desc)
  where unlocked_at is not null;

-- RLS: service_role only (cron route + server actions)
alter table public.county_referral_unlocks enable row level security;
create policy "county_referral_unlocks_service_only" on public.county_referral_unlocks
  for all to service_role using (true) with check (true);

-- ============================================================================
-- SECTION 2: Helper function — count published referrals from a specific county
-- ============================================================================
create or replace function public.count_county_referrals(p_inviter_id uuid, p_county_id int)
returns int
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select count(*)::int
  from public.referrals r
  join public.profiles p on p.id = r.invitee_id
  where r.inviter_id = p_inviter_id
    and p.county_id = p_county_id
    and p.is_published = true
    and p.banned = false;
$$;

revoke execute on function public.count_county_referrals(uuid, int) from public;
revoke execute on function public.count_county_referrals(uuid, int) from anon;
revoke execute on function public.count_county_referrals(uuid, int) from authenticated;
grant execute on function public.count_county_referrals(uuid, int) to service_role;

comment on function public.count_county_referrals(uuid, int) is
  'Counts published invitees from a specific county for an inviter. SECURITY DEFINER, service_role only.';

-- ============================================================================
-- SECTION 3: Helper function — check and award county unlock
-- ============================================================================
create or replace function public.check_and_award_county_unlock(p_inviter_id uuid, p_county_id int)
returns table(
  was_unlocked boolean,
  referral_count int,
  credits_awarded int
)
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_count int;
  v_existing_id uuid;
  v_already_unlocked boolean;
  v_credits int := 25;
begin
  -- Count published referrals from this county
  select public.count_county_referrals(p_inviter_id, p_county_id)
  into v_count;

  -- Check if there's an existing unlock record
  select id, unlocked_at is not null
  into v_existing_id, v_already_unlocked
  from public.county_referral_unlocks
  where inviter_id = p_inviter_id
    and county_id = p_county_id;

  -- If already unlocked, just return current stats
  if v_already_unlocked then
    was_unlocked := false;
    referral_count := v_count;
    credits_awarded := v_credits;
    return next;
    return;
  end if;

  -- If threshold not met (3+), return without unlocking
  if v_count < 3 then
    was_unlocked := false;
    referral_count := v_count;
    credits_awarded := 0;
    return next;
    return;
  end if;

  -- Threshold met — perform unlock
  if v_existing_id is not null then
    update public.county_referral_unlocks
    set unlocked_at = now(),
        referral_count = v_count,
        credits_awarded = v_credits
    where id = v_existing_id;
  else
    insert into public.county_referral_unlocks (inviter_id, county_id, referral_count, unlocked_at, credits_awarded)
    values (p_inviter_id, p_county_id, v_count, now(), v_credits);
  end if;

  -- Award credits
  insert into public.credit_ledger (profile_id, amount, reason)
  values (p_inviter_id, v_credits, 'county_referral_unlock');

  was_unlocked := true;
  referral_count := v_count;
  credits_awarded := v_credits;
  return next;
end;
$$;

revoke execute on function public.check_and_award_county_unlock(uuid, int) from public;
revoke execute on function public.check_and_award_county_unlock(uuid, int) from anon;
revoke execute on function public.check_and_award_county_unlock(uuid, int) from authenticated;
grant execute on function public.check_and_award_county_unlock(uuid, int) to service_role;

comment on function public.check_and_award_county_unlock(uuid, int) is
  'Checks if an inviter has 3+ published referrals from a county. If so, unlocks 25 credits. Idempotent. SECURITY DEFINER, service_role only.';

-- ============================================================================
-- SECTION 4: Comments
-- ============================================================================
comment on table public.county_referral_unlocks is
  'Tracks county-level referral unlocks. When 3+ people from the same county join via referral, the inviter gets 25 credits.';
