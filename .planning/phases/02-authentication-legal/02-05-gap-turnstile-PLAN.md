---
phase: 02-authentication-legal
plan: 05
type: execute
wave: 1
depends_on: []
files_modified:
  - components/auth/GoogleAuthBlock.tsx
  - components/auth/LoginForm.tsx
  - app/(auth)/login/page.tsx
  - app/(auth)/signup/page.tsx
autonomous: true
gap_closure: true
requirements:
  - AUTH-08
must_haves:
  truths:
    - "Auth pages (/login and /signup) show exactly ONE Cloudflare Turnstile widget at any time"
    - "The single Turnstile widget gates BOTH the Google OAuth button AND the magic-link form (both disabled until token resolves; both enabled after)"
    - "Turnstile token expiration / error clears state for both Google button and magic-link form simultaneously"
  artifacts:
    - path: "app/(auth)/login/page.tsx"
      provides: "Owns captchaToken state; renders single TurnstileWidget; passes token to GoogleAuthBlock and LoginForm"
      contains: "useState"
    - path: "app/(auth)/signup/page.tsx"
      provides: "Same pattern as login page"
      contains: "useState"
    - path: "components/auth/GoogleAuthBlock.tsx"
      provides: "Receives captchaToken via prop; no internal Turnstile widget"
      exports: ["GoogleAuthBlock"]
    - path: "components/auth/LoginForm.tsx"
      provides: "Receives captchaToken via prop; no internal Turnstile widget"
      exports: ["LoginForm"]
  key_links:
    - from: "app/(auth)/login/page.tsx"
      to: "TurnstileWidget"
      via: "single render at page level"
      pattern: "<TurnstileWidget"
    - from: "app/(auth)/login/page.tsx"
      to: "GoogleAuthBlock"
      via: "captchaToken prop"
      pattern: "captchaToken={captchaToken}"
    - from: "app/(auth)/login/page.tsx"
      to: "LoginForm"
      via: "captchaToken prop"
      pattern: "captchaToken={captchaToken}"
---

<objective>
Fix UAT Gap 1 (major): two Cloudflare Turnstile CAPTCHA widgets render simultaneously on /login and /signup.

Root cause: both `GoogleAuthBlock` and `LoginForm` instantiate their own `TurnstileWidget` with independent local state. When both components are placed on the same page, two widgets appear.

Fix: lift `captchaToken` state to the page level. Render exactly one shared `TurnstileWidget` at the page level. Pass the resolved `captchaToken` down as a prop to both `GoogleAuthBlock` and `LoginForm`. Remove the internal widgets and internal state from both child components.

Purpose: AUTH-08 says "Cloudflare Turnstile CAPTCHA gates signup form" — singular gate. Two widgets is broken UX (which one am I solving?), wastes Turnstile quota, and confuses users. UI-SPEC and verification artifacts assume one widget per auth page.

Output: A single shared CAPTCHA gates both auth paths on each page; both buttons (Google + magic-link) become enabled together when the user solves Turnstile.
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
@components/auth/TurnstileWidget.tsx
@components/auth/GoogleButton.tsx

<interfaces>
<!-- Key contracts for this plan. Do NOT change these signatures unless noted. -->

From components/auth/TurnstileWidget.tsx (DO NOT MODIFY):
```typescript
interface TurnstileWidgetProps {
  onVerify: (token: string) => void
  onExpire?: () => void
  onError?: () => void
}
export function TurnstileWidget(props: TurnstileWidgetProps): JSX.Element
```

From components/auth/GoogleButton.tsx (DO NOT MODIFY):
```typescript
interface GoogleButtonProps {
  captchaToken: string | null
}
export function GoogleButton({ captchaToken }: GoogleButtonProps): JSX.Element
```

NEW signatures after this plan:
```typescript
// GoogleAuthBlock — strip internal state + Turnstile, become a prop-driven thin wrapper
interface GoogleAuthBlockProps {
  captchaToken: string | null
}
export function GoogleAuthBlock({ captchaToken }: GoogleAuthBlockProps): JSX.Element

// LoginForm — strip internal Turnstile widget; receive token via prop
interface LoginFormProps {
  captchaToken: string | null
}
export function LoginForm({ captchaToken }: LoginFormProps): JSX.Element
```

