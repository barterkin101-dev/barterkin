---
plan: "03a"
phase: 2
name: auth-components
wave: 2
depends_on: [1]
autonomous: true
requirements:
  - AUTH-01
  - AUTH-02
  - AUTH-05
  - AUTH-08
files_modified:
  - app/globals.css
  - components/auth/TurnstileWidget.tsx
  - components/auth/GoogleButton.tsx
  - components/auth/GoogleAuthBlock.tsx
  - components/auth/LoginForm.tsx
  - components/auth/LogoutButton.tsx
  - components/auth/ResendLinkButton.tsx
must_haves:
  truths:
    - "app/globals.css includes @theme inline brand overrides (primary=clay, ring=clay) so shadcn Button renders clay-on-sage by default"
    - "TurnstileWidget.tsx renders the Cloudflare widget and emits onVerify(token) up to the parent"
    - "GoogleButton.tsx calls supabase.auth.signInWithOAuth with captchaToken; is disabled until captchaToken present"
    - "GoogleAuthBlock.tsx owns a Turnstile widget and passes the token down to GoogleButton"
    - "LoginForm.tsx binds sendMagicLink via useActionState and disables submit until captchaToken present"
    - "LogoutButton.tsx is a server component that renders <form method='POST' action='/auth/signout'>"
    - "ResendLinkButton.tsx routes back to /login?email=<prefill> (Phase 2 MVP simplification)"
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
    - path: "components/auth/GoogleAuthBlock.tsx"
      provides: "Client component wrapping GoogleButton + Turnstile state for OAuth flow"
      exports: ["GoogleAuthBlock"]
    - path: "components/auth/LoginForm.tsx"
      provides: "RHF + Zod + Turnstile email form wired to sendMagicLink"
      exports: ["LoginForm"]
    - path: "components/auth/LogoutButton.tsx"
      provides: "POST form to /auth/signout (no JS required)"
      exports: ["LogoutButton"]
    - path: "components/auth/ResendLinkButton.tsx"
      provides: "Resend-verification CTA that routes back to /login with email prefill"
      exports: ["ResendLinkButton"]
  key_links:
    - from: "components/auth/LoginForm.tsx"
      to: "lib/actions/auth.ts:sendMagicLink"
      via: "useActionState(sendMagicLink, null)"
      pattern: "useActionState\\(sendMagicLink"
    - from: "components/auth/GoogleButton.tsx"
      to: "lib/supabase/client.ts:createClient"
      via: "supabase.auth.signInWithOAuth"
      pattern: "signInWithOAuth"
    - from: "components/auth/GoogleAuthBlock.tsx"
      to: "components/auth/GoogleButton.tsx"
      via: "<GoogleButton captchaToken={captchaToken} /> render"
      pattern: "<GoogleButton"
    - from: "components/auth/GoogleAuthBlock.tsx"
      to: "components/auth/TurnstileWidget.tsx"
      via: "<TurnstileWidget onVerify={setCaptchaToken} />"
      pattern: "<TurnstileWidget"
    - from: "components/auth/LogoutButton.tsx"
      to: "app/auth/signout/route.ts"
      via: "<form method='POST' action='/auth/signout'>"
      pattern: "action=\"/auth/signout\""
    - from: "components/auth/LoginForm.tsx"
      to: "components/auth/TurnstileWidget.tsx"
      via: "setCaptchaToken on verify; hidden input name='cf-turnstile-response'"
      pattern: "cf-turnstile-response"
---

## Objective

Wave 2 UI — part (a): auth components + the brand-token override that makes them render correctly.

This plan produces the six reusable auth components and the `app/globals.css` brand override they depend on. Plan 02-03b consumes all of these to assemble the public page surfaces (`/login`, `/signup`, `/verify-pending`, `/legal/*`, root layout footer wiring).

Split rationale: the original 02-03 plan bundled 8 tasks and 14+ files into a single plan, which exceeds the ~50% context budget per plan. Splitting into 02-03a (components, 6 files) and 02-03b (pages + footer wiring, 8 files) keeps each plan executable at peak Claude quality.

