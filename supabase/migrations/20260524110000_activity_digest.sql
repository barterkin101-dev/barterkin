-- Activity digest email system
-- Sends a personalized weekly activity digest to active members.
-- Includes: new messages, profile views, listing saves, new members in county.
--
-- Depends on: profiles, messages, conversation_participants, profile_views,
--             saved_listings, listings, counties

-- ============================================================================
-- SECTION 1: activity_digest_sends tracking table
-- ============================================================================
create table public.activity_digest_sends (
  id              uuid primary key default gen_random_uuid(),
  profile_id      uuid not null references public.profiles(id) on delete cascade,
  sent_at         timestamptz not null default now(),
  messages_count  int not null default 0,
  profile_views   int not null default 0,
  listing_saves   int not null default 0,
  new_members     int not null default 0,
  opened_at       timestamptz,
  clicked_at      timestamptz
);

-- Index for deduplication: one digest per profile per week
create unique index activity_digest_sends_profile_week_idx
  on public.activity_digest_sends(profile_id, date_trunc('week', sent_at));

-- Index for admin stats
create index activity_digest_sends_sent_at_idx on public.activity_digest_sends(sent_at desc);

-- RLS: service_role only (cron route)
alter table public.activity_digest_sends enable row level security;
create policy "activity_digest_sends_service_only" on public.activity_digest_sends
  for all to service_role using (true) with check (true);

-- ============================================================================
-- SECTION 2: Helper function — get activity digest data for a profile
-- ============================================================================
create or replace function public.get_activity_digest_data(p_profile_id uuid)
returns table (
  messages_count bigint,
  profile_views bigint,
  listing_saves bigint,
  new_members bigint
)
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  with
    -- New messages received in the last 7 days
    msg_count as (
      select count(*) as c
      from public.messages m
      join public.conversation_participants cp
        on cp.conversation_id = m.conversation_id
        and cp.profile_id = p_profile_id
      where m.sender_profile_id != p_profile_id
        and m.created_at > now() - interval '7 days'
    ),
    -- Profile views in the last 7 days
    view_count as (
      select count(*) as c
      from public.profile_views
      where viewed_profile_id = p_profile_id
        and created_at > now() - interval '7 days'
    ),
    -- Listing saves in the last 7 days (this user's listings were saved)
    save_count as (
      select count(*) as c
      from public.saved_listings sl
      join public.listings l on l.id = sl.listing_id
      where l.profile_id = p_profile_id
        and sl.created_at > now() - interval '7 days'
    ),
    -- New published members in the same county in the last 7 days
    member_count as (
      select count(*) as c
      from public.profiles p2
      where p2.county_id = (select county_id from public.profiles where id = p_profile_id)
        and p2.is_published = true
        and p2.banned = false
        and p2.id != p_profile_id
        and p2.created_at > now() - interval '7 days'
    )
  select
    msg_count.c,
    view_count.c,
    save_count.c,
    member_count.c
  from msg_count, view_count, save_count, member_count;
$$;

revoke execute on function public.get_activity_digest_data(uuid) from public;
revoke execute on function public.get_activity_digest_data(uuid) from anon;
revoke execute on function public.get_activity_digest_data(uuid) from authenticated;
grant execute on function public.get_activity_digest_data(uuid) to service_role;

comment on function public.get_activity_digest_data(uuid) is
  'Returns activity stats for the weekly digest: new messages, profile views, listing saves, new county members. SECURITY DEFINER, service_role only.';

-- ============================================================================
-- SECTION 3: Comments
-- ============================================================================
comment on table public.activity_digest_sends is
  'Tracks sent activity digests per profile per week. Prevents duplicate sends via unique index.';
