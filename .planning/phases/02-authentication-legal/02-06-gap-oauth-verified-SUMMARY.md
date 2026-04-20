---
phase: 02-authentication-legal
plan: "06"
subsystem: auth
tags: [supabase, oauth, google, middleware, email-verify, nextjs]

# Dependency graph
requires:
  - phase: 02-authentication-legal
    provides: "getClaims()-based middleware verify gate (plans 02-01 through 02-05)"
provides:
  - "OAuth-aware getUser() fallback in middleware — Google OAuth users bypass /verify-pending"
  - "E2E regression test at tests/e2e/oauth-verified-gate.spec.ts"
affects:
  - 03-profile-georgia-gate
  - 04-directory
  - future-apple-oauth

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "getClaims() fast path → getUser() fallback only on narrow failure path (authed + claims-unverified + verified-only-path)"
    - "isVerifiedOnlyPath computed once, reused in fallback condition and redirect condition to stay in sync"
    - "app_metadata.provider trusted for OAuth verification; user_metadata.email_verified never trusted (T-2-08)"

key-files:
  created:
    - tests/e2e/oauth-verified-gate.spec.ts
  modified:
    - lib/supabase/middleware.ts

key-decisions:
  - "getUser() chosen as fallback primitive over trusting claims further — pulls authoritative auth.users row; getSession() remains banned"
  - "isVerified changed from const to let so getUser() fallback can flip it true without code duplication"
  - "Provider whitelist limited to 'google' only — Apple deferred to Capacitor milestone per D-AUTH-XX"
  - "email_confirmed_at truthy alone is sufficient — covers magic-link users who verified but have a missing claim"
  - "Fallback runs only in the narrow triple condition: authed AND claims-unverified AND verified-only-path"
  - "Status assertion removed from E2E test: /directory returns 404 pre-Phase4 (expected — test guards URL, not status)"

patterns-established:
  - "Rule 1 auto-fix: E2E test spec adjusted — plan's status assertion (toBeLessThan(400)) was incorrect for Phase 2 state where /directory is a 404; critical URL assertion retained"

requirements-completed:
  - AUTH-01
  - AUTH-04

# Metrics
duration: 15min
completed: 2026-04-20
---

# Phase 02 Plan 06: OAuth-Aware Verify Gate Gap Fix Summary

**getUser() fallback added to middleware so Google OAuth users land at /directory instead of /verify-pending when claims.email_verified is absent from the access token**

## Performance

- **Duration:** ~15 min
- **Started:** 2026-04-20T02:00:00Z
- **Completed:** 2026-04-20T02:15:16Z
- **Tasks:** 2
- **Files modified:** 2

## Accomplishments

- Fixed UAT Gap 2 (major): Google OAuth users were incorrectly redirected to `/verify-pending` after sign-in because Google JWTs may omit `email_verified` at the access-token claim surface that `getClaims()` reads
- Added OAuth-aware `getUser()` fallback that runs only in the narrow case: authed + claims-unverified + verified-only-path. Cost is at most one extra Auth-server round-trip (~50ms) per affected request; zero impact on verified users, unauthed users, or non-gated paths
- Added E2E regression test guarding against unauthed users being incorrectly sent to `/verify-pending`, and confirming the gate target page renders

## Before / After: `lib/supabase/middleware.ts` verify-gate block

**Before (lines 43–75, single-pass claims check):**
```typescript
const isVerified = !!claims?.email_verified   // const — can't be updated

// AUTH-04: unverified users are gated out of verified-only prefixes
if (
  isAuthed
  && !isVerified
  && VERIFIED_REQUIRED_PREFIXES.some((p) => pathname.startsWith(p))
  && !ALWAYS_ALLOWED.some((p) => pathname.startsWith(p))
) {
  // redirect to /verify-pending — INCORRECTLY fires for Google OAuth users
}
```

**After (with getUser() fallback):**
```typescript
let isVerified = !!claims?.email_verified     // let — fallback can flip it true

const isVerifiedOnlyPath =
  VERIFIED_REQUIRED_PREFIXES.some((p) => pathname.startsWith(p))
  && !ALWAYS_ALLOWED.some((p) => pathname.startsWith(p))

// AUTH-04 + AUTH-01 (UAT Gap 2 fix): OAuth users may lack email_verified claim
if (isAuthed && !isVerified && isVerifiedOnlyPath) {
  const { data: userData } = await supabase.auth.getUser()
  const user = userData?.user
  if (user) {
    const provider = user.app_metadata?.provider as string | undefined
    if (user.email_confirmed_at || provider === 'google') {
      isVerified = true   // flip — no redirect
    }
  }
}

// AUTH-04: only redirects if fallback didn't upgrade isVerified
if (isAuthed && !isVerified && isVerifiedOnlyPath) {
  // redirect to /verify-pending — now only fires for genuinely unverified users
}
```

## Why getUser() is the right primitive

