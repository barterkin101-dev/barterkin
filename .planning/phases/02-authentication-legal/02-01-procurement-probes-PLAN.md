---
plan: 1
phase: 2
name: procurement-probes
wave: 0
depends_on: []
autonomous: false
requirements:
  - AUTH-01
  - AUTH-02
  - AUTH-08
files_modified:
  - package.json
  - pnpm-lock.yaml
  - .env.local
  - .env.local.example
  - components/ui/form.tsx
  - components/ui/alert.tsx
  - components/ui/separator.tsx
  - tests/unit/disposable-email.test.ts
  - tests/unit/rate-limit.test.ts
  - tests/unit/magic-link-schema.test.ts
  - tests/unit/rls-email-verify.test.ts
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
    - "All npm packages needed for Phase 2 are installed and present in package.json"
    - "disposable-email-domains-js export shape probed and recorded in 02-A4-PROBE.md"
    - "signInWithOtp captchaToken enforcement probed and recorded in 02-A4-PROBE.md (resolves Open Question 1)"
    - "shadcn Form, Alert, Separator primitives exist in components/ui/"
    - "All Wave 0+ test files exist as fail-able stubs so CI discovers them"
    - "NEXT_PUBLIC_TURNSTILE_SITE_KEY exists in .env.local.example as a documented placeholder"
  artifacts:
    - path: "package.json"
      provides: "Phase 2 dependencies (@marsidev/react-turnstile, disposable-email-domains-js, react-hook-form, @hookform/resolvers, zod)"
      contains: "@marsidev/react-turnstile"
    - path: ".env.local"
      provides: "NEXT_PUBLIC_TURNSTILE_SITE_KEY populated locally"
      contains: "NEXT_PUBLIC_TURNSTILE_SITE_KEY"
    - path: ".env.local.example"
      provides: "Placeholder for NEXT_PUBLIC_TURNSTILE_SITE_KEY so teammates know to set it"
      contains: "NEXT_PUBLIC_TURNSTILE_SITE_KEY"
    - path: "components/ui/form.tsx"
      provides: "shadcn Form primitive (Form, FormField, FormItem, FormLabel, FormControl, FormMessage)"
      exports: ["Form", "FormField", "FormItem", "FormLabel", "FormControl", "FormMessage"]
    - path: "components/ui/alert.tsx"
      provides: "shadcn Alert primitive for error banners"
      exports: ["Alert", "AlertTitle", "AlertDescription"]
    - path: "components/ui/separator.tsx"
      provides: "shadcn Separator used as the 'or' divider"
      exports: ["Separator"]
    - path: "tests/e2e/login-magic-link.spec.ts"
      provides: "E2E stub for AUTH-02 magic-link flow"
      contains: "test.describe"
    - path: "tests/e2e/legal-pages.spec.ts"
      provides: "E2E stub for AUTH-10 + GEO-04 legal-page coverage"
      contains: "test.describe"
  key_links:
    - from: "Google Cloud Console OAuth client"
      to: "Supabase Studio → Auth → Providers → Google"
      via: "Client ID + Secret + authorized redirect URI https://hfdcsickergdcdvejbcw.supabase.co/auth/v1/callback"
      pattern: "Google provider Enabled=true in Studio"
    - from: "Cloudflare Turnstile secret"
      to: "Supabase Studio → Auth → Bot and Abuse Protection"
      via: "CAPTCHA provider = Cloudflare Turnstile"
      pattern: "Turnstile enabled in Studio Bot Protection"
---

## Objective

Wave 0 procurement + package-install + test-stub scaffolding. This plan unblocks Wave 1 (backend) and Wave 2 (UI) by:

1. Creating the external accounts and wiring the secrets into Supabase Studio (Google OAuth client, Cloudflare Turnstile site).
2. Installing all npm/shadcn packages Phase 2 needs, and probing the ones whose export shape is not verified (`disposable-email-domains-js`, `signInWithOtp` + captchaToken).
3. Scaffolding 12 empty-but-runnable test files so Wave 1/2/3 work lands against a test harness that CI already discovers — no "tests added but not run" traps.

