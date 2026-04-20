-- Phase 3 — Profile & Georgia Gate: Storage RLS
-- Requirements: PROF-02 (avatar upload + path-scoped RLS)
-- Depends on: the `avatars` Storage bucket existing (public = true).
--   Created manually in Supabase Studio per RESEARCH Pitfall 3. Pushing this
--   migration before the bucket exists is safe — policies reference bucket_id
--   by string, not FK; they activate as soon as the bucket is created.
-- See: .planning/phases/03-profile-georgia-gate/03-RESEARCH.md §Pattern 7

----------------------------------------------------------------------
-- Drop existing avatar policies if re-running (idempotent)
----------------------------------------------------------------------
drop policy if exists "Users can upload their own avatar" on storage.objects;
drop policy if exists "Users can update their own avatar" on storage.objects;
drop policy if exists "Users can delete their own avatar" on storage.objects;
drop policy if exists "Avatar images are publicly readable" on storage.objects;

----------------------------------------------------------------------
-- INSERT: user can only upload to avatars/{their own uid}/...
-- Path shape enforced by client: `${userId}/avatar.jpg` inside the `avatars` bucket.
-- storage.foldername(name) returns path segments as an array; [1] is the first segment.
----------------------------------------------------------------------
create policy "Users can upload their own avatar"
  on storage.objects for insert to authenticated
  with check (
    bucket_id = 'avatars'
    AND (storage.foldername(name))[1] = (select auth.uid()::text)
  );

----------------------------------------------------------------------
-- UPDATE: same scope (upsert=true goes through UPDATE when object exists)
----------------------------------------------------------------------
create policy "Users can update their own avatar"
  on storage.objects for update to authenticated
  using (
    bucket_id = 'avatars'
    AND (storage.foldername(name))[1] = (select auth.uid()::text)
  )
  with check (
    bucket_id = 'avatars'
    AND (storage.foldername(name))[1] = (select auth.uid()::text)
  );

----------------------------------------------------------------------
-- DELETE: only own avatar
----------------------------------------------------------------------
create policy "Users can delete their own avatar"
  on storage.objects for delete to authenticated
  using (
    bucket_id = 'avatars'
    AND (storage.foldername(name))[1] = (select auth.uid()::text)
  );

----------------------------------------------------------------------
-- SELECT: public read so profile cards can render the avatar without signed URLs.
-- Bucket is marked public in Studio; this policy is explicit control for auditability.
----------------------------------------------------------------------
create policy "Avatar images are publicly readable"
  on storage.objects for select to public
  using (bucket_id = 'avatars');
