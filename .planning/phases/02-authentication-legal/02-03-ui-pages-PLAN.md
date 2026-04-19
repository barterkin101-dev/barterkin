---
plan: 3
phase: 2
name: ui-pages
wave: 2
depends_on: [1]
autonomous: true
requirements:
  - AUTH-01
  - AUTH-02
  - AUTH-05
  - AUTH-08
  - AUTH-09
  - AUTH-10
  - GEO-04
files_modified:
  - app/globals.css
  - components/auth/TurnstileWidget.tsx
  - components/auth/GoogleButton.tsx
  - components/auth/LoginForm.tsx
  - components/auth/LogoutButton.tsx
  - components/layout/Footer.tsx
  - app/(auth)/layout.tsx
  - app/(auth)/login/page.tsx
  - app/(auth)/signup/page.tsx
  - app/verify-pending/page.tsx
  - app/legal/tos/page.tsx
  - app/legal/privacy/page.tsx
  - app/legal/guidelines/page.tsx
  - app/layout.tsx
must_haves:
  truths:
    - "app/globals.css includes @theme inline brand overrides (primary=clay, ring=clay) so shadcn Button renders clay-on-sage by default"
    - "/login and /signup render with Google button, Turnstile widget, email input, and magic-link submit button"
    - "Submitting a valid email + Turnstile token on /login fires the sendMagicLink server action and shows 'Check your email' confirmation"
    - "Clicking Continue with Google initiates signInWithOAuth and redirects to Google"
    - "/verify-pending renders 'One more step' heading with Resend link CTA per UI-SPEC verbatim"
    - "/legal/tos renders with H1 'Terms of Service' and contains the locked GEO-04 Georgia non-residency clause verbatim"
    - "/legal/privacy renders with H1 'Privacy Policy' and the UI-SPEC-locked sections"
    - "/legal/guidelines renders with H1 'Community Guidelines' and the UI-SPEC-locked sections"
    - "Footer appears on every route with Terms/Privacy/Guidelines links and Log out button for authed users (via <form method=POST>)"
  artifacts:
    - path: "app/globals.css"
      provides: "@theme inline Phase 2 brand override (clay primary, clay ring)"
      contains: "--color-primary: var(--color-clay)"
    - path: "components/auth/TurnstileWidget.tsx"
      provides: "@marsidev/react-turnstile wrapper"
      exports: ["TurnstileWidget"]
    - path: "components/auth/GoogleButton.tsx"
      provides: "Client OAuth CTA (signInWithOAuth)"
      exports: ["GoogleButton"]
    - path: "components/auth/LoginForm.tsx"
      provides: "RHF + Zod + Turnstile email form wired to sendMagicLink"
      exports: ["LoginForm"]
    - path: "components/auth/LogoutButton.tsx"
      provides: "POST form to /auth/signout (no JS required)"
      exports: ["LogoutButton"]
    - path: "components/layout/Footer.tsx"
      provides: "Site-wide footer with legal links + Sign in/Log out"
      exports: ["Footer"]
    - path: "app/(auth)/layout.tsx"
      provides: "Centered-card layout for /login, /signup"
      exports: ["default"]
    - path: "app/(auth)/login/page.tsx"
      provides: "Login page surface (AUTH-01 + AUTH-02 + AUTH-08)"
      exports: ["default"]
    - path: "app/(auth)/signup/page.tsx"
      provides: "Signup page surface (AUTH-01 + AUTH-02 + AUTH-08)"
      exports: ["default"]
    - path: "app/verify-pending/page.tsx"
      provides: "Email-verify gate surface (AUTH-04 UX)"
      exports: ["default"]
    - path: "app/legal/tos/page.tsx"
      provides: "Terms of Service prose with locked GEO-04 clause"
      contains: "Georgia residents"
    - path: "app/legal/privacy/page.tsx"
      provides: "Privacy Policy prose"
      exports: ["default"]
    - path: "app/legal/guidelines/page.tsx"
      provides: "Community Guidelines prose"
      exports: ["default"]
  key_links:
    - from: "components/auth/LoginForm.tsx"
      to: "lib/actions/auth.ts:sendMagicLink"
      via: "useActionState(sendMagicLink, null)"
      pattern: "useActionState\\(sendMagicLink"
    - from: "components/auth/GoogleButton.tsx"
      to: "lib/supabase/client.ts:createClient"
      via: "supabase.auth.signInWithOAuth"
      pattern: "signInWithOAuth"
    - from: "components/auth/LogoutButton.tsx"
      to: "app/auth/signout/route.ts"
      via: "<form method='POST' action='/auth/signout'>"
      pattern: "action=\"/auth/signout\""
    - from: "app/layout.tsx"
      to: "components/layout/Footer.tsx"
      via: "<Footer /> render"
      pattern: "<Footer"
    - from: "components/auth/LoginForm.tsx"
      to: "components/auth/TurnstileWidget.tsx"
      via: "setCaptchaToken on verify; hidden input name='cf-turnstile-response'"
      pattern: "cf-turnstile-response"
---

## Objective

Wave 2 UI — all seven surfaces from UI-SPEC. Implements:

1. **Brand token override** in `app/globals.css` so shadcn `Button` renders clay-on-sage by default.
2. **Auth components** — `TurnstileWidget`, `GoogleButton`, `LoginForm`, `LogoutButton` (client components, each under 100 LOC).
3. **Footer** — spans every route; legal links + sign-in/logout state split by `getClaims()`.
4. **Auth pages** — `/login`, `/signup` (structurally identical, different copy), `(auth)/layout.tsx` (centered card shell).
5. **Verify-pending page** — `/verify-pending` with UI-SPEC-locked copy + resend CTA.
6. **Legal pages** — `/legal/tos` (with GEO-04 clause), `/legal/privacy`, `/legal/guidelines`.
7. **Wire Footer into root layout**.

**Purpose:** Honor user decisions D-AUTH-01 (Google OAuth button), D-AUTH-02 (magic-link form), D-AUTH-08 (Turnstile gates signup), D-AUTH-09 (auth route group), D-AUTH-10 (legal pages linked from signup + footer), D-GEO-04 (Georgia non-residency clause in ToS). All exact copy is UI-SPEC-locked.

**Output:** Every UI-SPEC surface renders; Wave 3 fills test bodies against them.

## Threat Model

| Boundary | Description |
|----------|-------------|
| Browser → Google | OAuth click-through to Google's consent screen; `redirectTo` must match the Supabase allowlist |
| Browser → Turnstile | Token is single-use; widget renders in iframe, token never leaves the form |
| Footer logout form → /auth/signout | Plain HTML `<form method="POST">` — no JS required, no CSRF token needed (same-origin cookie-bound) |

### STRIDE Threat Register

