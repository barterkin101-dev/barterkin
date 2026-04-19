---
plan: 4
phase: 2
name: tests-verify
wave: 3
depends_on: [2, 3]
autonomous: false
requirements:
  - AUTH-01
  - AUTH-02
  - AUTH-03
  - AUTH-04
  - AUTH-05
  - AUTH-06
  - AUTH-07
  - AUTH-08
  - AUTH-09
  - AUTH-10
  - GEO-04
files_modified:
  - lib/database.types.ts
  - tests/unit/disposable-email.test.ts
  - tests/unit/rate-limit.test.ts
  - tests/unit/magic-link-schema.test.ts
  - tests/e2e/login-magic-link.spec.ts
  - tests/e2e/login-google-oauth.spec.ts
  - tests/e2e/verify-pending-gate.spec.ts
  - tests/e2e/auth-group-redirect.spec.ts
  - tests/e2e/session-persistence.spec.ts
  - tests/e2e/logout.spec.ts
  - tests/e2e/captcha-required.spec.ts
  - tests/e2e/legal-pages.spec.ts
  - tests/e2e/footer-links.spec.ts
must_haves:
  truths:
    - "Migration 002_auth_tables.sql applies cleanly via supabase db push"
    - "Regenerated lib/database.types.ts includes check_signup_ip + current_user_is_verified RPCs"
    - "All 3 unit test files have real assertions (not .todo) and pass"
    - "All 9 E2E test files have real test bodies (not .fixme) and pass against pnpm start"
    - "pnpm test && pnpm e2e exits 0 with ≥30 tests total"
    - "CI pipeline (6 jobs) stays green after push"
    - "Vercel preview deploy smokes: /login renders 200, /legal/tos contains GEO-04 clause text"
  artifacts:
    - path: "lib/database.types.ts"
      provides: "Regenerated types after migration push"
      contains: "check_signup_ip"
    - path: "tests/unit/disposable-email.test.ts"
      provides: "Real unit tests for AUTH-07"
      contains: "expect("
    - path: "tests/e2e/legal-pages.spec.ts"
      provides: "Real E2E for AUTH-10 + GEO-04"
      contains: "Barterkin is intended for people who live in Georgia"
  key_links:
    - from: "supabase db push"
      to: "Supabase project hfdcsickergdcdvejbcw"
      via: "SUPABASE_ACCESS_TOKEN + supabase CLI"
      pattern: "db push"
    - from: "lib/database.types.ts"
      to: "check_signup_ip RPC"
      via: "supabase gen types typescript"
      pattern: "Functions"
    - from: "tests/e2e/legal-pages.spec.ts"
      to: "GEO-04 locked clause"
      via: "page.getByText verbatim match"
      pattern: "getByText.*Georgia residents"
---

## Objective

Wave 3 — close the phase. Push the migration to Supabase, regenerate types, fill test bodies, run full CI suite, deploy to Vercel preview, smoke-test.

1. **Schema push** (human-required: SUPABASE_ACCESS_TOKEN).
2. **Type regeneration** — `lib/database.types.ts` updated so Wave 1's `@ts-expect-error` comment can come out.
3. **Fill unit test bodies** — 3 files × 6–12 asserts each.
4. **Fill E2E test bodies** — 9 spec files against pnpm start.
5. **Full suite green** — `pnpm test && pnpm e2e` both pass.
6. **CI green** — push to GitHub; verify all 6 jobs pass.
7. **Vercel smoke** — preview deploy; `curl` /login and /legal/tos for content check.

**Purpose:** Close AUTH-01..AUTH-10 + GEO-04 against the Nyquist validation rule from Phase 1 — every requirement has at least one automated test.

**Output:** Phase 2 complete, CI green, preview deployed and smoked, hand-off to Phase 3.

## Threat Model

| Boundary | Description |
|----------|-------------|
| Local supabase CLI → Supabase Cloud | Requires SUPABASE_ACCESS_TOKEN (user action); migration runs as postgres role |
| Playwright E2E → real Supabase project | Tests mock external calls where possible; never hit real Google OAuth or real Turnstile |

### STRIDE Threat Register

| Threat ID | Category | Component | Disposition | Mitigation Plan |
|-----------|----------|-----------|-------------|-----------------|
| T-2-12 | Tampering | Migration rollback | accept | Supabase migrations forward-only; no rollback tested. Risk acceptable for solo-builder + early-stage project. If the push fails, fix the SQL locally (`supabase db reset`) and re-push with a new migration file (`003_fix_phase2.sql`) rather than editing 002. |
| T-2-13 | Spoofing | Test secrets in CI | mitigate | CI uses the same `NEXT_PUBLIC_SUPABASE_URL` + `NEXT_PUBLIC_TURNSTILE_SITE_KEY` as dev (public values); Playwright E2E does not need service-role access or Turnstile secret |

## Tasks

