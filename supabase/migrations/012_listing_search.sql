-- Phase 1 — Listing Full-Text Search
-- Depends on: 011_listings.sql

-- ============================================================================
-- SECTION 1: Full-text search on listings
-- ============================================================================

-- Add generated search vector (same pattern as profiles in 003_profile_tables.sql)
alter table public.listings add column search_vector tsvector
  generated always as (
    to_tsvector('english',
      coalesce(title, '') || ' ' ||
      coalesce(description, '') || ' ' ||
      coalesce(trade_terms, '')
    )
  ) stored;

create index listings_search_vector_gin on public.listings using gin(search_vector);

-- ============================================================================
-- SECTION 2: Search helper function
-- ============================================================================
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
    case when p_query is not null and p_query <> '' then rank end desc nulls last,
    l.created_at desc
  limit p_page_size
  offset (p_page - 1) * p_page_size;
$$;

revoke execute on function public.search_listings(text, int, int, text, int, int) from public;
revoke execute on function public.search_listings(text, int, int, text, int, int) from anon;
grant execute on function public.search_listings(text, int, int, text, int, int) to authenticated;
grant execute on function public.search_listings(text, int, int, text, int, int) to service_role;

-- ============================================================================
-- SECTION 3: Count helper for pagination
-- ============================================================================
create or replace function public.search_listings_count(
  p_query text,
  p_category_id int default null,
  p_county_id int default null,
  p_condition text default null
)
returns bigint
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select count(*)
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
    );
$$;

revoke execute on function public.search_listings_count(text, int, int, text) from public;
revoke execute on function public.search_listings_count(text, int, int, text) from anon;
grant execute on function public.search_listings_count(text, int, int, text) to authenticated;
grant execute on function public.search_listings_count(text, int, int, text) to service_role;
