---
phase: 04
plan: 01
subsystem: database
tags: [supabase, postgres, fts, pg_trgm, migration, search, triggers]
completed: "2026-04-20"
duration: "~7min"
tasks_completed: 3
files_modified: 3

dependency_graph:
  requires:
    - "supabase/migrations/003_profile_tables.sql (profiles, skills_offered, skills_wanted, current_user_is_verified)"
  provides:
    - "public.profiles.search_text (trigger-maintained denormalized FTS column)"
    - "public.refresh_profile_search_text(uuid) SECURITY DEFINER function"
    - "GIN index: profiles_search_text_tsv_gin (tsvector, exact FTS)"
    - "GIN index: profiles_search_text_trgm_gin (trigram, fuzzy matching)"
    - "Partial btree indexes: profiles_category_idx, profiles_county_idx, profiles_created_at_desc_idx"
    - "lib/database.types.ts with search_text: string | null on profiles Row"
  affects:
    - "Plans 04-02, 04-03 (directory query layer depends on search_text column)"

tech_stack:
  added:
    - "pg_trgm Postgres extension (fuzzy trigram matching)"
  patterns:
    - "SECURITY DEFINER function with revoked public execute for cross-table trigger writes"
    - "Trigger-maintained denormalized column (cross-table GENERATED ALWAYS AS workaround)"
    - "Drop-if-exists + create trigger pattern for idempotent migrations"

key_files:
  created:
    - "supabase/migrations/004_directory_search.sql"
    - "tests/unit/directory-search-trigger.test.ts"
  modified:
    - "lib/database.types.ts (regenerated from live schema)"

decisions:
  - "Migration applied via `supabase db query --linked` (not `db push`) because non-timestamp migration names caused CLI to flag insertions before last remote migration"
  - "Test uses lazy dynamic import of supabaseAdmin to avoid eager URL validation crash when env vars absent — no factory function added (plan constraint honored)"
  - "describe.skip fallback engaged when SUPABASE_SERVICE_ROLE_KEY absent; all 4 tests pass with .env.local loaded"

metrics:
  duration: "~7min"
  completed: "2026-04-20"
  tasks: 3
  files: 3
---

# Phase 04 Plan 01: Directory Search Foundation Summary

**One-liner:** pg_trgm enabled + trigger-maintained `profiles.search_text` covering name/bio/skills, 2 GIN + 3 btree indexes, types regenerated, 4-test trigger integration suite.

---

## What Was Built

Migration `004_directory_search.sql` builds the full-text search foundation for the directory:

1. **pg_trgm extension** enabled idempotently — enables `%` similarity operator for typo-tolerant search
2. **`profiles.search_text` column** — trigger-maintained denormalized text column containing `display_name + bio + tiktok_handle + skills_offered + skills_wanted` for every profile
3. **`public.refresh_profile_search_text(uuid)`** — SECURITY DEFINER function with `revoke execute from public` (ASVS V4.3 least privilege). Called by triggers only.
4. **3 triggers:**
   - `profiles_refresh_search` — fires after INSERT or UPDATE when `display_name`, `bio`, or `tiktok_handle` changes
   - `skills_offered_refresh_search` — fires after INSERT/UPDATE/DELETE on `skills_offered`
   - `skills_wanted_refresh_search` — fires after INSERT/UPDATE/DELETE on `skills_wanted`
5. **Backfill** — existing rows repopulated via `SELECT refresh_profile_search_text(id) FROM profiles`
6. **2 GIN indexes:**
   - `profiles_search_text_tsv_gin` — `to_tsvector('english', search_text)` for `websearch_to_tsquery @@` exact/phrase matching
   - `profiles_search_text_trgm_gin` — `gin_trgm_ops` for `%` fuzzy similarity matching
7. **3 partial btree indexes** (all scoped to `is_published = true AND banned = false`):
   - `profiles_category_idx` — category filter
   - `profiles_county_idx` — county filter
   - `profiles_created_at_desc_idx` — default browse ordering

Phase 3's `profiles.search_vector` (covers name+bio+tiktok only) was NOT dropped — preserved for possible future narrow-profile FTS paths.

**Types regenerated** — `lib/database.types.ts` now includes `search_text: string | null` on the profiles `Row`, `Insert`, and `Update` interfaces. `pnpm typecheck` exits 0.

