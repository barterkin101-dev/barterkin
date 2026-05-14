-- Persist subscription billing interval for app-side plan UX without live Stripe reads
alter table public.profiles
  add column if not exists billing_interval text
  check (billing_interval in ('monthly', 'annual'));

comment on column public.profiles.billing_interval is
  'Current paid subscription billing interval: monthly or annual. Null for free members.';
