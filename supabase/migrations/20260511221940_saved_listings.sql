-- Saved listings / favorites table
-- Users can save listings they're interested in for quick access

create table if not exists public.saved_listings (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  listing_id uuid not null references public.listings(id) on delete cascade,
  created_at timestamp with time zone default now(),
  unique (user_id, listing_id)
);

-- Enable RLS
alter table public.saved_listings enable row level security;

-- Users can only see their own saved listings
create policy "Users can view own saved listings"
  on public.saved_listings
  for select
  to authenticated
  using (user_id = auth.uid());

-- Users can only insert their own saved listings
create policy "Users can save listings"
  on public.saved_listings
  for insert
  to authenticated
  with check (user_id = auth.uid());

-- Users can only delete their own saved listings
create policy "Users can unsave listings"
  on public.saved_listings
  for delete
  to authenticated
  using (user_id = auth.uid());

-- Index for fast lookup by user
create index if not exists idx_saved_listings_user_id
  on public.saved_listings(user_id);

-- Index for fast lookup by listing (for "I'm interested" counts)
create index if not exists idx_saved_listings_listing_id
  on public.saved_listings(listing_id);
