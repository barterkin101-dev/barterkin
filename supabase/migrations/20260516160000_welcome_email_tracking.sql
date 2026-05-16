-- Welcome email tracking for new signup drip
-- Prevents duplicate welcome emails and enables idempotent sends

alter table public.profiles
  add column if not exists welcome_email_sent_at timestamptz;

comment on column public.profiles.welcome_email_sent_at is
  'Timestamp when the welcome email was sent. Null = not sent yet.';

-- Index for efficient lookup of unsent welcome emails
create index if not exists idx_profiles_welcome_email_not_sent
  on public.profiles(welcome_email_sent_at)
  where welcome_email_sent_at is null;
