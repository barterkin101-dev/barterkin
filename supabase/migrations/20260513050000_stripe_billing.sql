-- Stripe subscription billing v1
-- Adds tier tracking and Stripe customer/subscription IDs to profiles.
--
-- Free tier: 3 listings max, 10 contacts/mo
-- Premium tier ($9/mo): unlimited listings, featured placement, 100 contacts/mo, verified badge

-- Add tier column to profiles
alter table public.profiles
  add column if not exists tier text not null default 'free'
  check (tier in ('free', 'premium', 'founding'));

-- Add Stripe customer ID for Customer Portal lookups
alter table public.profiles
  add column if not exists stripe_customer_id text;

-- Add Stripe subscription ID for webhook sync
alter table public.profiles
  add column if not exists stripe_subscription_id text;

-- Add subscription period end for grace-period handling
alter table public.profiles
  add column if not exists subscription_current_period_end timestamptz;

-- Index for fast Stripe webhook lookups
create index if not exists idx_profiles_stripe_customer_id on public.profiles(stripe_customer_id);
create index if not exists idx_profiles_stripe_subscription_id on public.profiles(stripe_subscription_id);

-- Index for tier-based queries (e.g. featured listings)
create index if not exists idx_profiles_tier on public.profiles(tier);

-- RLS: users can read their own tier + stripe fields
-- (Stripe webhooks write via service_role, users read their own row)

comment on column public.profiles.tier is
  'Subscription tier: free, premium, or founding (lifetime discount).';
comment on column public.profiles.stripe_customer_id is
  'Stripe Customer ID for billing portal and invoice lookups.';
comment on column public.profiles.stripe_subscription_id is
  'Stripe Subscription ID for webhook-driven status sync.';
comment on column public.profiles.subscription_current_period_end is
  'End of current billing period. Used for grace-period feature access.';
