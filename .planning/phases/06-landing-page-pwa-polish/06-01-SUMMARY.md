---
phase: 06-landing-page-pwa-polish
plan: 01
subsystem: database
tags: [rls, migration, playwright, e2e, anon, supabase, pwa]

# Dependency graph
requires:
  - phase: 03-profile-georgia-gate
    provides: "profiles, counties, categories, skills_offered tables with RLS to authenticated role"
  - phase: 05-contact-relay-trust
    provides: "skills_offered, contact_requests, blocks, reports tables"
provides:
  - "anon SELECT RLS policies on counties, categories, profiles, skills_offered (migration 008)"
  - "iphone-se Playwright project for 360px LAND-03 mobile testing"
  - "four landing E2E spec stubs (RED) for Wave 1+2: landing-smoke, landing-metadata, landing-founding-strip, landing-mobile"
  - "founding_member?: boolean param on seedPublishedProfile fixture"
  - "retired smoke.spec.ts (Phase-1 foundation card assertions)"
affects:
  - "06-02 (landing page components — depends on anon RLS to return rows)"
  - "06-03 (mobile testing — depends on iphone-se Playwright project)"
  - "06-04 (metadata/PWA polish — landing-metadata.spec.ts validates these)"

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "anon-scoped RLS policy via supabase db query --linked (used when CLI db push is blocked by duplicate file version prefixes)"
    - "iphone-se Playwright project: { name: 'iphone-se', use: { ...devices['iPhone SE'] } }"
    - "foundingMember: boolean opt in seedPublishedProfile for landing strip seeded tests"

key-files:
  created:
    - supabase/migrations/008_landing_public_reads.sql
    - tests/e2e/landing-smoke.spec.ts
    - tests/e2e/landing-metadata.spec.ts
    - tests/e2e/landing-founding-strip.spec.ts
    - tests/e2e/landing-mobile.spec.ts
  modified:
    - playwright.config.ts
    - tests/e2e/fixtures/directory-seed.ts
    - lib/database.types.ts
  deleted:
    - tests/e2e/smoke.spec.ts

key-decisions:
  - "Used supabase db query --linked -f <file> to apply migration SQL directly when supabase db push was blocked by duplicate 003_ file version prefix (003_profile_storage.sql + 003_profile_tables.sql share same version string, CLI conflict)"
  - "Manually inserted version '008' into supabase_migrations.schema_migrations after applying SQL so migration list shows 008 applied remotely"
  - "TypeScript types regenerated after migration via supabase gen types typescript --linked"
  - "smoke.spec.ts deleted (not retargeted) per plan spec — landing-smoke.spec.ts provides full replacement coverage"

patterns-established:
  - "Landing E2E stubs: hasEnv guard pattern for DB-seeded tests (founding strip uses inline test.skip(!hasEnv))"
  - "landing-mobile.spec.ts uses test.use({ ...devices['iPhone SE'] }) file-level device override pattern"

requirements-completed: [LAND-01, LAND-02, LAND-03, LAND-04, GEO-03]

# Metrics
duration: 7min
completed: 2026-04-21
---

# Phase 06 Plan 01: Landing Public Reads — Wave 0 Scaffolding Summary

**Anon RLS policies on 4 tables (migration 008), iphone-se Playwright project, and 4 failing E2E spec stubs tied to UI-SPEC copywriting contract — unblocking all Wave 1/2 landing-page plans**

## Performance

- **Duration:** 7 min
- **Started:** 2026-04-21T18:31:26Z
- **Completed:** 2026-04-21T18:38:38Z
- **Tasks:** 4
- **Files modified:** 8 (6 created, 1 modified config, 1 modified fixture, 1 deleted)

## Accomplishments

- Granted anon Postgres role SELECT on counties, categories, profiles (is_published=true AND banned=false), and skills_offered (parent profile publicly visible) — migration 008 applied and verified live in pg_policies (4 rows confirmed)
- Added iphone-se Playwright project (`devices['iPhone SE']`) to playwright.config.ts — `pnpm exec playwright test --list --project=iphone-se` now lists 3 landing-mobile tests
- Created 4 failing E2E spec stubs (landing-smoke, landing-metadata, landing-founding-strip, landing-mobile) with verbatim UI-SPEC §Copywriting Contract copy assertions
- Retired `tests/e2e/smoke.spec.ts` (was asserting Phase-1 "Barterkin foundation" card and FireTestEvent button, both gone after Phase 6)

## Task Commits

Each task was committed atomically:

1. **Task 1: Write migration 008_landing_public_reads.sql** — `aca1a6e` (feat)
2. **Task 2: Apply migration 008 via supabase db push** — `f3446a1` (chore — types regeneration)
3. **Task 3: Add iphone-se Playwright project** — `87b6bcb` (feat)
4. **Task 4: Create 4 failing E2E spec stubs + retire smoke.spec.ts + extend fixture** — `ebe2173` (feat)

## Files Created/Modified