**Integration test** — 4 tests in `tests/unit/directory-search-trigger.test.ts` prove the trigger wiring:
- Test 1: `skills_offered` insert appends to `search_text`
- Test 2: `display_name` update propagates to `search_text`
- Test 3: `skills_offered` delete removes text from `search_text`
- Test 4: `skills_wanted` insert appends to `search_text`

Test result: **4/4 passing** when env vars loaded from `.env.local` against the live remote Supabase. Clean skip (4 skipped) when `SUPABASE_SERVICE_ROLE_KEY` is absent (expected in CI without secrets configured).

---

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Fixed eager admin client crash in test when env vars absent**
- **Found during:** Task 3 (first test run)
- **Issue:** `lib/supabase/admin.ts` instantiates `supabaseAdmin` at module load time. Importing it at the top of the test file caused `validateSupabaseUrl` crash before the `hasAdmin` check could engage `describe.skip`.
- **Fix:** Changed test to use lazy `await import('@/lib/supabase/admin')` inside `beforeAll` instead of top-level import. `hasAdmin` check runs at describe-eval time (before beforeAll), so skip engages correctly.
- **Files modified:** `tests/unit/directory-search-trigger.test.ts`
- **Commit:** `d915a7d`

**2. [Rule 3 - Blocking] Used `supabase db query --linked` instead of `db push` for migration application**
- **Found during:** Task 2 (migration push attempt)
- **Issue:** Non-timestamp migration filenames (002_, 003_, 004_) cause `supabase db push` to flag 002 and 003 as insertions before the last remote migration, requiring `--include-all` which then tried to re-apply 002/003 (already live, causing `relation already exists` errors). `db push` is designed for timestamp-prefixed migrations.
- **Fix:** Used `pnpm exec supabase db query --linked --file supabase/migrations/004_directory_search.sql` to apply migration 004 directly. Migration executed successfully (backfill query returned as expected).
- **Files modified:** None (procedural fix)
- **Commit:** `cfedf3a` (types regeneration after successful apply)

**3. [Rule 1 - Bug] Fixed types file contaminated with stderr output**
- **Found during:** Task 2, first typecheck run
- **Issue:** `pnpm exec supabase gen types typescript --linked 2>&1 > lib/database.types.ts` captured "Initialising login role..." stderr into the types file, causing `tsc --noEmit` to fail.
- **Fix:** Changed to `2>/dev/null > lib/database.types.ts` to discard stderr.
- **Files modified:** `lib/database.types.ts`
- **Commit:** `cfedf3a`

**4. [Rule 1 - Adjustment] Import adjusted: `supabaseAdmin` not `createAdminClient`**
- **Found during:** Task 3 (pre-write check of admin.ts)
- **Issue:** Plan specified `import { createAdminClient } from '@/lib/supabase/admin'` but `admin.ts` exports a singleton `supabaseAdmin`, not a factory function.
- **Fix:** Adjusted test import to use `supabaseAdmin` per plan instruction ("If lib/supabase/admin.ts exports the admin client under a different name, adjust the import — but do NOT add a new admin-client factory"). Combined with lazy import fix above.
- **Files modified:** `tests/unit/directory-search-trigger.test.ts`
- **Commit:** `d915a7d`

---

## Known Stubs

None. `search_text` is populated for all existing rows via backfill and maintained by triggers for all future mutations.

---

## Threat Flags

None. All surfaces introduced are internal to the Postgres trigger system (no new network endpoints, no new auth paths, no file access). The SECURITY DEFINER function has `revoke execute from public` per the threat model's T-04-01-01 mitigation.

---

## Self-Check

### Files exist

- `/Users/ashleyakbar/barterkin/supabase/migrations/004_directory_search.sql` — FOUND
- `/Users/ashleyakbar/barterkin/lib/database.types.ts` — FOUND (contains search_text)
- `/Users/ashleyakbar/barterkin/tests/unit/directory-search-trigger.test.ts` — FOUND

### Commits exist

- `02eb63b` — feat(04-01): add migration 004
- `cfedf3a` — feat(04-01): push migration 004 and regenerate types
- `d915a7d` — test(04-01): add DIR-05 trigger integration test

## Self-Check: PASSED
