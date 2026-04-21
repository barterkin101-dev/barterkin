-- Phase 6 — Landing public reads
-- Requirements: LAND-02 (founding strip + county coverage data source)
-- See: .planning/phases/06-landing-page-pwa-polish/06-RESEARCH.md Pitfall 1
-- Depends on: 003_profile_tables.sql (tables + authenticated policies already exist)
-- Security: V4 Access Control + V8 Data Protection — anon policies grant SELECT only;
--           UI layer MUST use explicit column lists (never .select('*')) to prevent leaks.

-- counties: public reference table, safe to expose fully
create policy "Counties readable by anon for landing"
  on public.counties for select to anon
  using (true);

-- categories: public reference table, safe to expose fully
create policy "Categories readable by anon for landing"
  on public.categories for select to anon
  using (true);

-- profiles: anon may read ONLY published + not-banned profiles.
-- Note: the Postgres policy does not restrict columns — that MUST be enforced
-- at the query layer via explicit .select('id, username, display_name, ...')
-- column lists in lib/data/landing.ts (never .select('*')).
create policy "Public landing reads published non-banned profiles"
  on public.profiles for select to anon
  using (is_published = true AND banned = false);

-- skills_offered: anon may read skills only when the parent profile is publicly visible
create policy "Public landing reads skills of public profiles"
  on public.skills_offered for select to anon
  using (
    exists (
      select 1 from public.profiles p
      where p.id = skills_offered.profile_id
        and p.is_published = true
        and p.banned = false
    )
  );
