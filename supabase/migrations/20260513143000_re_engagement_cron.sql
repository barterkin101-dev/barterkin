-- Dormant member re-engagement email system
-- Sends "we miss you" emails to members inactive for 14+ days.
--
-- Depends on: 003_profile_tables.sql, 011_listings.sql, 20260513110000_weekly_digest.sql

create table public.re_engagement_sends (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references public.profiles(id) on delete cascade,
  sent_at timestamptz not null default now(),
  listings_count int not null default 0,
  opened_at timestamptz,
  clicked_at timestamptz
);

create unique index re_engagement_sends_profile_7d_idx
  on public.re_engagement_sends(profile_id, (floor(extract(epoch from sent_at) / 604800)));

create index re_engagement_sends_sent_at_idx
  on public.re_engagement_sends(sent_at desc);

alter table public.re_engagement_sends enable row level security;
create policy "re_engagement_sends_service_only" on public.re_engagement_sends
  for all to service_role using (true) with check (true);

create or replace function public.get_re_engagement_listings(p_profile_id uuid)
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
  with recipient as (
    select id, county_id, last_login_at
    from public.profiles
    where id = p_profile_id
  )
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
  cross join recipient r
  where l.status = 'active'
    and l.created_at > coalesce(r.last_login_at, now() - interval '14 days')
    and l.profile_id != p_profile_id
    and p.is_published = true
    and p.banned = false
    and (
      r.county_id is null
      or l.county_id = r.county_id
    )
  order by l.created_at desc
  limit 10;
$$;

revoke execute on function public.get_re_engagement_listings(uuid) from public;
revoke execute on function public.get_re_engagement_listings(uuid) from anon;
revoke execute on function public.get_re_engagement_listings(uuid) from authenticated;
grant execute on function public.get_re_engagement_listings(uuid) to service_role;

comment on table public.re_engagement_sends is
  'Tracks dormant-member re-engagement emails. Prevents duplicate sends within a rolling 7-day bucket.';

comment on function public.get_re_engagement_listings(uuid) is
  'Returns up to 10 active listings created after the recipient''s last login, county-matched when possible. SECURITY DEFINER, service_role only.';
