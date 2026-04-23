---
phase: 09
plan: 01
subsystem: onboarding-foundation
tags:
  - migration
  - middleware
  - security
  - tdd
  - wave-0-tests
dependency_graph:
  requires:
    - "supabase/migrations/003_profile_tables.sql (profiles table + RLS policies)"
    - "lib/supabase/middleware.ts (existing admin guard pattern)"
  provides:
    - "profiles.onboarding_completed_at column (NULL = incomplete, timestamp = done)"
    - "Middleware /onboarding redirect guard (D-02/D-10)"
    - "safeReturnTo() open-redirect prevention helper (T-9-03)"
    - "Wave 0 test stubs (5 files) for Plans 02 and 03"
  affects:
    - "lib/database.types.ts (regenerated with new column)"
    - "All authenticated requests to VERIFIED_REQUIRED_PREFIXES (new DB query per request)"
tech_stack:
  added:
    - "lib/utils/returnTo.ts (new pure helper)"
    - "supabase/migrations/009_onboarding.sql (new migration)"
  patterns:
    - "TDD RED/GREEN: tests written first, then implementation"
    - "Middleware guard scoped to VERIFIED_REQUIRED_PREFIXES to limit DB round-trips"
    - "claims.sub (JWKS-verified) used in middleware, not getUser()"
key_files:
  created:
    - supabase/migrations/009_onboarding.sql
    - lib/utils/returnTo.ts
    - tests/unit/onboarding-returnto.test.ts
    - tests/unit/onboarding-action.test.ts
    - tests/e2e/onboarding-redirect.spec.ts
    - tests/e2e/onboarding-step1-gate.spec.ts
    - tests/e2e/finish-setup-nav.spec.ts
  modified:
    - lib/supabase/middleware.ts
    - lib/database.types.ts
decisions:
  - "Used supabase db query --linked -f to apply migration (supabase db push rejected non-timestamped filenames)"
  - "Regenerated database.types.ts with stderr redirected to /dev/null to avoid CLI login message corruption"
  - "Pre-existing typecheck errors in lib/actions/contact.ts and lib/data/landing.ts are out of scope (not introduced by this plan)"
metrics:
  duration: "~5 minutes"
  completed: "2026-04-23"
  tasks: 4
  files: 9
---

# Phase 9 Plan 01: Onboarding Foundation (DB + Middleware + Helpers) Summary

**One-liner:** Added `profiles.onboarding_completed_at timestamptz` column, middleware redirect guard for new users, `safeReturnTo()` open-redirect prevention helper, and Wave 0 test stubs for Plans 02/03.

---

## What Was Built

### Migration Applied

`supabase/migrations/009_onboarding.sql` — adds `onboarding_completed_at timestamptz` to `public.profiles`. Applied to the remote dev DB via `supabase db query --linked -f`. No new RLS policy needed: the existing wildcard SELECT/UPDATE policies (`using (owner_id = auth.uid())`) are column-agnostic.

**Verification:** Column confirmed via `information_schema.columns` query:
```json
{"column_name": "onboarding_completed_at", "data_type": "timestamp with time zone", "is_nullable": "YES"}
```

`lib/database.types.ts` regenerated — `onboarding_completed_at` appears 3× (Row, Insert, Update definitions in the `profiles` interface).

### Middleware Extension

`lib/supabase/middleware.ts` — two changes:

1. `ALWAYS_ALLOWED` extended with `'/onboarding'` (D-02 loop prevention — if the user IS on /onboarding, the guard must not redirect them back to /onboarding).

2. Onboarding guard block inserted after the admin guard, before `return response`:
   - Scoped to `VERIFIED_REQUIRED_PREFIXES` (`/directory`, `/m/`, `/profile`) so the DB query only fires for authenticated, verified requests on app paths — NOT on landing page, auth, or /onboarding itself.
   - Reads `profiles.onboarding_completed_at` using `claims.sub` (JWKS-verified, no extra Auth round-trip per CLAUDE.md mandate).
   - NULL or missing row → `NextResponse.redirect` to `/onboarding`.

### safeReturnTo() Helper

`lib/utils/returnTo.ts` — pure function with no side effects. Rejects:
- `undefined` / empty string
- Single-char strings
- Anything not starting with `/`
- Protocol-relative URLs (`//evil.com` — second char is `/`)

Returns the input unchanged if it passes all checks.

**safeReturnTo Test Coverage (9 tests — all green):**

