-- Credit-earning quests system
-- Members earn credits for engagement: daily login streak, first listing, complete profile, first message.
-- Depends on: credit_ledger (20260513010000_referral_credits.sql), profiles

-- ============================================================================
-- SECTION 1: Add quest tracking columns to profiles
-- ============================================================================

alter table public.profiles
  add column if not exists last_login_at timestamptz,
  add column if not exists login_streak integer not null default 0;

comment on column public.profiles.last_login_at is
  'Timestamp of the most recent login (set by updateLoginStreak). Used for streak calculation.';
comment on column public.profiles.login_streak is
  'Consecutive daily login streak. Resets to 0 after 48h gap. Capped at 7 for multiplier calculations.';

-- ============================================================================
-- SECTION 2: Quest completion tracking (idempotent per user per quest)
-- ============================================================================

create table if not exists public.quest_completions (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references public.profiles(id) on delete cascade,
  quest_key text not null,
  credits_awarded integer not null,
  awarded_at timestamptz not null default now(),
  unique (profile_id, quest_key)
);

create index if not exists quest_completions_profile_id_idx on public.quest_completions(profile_id);
create index if not exists quest_completions_quest_key_idx on public.quest_completions(quest_key);

comment on table public.quest_completions is
  'Tracks which quests each user has completed. One row per (profile, quest_key). Prevents duplicate awards.';

-- ============================================================================
-- SECTION 3: Function — update login streak on each login
-- ============================================================================

create or replace function public.update_login_streak(p_profile_id uuid)
returns table(
  streak integer,
  credits_earned integer,
  is_new_day boolean
)
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_last_login timestamptz;
  v_streak integer;
  v_now timestamptz := now();
  v_hours_since numeric;
  v_credits integer := 0;
  v_is_new_day boolean := false;
begin
  select last_login_at, login_streak
  into v_last_login, v_streak
  from public.profiles
  where id = p_profile_id;

  -- Profile not found → return zeros
  if v_streak is null then
    streak := 0;
    credits_earned := 0;
    is_new_day := false;
    return next;
    return;
  end if;

  v_hours_since := extract(epoch from (v_now - coalesce(v_last_login, 'epoch'::timestamptz))) / 3600;

  if v_last_login is null then
    -- First-ever login tracked
    v_streak := 1;
    v_credits := 1;
    v_is_new_day := true;
  elsif v_hours_since >= 48 then
    -- Streak broken (>48h gap)
    v_streak := 1;
    v_credits := 1;
    v_is_new_day := true;
  elsif v_hours_since >= 20 then
    -- New day (within reasonable window, prevents edge-case double-count)
    v_streak := least(v_streak + 1, 7);
    v_credits := 1;
    v_is_new_day := true;
  else
    -- Same day re-login, no streak change, no credits
    v_is_new_day := false;
  end if;

  -- Update profile
  update public.profiles
  set last_login_at = v_now,
      login_streak = v_streak
  where id = p_profile_id;

  -- Award daily login credit if new day
  if v_is_new_day and v_credits > 0 then
    insert into public.credit_ledger (profile_id, amount, reason)
    values (p_profile_id, v_credits, 'quest_daily_login');
  end if;

  streak := v_streak;
  credits_earned := v_credits;
  is_new_day := v_is_new_day;
  return next;
end;
$$;

comment on function public.update_login_streak(uuid) is
  'Updates login streak and awards daily login credit. Returns (streak, credits_earned, is_new_day).';

-- ============================================================================
-- SECTION 4: Function — award quest credit (idempotent)
-- ============================================================================

create or replace function public.award_quest_credit(
  p_profile_id uuid,
  p_quest_key text,
  p_credits integer
)
returns boolean
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  -- Idempotent: skip if already completed
  if exists (
    select 1 from public.quest_completions
    where profile_id = p_profile_id and quest_key = p_quest_key
  ) then
    return false;
  end if;

  -- Record completion
  insert into public.quest_completions (profile_id, quest_key, credits_awarded)
  values (p_profile_id, p_quest_key, p_credits);

  -- Award credits via ledger (triggers profiles.credits update)
  insert into public.credit_ledger (profile_id, amount, reason)
  values (p_profile_id, p_credits, p_quest_key);

  return true;
end;
$$;

comment on function public.award_quest_credit(uuid, text, integer) is
  'Idempotently awards quest credits. Returns true if newly awarded, false if already completed.';

-- ============================================================================
-- SECTION 5: RLS
-- ============================================================================

alter table public.quest_completions enable row level security;

-- Owners see own completions
create policy "Owners see own quest completions"
  on public.quest_completions for select to authenticated
  using (profile_id in (select id from public.profiles where owner_id = auth.uid()));

-- Service role can manage all
create policy "Service role manages quest completions"
  on public.quest_completions for all to service_role
  using (true) with check (true);

-- ============================================================================
-- SECTION 6: Grant execute
-- ============================================================================

grant execute on function public.update_login_streak(uuid) to authenticated;
grant execute on function public.update_login_streak(uuid) to service_role;
grant execute on function public.award_quest_credit(uuid, text, integer) to authenticated;
grant execute on function public.award_quest_credit(uuid, text, integer) to service_role;