**Purpose:** Honor user decision D-AUTH-01 (Google OAuth), D-AUTH-02 (magic-link), D-AUTH-08 (Turnstile) and Research Assumption A4 (probe package export shape before Wave 1 depends on it).

**Output:** Procurement complete, `pnpm install` clean, three shadcn primitives in `components/ui/`, twelve test stubs in `tests/unit/` + `tests/e2e/`.

## Threat Model

Trust boundaries introduced here:

| Boundary | Description |
|----------|-------------|
| Google Cloud → Supabase | OAuth client ID is public, secret is private. Redirect-URI allowlist is the only thing preventing consent-screen → evil-site redirects. |
| Cloudflare Turnstile → Supabase | Secret key must live ONLY in Supabase Studio (not .env.local) — it never travels through our Next.js bundle. |
| Developer laptop → repo | `.env.local` is gitignored, `.env.local.example` is checked in with placeholders only. |

### STRIDE Threat Register

| Threat ID | Category | Component | Disposition | Mitigation Plan |
|-----------|----------|-----------|-------------|-----------------|
| T-2-01 | Tampering | OAuth redirect URI | mitigate | Supabase Studio URL allowlist restricts redirects to `http://localhost:3000/**`, `https://*-{vercel-team}.vercel.app/**`, `https://barterkin.com/**` — configured in Task 1 runbook |
| T-2-08 | Elevation of Privilege | Turnstile secret | mitigate | Store Turnstile SECRET in Supabase Studio ONLY (never commit, never add to `.env.local`); only `NEXT_PUBLIC_TURNSTILE_SITE_KEY` enters the Next.js environment |
| T-2-10 | Information Disclosure | Google OAuth Client Secret | mitigate | Store in Supabase Studio → Auth → Providers → Google; never commit; never surface in any log |

## Tasks

<task id="2-1-1" type="checkpoint:human-action">
  <title>Task 1.1: Google Cloud Console — create OAuth client + wire to Supabase</title>
  <read_first>
    - `.planning/phases/02-authentication-legal/02-RESEARCH.md` (Procurement runbook, lines 963–978)
    - `.planning/phases/02-authentication-legal/02-RESEARCH.md` (Pattern 4 + Pitfall 7 — redirect URI mismatch causes)
  </read_first>
  <action>
RUNBOOK — this task requires human action in three consoles. Claude cannot automate OAuth client creation; the human executor must follow the steps and return the Client ID + Secret.