| # | Input | Expected | Reason |
|---|-------|----------|--------|
| 1 | `/onboarding?step=1` | `/onboarding?step=1` | Valid relative path with query |
| 2 | `/directory` | `/directory` | Valid relative path |
| 3 | `undefined` | `undefined` | undefined input |
| 4 | `''` | `undefined` | Empty string rejected |
| 5 | `https://evil.com` | `undefined` | Absolute URL (doesn't start with /) |
| 6 | `//evil.com/phish` | `undefined` | Protocol-relative URL (second char is /) |
| 7 | `javascript:alert(1)` | `undefined` | Doesn't start with / |
| 8 | `foo` | `undefined` | Doesn't start with / |
| 9 | `/foo/bar?a=1&b=2#frag` | `/foo/bar?a=1&b=2#frag` | Query + fragment preserved |

### Wave 0 Test Stubs

Five files created as stubs for Plans 02 and 03:

| File | Type | Tests | Status |
|------|------|-------|--------|
| `tests/unit/onboarding-action.test.ts` | Vitest | 4 `it.todo` | Exits 0 |
| `tests/e2e/onboarding-redirect.spec.ts` | Playwright | 1 live + 6 `test.fixme` | Parses OK |
| `tests/e2e/onboarding-step1-gate.spec.ts` | Playwright | 5 `test.fixme` | Parses OK |
| `tests/e2e/finish-setup-nav.spec.ts` | Playwright | 4 `test.fixme` | Parses OK |

---

## Commits

| Task | Commit | Description |
|------|--------|-------------|
| Task 1 | `1d741aa` | Migration 009 + regenerated types |
| Task 2 | `65e2e29` | safeReturnTo() helper + 9 unit tests (TDD green) |
| Task 3 | `f2afb67` | Middleware /onboarding redirect guard (D-02, D-10) |
| Task 4 | `dc592be` | Wave 0 test stubs (1 unit + 3 E2E files) |

---

## Checkpoint: APPROVED (2026-04-22)

The `checkpoint:human-verify` gate (Task 5) was reviewed and approved by the human operator. All 7 checks passed:

1. **`profiles.onboarding_completed_at` column** — confirmed present in Supabase Studio (type `timestamptz`, nullable).
2. **Back-fill complete** — `SELECT count(*) FROM profiles WHERE onboarding_completed_at IS NULL` returned 0.
3. **Middleware guard confirmed** — existing verified accounts no longer trigger redirect to `/onboarding` after back-fill.
4. **`lib/database.types.ts` regenerated** — `onboarding_completed_at` present in the `profiles` interface.
5. **`pnpm typecheck`** — only pre-existing errors (out of scope); no new errors from this plan.
6. **Unit tests** — `pnpm vitest run tests/unit/onboarding-returnto.test.ts tests/unit/onboarding-action.test.ts` — 9 passed + 4 todo.
7. **`/onboarding` returns 404** — expected Wave 0 red (Plan 02 builds the page).

Plan 09-01 is complete. Cleared to proceed to Plan 09-02.

---

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] supabase gen types wrote stderr to types file**
- **Found during:** Task 1
- **Issue:** `npx supabase gen types typescript --linked > lib/database.types.ts` captured the `Initialising login role...` stderr line into the file, causing TypeScript parse errors on line 1.
- **Fix:** Re-ran with `2>/dev/null` redirect: `npx supabase gen types typescript --linked 2>/dev/null > lib/database.types.ts`
- **Files modified:** `lib/database.types.ts`
- **Commit:** `f2afb67` (included in Task 3 commit)

**2. [Rule 3 - Blocking] supabase db push rejected non-timestamped migration filenames**
- **Found during:** Task 1
- **Issue:** `supabase db push --linked` skips files that don't match `<timestamp>_name.sql` pattern. The `--include-all` flag tried to re-run `003_profile_tables.sql` which already exists on remote, causing a `relation "counties" already exists` error.
- **Fix:** Applied migration directly via `supabase db query --linked -f supabase/migrations/009_onboarding.sql` which executed cleanly.
- **Files modified:** None (migration was applied to DB without changing the SQL file)
- **Commit:** `1d741aa`

### Out-of-scope Pre-existing Issues (Deferred)

The following TypeScript errors exist in the codebase but were NOT introduced by this plan and are out of scope:
- `lib/actions/contact.ts(241,40)` — `"mark_contacts_seen"` not in RPC type union
- `lib/data/landing.ts(93,11)` and `(107,36)` — type narrowing issues in landing data

These are logged here for visibility. Fix in a dedicated plan.

---

## Threat Surface Scan

No new network endpoints, auth paths, or file access patterns introduced beyond what is documented in the plan's `<threat_model>`. The middleware guard reads `profiles.onboarding_completed_at` — covered by T-9-04 (Information Disclosure, accepted disposition per existing RLS). No new threat flags.

---

## TDD Gate Compliance

Plan 09-01 Task 2 followed TDD:
- RED commit: tests/unit/onboarding-returnto.test.ts written before implementation (confirmed failing with "Cannot find module")
- GREEN commit: `65e2e29` — both test file and implementation committed together (9/9 passing)

Both RED and GREEN gates satisfied.

---

## Self-Check: PASSED

- [x] `supabase/migrations/009_onboarding.sql` exists
- [x] `lib/database.types.ts` contains `onboarding_completed_at` (3 occurrences)
- [x] `lib/utils/returnTo.ts` exists with `export function safeReturnTo`
- [x] `lib/supabase/middleware.ts` contains `/onboarding` twice and `onboarding_completed_at`
- [x] All 4 Wave 0 test files exist
- [x] Commits `1d741aa`, `65e2e29`, `f2afb67`, `dc592be` exist in git log
