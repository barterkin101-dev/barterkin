-- Harden referral reward RPC permissions and align login streaks to UTC calendar days.

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
  v_today_utc date := public.utc_day(now());
  v_last_login_utc date;
  v_credits integer := 0;
  v_is_new_day boolean := false;
begin
  select last_login_at, login_streak
  into v_last_login, v_streak
  from public.profiles
  where id = p_profile_id;

  if v_streak is null then
    streak := 0;
    credits_earned := 0;
    is_new_day := false;
    return next;
    return;
  end if;

  v_last_login_utc := case
    when v_last_login is null then null
    else public.utc_day(v_last_login)
  end;

  if v_last_login_utc is null then
    v_streak := 1;
    v_credits := 1;
    v_is_new_day := true;
  elsif v_last_login_utc = v_today_utc then
    v_is_new_day := false;
  elsif v_last_login_utc = (v_today_utc - 1) then
    v_streak := least(v_streak + 1, 7);
    v_credits := 1;
    v_is_new_day := true;
  else
    v_streak := 1;
    v_credits := 1;
    v_is_new_day := true;
  end if;

  update public.profiles
  set last_login_at = v_now,
      login_streak = v_streak
  where id = p_profile_id;

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

comment on column public.profiles.login_streak is
  'Consecutive UTC-day login streak. Resets to day 1 after missing a UTC calendar day. Capped at 7 for multiplier calculations.';

comment on function public.update_login_streak(uuid) is
  'Updates a member''s UTC-day login streak and awards the daily login credit once per UTC date. Returns (streak, credits_earned, is_new_day).';

revoke all on function public.update_login_streak(uuid) from public;
revoke all on function public.update_login_streak(uuid) from anon;
grant execute on function public.update_login_streak(uuid) to authenticated;
grant execute on function public.update_login_streak(uuid) to service_role;

revoke all on function public.award_referral_credits(uuid) from public;
revoke all on function public.award_referral_credits(uuid) from anon;
grant execute on function public.award_referral_credits(uuid) to authenticated;
grant execute on function public.award_referral_credits(uuid) to service_role;
