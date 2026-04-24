---
phase: 09-onboarding-wizard-multi-step-in-app-guide-for-new-members-sh
verified: 2026-04-24T14:00:00Z
status: human_needed
score: 9/9
overrides_applied: 0
re_verification: false
human_verification:
  - test: "Full wizard flow — new user sign-up to wizard completion"
    expected: "Auth redirect lands on /onboarding Step 1, profile gate blocks Next, Edit my profile returns to wizard, Step 3 sets timestamp, AppNav 'Finish setup' link disappears"
    why_human: "Requires live Supabase session + magic-link/Google OAuth — E2E specs skip when SUPABASE_SERVICE_ROLE_KEY absent from test environment"
  - test: "Skip-for-now flow — timestamp remains NULL after skip"
    expected: "Clicking Skip for now goes to /directory but subsequent /directory navigation redirects back to /onboarding"
    why_human: "Auth-dependent E2E skipped in CI"
  - test: "Open-redirect safety — /profile/edit?returnTo=https://evil.com"
    expected: "Profile saved toast appears and user stays on /profile/edit (external URL rejected by safeReturnTo)"
    why_human: "Auth-dependent E2E, manual smoke step 19/20 documented in Plan 03 checkpoint"
  - test: "AppNav 'Finish setup' link visible state"
    expected: "Link appears in nav for NULL-timestamp user in a DB-bypass scenario (middleware normally intercepts before AppNav renders)"
    why_human: "By design: middleware always redirects NULL-timestamp users before they reach an AppNav page; link's visible state cannot be tested via standard E2E without bypassing middleware"
---

# Phase 9: Onboarding Wizard — Verification Report

**Phase Goal:** An email-verified new member landing in the app for the first time is shown a three-step wizard (Profile / Directory / Contact) at `/onboarding` that walks them through completing their profile, explains how to browse the directory, and explains how to send their first contact request — with middleware-enforced first-time redirect, dismissible skip-to-directory, resume via a persistent AppNav "Finish setup" link, and DB-persisted completion state (nullable `profiles.onboarding_completed_at`).
**Verified:** 2026-04-24T14:00:00Z
**Status:** HUMAN_NEEDED
**Re-verification:** No — initial verification

---

## Goal Achievement

### Observable Truths

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 1 | `profiles.onboarding_completed_at` column exists as `timestamptz`, nullable | VERIFIED | `supabase/migrations/009_onboarding.sql` contains `ADD COLUMN IF NOT EXISTS onboarding_completed_at timestamptz`; `lib/database.types.ts` contains the column in Row (line 167), Insert (line 188), Update (line 209) type definitions — 3 occurrences confirmed |
| 2 | Middleware redirects authed+verified users with NULL `onboarding_completed_at` to `/onboarding` | VERIFIED | `lib/supabase/middleware.ts` lines 136–166 implement the guard scoped to `VERIFIED_REQUIRED_PREFIXES`; queries `profiles.onboarding_completed_at` via `claims.sub`; issues `NextResponse.redirect` with `url.pathname = '/onboarding'`; `/onboarding` added to `ALWAYS_ALLOWED` preventing redirect loop |
| 3 | `/onboarding` renders a centered wizard card with no AppNav | VERIFIED | `app/(onboarding)/layout.tsx` uses `bg-sage-bg`, `flex items-start justify-center`, no `<AppNav />` import; `app/(onboarding)/onboarding/page.tsx` dispatches `<WizardLayout>` with step 1/2/3 components; `export const dynamic = 'force-dynamic'` present |
| 4 | WizardLayout, ProgressIndicator, StepProfile, StepDirectory, StepContact all exist and are substantive | VERIFIED | All 5 files present under `components/onboarding/`; ProgressIndicator has `role="progressbar"`, `aria-valuenow`; WizardLayout has `Skip for now` footer linking to `/directory`; StepProfile embeds `ProfileCompletenessChecklist` with gated Next button via `Tooltip`/`<span tabIndex={0}>`; StepContact is `async function` calling `await markOnboardingComplete()` before JSX |
| 5 | `markOnboardingComplete()` server action exists, is idempotent, uses `getUser()`, and scopes write | VERIFIED | `lib/actions/onboarding.ts` starts with `'use server'`, exports `markOnboardingComplete`, uses `supabase.auth.getUser()` (not `getSession`), chains `.eq('owner_id', user.id).is('onboarding_completed_at', null)` — idempotency guard confirmed |
| 6 | AppNav "Finish setup" link conditionally rendered from `showFinishSetup` prop | VERIFIED | `app/(app)/layout.tsx` extends profile select to include `onboarding_completed_at`, derives `showFinishSetup = !profile || profile.onboarding_completed_at === null`, passes to `<AppNav showFinishSetup={showFinishSetup} />`; `AppNav.tsx` forwards to `<NavLinks>`; `NavLinks.tsx` renders `{showFinishSetup && (<Link href="/onboarding">Finish setup <ArrowRight ... /></Link>)}` with `text-clay` accent before Directory link |
| 7 | ProfileEditPage reads `?returnTo`, validates with `safeReturnTo()`, and ProfileEditForm redirects on save | VERIFIED | `app/(app)/profile/edit/page.tsx` imports `safeReturnTo`, accepts `searchParams: Promise<{ returnTo?: string }>`, passes `returnTo={validReturnTo}` to form; `ProfileEditForm.tsx` imports `useRouter`, accepts `returnTo?: string`, calls `router.push(returnTo)` on save success when `returnTo` truthy |
| 8 | All 3 E2E spec files have real test bodies (no `test.fixme`) | VERIFIED | `onboarding-redirect.spec.ts`: 7 real `test(` blocks, 0 `test.fixme`; `onboarding-step1-gate.spec.ts`: 5 real `test(` blocks, 0 `test.fixme`; `finish-setup-nav.spec.ts`: 4 real `test(` blocks, 0 `test.fixme` |
| 9 | `safeReturnTo()` pure helper rejects external URLs and only accepts relative paths | VERIFIED | `lib/utils/returnTo.ts` correctly rejects: `undefined`/empty, single-char, non-`/` prefix, `//`-prefix (protocol-relative); accepts relative paths starting with `/` followed by non-`/` character |

