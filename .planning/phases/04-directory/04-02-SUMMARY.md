---
phase: "04"
plan: "02"
subsystem: directory
tags: [shadcn, vitest, playwright, wave0, types, parsing, tdd]
completed: "2026-04-21T05:46:44Z"
duration: "7 minutes"
tasks_completed: 3
files_created: 13
files_modified: 0

requires:
  - lib/data/categories.ts
  - lib/data/georgia-counties.json
  - components.json

provides:
  - components/ui/pagination.tsx
  - components/ui/skeleton.tsx
  - lib/data/directory.types.ts
  - lib/data/directory-params.ts
  - tests/unit/directory-params.test.ts
  - tests/unit/directory-rls-visibility.test.ts
  - tests/unit/directory-data.test.ts
  - tests/e2e/directory-auth-gate.spec.ts
  - tests/e2e/directory-card-render.spec.ts
  - tests/e2e/directory-category-filter.spec.ts
  - tests/e2e/directory-county-filter.spec.ts
  - tests/e2e/directory-keyword-search.spec.ts
  - tests/e2e/directory-url-shareable.spec.ts
  - tests/e2e/directory-pagination.spec.ts
  - tests/e2e/directory-empty-states.spec.ts

affects:
  - Plan 04-03 (data layer — consumes DirectoryFilters, DirectoryProfile types + parseSearchParams)
  - Plan 04-04 (filter UI — consumes same contracts)
  - Plan 04-05 (E2E wire-up — fills stubs)

tech_stack:
  added: []
  patterns:
    - shadcn new-york registry components (pagination, skeleton)
    - URL param parsing with silent-drop validation
    - TDD RED/GREEN cycle for parseSearchParams
    - Wave 0 test stub pattern (it.skip / test.skip with TODO comments)

key_files:
  created:
    - components/ui/pagination.tsx
    - components/ui/skeleton.tsx
    - lib/data/directory.types.ts
    - lib/data/directory-params.ts
    - tests/unit/directory-params.test.ts
    - tests/unit/directory-rls-visibility.test.ts
    - tests/unit/directory-data.test.ts
    - tests/e2e/directory-auth-gate.spec.ts
    - tests/e2e/directory-card-render.spec.ts
    - tests/e2e/directory-category-filter.spec.ts
    - tests/e2e/directory-county-filter.spec.ts
    - tests/e2e/directory-keyword-search.spec.ts
    - tests/e2e/directory-url-shareable.spec.ts
    - tests/e2e/directory-pagination.spec.ts
    - tests/e2e/directory-empty-states.spec.ts
  modified: []

key_decisions:
  - parseSearchParams implemented verbatim per plan spec — no deviations
  - TDD cycle followed: RED commit (test only, fails) → GREEN commit (implementation passes all 25 tests)
  - County fips 13121 confirmed as Fulton County in georgia-counties.json
  - Wave 0 stubs use it.skip / test.skip (not it.todo) so stubs compile and run as skipped
  - No new npm runtime deps introduced (shadcn CLI uses existing @radix-ui deps already in lockfile)
---

# Phase 04 Plan 02: Directory Wave 0 — shadcn primitives + types + parseSearchParams + test stubs

**One-liner:** Wave 0 test harness for Phase 4 directory: shadcn pagination+skeleton installed, shared DirectoryFilters/DirectoryProfile types authored, parseSearchParams implemented with full 25-case Vitest suite (TDD RED→GREEN), and 10 Wave 0 stubs scaffolded (2 unit + 8 E2E) covering DIR-01 through DIR-09.

## Tasks Completed

| Task | Name | Commit | Files |
|------|------|--------|-------|
| 1 | Install shadcn pagination+skeleton; author shared directory types | `9d33968` | components/ui/pagination.tsx, components/ui/skeleton.tsx, lib/data/directory.types.ts |
| 2 (RED) | Add failing parseSearchParams test suite | `6078812` | tests/unit/directory-params.test.ts |
| 2 (GREEN) | Implement parseSearchParams + exported constants | `d34a860` | lib/data/directory-params.ts |
| 3 | Scaffold Wave 0 test stubs (2 unit + 8 E2E) | `c2ecbaa` | 10 stub files |

