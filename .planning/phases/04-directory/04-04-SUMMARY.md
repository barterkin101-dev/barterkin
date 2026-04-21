---
phase: "04"
plan: "04"
subsystem: directory
tags: [client-components, filters, url-state, debounce, shadcn, combobox, react]

requires:
  - lib/data/directory.types.ts
  - lib/data/directory-params.ts
  - lib/data/categories.ts
  - lib/data/georgia-counties.json
  - components/profile/CountyCombobox.tsx
  - components/ui/button.tsx
  - components/ui/command.tsx
  - components/ui/popover.tsx
  - components/ui/input.tsx
  - components/ui/badge.tsx

provides:
  - components/directory/DirectoryCategoryFilter.tsx
  - components/directory/DirectoryCountyFilter.tsx
  - components/directory/DirectoryKeywordSearch.tsx
  - components/directory/DirectoryFilters.tsx
  - components/directory/ActiveFilterChips.tsx

affects:
  - Plan 04-03 (directory page — consumes DirectoryFilters + ActiveFilterChips in the server layout)
  - Plan 04-05 (E2E wire-up — fills filter-UI stubs in directory-category-filter.spec.ts, directory-county-filter.spec.ts, directory-keyword-search.spec.ts, directory-url-shareable.spec.ts)

tech-stack:
  added: []
  patterns:
    - URL-as-single-source-of-truth for filter state (useSearchParams → router.push)
    - Derived state reset via prevProp comparison in render (no useEffect needed — React docs "adjusting state based on prop changes")
    - Debounced input with 300ms timer + immediate-submit on Enter
    - Thin wrapper pattern for Phase 3 reuse (DirectoryCountyFilter wraps CountyCombobox without duplication)
    - page-param deletion on every filter mutation (Pitfall 5 invariant)

key-files:
  created:
    - components/directory/DirectoryCategoryFilter.tsx
    - components/directory/DirectoryCountyFilter.tsx
    - components/directory/DirectoryKeywordSearch.tsx
    - components/directory/DirectoryFilters.tsx
    - components/directory/ActiveFilterChips.tsx
  modified: []

key-decisions:
  - "DirectoryCountyFilter wraps Phase 3 CountyCombobox wholesale — zero duplication of 159-county logic"
  - "DirectoryKeywordSearch uses prevInitialValue state comparison for URL-reset instead of useEffect (avoids react-hooks/set-state-in-effect lint error while preserving correct behavior)"
  - "All filter mutations call router.push (not router.replace) — every filter change is a history entry, back-button restores filters (UI-SPEC line 506)"
  - "params.delete('page') on every filter mutation in both DirectoryFilters and ActiveFilterChips — single page-reset invariant"
  - "No new npm runtime deps introduced — all components use existing shadcn + lucide-react already in lockfile"

patterns-established:
  - "URL-as-state: client components read useSearchParams(), write router.push() — no React state for filter values except in-flight debounce buffer"
  - "Filter controls are pure prop-driven (value + onChange) — DirectoryFilters owns the URL mutation logic"
  - "Chip labels follow exact format: 'Category: X', 'County: X', 'Search: X'"
  - "Remove chip aria-labels: 'Remove category filter', 'Remove county filter', 'Remove search filter'"
  - "Tap targets on chip x buttons: 44x44px (h-11 w-11) per accessibility spec"

requirements-completed: [DIR-03, DIR-04, DIR-05, DIR-06]

duration: 20min
completed: 2026-04-20
---

# Phase 04 Plan 04: Directory Filter Controls Summary

**5 client components implementing URL-as-state filter bar: category Combobox, county Combobox (Phase 3 reuse), 300ms debounced keyword search, URL-mutation wrapper, and active-filter chip row with per-chip removal**

## Performance

- **Duration:** ~20 min
- **Started:** 2026-04-20T22:30:00Z
- **Completed:** 2026-04-20T22:53:30Z
- **Tasks:** 2
- **Files created:** 5 (all new — zero files modified)

## Accomplishments

- 5 `'use client'` components shipping the full filter bar surface area for `/directory`
- DirectoryCountyFilter wraps Phase 3 CountyCombobox wholesale — zero duplication of 159-county data or combobox logic
- URL is the single source of truth: every filter mutation writes `router.push(pathname?params)` and deletes `?page=`
- Keyword input debounces at exactly 300ms with immediate-submit on Enter and clear-X affordance
- Active filter chips render with exact UI-SPEC copy and accessible aria-labels; return null when no filter active
- typecheck + lint clean (Rule 1: fixed react-hooks/set-state-in-effect lint error in KeywordSearch)

## Task Commits