Page composition pattern (login + signup both follow this):
```tsx
'use client' // pages MUST become client components to own useState

const [captchaToken, setCaptchaToken] = useState<string | null>(null)
// ...
<GoogleAuthBlock captchaToken={captchaToken} />
<Separator>or</Separator>
<LoginForm captchaToken={captchaToken} />
<TurnstileWidget
  onVerify={(t) => setCaptchaToken(t)}
  onExpire={() => setCaptchaToken(null)}
  onError={() => setCaptchaToken(null)}
/>
```

Note: `metadata` exports are NOT permitted in client components. Move metadata to layout or a parent server-component shell, OR keep page as server component and put state owner in a small client wrapper.
</interfaces>
</context>

<tasks>

<task type="auto">
  <name>Task 1: Strip internal Turnstile from GoogleAuthBlock and LoginForm; accept captchaToken via prop</name>
  <files>components/auth/GoogleAuthBlock.tsx, components/auth/LoginForm.tsx</files>
  <read_first>
    - components/auth/GoogleAuthBlock.tsx (current state — see internal useState + TurnstileWidget render)
    - components/auth/LoginForm.tsx (current state — see internal captchaToken useState on line 33 + TurnstileWidget render lines 98–102)
    - components/auth/TurnstileWidget.tsx (props contract — do NOT modify)
    - components/auth/GoogleButton.tsx (already accepts captchaToken: string | null prop — pattern to follow)
  </read_first>
  <action>
    **components/auth/GoogleAuthBlock.tsx** — replace entire file content with:

    ```tsx
    'use client'

    import { GoogleButton } from './GoogleButton'

    /**
     * AUTH-01 + AUTH-08: Google OAuth CTA. Receives the shared captchaToken
     * from the page-level Turnstile widget (single CAPTCHA per page — UAT Gap 1 fix).
     */
    export function GoogleAuthBlock({ captchaToken }: { captchaToken: string | null }) {
      return (
        <div className="space-y-3">
          <GoogleButton captchaToken={captchaToken} />
        </div>
      )
    }
    ```

    Removed: `useState`, `TurnstileWidget` import + render. Block is now a thin prop-driven wrapper.

    **components/auth/LoginForm.tsx** — apply these specific changes (do NOT rewrite the whole file):

    1. Remove the import line: `import { TurnstileWidget } from './TurnstileWidget'` (line 20).
    2. Update the function signature on line 28:
       From: `export function LoginForm() {`
       To:   `export function LoginForm({ captchaToken }: { captchaToken: string | null }) {`
    3. Remove the internal captchaToken state (current line 33):
       Delete: `const [captchaToken, setCaptchaToken] = useState<string | null>(null)`
    4. Remove the entire `<TurnstileWidget ... />` element block (current lines 98–102) — do NOT remove the hidden input on line 103, that stays so the server action still receives `cf-turnstile-response`.

    After these edits LoginForm:
    - imports `useState` only if still used elsewhere (it's used by `submittedEmail` on line 34 — keep `useState` import)
    - takes `captchaToken` from props
    - has zero local Turnstile state
    - the existing `<input type="hidden" name="cf-turnstile-response" value={captchaToken ?? ''} />` continues to forward the token to `sendMagicLink`
    - the existing `disabled={pending || !captchaToken}` on the submit Button still works (now reads prop instead of local state)
  </action>
  <verify>
    <automated>cd /Users/ashleyakbar/barterkin && grep -c "TurnstileWidget" components/auth/GoogleAuthBlock.tsx components/auth/LoginForm.tsx | grep -E ":0$"</automated>
  </verify>
  <acceptance_criteria>
    - `grep -c "TurnstileWidget" components/auth/GoogleAuthBlock.tsx` outputs `0`
    - `grep -c "TurnstileWidget" components/auth/LoginForm.tsx` outputs `0`
    - `grep -c "useState<string | null>(null)" components/auth/GoogleAuthBlock.tsx` outputs `0` (no local captchaToken state)
    - `grep "captchaToken: string | null" components/auth/GoogleAuthBlock.tsx` matches (prop signature present)
    - `grep "captchaToken: string | null" components/auth/LoginForm.tsx` matches (prop signature present)
    - `grep 'name="cf-turnstile-response"' components/auth/LoginForm.tsx` matches (hidden input retained — token still reaches server action)
    - `pnpm typecheck` exits 0
  </acceptance_criteria>
  <done>
    GoogleAuthBlock and LoginForm both accept `captchaToken: string | null` as a prop. Neither imports nor renders TurnstileWidget. LoginForm still forwards the token to the server action via its hidden input. typecheck passes.
  </done>
</task>

<task type="auto">
  <name>Task 2: Add page-level Turnstile owner to /login and /signup</name>
  <files>app/(auth)/login/page.tsx, app/(auth)/signup/page.tsx</files>
  <read_first>
    - app/(auth)/login/page.tsx (current state — server component with metadata export)
    - app/(auth)/signup/page.tsx (current state — server component with metadata export)
    - components/auth/TurnstileWidget.tsx (props: onVerify, onExpire, onError)
    - components/auth/GoogleAuthBlock.tsx (NEW signature from Task 1: { captchaToken: string | null })
    - components/auth/LoginForm.tsx (NEW signature from Task 1: { captchaToken: string | null })
  </read_first>
  <action>
    Both pages need to OWN the captchaToken state. Because `useState` requires a client component but `metadata` export requires a server component, use this pattern: keep page.tsx as a server component (preserves `metadata` export), and create an inline client wrapper that owns state.

    **app/(auth)/login/page.tsx** — replace entire file with:

    ```tsx
    import Link from 'next/link'
    import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
    import { LoginAuthCard } from './LoginAuthCard'

    export const metadata = { title: 'Sign in' }

    export default function LoginPage() {
      return (
        <Card className="max-w-[400px] w-full bg-sage-pale border-sage-light">
          <CardHeader>
            <CardTitle className="font-serif text-2xl font-bold leading-[1.2]">
              Welcome to Barterkin
            </CardTitle>
            <CardDescription className="text-base leading-[1.5] text-muted-foreground">
              Sign in to find and offer skills in your Georgia community.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <LoginAuthCard mode="login" />
            <p className="text-sm text-muted-foreground text-center">
              By continuing, you agree to our{' '}
              <Link href="/legal/tos" className="underline">Terms of Service</Link>,{' '}
              <Link href="/legal/privacy" className="underline">Privacy Policy</Link>, and{' '}
              <Link href="/legal/guidelines" className="underline">Community Guidelines</Link>.
            </p>
            <p className="text-sm text-center">
              New here?{' '}
              <Link href="/signup" className="underline">Create an account</Link>
            </p>
          </CardContent>
        </Card>
      )
    }
    ```

    **app/(auth)/signup/page.tsx** — replace entire file with:

    ```tsx
    import Link from 'next/link'
    import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
    import { LoginAuthCard } from '../login/LoginAuthCard'

    export const metadata = { title: 'Create an account' }

    export default function SignupPage() {
      return (
        <Card className="max-w-[400px] w-full bg-sage-pale border-sage-light">
          <CardHeader>
            <CardTitle className="font-serif text-2xl font-bold leading-[1.2]">
              Welcome to Barterkin
            </CardTitle>
            <CardDescription className="text-base leading-[1.5] text-muted-foreground">
              Create an account to join the Georgia skills-barter directory.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <LoginAuthCard mode="signup" />
            <p className="text-sm text-muted-foreground text-center">
              By continuing, you agree to our{' '}
              <Link href="/legal/tos" className="underline">Terms of Service</Link>,{' '}
              <Link href="/legal/privacy" className="underline">Privacy Policy</Link>, and{' '}
              <Link href="/legal/guidelines" className="underline">Community Guidelines</Link>.
            </p>
            <p className="text-sm text-center">
              Already have an account?{' '}
              <Link href="/login" className="underline">Sign in</Link>
            </p>
          </CardContent>
        </Card>
      )
    }
    ```

    **app/(auth)/login/LoginAuthCard.tsx** — CREATE this new file (the shared client component that owns captchaToken state):

    ```tsx
    'use client'

    import { useState } from 'react'
    import { GoogleAuthBlock } from '@/components/auth/GoogleAuthBlock'
    import { LoginForm } from '@/components/auth/LoginForm'
    import { TurnstileWidget } from '@/components/auth/TurnstileWidget'
    import { Separator } from '@/components/ui/separator'

    /**
     * UAT Gap 1 fix: single shared Turnstile widget gates both Google OAuth and
     * magic-link auth paths. captchaToken state lives here (page-level) and is
     * passed down to both GoogleAuthBlock and LoginForm so they share one CAPTCHA.
     *
     * mode prop is currently presentational — both /login and /signup render the
     * same composition; mode is reserved for future copy variants.
     */
    export function LoginAuthCard({ mode: _mode }: { mode: 'login' | 'signup' }) {
      const [captchaToken, setCaptchaToken] = useState<string | null>(null)

      return (
        <div className="space-y-6">
          <GoogleAuthBlock captchaToken={captchaToken} />

          <div className="flex items-center gap-3">
            <Separator className="flex-1" />
            <span className="text-sm text-muted-foreground">or</span>
            <Separator className="flex-1" />
          </div>

          <LoginForm captchaToken={captchaToken} />

          <TurnstileWidget
            onVerify={(t) => setCaptchaToken(t)}
            onExpire={() => setCaptchaToken(null)}
            onError={() => setCaptchaToken(null)}
          />
        </div>
      )
    }
    ```

    Note: file is colocated at `app/(auth)/login/LoginAuthCard.tsx` (route groups can host non-page files). The signup page imports it from `../login/LoginAuthCard` to share the same client component without duplication. The single TurnstileWidget renders BELOW both auth controls (inside this client component), keeping the visual order GoogleButton → "or" → email form → Turnstile → submit. (If a different visual order is preferred, move the TurnstileWidget JSX block above the Google block — this does not affect the single-widget guarantee.)
  </action>
  <verify>
    <automated>cd /Users/ashleyakbar/barterkin && pnpm typecheck && pnpm build 2>&1 | tail -20</automated>
  </verify>
  <acceptance_criteria>
    - File `app/(auth)/login/LoginAuthCard.tsx` exists
    - `grep "'use client'" "app/(auth)/login/LoginAuthCard.tsx"` matches
    - `grep "useState<string | null>(null)" "app/(auth)/login/LoginAuthCard.tsx"` matches (state is owned at page wrapper)
    - `grep -c "<TurnstileWidget" "app/(auth)/login/LoginAuthCard.tsx"` outputs `1` (exactly one widget instance)
    - `grep "captchaToken={captchaToken}" "app/(auth)/login/LoginAuthCard.tsx"` matches at least twice (passed to both children)
    - `grep "LoginAuthCard" "app/(auth)/login/page.tsx"` matches (page imports the wrapper)
    - `grep "LoginAuthCard" "app/(auth)/signup/page.tsx"` matches (page imports the wrapper)
    - `grep "from '../login/LoginAuthCard'" "app/(auth)/signup/page.tsx"` matches (signup reuses the same wrapper)
    - `grep "export const metadata" "app/(auth)/login/page.tsx"` matches (metadata still exports — page is still server component)
    - `pnpm typecheck` exits 0
    - `pnpm build` exits 0
  </acceptance_criteria>
  <done>
    `/login` and `/signup` each render exactly ONE TurnstileWidget. The widget's onVerify updates state at the page-wrapper level. The same captchaToken value flows to both GoogleAuthBlock and LoginForm so both buttons enable/disable together. Metadata exports preserved on both pages. Build + typecheck pass.
  </done>
</task>

<task type="auto">
  <name>Task 3: Manual smoke check — load both pages, count widgets, confirm state propagation</name>
  <files>(no new files; verification only)</files>
  <read_first>
    - app/(auth)/login/LoginAuthCard.tsx (just-created file)
    - app/(auth)/login/page.tsx (just-modified)
    - app/(auth)/signup/page.tsx (just-modified)
  </read_first>
  <action>
    Run a headless DOM check via Playwright to confirm exactly one Turnstile iframe loads per auth page.

    1. Boot the dev server in background: `pnpm dev` (it will be killed by the executor after).
    2. Wait until `http://localhost:3000` returns 200.
    3. Run this Playwright assertion (executor uses Playwright via /browse skill or `npx playwright test --grep` against an inline test). If a test file is needed, create `tests/e2e/single-turnstile.spec.ts` containing:

       ```ts
       import { test, expect } from '@playwright/test'

       test.describe('UAT Gap 1: single Turnstile per auth page', () => {
         test('/login renders exactly one Turnstile container', async ({ page }) => {
           await page.goto('/login')
           // The @marsidev/react-turnstile widget renders an iframe with src containing 'challenges.cloudflare.com'.
           // Without a live sitekey it renders the dev-fallback div instead — assert one OR the other, not zero, not two.
           const widgetCount = await page.evaluate(() => {
             const iframes = document.querySelectorAll('iframe[src*="challenges.cloudflare.com"]')
             const fallback = document.querySelectorAll('div').length
               ? Array.from(document.querySelectorAll('div')).filter((d) =>
                   (d.textContent || '').includes('Missing NEXT_PUBLIC_TURNSTILE_SITE_KEY'),
                 ).length
               : 0
             return iframes.length + fallback
           })
           expect(widgetCount).toBe(1)
         })

         test('/signup renders exactly one Turnstile container', async ({ page }) => {
           await page.goto('/signup')
           const widgetCount = await page.evaluate(() => {
             const iframes = document.querySelectorAll('iframe[src*="challenges.cloudflare.com"]')
             const fallback = Array.from(document.querySelectorAll('div')).filter((d) =>
               (d.textContent || '').includes('Missing NEXT_PUBLIC_TURNSTILE_SITE_KEY'),
             ).length
             return iframes.length + fallback
           })
           expect(widgetCount).toBe(1)
         })
       })
       ```

    4. Run: `pnpm playwright test tests/e2e/single-turnstile.spec.ts`
    5. Both tests must pass.

    If `pnpm dev` cannot boot in this environment, fall back to a static check: `grep -c "TurnstileWidget" components/auth/GoogleAuthBlock.tsx components/auth/LoginForm.tsx app/(auth)/login/LoginAuthCard.tsx app/(auth)/signup/page.tsx app/(auth)/login/page.tsx` should sum to exactly 1 (the single render in LoginAuthCard).
  </action>
  <verify>
    <automated>cd /Users/ashleyakbar/barterkin && pnpm playwright test tests/e2e/single-turnstile.spec.ts --reporter=line 2>&1 | tail -10</automated>
  </verify>
  <acceptance_criteria>
    - File `tests/e2e/single-turnstile.spec.ts` exists with both `/login` and `/signup` tests
    - `pnpm playwright test tests/e2e/single-turnstile.spec.ts` exits 0
    - Test output shows `2 passed`
    - Static fallback (if Playwright unavailable): `grep -rc "<TurnstileWidget" components/auth app/\(auth\) | awk -F: '{sum+=$NF} END {print sum}'` outputs `1`
  </acceptance_criteria>
  <done>
    Playwright proves exactly one Turnstile widget renders on /login and exactly one on /signup. UAT Gap 1 closed.
  </done>
</task>

</tasks>

<verification>
- `grep -c "TurnstileWidget" components/auth/GoogleAuthBlock.tsx` outputs `0`
- `grep -c "TurnstileWidget" components/auth/LoginForm.tsx` outputs `0`
- `grep -c "<TurnstileWidget" "app/(auth)/login/LoginAuthCard.tsx"` outputs `1`
- `pnpm typecheck && pnpm build` both exit 0
- Playwright spec asserts widget count of exactly 1 on both pages
- Manual UAT re-run for test 2 + test 3: only one CAPTCHA visible on /login and /signup
</verification>

<success_criteria>
- AUTH-08 satisfied with a single CAPTCHA gate per page (not two)
- Both Google OAuth button and magic-link submit are enabled/disabled together based on shared captchaToken
- All existing tests still pass (`pnpm test` + `pnpm playwright test` exit 0)
- UAT test 2 + test 3 re-run with `result: pass` on next QA pass
</success_criteria>

<output>
After completion, create `.planning/phases/02-authentication-legal/02-05-SUMMARY.md` documenting:
- Files modified and their before/after Turnstile widget count
- New file `app/(auth)/login/LoginAuthCard.tsx` and the rationale (server-component metadata + client-component state owner)
- Playwright spec added at `tests/e2e/single-turnstile.spec.ts`
- Re-tested UAT items: 2 and 3
</output>
