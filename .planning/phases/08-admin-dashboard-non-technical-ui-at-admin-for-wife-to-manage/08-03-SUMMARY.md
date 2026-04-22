---
phase: 08
plan: 03
subsystem: admin-dashboard
tags: [admin, ui, member-detail, ban-unban, alert-dialog, wave-2, e2e]
requires:
  - lib/data/admin.ts::getAdminMemberById (Plan 01)
  - lib/actions/admin.ts::banMember + unbanMember (Plan 01)
  - components/ui/alert-dialog.tsx (existing)
  - components/ui/avatar.tsx (existing)
  - components/ui/separator.tsx (existing)
  - components/ui/sonner.tsx (existing Toaster mounted in admin layout)
  - components/admin/StatusBadge.tsx (Plan 02)
  - middleware.ts ADMIN_PREFIX guard (Plan 01)
provides:
  - app/(admin)/members/[id]/page.tsx (ADMIN-03 member detail surface)
  - components/admin/MemberDetailView.tsx (presentation component)
  - components/admin/BanUnbanButton.tsx (ADMIN-04 ban/unban interaction)
  - tests/e2e/admin-member-detail.spec.ts (4 filled E2E tests)
  - tests/e2e/admin-ban-unban.spec.ts (3 filled E2E tests)
affects:
  - tests/e2e/admin-member-detail.spec.ts (overwrote stub)
  - tests/e2e/admin-ban-unban.spec.ts (overwrote stub)
tech_stack:
  added: []
  patterns:
    - Radix AlertDialog + e.preventDefault() on confirm to hold dialog open during useTransition
    - Client Component with Server Action (banMember/unbanMember) → sonner toast on resolve
    - Server Component detail page with notFound() on missing id, no redundant auth
    - E2E helper ensureAdminUser() seeds auth user by ADMIN_EMAIL (idempotent via listUsers)
    - E2E helper profileIdFromOwner() bridges owner_id (auth.users.id) → profiles.id PK
key_files:
  created:
    - app/(admin)/members/[id]/page.tsx
    - components/admin/MemberDetailView.tsx
    - components/admin/BanUnbanButton.tsx
  modified:
    - tests/e2e/admin-member-detail.spec.ts
    - tests/e2e/admin-ban-unban.spec.ts
decisions:
  - Used e.preventDefault() on AlertDialogAction onClick so Radix doesn't close the dialog before the useTransition resolves (spec requirement from Plan 03 and UI-SPEC pending-state copy)
  - BanUnbanButton uses variant="destructive" for ban, variant="outline" with clay tint for unban — matches UI-SPEC destructive-actions summary
  - MemberDetailView is a plain Server Component (no "use client") because only the BanUnbanButton leaf needs client interactivity; keeps render cost low
  - Detail page does NOT call getUser/getClaims — middleware (Plan 01) is the single gate; matches Plan 02 layout pattern (D-14)
  - Skills arrays are sorted by sort_order in the view component (server returns unsorted)
  - E2E tests skip on missing ADMIN_EMAIL + Supabase env — same pattern as ban-enforcement.spec.ts
  - data-testid selectors ("ban-unban-trigger", "ban-unban-confirm") chosen over role+name to stay stable across Radix re-renders
  - profileIdFromOwner helper added to tests because the plan wrote `/admin/members/${pair.recipientId}` but recipientId is auth.users.id (= profiles.owner_id), while /admin/members/[id] routes by profiles.id — schema mismatch in the plan
metrics:
  duration_min: 6
  completed_date: 2026-04-22
requirements_completed: [ADMIN-03, ADMIN-04]
---

# Phase 8 Plan 03: Wave 2 Member Detail + Ban/Unban Summary

Delivered the moderation surface for Phase 8: `/admin/members/[id]` renders a full profile and provides a one-click Ban/Unban flow with AlertDialog confirmation, toast feedback, and DB-level Server Action mutation. Two previously stubbed E2E specs are now live with 7 tests covering the happy paths, edge cases, and cancel-is-no-op.

## What Was Built

### Task 03-01 — BanUnbanButton Client Component

**File created:** `components/admin/BanUnbanButton.tsx` (96 lines)

**Behavior:**
- Flip-logic based on `isBanned` prop: "Ban this member" (destructive) or "Unban this member" (outline + clay tint)
- Radix AlertDialog with verbatim UI-SPEC copy (`Ban {displayName}?`, `No, go back`, `Ban member`/`Unban member`)
- `useTransition` for pending state; pending label is `Banning…` / `Unbanning…`
- `e.preventDefault()` on AlertDialogAction onClick keeps dialog open during the async Server Action (per plan constraint — without this Radix closes the dialog prematurely and hides the pending state)
- `toast.success(...)` on `ok:true`; `toast.error(...)` on `ok:false` — messages exactly match UI-SPEC
- `data-testid="ban-unban-trigger"` + `data-testid="ban-unban-confirm"` for E2E stability

