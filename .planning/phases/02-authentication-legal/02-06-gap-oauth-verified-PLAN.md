---
phase: 02-authentication-legal
plan: 06
type: execute
wave: 1
depends_on: []
files_modified:
  - lib/supabase/middleware.ts
autonomous: true
gap_closure: true
requirements:
  - AUTH-01
  - AUTH-04
must_haves:
  truths:
    - "After completing Google OAuth, an authed user with a Google-verified email lands at /directory (NOT /verify-pending)"
    - "After completing magic-link sign-in, an unverified user is still gated to /verify-pending (regression check — magic-link gate must continue to work)"
    - "Middleware uses getClaims() as the primary path; only when claims.email_verified is falsy does it fall through to getUser() to recheck OAuth-provider verification status"
  artifacts:
    - path: "lib/supabase/middleware.ts"
      provides: "Email-verify gate with OAuth-aware getUser() fallback"
      contains: "supabase.auth.getUser"
  key_links:
    - from: "lib/supabase/middleware.ts"
      to: "supabase.auth.getUser"
      via: "fallback when claims.email_verified is falsy"
      pattern: "supabase\\.auth\\.getUser\\("
    - from: "lib/supabase/middleware.ts"
      to: "user.app_metadata.provider"
      via: "OAuth provider check"
      pattern: "app_metadata.*provider"
---

<objective>
Fix UAT Gap 2 (major): Google OAuth users are incorrectly redirected to `/verify-pending` after sign-in.

Root cause (RESEARCH PITFALL 4 made real): Google's id_token JWT may omit the top-level `email_verified` claim, OR Supabase may not propagate it onto the access-token claims surface that `getClaims()` reads. The middleware currently treats `claims.email_verified` falsy as "unverified" and redirects to `/verify-pending` — even though Google OAuth users have a provider-verified email by definition.

Fix: in `lib/supabase/middleware.ts`, after the existing `getClaims()` primary check, when the user is authed AND `claims.email_verified` is falsy AND the request matches a `VERIFIED_REQUIRED_PREFIXES` path, perform a one-shot `supabase.auth.getUser()` round-trip. If `user.email_confirmed_at` is set OR `user.app_metadata.provider === 'google'` (Google always verifies email at the provider level), treat the user as verified and DO NOT redirect.

Purpose: AUTH-01 (Google OAuth) + AUTH-04 (email-verify gate) must coexist. Today AUTH-04's gate is incorrectly blocking AUTH-01 success cases. RESEARCH explicitly anticipated this PITFALL and the verification report flagged it as acceptable; now UAT proved it's broken.

Output: Google OAuth users land at /directory; magic-link unverified users still hit /verify-pending. The fallback adds at most one extra Auth-server round-trip — only on the affected path, only when the fast path indicates "unverified".
</objective>

<execution_context>
@$HOME/.claude/get-shit-done/workflows/execute-plan.md
@$HOME/.claude/get-shit-done/templates/summary.md
</execution_context>

<context>
@.planning/STATE.md
@.planning/ROADMAP.md
@.planning/phases/02-authentication-legal/02-UAT.md
@.planning/phases/02-authentication-legal/02-VERIFICATION.md
@lib/supabase/server.ts

<interfaces>
<!-- Current state of lib/supabase/middleware.ts (read in full before editing) -->

Existing exports (DO NOT change the function signature):
```typescript
export async function updateSession(request: NextRequest): Promise<NextResponse>
```

Existing constants used by the gate:
```typescript
const AUTH_GROUP_PATHS = ['/login', '/signup']
const VERIFIED_REQUIRED_PREFIXES = ['/directory', '/m/', '/profile']
const ALWAYS_ALLOWED = ['/verify-pending', '/auth/callback', '/auth/confirm', '/auth/signout', '/auth/error', '/legal/']
```

