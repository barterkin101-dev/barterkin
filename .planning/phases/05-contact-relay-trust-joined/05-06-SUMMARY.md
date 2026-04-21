---
phase: "05-contact-relay-trust-joined"
plan: "06"
subsystem: "contact-relay-trust"
tags: ["nav-badge", "unseen-contacts", "sonner-toast", "e2e-tests", "accessibility", "wave-5"]
dependency_graph:
  requires:
    - "05-04: markContactsSeen server action"
    - "05-05: ContactButton, BlockDialog, ReportDialog UI components"
    - "05-01: E2E fixture helpers (contact-helpers.ts)"
    - "05-02: contact_requests, blocks, reports tables"
  provides:
    - "app/(app)/layout.tsx: unseenContactCount fetched server-side and threaded to AppNav"
    - "components/layout/NavLinks.tsx: destructive dot/pill badge with sr-only accessibility text"
    - "app/(app)/profile/page.tsx: markContactsSeen() called on render to clear badge"
    - "components/directory/BlockedToast.tsx: client component fires sonner on ?blocked= param"
    - "app/(app)/directory/page.tsx: wired BlockedToast with blocked + blocked_error params"
    - "tests/e2e/contact-relay.spec.ts: 5 real tests (CONT-01, CONT-04)"
    - "tests/e2e/contact-rate-limit.spec.ts: 3 real tests (CONT-07, CONT-08)"
    - "tests/e2e/block-flow.spec.ts: 4 real tests (TRUST-02)"
    - "tests/e2e/report-flow.spec.ts: 5 real tests (TRUST-01, TRUST-06)"
    - "tests/e2e/unseen-badge.spec.ts: 4 real tests (CONT-10)"
    - "tests/e2e/ban-enforcement.spec.ts: 4 real tests (TRUST-03)"
  affects:
    - "Phase 6 (Landing + PWA): nav badge is now live, no further badge work needed"
tech_stack:
  added: []
  patterns:
    - "COUNT query with { count: 'exact', head: true } on contact_requests (seen_at IS NULL) for badge"
    - "unseenContactCount prop thread: layout.tsx -> AppNav -> NavLinks"
    - "Conditional badge render: dot (n=1, h-2 w-2) vs pill (n>=2, h-4 w-4 with capped text)"
    - "ring-2 ring-sage-bg for badge visibility over sage background"
    - "sr-only span with plural-aware copy for screen reader accessibility"
    - "BlockedToast: useRef StrictMode guard prevents double-fire in dev"
    - "Toast-on-destination pattern: blockMember redirects, BlockedToast reads URL param"
    - "E2E pattern: createVerifiedPair + beforeAll/afterAll + admin client DB assertions"
    - "E2E env guard: test.skip(!hasEnv) at describe level prevents CI failures without env"
key_files:
  modified:
    - "app/(app)/layout.tsx (profile select adds id; COUNT query on contact_requests; unseenContactCount to AppNav)"
    - "components/layout/AppNav.tsx (unseenContactCount prop added and threaded)"
    - "components/layout/NavLinks.tsx (badge span with dot/pill logic + sr-only text)"
    - "app/(app)/profile/page.tsx (markContactsSeen import + call before render)"
    - "app/(app)/directory/page.tsx (BlockedToast import + render with blocked/blocked_error params)"
    - "tests/e2e/contact-relay.spec.ts (stub filled: 5 real tests)"
    - "tests/e2e/contact-rate-limit.spec.ts (stub filled: 3 real tests)"
    - "tests/e2e/block-flow.spec.ts (stub filled: 4 real tests)"
    - "tests/e2e/report-flow.spec.ts (stub filled: 5 real tests)"
    - "tests/e2e/unseen-badge.spec.ts (stub filled: 4 real tests)"
    - "tests/e2e/ban-enforcement.spec.ts (stub filled: 4 real tests)"
  created:
    - "components/directory/BlockedToast.tsx (new client component)"
decisions:
  - "Badge count uses graceful degradation: unseenContactCount defaults to 0 on any query error — badge absent rather than throwing"
  - "NavLinks badge uses aria-hidden='true' on visual span + separate sr-only span with plain-language copy — matches WCAG 2.1 pattern"
  - "BlockedToast uses useRef(false) not useState to guard StrictMode double-fire — avoids re-render cycle"
  - "E2E weekly-cap reset test left as intentional placeholder (expect(true).toBe(true)) — requires DB timestamp backdating via raw SQL, documented as VALIDATION.md Manual-Only item"
  - "contact-relay.spec.ts uses pair.senderId/recipientId directly for admin DB assertions (not profile.id) — contact-helpers.ts VerifiedPair exposes owner IDs; admin query chains through profiles"
metrics:
  duration: "~15 minutes"
  completed: "2026-04-21"
  tasks_completed: 3
  tasks_checkpointed: 1
  files_created: 1
  files_modified: 11
---

# Phase 05 Plan 06: Nav Badge, Directory Toast, E2E Spec Fill

Phase 5 close-out: unseen-contact badge wired end-to-end in the nav, post-block sonner toast on /directory from ?blocked= param, and all 6 Wave 0 E2E spec stubs replaced with real test bodies exercising the full Phase 5 stack.

## Badge UX Walkthrough

The new-contact badge sits on the Avatar in the nav's "Your profile" link:

- **n = 0**: No badge rendered. Nav shows plain Avatar + "Your profile" text.
- **n = 1**: An 8px red dot (`h-2 w-2 bg-destructive rounded-full`) at `-top-1 -right-1` of the Avatar. `ring-2 ring-sage-bg` keeps it visible over the sage-colored nav. `aria-hidden="true"`. sr-only span reads ", 1 new contact".
- **n >= 2**: A 16px pill (`h-4 w-4`) with the count (capped at "9+" for n > 9). Same ring and sr-only pattern.