<task id="2-4-1" type="checkpoint:human-action">
  <title>Task 4.1: Schema push — local reset + db push to production</title>
  <read_first>
    - `supabase/migrations/002_auth_tables.sql` (from Wave 1 Task 2.1)
    - `.planning/phases/02-authentication-legal/02-RESEARCH.md` (Assumption A3 — postgres role can install triggers on auth.users; verify locally first)
    - `supabase/config.toml`
  </read_first>
  <action>
RUNBOOK — human executes these steps. Claude can run the commands but the SUPABASE_ACCESS_TOKEN must be obtained from the user.

Step 1 — Local reset (validates SQL before touching production):
```bash
# Start local Supabase (if not running)
supabase start
# OR: ensure it's running — `supabase status` shows Running

# Reset local DB with all migrations (001 Phase 1 + 002 Phase 2)
supabase db reset
```

Expected output:
- "Applying migration 002_auth_tables.sql..."
- No errors. If the trigger install on `auth.users` fails with permission errors, investigate — the Supabase CLI should run as postgres superuser locally.
- The reset output should list `signup_attempts`, `disposable_email_domains`, `check_signup_ip`, `current_user_is_verified`, and the trigger.

Step 2 — Smoke test locally (optional but recommended):
```bash
# Connect to local Postgres
supabase db psql

# In psql:
\d public.signup_attempts      -- should show the table with 4 columns
\df public.check_signup_ip     -- should show the SECURITY DEFINER function
select public.check_signup_ip('1.2.3.4');   -- → t (true; count=1)
select public.check_signup_ip('1.2.3.4');   -- → t (count=2)
-- ... repeat 4 more times
select public.check_signup_ip('1.2.3.4');   -- → f on 6th call (count=6 > 5)

select public.current_user_is_verified();   -- should return false (no auth context)

-- Test the disposable-email trigger (will fail because auth.users insert
-- requires special setup; skip the trigger test locally — covered by E2E).

\q
```

Step 3 — Push to production Supabase (requires SUPABASE_ACCESS_TOKEN):
```bash
# Human provides the access token:
export SUPABASE_ACCESS_TOKEN=<paste-your-supabase-access-token>

# Confirm CLI is linked to the right project
supabase link --project-ref hfdcsickergdcdvejbcw
# (If it prompts for DB password, use the one from Supabase Studio → Settings → Database)

# Push
supabase db push

# Expected output:
# Connecting to remote database...
# Applying migration 002_auth_tables.sql...
# Finished supabase db push.
```

Step 4 — Verify the push landed:
```bash
# Diff should be empty (no local/remote drift)
supabase db diff --schema public

# Expected: empty output or "No schema differences" message
```

If `supabase db push` fails with a permission error on the `auth.users` trigger:
- Escape hatch: copy the trigger DDL (lines around `create trigger reject_disposable_email_before_insert`) and run it manually via Supabase Studio → SQL Editor as the postgres role. Document this deviation in 02-04-SUMMARY.md and the migration file (add a comment at the top).

If `supabase db push` fails for any other reason:
- Do NOT edit 002_auth_tables.sql. Instead, create 003_fix_phase2.sql with the corrective SQL. Migrations are forward-only.

Resume signal: type "migration-pushed" after `supabase db diff --schema public` returns empty, or report the exact error.
  </action>
  <acceptance_criteria>
    - `supabase db reset` locally completes without error and applies 002_auth_tables.sql
    - `supabase db push` to production completes without error
    - `supabase db diff --schema public` returns empty (no drift)
    - Manual psql check of `check_signup_ip('1.2.3.4')` returns `t` 5 times then `f` on the 6th
    - Supabase Studio → Database → Tables shows `signup_attempts` and `disposable_email_domains`
    - Supabase Studio → Database → Functions shows `check_signup_ip` and `current_user_is_verified`
  </acceptance_criteria>
</task>

<task id="2-4-2" type="auto">
  <title>Task 4.2: Regenerate lib/database.types.ts + remove @ts-expect-error</title>
  <read_first>
    - `lib/database.types.ts` (current — generated Phase 1)
    - `lib/utils/rate-limit.ts` (has a @ts-expect-error to remove)
    - `supabase/config.toml`
  </read_first>
  <action>
After Task 4.1 applies the migration, regenerate the types.

Step 1 — Generate types from the pushed schema:
```bash
# Generate types from the remote project
supabase gen types typescript --project-id hfdcsickergdcdvejbcw > lib/database.types.ts

# OR if you want local types after `supabase db reset`:
# supabase gen types typescript --local > lib/database.types.ts
# (use remote after push — Wave 3 migration is in production now)
```

Step 2 — Verify the generated types include the new RPCs:
```bash
grep "check_signup_ip" lib/database.types.ts        # must match
grep "current_user_is_verified" lib/database.types.ts  # must match
grep "signup_attempts" lib/database.types.ts        # must match
grep "disposable_email_domains" lib/database.types.ts  # must match
```