1. Open Google Cloud Console (console.cloud.google.com).
2. Create or select project "barterkin-auth".
3. APIs & Services → OAuth consent screen:
   - User Type: External
   - App name: `Barterkin`
   - User support email: contact@biznomad.io
   - Developer contact: contact@biznomad.io
   - Scopes: `openid`, `email`, `profile` (defaults — do not add more)
   - Test users (while in Testing mode): add contact@biznomad.io
   - Save and continue; leave app in "Testing" mode for now (Supabase-mediated flow is not subject to the 100-test-user cap because users authenticate via Supabase's project redirect URI, not a Google-published client).
4. APIs & Services → Credentials → Create Credentials → OAuth Client ID:
   - Application type: Web application
   - Name: `Barterkin Supabase OAuth`
   - Authorized JavaScript origins (add all three):
     - `http://localhost:3000`
     - `https://barterkin.com`
     - `https://*-{VERCEL_TEAM}.vercel.app` (replace `{VERCEL_TEAM}` with the actual Vercel team slug — find via `vercel whoami` or Vercel dashboard)
   - Authorized redirect URIs (CRITICAL — must match Supabase project exactly):
     - `https://hfdcsickergdcdvejbcw.supabase.co/auth/v1/callback`
   - Create. Copy Client ID + Client Secret.
5. Open Supabase Studio → Authentication → Providers → Google:
   - Enable: ON
   - Client ID: paste from step 4
   - Client Secret: paste from step 4
   - Skip nonce checks: OFF (default)
   - Save.
6. Supabase Studio → Authentication → URL Configuration:
   - Site URL: `https://barterkin.com`
   - Additional Redirect URLs (one per line):
     - `http://localhost:3000/**`
     - `https://*-{VERCEL_TEAM}.vercel.app/**`
     - `https://barterkin.com/**`
   - Save.
7. Supabase Studio → Authentication → Settings → Email → "Confirm email": ensure ON (default — verify).

Record in phase STATE.md (or return to orchestrator): "Google OAuth wired. Client ID ends in `...{last4}`. Redirect URIs allowlisted in Supabase Studio."

Resume signal: type "google-oauth-done" or report the exact error encountered.
  </action>
  <acceptance_criteria>
    - Supabase Studio → Authentication → Providers shows Google as Enabled
    - `https://hfdcsickergdcdvejbcw.supabase.co/auth/v1/callback` appears in Google Cloud Console → Credentials → {OAuth Client} → Authorized redirect URIs
    - Supabase Studio → Authentication → URL Configuration shows all three allowlist entries (localhost, vercel preview wildcard, production)
    - Human confirms Client ID + Secret were saved into Studio (not committed anywhere)
  </acceptance_criteria>
</task>

<task id="2-1-2" type="checkpoint:human-action">
  <title>Task 1.2: Cloudflare Turnstile — create site + wire secret into Supabase</title>
  <read_first>
    - `.planning/phases/02-authentication-legal/02-RESEARCH.md` (Pattern 3 + Pattern 8 + Pitfall 2)
    - `.planning/phases/02-authentication-legal/02-UI-SPEC.md` (Copywriting → CAPTCHA/Turnstile Notice, lines 175–183)
  </read_first>
  <action>
RUNBOOK — human-only, two consoles.

1. Open Cloudflare dashboard → Turnstile → Add site.
   - Site name: `Barterkin`
   - Domain: `barterkin.com` (the entry also covers subdomains; additionally add `localhost` for local dev — Cloudflare allows `localhost` as a hostname on the site config)
   - Widget mode: `Managed` (default — shows challenge only when needed; right balance of friction vs. protection per UI-SPEC)
   - Pre-clearance: OFF (not needed for v1)
   - Create. Copy the **Site Key** (public) and **Secret Key** (private).
2. Wire the Site Key into the Next.js environment (public, safe to commit as an env var name):
   - Edit `.env.local`: add `NEXT_PUBLIC_TURNSTILE_SITE_KEY=<site_key>` on its own line.
   - Edit `.env.local.example`: add `NEXT_PUBLIC_TURNSTILE_SITE_KEY=your-turnstile-site-key-here` on its own line.
   - Do NOT add the Secret Key to `.env.local` or anywhere else in the repo. The secret lives in Supabase Studio only (see step 3). Per CLAUDE.md: this repo is public.
3. Open Supabase Studio → Authentication → Bot and Abuse Protection:
   - CAPTCHA provider: Cloudflare Turnstile
   - Secret Key: paste from step 1
   - Enable: ON
   - Save.
4. Wire the Site Key into Vercel env vars (so preview + production deploys get it):
   - Run (or ask user to run): `vercel env add NEXT_PUBLIC_TURNSTILE_SITE_KEY` and paste the key when prompted. Select: Development, Preview, Production. Repeat if `vercel env add` only takes one environment per invocation.
   - Alternative: Vercel dashboard → Project → Settings → Environment Variables → Add.

Record in phase STATE.md: "Turnstile site created. Site key in `.env.local` + Vercel env (Dev/Preview/Prod). Secret in Supabase Studio."

Resume signal: type "turnstile-done" or report the exact error encountered.
  </action>
  <acceptance_criteria>
    - `.env.local` contains `NEXT_PUBLIC_TURNSTILE_SITE_KEY=` with a non-empty value (human confirms, no grep — file is gitignored)
    - `.env.local.example` contains `NEXT_PUBLIC_TURNSTILE_SITE_KEY=` (value may be a placeholder)
    - Supabase Studio → Bot and Abuse Protection shows Turnstile enabled
    - Vercel env vars list (one-time check: `vercel env ls`) includes `NEXT_PUBLIC_TURNSTILE_SITE_KEY` for all three scopes
    - Secret Key appears NOWHERE in `.env.local`, `.env.local.example`, or any committed file
  </acceptance_criteria>
</task>

<task id="2-1-3" type="auto">
  <title>Task 1.3: Install Phase 2 npm dependencies</title>
  <read_first>
    - `package.json` (current dependencies — confirm what's already installed)
    - `.planning/phases/02-authentication-legal/02-RESEARCH.md` (Installation section, line 164–167)
  </read_first>
  <action>
Install the five Phase 2 npm packages via pnpm. Pin exact versions per RESEARCH Standard Stack Phase 2 additions table.

Run, from repo root:
```bash
pnpm add react-hook-form@^7.72.1 @hookform/resolvers@^5.2.2 zod@^4.3.6 @marsidev/react-turnstile@^1.5.0 disposable-email-domains-js@^1.24.0
```

Do NOT install them separately — single invocation to avoid multiple lockfile rewrites.

After install, verify `package.json` contains all five under `"dependencies"`:
- `react-hook-form` ^7.72.1 or higher
- `@hookform/resolvers` ^5.2.2 or higher
- `zod` ^4.3.6 or higher
- `@marsidev/react-turnstile` ^1.5.0 or higher
- `disposable-email-domains-js` ^1.24.0 or higher

Do NOT install dev-only; these are runtime deps (the Zod resolver is imported in client bundle; disposable-email-domains-js is server-only but is imported by `lib/utils/disposable-email.ts` at runtime).

If pnpm reports peer-dep warnings for react-hook-form/react 19 — they are expected (ecosystem catch-up); do not downgrade React.

Run `pnpm install` once more after the add to ensure a clean lockfile, then `git diff --stat package.json pnpm-lock.yaml` to confirm only additions.
  </action>
  <acceptance_criteria>
    - `grep -E '"(react-hook-form|@hookform/resolvers|zod|@marsidev/react-turnstile|disposable-email-domains-js)"' package.json` returns all five lines
    - `pnpm install` runs clean (exit 0, no errors — peer-dep warnings are OK)
    - `pnpm typecheck` still passes (no new type errors from the install)
  </acceptance_criteria>
</task>

<task id="2-1-4" type="auto">
  <title>Task 1.4: Install shadcn Form, Alert, Separator primitives</title>
  <read_first>
    - `components/ui/button.tsx` (existing shadcn pattern — confirm style + data-slot convention)
    - `.planning/phases/02-authentication-legal/02-UI-SPEC.md` (Component Inventory, lines 264–270)
  </read_first>
  <action>
Add the three shadcn components Phase 2 needs via the shadcn CLI (registry-safe per UI-SPEC Registry Safety table).

Run, from repo root:
```bash
pnpm dlx shadcn@latest add form alert separator
```

The CLI will:
- Prompt to install peer deps (Radix + RHF) — accept (they should already be installed from Task 1.3, but the CLI verifies)
- Write `components/ui/form.tsx`, `components/ui/alert.tsx`, `components/ui/separator.tsx`
- Update `components.json` registry info (no-op if already current)

Do NOT hand-edit the generated files. shadcn v4 generates `data-slot` attributes on all primitives — leave them intact (key codebase convention #5 in 02-PATTERNS.md).

If the CLI asks to overwrite existing components, check first: `ls components/ui/`. Phase 1 installed button/card/input/label only; form/alert/separator should not exist yet. If they do, investigate why before overwriting.

After install, confirm the three new files exist and export the expected primitives:
```bash
grep -E 'export (const|function) (Form|FormField|FormItem|FormLabel|FormControl|FormMessage)' components/ui/form.tsx
grep -E 'export (const|function) (Alert|AlertTitle|AlertDescription)' components/ui/alert.tsx
grep -E 'export (const|function) Separator' components/ui/separator.tsx
```
All three greps must return matches.
  </action>
  <acceptance_criteria>
    - `components/ui/form.tsx` exists and exports `Form`, `FormField`, `FormItem`, `FormLabel`, `FormControl`, `FormMessage`
    - `components/ui/alert.tsx` exists and exports `Alert`, `AlertTitle`, `AlertDescription`
    - `components/ui/separator.tsx` exists and exports `Separator`
    - `pnpm typecheck` passes
    - `pnpm build` passes (no unused-import errors; components are tree-shaken if unconsumed)
  </acceptance_criteria>
</task>

<task id="2-1-5" type="auto">
  <title>Task 1.5: Probe disposable-email-domains-js export shape (A4) + signInWithOtp captchaToken enforcement (Open Question 1)</title>
  <read_first>
    - `.planning/phases/02-authentication-legal/02-RESEARCH.md` (Assumption A4, line 900; Pattern 7, lines 698–709)
    - `node_modules/disposable-email-domains-js/package.json` (after install — check `main` / `module` / `exports` fields)
  </read_first>
  <action>
RESEARCH Assumption A4 is [ASSUMED] — the `DisposableEmailChecker` class export is not verified. Probe it now so Wave 1 can use the actual API shape, not a guessed one.

Run, from repo root:
```bash
node -e "
const pkg = require('disposable-email-domains-js');
console.log('typeof default:', typeof pkg.default);
console.log('typeof DisposableEmailChecker:', typeof pkg.DisposableEmailChecker);
console.log('top-level keys:', Object.keys(pkg));
if (pkg.DisposableEmailChecker) {
  const checker = new pkg.DisposableEmailChecker();
  console.log('mailinator.com disposable?', checker.isDisposable('mailinator.com'));
  console.log('gmail.com disposable?', checker.isDisposable('gmail.com'));
}
"
```

Three outcomes:

**Outcome A (RESEARCH assumption holds):** `DisposableEmailChecker` is a class, instantiable, with `isDisposable(domain)`. Record this in STATE.md: "A4 confirmed — use `new DisposableEmailChecker()` pattern per RESEARCH Pattern 7 verbatim."

**Outcome B (default export is a function):** pkg exports a function directly (e.g. `isDisposable(domain)`). Record in STATE.md: "A4 revised — use `isDisposable(domain)` function pattern; update Wave 1 Task 2.2 to use `{ isDisposable } from 'disposable-email-domains-js'` instead of the class."

**Outcome C (ESM-only, require fails):** Switch to `import()` syntax. Run:
```bash
node --input-type=module -e "
import('disposable-email-domains-js').then(mod => {
  console.log('keys:', Object.keys(mod));
  console.log('typeof default:', typeof mod.default);
});
"
```
Record the resolved shape.

Write a short note (1 paragraph) to `.planning/phases/02-authentication-legal/02-A4-PROBE.md` summarizing which outcome occurred and the exact import line Wave 1 must use. This file is consumed by Wave 1 plan 02-02 task 2-2-2.

---

**Step 2: Probe signInWithOtp captchaToken enforcement (Open Question 1 from 02-RESEARCH.md)**

Open Question 1 asks: does `signInWithOtp` enforce Supabase's server-side CAPTCHA verification when an invalid `captchaToken` is passed? Task 2.4 (Plan 02-02) depends on the answer — if Supabase rejects invalid captchaTokens, we rely on it. If it does NOT, we must add a server-side `/siteverify` check in lib/actions/auth.ts BEFORE the signInWithOtp call.

Run, from repo root (requires Cloudflare Turnstile wired per Task 1.2 + `NEXT_PUBLIC_SUPABASE_URL` + `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` in .env.local):
```bash
node -e "
import('@supabase/supabase-js').then(async ({ createClient }) => {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
  )
  const { data, error } = await supabase.auth.signInWithOtp({
    email: 'probe-noreply-delete@example.com',
    options: { captchaToken: 'deliberately-invalid-token-probe' },
  })
  console.log('error:', error?.message ?? 'none')
  console.log('error code:', error?.code ?? 'none')
  console.log('status:', error?.status ?? 'none')
  console.log('data:', JSON.stringify(data))
})
"
```

Three outcomes for Q1:

**Outcome Q1-A (Supabase REJECTS the invalid token — RESEARCH A1 confirmed):** error includes `captcha` or `bot` or `verification` in message/code. Record in `02-A4-PROBE.md`: "Q1 confirmed — Supabase enforces captchaToken on signInWithOtp. Plan 02-02 Task 2.4 relies on this; no extra /siteverify call needed."

**Outcome Q1-B (Supabase ACCEPTS the invalid token — RESEARCH A1 rejected):** error is null, or error is about something else (e.g., rate limit). Record in `02-A4-PROBE.md`: "Q1 REJECTED — Supabase does NOT enforce captchaToken on signInWithOtp. Plan 02-02 Task 2.4 MUST add a server-side /siteverify call in lib/actions/auth.ts between the rate-limit check and the signInWithOtp call. Add a new file lib/utils/turnstile-verify.ts that POSTs to https://challenges.cloudflare.com/turnstile/v0/siteverify with secret + token; reject the sendMagicLink server action if verification fails." This is a 1-file additive change to 02-02 Task 2.4 — the planner and executor should NOT treat this as a blocker.

**Outcome Q1-C (probe errors before reaching Supabase, e.g., env vars missing):** record that the probe was not runnable in this environment; defer to first real E2E test in Wave 3 (Plan 02-04 Task 4.4 captcha-required.spec.ts) as the de facto resolution gate.

Append the Q1 outcome to the SAME `02-A4-PROBE.md` file. The file is now the resolution-of-record for BOTH A4 (export shape) and Q1 (captchaToken enforcement).
  </action>
  <acceptance_criteria>
    - File `.planning/phases/02-authentication-legal/02-A4-PROBE.md` exists with an explicit "Wave 1 must use: `import ... from 'disposable-email-domains-js'`" line
    - The disposable-email probe command prints "mailinator.com disposable? true" and "gmail.com disposable? false" (or the Outcome B/C equivalents)
    - The same `02-A4-PROBE.md` file records the Q1 (captchaToken enforcement) probe outcome with one of Q1-A, Q1-B, or Q1-C
    - If Outcome Q1-B: the file includes a TODO pointer instructing Plan 02-02 Task 2.4 to add `lib/utils/turnstile-verify.ts` before the signInWithOtp call
  </acceptance_criteria>
</task>

<task id="2-1-6" type="auto">
  <title>Task 1.6: Create all 13 Wave 0 test stubs (empty-but-discovered)</title>
  <read_first>
    - `tests/unit/smoke.test.ts` (Vitest stub pattern — describe + it.todo)
    - `tests/e2e/smoke.spec.ts` (Playwright stub pattern — test.describe + test.fixme)
    - `vitest.config.ts` (confirm `include: ['tests/unit/**/*.{test,spec}.{ts,tsx}']`)
    - `playwright.config.ts` (confirm `testDir: 'tests/e2e'`)
  </read_first>
  <action>
Create 13 test stub files so CI (`pnpm test && pnpm e2e`) discovers them in Wave 1/2/3 and reports them as pending. Using `it.todo` (Vitest) and `test.fixme` (Playwright) per 02-PATTERNS.md — neither fails CI; both surface the pending test in the reporter.

**4 unit test stubs** in `tests/unit/`:

`tests/unit/disposable-email.test.ts`:
```ts
import { describe, it } from 'vitest'

describe('isDisposableEmail (AUTH-07)', () => {
  it.todo('rejects @mailinator.com')
  it.todo('rejects @tempmail.com')
  it.todo('rejects @10minutemail.com')
  it.todo('rejects @throwaway.email')
  it.todo('rejects @guerrillamail.com')
  it.todo('accepts @gmail.com')
  it.todo('accepts @outlook.com')
  it.todo('accepts @icloud.com')
  it.todo('accepts @fastmail.com')
  it.todo('accepts @proton.me')
  it.todo('returns false for malformed email (no @)')
  it.todo('lowercases domain before check')
})
```

`tests/unit/rate-limit.test.ts`:
```ts
import { describe, it } from 'vitest'

describe('checkSignupRateLimit (AUTH-06)', () => {
  it.todo('returns { allowed: true } for first signup from an IP')
  it.todo('returns { allowed: true } for the 5th signup from the same IP on the same day')
  it.todo('returns { allowed: false } for the 6th signup from the same IP on the same day')
  it.todo('resets count at day boundary')
  it.todo('handles x-forwarded-for with multiple entries (takes first)')
  it.todo('handles missing IP gracefully (does not crash)')
})
```

`tests/unit/magic-link-schema.test.ts`:
```ts
import { describe, it } from 'vitest'

describe('MagicLinkSchema (AUTH-02)', () => {
  it.todo('accepts a valid email + captcha token')
  it.todo('rejects missing email')
  it.todo('rejects malformed email (no @)')
  it.todo('rejects empty captcha token')
  it.todo('lowercases email')
  it.todo('trims whitespace')
})
```

`tests/unit/rls-email-verify.test.ts` (AUTH-04 RLS coverage — requires local supabase start):
```ts
import { describe, it } from 'vitest'

/**
 * AUTH-04 RLS coverage stub. The actual RLS policy on the profiles table is
 * not installed until Phase 3 (the profiles table itself is Phase 3 work).
 * Phase 2 installs the `current_user_is_verified()` helper function that
 * Phase 3's RLS policy will consume.
 *
 * These tests run against a local Supabase instance (`supabase start`) and
 * use a service-role seeded authed session to assert the RLS policy blocks
 * unverified users. Until Phase 3 creates the profiles table + policy, every
 * case is test.skip with the marker RLS_REQUIRES_LOCAL_SUPABASE so CI
 * surfaces them as pending.
 */
describe('RLS email-verify gate (AUTH-04)', () => {
  it.todo('RLS_REQUIRES_LOCAL_SUPABASE: current_user_is_verified() returns false when email_confirmed_at is null')
  it.todo('RLS_REQUIRES_LOCAL_SUPABASE: current_user_is_verified() returns true when email_confirmed_at is set')
  it.todo('RLS_REQUIRES_LOCAL_SUPABASE: profiles SELECT policy (Phase 3) denies unverified user')
  it.todo('RLS_REQUIRES_LOCAL_SUPABASE: profiles SELECT policy (Phase 3) allows verified user')
})
```

**9 E2E test stubs** in `tests/e2e/`:

`tests/e2e/login-magic-link.spec.ts`:
```ts
import { test } from '@playwright/test'

test.describe('login — magic link (AUTH-02)', () => {
  test.fixme('email input renders and accepts input', async () => {})
  test.fixme('submitting a valid email shows "Check your email" confirmation', async () => {})
  test.fixme('submitting @mailinator.com shows disposable-email error copy', async () => {})
  test.fixme('submitting without completing Turnstile keeps button disabled', async () => {})
})
```

`tests/e2e/login-google-oauth.spec.ts`:
```ts
import { test } from '@playwright/test'

test.describe('login — Google OAuth (AUTH-01)', () => {
  test.fixme('Continue with Google button renders on /login', async () => {})
  test.fixme('clicking the button initiates a redirect to accounts.google.com', async () => {})
})
```

`tests/e2e/verify-pending-gate.spec.ts`:
```ts
import { test } from '@playwright/test'

test.describe('verify-pending gate (AUTH-04)', () => {
  test.fixme('authed-but-unverified user is redirected from /directory to /verify-pending', async () => {})
  test.fixme('/verify-pending shows "One more step" heading and Resend button', async () => {})
  test.fixme('/verify-pending is accessible to authed-unverified users (no redirect loop)', async () => {})
})
```

`tests/e2e/auth-group-redirect.spec.ts`:
```ts
import { test } from '@playwright/test'

test.describe('auth-group redirect (AUTH-09)', () => {
  test.fixme('authed user visiting /login is redirected to /directory', async () => {})
  test.fixme('authed user visiting /signup is redirected to /directory', async () => {})
  test.fixme('unauthed user visiting /login sees the login page', async () => {})
})
```

`tests/e2e/session-persistence.spec.ts`:
```ts
import { test } from '@playwright/test'

test.describe('session persistence (AUTH-03)', () => {
  test.fixme('authed session survives a full page reload', async () => {})
  test.fixme('authed session survives cookie-age simulation up to 30 days', async () => {})
})
```

`tests/e2e/logout.spec.ts`:
```ts
import { test } from '@playwright/test'

test.describe('logout (AUTH-05)', () => {
  test.fixme('clicking Log out in footer clears the session cookie', async () => {})
  test.fixme('after logout, visiting /directory redirects to /login', async () => {})
  test.fixme('/auth/signout GET returns 405 (POST-only)', async () => {})
})
```

`tests/e2e/captcha-required.spec.ts`:
```ts
import { test } from '@playwright/test'

test.describe('CAPTCHA required (AUTH-08)', () => {
  test.fixme('Turnstile widget is visible on /login', async () => {})
  test.fixme('Turnstile widget is visible on /signup', async () => {})
  test.fixme('magic-link submit button is disabled until Turnstile verifies', async () => {})
})
```

`tests/e2e/legal-pages.spec.ts`:
```ts
import { test } from '@playwright/test'

test.describe('legal pages (AUTH-10 + GEO-04)', () => {
  test.fixme('/legal/tos renders with H1 "Terms of Service"', async () => {})
  test.fixme('/legal/tos contains the GEO-04 Georgia non-residency clause verbatim', async () => {})
  test.fixme('/legal/privacy renders with H1 "Privacy Policy"', async () => {})
  test.fixme('/legal/guidelines renders with H1 "Community Guidelines"', async () => {})
})
```

`tests/e2e/footer-links.spec.ts`:
```ts
import { test } from '@playwright/test'

test.describe('footer links (AUTH-10 + UI-SPEC)', () => {
  test.fixme('footer shows Terms, Privacy, Community Guidelines links on every route', async () => {})
  test.fixme('footer shows Sign in link when unauthed', async () => {})
  test.fixme('footer shows Log out button when authed', async () => {})
})
```

After writing all 12 files, run `pnpm test` (should exit 0 with 3 test files found, all `todo`) and `pnpm e2e` (should exit 0 with 9 spec files found, all `fixme`). If either framework reports "no tests found," the include path is wrong — check vitest.config.ts and playwright.config.ts.
  </action>
  <acceptance_criteria>
    - `ls tests/unit/*.test.ts | wc -l` ≥ 5 (4 new + existing smoke.test.ts)
    - `ls tests/e2e/*.spec.ts | wc -l` ≥ 10 (9 new + existing smoke.spec.ts)
    - `pnpm test` exits 0 with the 4 new files discovered and showing "todo" markers
    - `pnpm e2e` exits 0 with the 9 new files discovered; `test.fixme` tests do not fail the suite
  </acceptance_criteria>
</task>

## Verification

After all six tasks complete:

```bash
# Packages installed
grep -E '"(react-hook-form|@hookform/resolvers|zod|@marsidev/react-turnstile|disposable-email-domains-js)"' package.json

# shadcn primitives
ls components/ui/{form,alert,separator}.tsx

# Test discovery
pnpm test     # 4 new unit files found, all todo
pnpm e2e      # 9 new e2e files found, all fixme

# Type + lint still green (no regressions from installs)
pnpm typecheck && pnpm lint && pnpm build

# A4 probe recorded
cat .planning/phases/02-authentication-legal/02-A4-PROBE.md
```

Manually verify with human:
- Google OAuth Enabled in Supabase Studio → Providers
- Turnstile Enabled in Supabase Studio → Bot and Abuse Protection
- `NEXT_PUBLIC_TURNSTILE_SITE_KEY` in Vercel env vars (all 3 scopes)

## success_criteria

- [ ] Google Cloud Console OAuth client exists; redirect URI allowlists the Supabase callback
- [ ] Supabase Studio Google provider Enabled with real Client ID + Secret
- [ ] Supabase Studio URL Configuration allowlists localhost, Vercel preview, production
- [ ] Cloudflare Turnstile site exists; Site Key in `.env.local` + Vercel env; Secret Key in Supabase Studio only
- [ ] `package.json` has all 5 Phase 2 npm deps pinned to the Research-verified minimum versions
- [ ] `components/ui/{form,alert,separator}.tsx` all present and compile
- [ ] `.planning/phases/02-authentication-legal/02-A4-PROBE.md` records the confirmed disposable-email-domains-js export shape
- [ ] 13 test stub files present; `pnpm test && pnpm e2e` both exit 0
- [ ] No secret appears in any committed file (grep `git ls-files | xargs grep -l TURNSTILE_SECRET` returns empty)

## output

After completion, create `.planning/phases/02-authentication-legal/02-01-SUMMARY.md` recording:
- Google OAuth Client ID (last 4 chars only, for audit — never the full ID)
- Turnstile Site Key (first 10 chars, for audit)
- Disposable-email probe outcome (A, B, or C per Task 1.5)
- List of 12 test stub files created
- Any deviations from RESEARCH Pattern expectations