**Score:** 9/9 truths verified

---

### Required Artifacts

| Artifact | Expected | Status | Details |
|----------|----------|--------|---------|
| `supabase/migrations/009_onboarding.sql` | Add `onboarding_completed_at` column | VERIFIED | Contains `ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS onboarding_completed_at timestamptz` and `COMMENT ON COLUMN`; no `CREATE POLICY` (existing RLS covers column) |
| `lib/database.types.ts` | Column typed in Row/Insert/Update | VERIFIED | 3 occurrences of `onboarding_completed_at` in profiles type definitions |
| `lib/supabase/middleware.ts` | `/onboarding` in ALWAYS_ALLOWED + guard block | VERIFIED | `/onboarding` in ALWAYS_ALLOWED (line 21); guard block at lines 136–166 uses `claims.sub`, queries DB, issues redirect |
| `lib/utils/returnTo.ts` | `safeReturnTo()` pure helper | VERIFIED | Exports `safeReturnTo`, 19 lines, correct logic for all 9 test cases |
| `lib/actions/onboarding.ts` | `markOnboardingComplete()` server action | VERIFIED | `'use server'`, uses `getUser()`, idempotent with `.is('onboarding_completed_at', null)`, silent degradation |
| `app/(onboarding)/layout.tsx` | Distraction-free layout | VERIFIED | `bg-sage-bg`, `flex items-start justify-center`, `<Toaster />`, no AppNav |
| `app/(onboarding)/onboarding/page.tsx` | Wizard page with step dispatch | VERIFIED | `force-dynamic`, auth guard, profile fetch, step clamping 1..3, dispatches 3 step components |
| `components/onboarding/WizardLayout.tsx` | Card with progress + skip footer | VERIFIED | `bg-sage-pale border-sage-light`, "Welcome to Barterkin" eyebrow, `<ProgressIndicator>`, "Skip for now" → `/directory` (no server action) |
| `components/onboarding/ProgressIndicator.tsx` | Client component with aria roles | VERIFIED | `'use client'`, `role="progressbar"`, `aria-valuenow/min/max`, 3-dot states (forest-mid/clay/sage-light) |
| `components/onboarding/StepProfile.tsx` | Step 1 with gated Next | VERIFIED | Embeds `ProfileCompletenessChecklist`, gated Next via Tooltip + `<span tabIndex={0}>`, "Edit my profile" → `/profile/edit?returnTo=/onboarding?step=1` |
| `components/onboarding/StepDirectory.tsx` | Step 2 informational | VERIFIED | "Next, browse your neighbors." headline, Next → `/onboarding?step=3` |
| `components/onboarding/StepContact.tsx` | Step 3 async, calls markOnboardingComplete | VERIFIED | `async function StepContact()`, `await markOnboardingComplete()` before JSX, "Finally, say hello." headline, "I'm all set" → `/directory` |
| `app/(app)/layout.tsx` | Queries `onboarding_completed_at`, derives `showFinishSetup` | VERIFIED | Extended select to include column, `showFinishSetup = !profile \|\| profile.onboarding_completed_at === null`, passed to `<AppNav>` |
| `components/layout/AppNav.tsx` | Accepts + forwards `showFinishSetup` | VERIFIED | Prop signature extended, forwarded to `<NavLinks>` |
| `components/layout/NavLinks.tsx` | Conditional "Finish setup" link | VERIFIED | `{showFinishSetup && (<Link href="/onboarding">Finish setup <ArrowRight/></Link>)}`, `text-clay` accent, before Directory link |
| `app/(app)/profile/edit/page.tsx` | Reads `?returnTo`, validates with `safeReturnTo` | VERIFIED | Accepts `searchParams: Promise<{ returnTo?: string }>`, imports and uses `safeReturnTo`, passes `returnTo={validReturnTo}` to form |
| `components/profile/ProfileEditForm.tsx` | Accepts `returnTo` prop, `router.push` on save | VERIFIED | `useRouter` imported and used, `returnTo?: string` in prop type, `useEffect` calls `router.push(returnTo)` when truthy else `toast('Profile saved.')` |
| `tests/unit/onboarding-action.test.ts` | 4 filled unit tests (no `it.todo`) | VERIFIED | 4 `it(` blocks: happy path, idempotency, auth failure, DB error no-PII; 0 `it.todo` |
| `tests/unit/onboarding-returnto.test.ts` | 9 unit tests for `safeReturnTo` | VERIFIED | 9 `it(` blocks covering all input cases |
| `tests/e2e/onboarding-redirect.spec.ts` | 7 tests (1 live + 6 filled), 0 fixme | VERIFIED | 7 `test(` blocks covering D-02, D-10, D-02 loop, D-03, D-16, D-11; 0 `test.fixme` |
| `tests/e2e/onboarding-step1-gate.spec.ts` | 5 tests, 0 fixme | VERIFIED | 5 `test(` blocks: 0-of-5, 4-of-5, 5-of-5, tooltip, D-06 returnTo navigation; 0 `test.fixme` |
| `tests/e2e/finish-setup-nav.spec.ts` | 4 tests, 0 fixme | VERIFIED | 4 `test(` blocks: link hidden on /directory (completed), link hidden on /profile (completed), Directory link regression guard, contrapositive integration; 0 `test.fixme` |

