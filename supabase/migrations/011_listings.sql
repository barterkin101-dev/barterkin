-- Phase 1 — Listings + Enhanced Bio
-- Requirements: LIST-01..LIST-12
-- Depends on: 003_profile_tables.sql (profiles, categories, counties)

-- ============================================================================
-- SECTION 1: listings table
-- ============================================================================
create table public.listings (
  id            uuid primary key default gen_random_uuid(),
  profile_id    uuid not null references public.profiles(id) on delete cascade,
  title         text not null check (char_length(title) between 5 and 120),
  description   text not null check (char_length(description) between 20 and 2000),
  category_id   int references public.categories(id),
  county_id     int references public.counties(id),
  condition     text check (condition in ('new','like-new','good','fair','for-parts')),
  trade_terms   text check (trade_terms is null or char_length(trade_terms) <= 200),
  status        text not null default 'active' check (status in ('active','paused','completed','cancelled')),
  price_estimate text,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

alter table public.listings enable row level security;

-- SELECT: owner sees own; others see active + published profile + not banned + no blocks
-- Mirrors directory visibility from 005_contact_relay_trust.sql

create policy "listings_read_own" on public.listings for select to authenticated
  using (profile_id in (select id from public.profiles where owner_id = (select auth.uid())));

create policy "listings_read_active_public" on public.listings for select to authenticated
  using (
    status = 'active'
    and exists (
      select 1 from public.profiles p
      where p.id = listings.profile_id
        and p.is_published = true
        and p.banned = false
        and public.current_user_is_verified()
        and not exists (
          select 1 from public.blocks b
          where (b.blocker_id = (select auth.uid()) and b.blocked_id = p.owner_id)
             or (b.blocker_id = p.owner_id and b.blocked_id = (select auth.uid()))
        )
    )
  );

-- INSERT: owner only, verified users
create policy "listings_insert_own" on public.listings for insert to authenticated
  with check (
    profile_id in (select id from public.profiles where owner_id = (select auth.uid()))
    and public.current_user_is_verified()
  );

-- UPDATE: owner only, cannot change profile_id
create policy "listings_update_own" on public.listings for update to authenticated
  using (profile_id in (select id from public.profiles where owner_id = (select auth.uid())))
  with check (
    profile_id in (select id from public.profiles where owner_id = (select auth.uid()))
  );

-- DELETE: owner only
create policy "listings_delete_own" on public.listings for delete to authenticated
  using (profile_id in (select id from public.profiles where owner_id = (select auth.uid())));

-- Indexes
create index listings_profile_idx on public.listings(profile_id, created_at desc);
create index listings_status_category_idx on public.listings(status, category_id) where status = 'active';
create index listings_status_county_idx on public.listings(status, county_id) where status = 'active';
create index listings_created_idx on public.listings(created_at desc);

-- updated_at trigger (reuse existing set_updated_at function from 003_profile_tables.sql)
create trigger listings_updated_at
  before update on public.listings
  for each row execute function public.set_updated_at();

-- ============================================================================
-- SECTION 2: listing_images table
-- ============================================================================
create table public.listing_images (
  id          uuid primary key default gen_random_uuid(),
  listing_id  uuid not null references public.listings(id) on delete cascade,
  url         text not null,
  sort_order  int not null default 0,
  created_at  timestamptz not null default now()
);

alter table public.listing_images enable row level security;

-- SELECT: visible where parent listing is visible
create policy "listing_images_read_visible" on public.listing_images for select to authenticated
  using (
    exists (
      select 1 from public.listings l
      where l.id = listing_images.listing_id
        and (
          l.profile_id in (select id from public.profiles where owner_id = (select auth.uid()))
          or (
            l.status = 'active'
            and exists (
              select 1 from public.profiles p
              where p.id = l.profile_id
                and p.is_published = true
                and p.banned = false
                and public.current_user_is_verified()
                and not exists (
                  select 1 from public.blocks b
                  where (b.blocker_id = (select auth.uid()) and b.blocked_id = p.owner_id)
                     or (b.blocker_id = p.owner_id and b.blocked_id = (select auth.uid()))
                )
            )
          )
        )
    )
  );

-- INSERT/UPDATE/DELETE: owner only (via parent listing)
create policy "listing_images_insert_own" on public.listing_images for insert to authenticated
  with check (
    exists (
      select 1 from public.listings l
      where l.id = listing_images.listing_id
        and l.profile_id in (select id from public.profiles where owner_id = (select auth.uid()))
    )
  );

create policy "listing_images_update_own" on public.listing_images for update to authenticated
  using (
    exists (
      select 1 from public.listings l
      where l.id = listing_images.listing_id
        and l.profile_id in (select id from public.profiles where owner_id = (select auth.uid()))
    )
  )
  with check (
    exists (
      select 1 from public.listings l
      where l.id = listing_images.listing_id
        and l.profile_id in (select id from public.profiles where owner_id = (select auth.uid()))
    )
  );

create policy "listing_images_delete_own" on public.listing_images for delete to authenticated
  using (
    exists (
      select 1 from public.listings l
      where l.id = listing_images.listing_id
        and l.profile_id in (select id from public.profiles where owner_id = (select auth.uid()))
    )
  );

create index listing_images_listing_idx on public.listing_images(listing_id, sort_order);
