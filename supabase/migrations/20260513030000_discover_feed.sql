-- Discover feed — algorithmic listing ranking for the dashboard
-- Surfaces listings based on: skills match, county proximity, recency, social signal.
--
-- Parameters:
--   p_viewer_profile_id  — the profile_id of the logged-in member
--   p_limit              — max rows to return (default 12)
--
-- Algorithm weights (tuneable):
--   skills_match    : ts_rank of listing vs user's skills (0..1)
--   county_boost    : +0.30 if listing.county_id = viewer.county_id
--   recency_boost   : ×2.0 if listing.created_at within 7 days
--   social_signal   : +0.10 per conversation on listing, capped at 0.50
--
-- Final score = (skills_match + county_boost + social_signal) * recency_boost
-- Ordered by score DESC, created_at DESC

create or replace function public.discover_listings(
  p_viewer_profile_id uuid,
  p_limit int default 12
)
returns table (
  id uuid,
  profile_id uuid,
  title text,
  description text,
  category_id int,
  county_id int,
  condition text,
  trade_terms text,
  status text,
  price_estimate text,
  created_at timestamptz,
  score real
)
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  with viewer as (
    select
      p.county_id as viewer_county_id,
      coalesce(
        to_tsvector('english',
          coalesce(string_agg(so.skill_text, ' '), '') || ' ' ||
          coalesce(string_agg(sw.skill_text, ' '), '')
        ),
        ''::tsvector
      ) as viewer_skills_vector
    from public.profiles p
    left join public.skills_offered so on so.profile_id = p.id
    left join public.skills_wanted sw on sw.profile_id = p.id
    where p.id = p_viewer_profile_id
    group by p.id, p.county_id
  ),
  social as (
    select
      c.listing_id,
      count(*)::real * 0.1 as signal
    from public.conversations c
    where c.listing_id is not null
    group by c.listing_id
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
    l.status,
    l.price_estimate,
    l.created_at,
    (
      (
        coalesce(ts_rank(l.search_vector, v.viewer_skills_vector, 1), 0.0) +
        case when l.county_id is not null and l.county_id = v.viewer_county_id then 0.30 else 0.0 end +
        least(coalesce(s.signal, 0.0), 0.50)
      )
      *
      case when l.created_at > now() - interval '7 days' then 2.0 else 1.0 end
    )::real as score
  from public.listings l
  cross join viewer v
  left join social s on s.listing_id = l.id
  where l.status = 'active'
    and l.profile_id != p_viewer_profile_id
    and exists (
      select 1 from public.profiles p
      where p.id = l.profile_id
        and p.is_published = true
        and p.banned = false
    )
  order by score desc, l.created_at desc
  limit p_limit;
$$;

revoke execute on function public.discover_listings(uuid, int) from public;
revoke execute on function public.discover_listings(uuid, int) from anon;
grant execute on function public.discover_listings(uuid, int) to authenticated;
grant execute on function public.discover_listings(uuid, int) to service_role;

comment on function public.discover_listings(uuid, int) is
  'Algorithmic feed: ranks active listings by skills match, county proximity, recency (7d 2x), and conversation count. Excludes own listings.';