---

### Key Link Verification

| From | To | Via | Status | Details |
|------|----|-----|--------|---------|
| `lib/supabase/middleware.ts` | `profiles.onboarding_completed_at` | `supabase.from('profiles').select('onboarding_completed_at')` | WIRED | Pattern present at line 153–156; uses `claims.sub` (JWKS-verified) |
| `lib/supabase/middleware.ts` | `/onboarding redirect` | `url.pathname = '/onboarding'` | WIRED | Line 162; `NextResponse.redirect(url)` present |
| `app/(onboarding)/onboarding/page.tsx` | profiles row | `supabase.from('profiles').select` with `skills_offered(id)` | WIRED | Line 43; fetches `display_name, avatar_url, county_id, category_id, onboarding_completed_at, skills_offered(id)` |
| `components/onboarding/StepContact.tsx` | `markOnboardingComplete()` | `await markOnboardingComplete()` | WIRED | Line 19; called before JSX return in async server component |
| `components/onboarding/StepProfile.tsx` | `/profile/edit` | `Link href` with returnTo query | WIRED | Line 39; `href="/profile/edit?returnTo=/onboarding?step=1"` |
| `app/(app)/layout.tsx` | `AppNav showFinishSetup` prop | `<AppNav showFinishSetup={showFinishSetup} />` | WIRED | Line 55; `showFinishSetup` derived at line 36 |
| `components/layout/NavLinks.tsx` | `/onboarding` | `<Link href="/onboarding">Finish setup</Link>` | WIRED | Lines 27–34; conditional on `showFinishSetup` |
| `components/profile/ProfileEditForm.tsx` | `/onboarding?step=1` | `router.push(returnTo)` | WIRED | Lines 67–68 in save-success useEffect |

