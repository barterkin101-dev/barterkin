-- Phase 9 — Onboarding Wizard state column
-- Requirements: D-09 (NULL = in progress, timestamp = completed),
--               D-10 (middleware reads this column to decide redirect),
--               D-11 (Step 3 render sets timestamp via server action)
-- Depends on: 003_profile_tables.sql (profiles table + RLS policies)
-- Security: V4 Access Control — existing "Owners see own profile" SELECT and
--           "Owners update own profile" UPDATE policies already cover this column
--           (both policies use wildcard `using (owner_id = auth.uid())` with no column
--           allowlist). No new RLS policy required. Verified in 09-RESEARCH.md
--           Assumption Log §A3 and §A4 against 003_profile_tables.sql lines 290-322.

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS onboarding_completed_at timestamptz;

COMMENT ON COLUMN public.profiles.onboarding_completed_at IS
  'NULL = onboarding wizard not yet completed. Set to now() when user views Step 3 (D-11).';
