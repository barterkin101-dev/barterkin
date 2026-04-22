---
phase: 08
plan: 02
subsystem: admin-dashboard
tags: [admin, ui, layout, dashboard, members-list, search, wave-1]
requires:
  - lib/data/admin.ts::getAdminStats (Plan 01)
  - lib/data/admin.ts::getAdminMembers (Plan 01)
  - lib/data/admin.ts::AdminMemberRow (Plan 01)
  - middleware.ts ADMIN_PREFIX guard (Plan 01)
  - components/ui/{card,badge,input,avatar,sonner}.tsx (existing)
provides:
  - app/(admin)/layout.tsx (admin route-group chrome)
  - app/(admin)/page.tsx (ADMIN-01 stats dashboard)
  - app/(admin)/members/page.tsx (ADMIN-02 members list)
  - components/admin/AdminNav.tsx (top nav with usePathname active-link)
  - components/admin/MembersTable.tsx (Client Component with useDeferredValue search)
  - components/admin/StatusBadge.tsx (Banned/Published/Unpublished badge)
  - tests/unit/admin-members-search.test.tsx (6 filled assertions, all green)
affects:
  - tests/unit/admin-members-search.test.ts (renamed to .tsx for JSX)
tech_stack:
  added: []
  patterns:
    - route-group layout with per-group chrome (bypasses global AppNav)
    - useDeferredValue for lag-free real-time filter on server-fetched array
    - robots.noindex at layout-level for admin pages
    - non-async layout relying on middleware for auth (no redundant getUser)
key_files:
  created:
    - app/(admin)/layout.tsx
    - app/(admin)/page.tsx
    - app/(admin)/members/page.tsx
    - components/admin/AdminNav.tsx
    - components/admin/MembersTable.tsx
    - components/admin/StatusBadge.tsx
    - tests/unit/admin-members-search.test.tsx
  modified:
    - tests/unit/admin-members-search.test.ts  # deleted (renamed to .tsx)
decisions:
  - Admin layout is non-async and does NOT call getUser/createClient — middleware (Plan 01) is the single point of auth enforcement; a secondary check would add ~50ms per render with zero security benefit.
  - Admin has its OWN nav (AdminNav) instead of reusing AppNav — per D-02 the admin surface is utilitarian, not member-facing.
  - robots={index:false, follow:false} applied at /admin layout so all nested admin routes inherit the noindex by default (T-8-09 mitigation).
  - Test file renamed `.test.ts` → `.test.tsx` because test body renders JSX; the original Plan 01 stub was pure TS (it.todo only). Same filename in frontmatter intent; file extension reflects actual content type.
  - Zero-results state renders two Clear-search controls (the input X-icon with aria-label plus the body CTA with text) — test adjusted to use `getAllByRole` for this specific case; the happy-path `getByRole` assertion stays unambiguous because the CTA only appears in zero-results state.
metrics:
  duration_min: 5
  completed_date: 2026-04-22
requirements_completed: [ADMIN-01, ADMIN-02]
---

# Phase 8 Plan 02: Wave 1 Admin Layout + Overview + Members Summary

Admin chrome (route-group layout + top nav) plus the first two user-visible surfaces: stats dashboard at `/admin` (ADMIN-01) and members list at `/admin/members` (ADMIN-02), with real-time client-side search. The wife's first login lands on `/admin`, so the visual identity and the two primary list surfaces are now in place.

## What Was Built

### Task 02-01 — Admin layout + AdminNav component

**Files created:**
- `app/(admin)/layout.tsx` — 18 lines. Non-async Server Component with `<AdminNav />`, `<Toaster />`, and `robots: { index: false, follow: false }` metadata.
- `components/admin/AdminNav.tsx` — 47 lines. `'use client'` top nav with `usePathname()` active-link highlighting.

**Behavior:**
- Admin shell uses `bg-sage-bg` + `max-w-5xl` container (matches app-layout pattern).
- Brand lockup: `Barterkin Admin` (serif, forest-deep).
- 3 nav links: `Overview` (`/admin`), `Members` (`/admin/members`), `Contacts` (`/admin/contacts`).
- Sign-out: POST form to `/auth/signout` (existing route from AUTH-05).
- `isActive()` helper: exact-match for `/admin`, `startsWith` for nested routes — prevents Overview link from always showing active.

**Security:**
- No `getUser`, `getClaims`, or `createClient` in the layout — middleware (Plan 01) is the single point of enforcement.
- `ADMIN_EMAIL` never referenced in client-accessible code; layout has no env var access.
- `robots.noindex` metadata bubbles through to all `/admin/*` routes by default.