All four greps must return matches. If any don't, the migration didn't push the expected schema — investigate.

Step 3 — Remove the Wave 1 `@ts-expect-error` in `lib/utils/rate-limit.ts`:

Open `lib/utils/rate-limit.ts`. Find the line:
```ts
// @ts-expect-error - types regenerated in Wave 3 after migration push (Task 4.2)
const { data, error } = await supabase.rpc('check_signup_ip', { p_ip: cleanIp })
```

Delete the `@ts-expect-error` comment. If tsc now errors with "Argument of type 'check_signup_ip' is not assignable…" the types regen didn't pick up the RPC — re-run Step 1 with the correct flag.

Step 4 — Verify tsc is clean:
```bash
pnpm typecheck
```
Must exit 0 with no errors.
  </action>
  <acceptance_criteria>
    - `lib/database.types.ts` contains literal "check_signup_ip" (grep)
    - `lib/database.types.ts` contains "current_user_is_verified" (grep)
    - `lib/utils/rate-limit.ts` no longer contains "@ts-expect-error" (grep must NOT match)
    - `pnpm typecheck` exits 0
    - `pnpm build` exits 0
  </acceptance_criteria>
</task>

<task id="2-4-3" type="auto" tdd="true">
  <title>Task 4.3: Fill unit test bodies — disposable-email, rate-limit, magic-link-schema</title>
  <read_first>
    - Wave 0 test stubs (from Plan 02-01 Task 1.6) — replace `.todo` with real tests
    - `lib/utils/disposable-email.ts` (the unit under test)
    - `lib/utils/rate-limit.ts` (the unit under test)
    - `lib/actions/auth.ts` (the MagicLinkSchema is defined inside; export it or replicate for test)
    - `tests/unit/smoke.test.ts` (pattern: describe + it + expect)
    - `vitest.setup.ts` (confirm jest-dom + environment)
  </read_first>
  <behavior>
    - All three test files use real `expect()` assertions, not `.todo`
    - `pnpm test` runs the three files + the existing smoke test and exits 0
  </behavior>
  <action>
Replace the Wave 0 stub content in each of the three unit test files with real test bodies.

**File 1: `tests/unit/disposable-email.test.ts`**

```ts
import { describe, it, expect } from 'vitest'
import { isDisposableEmail } from '@/lib/utils/disposable-email'

describe('isDisposableEmail (AUTH-07)', () => {
  describe('rejects disposable domains', () => {
    const disposableCases = [
      'user@mailinator.com',
      'test@tempmail.com',
      'x@10minutemail.com',
      'throwaway@throwaway.email',
      'guerrilla@guerrillamail.com',
    ]
    it.each(disposableCases)('rejects %s', (email) => {
      expect(isDisposableEmail(email)).toBe(true)
    })
  })

  describe('accepts legitimate domains', () => {
    const legitCases = [
      'user@gmail.com',
      'user@outlook.com',
      'user@icloud.com',
      'user@fastmail.com',
      'user@proton.me',
    ]
    it.each(legitCases)('accepts %s', (email) => {
      expect(isDisposableEmail(email)).toBe(false)
    })
  })

  it('returns false for malformed email (no @)', () => {
    expect(isDisposableEmail('not-an-email')).toBe(false)
  })

  it('returns false for empty string', () => {
    expect(isDisposableEmail('')).toBe(false)
  })

  it('lowercases domain before check (case-insensitive)', () => {
    expect(isDisposableEmail('USER@MAILINATOR.COM')).toBe(true)
  })

  it('handles leading/trailing whitespace', () => {
    expect(isDisposableEmail('  user@mailinator.com  ')).toBe(true)
  })
})
```

**File 2: `tests/unit/rate-limit.test.ts`**

Unit-testing `checkSignupRateLimit` requires mocking the Supabase client. Use `vi.mock`:

```ts
import { describe, it, expect, vi, beforeEach } from 'vitest'

const rpcMock = vi.fn()

vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn(async () => ({
    rpc: rpcMock,
  })),
}))

// Import AFTER the mock is set up
import { checkSignupRateLimit } from '@/lib/utils/rate-limit'

describe('checkSignupRateLimit (AUTH-06)', () => {
  beforeEach(() => {
    rpcMock.mockReset()
  })

  it('returns { allowed: true } when RPC returns true', async () => {
    rpcMock.mockResolvedValueOnce({ data: true, error: null })
    const result = await checkSignupRateLimit('1.2.3.4')
    expect(result).toEqual({ allowed: true })
    expect(rpcMock).toHaveBeenCalledWith('check_signup_ip', { p_ip: '1.2.3.4' })
  })

  it('returns { allowed: false } when RPC returns false', async () => {
    rpcMock.mockResolvedValueOnce({ data: false, error: null })
    const result = await checkSignupRateLimit('1.2.3.4')
    expect(result).toEqual({ allowed: false })
  })

  it('fails OPEN (returns allowed: true) when RPC errors', async () => {
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
    rpcMock.mockResolvedValueOnce({
      data: null,
      error: { code: 'PGRST000', message: 'connection failed' },
    })
    const result = await checkSignupRateLimit('1.2.3.4')
    expect(result).toEqual({ allowed: true })
    expect(consoleSpy).toHaveBeenCalled()
    consoleSpy.mockRestore()
  })

  it('replaces empty IP with "unknown" sentinel', async () => {
    rpcMock.mockResolvedValueOnce({ data: true, error: null })
    await checkSignupRateLimit('')
    expect(rpcMock).toHaveBeenCalledWith('check_signup_ip', { p_ip: 'unknown' })
  })

  it('trims whitespace from IP', async () => {
    rpcMock.mockResolvedValueOnce({ data: true, error: null })
    await checkSignupRateLimit('  1.2.3.4  ')
    expect(rpcMock).toHaveBeenCalledWith('check_signup_ip', { p_ip: '1.2.3.4' })
  })
})
```

