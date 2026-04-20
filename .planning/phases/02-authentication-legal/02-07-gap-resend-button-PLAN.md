---
phase: 02-authentication-legal
plan: 07
type: execute
wave: 1
depends_on: []
files_modified:
  - components/auth/ResendLinkButton.tsx
  - app/verify-pending/page.tsx
autonomous: true
gap_closure: true
requirements:
  - AUTH-04
must_haves:
  truths:
    - "Clicking the Resend verification link button on /verify-pending navigates the user to /login (with email prefilled when known, without ?email= when not)"
    - "When the user is not signed in (getClaims returns no email), the button still navigates to /login — never produces /login?email= with an empty value"
    - "When the user IS signed in with a known email, the button navigates to /login?email=<their-email> so the email field is prefilled"
  artifacts:
    - path: "components/auth/ResendLinkButton.tsx"
      provides: "Button that always navigates to a valid /login URL (with or without prefilled email)"
      exports: ["ResendLinkButton"]
    - path: "app/verify-pending/page.tsx"
      provides: "Verify-pending UI that gracefully passes undefined email when user is not signed in"
      contains: "ResendLinkButton"
  key_links:
    - from: "components/auth/ResendLinkButton.tsx"
      to: "/login route"
      via: "<a href=...> navigation"
      pattern: "href=.*\\/login"
    - from: "app/verify-pending/page.tsx"
      to: "ResendLinkButton"
      via: "email prop (string | null | undefined)"
      pattern: "<ResendLinkButton"
---

<objective>
Fix UAT Gap 3 (major): the "Resend verification link" button on `/verify-pending` does nothing.

Two-part root cause:
1. **Empty email param** — when a visitor lands on `/verify-pending` without being signed in, `getClaims()` returns null, the page passes `'your inbox'` (the literal string) as the email prop, which then gets URL-encoded into `?email=your%20inbox` — useless garbage in the form. (Even worse: if a future change passes `undefined`, the URL becomes `/login?email=` — empty param.)
2. **Possible asChild/anchor rendering issue** — the shadcn `<Button asChild>` wrapper around a plain `<a href>` may not be navigating in all browsers. We will switch to `next/link` for proper Next.js client-side navigation, which works correctly with shadcn's `asChild` pattern.

Fix:
- `ResendLinkButton` accepts `email: string | null | undefined`. When email is empty/falsy/the placeholder string `'your inbox'`, navigate to `/login` with NO `?email=` param. Otherwise navigate to `/login?email=<encoded>`.
- Use `next/link` (not raw `<a>`) under `<Button asChild>` — guaranteed Next.js client navigation.
- `verify-pending/page.tsx` — pass `null` (not the literal `'your inbox'`) when there's no signed-in email; let `ResendLinkButton` decide the navigation target. Display the friendly fallback string only in the visible copy.

Purpose: AUTH-04's UX completeness depends on /verify-pending being functional. A dead button on the only-recovery-path page is the worst possible failure mode.

Output: clicking "Resend verification link" always navigates the user somewhere (specifically, to /login) — with email prefilled when known, plain /login when not. No more dead clicks.
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
@components/ui/button.tsx
@components/auth/LogoutButton.tsx

<interfaces>
<!-- Current contracts (read before editing) -->

components/auth/ResendLinkButton.tsx CURRENT signature (will change):
```typescript
export function ResendLinkButton({ email }: { email: string }): JSX.Element
// Always emits href="/login?email=<encoded>" — broken when email is empty or the placeholder string.
```

NEW signature after this plan:
```typescript
export function ResendLinkButton({ email }: { email?: string | null }): JSX.Element
// Emits href="/login?email=<encoded>" when email is non-empty AND not the 'your inbox' placeholder
// Emits href="/login" when email is null/undefined/empty/placeholder
```

shadcn Button asChild pattern (from components/ui/button.tsx):
```tsx
<Button asChild>
  <Link href="...">Click me</Link>  // child element receives Button styles via Slot
</Button>
```