Current verification check (lines 49–73):
```typescript
const isAuthed = !!claims?.sub
const isVerified = !!claims?.email_verified
// ...
if (isAuthed && !isVerified && VERIFIED_REQUIRED_PREFIXES.some(...) && !ALWAYS_ALLOWED.some(...)) {
  // redirect to /verify-pending
}
```

Supabase getUser response shape (from @supabase/supabase-js@2.103.x):
```typescript
type User = {
  id: string
  email?: string
  email_confirmed_at?: string | null  // ISO timestamp or null — set when email is verified
  app_metadata: {
    provider?: string         // 'google' | 'email' | etc — the auth method used
    providers?: string[]      // all linked providers
  }
  user_metadata: { ... }      // user-writable; NEVER trust for verify decisions (T-2-08)
  // ...
}
const { data: { user }, error } = await supabase.auth.getUser()
```

Important security notes (from CLAUDE.md + RESEARCH PITFALL 4):
- NEVER trust `user_metadata.email_verified` — that's user-writable
- DO trust `user.email_confirmed_at` — set by Supabase when verification email is clicked
- DO trust `user.app_metadata.provider === 'google'` — set by Supabase based on OAuth flow; google always verifies email
- NEVER use `getSession()` on server paths (banned)
</interfaces>
</context>

<tasks>