- `getSession()` is banned on all server paths (CLAUDE.md, PITFALLS Pitfall 1) — reads cookie without revalidation
- `getClaims()` is the preferred fast path — JWKS-verified, no round-trip. But RESEARCH PITFALL 4 warned that Google's `id_token` JWT may omit `email_verified` at the access-token claim surface
- `getUser()` pulls the authoritative `auth.users` row and revalidates the JWT against the Auth server. `email_confirmed_at` is Supabase-managed (set when verification email is clicked). `app_metadata.provider` is also server-managed and cannot be spoofed by the user
- Using `getUser()` only as a narrow fallback (not the primary path) keeps the ~50ms Auth-server round-trip off the hot path for the vast majority of requests

## Narrow trigger condition

All three conditions must be true for the fallback to fire:
1. `isAuthed` — claims.sub is present (valid session)
2. `!isVerified` — claims.email_verified is falsy (fast path says unverified)
3. `isVerifiedOnlyPath` — request is for `/directory`, `/m/`, or `/profile` AND not in ALWAYS_ALLOWED

This means: already-verified users (most requests) pay zero extra cost. Unauthed users pay zero extra cost. The fallback fires only for the specific failure mode where an OAuth provider omitted the claim.

## Apple OAuth follow-up note

The provider whitelist is currently `provider === 'google'` only. Apple Sign-In is deferred to the Capacitor milestone (D-AUTH-XX). When Apple is added, append:
```typescript
if (user.email_confirmed_at || provider === 'google' || provider === 'apple') {
```
Apple also verifies email at the provider level, making this safe. The comment in the code already documents this.

## Task Commits

1. **Task 1: OAuth-aware getUser() fallback in middleware verify gate** - `139785e` (fix)
2. **Task 2: E2E regression test — magic-link unverified gate still works** - `5e502c9` (test)

**Plan metadata:** (see final commit below)

## Files Created/Modified

- `lib/supabase/middleware.ts` — Added `isVerifiedOnlyPath` constant, changed `isVerified` to `let`, added `getUser()` fallback block before the redirect
- `tests/e2e/oauth-verified-gate.spec.ts` — New E2E test: unauthed /directory → not /verify-pending; /verify-pending renders; live OAuth case marked `test.fixme` for manual UAT re-run of test 10

## Decisions Made

- `getUser()` is the right fallback primitive — authoritative row, server-managed fields only
- `const` → `let` for `isVerified` avoids duplicating the redirect condition
- `isVerifiedOnlyPath` computed once and reused — both the fallback and the redirect conditions use the same predicate, so they can't drift out of sync
- Apple deferred from provider whitelist — adding now would be premature (no Apple OAuth in Phase 2)
- E2E test status assertion removed (Rule 1 auto-fix): `/directory` returns 404 in Phase 2 because the page isn't built until Phase 4; the critical guard is the URL assertion (not at `/verify-pending`)

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Removed incorrect status assertion from E2E test**
- **Found during:** Task 2 (E2E test execution)
- **Issue:** Plan spec included `expect(resp?.status() ?? 200).toBeLessThan(400)` but `/directory` returns 404 in the current Phase 2 state (page not built until Phase 4). Test failed with `Received: 404`.
- **Fix:** Removed the status line; retained the critical URL assertion (`not.toHaveURL(/\/verify-pending/)`) and added a comment explaining why status is 404 at this phase
- **Files modified:** `tests/e2e/oauth-verified-gate.spec.ts`
- **Verification:** `pnpm playwright test tests/e2e/oauth-verified-gate.spec.ts` → 2 passed, 1 skipped
- **Committed in:** `5e502c9` (Task 2 commit)

---

**Total deviations:** 1 auto-fixed (Rule 1 — bug in plan spec, test assertion incorrect for Phase 2 state)
**Impact on plan:** Test guards the correct behavior (URL not /verify-pending). Status check was misleading in Phase 2 context and would also fail in CI.

## Issues Encountered

- `node_modules` missing in worktree — ran `pnpm install` before typecheck. Not a code issue; worktrees start without dependencies.

## Re-tested UAT Items

- **Test 10 (Live Google OAuth):** Marked `test.fixme` in the regression spec. Must be manually re-run to confirm the fix: navigate to `/login`, complete Turnstile, click "Continue with Google", confirm landing at `/directory` (not `/verify-pending`).

## User Setup Required

None — no external service configuration required for this fix.

## Next Phase Readiness

- AUTH-01 (Google OAuth) + AUTH-04 (verify gate) now coexist correctly
- `lib/supabase/middleware.ts` is the final state for Phase 2; Phase 3/4 may extend `VERIFIED_REQUIRED_PREFIXES` as new routes are added
- Apple provider expansion point documented in code comment

---
*Phase: 02-authentication-legal*
*Completed: 2026-04-20*

## Self-Check: PASSED

- `lib/supabase/middleware.ts` exists: FOUND
- `tests/e2e/oauth-verified-gate.spec.ts` exists: FOUND
- Commit `139785e` exists: FOUND
- Commit `5e502c9` exists: FOUND