**Commit:** `5e79aa1`

### Task 02-02 — Stats dashboard page + StatusBadge component

**Files created:**
- `app/(admin)/page.tsx` — 72 lines. Server Component, `await getAdminStats()`, renders 3 cards.
- `components/admin/StatusBadge.tsx` — 20 lines. Reusable badge: `Banned` (destructive tint), `Published` (sage-light+forest), `Unpublished` (secondary variant).

**Behavior:**
- H1: `Admin` (serif 32px forest-deep).
- Subheading: `Welcome back. Here's what's happening on Barterkin.`
- 3 stat cards in `grid-cols-1 md:grid-cols-3`:
  - `Total members` → `stats.totalMembers` (no helper)
  - `Contacts sent` → `stats.totalContacts` + `All time` helper
  - `New members this week` → `stats.newThisWeek` + `Last 7 days` helper
- Stat values: Display typography `text-[32px] font-bold text-clay font-sans leading-[1.15]` — clay is the single accent per UI-SPEC.
- Each card has a lucide icon (`Users`, `Mail`, `UserPlus`) with `aria-hidden="true"`.

**Constraints honored:**
- No `'use client'` (Server Component per D-14).
- No polling / `useEffect` (D-16: server-side fetch only).
- "Last 7 days" helper (Pitfall 5: avoid calendar-week ambiguity).

**Commit:** `ba56eab`

### Task 02-03 — Members list page + MembersTable + fill search tests

**Files created:**
- `app/(admin)/members/page.tsx` — 23 lines. Server Component, `await getAdminMembers()`, passes to `<MembersTable>`.
- `components/admin/MembersTable.tsx` — 123 lines. Client Component, `useDeferredValue` search, semantic `<table>` layout, 3-state render (empty / zero-results / table).

**Files modified:**
- `tests/unit/admin-members-search.test.tsx` (was `.test.ts`) — replaced 5 `it.todo` + 1 smoke placeholder with 6 real RTL assertions. All 6 tests green.

**Behavior:**
- Subheading: `{N} Georgian(s) on the directory.` (singular/plural handled).
- Search input: placeholder `Search by name…`, `aria-label="Search members by display name"`, Search icon left, X button right (conditional on `query.length > 0`).
- Real-time filter: `useDeferredValue(query).trim().toLowerCase()` → `Array.prototype.filter` → case-insensitive `includes` against `display_name ?? ''`.
- Keyboard: `Escape` clears the query.
- States:
  - Empty (members.length === 0): `No members yet.` heading + helper copy.
  - Zero-results (filtered.length === 0 && members.length > 0): `No matches for "{query}".` + `Clear search` CTA button.
  - Table: 4 columns (`Name`, `County`, `Joined`, `Status`), avatar + name cell is a focusable `<Link>` to `/admin/members/{id}`, `formatJoined()` uses `en-US` short-month format, StatusBadge per row.
- Accessibility: semantic `<thead>`/`<tbody>` + `scope="col"`; touch-target `min-h-[44px]` on name cell.

**Test fix (Rule 1):**
- `admin-members-search.test.ts` → `.test.tsx` rename because the filled test body renders JSX (`<MembersTable members={...} />`). Vite's oxc transformer rejects JSX in `.ts`. Rename kept content identical; the original stub was pure TypeScript with only `it.todo()` calls.

**Test assertion adjustment:**
- Plan specified `getByRole('button', { name: /Clear search/i })` for the zero-results assertion. But zero-results state renders TWO buttons matching that name (input X-icon with `aria-label="Clear search"` + body CTA with text "Clear search"), so RTL throws "found multiple elements". Adjusted to `getAllByRole(...).length >= 1`. Happy-path (with query, rows visible) still uses `getByRole` since only the X-icon has that aria-label then.

**Commit:** `4487ff6`

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Worktree had no `node_modules`**
- **Found during:** Task 02-01 verify (`pnpm typecheck`).
- **Issue:** Fresh worktree was missing `node_modules`; typecheck errored with `tsc: command not found`.
- **Fix:** Symlinked `node_modules` → `/Users/ashleyakbar/barterkin/node_modules` (worktree-local, not tracked). Same approach Plan 01 used.
- **Files modified:** none committed.
- **Commit:** n/a.