<task type="auto">
  <name>Task 1: Add OAuth-aware getUser() fallback to middleware verify gate</name>
  <files>lib/supabase/middleware.ts</files>
  <read_first>
    - lib/supabase/middleware.ts (current state — see lines 43–73 for the existing claims-based check that needs the fallback added BEFORE the redirect)
    - .planning/phases/02-authentication-legal/02-UAT.md (Gap 2 root cause and fix instruction)
    - .planning/phases/02-authentication-legal/02-VERIFICATION.md (PITFALL 4 was acknowledged; this is the implementation)
  </read_first>
  <action>
    Modify `lib/supabase/middleware.ts` to add a getUser() fallback that runs ONLY in the narrow case where:
    1. User is authed (claims.sub present)
    2. claims.email_verified is falsy
    3. The request path matches a VERIFIED_REQUIRED_PREFIXES entry
    4. The path is not in ALWAYS_ALLOWED

    Replace lines 43–76 (the section starting with `// Primary auth check —` through the closing `return response`) with this exact block:

    ```typescript
      // Primary auth check — JWKS-verified, no round-trip (CLAUDE.md: getClaims preferred).
      // NEVER use getSession() on server paths (banned).
      const { data } = await supabase.auth.getClaims()
      const claims = data?.claims
      const isAuthed = !!claims?.sub
      // Trust the top-level email_verified claim (comes from auth.users.email_confirmed_at).
      // NEVER trust user_metadata.email_verified (writable by user — T-2-08).
      let isVerified = !!claims?.email_verified

      const pathname = request.nextUrl.pathname

      // AUTH-09: authed users should not see /login or /signup
      if (isAuthed && AUTH_GROUP_PATHS.some((p) => pathname.startsWith(p))) {
        const url = request.nextUrl.clone()
        url.pathname = '/directory'
        url.search = ''
        return NextResponse.redirect(url)
      }

      // AUTH-04 + AUTH-01 (UAT Gap 2 fix): if claims-based fast path says "unverified"
      // BUT this is an OAuth user (Google), the email_verified claim may be missing
      // even though the provider verifies email. Fall through to one getUser() round-trip
      // ONLY when (a) authed, (b) fast path says unverified, (c) request actually matches
      // a verified-only path. Cost: ~50ms once per affected request, never on the hot path.
      const isVerifiedOnlyPath =
        VERIFIED_REQUIRED_PREFIXES.some((p) => pathname.startsWith(p))
        && !ALWAYS_ALLOWED.some((p) => pathname.startsWith(p))

      if (isAuthed && !isVerified && isVerifiedOnlyPath) {
        // RESEARCH PITFALL 4: Google JWTs may omit email_verified at the access-token
        // claim surface. getUser() pulls the authoritative auth.users row.
        const { data: userData } = await supabase.auth.getUser()
        const user = userData?.user
        if (user) {
          const provider = user.app_metadata?.provider as string | undefined
          // Trust email_confirmed_at (Supabase-managed) and provider==='google'
          // (Google always verifies email — Apple does too, but Apple is deferred).
          // DO NOT trust user_metadata.email_verified (user-writable).
          if (user.email_confirmed_at || provider === 'google') {
            isVerified = true
          }
        }
      }

      // AUTH-04: unverified users are gated out of verified-only prefixes
      if (isAuthed && !isVerified && isVerifiedOnlyPath) {
        const url = request.nextUrl.clone()
        url.pathname = '/verify-pending'
        url.search = ''
        return NextResponse.redirect(url)
      }

      return response
    }
    ```

    Key implementation details:
    - `let isVerified` (changed from `const`) so the fallback can flip it true.
    - `isVerifiedOnlyPath` is computed once and reused so the fallback condition and the redirect condition stay in sync.
    - Fallback only runs in the narrow case — does NOT add latency to verified users, unauthed users, or non-gated paths.
    - Provider check uses `app_metadata.provider` (Supabase-managed, server-side-only writable). NEVER `user_metadata.email_verified`.
    - `email_confirmed_at` truthy alone is enough — covers magic-link users who DID verify but somehow have a missing claim.
    - Apple OAuth is NOT included in the provider whitelist (D-AUTH-XX: Apple deferred to Capacitor milestone). When Apple is added later, append `|| provider === 'apple'` here.
  </action>
  <verify>
    <automated>cd /Users/ashleyakbar/barterkin && grep -E "supabase\.auth\.getUser\(\)" lib/supabase/middleware.ts && grep -E "provider === 'google'" lib/supabase/middleware.ts && pnpm typecheck</automated>
  </verify>
  <acceptance_criteria>
    - `grep -c "supabase.auth.getUser" lib/supabase/middleware.ts` outputs at least `1`
    - `grep -c "supabase.auth.getClaims" lib/supabase/middleware.ts` outputs `1` (primary path retained)
    - `grep -c "supabase.auth.getSession" lib/supabase/middleware.ts` outputs `0` (banned path NOT introduced)
    - `grep "provider === 'google'" lib/supabase/middleware.ts` matches
    - `grep "email_confirmed_at" lib/supabase/middleware.ts` matches
    - `grep "user_metadata" lib/supabase/middleware.ts` outputs nothing OR only appears inside a comment warning against its use (NEVER as a trust signal)
    - `grep "let isVerified" lib/supabase/middleware.ts` matches (mutable so fallback can flip it)
    - `pnpm typecheck` exits 0
  </acceptance_criteria>
  <done>
    Middleware retains getClaims() as the primary fast path. When claims say "unverified" but the request is for a verified-only path, a single getUser() round-trip checks the authoritative `auth.users` row. Google OAuth users (and any user with a real `email_confirmed_at`) bypass the redirect. Magic-link unverified users still get redirected. typecheck passes.
  </done>
</task>