Next.js Link import:
```typescript
import Link from 'next/link'
```

LoginForm hydration logic (already shipped — do NOT modify):
```typescript
useEffect(() => {
  const prefill = new URLSearchParams(window.location.search).get('email')
  if (prefill) form.setValue('email', prefill)
}, [form])
```
This means: empty/missing ?email= just leaves the field blank — exactly what we want for the "no email known" case.
</interfaces>
</context>

<tasks>

<task type="auto">
  <name>Task 1: Make ResendLinkButton accept optional email and navigate via next/link</name>
  <files>components/auth/ResendLinkButton.tsx</files>
  <read_first>
    - components/auth/ResendLinkButton.tsx (current state — uses raw &lt;a&gt; under Button asChild)
    - components/ui/button.tsx (asChild Slot pattern reference)
    - app/(auth)/login/page.tsx (target page)
  </read_first>
  <action>
    Replace the entire contents of `components/auth/ResendLinkButton.tsx` with:

    ```tsx
    'use client'

    import Link from 'next/link'
    import { Button } from '@/components/ui/button'

    /**
     * AUTH-04 UX companion. Sends the user back to /login where they can
     * re-run Turnstile + submit a fresh magic link.
     *
     * UAT Gap 3 fix:
     *   - Accepts email as optional (string | null | undefined)
     *   - When email is missing/empty/the 'your inbox' placeholder, navigates to /login
     *     with NO ?email= param (LoginForm leaves the field blank — clean UX)
     *   - When email is present and real, navigates to /login?email=<encoded> so
     *     LoginForm's useEffect hydrates the field
     *   - Uses next/link under <Button asChild> for guaranteed Next.js client-side
     *     navigation (raw <a> can fail to navigate in some Button-Slot edge cases)
     */
    export function ResendLinkButton({ email }: { email?: string | null }) {
      // Treat the page-level fallback string as "no real email" — never want it in a query param.
      const hasRealEmail =
        typeof email === 'string'
        && email.length > 0
        && email !== 'your inbox'

      const resendHref = hasRealEmail
        ? `/login?email=${encodeURIComponent(email!)}`
        : '/login'

      return (
        <Button asChild size="lg" className="w-full">
          <Link href={resendHref}>Resend verification link</Link>
        </Button>
      )
    }
    ```

    Key changes from the current file:
    - Prop type: `email: string` → `email?: string | null`
    - Added the `hasRealEmail` guard (null/undefined/empty/'your inbox' all map to `false`)
    - Conditional href: real email → `?email=<encoded>`; no email → bare `/login`
    - Switched `<a href={resendHref}>` to `<Link href={resendHref}>` (next/link) — guaranteed Next router navigation, fixes the "button does nothing" symptom
    - Doc comment updated to reference UAT Gap 3 + the design rationale
  </action>
  <verify>
    <automated>cd /Users/ashleyakbar/barterkin && grep -E "import Link from 'next/link'" components/auth/ResendLinkButton.tsx && grep -E "email\?: string \| null" components/auth/ResendLinkButton.tsx && pnpm typecheck</automated>
  </verify>
  <acceptance_criteria>
    - `grep "import Link from 'next/link'" components/auth/ResendLinkButton.tsx` matches
    - `grep "email\?: string | null" components/auth/ResendLinkButton.tsx` matches
    - `grep "<Link href=" components/auth/ResendLinkButton.tsx` matches (uses next/link, not raw &lt;a&gt;)
    - `grep -c "<a href=" components/auth/ResendLinkButton.tsx` outputs `0` (no raw anchor anymore)
    - `grep "your inbox" components/auth/ResendLinkButton.tsx` matches (the placeholder-detection guard)
    - `grep "encodeURIComponent" components/auth/ResendLinkButton.tsx` matches (real email is still URL-encoded)
    - `pnpm typecheck` exits 0
  </acceptance_criteria>
  <done>
    ResendLinkButton accepts `email?: string | null`, navigates via next/link, conditionally appends ?email= only when a real email is known. typecheck passes.
  </done>