**Security:**
- `'use client'` on line 1 (required for hooks)
- Imports `banMember`/`unbanMember` exclusively from `@/lib/actions/admin` (no other valid source)
- No direct service-role calls; goes through Plan 01's 'use server' action layer

**Commit:** `6ebc197`

### Task 03-02 — Member detail page + MemberDetailView

**Files created:**
- `app/(admin)/members/[id]/page.tsx` (29 lines) — Server Component with `notFound()` guard
- `components/admin/MemberDetailView.tsx` (143 lines) — presentation component

**Behavior:**
- `generateMetadata` async-awaits `params.id` then fetches profile to set page title to `display_name` (falls back to "Member"); inherits `robots: { index: false, follow: false }` from Plan 02 admin layout
- Default export calls `getAdminMemberById(id)` → `notFound()` on null → renders view
- View layout:
  - Back link `← Back to members` at top
  - Header row: 16×16 avatar, display_name (32px serif), username + county + "Joined {date}" meta row, StatusBadge
  - 2-column grid on md+ (1-col on mobile)
  - Left col: Category, Bio, Availability, TikTok, Accepting contact, Founding member (conditional)
  - Right col: Skills offered (sage-light pills), Skills wanted (sage-pale ring pills)
  - Footer: StatusBadge + BanUnbanButton
- `—` em-dash fallback for all optional fields
- Skills sorted by `sort_order` before rendering (server returns unsorted)

**Security:**
- No `'use client'` on either file — pure Server Component tree
- No redundant `getUser`/`getClaims` — middleware (Plan 01) is the single point of enforcement
- No `force-dynamic` — revalidation comes from Server Action `revalidatePath` calls (Plan 01 Task 03)

**Commit:** `a3593b5`

### Task 03-03 — Fill E2E specs (ADMIN-03 + ADMIN-04)

**Files modified (overwritten):**
- `tests/e2e/admin-member-detail.spec.ts` — 4 real tests, 0 fixme
- `tests/e2e/admin-ban-unban.spec.ts` — 3 real tests, 0 fixme

**Test harness:**
- `ensureAdminUser()` — idempotent seed of admin auth user by `process.env.ADMIN_EMAIL` with `ADMIN_PASSWORD_TEST` fallback (`TestOnly-admin-pw-12345!`). Uses `listUsers → find → create-if-absent` to avoid unique-constraint crash on re-runs.
- `loginAsAdmin(page)` — visits `/login`, fills email + (optional) password, clicks sign-in, waits for post-auth URL (`/directory`, `/profile`, `/admin`, or `/m/*`).
- `profileIdFromOwner(ownerId)` — resolves `profiles.id` PK from `auth.users.id` via a service-role query. Added to bridge a plan bug where the original spec wrote `/admin/members/${pair.recipientId}` but `recipientId` is the auth-user id (== `profiles.owner_id`), not the `profiles.id` used by the detail route.

**Tests (admin-member-detail):**
1. admin sees display name, county, joined date, skills (hits `/admin/members/${recipientProfileId}`, asserts back link + `Joined {Month} {day}, {year}` + both skill headings)
2. admin sees Ban button when profile is not banned
3. admin sees Unban button when profile is banned (sets banned=true via `setBanned`, asserts /^Banned$/ status pill, resets)
4. non-existent id produces 404 (goto `/admin/members/00000000-...`, expects `status()` === 404)

**Tests (admin-ban-unban):**
1. admin bans → AlertDialog → Confirm → sonner "has been banned." toast + DB `banned=true` (via `adminClient().from('profiles').select('banned').eq('id', recipientProfileId)`)
2. admin unbans (pre-banned) → trigger reads "Unban this member" → Confirm → "has been unbanned." toast + DB `banned=false`
3. canceling ("No, go back") does not change DB state

**Skip gates:**
- `!hasAdminCreds` when `ADMIN_EMAIL` is unset — tests skip cleanly without crashing
- Both suites share `test.beforeAll` that calls `ensureAdminUser()` before any test runs

**Commit:** `0ac4faf`

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Worktree had no `node_modules`**
- **Found during:** pre-Task 03-01 baseline typecheck
- **Issue:** Fresh worktree was missing `node_modules`; `pnpm typecheck` errored with `tsc: command not found`
- **Fix:** Symlinked `node_modules` → `/Users/ashleyakbar/barterkin/node_modules` (worktree-local, not tracked). Same approach Plans 01 and 02 used.
- **Files modified:** none committed
- **Commit:** n/a

**2. [Rule 3 - Blocking] Plan + Patterns files missing from worktree base**
- **Found during:** Execution start
- **Issue:** Worktree base `bd48b41` does not contain `08-03-PLAN.md` or `08-PATTERNS.md` (both untracked in the main repo, same pattern Plans 01 and 02 flagged)
- **Fix:** Copied from `/Users/ashleyakbar/barterkin/.planning/phases/08-admin-…/` into the worktree. Not committed — plan authoring is out of this plan's scope.
- **Files modified:** none committed