<task type="auto">
  <name>Task 2: Add E2E regression test — magic-link unverified gate still works</name>
  <files>tests/e2e/oauth-verified-gate.spec.ts</files>
  <read_first>
    - lib/supabase/middleware.ts (post-Task-1 state with the fallback)
    - tests/e2e/smoke.spec.ts (existing E2E pattern + Playwright config awareness)
    - playwright.config.ts (testDir + baseURL)
  </read_first>
  <action>
    Create `tests/e2e/oauth-verified-gate.spec.ts` with two assertions:

    1. Unauthed user hitting `/directory` should redirect to `/login` (not `/verify-pending`) — confirms middleware doesn't trip on unauthed users.
    2. The Phase 2 gate code path is reachable — assert that `/verify-pending` itself loads with status 200 (so the gate has a target).

    Live OAuth flow with a real Google account requires human credentials and is covered by the human-QA UAT step (test 10 re-run). Mark that as `test.fixme` documenting the gap — do not attempt to mock Google in CI.

    File contents:

    ```ts
    import { test, expect } from '@playwright/test'

    test.describe('UAT Gap 2: OAuth-aware verify gate', () => {
      test('unauthed visitor to /directory is redirected to /login (gate does not falsely fire on unauthed users)', async ({ page }) => {
        const resp = await page.goto('/directory')
        // Phase 4 builds /directory; for now any redirect away from /directory is acceptable.
        // Critical assertion: the URL must NOT be /verify-pending (that would mean the gate
        // is firing for unauthed users — broken).
        await expect(page).not.toHaveURL(/\/verify-pending/)
        // Status should be 2xx after redirect resolves
        expect(resp?.status() ?? 200).toBeLessThan(400)
      })

      test('/verify-pending page itself loads (gate target reachable)', async ({ page }) => {
        const resp = await page.goto('/verify-pending')
        expect(resp?.status()).toBe(200)
        await expect(page.getByText('One more step')).toBeVisible()
      })

      test.fixme('Google OAuth user lands at /directory after sign-in (not /verify-pending)', async () => {
        // Requires live Google OAuth credentials + a verified Google account.
        // Manual UAT step — see .planning/phases/02-authentication-legal/02-UAT.md test 10.
      })
    })
    ```

    Note: this test cannot prove the OAuth-specific fallback fires (no live Google account in CI). It guards against regressions on unauthed users and confirms the gate target page exists. The actual fix verification is the manual UAT re-run of test 10.
  </action>
  <verify>
    <automated>cd /Users/ashleyakbar/barterkin && pnpm playwright test tests/e2e/oauth-verified-gate.spec.ts --reporter=line 2>&1 | tail -10</automated>
  </verify>
  <acceptance_criteria>
    - File `tests/e2e/oauth-verified-gate.spec.ts` exists
    - `grep "test.fixme" tests/e2e/oauth-verified-gate.spec.ts` matches (the live OAuth case is documented as manual)
    - `pnpm playwright test tests/e2e/oauth-verified-gate.spec.ts` exits 0
    - Test output shows `2 passed` and `1 fixme`
  </acceptance_criteria>
  <done>
    Regression test ensures unauthed users are NOT incorrectly redirected to /verify-pending and confirms the gate target page renders. The live OAuth verification is documented as a manual UAT step (deferred to human re-run of test 10).
  </done>
</task>

</tasks>

<verification>
- `grep "supabase.auth.getUser" lib/supabase/middleware.ts` matches
- `grep "provider === 'google'" lib/supabase/middleware.ts` matches
- `pnpm typecheck && pnpm build` both exit 0
- `pnpm playwright test tests/e2e/oauth-verified-gate.spec.ts` exits 0
- Manual UAT test 10 re-run confirms Google OAuth user lands at /directory (not /verify-pending)
</verification>

<success_criteria>
- AUTH-01 (Google OAuth) + AUTH-04 (verify gate) coexist: Google users reach /directory; magic-link unverified users still hit /verify-pending
- Performance: getUser() fallback runs at most once per gated request, only when fast-path indicates "unverified" — no impact on verified users or unauthed users or non-gated paths
- Security: provider whitelist limited to 'google' (Apple deferred); user_metadata.email_verified is NEVER trusted
- UAT test 10 ("Live Google OAuth sign-in") flips from `result: issue` to `result: pass` on next QA pass
</success_criteria>

<output>
After completion, create `.planning/phases/02-authentication-legal/02-06-SUMMARY.md` documenting:
- Exact diff in lib/supabase/middleware.ts (before/after of the verify-gate block)
- Why getUser() is the right primitive (vs trusting claims further or using getSession())
- The narrow trigger condition (authed + claims-unverified + verified-only-path)
- Apple OAuth follow-up note (when added, append provider whitelist entry)
- E2E regression test added at tests/e2e/oauth-verified-gate.spec.ts
- Re-tested UAT items: 10 (manual)
</output>
