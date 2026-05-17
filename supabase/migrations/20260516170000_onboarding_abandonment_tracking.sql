-- Onboarding abandonment drip email tracking
-- Prevents duplicate reminder emails and enables idempotent sends
--
-- Depends on: 003_profile_tables.sql, 20260516160000_welcome_email_tracking.sql

alter table public.profiles
  add column if not exists onboarding_reminder_sent_at timestamptz;

comment on column public.profiles.onboarding_reminder_sent_at is
  'Timestamp when the onboarding abandonment reminder email was sent. Null = not sent yet.';

-- Index for efficient lookup of members who still need the reminder
create index if not exists idx_profiles_onboarding_reminder_not_sent
  on public.profiles(onboarding_reminder_sent_at)
  where onboarding_reminder_sent_at is null;
