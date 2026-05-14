-- Referral conversion rewards now unlock only after the invitee publishes.
-- Award the inviter 10 credits and keep the operation idempotent per referral row.

create or replace function public.award_referral_credits(p_invitee_id uuid)
returns boolean
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_referral_id uuid;
  v_inviter_id uuid;
  v_already_credited boolean;
  v_invitee_published boolean;
begin
  select id, inviter_id, credited_at is not null
  into v_referral_id, v_inviter_id, v_already_credited
  from public.referrals
  where invitee_id = p_invitee_id;

  if v_referral_id is null or v_already_credited or v_inviter_id = p_invitee_id then
    return false;
  end if;

  select is_published
  into v_invitee_published
  from public.profiles
  where id = p_invitee_id;

  if coalesce(v_invitee_published, false) is not true then
    return false;
  end if;

  update public.referrals
  set credited_at = now()
  where id = v_referral_id;

  insert into public.credit_ledger (profile_id, amount, reason, referral_id)
  values (v_inviter_id, 10, 'quest_referral_converted', v_referral_id);

  return true;
end;
$$;

comment on function public.award_referral_credits(uuid) is
  'Idempotently awards the inviter 10 credits when an invitee publishes their profile. Returns true if credits were awarded.';
