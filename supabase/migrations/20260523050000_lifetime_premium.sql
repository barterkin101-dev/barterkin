-- Lifetime Premium tier
-- Adds 'lifetime' to the tier check constraint and subscription_status for tracking.

-- Expand tier enum to include lifetime
alter table public.profiles
  drop constraint if exists profiles_tier_check;

alter table public.profiles
  add constraint profiles_tier_check
  check (tier in ('free', 'premium', 'founding', 'lifetime'));

-- Add subscription_status to distinguish active/canceled/lifetime states
alter table public.profiles
  add column if not exists subscription_status text
  check (subscription_status in ('active', 'canceled', 'past_due', 'lifetime'));

comment on column public.profiles.subscription_status is
  'Stripe subscription status: active, canceled, past_due, or lifetime (one-time payment).';
