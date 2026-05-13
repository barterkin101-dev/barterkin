-- Credit-based listing boosts
-- Members spend 1 credit to feature a listing at the top of browse/search for 7 days.

-- Add boosted_until column to listings
alter table public.listings
  add column if not exists boosted_until timestamptz;

-- Index for fast "currently boosted" lookups
create index if not exists idx_listings_boosted_until
  on public.listings(boosted_until desc)
  where boosted_until is not null;

-- RLS: owners can update boosted_until on their own listings
-- (The existing "Owners can update own listings" policy already covers this
--  because boosted_until is just another column on the listings table.)

comment on column public.listings.boosted_until is
  'Timestamp when the listing boost expires. Set by the boostListing server action. NULL = not boosted.';
