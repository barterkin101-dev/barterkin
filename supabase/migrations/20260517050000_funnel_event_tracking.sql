-- Funnel event tracking columns
-- Prevents duplicate PostHog events for first-time member actions.
--
-- Depends on: 003_profile_tables.sql, 20260516160000_welcome_email_tracking.sql,
--             20260516170000_onboarding_abandonment_tracking.sql

alter table public.profiles
  add column if not exists onboarding_started_at timestamptz,
  add column if not exists first_listing_viewed_at timestamptz,
  add column if not exists first_listing_created_at timestamptz,
  add column if not exists first_contact_sent_at timestamptz,
  add column if not exists first_trade_completed_at timestamptz;

-- Also fix the missing onboarding_reminder_sent_at in Row type by ensuring it exists
-- (it was added in 20260516170000_onboarding_abandonment_tracking.sql but may be missing from types)
-- The column itself already exists from the previous migration.

comment on column public.profiles.onboarding_started_at is
  'Timestamp when the member first loaded the onboarding wizard. Used for funnel analytics.';
comment on column public.profiles.first_listing_viewed_at is
  'Timestamp when the member first viewed a listing detail page. Used for funnel analytics.';
comment on column public.profiles.first_listing_created_at is
  'Timestamp when the member created their first listing. Used for funnel analytics.';
comment on column public.profiles.first_contact_sent_at is
  'Timestamp when the member sent their first message. Used for funnel analytics.';
comment on column public.profiles.first_trade_completed_at is
  'Timestamp when the member completed their first trade. Used for funnel analytics.';
