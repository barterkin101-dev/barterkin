-- Premium listing featuring
-- Adds a paid 7-day featured placement separate from 1-credit boosts.

alter table public.listings
  add column if not exists featured_until timestamptz;

create index if not exists listings_featured_until_idx
  on public.listings(featured_until desc);

create or replace function public.search_listings(
  p_query text,
  p_category_id int default null,
  p_county_id int default null,
  p_condition text default null,
  p_page int default 1,
  p_page_size int default 20
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
  boosted_until timestamptz,
  featured_until timestamptz,
  rank real
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
    l.status,
    l.price_estimate,
    l.created_at,
    l.boosted_until,
    l.featured_until,
    ts_rank(l.search_vector, websearch_to_tsquery('english', p_query)) as rank
  from public.listings l
  where l.status = 'active'
    and (
      p_query is null
      or p_query = ''
      or l.search_vector @@ websearch_to_tsquery('english', p_query)
    )
    and (p_category_id is null or l.category_id = p_category_id)
    and (p_county_id is null or l.county_id = p_county_id)
    and (p_condition is null or l.condition = p_condition)
    and exists (
      select 1 from public.profiles p
      where p.id = l.profile_id
        and p.is_published = true
        and p.banned = false
    )
  order by
    l.featured_until desc nulls last,
    l.boosted_until desc nulls last,
    case when p_query is not null and p_query <> '' then ts_rank(l.search_vector, websearch_to_tsquery('english', p_query)) end desc nulls last,
    l.created_at desc
  limit p_page_size
  offset (p_page - 1) * p_page_size;
$$;

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
  featured_until timestamptz,
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
    l.featured_until,
    (
      (
        coalesce(ts_rank(l.search_vector, v.viewer_skills_vector, 1), 0.0) +
        case when l.county_id is not null and l.county_id = v.viewer_county_id then 0.30 else 0.0 end +
        least(coalesce(s.signal, 0.0), 0.50) +
        case when l.featured_until is not null and l.featured_until > now() then 0.35 else 0.0 end
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
  order by
    score desc,
    l.featured_until desc nulls last,
    l.created_at desc
  limit p_limit;
$$;