## Shadcn Components Installed

- `components/ui/pagination.tsx` — shadcn Pagination (new-york style, installs with @radix-ui peer deps already present)
- `components/ui/skeleton.tsx` — shadcn Skeleton (new-york style)

Both installed via `pnpm dlx shadcn@latest add pagination skeleton`. components.json unchanged (already initialized, `registries: {}` empty — no third-party registry).

## Shared Type Exports (lib/data/directory.types.ts)

- `DirectoryFilters` — categorySlug, categoryId, countyFips, countyId, countyName, q, page, activeFilterCount
- `DirectoryProfile` — id, username, display_name, avatar_url, counties, categories, skills_offered
- `DirectorySkill` — skill_text, sort_order
- `DirectoryQueryResult` — profiles, totalCount, error

## Test Metrics

- `parseSearchParams` tests: **25 passed / 25 total** (green)
- Wave 0 unit stubs: **11 skipped / 11 total** (parseable, no errors)
- Wave 0 E2E stubs: **8 listed** in `playwright test --list` (DIR-01 through DIR-08)

## TDD Gate Compliance

Plan executed with TDD for Task 2 (`tdd="true"`):
1. RED gate: `test(04-02)` commit `6078812` — test file only, imports non-existent module, build fails
2. GREEN gate: `feat(04-02)` commit `d34a860` — implementation added, all 25 tests pass

## Deviations from Plan

None — plan executed exactly as written. The verbatim `parseSearchParams` implementation from the plan spec was used without modification. County fips 13121 confirmed as Fulton County in `lib/data/georgia-counties.json` (matches plan's note in Test 14).

## Known Stubs

The following stubs are intentional (Wave 0 design) — Plan 03 and Plan 05 will fill them:

| Stub | File | Reason |
|------|------|--------|
| RLS visibility tests | tests/unit/directory-rls-visibility.test.ts | Requires live Supabase data layer (Plan 03) |
| Data layer tests | tests/unit/directory-data.test.ts | Requires getDirectoryRows function (Plan 03) |
| E2E auth gate | tests/e2e/directory-auth-gate.spec.ts | Requires /directory page to exist (Plan 04/05) |
| E2E card render | tests/e2e/directory-card-render.spec.ts | Requires directory page + seeded data (Plan 05) |
| E2E category filter | tests/e2e/directory-category-filter.spec.ts | Requires filter UI (Plan 04) + wiring (Plan 05) |
| E2E county filter | tests/e2e/directory-county-filter.spec.ts | Requires filter UI (Plan 04) + wiring (Plan 05) |
| E2E keyword search | tests/e2e/directory-keyword-search.spec.ts | Requires search UI (Plan 04) + wiring (Plan 05) |
| E2E shareable URL | tests/e2e/directory-url-shareable.spec.ts | Requires URL hydration (Plan 04) + wiring (Plan 05) |
| E2E pagination | tests/e2e/directory-pagination.spec.ts | Requires pagination UI (Plan 04) + wiring (Plan 05) |
| E2E empty states | tests/e2e/directory-empty-states.spec.ts | Requires empty state components (Plan 04) + wiring (Plan 05) |

These stubs prevent Plan 04-02's goal from being fully verified at runtime — they are intentional scaffolding that Plan 04-05 resolves.

## Threat Flags

None — this plan introduces no new network endpoints, auth paths, file access patterns, or schema changes. The URL parsing in `parseSearchParams` silently drops invalid inputs before they reach any DB query path (T-04-02-01 and T-04-02-02 mitigated per threat model).

## Self-Check: PASSED

All 15 files found on disk. All 4 commits verified in git log.
