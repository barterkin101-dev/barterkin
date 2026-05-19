-- Saved searches + listing alerts
-- Members can save directory search filters and receive email alerts when new listings match.

-- ============================================================================
-- saved_searches
-- ============================================================================
create table if not exists public.saved_searches (
  id              uuid primary key default gen_random_uuid(),
  profile_id      uuid not null references public.profiles(id) on delete cascade,
  query           text,                       -- free-text search term
  category_id     integer references public.categories(id) on delete set null,
  county_id       integer references public.counties(id) on delete set null,
  email_alert_enabled boolean not null default true,
  last_alert_sent_at  timestamptz,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

-- One saved search per unique filter combo per profile
create unique index if not exists idx_saved_searches_unique_filters
  on public.saved_searches (profile_id, coalesce(query, ''), coalesce(category_id, 0), coalesce(county_id, 0));

create index if not exists idx_saved_searches_profile_id
  on public.saved_searches (profile_id);

create index if not exists idx_saved_searches_alert_enabled
  on public.saved_searches (email_alert_enabled)
  where email_alert_enabled = true;

comment on table public.saved_searches is
  'Member-saved directory search filters with optional email alerts for new matching listings.';

-- ============================================================================
-- listing_alerts (sent alert tracking — deduplicates per search per day)
-- ============================================================================
create table if not exists public.listing_alerts (
  id              uuid primary key default gen_random_uuid(),
  saved_search_id uuid not null references public.saved_searches(id) on delete cascade,
  profile_id      uuid not null references public.profiles(id) on delete cascade,
  listings_count  integer not null default 0,
  sent_at         timestamptz not null default now()
);

create unique index if not exists idx_listing_alerts_unique_daily
  on public.listing_alerts (saved_search_id, date_trunc('day', sent_at));

create index if not exists idx_listing_alerts_profile_id
  on public.listing_alerts (profile_id);

comment on table public.listing_alerts is
  'Tracks which saved-search alerts have been sent, deduplicated per search per calendar day.';

-- ============================================================================
-- RLS
-- ============================================================================
alter table public.saved_searches enable row level security;
alter table public.listing_alerts enable row level security;

create policy "Members manage own saved searches"
  on public.saved_searches
  for all
  to authenticated
  using (profile_id in (select id from public.profiles where owner_id = auth.uid()))
  with check (profile_id in (select id from public.profiles where owner_id = auth.uid()));

create policy "Members read own listing alerts"
  on public.listing_alerts
  for select
  to authenticated
  using (profile_id in (select id from public.profiles where owner_id = auth.uid()));

-- Service role can manage all rows (for cron jobs)
create policy "Service role manages saved searches"
  on public.saved_searches
  for all
  to service_role
  using (true)
  with check (true);

create policy "Service role manages listing alerts"
  on public.listing_alerts
  for all
  to service_role
  using (true)
  with check (true);

-- ============================================================================
-- Updated-at trigger
-- ============================================================================
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger saved_searches_updated_at
  before update on public.saved_searches
  for each row
  execute function public.set_updated_at();
