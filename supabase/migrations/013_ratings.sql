-- Phase 2 — Ratings + Trust Ranking
-- Depends on: 011_listings.sql, 003_profile_tables.sql

-- ============================================================================
-- SECTION 1: ratings table
-- ============================================================================
create table public.ratings (
  id                uuid primary key default gen_random_uuid(),
  rater_profile_id  uuid not null references public.profiles(id) on delete cascade,
  ratee_profile_id  uuid not null references public.profiles(id) on delete cascade,
  listing_id        uuid references public.listings(id) on delete set null,
  conversation_id   uuid,  -- FK added in Phase 3 when conversations exist
  score             int not null check (score between 1 and 5),
  review_text       text check (review_text is null or char_length(review_text) <= 500),
  created_at        timestamptz not null default now(),
  constraint ratings_no_self check (rater_profile_id <> ratee_profile_id),
  constraint ratings_one_per_listing unique (rater_profile_id, ratee_profile_id, listing_id)
);

alter table public.ratings enable row level security;

-- SELECT: visible where ratee profile is visible
create policy "ratings_read_visible" on public.ratings for select to authenticated
  using (
    exists (
      select 1 from public.profiles p
      where p.id = ratings.ratee_profile_id
        and (
          p.owner_id = (select auth.uid())
          or (p.is_published = true and public.current_user_is_verified() and p.banned = false)
        )
    )
  );

-- INSERT: rater only, verified, must have interacted (enforced by application layer/trigger)
create policy "ratings_insert_own" on public.ratings for insert to authenticated
  with check (
    rater_profile_id in (select id from public.profiles where owner_id = (select auth.uid()))
    and public.current_user_is_verified()
  );

-- No UPDATE/DELETE — immutable audit trail

-- Indexes
create index ratings_ratee_idx on public.ratings(ratee_profile_id, created_at desc);
create index ratings_rater_idx on public.ratings(rater_profile_id, created_at desc);
create index ratings_listing_idx on public.ratings(listing_id) where listing_id is not null;

-- ============================================================================
-- SECTION 2: profiles rating columns
-- ============================================================================
alter table public.profiles add column rating_avg   numeric(2,1) default null;
alter table public.profiles add column rating_count int not null default 0;

-- ============================================================================
-- SECTION 3: trigger to refresh profile aggregates
-- ============================================================================
create or replace function public.refresh_profile_rating()
returns trigger language plpgsql
security definer set search_path = public, pg_temp
as $$
declare
  target_id uuid;
begin
  target_id := coalesce(new.ratee_profile_id, old.ratee_profile_id);
  
  update public.profiles
  set rating_count = (
    select count(*) from public.ratings where ratee_profile_id = target_id
  ),
  rating_avg = (
    select round(avg(score)::numeric, 1) from public.ratings where ratee_profile_id = target_id
  )
  where id = target_id;
  
  return coalesce(new, old);
end;
$$;

create trigger ratings_refresh_profile
  after insert or update or delete on public.ratings
  for each row execute function public.refresh_profile_rating();