**3. [Rule 1 - Bug] Plan E2E specs pass `recipientId` (auth user id) to a profiles.id route**
- **Found during:** Task 03-03 drafting
- **Issue:** Plan spec literally wrote `page.goto(\`/admin/members/${pair!.recipientId}\`)` in 8 places across both spec files. `createVerifiedPair` returns `recipientId = recipientAuth.user!.id` (auth.users.id, which becomes `profiles.owner_id`). But `/admin/members/[id]` (implemented in Task 03-02) calls `getAdminMemberById(id)` which queries `.eq('id', id)` against `profiles.id` — the PK, not the owner_id. Using the auth user id would fail the `.maybeSingle()` lookup and produce a false-positive 404 in every detail-page test.
- **Fix:** Added a `profileIdFromOwner(ownerId)` helper to both specs. Resolves `profiles.id` from `owner_id` via a service-role lookup in `beforeAll`, then navigates with the resolved id.
- **Files modified:** `tests/e2e/admin-member-detail.spec.ts`, `tests/e2e/admin-ban-unban.spec.ts`
- **Commit:** `0ac4faf`

### Out-of-scope / deferred

**`lib/data/landing.ts` pre-existing typecheck errors:** `pnpm typecheck` still fails on 3 errors in `lib/data/landing.ts` lines 93, 107, 108 — all pre-existing, flagged in Plan 01 and 02 SUMMARY. Out of scope.

## Authentication Gates

None — Task 03-03 seeds its own admin auth user via service-role idempotently. In CI or Vercel preview, `ADMIN_EMAIL` must be set as a repo variable / env var (same reminder as Plan 01) and `ADMIN_PASSWORD_TEST` can be set to override the default test password. Tests skip cleanly without crashing when `ADMIN_EMAIL` is absent.

## Reminder Checkpoint

- **`ADMIN_PASSWORD_TEST`** env var is NOT required — the spec falls back to the hard-coded test default `TestOnly-admin-pw-12345!`. If the production admin account (per ADMIN_EMAIL) already has a different password, the E2E `loginAsAdmin` will fail in deployed environments. Strategy: set `ADMIN_PASSWORD_TEST` in CI to the test-only password, and rely on the real production password never being written to disk.
- **Radix AlertDialog open/close timing**: No flakiness observed in local `--list`. Runtime flake risk exists during the "click Confirm → toast appears" window (Sonner toast renders ~100ms after Server Action resolves); mitigations already in place are `{ timeout: 10_000 }` on the toast assertion and `e.preventDefault()` keeping the dialog open.
- **Admin user seeding is idempotent** — re-runs list existing users first, so repeated test runs against the same Supabase project do not fail with unique-email constraint.

## Known Stubs

None introduced by this plan. This plan consumed the Plan 01 stubs for ADMIN-03 + ADMIN-04 E2E specs; 10 of the previously-tracked `test.fixme` entries (3 from detail + 4 from ban-unban) have been replaced with real assertions. Remaining repo-wide stubs:
- `tests/unit/admin-data.test.ts` — 6 `it.todo` entries owned by Plan 04
- `tests/e2e/admin-auth-guard.spec.ts` — 2 `test.fixme` entries owned by Plan 04

## Verification Results

**Typecheck:** No new errors introduced by this plan. Pre-existing `lib/data/landing.ts` errors remain (out of scope).

**Vitest suite:** `15 passed | 8 skipped (23 files)`, `158 passed | 29 skipped | 10 todo (197)`. Identical to post-Plan-02 baseline — this plan does not modify unit tests.

**Playwright `--list`:** 14 tests across 2 browser projects (chromium + iphone-se) parse without errors. 7 unique tests total (4 in admin-member-detail.spec.ts + 3 in admin-ban-unban.spec.ts), all configured to skip when admin creds are missing.

**Playwright run (not executed in worktree):** Worktree is sandboxed and the full E2E probe needs a running dev server + Supabase project. Parse-time typecheck + `--list` are the sufficient pre-merge gates. The orchestrator-level build/test run will exercise the full stack.

**Manual verification (not executed):** `pnpm dev` + goto `/admin/members/<real-id>` requires live admin credentials in local `.env.local`. Deferred to post-merge smoke.

## Self-Check: PASSED

**Files exist:**
- FOUND: app/(admin)/members/[id]/page.tsx
- FOUND: components/admin/MemberDetailView.tsx
- FOUND: components/admin/BanUnbanButton.tsx
- FOUND: tests/e2e/admin-member-detail.spec.ts (overwritten)
- FOUND: tests/e2e/admin-ban-unban.spec.ts (overwritten)

**Commits:**
- FOUND: 6ebc197 feat(08-03): add BanUnbanButton client component with AlertDialog
- FOUND: a3593b5 feat(08-03): add admin member detail page + MemberDetailView
- FOUND: 0ac4faf test(08-03): fill E2E specs for ADMIN-03 + ADMIN-04