**2. [Rule 3 - Blocking] Plan + Patterns files missing from worktree base**
- **Found during:** Execution start.
- **Issue:** Worktree base `72b4696` does not contain `08-02-PLAN.md` or `08-PATTERNS.md` (both untracked in the main repo, Plan 01 SUMMARY noted the same pattern).
- **Fix:** Copied from `/Users/ashleyakbar/barterkin/.planning/phases/…` into the worktree. Not committed — plan authoring is out of this plan's scope.

**3. [Rule 1 - Bug] Test file extension wrong**
- **Found during:** Task 02-03 `pnpm test` — Vite oxc transformer emitted `[PARSE_ERROR] Expected '>' but found 'Identifier'` on line 29 (`render(<MembersTable …/>)`).
- **Issue:** Plan 01 stub was `.test.ts` (pure TS, no JSX). Filling in the body added JSX, which `.ts` files cannot parse.
- **Fix:** `git mv admin-members-search.test.ts admin-members-search.test.tsx` — rename only, identical frontmatter intent. All 6 tests green after rename.
- **Files modified:** deleted `tests/unit/admin-members-search.test.ts`, created `tests/unit/admin-members-search.test.tsx`.
- **Commit:** `4487ff6` (combined with Task 02-03).

**4. [Rule 1 - Bug] Ambiguous test query in zero-results assertion**
- **Found during:** Task 02-03 test run — "Found multiple elements with the role 'button' and name /Clear search/i".
- **Issue:** Zero-results state renders TWO buttons named "Clear search" (the input X-icon via `aria-label`, and the body CTA via text). Plan specified `getByRole` which requires exactly one match.
- **Fix:** Switched to `getAllByRole(...).length >= 1` for the zero-results assertion only. The happy-path (typing a matching query) still uses `getByRole` unambiguously because only the X-icon has that name when the table is visible.
- **Files modified:** `tests/unit/admin-members-search.test.tsx` (only).
- **Commit:** `4487ff6`.

### Out-of-scope / deferred

**`lib/data/landing.ts` pre-existing typecheck errors:** Lines 93, 107, 108 still throw 3 TS errors unrelated to Phase 8 — first flagged in Plan 01 SUMMARY. Not in scope for this plan.

## Authentication Gates

None. The admin layout deliberately does NOT call `getUser` or `getClaims`; all auth enforcement lives in middleware (Plan 01). Once `ADMIN_EMAIL` is set in Vercel env vars (reminder from Plan 01), the wife can hit `/admin` and see the new surfaces immediately.

## Verification Results

**Typecheck:** No new errors introduced by this plan. Pre-existing `lib/data/landing.ts` errors remain (out of scope per Plan 01).

**Vitest suite:**
- `tests/unit/admin-members-search.test.tsx` — 6/6 passing (`renders all rows`, `filters case-insensitive`, `zero-results state`, `clears via X button`, `Escape clears`, `empty state`).
- Full suite post-plan: `15 passed | 8 skipped (23 files)`, `158 passed | 29 skipped | 10 todo` (up from 152 baseline). Plan 01 `admin-data.test.ts` stubs untouched and still green.

**useDeferredValue confirmed working in test harness:** `fireEvent.change` synchronously dispatches the onChange handler; React flushes state + the deferred hook returns the latest value on the next render, which RTL observes synchronously. No manual flush or `act(...)` wrap needed.

**Build sanity (not executed):** `pnpm build` not run — worktree is sandboxed and the full build-probe lives at orchestrator level. Typecheck + Vitest are the sufficient pre-merge gates.

## Known Stubs

None for this plan — Plan 02 fills in ADMIN-02 search stubs completely. Remaining `it.todo` / `test.fixme` counts in the repo all belong to Plans 03 + 04:
- `tests/unit/admin-data.test.ts` — 6 `it.todo` (ADMIN-01 integration tests; Plan 03 fills)
- `tests/e2e/admin-*.spec.ts` — 9 `test.fixme` (Plans 03 + 04)

## Self-Check: PASSED

**Files exist:**
- FOUND: app/(admin)/layout.tsx
- FOUND: app/(admin)/page.tsx
- FOUND: app/(admin)/members/page.tsx
- FOUND: components/admin/AdminNav.tsx
- FOUND: components/admin/MembersTable.tsx
- FOUND: components/admin/StatusBadge.tsx
- FOUND: tests/unit/admin-members-search.test.tsx

**Commits:**
- FOUND: 5e79aa1 feat(08-02): add admin route group layout + AdminNav
- FOUND: ba56eab feat(08-02): add admin stats dashboard + StatusBadge
- FOUND: 4487ff6 feat(08-02): add admin members list + MembersTable + fill search tests