| Threat ID | Category | Component | Disposition | Mitigation Plan |
|-----------|----------|-----------|-------------|-----------------|
| T-2-01 | Tampering | `redirectTo` in signInWithOAuth | mitigate | `redirectTo` is hardcoded to `${window.location.origin}/auth/callback?next=/directory`; Supabase Studio allowlist enforces origin boundary (Wave 0 Task 1.1) |
| T-2-02 | Spoofing | CAPTCHA token replay on client | mitigate | TurnstileWidget emits token once per widget-render; widget auto-refreshes after 5 min. Server side Supabase verifies once and invalidates. |
| T-2-05 | Tampering | CSRF on logout form | mitigate | POST-only `/auth/signout` + same-origin cookie policy. `<form method="POST">` is same-origin by browser default. No CSRF token needed for session-cookie-bound POST where the action is idempotent (logout-idempotent-is-intended). |
| T-2-08 | Elevation of Privilege | `user_metadata.email_verified` used in Footer | mitigate | Footer uses `claims.sub` only (for "is authed" check); never reads user_metadata for trust decisions |

## Tasks

<task id="2-3-1" type="auto">
  <title>Task 3.1: Extend app/globals.css with Phase 2 brand overrides</title>
  <read_first>
    - `app/globals.css` (current @theme inline block from Phase 1 — DO NOT rewrite, extend)
    - `.planning/phases/02-authentication-legal/02-UI-SPEC.md` (Color section, lines 97–107 — the locked override block)
    - `.planning/phases/02-authentication-legal/02-PATTERNS.md` (MODIFIED: app/globals.css section, lines 697–712)
  </read_first>
  <action>
Extend the existing `@theme inline` block in `app/globals.css` with Phase 2 brand overrides. Do NOT rewrite the file. Do NOT edit `:root` stone defaults. Do NOT touch the `.dark` block.

Find the existing `@theme inline { ... }` block in `app/globals.css` (established Phase 1). Append the following four lines before its closing `}`:

```css
  /* Phase 2 brand override — makes shadcn primary render clay-on-sage */
  --color-primary: var(--color-clay);
  --color-primary-foreground: var(--color-sage-bg);
  --color-ring: var(--color-clay);
  --color-muted-foreground: var(--color-forest-mid);
```

After saving, verify:
```bash
grep -c "color-primary: var(--color-clay)" app/globals.css   # → 1
grep -c "color-ring: var(--color-clay)" app/globals.css      # → 1
pnpm build
```

The build MUST succeed. Render the existing Phase 1 `app/page.tsx` (the fire-test-event button uses `<Button>` default variant) — it should now render with clay background instead of near-black stone. No code change to `app/page.tsx` is needed; the token override propagates automatically.

Per UI-SPEC line 107: "This makes <Button> (default variant) render clay-on-sage automatically, so the executor doesn't sprinkle `className='bg-clay'` overrides everywhere." Wave 2 Tasks 3.3–3.5 (LoginForm, GoogleButton, verify-pending resend) rely on this.
  </action>
  <acceptance_criteria>
    - `grep "color-primary: var(--color-clay)" app/globals.css` returns 1 match
    - `grep "color-ring: var(--color-clay)" app/globals.css` returns 1 match
    - `grep "color-muted-foreground: var(--color-forest-mid)" app/globals.css` returns 1 match
    - The existing `@theme inline` opening brace and closing brace still match (brace count unchanged relative to Phase 1 +1/-1)
    - `pnpm build` passes
    - The `.dark` block from Phase 1 is still present (not accidentally deleted)
  </acceptance_criteria>
</task>

<task id="2-3-2" type="auto">
  <title>Task 3.2: components/auth/TurnstileWidget.tsx — CAPTCHA widget wrapper</title>
  <read_first>
    - `.planning/phases/02-authentication-legal/02-RESEARCH.md` (Pattern 8, lines 716–746)
    - `.planning/phases/02-authentication-legal/02-UI-SPEC.md` (Spacing Scale Turnstile exception, line 51; CAPTCHA Notice copy, lines 175–183)
    - `node_modules/@marsidev/react-turnstile/package.json` (confirm exports shape — default is `Turnstile` named)
  </read_first>
  <action>
Create `components/auth/TurnstileWidget.tsx`. Thin client-component wrapper around `@marsidev/react-turnstile`.

```tsx
'use client'

import { Turnstile } from '@marsidev/react-turnstile'

interface TurnstileWidgetProps {
  /** Called when Cloudflare returns a valid token. Pass this up to the form. */
  onVerify: (token: string) => void
  /** Called when the token expires (Cloudflare default: ~5 min). Form should clear its captcha state. */
  onExpire?: () => void
  /** Called when the widget fails to render or the challenge errors. */
  onError?: () => void
}

/**
 * AUTH-08: Cloudflare Turnstile widget.
 * Wraps @marsidev/react-turnstile. Renders the iframe (fixed 300x65 per Cloudflare)
 * centered with breathing room per UI-SPEC.
 *
 * The sitekey is PUBLIC (safe to expose via NEXT_PUBLIC_). The secret lives in
 * Supabase Studio — Supabase Auth calls /siteverify server-side when the token
 * is passed via signInWithOtp options.captchaToken.
 */
export function TurnstileWidget({ onVerify, onExpire, onError }: TurnstileWidgetProps) {
  const siteKey = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY
  if (!siteKey) {
    // Dev-only fallback — the Zod schema in sendMagicLink will still reject
    // a missing captchaToken, so this cannot bypass the gate.
    return (
      <div className="text-sm text-destructive text-center my-4">
        Missing NEXT_PUBLIC_TURNSTILE_SITE_KEY — check .env.local.
      </div>
    )
  }

  return (
    <div className="flex flex-col items-center my-4 gap-2">
      <Turnstile
        siteKey={siteKey}
        onSuccess={onVerify}
        onExpire={onExpire}
        onError={onError}
        options={{
          theme: 'light',
          action: 'signup',
        }}
      />
      <p className="text-xs text-muted-foreground">
        Protected by Cloudflare Turnstile.{' '}
        <a
          href="https://www.cloudflare.com/privacypolicy/"
          target="_blank"
          rel="noopener"
          className="underline"
        >
          Privacy
        </a>
        {' · '}
        <a
          href="https://www.cloudflare.com/website-terms/"
          target="_blank"
          rel="noopener"
          className="underline"
        >
          Terms
        </a>
      </p>
    </div>
  )
}
```

Notes:
- `'use client'` required — Turnstile widget renders an iframe via browser DOM.
- Widget is exactly 300×65 per Cloudflare spec; wrap in `flex items-center` for centering (UI-SPEC Spacing exception).
- The UI-SPEC copy "Protected by Cloudflare Turnstile. [Privacy] · [Terms]" is rendered directly below the widget at 12px muted (`text-xs text-muted-foreground`). Links open in new tab with `rel="noopener"`.
- The callback-only API (`onVerify` up) lets the form component own the captchaToken state — widget is dumb.
- Sitekey missing in dev: render a destructive-colored error so the developer notices; production will never hit this because Vercel env guards apply.
  </action>
  <acceptance_criteria>
    - `components/auth/TurnstileWidget.tsx` exists
    - Line 1 is `'use client'`
    - Named export `TurnstileWidget` present
    - File imports `Turnstile` from `@marsidev/react-turnstile`
    - File reads `process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY`
    - File contains "Protected by Cloudflare Turnstile." literal (UI-SPEC copy)
    - `pnpm typecheck` passes
  </acceptance_criteria>
</task>