**Purpose:** Honor user decisions D-AUTH-01 (Google OAuth button), D-AUTH-02 (magic-link form), D-AUTH-05 (footer logout POST form), D-AUTH-08 (Turnstile gates signup). All UI-SPEC copy is locked; components render the locked copy verbatim.

**Output:** Six auth components + the brand-token override. Plan 02-03b (pages) consumes these.

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

## Tasks

<task id="2-3a-1" type="auto">
  <title>Task 3a.1: Extend app/globals.css with Phase 2 brand overrides</title>
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

Per UI-SPEC line 107: "This makes <Button> (default variant) render clay-on-sage automatically, so the executor doesn't sprinkle `className='bg-clay'` overrides everywhere." Wave 2 Tasks 3a.3–3a.5 (GoogleButton, LoginForm) and Plan 02-03b verify-pending resend rely on this.
  </action>
  <verify>
    <automated>grep -c "color-primary: var(--color-clay)" app/globals.css && grep -c "color-ring: var(--color-clay)" app/globals.css && pnpm build</automated>
  </verify>
  <done>
    - `grep "color-primary: var(--color-clay)" app/globals.css` returns 1 match
    - `grep "color-ring: var(--color-clay)" app/globals.css` returns 1 match
    - `grep "color-muted-foreground: var(--color-forest-mid)" app/globals.css` returns 1 match
    - The existing `@theme inline` opening brace and closing brace still match (brace count unchanged relative to Phase 1 +1/-1)
    - `pnpm build` passes
    - The `.dark` block from Phase 1 is still present (not accidentally deleted)
  </done>
</task>

<task id="2-3a-2" type="auto">
  <title>Task 3a.2: components/auth/TurnstileWidget.tsx — CAPTCHA widget wrapper</title>
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
  <verify>
    <automated>pnpm typecheck && grep -q "'use client'" components/auth/TurnstileWidget.tsx && grep -q "Protected by Cloudflare Turnstile" components/auth/TurnstileWidget.tsx</automated>
  </verify>
  <done>
    - `components/auth/TurnstileWidget.tsx` exists
    - Line 1 is `'use client'`
    - Named export `TurnstileWidget` present
    - File imports `Turnstile` from `@marsidev/react-turnstile`
    - File reads `process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY`
    - File contains "Protected by Cloudflare Turnstile." literal (UI-SPEC copy)
    - `pnpm typecheck` passes
  </done>
</task>

<task id="2-3a-3" type="auto">
  <title>Task 3a.3: components/auth/GoogleButton.tsx + GoogleAuthBlock.tsx</title>
  <read_first>
    - `.planning/phases/02-authentication-legal/02-RESEARCH.md` (Pattern 4, lines 482–508)
    - `.planning/phases/02-authentication-legal/02-UI-SPEC.md` (Auth CTAs table — "Continue with Google" copy, Google logo icon 20px)
    - `lib/supabase/client.ts` (existing browser-client factory)
    - `components/ui/button.tsx` (existing shadcn Button)
    - `components/auth/TurnstileWidget.tsx` (from Task 3a.2)
  </read_first>
  <action>
Create two files — GoogleButton is the CTA, GoogleAuthBlock wraps it with a Turnstile widget so the page (02-03b) can drop one component in.

**File 1: `components/auth/GoogleButton.tsx`**

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
  /** When null/empty, button is disabled. Passed from GoogleAuthBlock's Turnstile state. */
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

**File 2: `components/auth/GoogleAuthBlock.tsx`** (client component; owns Turnstile state for Google button)

