-- Referral credit tracking for the invite-a-friend viral loop.
-- Awards credits to both inviter and invitee when onboarding completes.

-- Add credits column to profiles for quick balance lookups.
alter table public.profiles
  add column if not exists credits integer not null default 0;

-- Track who referred whom and whether credit has been awarded.
create table if not exists public.referrals (
  id uuid primary key default gen_random_uuid(),
  inviter_id uuid not null references public.profiles(id) on delete cascade,
  invitee_id uuid not null references public.profiles(id) on delete cascade,
  invitee_referral_code text not null,
  credited_at timestamptz,
  created_at timestamptz not null default now(),
  unique (invitee_id)
);

-- Index for fast inviter lookups
create index if not exists referrals_inviter_id_idx on public.referrals(inviter_id);
-- Index for fast invitee lookups
create index if not exists referrals_invitee_id_idx on public.referrals(invitee_id);

-- Credit ledger: tracks credit balance per profile.
create table if not exists public.credit_ledger (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references public.profiles(id) on delete cascade,
  amount integer not null,
  reason text not null,
  referral_id uuid references public.referrals(id) on delete set null,
  created_at timestamptz not null default now()
);

create index if not exists credit_ledger_profile_id_idx on public.credit_ledger(profile_id);

-- Trigger: keep profiles.credits in sync with credit_ledger inserts.
create or replace function public.update_profile_credits()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  update public.profiles
  set credits = credits + new.amount
  where id = new.profile_id;
  return new;
end;
$$;

drop trigger if exists trg_update_profile_credits on public.credit_ledger;
create trigger trg_update_profile_credits
  after insert on public.credit_ledger
  for each row
  execute function public.update_profile_credits();

-- Function: award referral credits atomically.
-- Called when onboarding completes. Idempotent via credited_at check.
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
begin
  -- Find the referral record for this invitee
  select id, inviter_id, credited_at is not null
  into v_referral_id, v_inviter_id, v_already_credited
  from public.referrals
  where invitee_id = p_invitee_id;

  -- No referral found or already credited → no-op
  if v_referral_id is null or v_already_credited then
    return false;
  end if;

  -- Mark as credited
  update public.referrals
  set credited_at = now()
  where id = v_referral_id;

  -- Award inviter: 2 credits
  insert into public.credit_ledger (profile_id, amount, reason, referral_id)
  values (v_inviter_id, 2, 'referral_bonus', v_referral_id);

  -- Award invitee: 1 credit
  insert into public.credit_ledger (profile_id, amount, reason, referral_id)
  values (p_invitee_id, 1, 'referral_welcome', v_referral_id);

  return true;
end;
$$;

comment on table public.referrals is
  'Tracks invitee→inviter relationships for the referral program. One row per successful referral.';
comment on table public.credit_ledger is
  'Immutable credit transactions. Sum(amount) per profile_id = current balance.';
comment on function public.award_referral_credits(uuid) is
  'Idempotently awards referral credits when an invitee completes onboarding. Returns true if credits were awarded.';
