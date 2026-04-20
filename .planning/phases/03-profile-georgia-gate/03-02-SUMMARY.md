---
phase: 03-profile-georgia-gate
plan: "02"
subsystem: database
tags: [supabase, postgres, rls, migrations, storage, types]

# Dependency graph
requires:
  - phase: 02-authentication-legal
    provides: "public.current_user_is_verified() helper function, auth.users table, signup_attempts table"
provides:
  - "public.profiles table with RLS (4 policies: 2 SELECT, 1 INSERT, 1 UPDATE with completeness WITH CHECK)"
  - "public.skills_offered table with RLS (5 policies: select, insert, update, delete — cascades through profile visibility)"
  - "public.skills_wanted table with RLS (5 policies: same as skills_offered)"
  - "public.counties table (id = FIPS code 13001..13321, 159 rows seeded)"
  - "public.categories table (ids 1..10, 10 rows seeded matching lib/data/categories.ts)"
  - "storage.objects RLS for avatars bucket (4 policies: insert/update/delete path-scoped to uid, select public)"
  - "lib/database.types.ts regenerated — covers all new tables"
affects: [03-03, 03-04, 03-05, server-actions, profile-editor, avatar-upload, directory]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - rls-default-deny
    - publish-completeness-with-check
    - skills-visibility-cascade
    - storage-foldername-path-scoping
    - security-definer-search-path
    - natural-pk-for-ref-table

key-files:
  created:
    - supabase/migrations/003_profile_tables.sql
    - supabase/migrations/003_profile_storage.sql
    - scripts/seed-georgia-counties.mjs
  modified:
    - lib/database.types.ts

key-decisions:
  - "counties.id IS the FIPS code (revision iter-1 Blocker 1 fix) — no synthetic serial, no separate fips column; single integer space client JSON fips -> DB PK -> profile FK"
  - "D-07 username unique constraint enforced at DB level; D-08 slug locked after first save at application layer"
  - "Full public URL stored in avatar_url for MVP simplicity (RESEARCH Pitfall 3: bucket created manually in Studio — no SQL path for bucket creation)"
  - "Storage migration applied via --linked db query (not db push) because both 003_* files share the same migration version prefix and one was already tracked"
  - "Both 003 migrations applied directly via pnpm supabase db query --linked -f because db push cannot distinguish between two files with the same NNN prefix"

patterns-established:
  - "RLS default-deny: no policy = no access; every new table gets enable row level security immediately after create table"
  - "Publish-completeness WITH CHECK: DB enforces profile completeness on UPDATE — is_published=true blocked unless display_name + county_id + category_id + avatar_url + >=1 skills_offered row present"
  - "Skills visibility cascade: skills SELECT policy wraps exists() against profiles visibility — hides skills of hidden profiles"
  - "Storage foldername path-scoping: (storage.foldername(name))[1] = auth.uid()::text gates avatar writes to own folder"
  - "Natural PK for reference tables: counties.id = FIPS avoids a translation layer between client data and DB foreign keys"

requirements-completed:
  - PROF-01
  - PROF-02
  - PROF-03
  - PROF-04
  - PROF-05
  - PROF-06
  - PROF-07
  - PROF-08
  - PROF-09
  - PROF-10
  - PROF-11
  - PROF-12
  - PROF-13
  - PROF-14
  - GEO-01
  - GEO-02

# Metrics
duration: 45min
completed: "2026-04-20"
---

# Phase 3 Plan 02: Profile & Georgia Gate — Database Foundation Summary

**Postgres schema for 5 profile tables with RLS default-deny + publish-completeness WITH CHECK, 159 FIPS-keyed Georgia counties seeded, 4 path-scoped storage.objects policies for avatars bucket, and regenerated database.types.ts — all applied to production Supabase.**

## Performance

- **Duration:** ~45 min
- **Started:** 2026-04-20T09:00:00Z
- **Completed:** 2026-04-20T10:30:00Z
- **Tasks:** 3
- **Files modified:** 4

## Accomplishments
- Authored and applied `003_profile_tables.sql` — creates profiles, skills_offered, skills_wanted, counties (id = FIPS), categories with full RLS (13+ policies), tsvector GIN index for FTS, updated_at trigger, publish-completeness WITH CHECK, 159-county seed, 10-category seed
- Authored and applied `003_profile_storage.sql` — 4 path-scoped RLS policies on storage.objects for the avatars bucket (upload/update/delete scope to auth.uid() folder, public read for profile cards)
- Regenerated `lib/database.types.ts` — all new tables (profiles, skills_offered, skills_wanted, counties, categories) present; `pnpm typecheck` exits 0

## Task Commits

Each task was committed atomically:

1. **Task 1: Author 003_profile_tables.sql** - `9d9e036` (feat)
2. **Task 2: Author 003_profile_storage.sql** - `c8f8f8e` (feat)
3. **Task 3: Regenerate database.types.ts after push** - `4bd648d` (chore)

