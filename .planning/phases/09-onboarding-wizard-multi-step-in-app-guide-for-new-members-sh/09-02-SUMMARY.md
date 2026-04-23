---
phase: 09
plan: 02
subsystem: onboarding-wizard-ui
tags:
  - ui
  - route-group
  - server-action
  - wizard
  - tdd
dependency_graph:
  requires:
    - "09-01 (profiles.onboarding_completed_at column + middleware guard + safeReturnTo)"
    - "components/profile/ProfileCompletenessChecklist.tsx"
    - "lib/schemas/profile.ts (isProfileComplete + ProfileCompletenessInput)"
  provides:
    - "app/(onboarding)/layout.tsx — distraction-free layout, no AppNav"
    - "lib/actions/onboarding.ts — markOnboardingComplete() idempotent server action"
    - "components/onboarding/* — 5 wizard step components"
    - "app/(onboarding)/onboarding/page.tsx — /onboarding route, step dispatch"
  affects:
    - "Middleware redirect flow (plans now lands at a rendered /onboarding page)"
tech_stack:
  added:
    - "app/(onboarding)/ route group (distraction-free layout)"
    - "components/onboarding/ component directory"
  patterns:
    - "Async server component calling server action during render (StepContact → markOnboardingComplete)"
    - "Idempotent UPDATE guarded by .is(null) predicate"
    - "Tooltip wrapping disabled Button via <span tabIndex={0}> (Radix requirement)"
    - "step param clamped server-side: Math.max(1, Math.min(3, ...))"
key_files:
  created:
    - app/(onboarding)/layout.tsx
    - lib/actions/onboarding.ts
    - tests/unit/onboarding-action.test.ts
    - components/onboarding/ProgressIndicator.tsx
    - components/onboarding/WizardLayout.tsx
    - components/onboarding/StepProfile.tsx
    - components/onboarding/StepDirectory.tsx
    - components/onboarding/StepContact.tsx
    - app/(onboarding)/onboarding/page.tsx
  modified: []
decisions:
  - "StepContact calls markOnboardingComplete() during render (not on button click) — reaching Step 3 = done per D-11"
  - "Skip-for-now links to /directory and does NOT call any action — preserves onboarding_completed_at IS NULL (D-16)"
  - "Step param clamped server-side to 1..3 to prevent query-param tampering (T-9-07)"
  - "Silent degradation on markOnboardingComplete failure — step still renders, middleware handles retry"
metrics:
  duration: "~10 minutes"
  completed: "2026-04-22"
  tasks: 4
  files: 9
---

# Phase 9 Plan 02: Onboarding Wizard UI Summary

**One-liner:** Built the 3-step onboarding wizard at `/onboarding` with distraction-free layout, server-action completion tracking, and idempotent DB writes guarded by `.is('onboarding_completed_at', null)`.

---

## What Was Built

### Route Group Layout

`app/(onboarding)/layout.tsx` — mirrors `app/(auth)/layout.tsx` exactly: no AppNav, `bg-sage-bg`, `flex items-start justify-center`. Includes `<Toaster position="bottom-right" />` for Plan 03's toast on "I'm all set".

### Server Action

`lib/actions/onboarding.ts` — `markOnboardingComplete()`:
- Uses `getUser()` (not `getSession()`) per CLAUDE.md mandate
- `.eq('owner_id', user.id)` scopes write to authenticated user
- `.is('onboarding_completed_at', null)` makes it idempotent — second call is DB no-op
- Silent degradation: `console.error` logs only `{ code }`, never PII

### Unit Tests (4 passing)

`tests/unit/onboarding-action.test.ts` — all 4 `it.todo` stubs from Plan 01 filled:
1. Happy path: authed user with NULL timestamp → `{ ok: true }`, `from('profiles')` called
2. Idempotency: two consecutive calls both return `{ ok: true }` (PostgREST returns no error for 0-row UPDATE)
3. Auth failure: `getUser()` returns null → `{ ok: false }`, `from` never called
4. DB error: `console.error` called with `{ code: '23503' }` only — PII assertions confirm no `foreign key violation` or email in log

### Wizard Components

`components/onboarding/ProgressIndicator.tsx` — `'use client'` component with `role="progressbar"`, `aria-valuenow/min/max`, 3-dot states (completed=forest-mid, active=clay, inactive=sage-light).

`components/onboarding/WizardLayout.tsx` — Card shell with:
- Eyebrow: "Welcome to Barterkin"
- ProgressIndicator header
- Body slot (children)
- Skip-for-now footer → `/directory` (no server action call, preserves NULL state)

`components/onboarding/StepProfile.tsx` — embeds `ProfileCompletenessChecklist`, gated Next button:
- Disabled state: wrapped in `<span tabIndex={0}>` for Tooltip trigger on disabled control
- Enabled state: `<Link href="/onboarding?step=2">`
- Edit CTA: `href="/profile/edit?returnTo=/onboarding?step=1"` (Plan 03 must wire `safeReturnTo()` in ProfileEditForm)

`components/onboarding/StepDirectory.tsx` — informational step, Next always active → `/onboarding?step=3`.

`components/onboarding/StepContact.tsx` — `async function StepContact()`:
- Calls `await markOnboardingComplete()` BEFORE returning JSX (D-11)
- "I'm all set" button → `/directory`
- "Find someone to contact" button → `/directory`

### Onboarding Page