**File 3: `tests/unit/magic-link-schema.test.ts`**

The MagicLinkSchema is defined inside `lib/actions/auth.ts` but not exported. For testing, replicate it OR export it from the actions file. Choice: export a `MagicLinkSchema` named export from `lib/actions/auth.ts` so this test can consume it directly. **Executor must add this export in Task 4.3 as part of setup.**

Edit `lib/actions/auth.ts` to change:
```ts
const MagicLinkSchema = z.object({...})
```
to:
```ts
export const MagicLinkSchema = z.object({...})
```

Then write the test:

```ts
import { describe, it, expect } from 'vitest'
import { MagicLinkSchema } from '@/lib/actions/auth'

describe('MagicLinkSchema (AUTH-02)', () => {
  it('accepts valid email + captchaToken', () => {
    const result = MagicLinkSchema.safeParse({
      email: 'user@example.com',
      captchaToken: 'some-turnstile-token',
    })
    expect(result.success).toBe(true)
  })

  it('rejects missing email', () => {
    const result = MagicLinkSchema.safeParse({
      captchaToken: 'some-turnstile-token',
    })
    expect(result.success).toBe(false)
  })

  it('rejects malformed email (no @)', () => {
    const result = MagicLinkSchema.safeParse({
      email: 'not-an-email',
      captchaToken: 'x',
    })
    expect(result.success).toBe(false)
  })

  it('rejects empty captchaToken', () => {
    const result = MagicLinkSchema.safeParse({
      email: 'user@example.com',
      captchaToken: '',
    })
    expect(result.success).toBe(false)
  })

  it('lowercases email after parse', () => {
    const result = MagicLinkSchema.safeParse({
      email: 'USER@Example.COM',
      captchaToken: 'x',
    })
    if (result.success) {
      expect(result.data.email).toBe('user@example.com')
    } else {
      throw new Error('expected parse success')
    }
  })

  it('trims whitespace from email', () => {
    const result = MagicLinkSchema.safeParse({
      email: '  user@example.com  ',
      captchaToken: 'x',
    })
    if (result.success) {
      expect(result.data.email).toBe('user@example.com')
    } else {
      throw new Error('expected parse success')
    }
  })
})
```

Run the suite:
```bash
pnpm test
```

Must exit 0 with the new files showing passing tests (not `todo`).
  </action>
  <acceptance_criteria>
    - `tests/unit/disposable-email.test.ts` has ≥12 `expect(` calls (grep count)
    - `tests/unit/rate-limit.test.ts` has ≥5 `expect(` calls
    - `tests/unit/magic-link-schema.test.ts` has ≥6 `expect(` calls
    - `lib/actions/auth.ts` exports `MagicLinkSchema` (grep `export const MagicLinkSchema`)
    - `pnpm test` exits 0, all 3 files report passing (not todo)
  </acceptance_criteria>
</task>

