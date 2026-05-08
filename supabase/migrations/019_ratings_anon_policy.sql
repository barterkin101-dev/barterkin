-- Phase 1.5 — Ratings anon read policy
-- Fixes: unauthenticated visitors could not see ratings on public profile pages.
-- Depends on: 013_ratings.sql

-- SELECT: anon can read ratings for published, non-banned profiles
-- (mirrors listings_read_active_anon logic — no current_user_is_verified check
-- because anon users are inherently unverified; we just require the profile be public)
create policy "ratings_read_active_anon" on public.ratings for select to anon
  using (
    exists (
      select 1 from public.profiles p
      where p.id = ratings.ratee_profile_id
        and p.is_published = true
        and p.banned = false
    )
  );
