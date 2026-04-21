---
phase: 04-directory
reviewed: 2026-04-20T00:00:00Z
depth: standard
files_reviewed: 37
files_reviewed_list:
  - app/(app)/directory/error.tsx
  - app/(app)/directory/loading.tsx
  - app/(app)/directory/page.tsx
  - app/(app)/layout.tsx
  - app/(app)/m/[username]/page.tsx
  - app/(app)/profile/edit/page.tsx
  - app/(app)/profile/page.tsx
  - components/directory/ActiveFilterChips.tsx
  - components/directory/DirectoryCard.tsx
  - components/directory/DirectoryCategoryFilter.tsx
  - components/directory/DirectoryCountyFilter.tsx
  - components/directory/DirectoryEmptyState.tsx
  - components/directory/DirectoryErrorState.tsx
  - components/directory/DirectoryFilters.tsx
  - components/directory/DirectoryGrid.tsx
  - components/directory/DirectoryKeywordSearch.tsx
  - components/directory/DirectoryPagination.tsx
  - components/directory/DirectoryResultCounter.tsx
  - components/directory/DirectorySkeletonCard.tsx
  - components/directory/DirectoryZeroResultsState.tsx
  - components/layout/AppNav.tsx
  - components/layout/NavLinks.tsx
  - lib/data/directory-params.ts
  - lib/data/directory.ts
  - lib/database.types.ts
  - supabase/migrations/004_directory_search.sql
  - tests/e2e/directory-auth-gate.spec.ts
  - tests/e2e/directory-card-render.spec.ts
  - tests/e2e/directory-category-filter.spec.ts
  - tests/e2e/directory-county-filter.spec.ts
  - tests/e2e/directory-empty-states.spec.ts
  - tests/e2e/directory-keyword-search.spec.ts
  - tests/e2e/directory-pagination.spec.ts
  - tests/e2e/directory-url-shareable.spec.ts
  - tests/e2e/fixtures/directory-seed.ts
  - tests/unit/directory-data.test.ts
  - tests/unit/directory-rls-visibility.test.ts
  - tests/unit/directory-search-trigger.test.ts
findings:
  critical: 0
  warning: 3
  info: 4
  total: 7
status: issues_found
---

# Phase 4: Code Review Report

**Reviewed:** 2026-04-20
**Depth:** standard
**Files Reviewed:** 37
**Status:** issues_found

## Summary

Phase 4 implements the public-facing member directory: URL-param-driven filtering (category, county, keyword), paginated results, FTS with pg_trgm, RLS-gated visibility, and a full E2E + unit test suite. The overall implementation is solid — auth gating is correct, the dual-query filter consistency pattern is well-executed, RLS delegation is principled, and the SQL migration is idempotent. No security vulnerabilities were found.

Three warnings require fixes before the phase can be considered complete:

1. `DirectoryCard` renders a navigable link to `/m/null` (the literal string) when `profile.username` is null — a real scenario since `username` is nullable in the schema.
2. `DirectoryResultCounter` hardcodes the magic number `20` instead of using `PAGE_SIZE`, creating a silent divergence bug if the page size is ever changed.
3. The `error.tsx` boundary discards the `reset` prop entirely, preventing Next.js's built-in error retry from working.

---

## Warnings

### WR-01: Null username produces broken `/m/null` link in DirectoryCard

**File:** `components/directory/DirectoryCard.tsx:26`

**Issue:** `profile.username` is typed `string | null` per `DirectoryProfile`. When `username` is null, the template literal resolves to the href `/m/null` (the string "null") rather than producing a 404 or omitting the link. A user clicking that card navigates to a page that either 404s (if no profile has the literal username "null") or, worse, surfaces an unrelated profile if one happens to have that username.

The `buildRows` query in `lib/data/directory.ts` does not filter out `username IS NULL` rows, so null usernames can reach the UI.

**Fix:** Filter null-username profiles at the query level, or guard the link at the component level:

```tsx
// Option A — guard in the component (simplest):
<Link
  href={profile.username ? `/m/${profile.username}` : '#'}
  aria-label={ariaLabel}
  className="block"
  aria-disabled={!profile.username}
>

// Option B (preferred) — filter in lib/data/directory.ts buildRows():
let q = supabase
  .from('profiles')
  .select(`id, username, ...`)
  .not('username', 'is', null)   // add this line
```

Option B is better because it also corrects the `totalCount` (the count query does not filter null usernames either, so count and rows would diverge).

---

### WR-02: DirectoryResultCounter hardcodes `20` instead of `PAGE_SIZE`

**File:** `components/directory/DirectoryResultCounter.tsx:13`

**Issue:** The counter switches between "Showing X–Y of Z" and "Showing all Z" based on the condition `total > 20`. This `20` is a magic number that duplicates `PAGE_SIZE` from `lib/data/directory.ts`. If `PAGE_SIZE` is ever adjusted (e.g., to 24 or 25), the counter will silently show the wrong format — either displaying a range when showing the full page, or displaying "all N" when pagination is active.

