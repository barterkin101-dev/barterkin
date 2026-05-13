-- Weekly digest email system
-- Sends "New listings in your county" re-engagement emails to active members.
--
-- Depends on: 003_profile_tables.sql, 011_listings.sql

-- ============================================================================
-- SECTION 1: email_digests tracking table
-- ============================================================================
create table public.email_digests (
  id              uuid primary key default gen_random_uuid(),
  profile_id      uuid not null references public.profiles(id) on delete cascade,
  digest_type     text not null default 'weekly_listings' check (digest_type in ('weekly_listings')),
  sent_at         timestamptz not null default now(),
  listings_count  int not null default 0,
  opened_at       timestamptz,
  clicked_at      timestamptz
);

-- Index for deduplication: one digest per profile per week
create unique index email_digests_profile_week_idx
  on public.email_digests(profile_id, digest_type, date_trunc('week', sent_at));

-- Index for admin stats
create index email_digests_sent_at_idx on public.email_digests(sent_at desc);

-- RLS: service_role only (cron route)
alter table public.email_digests enable row level security;
create policy "email_digests_service_only" on public.email_digests
  for all to service_role using (true) with check (true);

-- ============================================================================
-- SECTION 2: profiles.email_digest_enabled opt-out
-- ============================================================================
alter table public.profiles
  add column if not exists email_digest_enabled boolean not null default true;

create index profiles_digest_enabled_idx on public.profiles(email_digest_enabled)
  where email_digest_enabled = true;

-- ============================================================================
-- SECTION 3: Helper function — get weekly digest listings for a profile
-- ============================================================================
create or replace function public.get_weekly_digest_listings(p_profile_id uuid)
returns table (
  id uuid,
  profile_id uuid,
  title text,
  description text,
  category_id int,
  county_id int,
  condition text,
  trade_terms text,
  price_estimate text,
  created_at timestamptz,
  seller_display_name text,
  seller_username text,
  seller_avatar_url text,
  category_name text,
  county_name text
)
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select
    l.id,
    l.profile_id,
    l.title,
    l.description,
    l.category_id,
    l.county_id,
    l.condition,
    l.trade_terms,
    l.price_estimate,
    l.created_at,
    p.display_name as seller_display_name,
    p.username as seller_username,
    p.avatar_url as seller_avatar_url,
    c.name as category_name,
    co.name as county_name
  from public.listings l
  join public.profiles p on p.id = l.profile_id
  left join public.categories c on c.id = l.category_id
  left join public.counties co on co.id = l.county_id
  where l.status = 'active'
    and l.created_at > now() - interval '7 days'
    and l.profile_id != p_profile_id
    and p.is_published = true
    and p.banned = false
    -- Match user's county if they have one set; otherwise show all recent
    and (
      (select county_id from public.profiles where id = p_profile_id) is null
      or l.county_id = (select county_id from public.profiles where id = p_profile_id)
    )
  order by l.created_at desc
  limit 10;
$$;

revoke execute on function public.get_weekly_digest_listings(uuid) from public;
revoke execute on function public.get_weekly_digest_listings(uuid) from anon;
revoke execute on function public.get_weekly_digest_listings(uuid) from authenticated;
grant execute on function public.get_weekly_digest_listings(uuid) to service_role;

comment on function public.get_weekly_digest_listings(uuid) is
  'Returns up to 10 new listings from the last 7 days in the user\'s county (or all counties if none set). SECURITY DEFINER, service_role only.';

-- ============================================================================
-- SECTION 4: Comments
-- ============================================================================
comment on table public.email_digests is
  'Tracks sent email digests per profile per week. Prevents duplicate sends via unique index.';