## Files Created/Modified
- `supabase/migrations/003_profile_tables.sql` — DDL for 5 tables, 13+ RLS policies, county+category seeds, FTS column, updated_at trigger
- `supabase/migrations/003_profile_storage.sql` — 4 RLS policies on storage.objects for avatars bucket (idempotent with drop-if-exists)
- `scripts/seed-georgia-counties.mjs` — Node helper that reads georgia-counties.json and emits INSERT SQL with id = FIPS (used once to generate the seed block)
- `lib/database.types.ts` — Regenerated Supabase types; now covers all Phase 3 tables

## Decisions Made
- **counties.id = FIPS** (revision iter-1 Blocker 1 fix): explicit int primary key seeded with FIPS values (13001..13321). Keeps a single integer space — client JSON `fips` -> DB PK `counties.id` -> profile FK `profiles.county_id`. CountyCombobox in Plan 04 passes `county.fips` directly with zero translation.
- **Storage migration applied via direct db query** (not `db push`): Both migrations share the `003_` version prefix and one was already tracked in `supabase_migrations.schema_migrations`. Using `--include-all` would have re-applied `002_auth_tables.sql` (which exists but was not CLI-tracked). Direct query approach is safe since `003_profile_storage.sql` is idempotent via `drop policy if exists`.
- **Full public URL in avatar_url**: MVP simplicity; avoids signed-URL complexity on free tier.
- **Username slug locked at application layer (D-08)**: DB has the unique constraint; subsequent saves skip the slug field update in the server action (Plan 03).

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Migration push required direct SQL execution (not db push)**
- **Found during:** Task 3 (push migrations and regenerate types)
- **Issue:** `supabase db push` detected both `003_profile_tables.sql` and `003_profile_storage.sql` share the `003` migration version; one was already applied and tracked. `--include-all` would re-apply `002_auth_tables.sql` (already in DB but not in migration log) causing `relation "signup_attempts" already exists` error.
- **Fix:** Queried applied migrations with `pnpm supabase db query --linked "SELECT version FROM supabase_migrations.schema_migrations"` — confirmed only one `003` was tracked. Confirmed profile tables did NOT exist yet (0 rows from pg_tables check). Applied both files via `pnpm supabase db query --linked -f <file>`. Storage migration is idempotent (drop-if-exists blocks).
- **Files modified:** None (remote DB state only)
- **Verification:** All verification queries pass: counties=159, categories=10, profile_policies=4, storage_avatar_policies=4 (confirmed via pg_policies — all 4 policies including "Avatar images are publicly readable")

---

**Total deviations:** 1 auto-fixed (Rule 3 - blocking issue with migration version naming conflict)
**Impact on plan:** No scope creep. Migrations are applied correctly; all success criteria met. Future migrations should use timestamp-based naming (`YYYYMMDDHHMMSS_slug.sql`) to avoid version prefix collisions.

## Issues Encountered
- Both `003_profile_tables.sql` and `003_profile_storage.sql` share the `003` migration version prefix. The Supabase CLI `db push` cannot handle two files with the same version prefix when one is already applied. Resolved by applying directly via Management API (`db query --linked`). Future migrations should use the timestamp naming format the CLI expects (`<timestamp>_name.sql`).
- The initial storage migration push (before this plan resumed) applied only 3/4 storage policies — the public read policy (`Avatar images are publicly readable`) was missing. Re-running `003_profile_storage.sql` (which has idempotent `drop policy if exists` blocks) fixed this. All 4 policies now confirmed present.

## Remote Verification Results

All queries executed via `pnpm supabase db query --linked`:

| Query | Expected | Actual |
|-------|----------|--------|
| `SELECT count(*) FROM public.counties` | 159 | 159 |
| `SELECT min(id), max(id) FROM public.counties` | 13001, 13321 | 13001, 13321 |
| `SELECT id FROM public.counties WHERE name='Appling County'` | 13001 | 13001 |
| `SELECT id FROM public.counties WHERE name='Worth County'` | 13321 | 13321 |
| `SELECT count(*) FROM public.categories` | 10 | 10 |
| `SELECT count(*) FROM pg_tables WHERE ... tablename IN ('profiles',...)` | 5 | 5 |
| `SELECT count(*) FROM pg_policies WHERE schemaname='public' AND tablename='profiles'` | 4 | 4 |
| `SELECT count(*) FROM pg_policies WHERE schemaname='storage' AND tablename='objects'` | 4 | 4 |

## Next Phase Readiness
- Plan 03-03 (server actions) can `INSERT INTO public.profiles (owner_id, ...) VALUES (auth.uid(), ...)` — RLS enforces email-verification gate automatically
- Plan 03-03's `setPublished` action can `UPDATE profiles SET is_published = true` — DB WITH CHECK blocks publish on incomplete profiles even if client bypasses JS validation
- Plan 03-04's avatar uploader can write to `avatars/${userId}/avatar.jpg` via browser Supabase client; writes to other users' folders return 403
- Plan 03-04's CountyCombobox passes `county.fips` directly as form `countyId` (FK target is FIPS value — no translation needed)
- Plan 03-05's `/m/[username]` query returns only (published + viewer-verified + not-banned) profiles via the two-policy SELECT pattern

## Known Stubs
None — no stub data flows to UI from this plan (this plan is database-only).

## Threat Flags
None new — all surfaces were accounted for in the plan's threat model.

---
*Phase: 03-profile-georgia-gate*
*Completed: 2026-04-20*