```ts
// current — magic number
const text =
  total > 20
    ? `Showing ${from}–${to} of ${total}`
    : `Showing all ${total}`
```

**Fix:** Import and use `PAGE_SIZE`:

```tsx
import { PAGE_SIZE } from '@/lib/data/directory'

// in the component:
const text =
  total > PAGE_SIZE
    ? `Showing ${from}\u2013${to} of ${total}`
    : `Showing all ${total}`
```

---

### WR-03: Error boundary discards `reset` prop, preventing in-place retry

**File:** `app/(app)/directory/error.tsx:5-12`

**Issue:** The `reset` prop provided by Next.js's error boundary mechanism is prefixed `_reset` and never passed down. `DirectoryErrorState` provides a `window.location.reload()` button instead. This means:

- A full page reload is always triggered (discards React in-memory state, forces a cold navigation)
- Next.js's built-in re-render retry (which does not reload the page) is inaccessible to users
- In environments where the transient error resolves quickly, users experience a worse recovery path

```tsx
// current — reset is silently discarded
export default function DirectoryError({
  error: _error,
  reset: _reset,   // <-- never used
}: { ... }) {
  return <DirectoryErrorState />
}
```

**Fix:** Pass `reset` through to `DirectoryErrorState` so it can be offered as the primary CTA, with reload as a secondary fallback:

```tsx
// error.tsx
export default function DirectoryError({
  error: _error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  return <DirectoryErrorState onReset={reset} />
}

// DirectoryErrorState.tsx — add optional onReset prop
export function DirectoryErrorState({ onReset }: { onReset?: () => void }) {
  return (
    ...
    <Button
      onClick={onReset ?? (() => window.location.reload())}
      ...
    >
      Try again
    </Button>
    ...
  )
}
```

---

## Info

### IN-01: DirectoryCard skill badges keyed by `skill_text` — collision risk

**File:** `components/directory/DirectoryCard.tsx:49`

**Issue:** Each skill `Badge` is keyed by `skill_text`. If a profile has duplicate skill text strings (no unique constraint is visible in the `skills_offered` table schema in `lib/database.types.ts`), React will emit a key collision warning and may render incorrectly. The top-3 slice does not deduplicate first.

**Fix:** Key by `skill.id` (which is a uuid and guaranteed unique), or ensure the data layer deduplicates before slicing:

```tsx
{profile.skills_offered.map((skill) => (
  <Badge key={skill.id} ...>   // skill.id is uuid; requires adding id to DirectorySkill type
```

Alternatively, deduplicate in `getDirectoryRows` before slicing.

---

### IN-02: `admin()` factory in seed fixture creates a new client per call

**File:** `tests/e2e/fixtures/directory-seed.ts:16-19`

**Issue:** `admin()` is defined as a function that constructs a new `createClient(...)` on every invocation. It is called once per `seedPublishedProfile` skill insert (inside a loop), creating a new client instance each time. For test fixtures this is low-impact, but it generates unnecessary connection overhead during the pagination test which loops 25 times.

**Fix:** Hoist the client to a module-level singleton:

```ts
const _admin = createClient(URL, SERVICE, {
  auth: { autoRefreshToken: false, persistSession: false },
})
export const admin = () => _admin
```

---

### IN-03: Fuzzy-typo test skips dynamically but appears green in CI

**File:** `tests/e2e/directory-keyword-search.spec.ts:106`

**Issue:** The `test.skip(true, ...)` call inside the test body silently marks the test as skipped when the FTS path does not find the typo result. In most CI reporters a skipped test is shown as green or neutral, so the known limitation (pg_trgm fuzzy path not wired to the `textSearch` API call) is invisible to reviewers scanning CI output for failures. The comment documents the intent well, but there is no tracking artifact.

**Fix:** No code change required if the skip behaviour is acceptable. Consider adding a `test.fixme(...)` annotation instead of `test.skip(true, ...)` — `fixme` is semantically clearer that this is a known deficit rather than an environment skip, and some reporters differentiate between the two.

---

### IN-04: `DirectoryFilters` does not debounce or memoize `pushWith` dependencies correctly under rapid filter changes

**File:** `components/directory/DirectoryFilters.tsx:24-34`

**Issue:** `pushWith` is memoized via `useCallback` with `[router, pathname, searchParams]` as dependencies. `searchParams` from `useSearchParams()` is a new object reference on every render following a navigation. This means `pushWith` is recreated on every URL change, which is correct behaviour but worth noting: if a user rapidly changes category then county in quick succession, two `router.push` calls fire, and the second one may read stale `searchParams` from the closure captured before the first push settled. In Next.js App Router with shallow routing this is a benign race (the URL is eventually consistent), but the intermediate state briefly shows mismatched filter chips vs URL.

This is a subtle edge case, not a crash. The current implementation is consistent with how Next.js client-side routing is typically used.

**Fix:** No immediate action required. Document as a known race if the UX team reports chip flicker under rapid filter changes. A more robust approach uses a `startTransition` wrapper around `router.push` calls.

---

_Reviewed: 2026-04-20_
_Reviewer: Claude (gsd-code-reviewer)_
_Depth: standard_