```tsx
'use client'

import { useState } from 'react'
import { GoogleButton } from './GoogleButton'
import { TurnstileWidget } from './TurnstileWidget'

/**
 * AUTH-01 + AUTH-08: Pairs the Google OAuth CTA with its own Turnstile widget.
 * Page-level consumers (app/(auth)/login, app/(auth)/signup) embed this as a
 * single unit; the Turnstile state is local to this block so it does not
 * conflict with the magic-link form's own Turnstile widget.
 */
export function GoogleAuthBlock() {
  const [captchaToken, setCaptchaToken] = useState<string | null>(null)
  return (
    <div className="space-y-3">
      <GoogleButton captchaToken={captchaToken} />
      <TurnstileWidget
        onVerify={(t) => setCaptchaToken(t)}
        onExpire={() => setCaptchaToken(null)}
        onError={() => setCaptchaToken(null)}
      />
    </div>
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
- After the `@theme inline` override from Task 3a.1, `<Button>` default variant renders clay-on-sage automatically. No `bg-clay` className needed.
- GoogleAuthBlock owns the Turnstile state so the Google OAuth path has a dedicated captcha — the magic-link LoginForm has its OWN Turnstile widget in Task 3a.4.
  </action>
  <verify>
    <automated>pnpm typecheck && pnpm lint && grep -q "Continue with Google" components/auth/GoogleButton.tsx && grep -q "provider: 'google'" components/auth/GoogleButton.tsx && grep -q "<GoogleButton" components/auth/GoogleAuthBlock.tsx</automated>
  </verify>
  <done>
    - `components/auth/GoogleButton.tsx` exists; Line 1 is `'use client'`; exports `GoogleButton`
    - `components/auth/GoogleAuthBlock.tsx` exists; Line 1 is `'use client'`; exports `GoogleAuthBlock`
    - Button literal text is exactly "Continue with Google"
    - `signInWithOAuth` call uses `provider: 'google'` and `captchaToken`
    - Button disabled attribute is wired to `!captchaToken`
    - `pnpm typecheck` + `pnpm lint` pass
  </done>
</task>

<task id="2-3a-4" type="auto">
  <title>Task 3a.4: components/auth/LoginForm.tsx — RHF + Zod + Turnstile magic-link form</title>
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

import { useActionState, useEffect, useState } from 'react'
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

  // Hydrate email from ?email= query param (used by ResendLinkButton on /verify-pending).
  useEffect(() => {
    const prefill = new URLSearchParams(window.location.search).get('email')
    if (prefill) form.setValue('email', prefill)
  }, [form])

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
- **Error banner copy** comes from `state.error` which the server action populates with UI-SPEC-locked strings (Plan 02-02 Task 2.4).
- **`<input type="hidden" name="cf-turnstile-response">`** is how the form carries the token to the server action. Turnstile's default token-field name is `cf-turnstile-response`; the server action reads `formData.get('cf-turnstile-response')`.
- **Button size="lg"** = 44px tap target. After Task 3a.1 globals.css override, renders clay.
- **Submit button disabled until both `pending === false` AND `captchaToken` present** — enforces AUTH-08 client-side (server enforces again).
- **`setSubmittedEmail` before calling `formAction`** — captures the email at submit time so the success state can display it (server-action return doesn't include email by design — anti-enumeration).
- **`useEffect` email prefill** — reads `?email=` from `window.location.search` on mount. Used by the Resend flow from `/verify-pending`.
  </action>
  <verify>
    <automated>pnpm typecheck && grep -q "useActionState(sendMagicLink" components/auth/LoginForm.tsx && grep -q 'name="cf-turnstile-response"' components/auth/LoginForm.tsx && grep -q "Send magic link" components/auth/LoginForm.tsx && grep -q "Check your email" components/auth/LoginForm.tsx</automated>
  </verify>
  <done>
    - `components/auth/LoginForm.tsx` exists
    - Line 1 is `'use client'`
    - Named export `LoginForm`
    - File contains `useActionState(sendMagicLink` (grep)
    - File contains `name="cf-turnstile-response"` (grep)
    - File contains literal "Send magic link" (grep)
    - File contains literal "Check your email" (grep)
    - File contains `useEffect` reading `email` query param
    - Button disabled wired to `pending || !captchaToken`
    - `pnpm typecheck` passes
  </done>
</task>

<task id="2-3a-5" type="auto">
  <title>Task 3a.5: components/auth/LogoutButton.tsx + ResendLinkButton.tsx</title>
  <read_first>
    - `.planning/phases/02-authentication-legal/02-UI-SPEC.md` (Auth CTAs + Logout Button sections; Verify-Pending Page copy)
    - `.planning/phases/02-authentication-legal/02-PATTERNS.md` (server-component pattern)
  </read_first>
  <action>
Create two small components.

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

**File 2: `components/auth/ResendLinkButton.tsx`** (client component; Phase 2 MVP uses a route-back-to-login pattern)

```tsx
'use client'

import { Button } from '@/components/ui/button'

/**
 * AUTH-04 UX companion. For Phase 2 MVP, resend is implemented as a route
 * back to /login?email=<prefill>, where the user re-runs Turnstile + submits.
 * This avoids double-rendering Turnstile on /verify-pending and honors
 * D-AUTH-08 (CAPTCHA on every signup submission).
 *
 * If post-launch UX demands true inline resend, a follow-up plan adds a second
 * Turnstile widget here and calls sendMagicLink directly.
 */
export function ResendLinkButton({ email }: { email: string }) {
  const resendHref = `/login?email=${encodeURIComponent(email)}`

  return (
    <Button asChild size="lg" className="w-full">
      <a href={resendHref}>Resend verification link</a>
    </Button>
  )
}
```

Notes:
- LogoutButton is a SERVER component — no `'use client'` directive. Next.js renders `<form method="POST">` directly to HTML; browser handles the submit; `/auth/signout` route handler handles the session clear.
- ResendLinkButton is a CLIENT component — the `'use client'` directive isn't strictly required since the file has no state/effects, but `asChild` + `<a>` behavior is simpler as a client boundary per shadcn conventions. Keep `'use client'` so future-me can drop inline state without refactoring.
- The ResendLinkButton relies on LoginForm's `useEffect` prefill (implemented in Task 3a.4) to populate the email field on arrival.
  </action>
  <verify>
    <automated>pnpm typecheck && grep -q 'action="/auth/signout"' components/auth/LogoutButton.tsx && grep -q 'method="POST"' components/auth/LogoutButton.tsx && grep -q "Resend verification link" components/auth/ResendLinkButton.tsx</automated>
  </verify>
  <done>
    - `components/auth/LogoutButton.tsx` exists; contains `action="/auth/signout"` and `method="POST"`
    - `components/auth/ResendLinkButton.tsx` exists; contains "Resend verification link" literal
    - LogoutButton has no `'use client'` directive (server component)
    - ResendLinkButton has `'use client'` directive
    - `pnpm typecheck` passes
  </done>
</task>

## Verification

After all five tasks complete:

```bash
# All component files exist
ls -la components/auth/{TurnstileWidget,GoogleButton,GoogleAuthBlock,LoginForm,LogoutButton,ResendLinkButton}.tsx

# Brand override
grep "color-primary: var(--color-clay)" app/globals.css

# Key-link grep
grep -l "useActionState(sendMagicLink" components/auth/LoginForm.tsx
grep -l "signInWithOAuth" components/auth/GoogleButton.tsx
grep -l '<GoogleButton' components/auth/GoogleAuthBlock.tsx
grep -l '<TurnstileWidget' components/auth/GoogleAuthBlock.tsx
grep -l 'action="/auth/signout"' components/auth/LogoutButton.tsx

# CI green
pnpm typecheck && pnpm lint && pnpm build
```

## Success Criteria

- [ ] `app/globals.css` contains Phase 2 `--color-primary: var(--color-clay)` brand override inside the existing `@theme inline` block
- [ ] All six auth components exist: TurnstileWidget, GoogleButton, GoogleAuthBlock, LoginForm, LogoutButton, ResendLinkButton
- [ ] LoginForm has useEffect email prefill from `?email=` query param
- [ ] GoogleAuthBlock owns its own Turnstile state so page-level consumers can embed a single unit
- [ ] LogoutButton is a server component rendering `<form method="POST" action="/auth/signout">`
- [ ] `pnpm typecheck && pnpm lint && pnpm build` all pass

## Output

After completion, create `.planning/phases/02-authentication-legal/02-03a-SUMMARY.md` recording:
- List of all component files and their client/server boundary
- Note confirming the brand override did not regress Phase 1 surfaces (fire-test-event button still renders)
- Flag if any UI-SPEC copy was adjusted (should be zero — all locked strings preserved)
