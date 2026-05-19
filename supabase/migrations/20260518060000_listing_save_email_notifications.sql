-- Listing save email notifications
-- Queues email notifications when a member saves someone's listing.
-- Deduplication: one notification per listing per day per saver.
-- Processed by API route /api/cron/listing-save-notifications.

-- ============================================================================
-- SECTION 1: Notification queue table
-- ============================================================================
create table if not exists public.listing_save_email_notifications (
  id              uuid primary key default gen_random_uuid(),
  saved_listing_id uuid not null references public.saved_listings(id) on delete cascade,
  listing_id      uuid not null references public.listings(id) on delete cascade,
  saver_profile_id uuid not null references public.profiles(id) on delete cascade,
  seller_profile_id uuid not null references public.profiles(id) on delete cascade,
  status          text not null default 'pending' check (status in ('pending', 'sent', 'failed')),
  error_message   text,
  sent_at         timestamptz,
  created_at      timestamptz not null default now()
);

-- ============================================================================
-- SECTION 2: Indexes for efficient queue processing
-- ============================================================================
create index listing_save_email_notifications_pending_idx
  on public.listing_save_email_notifications(status, created_at)
  where status = 'pending';

create index listing_save_email_notifications_seller_idx
  on public.listing_save_email_notifications(seller_profile_id, created_at desc);

-- Deduplication: prevent duplicate notifications for the same listing on the same day
-- (one notification per listing per day, regardless of how many times it's saved)
create unique index listing_save_email_notifications_daily_listing_idx
  on public.listing_save_email_notifications(listing_id, date_trunc('day', created_at))
  where status = 'pending';

-- ============================================================================
-- SECTION 3: RLS
-- ============================================================================
alter table public.listing_save_email_notifications enable row level security;

-- Only service_role can read/write (processed by API route with service-role key)
create policy "listing_save_email_notifications_service_only"
  on public.listing_save_email_notifications
  for all to service_role using (true) with check (true);

-- Users can see their own notification status (read-only)
create policy "listing_save_email_notifications_read_own"
  on public.listing_save_email_notifications
  for select to authenticated
  using (seller_profile_id in (select id from public.profiles where owner_id = auth.uid()));

-- ============================================================================
-- SECTION 4: Trigger — queue notification on new save
-- ============================================================================
create or replace function public.queue_listing_save_email_notification()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  _listing_id uuid;
  _seller_profile_id uuid;
begin
  -- Get the listing_id and seller profile_id from the listing
  select l.id, l.profile_id into _listing_id, _seller_profile_id
  from public.listings l
  where l.id = new.listing_id;

  -- Skip if listing no longer exists (race condition with delete)
  if _listing_id is null or _seller_profile_id is null then
    return new;
  end if;

  -- Don't notify if someone saves their own listing
  if new.user_id = _seller_profile_id then
    return new;
  end if;

  -- Insert notification (unique constraint handles dedup per day)
  insert into public.listing_save_email_notifications (
    saved_listing_id,
    listing_id,
    saver_profile_id,
    seller_profile_id
  ) values (
    new.id,
    _listing_id,
    new.user_id,
    _seller_profile_id
  )
  on conflict (listing_id, date_trunc('day', created_at))
  where status = 'pending'
  do nothing;

  return new;
end;
$$;

-- Attach trigger
create trigger queue_listing_save_email_notification_trigger
  after insert on public.saved_listings
  for each row
  execute function public.queue_listing_save_email_notification();

-- ============================================================================
-- SECTION 5: Comments
-- ============================================================================
comment on table public.listing_save_email_notifications is
  'Queues email notifications for listing saves. Processed by API route /api/cron/listing-save-notifications.';