<task id="2-3-3" type="auto">
  <title>Task 3.3: components/auth/GoogleButton.tsx — OAuth CTA</title>
  <read_first>
    - `.planning/phases/02-authentication-legal/02-RESEARCH.md` (Pattern 4, lines 482–508)
    - `.planning/phases/02-authentication-legal/02-UI-SPEC.md` (Auth CTAs table — "Continue with Google" copy, Google logo icon 20px)
    - `lib/supabase/client.ts` (existing browser-client factory)
    - `components/ui/button.tsx` (existing shadcn Button)
  </read_first>
  <action>
Create `components/auth/GoogleButton.tsx`. Client component; uses `signInWithOAuth` with Turnstile token.

```tsx
'use client'

import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'

// Google G logo SVG (Google brand guidelines permit use in sign-in buttons).
function GoogleLogo() {
  return (
    <svg className="h-5 w-5" viewBox="0 0 48 48" aria-hidden="true">
      <path fill="#FFC107" d="M43.611 20.083H42V20H24v8h11.303c-1.649 4.657-6.08 8-11.303 8-6.627 0-12-5.373-12-12s5.373-12 12-12c3.059 0 5.842 1.154 7.961 3.039l5.657-5.657C34.046 6.053 29.268 4 24 4 12.955 4 4 12.955 4 24s8.955 20 20 20 20-8.955 20-20c0-1.341-.138-2.65-.389-3.917z"/>
      <path fill="#FF3D00" d="M6.306 14.691l6.571 4.819C14.655 15.108 18.961 12 24 12c3.059 0 5.842 1.154 7.961 3.039l5.657-5.657C34.046 6.053 29.268 4 24 4 16.318 4 9.656 8.337 6.306 14.691z"/>
      <path fill="#4CAF50" d="M24 44c5.166 0 9.86-1.977 13.409-5.192l-6.19-5.238C29.211 35.091 26.715 36 24 36c-5.202 0-9.619-3.317-11.283-7.946l-6.522 5.025C9.505 39.556 16.227 44 24 44z"/>
      <path fill="#1976D2" d="M43.611 20.083H42V20H24v8h11.303c-0.792 2.237-2.231 4.166-4.087 5.571.001-.001.002-.001.003-.002l6.19 5.238C36.971 39.205 44 34 44 24c0-1.341-.138-2.65-.389-3.917z"/>
    </svg>
  )
}

interface GoogleButtonProps {
  /** When null/empty, button is disabled. Passed from LoginForm's Turnstile state. */
  captchaToken: string | null
}

/**
 * AUTH-01: Google OAuth sign-in/sign-up button.
 * Passes captchaToken to Supabase so Supabase Auth verifies with Cloudflare.
 * Initiates redirect to Google; no code runs after signInWithOAuth.
 */
export function GoogleButton({ captchaToken }: GoogleButtonProps) {
  async function signIn() {
    if (!captchaToken) return
    const supabase = createClient()
    await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        captchaToken,
        redirectTo: `${window.location.origin}/auth/callback?next=/directory`,
      },
    })
  }

  return (
    <Button
      type="button"
      size="lg"
      onClick={signIn}
      disabled={!captchaToken}
      className="w-full gap-2"
      aria-label="Continue with Google"
    >
      <GoogleLogo />
      Continue with Google
    </Button>
  )
}
```

Notes:
- Copy "Continue with Google" is UI-SPEC-locked verbatim.
- Google logo rendered inline (20×20 per UI-SPEC). SVG embedded; no external request.
- Button disabled until `captchaToken` is present (AUTH-08 — CAPTCHA must precede any auth initiation).
- `redirectTo` uses `window.location.origin` not a hardcoded URL — works across localhost, Vercel preview, production.
- No `captchaToken` post-redirect logic: `signInWithOAuth` navigates away; the code after never runs.
- `size="lg"` = `h-11` (44px) per UI-SPEC tap-target requirement.
- After the `@theme inline` override from Task 3.1, `<Button>` default variant renders clay-on-sage automatically. No `bg-clay` className needed.
  </action>
  <acceptance_criteria>
    - `components/auth/GoogleButton.tsx` exists
    - Line 1 is `'use client'`
    - Named export `GoogleButton` present
    - Button literal text is exactly "Continue with Google"
    - `signInWithOAuth` call uses `provider: 'google'` and `captchaToken`
    - Button disabled attribute is wired to `!captchaToken`
    - `pnpm typecheck` + `pnpm lint` pass
  </acceptance_criteria>
</task>

<task id="2-3-4" type="auto">
  <title>Task 3.4: components/auth/LoginForm.tsx — RHF + Zod + Turnstile magic-link form</title>
  <read_first>
    - `.planning/phases/02-authentication-legal/02-RESEARCH.md` (Pattern 3, lines 408–466 — server action contract)
    - `.planning/phases/02-authentication-legal/02-UI-SPEC.md` (Auth CTAs + Magic-link sent confirmation + Error States, lines 127–173)
    - `.planning/phases/02-authentication-legal/02-PATTERNS.md` (LoginForm, lines 296–355)
    - `lib/actions/auth.ts` (the sendMagicLink server action — the contract)
    - `components/ui/{form,input,button,alert}.tsx` (shadcn primitives from Wave 0)
  </read_first>
  <action>
Create `components/auth/LoginForm.tsx`. RHF + Zod client form that delegates to the `sendMagicLink` server action via React 19 `useActionState`.

```tsx
'use client'

import { useActionState, useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { AlertCircle } from 'lucide-react'
import { sendMagicLink, type SendMagicLinkResult } from '@/lib/actions/auth'
import { TurnstileWidget } from './TurnstileWidget'

const LoginSchema = z.object({
  email: z.string().trim().toLowerCase().email('Please enter a valid email.'),
})

type LoginValues = z.infer<typeof LoginSchema>

export function LoginForm() {
  const [state, formAction, pending] = useActionState<SendMagicLinkResult | null, FormData>(
    sendMagicLink,
    null,
  )
  const [captchaToken, setCaptchaToken] = useState<string | null>(null)
  const [submittedEmail, setSubmittedEmail] = useState<string>('')

  const form = useForm<LoginValues>({
    resolver: zodResolver(LoginSchema),
    defaultValues: { email: '' },
  })

  // Success confirmation state — inline replacement of the form.
  if (state?.ok) {
    return (
      <div className="space-y-4" role="status">
        <h2 className="font-serif text-2xl font-bold leading-[1.2]">Check your email</h2>
        <p className="text-base leading-[1.5]">
          We sent a magic link to {submittedEmail || 'your inbox'}. Click the link to sign in — it expires in 1 hour.
        </p>
        <p className="text-sm text-muted-foreground">
          Don&apos;t see it? Check your spam folder or refresh the page to send another link.
        </p>
      </div>
    )
  }

  return (
    <Form {...form}>
      <form
        action={(formData: FormData) => {
          setSubmittedEmail(String(formData.get('email') ?? ''))
          formAction(formData)
        }}
        className="space-y-4"
      >
        {state && !state.ok && state.error && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{state.error}</AlertDescription>
          </Alert>
        )}

        <FormField
          control={form.control}
          name="email"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Email address</FormLabel>
              <FormControl>
                <Input
                  type="email"
                  autoComplete="email"
                  placeholder="you@example.com"
                  required
                  {...field}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <TurnstileWidget
          onVerify={(token) => setCaptchaToken(token)}
          onExpire={() => setCaptchaToken(null)}
          onError={() => setCaptchaToken(null)}
        />
        <input type="hidden" name="cf-turnstile-response" value={captchaToken ?? ''} />

        <Button
          type="submit"
          size="lg"
          className="w-full"
          disabled={pending || !captchaToken}
        >
          {pending ? 'Sending…' : 'Send magic link'}
        </Button>
      </form>
    </Form>
  )
}
```