- `/Users/ashleyakbar/barterkin/supabase/migrations/008_landing_public_reads.sql` — 4 anon SELECT RLS policies for counties, categories, profiles, skills_offered
- `/Users/ashleyakbar/barterkin/playwright.config.ts` — Added iphone-se project entry (one line change)
- `/Users/ashleyakbar/barterkin/tests/e2e/fixtures/directory-seed.ts` — Added `founding_member?: boolean` param to `seedPublishedProfile` (defaults to false)
- `/Users/ashleyakbar/barterkin/lib/database.types.ts` — Regenerated after migration 008 (timestamp: 2026-04-21 11:36)
- `/Users/ashleyakbar/barterkin/tests/e2e/landing-smoke.spec.ts` — Hero H1 locked copy, GEO-03 honor-system, CTA links, how-it-works 3 steps, footer
- `/Users/ashleyakbar/barterkin/tests/e2e/landing-metadata.spec.ts` — OG title/desc/image, twitter:card=summary_large_image, manifest, /opengraph-image
- `/Users/ashleyakbar/barterkin/tests/e2e/landing-founding-strip.spec.ts` — Empty-state + populated branch with founding_member=true seed (hasEnv guard)
- `/Users/ashleyakbar/barterkin/tests/e2e/landing-mobile.spec.ts` — No horizontal scroll + tap target ≥44px at iPhone SE viewport
- `/Users/ashleyakbar/barterkin/tests/e2e/smoke.spec.ts` — **DELETED** (Phase-1 foundation card assertions retired)

## Decisions Made

**Migration push approach:** `supabase db push` was blocked because both `003_profile_storage.sql` and `003_profile_tables.sql` share the version prefix `003` — the CLI treats both as version "003" and sees a local file missing from the remote migration history. Since `supabase migration repair` cannot parse the version from `003_profile_storage.sql` (invalid version number error), used `supabase db query --linked -f supabase/migrations/008_landing_public_reads.sql` to execute the SQL directly via the Management API. Then manually inserted `('008')` into `supabase_migrations.schema_migrations` so `supabase migration list` reports it as applied on remote.

**TypeScript types:** Used `supabase gen types typescript --linked` to regenerate `lib/database.types.ts` since no `supabase:types` npm script exists. Types file timestamp (11:36) is newer than migration file (11:31) — acceptance criterion satisfied.

**Fixture signature drift:** The existing `seedPublishedProfile` did NOT have `founding_member` parameter — added it as `founding_member?: boolean` (defaults to `false`) with `founding_member: opts.founding_member ?? false` in the insert payload. This is additive; all existing callers continue to work unchanged.

**smoke.spec.ts retirement:** Deleted entirely (not retargeted) as specified in plan Step 6. `landing-smoke.spec.ts` provides complete replacement: all 6 landing-page assertions cover the hero H1, honor-system copy, CTA links, how-it-works headings, and footer legal links.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] supabase db push blocked by duplicate 003 migration file prefix**
- **Found during:** Task 2 (Apply migration 008 via supabase db push)
- **Issue:** `supabase db push` exits with "Found local migration files to be inserted before the last migration on remote database" because `003_profile_storage.sql` and `003_profile_tables.sql` both resolve to version "003". The `--include-all` flag attempts to re-apply `003_profile_tables.sql` against the live DB, which fails with "relation 'counties' already exists". `supabase migration repair` cannot parse the filename.
- **Fix:** Applied migration SQL directly via `supabase db query --linked -f supabase/migrations/008_landing_public_reads.sql`. Verified 4 anon policies live in `pg_policies`. Then inserted `('008')` into `supabase_migrations.schema_migrations` to satisfy `supabase migration list` acceptance criterion.
- **Files modified:** None (DB-side only; `lib/database.types.ts` regenerated as planned)
- **Verification:** `supabase migration list` shows `008 | 008 | 008`; `pg_policies` query returns 4 anon rows
- **Committed in:** `f3446a1` (Task 2 commit)

---

**Total deviations:** 1 auto-fixed (Rule 3 — blocking issue with duplicate migration file prefix)
**Impact on plan:** The blocking issue was resolved without changing the migration content or the acceptance criteria. Migration 008 is applied; all 4 anon policies are live. No scope creep.

## Issues Encountered

- `supabase db push` blocked by pre-existing repo issue: two files share the `003` version prefix (`003_profile_storage.sql` + `003_profile_tables.sql`). Resolved via direct SQL execution through the Management API. This is a pre-existing repo state issue, not introduced by Plan 01.

## Known Stubs

None — this plan creates only infrastructure (migration, config, test stubs). The 4 E2E spec stubs are intentionally RED (they assert landing page content that Wave 1/2 plans will build). They are not stubs in the sense of placeholder data — they are fully-specified failing tests.

## Next Phase Readiness

- **Plan 02 (lib/data/landing.ts + app/page.tsx skeleton) is unblocked:** anon RLS migration is live, founding-member and county queries will return rows instead of empty arrays
- **Plan 03 (landing components) is unblocked:** iphone-se project ready for `--project=iphone-se` mobile CI runs
- **Plan 04 (metadata/PWA) is unblocked:** `landing-metadata.spec.ts` stubs define exact assertion shapes for OG/twitter/manifest
- **Pre-existing blocker (003 prefix conflict):** Should be addressed separately before next major migration push — either rename `003_profile_storage.sql` to `003a_profile_storage.sql` or use a higher version prefix. Not a blocker for Phase 6 since `db query --linked` still works.

---
*Phase: 06-landing-page-pwa-polish*
*Completed: 2026-04-21*