`app/(onboarding)/onboarding/page.tsx`:
- `export const dynamic = 'force-dynamic'`
- `getUser()` auth guard → `redirect('/login')` if unauthenticated
- Fetches profile + `skills_offered(id)` via `.maybeSingle()` (handles no-profile-row case)
- `redirect('/directory')` if `onboarding_completed_at` already set (belt-and-braces)
- Step param clamped: `Math.max(1, Math.min(3, ...))`
- Dispatches StepProfile / StepDirectory / StepContact under WizardLayout

---

## Copy Contract (verbatim — for Plan 03 E2E fixture reference)

| Location | String |
|----------|--------|
| Eyebrow (all steps) | `Welcome to Barterkin` |
| Step counter | `Step {N} of 3` |
| Skip link | `Skip for now` |
| Step 1 headline | `First, finish your profile.` |
| Step 1 body | `Neighbors find you by county, category, and the skills you offer. Fill in these five and you're on the map.` |
| Step 1 edit CTA | `Edit my profile →` |
| Step 1 disabled Next | `Next` (tooltip: `Finish all five to continue`) |
| Step 1 enabled Next | `Next: browse the directory →` |
| Step 2 headline | `Next, browse your neighbors.` |
| Step 2 body | `Filter by county and category. Search by keyword. Every profile you see is a real Georgian with an email-verified account.` |
| Step 2 browse CTA | `Browse the directory →` |
| Step 2 Next | `Next: send your first hello →` |
| Step 3 headline | `Finally, say hello.` |
| Step 3 body | `Find someone whose skills match yours. Send a short note through Barterkin — their reply lands in your inbox. No fees. No middlemen.` |
| Step 3 find CTA | `Find someone to contact →` |
| Step 3 finish | `I'm all set` |

---

## Component Prop Contracts (for Plan 03 E2E fixtures)

### StepProfile
```typescript
{
  completenessInput: ProfileCompletenessInput  // { displayName, avatarUrl, countyId, categoryId, skillsOfferedCount }
  profileComplete: boolean
}
```

### WizardLayout
```typescript
{
  currentStep: number   // 1 | 2 | 3
  children: React.ReactNode
}
```

### ProgressIndicator
```typescript
{
  currentStep: number
  totalSteps?: number   // defaults to 3
}
```

---

## returnTo Link Contract (for Plan 03)

`StepProfile.tsx` has a hardcoded link: `href="/profile/edit?returnTo=/onboarding?step=1"`

Plan 03 MUST wire `ProfileEditPage` and `ProfileEditForm` to:
1. Read `searchParams.returnTo`
2. Pass through `safeReturnTo()` from `lib/utils/returnTo.ts` (already built in Plan 01)
3. After successful save, call `router.push(returnTo)` instead of `toast('Profile saved.')`

Without this wiring, the "Edit my profile" CTA returns to `/profile/edit` after save, breaking the Step 1 flow.

---

## Commits

| Task | Commit | Description |
|------|--------|-------------|
| Task 1 | `126fd73` | Route-group layout + markOnboardingComplete server action |
| Task 2 | `758a185` | 4 unit tests for markOnboardingComplete (TDD fill) |
| Task 3 | `0d3082c` | 5 wizard components under components/onboarding/ |
| Task 4 | `8b979a7` | /onboarding page — server component step dispatch |

---

## Verification Results

- `pnpm typecheck`: only pre-existing errors (lib/actions/contact.ts, lib/data/landing.ts) — no new errors
- `pnpm vitest run tests/unit/onboarding-action.test.ts`: 4 passed, 0 failed
- `pnpm vitest run` (full suite): 171 passed, 36 skipped, 4 todo — no regressions

---

## Deviations from Plan

None — plan executed exactly as written.

---

## Threat Surface Scan

No new network endpoints, auth paths, or schema changes beyond what the plan's threat model documents:
- `/onboarding` page is behind `redirect('/login')` gate
- `markOnboardingComplete()` scoped to authenticated user via `getUser()` + `.eq('owner_id')`
- All threats in register (T-9-07 through T-9-11) are mitigated as designed

---

## Known Stubs

None. All components render real data from the profile row fetched in `OnboardingPage`. `StepProfile` embeds `ProfileCompletenessChecklist` which evaluates actual profile fields. No hardcoded empty values flow to UI rendering.

---

## Self-Check: PASSED

- [x] `app/(onboarding)/layout.tsx` exists — contains `bg-sage-bg`, `flex items-start justify-center`, `Toaster`
- [x] `lib/actions/onboarding.ts` exists — starts with `'use server'`, exports `markOnboardingComplete`, contains `.is('onboarding_completed_at', null)`, uses `getUser()`
- [x] `tests/unit/onboarding-action.test.ts` — 4 `it(` blocks (not `it.todo`), all 4 passing
- [x] `components/onboarding/ProgressIndicator.tsx` — `'use client'`, `role="progressbar"`, `aria-valuenow`
- [x] `components/onboarding/WizardLayout.tsx` — `Skip for now`, `href="/directory"`, no server action call
- [x] `components/onboarding/StepProfile.tsx` — headline `First, finish your profile.`, `returnTo=/onboarding?step=1`, Tooltip + `<span tabIndex={0}>`
- [x] `components/onboarding/StepDirectory.tsx` — headline `Next, browse your neighbors.`, link to `/onboarding?step=3`
- [x] `components/onboarding/StepContact.tsx` — `async function StepContact`, `await markOnboardingComplete()` before JSX, headline `Finally, say hello.`, `I'm all set`
- [x] `app/(onboarding)/onboarding/page.tsx` — `isProfileComplete`, `searchParams`, `WizardLayout`, `redirect('/login')`, `redirect('/directory')`
- [x] Commits `126fd73`, `758a185`, `0d3082c`, `8b979a7` exist in git log