Notes:
- **`useActionState` (React 19)** — binds the server action; `pending` gate disables the button during submit.
- **Zod schema** here is permissive about captchaToken (it's in the hidden input, not a form field). The server action has its own strict Zod including `captchaToken.min(1)` — two Zods, different responsibilities (client = UX validation, server = trust validation).
- **Success state replaces the form** — inline swap, no navigation needed. UI-SPEC Magic-link Sent Confirmation copy locked.
- **Error banner copy** comes from `state.error` which the server action populates with UI-SPEC-locked strings (Task 2.4).
- **`<input type="hidden" name="cf-turnstile-response">`** is how the form carries the token to the server action. Turnstile's default token-field name is `cf-turnstile-response`; the server action reads `formData.get('cf-turnstile-response')`.
- **Button size="lg"** = 44px tap target. After Task 3.1 globals.css override, renders clay.
- **Submit button disabled until both `pending === false` AND `captchaToken` present** — enforces AUTH-08 client-side (server enforces again).
- **`setSubmittedEmail` before calling `formAction`** — captures the email at submit time so the success state can display it (server-action return doesn't include email by design — anti-enumeration).
  </action>
  <acceptance_criteria>
    - `components/auth/LoginForm.tsx` exists
    - Line 1 is `'use client'`
    - Named export `LoginForm`
    - File contains `useActionState(sendMagicLink` (grep)
    - File contains `name="cf-turnstile-response"` (grep)
    - File contains literal "Send magic link" (grep)
    - File contains literal "Check your email" (grep)
    - Button disabled wired to `pending || !captchaToken`
    - `pnpm typecheck` passes
  </acceptance_criteria>
</task>

<task id="2-3-5" type="auto">
  <title>Task 3.5: components/auth/LogoutButton.tsx + (auth) layout + login + signup pages</title>
  <read_first>
    - `.planning/phases/02-authentication-legal/02-UI-SPEC.md` (Auth CTAs + Logout Button sections)
    - `.planning/phases/02-authentication-legal/02-PATTERNS.md` ((auth)/layout.tsx, lines 229–255; login/signup pages, lines 179–227)
    - `app/layout.tsx` (existing root layout — layout nesting rule: (auth) does NOT re-emit <html>/<body>)
  </read_first>
  <action>
Create four files.

**File 1: `components/auth/LogoutButton.tsx`**

```tsx
import { Button } from '@/components/ui/button'
import { LogOut } from 'lucide-react'

/**
 * AUTH-05: Logout button.
 * Server component — renders a plain <form method="POST"> to /auth/signout.
 * No JS required; no CSRF token needed (same-origin cookie-bound POST,
 * idempotent intended action).
 * No confirmation dialog per UI-SPEC (reversible in 10 seconds).
 */
export function LogoutButton() {
  return (
    <form action="/auth/signout" method="POST" className="inline-block">
      <Button
        type="submit"
        variant="ghost"
        size="sm"
        className="gap-1 text-sm"
        aria-label="Log out of Barterkin"
      >
        <LogOut className="h-3.5 w-3.5" />
        Log out
      </Button>
    </form>
  )
}
```

**File 2: `app/(auth)/layout.tsx`**

```tsx
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: { default: 'Sign in — Barterkin', template: '%s — Barterkin' },
}

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <main className="min-h-screen flex items-center justify-center py-16 px-6 bg-sage-bg">
      {children}
    </main>
  )
}
```

Note: (auth) layout does NOT emit `<html>`/`<body>`. That's the root layout's job. Next.js will nest this inside the root layout automatically.

**File 3: `app/(auth)/login/page.tsx`**

```tsx
import Link from 'next/link'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Separator } from '@/components/ui/separator'
import { GoogleButton } from '@/components/auth/GoogleButton'
import { LoginForm } from '@/components/auth/LoginForm'

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
        {/* AUTH-01 */}
        <GoogleFormWrapper />

        <div className="flex items-center gap-3">
          <Separator className="flex-1" />
          <span className="text-sm text-muted-foreground">or</span>
          <Separator className="flex-1" />
        </div>

        {/* AUTH-02 + AUTH-08 */}
        <LoginForm />

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

// GoogleButton needs captchaToken, but the page doesn't own that state —
// for the LoginForm flow. To keep the Google button simple on the login
// surface, wrap it in a small client component that gets its own Turnstile
// (Turnstile can be rendered twice; it just allocates two widgets).
// Alternative: merge Google button INTO LoginForm and share captchaToken.
// UI-SPEC Visuals section places Google ABOVE the magic-link form, so they
// render as distinct blocks — merge them inside a single client wrapper.
'use client'
import { useState } from 'react'
import { TurnstileWidget } from '@/components/auth/TurnstileWidget'

function GoogleFormWrapper() {
  const [captchaToken, setCaptchaToken] = useState<string | null>(null)
  return (
    <div className="space-y-3">
      <GoogleButton captchaToken={captchaToken} />
      <TurnstileWidget
        onVerify={(t) => setCaptchaToken(t)}
        onExpire={() => setCaptchaToken(null)}
      />
    </div>
  )
}
```

**Correction:** The above `'use client'` directive at line ~45 is a Next.js footgun — mixing server + client components in one file needs to be structured carefully. Rewrite as two files:

**File 3a: `app/(auth)/login/page.tsx`** (server component)

```tsx
import Link from 'next/link'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Separator } from '@/components/ui/separator'
import { LoginForm } from '@/components/auth/LoginForm'
import { GoogleAuthBlock } from '@/components/auth/GoogleAuthBlock'

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
        <GoogleAuthBlock />

        <div className="flex items-center gap-3">
          <Separator className="flex-1" />
          <span className="text-sm text-muted-foreground">or</span>
          <Separator className="flex-1" />
        </div>

        <LoginForm />

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

**File 3b: NEW `components/auth/GoogleAuthBlock.tsx`** (client component; owns Turnstile state for Google button)

```tsx
'use client'

import { useState } from 'react'
import { GoogleButton } from './GoogleButton'
import { TurnstileWidget } from './TurnstileWidget'

export function GoogleAuthBlock() {
  const [captchaToken, setCaptchaToken] = useState<string | null>(null)
  return (
    <div className="space-y-3">
      <GoogleButton captchaToken={captchaToken} />
      <TurnstileWidget
        onVerify={(t) => setCaptchaToken(t)}
        onExpire={() => setCaptchaToken(null)}
      />
    </div>
  )
}
```

Add `components/auth/GoogleAuthBlock.tsx` to the files_modified list (planner oversight — add it).

**File 4: `app/(auth)/signup/page.tsx`** — structurally identical to login, different copy:

```tsx
import Link from 'next/link'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Separator } from '@/components/ui/separator'
import { LoginForm } from '@/components/auth/LoginForm'
import { GoogleAuthBlock } from '@/components/auth/GoogleAuthBlock'

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
        <GoogleAuthBlock />

        <div className="flex items-center gap-3">
          <Separator className="flex-1" />
          <span className="text-sm text-muted-foreground">or</span>
          <Separator className="flex-1" />
        </div>

        <LoginForm />

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

Magic-link is passwordless — signup and sign-in use identical forms; difference is copy only. Google OAuth handles new vs. existing account transparently.
  </action>
  <acceptance_criteria>
    - `components/auth/LogoutButton.tsx` exists; grep `action="/auth/signout"` and `method="POST"` match
    - `components/auth/GoogleAuthBlock.tsx` exists (client boundary for OAuth + Turnstile)
    - `app/(auth)/layout.tsx` exists; does NOT contain `<html>` or `<body>` (grep must not match `<html`)
    - `app/(auth)/login/page.tsx` exists; grep "Welcome to Barterkin", "Sign in to find and offer skills", "New here?", and all three legal links
    - `app/(auth)/signup/page.tsx` exists; grep "Create an account to join", "Already have an account?"
    - All four legal links (ToS/Privacy/Guidelines in microcopy, plus one cross-link) render as `<Link href="/legal/...">` or `<Link href="/login">`
    - `pnpm typecheck && pnpm build` pass
  </acceptance_criteria>
</task>

<task id="2-3-6" type="auto">
  <title>Task 3.6: app/verify-pending/page.tsx — AUTH-04 UX gate page</title>
  <read_first>
    - `.planning/phases/02-authentication-legal/02-UI-SPEC.md` (Verify-Pending Page copy, lines 148–161 — LOCKED verbatim)
    - `lib/supabase/server.ts` (for reading claims.email on server)
  </read_first>
  <action>
Create `app/verify-pending/page.tsx`. Displays the UI-SPEC-locked copy and provides a Resend CTA.

```tsx
import Link from 'next/link'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { createClient } from '@/lib/supabase/server'
import { LogoutButton } from '@/components/auth/LogoutButton'
import { ResendLinkButton } from '@/components/auth/ResendLinkButton'

export const metadata = { title: 'Verify your email — Barterkin' }

/**
 * AUTH-04: Email-verify UX gate.
 * Rendered when middleware redirects an authed-but-unverified user here.
 * Copy locked in 02-UI-SPEC.md lines 148–161.
 */
export default async function VerifyPendingPage() {
  const supabase = await createClient()
  const { data } = await supabase.auth.getClaims()
  const email = (data?.claims?.email as string | undefined) ?? 'your inbox'

  return (
    <main className="min-h-screen flex items-center justify-center py-16 px-6 bg-sage-bg">
      <Card className="max-w-[480px] w-full bg-sage-pale border-sage-light">
        <CardHeader className="space-y-6">
          <h1 className="font-serif text-3xl md:text-[32px] font-bold leading-[1.15]">
            One more step
          </h1>
          <h2 className="font-serif text-2xl font-bold leading-[1.2]">
            Verify your email to join the directory
          </h2>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-base leading-[1.5]">
            We sent a verification link to {email}. Click it to confirm you own this address — this keeps Barterkin a real-community space and protects members from bots and duplicate accounts.
          </p>
          <p className="text-base leading-[1.5]">
            Until you verify, your profile won&apos;t appear in the directory and you can&apos;t contact other members.
          </p>

          <div className="pt-2">
            <ResendLinkButton email={email} />
          </div>

          <div className="text-sm pt-2">
            Signed in with the wrong address?{' '}
            <LogoutButton />{' '}
            <span className="text-muted-foreground">and try again.</span>
          </div>

          <p className="text-sm text-muted-foreground text-right pt-2">
            Still stuck?{' '}
            <a href="mailto:contact@barterkin.com" className="underline">
              Email contact@barterkin.com
            </a>
          </p>
        </CardContent>
      </Card>
    </main>
  )
}
```

**Also create: `components/auth/ResendLinkButton.tsx`** (client component with 60s cooldown)

```tsx
'use client'

import { useState, useTransition } from 'react'
import { Button } from '@/components/ui/button'
import { sendMagicLink } from '@/lib/actions/auth'

// Note: ResendLinkButton reuses sendMagicLink. It submits a FormData including
// the stored email + a Turnstile token. Since /verify-pending is an AUTHED page
// and the user already passed Turnstile at signup, we render a lightweight
// Turnstile inline. For simplicity Phase 2 punts on this: the button triggers
// a resend by submitting via a tiny form that pre-fills email; a Turnstile
// widget renders inline when the user clicks, then submits the form.
//
// For MVP v1, the resend flow is approximated by a link back to /login with
// the email pre-filled as a query param — user re-runs the full flow with
// Turnstile. This keeps the surface simple and honors D-AUTH-08 (CAPTCHA
// on every signup submission).

export function ResendLinkButton({ email }: { email: string }) {
  const [pending, startTransition] = useTransition()
  const [sent, setSent] = useState(false)
  const [cooldown, setCooldown] = useState(0)

  // For Phase 2 MVP: redirect to /login with ?email= prefilled, where user
  // re-completes Turnstile and submits. This avoids an inline second Turnstile
  // widget on verify-pending.
  const resendHref = `/login?email=${encodeURIComponent(email)}`

  return (
    <Button asChild size="lg" className="w-full">
      <a href={resendHref}>Resend verification link</a>
    </Button>
  )
}
```

Phase 2 simplification: the Resend button routes back to `/login?email=<prefill>` where the user re-runs Turnstile + submit. This keeps `/verify-pending` a pure presentational page and avoids double-rendering Turnstile. If UX feedback after launch demands true inline resend, a follow-up plan can add it.

**Wire `?email=` prefill in LoginForm** — update `components/auth/LoginForm.tsx` Task 3.4 output to read `searchParams.email` (or accept it as a prop passed from login/page.tsx). Simplest: read from `window.location.search` on mount and call `form.setValue('email', prefill)`. Add this to LoginForm as a small useEffect:

```tsx
import { useEffect } from 'react'
// ... inside LoginForm:
useEffect(() => {
  const prefill = new URLSearchParams(window.location.search).get('email')
  if (prefill) form.setValue('email', prefill)
}, [form])
```

Executor: after creating verify-pending/page.tsx and ResendLinkButton.tsx, patch LoginForm.tsx with the useEffect above.
  </action>
  <acceptance_criteria>
    - `app/verify-pending/page.tsx` exists
    - File contains literal "One more step" (H1)
    - File contains literal "Verify your email to join the directory" (H2)
    - File contains literal "this keeps Barterkin a real-community space" (body paragraph)
    - File contains literal "Still stuck?" and `mailto:contact@barterkin.com`
    - `components/auth/ResendLinkButton.tsx` exists
    - LoginForm has `useEffect` reading `email` query param
    - `pnpm typecheck && pnpm build` pass
  </acceptance_criteria>
</task>

<task id="2-3-7" type="auto">
  <title>Task 3.7: Three legal pages (ToS with GEO-04 clause, Privacy, Guidelines)</title>
  <read_first>
    - `.planning/phases/02-authentication-legal/02-UI-SPEC.md` (Legal Page Titles section, lines 197–221 — LOCKED copy)
    - `.planning/phases/02-authentication-legal/02-PATTERNS.md` (lines 271–292 — shared prose scaffold)
  </read_first>
  <action>
Create three legal pages. Each follows the same structural scaffold; differ only in copy per UI-SPEC.

**File 1: `app/legal/tos/page.tsx`** — **CRITICAL: contains GEO-04 locked clause**

```tsx
import Link from 'next/link'

export const metadata = { title: 'Terms of Service — Barterkin' }

export default function TermsPage() {
  return (
    <main className="min-h-screen bg-sage-bg text-forest-deep">
      <article className="mx-auto max-w-2xl py-16 px-6 space-y-8">
        <header className="space-y-2">
          <h1 className="font-serif text-3xl md:text-[32px] font-bold leading-[1.15]">
            Terms of Service
          </h1>
          <p className="text-sm text-muted-foreground">Last updated: 2026-04-19</p>
        </header>

        <p className="text-base leading-[1.5]">
          These terms govern your use of Barterkin, a community directory for Georgia residents to list skills offered and wanted, and to contact one another through a platform-relayed email. By creating an account you agree to these terms.
        </p>

        <section className="space-y-4">
          <h2 className="font-serif text-2xl font-bold leading-[1.2] mt-12">1. Who can use Barterkin</h2>
          <p className="text-base leading-[1.5]">
            You must be at least 18 years old and able to enter into a binding agreement under the laws of the State of Georgia. One account per person.
          </p>
        </section>

        <section className="space-y-4">
          <h2 className="font-serif text-2xl font-bold leading-[1.2] mt-12">2. Account responsibilities</h2>
          <p className="text-base leading-[1.5]">
            You are responsible for keeping your login credentials secure and for all activity on your account. Barterkin does not verify the skills you list — members barter at their own risk and judgment.
          </p>
        </section>

        <section className="space-y-4">
          <h2 className="font-serif text-2xl font-bold leading-[1.2] mt-12">3. Georgia residency (honor system)</h2>
          {/* GEO-04: LOCKED COPY — MUST appear verbatim. Do not edit without updating UI-SPEC. */}
          <p className="text-base leading-[1.5]">
            Barterkin is intended for people who live in Georgia, USA. We operate on an honor system — we don&apos;t verify your address. If you use Barterkin from outside Georgia, you do so at your own risk, you may not represent yourself as a Georgia resident, and we may remove any profile for which we have reason to believe this rule is being broken.
          </p>
        </section>

        <section className="space-y-4">
          <h2 className="font-serif text-2xl font-bold leading-[1.2] mt-12">4. Prohibited conduct</h2>
          <p className="text-base leading-[1.5]">
            Harassment, hate speech, fraud, scams, spam, impersonation, selling or soliciting cash-for-service, adult services, illegal goods, or any activity that violates Georgia or US law. Barterkin is for skill-for-skill barter — not a marketplace for goods or paid services.
          </p>
        </section>

        <section className="space-y-4">
          <h2 className="font-serif text-2xl font-bold leading-[1.2] mt-12">5. Content ownership</h2>
          <p className="text-base leading-[1.5]">
            You retain ownership of the content you post (profile text, avatar, skills). By posting, you grant Barterkin a non-exclusive license to display your content within the directory to other members for the purpose of facilitating barter contact.
          </p>
        </section>

        <section className="space-y-4">
          <h2 className="font-serif text-2xl font-bold leading-[1.2] mt-12">6. Platform-relayed contact</h2>
          <p className="text-base leading-[1.5]">
            When you contact another member, Barterkin sends the email on your behalf with your email address as the reply-to. Once they reply, subsequent messages go directly between you and them, outside Barterkin. We do not read or store message content beyond what is needed to send and deliver it.
          </p>
        </section>

        <section className="space-y-4">
          <h2 className="font-serif text-2xl font-bold leading-[1.2] mt-12">7. Termination</h2>
          <p className="text-base leading-[1.5]">
            You may delete your account at any time by contacting us. We may suspend or terminate your account for violating these terms, particularly prohibited conduct (Section 4) or the residency rule (Section 3).
          </p>
        </section>

        <section className="space-y-4">
          <h2 className="font-serif text-2xl font-bold leading-[1.2] mt-12">8. Disclaimers</h2>
          <p className="text-base leading-[1.5]">
            Barterkin is provided &quot;as is.&quot; We do not verify skill claims, identity, or outcomes of barters. You interact with other members at your own risk.
          </p>
        </section>

        <section className="space-y-4">
          <h2 className="font-serif text-2xl font-bold leading-[1.2] mt-12">9. Limitation of liability</h2>
          <p className="text-base leading-[1.5]">
            To the maximum extent permitted by Georgia law, Barterkin is not liable for indirect, incidental, or consequential damages arising from your use of the platform.
          </p>
        </section>

        <section className="space-y-4">
          <h2 className="font-serif text-2xl font-bold leading-[1.2] mt-12">10. Changes to these terms</h2>
          <p className="text-base leading-[1.5]">
            We may update these terms. Material changes will be announced via email to the address on your account. Continued use after a change constitutes acceptance.
          </p>
        </section>

        <section className="space-y-4">
          <h2 className="font-serif text-2xl font-bold leading-[1.2] mt-12">11. Contact</h2>
          <p className="text-base leading-[1.5]">
            Questions about these terms? Email{' '}
            <a href="mailto:contact@barterkin.com" className="underline">contact@barterkin.com</a>.
          </p>
        </section>
      </article>
    </main>
  )
}
```

**File 2: `app/legal/privacy/page.tsx`**

```tsx
export const metadata = { title: 'Privacy Policy — Barterkin' }

export default function PrivacyPage() {
  return (
    <main className="min-h-screen bg-sage-bg text-forest-deep">
      <article className="mx-auto max-w-2xl py-16 px-6 space-y-8">
        <header className="space-y-2">
          <h1 className="font-serif text-3xl md:text-[32px] font-bold leading-[1.15]">
            Privacy Policy
          </h1>
          <p className="text-sm text-muted-foreground">Last updated: 2026-04-19</p>
        </header>

        <p className="text-base leading-[1.5]">
          This policy explains what personal information Barterkin collects, how we use it, and who we share it with. In short: we collect the minimum needed to run the directory, we never sell your data, and we never expose your email or phone on your public profile.
        </p>

        <section className="space-y-4">
          <h2 className="font-serif text-2xl font-bold leading-[1.2] mt-12">1. What we collect</h2>
          <p className="text-base leading-[1.5]">
            Email address (required for sign-in and contact relay), display name, county, skills offered/wanted, avatar image, optional bio, optional TikTok handle. We also receive technical data (IP address, device info) via Vercel and PostHog for security + analytics.
          </p>
        </section>

        <section className="space-y-4">
          <h2 className="font-serif text-2xl font-bold leading-[1.2] mt-12">2. How we use it</h2>
          <p className="text-base leading-[1.5]">
            To operate the directory, route contact-relay emails, prevent spam and abuse (via rate limits, bot challenges, bounce handling), and measure platform health.
          </p>
        </section>

        <section className="space-y-4">
          <h2 className="font-serif text-2xl font-bold leading-[1.2] mt-12">3. Who we share it with (Supabase, Resend, Vercel, PostHog, Cloudflare)</h2>
          <p className="text-base leading-[1.5]">
            We use Supabase (database + auth), Resend (transactional email), Vercel (hosting + analytics), PostHog (product analytics), and Cloudflare Turnstile (bot protection). We share only what each service needs. We do not sell your data.
          </p>
        </section>

        <section className="space-y-4">
          <h2 className="font-serif text-2xl font-bold leading-[1.2] mt-12">4. How long we keep it</h2>
          <p className="text-base leading-[1.5]">
            Account data: while your account is active. Signup IP counters: 7 days. Contact-request logs: 12 months. You may request deletion at any time.
          </p>
        </section>

        <section className="space-y-4">
          <h2 className="font-serif text-2xl font-bold leading-[1.2] mt-12">5. Your rights (access, correction, deletion)</h2>
          <p className="text-base leading-[1.5]">
            Email contact@barterkin.com to access, correct, or delete your data. We will respond within 30 days.
          </p>
        </section>

        <section className="space-y-4">
          <h2 className="font-serif text-2xl font-bold leading-[1.2] mt-12">6. Cookies and analytics</h2>
          <p className="text-base leading-[1.5]">
            We use session cookies for sign-in and PostHog analytics cookies for product usage. No third-party advertising cookies.
          </p>
        </section>

        <section className="space-y-4">
          <h2 className="font-serif text-2xl font-bold leading-[1.2] mt-12">7. Security</h2>
          <p className="text-base leading-[1.5]">
            Transport is HTTPS-only. Passwords are not stored (we use magic-link + OAuth). Database access is controlled by Postgres row-level security.
          </p>
        </section>

        <section className="space-y-4">
          <h2 className="font-serif text-2xl font-bold leading-[1.2] mt-12">8. Children</h2>
          <p className="text-base leading-[1.5]">
            Barterkin is not directed to children under 18 and we do not knowingly collect data from minors.
          </p>
        </section>

        <section className="space-y-4">
          <h2 className="font-serif text-2xl font-bold leading-[1.2] mt-12">9. Changes to this policy</h2>
          <p className="text-base leading-[1.5]">
            We may update this policy. Material changes will be announced via email. Continued use constitutes acceptance.
          </p>
        </section>

        <section className="space-y-4">
          <h2 className="font-serif text-2xl font-bold leading-[1.2] mt-12">10. Contact</h2>
          <p className="text-base leading-[1.5]">
            Questions?{' '}
            <a href="mailto:contact@barterkin.com" className="underline">contact@barterkin.com</a>.
          </p>
        </section>
      </article>
    </main>
  )
}
```

**File 3: `app/legal/guidelines/page.tsx`**

```tsx
export const metadata = { title: 'Community Guidelines — Barterkin' }

export default function GuidelinesPage() {
  return (
    <main className="min-h-screen bg-sage-bg text-forest-deep">
      <article className="mx-auto max-w-2xl py-16 px-6 space-y-8">
        <header className="space-y-2">
          <h1 className="font-serif text-3xl md:text-[32px] font-bold leading-[1.15]">
            Community Guidelines
          </h1>
          <p className="text-sm text-muted-foreground">Last updated: 2026-04-19</p>
        </header>

        <p className="text-base leading-[1.5]">
          Barterkin works because members treat each other like neighbors. These guidelines describe what we expect from every member, what behavior gets a profile removed, and how to report someone who&apos;s breaking the rules.
        </p>

        <section className="space-y-4">
          <h2 className="font-serif text-2xl font-bold leading-[1.2] mt-12">1. Be who you say you are</h2>
          <p className="text-base leading-[1.5]">
            Use your real name or a recognizable community handle. Don&apos;t impersonate others.
          </p>
        </section>

        <section className="space-y-4">
          <h2 className="font-serif text-2xl font-bold leading-[1.2] mt-12">2. Trade skills, not goods or cash</h2>
          <p className="text-base leading-[1.5]">
            Barterkin is for skill-for-skill exchange. Don&apos;t list goods, paid services, or cash offers.
          </p>
        </section>

        <section className="space-y-4">
          <h2 className="font-serif text-2xl font-bold leading-[1.2] mt-12">3. Respect boundaries</h2>
          <p className="text-base leading-[1.5]">
            If someone says no or doesn&apos;t reply, move on. Don&apos;t contact the same person repeatedly through other means.
          </p>
        </section>

        <section className="space-y-4">
          <h2 className="font-serif text-2xl font-bold leading-[1.2] mt-12">4. No harassment, hate speech, or scams</h2>
          <p className="text-base leading-[1.5]">
            Slurs, threats, sexual advances, and scams result in immediate account removal. Zero tolerance.
          </p>
        </section>

        <section className="space-y-4">
          <h2 className="font-serif text-2xl font-bold leading-[1.2] mt-12">5. Keep Barterkin for Georgia</h2>
          <p className="text-base leading-[1.5]">
            This is a Georgia-resident community. See the Terms of Service residency clause.
          </p>
        </section>

        <section className="space-y-4">
          <h2 className="font-serif text-2xl font-bold leading-[1.2] mt-12">6. Use the contact relay, not public contact info</h2>
          <p className="text-base leading-[1.5]">
            Don&apos;t post email addresses, phone numbers, or social handles for contact in your profile (TikTok is allowed for credibility only, not primary contact). Use the platform-relayed email so both sides are protected.
          </p>
        </section>

        <section className="space-y-4">
          <h2 className="font-serif text-2xl font-bold leading-[1.2] mt-12">7. Report problems (and how we respond)</h2>
          <p className="text-base leading-[1.5]">
            Use the Report button on any profile. Reports go to the admin address and are reviewed within 48 hours. We act on credible reports of prohibited conduct.
          </p>
        </section>

        <section className="space-y-4">
          <h2 className="font-serif text-2xl font-bold leading-[1.2] mt-12">8. Consequences (warning → removal → ban)</h2>
          <p className="text-base leading-[1.5]">
            First minor violation: warning. Repeat or severe violation: profile removed. Scams, threats, or harassment: permanent ban with no appeal.
          </p>
        </section>
      </article>
    </main>
  )
}
```

All three pages use the same scaffold (max-w-2xl article, Lora H1/H2, Inter body, 12px gap between sections) per UI-SPEC. The GEO-04 clause in `tos/page.tsx` is LOCKED — Wave 3 E2E test `legal-pages.spec.ts` asserts the verbatim string match.
  </action>
  <acceptance_criteria>
    - All three files exist: `app/legal/tos/page.tsx`, `app/legal/privacy/page.tsx`, `app/legal/guidelines/page.tsx`
    - `app/legal/tos/page.tsx` contains verbatim string "Barterkin is intended for people who live in Georgia, USA" (GEO-04 locked clause)
    - `app/legal/tos/page.tsx` contains verbatim string "we may remove any profile for which we have reason to believe this rule is being broken"
    - `app/legal/privacy/page.tsx` contains "we never sell your data"
    - `app/legal/guidelines/page.tsx` contains "Trade skills, not goods or cash"
    - Each page has an H1 matching title ("Terms of Service", "Privacy Policy", "Community Guidelines")
    - Each page has at least 8 H2 sections
    - `pnpm typecheck && pnpm build` pass
  </acceptance_criteria>
</task>

<task id="2-3-8" type="auto">
  <title>Task 3.8: components/layout/Footer.tsx + wire into app/layout.tsx</title>
  <read_first>
    - `.planning/phases/02-authentication-legal/02-UI-SPEC.md` (Footer Updates, lines 223–230 — three-column grid, copy)
    - `.planning/phases/02-authentication-legal/02-PATTERNS.md` (lines 408–438 — getClaims in server component)
    - `app/layout.tsx` (current root layout — extend, don't rewrite)
    - `lib/supabase/server.ts`
  </read_first>
  <action>
**File 1: `components/layout/Footer.tsx`**

```tsx
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { LogoutButton } from '@/components/auth/LogoutButton'

/**
 * Site-wide footer. Spans every route.
 * Renders legal links always; auth state (Sign in vs. Log out + email) varies by claim.
 *
 * Uses getClaims() — NEVER getSession (banned per CLAUDE.md).
 */
export async function Footer() {
  const supabase = await createClient()
  const { data } = await supabase.auth.getClaims()
  const claims = data?.claims
  const isAuthed = !!claims?.sub
  const email = (claims?.email as string | undefined) ?? ''

  return (
    <footer className="bg-forest text-sage-bg py-8 px-6 mt-16">
      <div className="mx-auto max-w-6xl grid gap-6 md:grid-cols-3 items-center">
        <div className="text-sm">
          © 2026 Barterkin · A Georgia community skills directory
        </div>
        <nav className="text-sm flex gap-4 md:justify-center flex-wrap">
          <Link href="/legal/tos" className="hover:underline hover:decoration-[var(--color-clay)]">
            Terms
          </Link>
          <span aria-hidden>·</span>
          <Link href="/legal/privacy" className="hover:underline hover:decoration-[var(--color-clay)]">
            Privacy
          </Link>
          <span aria-hidden>·</span>
          <Link href="/legal/guidelines" className="hover:underline hover:decoration-[var(--color-clay)]">
            Community Guidelines
          </Link>
        </nav>
        <div className="text-sm md:text-right space-y-1">
          {isAuthed ? (
            <>
              <div className="text-xs text-muted-foreground">Signed in as {email}</div>
              <LogoutButton />
            </>
          ) : (
            <Link href="/login" className="underline">Sign in</Link>
          )}
        </div>
      </div>
    </footer>
  )
}
```

**File 2: `app/layout.tsx` (EXTEND)**

Read current `app/layout.tsx`. Add Footer import at top with other imports. Render `<Footer />` as the last child inside the PostHogProvider (or whatever wraps `{children}`), but BEFORE the `<Analytics />` component. Do NOT touch font imports, metadata, or the globals.css import.

Diff-style change:
```tsx
// add near existing imports:
import { Footer } from '@/components/layout/Footer'

// inside the tree, right before <Analytics />:
<PostHogProvider>
  {children}
  <Footer />
</PostHogProvider>
<Analytics />
```

The exact structure depends on the current file — the executor must read it first and make the minimum change that (a) renders Footer after children, (b) keeps `<Analytics />` as the last child of `<body>`, (c) preserves the PostHogProvider wrapper.

**Verify after:** visit `/` in dev and confirm footer renders at bottom. Visit `/legal/tos`, `/login`, `/verify-pending` (if authed) — footer should appear on all of them (because it's in root layout, not a nested one).
  </action>
  <acceptance_criteria>
    - `components/layout/Footer.tsx` exists; exports `Footer` async server component
    - Footer contains "© 2026 Barterkin" literal
    - Footer renders `<Link href="/legal/tos">Terms</Link>` and Privacy and Community Guidelines links
    - Footer uses `supabase.auth.getClaims()` (grep); does NOT use `getSession` (grep must NOT match)
    - `app/layout.tsx` imports Footer and renders `<Footer />` (grep)
    - `app/layout.tsx` still renders `<Analytics />` (not accidentally removed)
    - `pnpm build` passes
    - Dev-time: visit `http://localhost:3000/` and see footer at bottom
  </acceptance_criteria>
</task>

## Verification

After all eight tasks complete:

```bash
# All UI files exist
ls -la app/\(auth\)/{layout,login,signup}/*.tsx
ls -la app/verify-pending/page.tsx
ls -la app/legal/{tos,privacy,guidelines}/page.tsx
ls -la components/auth/{TurnstileWidget,GoogleButton,LoginForm,LogoutButton,GoogleAuthBlock,ResendLinkButton}.tsx
ls -la components/layout/Footer.tsx

# Key content verification (UI-SPEC-locked copy)
grep "Welcome to Barterkin" app/\(auth\)/login/page.tsx
grep "Welcome to Barterkin" app/\(auth\)/signup/page.tsx
grep "Sign in to find and offer skills" app/\(auth\)/login/page.tsx
grep "Create an account to join" app/\(auth\)/signup/page.tsx
grep "One more step" app/verify-pending/page.tsx
grep "Barterkin is intended for people who live in Georgia" app/legal/tos/page.tsx

# Brand override
grep "color-primary: var(--color-clay)" app/globals.css

# Footer wired
grep "<Footer" app/layout.tsx

# Banned patterns absent
! grep -r "getSession" components/ app/\(auth\) app/verify-pending app/legal

# CI green
pnpm typecheck && pnpm lint && pnpm build
```

## success_criteria

- [ ] `app/globals.css` contains Phase 2 `--color-primary: var(--color-clay)` brand override inside the existing `@theme inline` block
- [ ] All six auth components exist: TurnstileWidget, GoogleButton, GoogleAuthBlock, LoginForm, LogoutButton, ResendLinkButton
- [ ] `/login` and `/signup` render with Google button, Turnstile widget, email input, magic-link button, legal microcopy, cross-link
- [ ] `/verify-pending` renders "One more step" with resend link routing back to /login?email=prefill
- [ ] `/legal/tos` contains the GEO-04 locked clause verbatim
- [ ] `/legal/privacy` and `/legal/guidelines` render with UI-SPEC-locked H1s and sections
- [ ] Footer renders on every route, uses getClaims() (never getSession), shows Log out POST-form for authed users
- [ ] `pnpm typecheck && pnpm lint && pnpm build` all pass

## output

After completion, create `.planning/phases/02-authentication-legal/02-03-SUMMARY.md` recording:
- List of all component files and their client/server boundary
- Any adjustments made to the LoginForm to support `?email=` prefill
- Dev-time screenshot verification (ideally manual — note "footer verified on /, /login, /legal/tos")
- Flag if any UI-SPEC copy was adjusted (should be zero — all locked strings preserved)