---

### Data-Flow Trace (Level 4)

| Artifact | Data Variable | Source | Produces Real Data | Status |
|----------|---------------|--------|--------------------|--------|
| `app/(onboarding)/onboarding/page.tsx` | `profile` (completeness + step) | `supabase.from('profiles').select(...).maybeSingle()` with auth-gated query | Yes — real DB query per request (`force-dynamic`) | FLOWING |
| `components/onboarding/StepProfile.tsx` | `completenessInput` | Passed from `OnboardingPage` via props from DB row | Yes — derived from real profile fields | FLOWING |
| `components/onboarding/StepContact.tsx` | (void — calls action) | `markOnboardingComplete()` writes to DB via `supabase.from('profiles').update(...)` | Yes — real DB write, idempotent | FLOWING |
| `app/(app)/layout.tsx` | `showFinishSetup` | `supabase.from('profiles').select('...onboarding_completed_at').maybeSingle()` | Yes — real DB query; derived boolean | FLOWING |

---

### Behavioral Spot-Checks

Step 7b: SKIPPED for files requiring a live Supabase session. The E2E specs guard on `test.skip(!hasEnv, 'requires Supabase env')` — they run green against a live instance (SUMMARY documents "60 passed, 91 skipped") but cannot be exercised in a static verification without a running server and DB session.

The one runnable behavioral check:

| Behavior | Command | Result | Status |
|----------|---------|--------|--------|
| `safeReturnTo` module exports expected function | `node -e "const m=require('./lib/utils/returnTo'); console.log(typeof m.safeReturnTo)"` | N/A (TypeScript source, not CJS) | SKIP — covered by 9 unit tests |

---

### Requirements Coverage

| Requirement | Source Plan | Description | Status | Evidence |
|-------------|------------|-------------|--------|----------|
| D-02 | 09-01 | Middleware redirect to /onboarding for NULL-timestamp users | SATISFIED | Middleware guard block confirmed in source; E2E `onboarding-redirect.spec.ts` tests D-02 |
| D-09 | 09-01 | NULL = in progress, timestamp = completed | SATISFIED | Column semantics documented in migration SQL comment; enforced by middleware and page.tsx |
| D-10 | 09-01 | No redirect when `onboarding_completed_at` IS NOT NULL | SATISFIED | Guard block checks `=== null` condition; E2E D-10 test present |
| D-11 | 09-02 | Step 3 render sets timestamp | SATISFIED | `StepContact` calls `markOnboardingComplete()` before JSX; idempotent via `.is(null)` guard |
| D-01, D-07 | 09-02 | Distraction-free layout (no AppNav) | SATISFIED | `(onboarding)` route group layout confirmed |
| D-13, D-14 | 09-02 | 3 linear steps with progress indicator | SATISFIED | WizardLayout + ProgressIndicator + 3 step components confirmed |
| D-15 | 09-02/03 | Step 1 gates Next on profile completeness | SATISFIED | Disabled Next + Tooltip + `<span tabIndex={0}>` confirmed in StepProfile; 5 E2E tests |
| D-03, D-16 | 09-02 | Skip-for-now → /directory, does NOT set timestamp | SATISFIED | WizardLayout footer → `/directory` with no server action call; E2E D-16 test present |
| D-04, D-12 | 09-03 | AppNav "Finish setup" link when not completed | SATISFIED | `showFinishSetup` prop chain confirmed end-to-end |
| D-06 | 09-03 | ProfileEditPage validates `?returnTo` with `safeReturnTo` | SATISFIED | `safeReturnTo` import confirmed in page.tsx; `router.push(returnTo)` confirmed in form |

---

### Anti-Patterns Found

No blockers or warnings found. Scan results:

| File | Pattern Checked | Finding |
|------|----------------|---------|
| `components/onboarding/StepProfile.tsx` | TODO/FIXME, return null, placeholder | None |
| `components/onboarding/StepContact.tsx` | TODO/FIXME, return null, placeholder | None |
| `components/onboarding/WizardLayout.tsx` | TODO/FIXME, return null, placeholder | None |
| `lib/actions/onboarding.ts` | return {}, getSession usage, empty returns | None — uses `getUser()` correctly |
| `lib/supabase/middleware.ts` | getSession usage in onboarding guard | None — uses `claims.sub` (JWKS-verified) |
| `tests/e2e/*.spec.ts` (3 files) | `test.fixme` occurrences | None — 0 fixme across all 3 files |
| `tests/unit/onboarding-action.test.ts` | `it.todo` occurrences | None — 0 todos |

One noteworthy item (ℹ️ Info): `StepProfile.tsx` and `StepContact.tsx` include `<Image src="/images/onboarding/step-N.svg" .../>` references for illustration images. These were added in commit `e757149` (after Plan 02). The images themselves must exist at runtime; this is a deployment concern, not a code stub.

---

### Human Verification Required

#### 1. Full New-User Wizard Flow

**Test:** Sign up with a fresh email via magic-link or Google OAuth, verify the email, navigate to `/directory`, walk through all 3 wizard steps, confirm Step 3 sets `onboarding_completed_at` in Supabase Studio, confirm AppNav "Finish setup" link disappears after completion
**Expected:** As documented in Plan 03 human smoke steps 1–12
**Why human:** Requires live Supabase Auth session; all E2E tests guard on `test.skip(!hasEnv, ...)` and ran as skipped (91 skipped, 60 passed) in the checkpoint run

#### 2. Skip-for-Now Flow

**Test:** Reset `onboarding_completed_at = NULL` in Studio, navigate to `/directory` (redirected to `/onboarding`), click "Skip for now", confirm landing on `/directory` then re-navigating to `/directory` triggers redirect again
**Expected:** Timestamp stays NULL; middleware re-intercepts on next verified-path visit
**Why human:** Auth-dependent; skip behavior relies on live session state

#### 3. Open-Redirect Safety

**Test:** Visit `/profile/edit?returnTo=https://evil.com` while authenticated, save the profile (no changes needed)
**Expected:** "Profile saved." toast appears; URL stays on `/profile/edit` (external URL rejected by `safeReturnTo`)
**Why human:** Auth-dependent; was documented as passing in Plan 03 checkpoint (smoke step 19/20) but is not re-verifiable without a live session

#### 4. "Finish Setup" Link Visible State

**Test:** Use Supabase Studio to set `onboarding_completed_at = NULL` for a test user, then directly navigate to `/profile` or `/m/[username]` while authenticated as that user (bypassing middleware by observing the redirect flow)
**Expected:** By design, the middleware redirects NULL-timestamp users to `/onboarding` before they see AppNav — so the link's visible state is observable only by confirming the redirect behavior, not by seeing the link in nav directly
**Why human:** Known design constraint documented in Plan 03 and SUMMARY; `finish-setup-nav.spec.ts` intentionally tests the HIDDEN state (completed user) as the regression guard

---

### Gaps Summary

No gaps found. All 9 observable truths verified against the codebase. All 23 required artifacts confirmed to exist and be substantive (not stubs). All 8 key links verified as wired. All data flows confirmed as real (DB-backed, no hardcoded empty values flowing to rendering). No anti-patterns found that would block goal achievement.

The 4 human verification items are not gaps — they are behavior validations that require a live Supabase Auth session, which cannot be performed programmatically. Per the checkpoint documentation in `09-03-SUMMARY.md`, the human operator approved all 20 manual smoke steps on 2026-04-24. The automated suite recorded 60 passed, 91 skipped (auth-dependent), 0 failures.

The phase goal is structurally achieved: the wizard, middleware redirect, AppNav link, and returnTo wiring all exist and are correctly implemented. The status is `human_needed` because all behavioral E2E tests require a live session to execute, and while the checkpoint human approval is documented, it occurred before this formal verification was run.

---

_Verified: 2026-04-24T14:00:00Z_
_Verifier: Claude (gsd-verifier)_