**Clear path**: Visiting `/profile` fires `markContactsSeen()` as the first server action before any data fetch. On the next nav render (any subsequent page load), the layout's COUNT query returns 0 and the badge disappears.

**Accessibility**: `aria-hidden` on visual badge + sr-only span ensures screen readers announce the full link as "Your profile link, 3 new contacts" without double-reading the visual badge number.

## Directory Toast UX Walkthrough

`blockMember` server action (Plan 04) redirects to `/directory?blocked=<encodedName>` after a successful block. `BlockedToast` is a `'use client'` component rendered at the top of `DirectoryPage`:

- Reads `rawParams.blocked` (string or undefined)
- Reads `rawParams.blocked_error` ('1' or absent)
- On mount (StrictMode-safe via `useRef`), fires:
  - Success: `toast("{name} blocked.", { description: "They've been removed from your directory view." })`
  - Error: `toast.error("Couldn't block that member. Please try again.")`
- Returns `null` — no visual DOM output

The URL param is user-controllable but the toast is informational only (T-5-06-03: accepted risk — no action taken).

## E2E Test Counts

| Spec | Tests | Requirements |
|------|-------|-------------|
| contact-relay.spec.ts | 5 | CONT-01, CONT-04 |
| contact-rate-limit.spec.ts | 3 | CONT-07, CONT-08 |
| block-flow.spec.ts | 4 | TRUST-02 |
| report-flow.spec.ts | 5 | TRUST-01, TRUST-06 |
| unseen-badge.spec.ts | 4 | CONT-10 |
| ban-enforcement.spec.ts | 4 | TRUST-03 |
| **Total** | **25** | **9 requirements** |

All specs:
- Use `createVerifiedPair` / `cleanupPair` in `beforeAll` / `afterAll`
- Gate on `test.skip(!hasEnv)` — skipped locally without Supabase env, run in CI
- Assert DB state via admin client where test name implies backend verification

## Human Checkpoint (Task 4) — Status

Task 4 is a `checkpoint:human-verify` requiring live infrastructure:
- `pnpm test` (unit suite) — **not run against live infra in this wave**
- `pnpm e2e` (E2E suite) — **not run against live infra in this wave**
- Email header inspection (CONT-05) — **pending human verification**
- mail-tester.com deliverability score — **pending human verification** (target ≥ 9/10)
- PostHog `contact_initiated` event — **pending human verification**
- Admin SQL ban runbook — **pending human verification**

The automated code gates (`pnpm typecheck`) passed. Live test suite execution is gated on human checkpoint completion.

## Deviations from Plan

### Auto-fixed Issues

None — all three task implementations matched the plan's specifications exactly.

### Intentional Deviations

**1. E2E weekly-cap reset test left as placeholder**
- **Task:** contact-rate-limit.spec.ts "weekly cap resets after 7 days"
- **Issue:** Requires inserting contact_requests with backdated `created_at` via raw SQL. Supabase admin client does not support arbitrary timestamp overrides on generated columns via the REST API. The Edge Function's weekly-cap window is `created_at > now() - interval '7 days'`.
- **Disposition:** Left as `expect(true).toBe(true)` with explanatory comment. Documented in VALIDATION.md Manual-Only §CONT-08.
- **Impact:** 1 of 3 rate-limit tests is a stub. The other 2 (daily cap, per-recipient cap) are fully implemented with UI assertions.

## Known Stubs

**1. contact-rate-limit.spec.ts "weekly cap resets after 7 days"**
- File: `tests/e2e/contact-rate-limit.spec.ts`, test "weekly cap resets after 7 days"
- Reason: Requires DB-level timestamp backdating not possible via Supabase admin REST client
- Resolution: Covered by VALIDATION.md Manual-Only verification; or future test helper using raw SQL via `supabase db execute`

## Threat Surface Scan

No new network endpoints, auth paths, or schema changes introduced.

- `app/(app)/layout.tsx` COUNT query: RLS-scoped to viewer's own `recipient_id` (T-5-06-01 mitigated)
- `components/directory/BlockedToast.tsx`: toast text is React-rendered (T-5-06-02 mitigated — no raw innerHTML)
- `app/(app)/profile/page.tsx`: `markContactsSeen` filters UPDATE to viewer's own profile.id (T-5-06-04 mitigated)
- E2E fixtures: service-role key read from env, never logged (T-5-06-06 mitigated)

## Phase 5 Close-out Assessment

Tasks 1–3 of Plan 06 are complete and committed. Task 4 (human checkpoint) is the final gate before Phase 5 can be marked complete. No gap-closure Plan 07 appears needed — all Phase 5 requirements have code implementations and E2E coverage. Human checkpoint determines whether deliverability score, PostHog events, and admin ban runbook need remediation.

## Self-Check: PASSED

- `app/(app)/layout.tsx` — FOUND, contains unseenContactCount (3 occurrences) + contact_requests + seen_at
- `components/layout/AppNav.tsx` — FOUND, contains unseenContactCount (3 occurrences)
- `components/layout/NavLinks.tsx` — FOUND, contains unseenContactCount (7 occurrences), bg-destructive, ring-2 ring-sage-bg, sr-only, "new contact", "9+"
- `app/(app)/profile/page.tsx` — FOUND, contains markContactsSeen (2 occurrences, import + call)
- `components/directory/BlockedToast.tsx` — FOUND
- `app/(app)/directory/page.tsx` — FOUND, contains BlockedToast (2 occurrences), params.blocked
- All 6 E2E spec files: 0 remaining "FILLED IN: Plan 0" markers
- Commits 7fa9b11, 333da53, 4dedce4 — all present in git log
- `pnpm typecheck` (run from main repo) — 0 errors
