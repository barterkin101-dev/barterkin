-- In-app notifications table for persistent notification storage
-- Supports derived notifications (messages, trades) + explicit notifications (listing saves, reviews, referrals)

create table if not exists public.in_app_notifications (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references public.profiles(id) on delete cascade,
  type text not null check (type in ('message','listing_save','trade_completion','review','referral','system')),
  title text not null,
  body text not null,
  link_url text,
  is_read boolean not null default false,
  created_at timestamptz not null default now(),
  read_at timestamptz
);

-- Index for fast "recent notifications for member" lookups
create index if not exists idx_in_app_notifications_profile_created
  on public.in_app_notifications(profile_id, created_at desc);

-- Index for unread count
create index if not exists idx_in_app_notifications_unread
  on public.in_app_notifications(profile_id, is_read)
  where is_read = false;

-- RLS: members can only read/update their own notifications; no direct inserts from clients (use service role or triggers)
alter table public.in_app_notifications enable row level security;

create policy "Members can read own notifications"
  on public.in_app_notifications for select to authenticated
  using (profile_id = (select id from public.profiles where owner_id = auth.uid()));

create policy "Members can update own notifications"
  on public.in_app_notifications for update to authenticated
  using (profile_id = (select id from public.profiles where owner_id = auth.uid()));

comment on table public.in_app_notifications is
  'Persistent in-app notifications for members. Populated by triggers, cron jobs, or server actions.';
