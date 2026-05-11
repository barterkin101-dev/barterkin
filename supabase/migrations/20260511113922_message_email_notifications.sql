-- Phase 3.5 — Email Notifications for New Messages
-- Depends on: 017_conversations.sql
--
-- When a user receives a message while offline, they get an email notification.
-- This table queues notifications and deduplicates them (one per conversation per hour).
-- A cron job or on-demand API route processes pending rows and sends via Resend.

-- ============================================================================
-- SECTION 1: Notification queue table
-- ============================================================================
create table public.message_email_notifications (
  id              uuid primary key default gen_random_uuid(),
  message_id      uuid not null references public.messages(id) on delete cascade,
  conversation_id uuid not null references public.conversations(id) on delete cascade,
  recipient_profile_id uuid not null references public.profiles(id) on delete cascade,
  sender_profile_id    uuid not null references public.profiles(id) on delete cascade,
  status          text not null default 'pending' check (status in ('pending', 'sent', 'failed')),
  sent_at         timestamptz,
  error_message   text,
  created_at      timestamptz not null default now()
);

-- ============================================================================
-- SECTION 2: Indexes for efficient queue processing
-- ============================================================================
create index message_email_notifications_pending_idx
  on public.message_email_notifications(status, created_at)
  where status = 'pending';

create index message_email_notifications_recipient_idx
  on public.message_email_notifications(recipient_profile_id, created_at desc);

-- Deduplication: prevent duplicate notifications for the same message
create unique index message_email_notifications_message_recipient_idx
  on public.message_email_notifications(message_id, recipient_profile_id);

-- ============================================================================
-- SECTION 3: RLS
-- ============================================================================
alter table public.message_email_notifications enable row level security;

-- Only service_role can read/write (processed by API route with service-role key)
create policy "message_email_notifications_service_only" on public.message_email_notifications
  for all to service_role using (true) with check (true);

-- Users can see their own notification status (read-only)
create policy "message_email_notifications_read_own" on public.message_email_notifications for select to authenticated
  using (recipient_profile_id in (select id from public.profiles where owner_id = (select auth.uid())));

-- ============================================================================
-- SECTION 4: Trigger — queue notification on new message
-- ============================================================================
create or replace function public.queue_message_email_notification()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  recipient_profile_id uuid;
begin
  -- For each participant in the conversation OTHER than the sender, queue a notification
  for recipient_profile_id in
    select cp.profile_id
    from public.conversation_participants cp
    where cp.conversation_id = new.conversation_id
      and cp.profile_id != new.sender_profile_id
  loop
    insert into public.message_email_notifications (
      message_id,
      conversation_id,
      recipient_profile_id,
      sender_profile_id
    ) values (
      new.id,
      new.conversation_id,
      recipient_profile_id,
      new.sender_profile_id
    )
    on conflict (message_id, recipient_profile_id) do nothing;
  end loop;

  return new;
end;
$$;

drop trigger if exists trigger_queue_message_email on public.messages;
create trigger trigger_queue_message_email
  after insert on public.messages
  for each row
  execute function public.queue_message_email_notification();

-- ============================================================================
-- SECTION 5: Helper function — get recipient email for a profile
-- ============================================================================
-- profile_owner_email already exists (021_n8n_webhook_triggers_v2.sql)
-- It returns the auth.users.email for a given profile id.

-- ============================================================================
-- SECTION 6: Comments
-- ============================================================================
comment on table public.message_email_notifications is
  'Phase 3.5 — queues email notifications for offline message recipients. Processed by API route /api/cron/message-notifications.';