1. **Task 1: Individual filter controls** - `dc2ad24` (feat)
2. **Task 2: DirectoryFilters wrapper + ActiveFilterChips** - `6aea022` (feat)

## Files Created

- `components/directory/DirectoryCategoryFilter.tsx` — Combobox over 10 CATEGORIES + sticky "All categories" reset; trigger has `aria-label="Filter by category"` and placeholder "Category"
- `components/directory/DirectoryCountyFilter.tsx` — thin wrapper: imports `CountyCombobox` from `@/components/profile/CountyCombobox`, wraps in `aria-label="Filter by county"` div
- `components/directory/DirectoryKeywordSearch.tsx` — 300ms debounced Input with `DEBOUNCE_MS = 300`; placeholder "Search skills, names, or bios"; clear-X button `aria-label="Clear search"`; Enter bypasses debounce
- `components/directory/DirectoryFilters.tsx` — master filter bar; `router.push` (not replace); `params.delete('page')` on every mutation; "Clear filters" button gated on `activeFilterCount > 0`
- `components/directory/ActiveFilterChips.tsx` — chip per active filter; `params.delete('page')` on removal; returns null when no chips; chip x buttons are 44x44 tap targets

## Component Summary

| Component | Class | Provides |
|-----------|-------|---------|
| DirectoryCategoryFilter | client | Combobox over 10 categories + All categories reset |
| DirectoryCountyFilter | client | Thin wrapper over Phase 3 CountyCombobox |
| DirectoryKeywordSearch | client | 300ms debounced input + clear-X + Enter submit |
| DirectoryFilters | client | URL-state manager wrapping 3 controls + Clear button |
| ActiveFilterChips | client | Chip row with per-filter remove buttons |

**CountyCombobox reused:** Yes — imported from `@/components/profile/CountyCombobox`, not duplicated.

## Decisions Made

- Used React's documented "adjusting state based on prop changes" pattern (`prevInitialValue` state comparison in render) for keyword-search URL-reset, avoiding `useEffect` which triggers `react-hooks/set-state-in-effect` lint error
- `router.push` (not `router.replace`) per UI-SPEC line 506 — every filter change creates a history entry so browser back-button restores prior filter state
- County filter clearing happens via the chip x button only (not via the CountyCombobox itself), matching Phase 3 semantics where `CountyCombobox.onChange` emits non-null values

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Refactored KeywordSearch URL-sync from useEffect to derived state pattern**
- **Found during:** Task 1 (DirectoryKeywordSearch implementation)
- **Issue:** Plan's original implementation used `React.useEffect(() => { setValue(initialValue) }, [initialValue])` — this triggers the `react-hooks/set-state-in-effect` ESLint error (lint exit 1)
- **Fix:** Replaced with React's recommended "adjusting state based on prop changes" pattern: store `prevInitialValue` in state, compare in render body, call `setLocalValue` synchronously during render when prop differs
- **Files modified:** `components/directory/DirectoryKeywordSearch.tsx`
- **Verification:** `eslint components/directory/` exits 0; `tsc --noEmit` exits 0; behavior preserved (local edit buffer resets when URL changes externally)
- **Committed in:** `dc2ad24` (Task 1 commit)

---

**Total deviations:** 1 auto-fixed (Rule 1 — lint error in plan's implementation pattern)
**Impact on plan:** Lint-clean implementation with identical runtime behavior. No scope creep.

## Issues Encountered

The worktree did not have its own `node_modules`; pnpm commands failed with "node_modules missing". Resolved by calling `node_modules/.bin/tsc` and `node_modules/.bin/eslint` from the main project root directly — both tools work correctly against the worktree source.

## Known Stubs

None — all 5 components are fully implemented. Filter controls will be wired into the directory page in Plan 04-03 (server component) and verified by E2E stubs filled in Plan 04-05.

## Threat Flags

None — all 5 components operate on client-side URL state only. No new network endpoints, auth paths, or DB access introduced. URL param injection is mitigated by `URLSearchParams.set()` encoding + server-side `parseSearchParams` silently dropping invalid values (T-04-04-01 mitigated per plan threat model).

## Next Phase Readiness

- All 5 filter client components are committed and export stable props contracts
- `DirectoryFilters` and `ActiveFilterChips` are ready to be imported into `app/(app)/directory/page.tsx` (Plan 04-03)
- E2E stubs for category-filter, county-filter, keyword-search, and url-shareable tests (Plan 04-02 Wave 0) can now be filled in Plan 04-05
- No blockers

## Self-Check: PASSED

All 5 files confirmed present on disk. Both commits (`dc2ad24`, `6aea022`) verified in git log.
