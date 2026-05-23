-- New listing digest email system
-- Sends "New listings in your county" emails to members inactive for 3+ days.
--
-- Depends on: 003_profile_tables.sql, 011_listings.sql

-- ============================================================================
-- SECTION 1: new_listing_digest_sends tracking table
-- ============================================================================
create table public.new_listing_digest_sends (
  id              uuid primary key default gen_random_uuid(),
  profile_id      uuid not null references public.profiles(id) on delete cascade,
  sent_at         timestamptz not null default now(),
  listings_count  int not null default 0,
  opened_at       timestamptz,
  clicked_at      timestamptz
);

-- Index for deduplication: one digest per profile per 3 days
create unique index new_listing_digest_sends_profile_3d_idx
  on public.new_listing_digest_sends(profile_id, (floor(extract(epoch from sent_at) / 259200)));

-- Index for admin stats
create index new_listing_digest_sends_sent_at_idx on public.new_listing_digest_sends(sent_at desc);

-- RLS: service_role only (cron route)
alter table public.new_listing_digest_sends enable row level security;
create policy "new_listing_digest_sends_service_only" on public.new_listing_digest_sends
  for all to service_role using (true) with check (true);

-- ============================================================================
-- SECTION 2: Helper function — get new listing digest listings for a profile
-- ============================================================================
create or replace function public.get_new_listing_digest_listings(p_profile_id uuid)
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
    and l.county_id = (select county_id from public.profiles where id = p_profile_id)
  order by l.created_at desc
  limit 3;
$$;

revoke execute on function public.get_new_listing_digest_listings(uuid) from public;
revoke execute on function public.get_new_listing_digest_listings(uuid) from anon;
revoke execute on function public.get_new_listing_digest_listings(uuid) from authenticated;
grant execute on function public.get_new_listing_digest_listings(uuid) to service_role;

comment on function public.get_new_listing_digest_listings(uuid) is
  'Returns up to 3 new listings from the last 7 days in the user''s county. SECURITY DEFINER, service_role only.';

-- ============================================================================
-- SECTION 3: Comments
-- ============================================================================
comment on table public.new_listing_digest_sends is
  'Tracks sent new listing digests per profile per 3-day window. Prevents duplicate sends via unique index.';