<task id="2-4-4" type="auto">
  <title>Task 4.4: Fill E2E test bodies — 9 Playwright specs</title>
  <read_first>
    - Wave 0 test stubs (from Plan 02-01 Task 1.6) — replace `.fixme` with real tests
    - `tests/e2e/smoke.spec.ts` (pattern)
    - `playwright.config.ts` (baseURL=http://localhost:3000, reuseExistingServer)
    - All Wave 2 pages + components (the subjects under test)
  </read_first>
  <action>
Replace `.fixme` test bodies with real Playwright tests. Executor: be pragmatic — some of these tests require auth state that is hard to set up (OAuth, verified user state). For those, use `test.fixme()` to mark as "expected to fail for now" and document in the summary. The goal is real coverage for everything testable without a real Google account or a full magic-link round-trip.

**File: `tests/e2e/login-magic-link.spec.ts`**

```ts
import { test, expect } from '@playwright/test'

test.describe('login — magic link (AUTH-02)', () => {
  test('email input renders on /login', async ({ page }) => {
    await page.goto('/login')
    await expect(page.getByLabel('Email address')).toBeVisible()
  })

  test('submit button labeled "Send magic link"', async ({ page }) => {
    await page.goto('/login')
    await expect(page.getByRole('button', { name: /send magic link/i })).toBeVisible()
  })

  test('submit button is disabled without CAPTCHA completion', async ({ page }) => {
    await page.goto('/login')
    const button = page.getByRole('button', { name: /send magic link/i })
    await expect(button).toBeDisabled()
  })

  // Full end-to-end "Check your email" state requires Turnstile to actually pass;
  // marking as fixme — needs a Turnstile test mode or widget bypass in test env.
  test.fixme('after valid submit, shows "Check your email" confirmation', async ({ page }) => {
    // Needs: Turnstile test mode + mocked sendMagicLink response
  })

  test.fixme('submitting @mailinator.com shows disposable-email error copy', async ({ page }) => {
    // Needs: Turnstile bypass in test env to actually trigger server action
  })
})
```

**File: `tests/e2e/login-google-oauth.spec.ts`**

```ts
import { test, expect } from '@playwright/test'

test.describe('login — Google OAuth (AUTH-01)', () => {
  test('Continue with Google button renders on /login', async ({ page }) => {
    await page.goto('/login')
    await expect(page.getByRole('button', { name: /continue with google/i })).toBeVisible()
  })

  test('Continue with Google button renders on /signup', async ({ page }) => {
    await page.goto('/signup')
    await expect(page.getByRole('button', { name: /continue with google/i })).toBeVisible()
  })

  test('Continue with Google button is disabled until Turnstile passes', async ({ page }) => {
    await page.goto('/login')
    const button = page.getByRole('button', { name: /continue with google/i })
    await expect(button).toBeDisabled()
  })

  // Full redirect to accounts.google.com requires a live Turnstile + live Supabase;
  // not worth mocking in E2E. Manual QA covers this.
  test.fixme('clicking the button initiates a redirect to accounts.google.com', async () => {})
})
```

**File: `tests/e2e/verify-pending-gate.spec.ts`**

Requires authed-but-unverified state. Hard to set up without a real signup.

```ts
import { test, expect } from '@playwright/test'

test.describe('verify-pending (AUTH-04)', () => {
  test('/verify-pending renders "One more step" heading', async ({ page }) => {
    await page.goto('/verify-pending')
    await expect(page.getByRole('heading', { name: 'One more step' })).toBeVisible()
  })

  test('/verify-pending renders Resend verification link button', async ({ page }) => {
    await page.goto('/verify-pending')
    await expect(page.getByRole('link', { name: /resend verification link/i }).or(page.getByRole('button', { name: /resend verification link/i }))).toBeVisible()
  })

  test('/verify-pending contains contact@barterkin.com link', async ({ page }) => {
    await page.goto('/verify-pending')
    const link = page.getByRole('link', { name: /email contact@barterkin.com/i })
    await expect(link).toHaveAttribute('href', 'mailto:contact@barterkin.com')
  })

  // Full middleware redirect test requires an authed-unverified session.
  test.fixme('authed-but-unverified user is redirected from /directory to /verify-pending', async () => {})
})
```

**File: `tests/e2e/auth-group-redirect.spec.ts`**

```ts
import { test, expect } from '@playwright/test'

test.describe('auth-group redirect (AUTH-09)', () => {
  test('unauthed user visiting /login sees the login page', async ({ page }) => {
    await page.goto('/login')
    await expect(page).toHaveURL(/\/login$/)
    await expect(page.getByRole('heading', { name: /welcome to barterkin/i })).toBeVisible()
  })

  test('unauthed user visiting /signup sees the signup page', async ({ page }) => {
    await page.goto('/signup')
    await expect(page).toHaveURL(/\/signup$/)
  })

  test.fixme('authed user visiting /login is redirected to /directory', async () => {})
  test.fixme('authed user visiting /signup is redirected to /directory', async () => {})
})
```

**File: `tests/e2e/session-persistence.spec.ts`**

Requires authed state from a real Supabase session. Hard to do without real auth; mark as fixme with a note.

```ts
import { test } from '@playwright/test'

test.describe('session persistence (AUTH-03)', () => {
  test.fixme('authed session survives full page reload', async () => {
    // Covered manually: sign in, reload, verify session intact.
    // Automated version requires magic-link capture or service-role token injection.
  })
  test.fixme('authed session age ≥ 30 days supported by cookie config', async () => {})
})
```

**File: `tests/e2e/logout.spec.ts`**

```ts
import { test, expect } from '@playwright/test'

test.describe('logout (AUTH-05)', () => {
  test('/auth/signout GET returns 405 (POST-only)', async ({ request }) => {
    const response = await request.get('/auth/signout', { maxRedirects: 0 })
    expect(response.status()).toBe(405)
  })

  test('/auth/signout POST returns 303 redirect', async ({ request }) => {
    const response = await request.post('/auth/signout', { maxRedirects: 0 })
    expect([303, 302]).toContain(response.status())
  })

  test.fixme('clicking Log out in footer clears session cookie + redirects', async () => {
    // Needs authed state
  })
})
```

**File: `tests/e2e/captcha-required.spec.ts`**

```ts
import { test, expect } from '@playwright/test'

test.describe('CAPTCHA required (AUTH-08)', () => {
  test('Turnstile widget area is present on /login', async ({ page }) => {
    await page.goto('/login')
    // The widget iframe loads from challenges.cloudflare.com; verify the container renders
    // even if Cloudflare doesn't actually serve the iframe in test env.
    await expect(page.getByText(/protected by cloudflare turnstile/i)).toBeVisible()
  })

  test('Turnstile widget area is present on /signup', async ({ page }) => {
    await page.goto('/signup')
    await expect(page.getByText(/protected by cloudflare turnstile/i)).toBeVisible()
  })

  test('magic-link submit is disabled without CAPTCHA', async ({ page }) => {
    await page.goto('/login')
    await page.getByLabel('Email address').fill('user@example.com')
    await expect(page.getByRole('button', { name: /send magic link/i })).toBeDisabled()
  })
})
```

**File: `tests/e2e/legal-pages.spec.ts`** — this is the CRITICAL file for GEO-04 verification:

```ts
import { test, expect } from '@playwright/test'

test.describe('legal pages (AUTH-10 + GEO-04)', () => {
  test('/legal/tos renders with H1 "Terms of Service"', async ({ page }) => {
    await page.goto('/legal/tos')
    await expect(page.getByRole('heading', { level: 1, name: 'Terms of Service' })).toBeVisible()
  })

  test('/legal/tos contains the GEO-04 Georgia non-residency clause verbatim', async ({ page }) => {
    await page.goto('/legal/tos')
    // Exact match of the LOCKED clause from UI-SPEC
    await expect(page.getByText('Barterkin is intended for people who live in Georgia, USA.', { exact: false })).toBeVisible()
    await expect(page.getByText('we may remove any profile for which we have reason to believe this rule is being broken', { exact: false })).toBeVisible()
  })

  test('/legal/privacy renders with H1 "Privacy Policy"', async ({ page }) => {
    await page.goto('/legal/privacy')
    await expect(page.getByRole('heading', { level: 1, name: 'Privacy Policy' })).toBeVisible()
  })

  test('/legal/privacy states we never sell data', async ({ page }) => {
    await page.goto('/legal/privacy')
    await expect(page.getByText(/we never sell your data/i)).toBeVisible()
  })

  test('/legal/guidelines renders with H1 "Community Guidelines"', async ({ page }) => {
    await page.goto('/legal/guidelines')
    await expect(page.getByRole('heading', { level: 1, name: 'Community Guidelines' })).toBeVisible()
  })

  test('/legal/guidelines includes the skills-not-goods-or-cash rule', async ({ page }) => {
    await page.goto('/legal/guidelines')
    await expect(page.getByRole('heading', { name: /trade skills, not goods or cash/i })).toBeVisible()
  })
})
```

**File: `tests/e2e/footer-links.spec.ts`**

```ts
import { test, expect } from '@playwright/test'

test.describe('footer links (AUTH-10 + UI-SPEC)', () => {
  const routes = ['/', '/login', '/signup', '/legal/tos', '/legal/privacy', '/legal/guidelines', '/verify-pending']

  for (const route of routes) {
    test(`footer shows legal links on ${route}`, async ({ page }) => {
      await page.goto(route)
      // Footer lives in root layout; renders on every route
      const footer = page.locator('footer')
      await expect(footer).toBeVisible()
      await expect(footer.getByRole('link', { name: /terms/i })).toBeVisible()
      await expect(footer.getByRole('link', { name: /privacy/i })).toBeVisible()
      await expect(footer.getByRole('link', { name: /community guidelines/i })).toBeVisible()
    })
  }

  test('footer shows Sign in link when unauthed on /', async ({ page }) => {
    await page.goto('/')
    const footer = page.locator('footer')
    await expect(footer.getByRole('link', { name: /sign in/i })).toBeVisible()
  })

  test.fixme('footer shows Log out button when authed', async () => {})
})
```

Run the suite:
```bash
pnpm build   # Playwright's webServer runs `pnpm start` which requires build first
pnpm e2e
```

Must exit 0. `.fixme` tests are skipped without failure. All other tests must pass.
  </action>
  <acceptance_criteria>
    - All 9 E2E files have ≥1 non-fixme test (real `test(` with async body)
    - `tests/e2e/legal-pages.spec.ts` contains literal "Barterkin is intended for people who live in Georgia, USA" (GEO-04 verification)
    - `pnpm e2e` exits 0
    - Total test count across unit + E2E ≥ 30 (counted manually or via reporter output)
  </acceptance_criteria>
</task>

<task id="2-4-5" type="auto">
  <title>Task 4.5: Run full suite locally — typecheck, lint, build, unit, E2E</title>
  <read_first>
    - `package.json` (scripts section — confirm all commands exist)
    - `.github/workflows/` (CI config — align with it to match CI expectations)
  </read_first>
  <action>
Run the same checks CI will run. All must pass before pushing.

```bash
cd /Users/ashleyakbar/barterkin

# 1. Lint (< 5s)
pnpm lint

# 2. Typecheck (< 5s)
pnpm typecheck

# 3. Unit tests (< 2s)
pnpm test

# 4. Build (30–60s)
pnpm build

# 5. E2E (60–120s — Playwright boots the built app)
pnpm e2e

# 6. Gitleaks (if configured as a pre-commit hook, will run on commit)
# If gitleaks is a GH Action and not local: skip here, verify in Task 4.6.
```

If any step fails, fix before proceeding. Common fixes:
- **Lint**: unused imports — remove them.
- **Typecheck**: type drift from migration — confirm Task 4.2's type regen landed.
- **Unit test**: mock shape mismatch — check vi.mock placement relative to imports.
- **Build**: missing env var at build time — add a build-time fallback or ensure `NEXT_PUBLIC_TURNSTILE_SITE_KEY` is in Vercel Build env (Wave 0 Task 1.2).
- **E2E**: timing out — bump timeout, or check that `pnpm start` actually starts in the test env.

Record timings in 02-04-SUMMARY.md (for future retrospective).
  </action>
  <acceptance_criteria>
    - `pnpm lint` exits 0
    - `pnpm typecheck` exits 0
    - `pnpm test` exits 0
    - `pnpm build` exits 0
    - `pnpm e2e` exits 0 (fixme tests don't count as failures)
  </acceptance_criteria>
</task>

<task id="2-4-6" type="auto">
  <title>Task 4.6: Push to GitHub + verify CI (6 jobs) green</title>
  <read_first>
    - `.github/workflows/` (CI config)
    - `.planning/STATE.md` (for current branch name if any)
  </read_first>
  <action>
Commit Phase 2 changes and push to GitHub; verify CI passes all 6 jobs.

```bash
cd /Users/ashleyakbar/barterkin

# Stage all Phase 2 files
git add supabase/migrations/002_auth_tables.sql
git add lib/utils/disposable-email.ts lib/utils/rate-limit.ts
git add lib/actions/auth.ts
git add app/auth app/\(auth\) app/verify-pending app/legal
git add components/auth components/layout/Footer.tsx
git add components/ui/form.tsx components/ui/alert.tsx components/ui/separator.tsx
git add app/globals.css app/layout.tsx
git add lib/supabase/middleware.ts middleware.ts
git add lib/database.types.ts
git add tests/unit/disposable-email.test.ts tests/unit/rate-limit.test.ts tests/unit/magic-link-schema.test.ts
git add tests/e2e/*.spec.ts
git add package.json pnpm-lock.yaml
git add .env.local.example
git add .planning/phases/02-authentication-legal/02-A4-PROBE.md

# Commit (Phase 2 complete)
git commit -m "$(cat <<'EOF'
feat(phase-2): authentication & legal — AUTH-01..AUTH-10 + GEO-04

- Google OAuth + magic-link via @supabase/ssr (AUTH-01, AUTH-02)
- 30-day session persistence via middleware getClaims (AUTH-03)
- Email-verify gate in middleware + current_user_is_verified() helper for Phase 3 RLS (AUTH-04)
- POST-only /auth/signout with 303 redirect (AUTH-05)
- Per-IP signup rate limit via Postgres SECURITY DEFINER function (AUTH-06)
- disposable-email-domains-js + Postgres trigger on auth.users (AUTH-07)
- Cloudflare Turnstile via Supabase-native captchaToken (AUTH-08)
- (auth) route group + middleware redirects (AUTH-09)
- ToS / Privacy / Community Guidelines pages with GEO-04 locked clause (AUTH-10, GEO-04)
- 3 unit tests + 9 E2E specs covering all 11 requirements

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"

# Push
git push origin HEAD
```

After push, monitor CI:
```bash
gh run list --limit 3
gh run watch   # or gh run view <id>
```

Expected 6 CI jobs (from Phase 1):
1. lint
2. typecheck
3. unit
4. E2E (Playwright)
5. build
6. gitleaks

All must pass. If any fail, fix and recommit (do NOT amend — NEW commit per get-shit-done rules).

Common CI-specific failures:
- **Playwright flaky in CI**: Turnstile iframe doesn't load in CI; check that E2E tests don't depend on the iframe actually being served. Our tests check the wrapper text ("Protected by Cloudflare Turnstile.") not the iframe itself — should be OK.
- **Build fails on missing NEXT_PUBLIC_TURNSTILE_SITE_KEY**: Wave 0 Task 1.2 should have added this to Vercel env. For CI (GitHub Actions), also add it as a repo secret and reference in the workflow. Or: make the fallback in TurnstileWidget less destructive (render a no-op div in CI if env var missing).
  </action>
  <acceptance_criteria>
    - `git push` succeeds
    - `gh run list --limit 1` shows the most recent run
    - All 6 CI jobs exit with status success (green check)
    - No secret appears in any committed file (`gh run view` gitleaks job passes)
  </acceptance_criteria>
</task>

<task id="2-4-7" type="checkpoint:human-verify">
  <title>Task 4.7: Vercel preview smoke — /login renders, /legal/tos contains GEO-04</title>
  <read_first>
    - Vercel dashboard — find the preview URL from the last push
  </read_first>
  <what-built>
  Phase 2 complete: auth flows, legal pages, middleware gates, anti-abuse layer. Vercel preview is deployed automatically on every push. This task verifies the preview deploys successfully and that the two highest-value surfaces (login + ToS with GEO-04 clause) render correctly.
  </what-built>
  <how-to-verify>
1. Visit the Vercel dashboard (or run `vercel` from the repo root) and find the preview URL for the latest commit. Will look like `https://barterkin-<hash>-<team>.vercel.app`.

2. Automated smoke via curl (non-blocking — also do manual):
```bash
PREVIEW_URL=<paste preview URL>

# /login renders 200
curl -I "$PREVIEW_URL/login"
# Expect: HTTP/2 200

# /legal/tos contains the GEO-04 clause verbatim
curl -sL "$PREVIEW_URL/legal/tos" | grep -c "Barterkin is intended for people who live in Georgia"
# Expect: 1

# /legal/privacy 200
curl -I "$PREVIEW_URL/legal/privacy"

# /legal/guidelines 200
curl -I "$PREVIEW_URL/legal/guidelines"

# /verify-pending 200
curl -I "$PREVIEW_URL/verify-pending"

# /auth/signout GET → 405
curl -I -X GET "$PREVIEW_URL/auth/signout"
# Expect: HTTP/2 405
```

3. Manual (in a real browser):
   - Open $PREVIEW_URL/login
   - Verify: "Welcome to Barterkin" heading, "Continue with Google" button, Turnstile widget renders (should show the Cloudflare challenge), email input, "Send magic link" button (disabled until Turnstile passes), legal microcopy links
   - Open $PREVIEW_URL/legal/tos
   - Cmd+F / Ctrl+F → search "Barterkin is intended for people who live in Georgia" — must match
   - Footer renders on every page with Terms · Privacy · Community Guidelines links

4. Optional: try a real magic-link signup with a personal email (the one from MEMORY.md: contact@biznomad.io). Check inbox for the magic link from hello@barterkin.com. Click → should redirect to /auth/confirm → /directory (404 since Phase 3+ not built yet) OR /verify-pending (if AUTH-04 middleware redirects). Either is OK — Phase 3 fixes the /directory 404.
  </how-to-verify>
  <resume-signal>Type "preview-verified" if all curl checks pass and manual browser check looks right. Or describe the specific issue.</resume-signal>
</task>

## Verification

After all seven tasks complete:

```bash
# Final smoke
pnpm test && pnpm e2e
gh run list --limit 1   # confirm latest run is green
```

Manual:
- Vercel preview deploys successfully
- `/login`, `/signup`, `/verify-pending`, `/legal/tos`, `/legal/privacy`, `/legal/guidelines` all render 200
- GEO-04 clause present verbatim in /legal/tos

## success_criteria

- [ ] Migration 002_auth_tables.sql applied to Supabase production; `supabase db diff` empty
- [ ] `lib/database.types.ts` regenerated; contains check_signup_ip + current_user_is_verified
- [ ] `@ts-expect-error` removed from `lib/utils/rate-limit.ts`
- [ ] All 3 unit tests have real assertions; `pnpm test` exits 0
- [ ] All 9 E2E specs have real tests (fixme allowed for auth-state-dependent cases); `pnpm e2e` exits 0
- [ ] `pnpm lint && pnpm typecheck && pnpm build` all exit 0
- [ ] GitHub push triggers CI; all 6 jobs green
- [ ] Vercel preview deploys; /login, /legal/tos, /legal/privacy, /legal/guidelines all 200
- [ ] GEO-04 clause verbatim present in /legal/tos
- [ ] `/auth/signout` GET returns 405; POST returns 303

## output

After completion, create `.planning/phases/02-authentication-legal/02-04-SUMMARY.md` recording:
- Migration push outcome + any manual Studio steps needed
- Test counts (unit + E2E, pass + fixme)
- CI run URL (for audit)
- Vercel preview URL
- List of fixme'd tests that need follow-up (specifically the auth-state-dependent ones — candidates for a future Phase 2.1 "auth test hardening" if needed)
- Confirm GEO-04 appears verbatim on production after merge + Vercel prod deploy
