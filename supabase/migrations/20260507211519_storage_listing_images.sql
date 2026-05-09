-- Phase 1 — Supabase Storage bucket for listing images
-- Depends on: 011_listings.sql

-- ============================================================================
-- SECTION 1: Create listing-images bucket
-- ============================================================================
insert into storage.buckets (id, name, public)
values ('listing-images', 'listing-images', true)
on conflict (id) do nothing;

-- ============================================================================
-- SECTION 2: RLS policies for listing-images bucket
-- ============================================================================

-- Drop existing policies to avoid duplicates on re-run
DROP POLICY IF EXISTS "Users can upload own listing images" ON storage.objects;
DROP POLICY IF EXISTS "Anyone can read listing images" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete own listing images" ON storage.objects;

-- Policy: Authenticated users can upload to their own folder
CREATE POLICY "Users can upload own listing images"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'listing-images'
    AND (storage.foldername(name))[1] = (select auth.uid()::text)
  );

-- Policy: Authenticated + anon can read all listing images (listings are public)
CREATE POLICY "Anyone can read listing images"
  ON storage.objects FOR SELECT TO authenticated, anon
  USING (bucket_id = 'listing-images');

-- Policy: Owners can delete their own images
CREATE POLICY "Users can delete own listing images"
  ON storage.objects FOR DELETE TO authenticated
  USING (
    bucket_id = 'listing-images'
    AND (storage.foldername(name))[1] = (select auth.uid()::text)
  );

comment on table public.listings is
  'Phase 1 — marketplace listings. Images stored in listing-images Storage bucket.';