</task>

<task type="auto">
  <name>Task 2: Update verify-pending page to pass email cleanly (null when unknown)</name>
  <files>app/verify-pending/page.tsx</files>
  <read_first>
    - app/verify-pending/page.tsx (current state — passes 'your inbox' string as email prop on line 38)
    - components/auth/ResendLinkButton.tsx (post-Task-1 state with new prop type)
  </read_first>
  <action>
    Modify `app/verify-pending/page.tsx` to separate the displayed email (which falls back to the friendly string `'your inbox'`) from the email passed as a prop to ResendLinkButton (which should be `null` when not signed in, NEVER the placeholder string).

    Apply these specific changes (do NOT rewrite the whole file):

    1. Line 16 currently is:
       ```tsx
       const email = (data?.claims?.email as string | undefined) ?? 'your inbox'
       ```
       Replace with two separate variables:
       ```tsx
       const realEmail = (data?.claims?.email as string | undefined) ?? null
       const displayEmail = realEmail ?? 'your inbox'
       ```

    2. Line 31 currently is (inside the visible copy):
       ```tsx
       We sent a verification link to {email}. Click it to confirm you own this address — this keeps Barterkin a real-community space and protects members from bots and duplicate accounts.
       ```
       Update to use `displayEmail`:
       ```tsx
       We sent a verification link to {displayEmail}. Click it to confirm you own this address — this keeps Barterkin a real-community space and protects members from bots and duplicate accounts.
       ```

    3. Line 38 currently is:
       ```tsx
       <ResendLinkButton email={email} />
       ```
       Update to pass `realEmail` (which is null when there's no signed-in user):
       ```tsx
       <ResendLinkButton email={realEmail} />
       ```

    Result:
    - The visible copy still reads "We sent a verification link to your inbox" when the user isn't signed in (preserves friendly UX).
    - The button's href is `/login` (no empty `?email=`) when there's no real email.
    - When the user IS signed in, both the displayed email and the button's `?email=` param use the real email.
  </action>
  <verify>
    <automated>cd /Users/ashleyakbar/barterkin && grep -E "const realEmail" app/verify-pending/page.tsx && grep -E "const displayEmail" app/verify-pending/page.tsx && grep -E "<ResendLinkButton email=\{realEmail\}" app/verify-pending/page.tsx && pnpm typecheck</automated>
  </verify>
  <acceptance_criteria>
    - `grep "const realEmail" app/verify-pending/page.tsx` matches
    - `grep "const displayEmail" app/verify-pending/page.tsx` matches
    - `grep "<ResendLinkButton email={realEmail}" app/verify-pending/page.tsx` matches
    - `grep "to {displayEmail}" app/verify-pending/page.tsx` matches (visible copy uses the friendly fallback)
    - `grep -c "<ResendLinkButton email={email}" app/verify-pending/page.tsx` outputs `0` (old broken usage gone)
    - `grep -c "?? 'your inbox'" app/verify-pending/page.tsx` outputs `1` (only displayEmail uses the placeholder; realEmail uses ?? null)
    - `pnpm typecheck` exits 0
  </acceptance_criteria>
  <done>
    /verify-pending separates display copy from button prop. ResendLinkButton receives null when there's no signed-in email, so it navigates to bare /login. The visible "your inbox" fallback is preserved.
  </done>
</task>

<task type="auto">
  <name>Task 3: Add E2E test — Resend button navigates to /login (with and without email)</name>
  <files>tests/e2e/resend-link-button.spec.ts</files>
  <read_first>
    - components/auth/ResendLinkButton.tsx (post-Task-1 state)
    - app/verify-pending/page.tsx (post-Task-2 state)
    - tests/e2e/smoke.spec.ts (Playwright pattern reference)
    - playwright.config.ts (testDir + baseURL)
  </read_first>
  <action>
    Create `tests/e2e/resend-link-button.spec.ts`:

    ```ts
    import { test, expect } from '@playwright/test'

    test.describe('UAT Gap 3: ResendLinkButton on /verify-pending', () => {
      test('unauthed visitor: button navigates to /login (no empty ?email= param)', async ({ page }) => {
        await page.goto('/verify-pending')

        const button = page.getByRole('link', { name: /resend verification link/i })
        await expect(button).toBeVisible()

        // Critical: href must be '/login' exactly — NEVER '/login?email=' or '/login?email=your%20inbox'
        const href = await button.getAttribute('href')
        expect(href).toBe('/login')

        await button.click()
        await expect(page).toHaveURL(/\/login(\?|$)/)
        // The form's email input should NOT be prefilled with garbage
        const emailInput = page.getByLabel('Email address')
        await expect(emailInput).toBeVisible()
        await expect(emailInput).toHaveValue('')
      })

      test('button is rendered as a real navigable link, not a non-functional button', async ({ page }) => {
        await page.goto('/verify-pending')
        // The asChild pattern means the rendered element should be an <a> (from next/link),
        // not a <button>. This guards against the original UAT Gap 3 symptom (button does nothing).
        const link = page.getByRole('link', { name: /resend verification link/i })
        await expect(link).toBeVisible()
        const tagName = await link.evaluate((el) => el.tagName.toLowerCase())
        expect(tagName).toBe('a')
      })
    })
    ```

    Note: testing the signed-in case requires session cookies, which is covered by the existing session-persistence E2E pattern + manual UAT. The two tests above cover the actual broken case from UAT (unauthed visitor clicking the button), which is what users hit when landing on /verify-pending via a stale link or before completing any signup.
  </action>
  <verify>
    <automated>cd /Users/ashleyakbar/barterkin && pnpm playwright test tests/e2e/resend-link-button.spec.ts --reporter=line 2>&1 | tail -10</automated>
  </verify>
  <acceptance_criteria>
    - File `tests/e2e/resend-link-button.spec.ts` exists
    - `grep "expect(href).toBe('/login')" tests/e2e/resend-link-button.spec.ts` matches
    - `grep "tagName).toBe('a')" tests/e2e/resend-link-button.spec.ts` matches
    - `pnpm playwright test tests/e2e/resend-link-button.spec.ts` exits 0
    - Test output shows `2 passed`
  </acceptance_criteria>
  <done>
    Playwright proves: (a) the resend button on /verify-pending has href="/login" exactly when unauthed (no empty email param), (b) clicking it actually navigates to /login, (c) the rendered element is an &lt;a&gt; tag (real navigation, not a dead button).
  </done>
</task>

</tasks>

<verification>
- `grep "import Link from 'next/link'" components/auth/ResendLinkButton.tsx` matches
- `grep "<ResendLinkButton email={realEmail}" app/verify-pending/page.tsx` matches
- `pnpm typecheck && pnpm build` both exit 0
- `pnpm playwright test tests/e2e/resend-link-button.spec.ts` exits 0
- Manual UAT test 4 re-run: button on /verify-pending navigates to /login (visibly works)
</verification>

<success_criteria>
- AUTH-04 UX path is functional end-to-end: /verify-pending → click button → land on /login → submit fresh magic link
- Button never produces a dead `/login?email=` URL or a `/login?email=your%20inbox` URL
- Switching from raw &lt;a&gt; to next/link guarantees Next.js client navigation works in all browser contexts
- UAT test 4 ("verify-pending page renders + Resend button works") flips from `result: issue` to `result: pass` on next QA pass
</success_criteria>

<output>
After completion, create `.planning/phases/02-authentication-legal/02-07-SUMMARY.md` documenting:
- Diff summary for ResendLinkButton.tsx (prop type widened, next/link substituted, conditional href logic added)
- Diff summary for app/verify-pending/page.tsx (split realEmail vs displayEmail)
- E2E test added at tests/e2e/resend-link-button.spec.ts
- The two failure modes the fix prevents: empty ?email= AND the 'your inbox' placeholder leaking into the URL
- Re-tested UAT items: 4
</output>
