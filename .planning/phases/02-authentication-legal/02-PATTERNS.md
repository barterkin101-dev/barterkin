# Phase 2: Authentication & Legal — Pattern Map

**Mapped:** 2026-04-19
**Phase directory:** `.planning/phases/02-authentication-legal/`
**Files analyzed:** 27 new + 3 modified = 30
**Analogs found (exact or role-match):** 22 / 30
**No-analog files (greenfield):** 8 / 30

> Phase 1 shipped only infrastructure (`app/page.tsx` hello-world card, PostHog provider, Supabase client factories, a dev-only `app/api/test-email/route.ts`, and a single smoke test per framework). That means most Phase 2 files are the **first** concrete instance of their role in the codebase. Pattern assignments below lean heavily on the three Phase-1 Supabase client factories (`lib/supabase/{client,server,middleware}.ts`), the test-email route handler, the shadcn primitives already installed, and the `fire-test-event.tsx` client-component shape. Where no close codebase analog exists, the planner should fall back to the verbatim patterns in `02-RESEARCH.md` (Patterns 1–8, already quoted from Supabase docs).
>
> The cwd is `/Users/ashleyakbar/barterkin`. All file paths below are relative to that root unless prefixed.

---

## File Classification

| New/Modified File | Role | Data Flow | Closest Analog | Match Quality |
|-------------------|------|-----------|----------------|---------------|
| `app/(auth)/login/page.tsx` | page (server component) | request-response | `app/page.tsx` | partial (page role, different responsibility) |
| `app/(auth)/signup/page.tsx` | page (server component) | request-response | `app/page.tsx` | partial |
| `app/(auth)/layout.tsx` | layout (server component) | request-response | `app/layout.tsx` | role-match |
| `app/auth/callback/route.ts` | route handler (GET) | request-response | `app/api/test-email/route.ts` | role-match (different HTTP method) |
| `app/auth/confirm/route.ts` | route handler (GET) | request-response | `app/api/test-email/route.ts` | role-match |
| `app/auth/signout/route.ts` | route handler (POST) | request-response | `app/api/test-email/route.ts` | exact (both POST, both server-side) |
| `app/verify-pending/page.tsx` | page (server component) | request-response | `app/page.tsx` | partial |
| `app/legal/tos/page.tsx` | page (static prose) | request-response | `app/page.tsx` | partial (page role; different layout) |
| `app/legal/privacy/page.tsx` | page (static prose) | request-response | `app/page.tsx` | partial |
| `app/legal/guidelines/page.tsx` | page (static prose) | request-response | `app/page.tsx` | partial |
| `components/auth/LoginForm.tsx` | client component (form) | event-driven (user input → server action) | `components/fire-test-event.tsx` | partial (client-component shape) |
| `components/auth/GoogleButton.tsx` | client component (CTA) | event-driven (click → redirect) | `components/fire-test-event.tsx` | role-match |
| `components/layout/Footer.tsx` | layout component (server w/ inner client) | request-response | `app/page.tsx` (inline layout) | partial |
| `lib/actions/auth.ts` | server actions module | request-response (form → server → Supabase) | `app/api/test-email/route.ts` + `lib/supabase/server.ts` | partial (composed — route handler does server-side POST + Resend call, same primitives) |
| `lib/utils/disposable-email.ts` | utility (server-only) | transform (email → boolean) | `lib/utils.ts` + `lib/supabase/admin.ts` (server-only import pattern) | partial |
| `lib/utils/rate-limit.ts` | utility (server-only) | request-response (IP → DB → boolean) | `lib/supabase/admin.ts` | role-match (server-only + Supabase) |
| `supabase/migrations/002_auth_tables.sql` | migration (DDL) | batch | `supabase/seed.sql` (only SQL file in repo) | no analog — greenfield |
| `tests/unit/disposable-email.test.ts` | unit test | batch | `tests/unit/smoke.test.ts` | role-match |
| `tests/unit/rate-limit.test.ts` | unit test | batch | `tests/unit/smoke.test.ts` | role-match |
| `tests/unit/magic-link-schema.test.ts` | unit test | batch | `tests/unit/smoke.test.ts` | role-match |
| `tests/e2e/login-magic-link.spec.ts` | E2E test | event-driven | `tests/e2e/smoke.spec.ts` | role-match |
| `tests/e2e/login-google-oauth.spec.ts` | E2E test | event-driven | `tests/e2e/smoke.spec.ts` | role-match |
| `tests/e2e/verify-pending-gate.spec.ts` | E2E test | event-driven | `tests/e2e/smoke.spec.ts` | role-match |
| `tests/e2e/auth-group-redirect.spec.ts` | E2E test | event-driven | `tests/e2e/smoke.spec.ts` | role-match |
| `tests/e2e/session-persistence.spec.ts` | E2E test | event-driven | `tests/e2e/smoke.spec.ts` | role-match |
| `tests/e2e/logout.spec.ts` | E2E test | event-driven | `tests/e2e/smoke.spec.ts` | role-match |
| `tests/e2e/captcha-required.spec.ts` | E2E test | event-driven | `tests/e2e/smoke.spec.ts` | role-match |
| `tests/e2e/legal-pages.spec.ts` | E2E test | event-driven | `tests/e2e/smoke.spec.ts` | role-match |
| `tests/e2e/footer-links.spec.ts` | E2E test | event-driven | `tests/e2e/smoke.spec.ts` | role-match |
| **MODIFIED** `middleware.ts` | middleware (top-level) | request-response | `middleware.ts` (Phase 1 self) | self-extend (canonical Supabase pattern) |
| **MODIFIED** `lib/supabase/middleware.ts` | middleware helper | request-response | `lib/supabase/middleware.ts` (Phase 1 self) | self-extend |
| **MODIFIED** `app/layout.tsx` | root layout | request-response | `app/layout.tsx` (Phase 1 self) | self-extend |
| **MODIFIED** `app/globals.css` | global stylesheet | config | `app/globals.css` (Phase 1 self) | self-extend |

---

## Pattern Assignments

### `app/auth/callback/route.ts` (route handler GET, request-response)

**Analog:** `app/api/test-email/route.ts`

**Imports pattern** (lines 1–2 of analog):
```ts
import { NextResponse } from 'next/server'
import { Resend } from 'resend'
```
Adapt for Phase 2:
```ts
import { NextResponse, type NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase/server'
```

**Server-only HTTP handler pattern** (analog lines 5–10):
```ts
// Node runtime — resend SDK uses Node APIs.
export const runtime = 'nodejs'

// Dev-only endpoint. Phase 5 replaces this with a Supabase Edge Function
// (send-contact) where the service-role + Resend keys live in managed secrets,
// not the Next.js bundle.
export async function POST(request: Request) {
```
Phase 2 callback uses `GET` (OAuth redirect is a browser navigation), runtime stays default (Edge is fine; no Node-only deps):
```ts
export async function GET(request: NextRequest) { ... }
```

**Core pattern** (verbatim from RESEARCH Pattern 1, lines 336–357 of `02-RESEARCH.md`):
```ts
export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')
  const nextParam = searchParams.get('next') ?? '/directory'
  const next = nextParam.startsWith('/') ? nextParam : '/directory'

  if (code) {
    const supabase = await createClient()
    const { error } = await supabase.auth.exchangeCodeForSession(code)
    if (!error) {
      return NextResponse.redirect(`${origin}${next}`)
    }
  }
  return NextResponse.redirect(`${origin}/auth/error?reason=exchange_failed`)
}
```

**Error handling pattern** (analog lines 42–45):
```ts
if (error) {
  return NextResponse.json({ error: error.message }, { status: 500 })
}
return NextResponse.json({ ok: true, id: data?.id })
```
For Phase 2 callback, errors redirect to `/auth/error?reason=...` instead of JSON (UX flow, not an API consumer). Use the open-redirect guard `nextParam.startsWith('/')` — copy verbatim.

---

### `app/auth/confirm/route.ts` (route handler GET, request-response)

**Analog:** `app/api/test-email/route.ts` (shape) + RESEARCH Pattern 2 (verbatim Supabase docs code).

**Imports pattern** (RESEARCH lines 372–376):
```ts
import { type EmailOtpType } from '@supabase/supabase-js'
import { redirect } from 'next/navigation'
import { type NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase/server'
```

**Core pattern** (RESEARCH lines 378–395, verbatim from `supabase.com/ui/docs/nextjs/password-based-auth`):
```ts
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const token_hash = searchParams.get('token_hash')
  const type = searchParams.get('type') as EmailOtpType | null
  const _next = searchParams.get('next')
  const next = _next?.startsWith('/') ? _next : '/directory'

  if (token_hash && type) {
    const supabase = await createClient()
    const { error } = await supabase.auth.verifyOtp({ type, token_hash })
    if (!error) {
      redirect(next)
    }
    redirect(`/auth/error?reason=${encodeURIComponent(error?.message ?? 'verify_failed')}`)
  }
  redirect(`/auth/error?reason=missing_token`)
}
```

**Open-redirect guard:** copy the `_next?.startsWith('/') ? _next : '/directory'` idiom to all three route handlers — it is the single pattern that stops `?next=https://evil.com` redirects.

---

### `app/auth/signout/route.ts` (route handler POST, request-response)

**Analog:** `app/api/test-email/route.ts` lines 10–46 — closest match (server-side POST handler in Next 16 App Router).

**Imports pattern** (adapt from analog line 1):
```ts
import { NextResponse, type NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase/server'
```

**POST-only pattern** (PITFALL 8 in RESEARCH — must be POST to avoid prefetch-triggered logout). Shape borrowed from analog lines 10, 42–45:
```ts
export async function POST(request: NextRequest) {
  const supabase = await createClient()
  await supabase.auth.signOut()
  const { origin } = new URL(request.url)
  return NextResponse.redirect(`${origin}/`, { status: 303 })
}
```
**Status 303** is required for POST→GET redirect after signout (browsers will re-POST on 302). Not in the analog — add it explicitly because this is the first POST-redirect in the repo.

**No GET handler:** Do NOT export `export async function GET` on this file (PITFALL 8 in RESEARCH).

---

### `app/(auth)/login/page.tsx` + `app/(auth)/signup/page.tsx` (page, server component)

**Analog:** `app/page.tsx` (only existing page in the app, structurally similar: shadcn Card + Button composition).

**Imports pattern** (analog lines 1–3):
```ts
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { FireTestEvent } from '@/components/fire-test-event'
```
Phase 2 `login/page.tsx`:
```ts
import { LoginForm } from '@/components/auth/LoginForm'
import { GoogleButton } from '@/components/auth/GoogleButton'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Separator } from '@/components/ui/separator'
import Link from 'next/link'
```

**Core layout pattern** (analog lines 5–23):
```tsx
export default function HomePage() {
  return (
    <main className="min-h-screen flex items-center justify-center p-6">
      <Card className="max-w-xl w-full bg-sage-pale border-forest-mid/20">
        <CardHeader>
          <CardTitle className="font-serif text-3xl text-forest-deep">Barterkin foundation</CardTitle>
          <CardDescription className="text-forest-mid">
            Phase 1 scaffold: palette + fonts + shadcn + PWA + PostHog.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-3">
          <Button className="bg-forest hover:bg-forest-deep text-sage-bg">...</Button>
        </CardContent>
      </Card>
    </main>
  )
}
```

**Phase 2 adaptations** (locked by `02-UI-SPEC.md`):
- Card width: `max-w-[400px]` not `max-w-xl` (UI-SPEC Spacing Scale exception)
- Typography: `font-serif` (Lora) 24px bold for heading, Inter 16px for body — already wired as `font-sans` default and `font-serif` class
- Palette: `bg-sage-pale` card on `bg-sage-bg` page (UI-SPEC Color section)
- Do NOT use raw hex (`bg-forest`) — after the `@theme inline` brand override in `app/globals.css`, use `bg-primary text-primary-foreground` (clay on sage-bg automatically). Reserve `bg-forest` for the footer.
- Compose: `<GoogleButton />` → `<Separator>or</Separator>` → `<LoginForm />` → legal microcopy block

**`/signup` is structurally identical to `/login`** — only copy differs (UI-SPEC Copywriting Contract table). Both are passwordless. Keep them as two files for clear routing + distinct `<title>` metadata.

---

### `app/(auth)/layout.tsx` (layout, server component)

**Analog:** `app/layout.tsx` (root layout).

**Imports + shape pattern** (analog lines 1–9):
```tsx
import type { Metadata, Viewport } from 'next'
import { Inter, Lora } from 'next/font/google'
import { Analytics } from '@vercel/analytics/next'
import { PostHogProvider } from './providers'
import './globals.css'
```

The `(auth)` route-group layout does NOT re-import globals or fonts (those are inherited from `app/layout.tsx`). It is a thin wrapper that only adds route-specific metadata and an optional `<main>` wrapper. Pattern:
```tsx
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: { default: 'Sign in — Barterkin', template: '%s — Barterkin' },
}

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return <main className="min-h-screen flex items-center justify-center py-16 px-6">{children}</main>
}
```
**No `<html>` or `<body>` tag** — only the root layout (`app/layout.tsx`) emits those. This is a hard Next.js rule; analog in `app/layout.tsx` lines 25–34 shows the correct one-and-only-place pattern.

---

### `app/verify-pending/page.tsx` (page, server component)

**Analog:** `app/page.tsx`.

Structure mirrors `/login` but with UI-SPEC-locked copy: 32px Lora display "One more step" → 24px Lora sub-heading → two body paragraphs → clay "Resend verification link" CTA → ghost "Log out and try again" link.

Reuse the same card composition as `/login` for consistency. Card class: `max-w-[480px]` (UI-SPEC lets verify-pending be slightly wider for the prose).

---

### `app/legal/{tos,privacy,guidelines}/page.tsx` (page, static prose)

**Analog:** `app/page.tsx` (page role); no existing prose page in the codebase.

**Shared shape** (all three pages use the same scaffold; differ only in copy):
```tsx
export const metadata = { title: 'Terms of Service — Barterkin' } // + Privacy, Guidelines

export default function TermsPage() {
  return (
    <main className="min-h-screen bg-sage-bg text-forest-deep">
      <article className="mx-auto max-w-2xl py-16 px-6">
        <h1 className="font-serif text-3xl md:text-[32px] font-bold leading-[1.15]">Terms of Service</h1>
        <p className="text-sm text-muted-foreground mt-2">Last updated: 2026-04-19</p>
        <p className="text-base leading-[1.5] mt-8">...lead paragraph (UI-SPEC locked)...</p>
        <h2 className="font-serif text-2xl font-bold leading-[1.2] mt-12">1. Who can use Barterkin</h2>
        ...
      </article>
    </main>
  )
}
```

**Lock UI-SPEC copy verbatim** — GEO-04 Section 3 clause on ToS is checker-enforced. Reference `02-UI-SPEC.md` lines 197–221 for the locked section list and lead paragraphs.

---

### `components/auth/LoginForm.tsx` (client component, event-driven)

**Analog:** `components/fire-test-event.tsx` (only client component in the repo).

**Imports + client-boundary pattern** (analog lines 1–4):
```tsx
'use client'

import { Button } from '@/components/ui/button'
import posthog from 'posthog-js'
import { useState } from 'react'
```

Phase 2 LoginForm:
```tsx
'use client'

import { useActionState, useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Turnstile } from '@marsidev/react-turnstile'
import { Form, FormField, FormItem, FormLabel, FormControl, FormMessage } from '@/components/ui/form'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { sendMagicLink } from '@/lib/actions/auth'
```

**Client-boundary + useState pattern** (analog lines 7–22):
```tsx
export function FireTestEvent() {
  const [status, setStatus] = useState<'idle' | 'fired'>('idle')
  return (
    <Button
      variant="secondary"
      onClick={() => { ... }}
      aria-label="Fire PostHog test_event"
    >
      {status === 'fired' ? 'Fired — check PostHog' : 'Fire test event'}
    </Button>
  )
}
```

**Server-action binding pattern** (from RESEARCH Pattern 3 + React 19 `useActionState`):
```tsx
const [state, formAction, pending] = useActionState(sendMagicLink, null)
// ...
<form action={formAction}>
  <Input name="email" type="email" required />
  <TurnstileWidget onVerify={(t) => setCaptchaToken(t)} />
  <input type="hidden" name="cf-turnstile-response" value={captchaToken ?? ''} />
  <Button type="submit" size="lg" disabled={pending || !captchaToken}>
    {pending ? 'Sending…' : 'Send magic link'}
  </Button>
</form>
```

**Error handling:** Read `state.error` and render inside shadcn `<FormMessage>` or `<Alert>` block below the input. UI-SPEC Error States table locks exact copy per trigger.

---

### `components/auth/GoogleButton.tsx` (client component, event-driven)

**Analog:** `components/fire-test-event.tsx`.

**Core pattern** (verbatim from RESEARCH Pattern 4, lines 482–508):
```tsx
'use client'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'

export function GoogleButton({ captchaToken }: { captchaToken: string | null }) {
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
    <Button size="lg" onClick={signIn} disabled={!captchaToken}>
      Continue with Google
    </Button>
  )
}
```

**Client Supabase factory usage** (`lib/supabase/client.ts` lines 1–8):
```ts
import { createBrowserClient } from '@supabase/ssr'
import type { Database } from '@/lib/database.types'

export const createClient = () =>
  createBrowserClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
  )
```
Call this inside the click handler, not at module scope — `createBrowserClient` allocates per-call and is cheap; keeps SSR-safe.

---

### `components/layout/Footer.tsx` (layout component)

**Analog:** `app/page.tsx` (layout composition pattern); no existing footer.

Structure (from UI-SPEC Footer Updates):
```tsx
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { LogoutButton } from '@/components/auth/LogoutButton'

export async function Footer() {
  const supabase = await createClient()
  const { data } = await supabase.auth.getClaims()
  const claims = data?.claims

  return (
    <footer className="bg-forest text-sage-bg py-8 px-6 mt-16">
      <div className="mx-auto max-w-6xl grid gap-6 md:grid-cols-3">
        <div className="text-sm">© 2026 Barterkin · A Georgia community skills directory</div>
        <nav className="text-sm flex gap-4">
          <Link href="/legal/tos" className="hover:underline hover:decoration-clay">Terms</Link>
          <Link href="/legal/privacy" className="hover:underline hover:decoration-clay">Privacy</Link>
          <Link href="/legal/guidelines" className="hover:underline hover:decoration-clay">Community Guidelines</Link>
        </nav>
        <div className="text-sm text-right">
          {claims?.sub ? <LogoutButton email={claims.email as string} /> : <Link href="/login">Sign in</Link>}
        </div>
      </div>
    </footer>
  )
}
```
**Uses `getClaims()` in a server component** — same pattern as `lib/supabase/middleware.ts` line 29. Do NOT use `getSession()` (banned per CLAUDE.md).

**LogoutButton is a separate client component** that submits a `<form method="POST" action="/auth/signout">` — simple HTML form, no JS required. This avoids the Pitfall 8 prefetch-triggered-logout problem.

---

### `lib/actions/auth.ts` (server actions module)

**Analog:** `app/api/test-email/route.ts` (closest "server-side async fn that validates input + calls third-party") + `lib/supabase/server.ts` (async client factory).

**Imports + server-only directive** (composed from RESEARCH Pattern 3 lines 408–415):
```ts
'use server'

import { headers } from 'next/headers'
import { z } from 'zod'
import { createClient } from '@/lib/supabase/server'
import { isDisposableEmail } from '@/lib/utils/disposable-email'
import { checkAndIncrementIpCounter } from '@/lib/utils/rate-limit'
```

**Validation pattern** (analog `test-email/route.ts` lines 24–28 — parse body + guard):
```ts
const body = (await request.json().catch(() => ({}))) as { to?: string }
const to = body.to
if (!to) {
  return NextResponse.json({ error: 'missing `to` field in body' }, { status: 400 })
}
```
Phase 2 adapts to Zod (RESEARCH Pattern 3 lines 418–433):
```ts
const MagicLinkSchema = z.object({
  email: z.string().email().toLowerCase(),
  captchaToken: z.string().min(1),
})

const parsed = MagicLinkSchema.safeParse({
  email: formData.get('email'),
  captchaToken: formData.get('cf-turnstile-response'),
})
if (!parsed.success) {
  return { ok: false, error: 'Please enter a valid email.' }
}
```

**Core pattern** (RESEARCH Pattern 3, lines 423–466 — copy verbatim). The full `sendMagicLink` action is prescribed there; reproduce it including:
- disposable-email check BEFORE calling Supabase (friendly error surface)
- `x-forwarded-for` first-entry extraction (PITFALL 5)
- `captchaToken` passed to `signInWithOtp` options (NOT called through `/siteverify` — PITFALL 2)
- `emailRedirectTo: ${NEXT_PUBLIC_SITE_URL}/auth/confirm` (PITFALL 9)

**Second server action `signOut`:** Thin wrapper calling `supabase.auth.signOut()` + `redirect('/')`. Only needed if a surface wants a server-action version; the POST route handler is sufficient for the footer.

---

### `lib/utils/disposable-email.ts` (utility, server-only)

**Analog:** `lib/supabase/admin.ts` (the only existing `'server-only'` utility file).

**Server-only import pattern** (analog lines 1–2):
```ts
import 'server-only'
import { createClient as createSupabaseClient } from '@supabase/supabase-js'
```

Phase 2 pattern (verbatim from RESEARCH Pattern 7 lines 698–709):
```ts
import 'server-only'
import { DisposableEmailChecker } from 'disposable-email-domains-js'

const checker = new DisposableEmailChecker()

export async function isDisposableEmail(email: string): Promise<boolean> {
  const domain = email.trim().toLowerCase().split('@')[1]
  if (!domain) return false
  return checker.isDisposable(domain)
}
```

**Why `'server-only'`:** keeps the ~4000-domain blocklist out of the client bundle (~110 KB saved). Same rationale as `admin.ts` keeping the service-role key out of the browser.

**Wave 0 probe note (RESEARCH Assumption A4):** Verify `DisposableEmailChecker` is the actual export name at install time. If the package exports a plain function, adjust accordingly.

---

### `lib/utils/rate-limit.ts` (utility, server-only)

**Analog:** `lib/supabase/admin.ts` (server-only + Supabase data access).

**Imports pattern** (analog lines 1–3):
```ts
import 'server-only'
import { createClient as createSupabaseClient } from '@supabase/supabase-js'
import type { Database } from '@/lib/database.types'
```

Phase 2 uses the server-action Supabase client (which calls the `SECURITY DEFINER` SQL function `check_signup_ip`):
```ts
import 'server-only'
import { createClient } from '@/lib/supabase/server'

export async function checkAndIncrementIpCounter(ip: string): Promise<boolean> {
  const supabase = await createClient()
  const { data, error } = await supabase.rpc('check_signup_ip', { p_ip: ip })
  if (error) {
    // Fail-closed for rate-limiter? Fail-open? UI-SPEC doesn't specify.
    // Recommendation: fail-OPEN (return true) with a console.error, so a
    // broken rate-limiter doesn't block legitimate signups. Bots are caught
    // by Turnstile (primary defense); rate-limit is secondary (PITFALL 10).
    console.error('rate-limit RPC failed', error)
    return true
  }
  return data === true
}
```

**Pattern note:** the Phase-1 `admin.ts` does NOT bypass RLS here — we deliberately use the user-facing server client, and the `check_signup_ip` SQL function is `SECURITY DEFINER`. This is the correct layering per RESEARCH Pattern 5 (lines 563–564 of RESEARCH).

---

### `supabase/migrations/002_auth_tables.sql` (migration, DDL)

**Analog:** `supabase/seed.sql` (only existing SQL file — but it's a near-empty placeholder; no close analog in the repo).

**Core pattern:** verbatim from RESEARCH Pattern 5 (lines 521–616 of `02-RESEARCH.md`). Copy that entire SQL block; it is the prescribed migration and includes:
1. `public.signup_attempts` table with RLS enabled + zero policies (service-role-only)
2. `public.check_signup_ip(text)` function (SECURITY DEFINER, `search_path = public, pg_temp`)
3. `public.current_user_is_verified()` function (SECURITY DEFINER helper for AUTH-04 in Phase 3 RLS)
4. `public.disposable_email_domains` seed table
5. `public.reject_disposable_email()` trigger function + `reject_disposable_email_before_insert` trigger on `auth.users`

**File-name convention:** the research titles the file `{timestamp}_phase2_auth.sql` — the orchestrator prompt says `002_auth_tables.sql`. Align with whatever Phase-1 migration numbering was chosen (repo currently has zero migrations, so `002_auth_tables.sql` implies a planned `001_phase1_init.sql` in Wave 0 of Phase 2 setup, OR use supabase CLI timestamp prefix. Planner decides; pattern is unchanged.)

**Wave 0 caveat (RESEARCH Assumption A3):** Running a trigger-install on `auth.users` requires postgres role — Supabase CLI `db push` generally handles this but test locally first via `pnpm supabase db reset`.

---

### `tests/unit/*.test.ts` (unit tests)

**Analog:** `tests/unit/smoke.test.ts`.

**Imports + describe pattern** (analog lines 1–13):
```ts
import { describe, it, expect } from 'vitest'

describe('smoke', () => {
  it('vitest is wired', () => {
    expect(1 + 1).toBe(2)
  })

  it('jsdom document is available', () => {
    const el = document.createElement('div')
    el.textContent = 'Barterkin'
    expect(el.textContent).toBe('Barterkin')
  })
})
```

**Config awareness** (`vitest.config.ts` lines 7–13):
- `environment: 'jsdom'` — DOM globals are available
- `setupFiles: ['./vitest.setup.ts']` — `@testing-library/jest-dom/vitest` is pre-registered
- `include: ['tests/unit/**/*.{test,spec}.{ts,tsx}']` — files must be under `tests/unit/`

**Wave 0 stubs** (per VALIDATION.md phase gate — stubs must EXIST before Wave 1 code lands):
- `tests/unit/disposable-email.test.ts` — import `isDisposableEmail`, assert `it.skip` or minimal test until Wave 1 ships the impl
- `tests/unit/rate-limit.test.ts` — stub the same way
- `tests/unit/magic-link-schema.test.ts` — covers the `MagicLinkSchema` Zod shape

Pattern for each stub:
```ts
import { describe, it, expect } from 'vitest'

describe('disposable-email', () => {
  it.todo('rejects @mailinator.com')
  it.todo('accepts @gmail.com')
  it.todo('handles malformed email (no @)')
})
```

---

### `tests/e2e/*.spec.ts` (E2E tests)

**Analog:** `tests/e2e/smoke.spec.ts`.

**Imports + describe pattern** (analog lines 1–13):
```ts
import { test, expect } from '@playwright/test'

test.describe('smoke', () => {
  test('home page renders Barterkin foundation card', async ({ page }) => {
    await page.goto('/')
    await expect(page.getByText('Barterkin foundation')).toBeVisible()
  })

  test('fire test event button is present', async ({ page }) => {
    await page.goto('/')
    await expect(page.getByRole('button', { name: /fire posthog test_event/i })).toBeVisible()
  })
})
```

**Config awareness** (`playwright.config.ts` lines 10–25):
- `baseURL: 'http://localhost:3000'` — use relative paths in `page.goto`
- `webServer: { command: 'pnpm start' ... }` — production build, Playwright will boot it
- `reuseExistingServer: !process.env.CI` — locally, an already-running `pnpm dev` is reused

**Wave 0 stub pattern** (Wave 0 ships tests-first skeletons, Wave 1+ fills behavior):
```ts
import { test, expect } from '@playwright/test'

test.describe('login magic-link', () => {
  test.fixme('email input renders and accepts input', async ({ page }) => {
    await page.goto('/login')
    await expect(page.getByLabel('Email address')).toBeVisible()
  })
  test.fixme('submitting valid email shows "Check your email"', async () => { })
  test.fixme('@mailinator.com shows disposable-email error', async () => { })
})
```

Use `test.fixme()` (not `test.skip()`) — `fixme` documents "this is expected to fail / implement later" whereas `skip` gets lost in CI output.

---

### MODIFIED: `middleware.ts` + `lib/supabase/middleware.ts`

**Analog:** existing `middleware.ts` + `lib/supabase/middleware.ts` (Phase 1 self; extend, don't replace).

**Top-level `middleware.ts` stays thin** (Phase 1 lines 1–22). No changes needed to the matcher — it already excludes the correct static paths. Comment update suggested: remove the "Phase 2 (AUTH-04, AUTH-09) will add..." TODO (line 6) since Phase 2 is now doing it.

**`lib/supabase/middleware.ts` extension** — verbatim RESEARCH Pattern 6 (lines 632–689). Key rules carried from the Phase 1 pattern:
1. **Keep the `let response` reassignment exactly as in Phase 1** (lines 6, 14–16). Copy-pasting a fresh `NextResponse.next({request})` loses cookies (PITFALL 3).
2. **Use `getClaims()` not `getUser()` for the trust check in middleware** (Phase 1 line 29 precedent). One extra `getUser()` fallback round-trip is OK in the `email_verified`-missing edge case (PITFALL 4).
3. **`NextResponse.redirect()` for route gating** — inherits cookies from the request. If cookies need refreshing on redirect, set them on the redirect response before returning.

**Existing middleware.ts matcher is correct** (lines 11–21): do NOT change `matcher` unless adding route-group-specific exclusions, which are not required because the matcher excludes static/webhook paths but still runs on all user-navigable routes (including `/auth/*`, `/legal/*`, `/login`, `/signup`, `/verify-pending`).

---

### MODIFIED: `app/layout.tsx`

**Analog:** existing `app/layout.tsx` (lines 1–35, self-extend).

**Extension pattern — add Footer import + render** (insert after `{children}`):
```tsx
import { Footer } from '@/components/layout/Footer'

// ...
<PostHogProvider>
  {children}
  <Footer />
</PostHogProvider>
```
Keep `<Analytics />` as the very last child of `<body>` (analog line 31).

**Metadata update:** broaden `description` to reflect the shipped auth-capable app; keep `appleWebApp` settings unchanged. UI-SPEC does not prescribe new metadata — minimal change.

---

### MODIFIED: `app/globals.css`

**Analog:** existing `app/globals.css` (lines 1–138, self-extend).

**Extension pattern — append to the `@theme inline` block** (insert before closing `}` at analog line 57):
```css
/* Phase 2 brand override — makes shadcn primary render clay-on-sage */
--color-primary: var(--color-clay);
--color-primary-foreground: var(--color-sage-bg);
--color-ring: var(--color-clay);
--color-muted-foreground: var(--color-forest-mid);
```

**Do NOT edit `:root` stone defaults** (lines 61–94) — those are shadcn-managed. The `@theme inline` block overrides them. UI-SPEC lines 97–107 lock this approach verbatim.

**Do NOT remove the `.dark` block** (lines 96–128) even though Phase 2 has no dark-mode design. Removing breaks the `@custom-variant dark` declaration at line 4.

---

## Shared Patterns

### Supabase Server Client (REQUIRED for all server actions and route handlers)

**Source:** `lib/supabase/server.ts` (lines 1–27)

**Apply to:** `app/auth/callback/route.ts`, `app/auth/confirm/route.ts`, `app/auth/signout/route.ts`, `lib/actions/auth.ts`, `lib/utils/rate-limit.ts`, `components/layout/Footer.tsx`

```ts
import 'server-only'
import { cookies } from 'next/headers'
import { createServerClient } from '@supabase/ssr'
import type { Database } from '@/lib/database.types'

export const createClient = async () => {
  const cookieStore = await cookies()
  return createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    {
      cookies: {
        getAll: () => cookieStore.getAll(),
        setAll: (toSet) => {
          try {
            toSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options),
            )
          } catch {
            // Called from a Server Component — cookies can't be set here.
            // Middleware handles refresh; this is fine.
          }
        },
      },
    },
  )
}
```

**Usage:** `const supabase = await createClient()` (note: `await` — the factory is async because `cookies()` is async in Next 16). Never call `createServerClient` directly in feature code.

---

### Supabase Browser Client

**Source:** `lib/supabase/client.ts` (lines 1–8)

**Apply to:** `components/auth/GoogleButton.tsx`, any future client component that needs Supabase Auth state.

```ts
import { createBrowserClient } from '@supabase/ssr'
import type { Database } from '@/lib/database.types'

export const createClient = () =>
  createBrowserClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
  )
```

**Usage:** call `createClient()` inside event handlers, not at module scope. Cheap to re-allocate per-call.

---

### Environment Variable Access (env names are stable in Phase 1)

**Source:** `lib/supabase/client.ts`, `lib/supabase/server.ts`, `lib/supabase/admin.ts`

**Apply to:** all new code touching env vars.

| Variable | Access | Server/Client | Phase 2 adds? |
|----------|--------|---------------|----------------|
| `NEXT_PUBLIC_SUPABASE_URL` | `process.env.NEXT_PUBLIC_SUPABASE_URL!` | both | no (existing) |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | same | both | no (existing) |
| `SUPABASE_SERVICE_ROLE_KEY` | `process.env.SUPABASE_SERVICE_ROLE_KEY!` (server-only file) | server only | no (existing, Phase 2 does not use it) |
| `NEXT_PUBLIC_TURNSTILE_SITEKEY` | `process.env.NEXT_PUBLIC_TURNSTILE_SITEKEY!` | both | YES (new Phase 2) |
| `NEXT_PUBLIC_SITE_URL` | `process.env.NEXT_PUBLIC_SITE_URL` (no `!` — may be absent in local dev) | both | YES (new Phase 2) |

**Turnstile secret lives in Supabase Studio**, NOT in `.env.local` (RESEARCH line 472). Do not add `TURNSTILE_SECRET_KEY` to the env schema.

---

### Error Handling in Route Handlers + Server Actions

**Source:** `app/api/test-email/route.ts` (lines 12–45) + RESEARCH Pitfalls.

**Apply to:** all three `app/auth/*/route.ts` handlers + `lib/actions/auth.ts`.

**Pattern:**
1. **Route handlers** surface errors as redirects to `/auth/error?reason=...` (not JSON 500) — because users hit these via browser nav, not API clients.
2. **Server actions** return a discriminated union: `{ ok: true } | { ok: false, error: string }`. Never throw — React 19 `useActionState` expects a value.
3. **Friendly copy is UI-SPEC-locked** (Error States table, UI-SPEC lines 165–173). Map internal errors to user-friendly strings in the action layer, not in the UI.
4. **Never leak Supabase error details to the user** — `error.message` may include internal IDs. Map known error codes (disposable, rate-limit, invalid-captcha) to the UI-SPEC copy; log the raw error server-side.

---

### JWT Verification (NEVER hand-roll)

**Source:** `lib/supabase/middleware.ts` line 29 + CLAUDE.md (banned-list).

**Apply to:** middleware + any server-side auth check.

- **USE `supabase.auth.getClaims()`** — JWKS-verified, no Auth-server round-trip. Returns `data.claims` with `sub`, `email`, `email_verified`, etc.
- **FALLBACK `supabase.auth.getUser()`** — server round-trip, trustworthy but slower. Use only for edge cases (PITFALL 4: missing `email_verified` claim on OAuth users).
- **NEVER `supabase.auth.getSession()`** on any server path — cookie-read-only, spoofable. BANNED per CLAUDE.md.

---

### PostHog Event Capture (optional, Phase 2 may or may not use)

**Source:** `components/fire-test-event.tsx` lines 11–14 + `app/providers.tsx` lines 15–22.

**Apply to (if instrumented):** `lib/actions/auth.ts` — could fire `posthog.capture('signup_completed', { method: 'magic-link' | 'google' })` from the server action on success. Use `posthog-node` server-side (already installed), not `posthog-js`.

RESEARCH line 150 says PostHog is "not used in Phase 2 for metrics" — treat as optional nice-to-have; do not block on it.

---

### shadcn Component Consumption

**Source:** `components/ui/{button,card,input,label}.tsx` (already installed).

**Apply to:** all auth surfaces.

| Component | Phase 2 usage | Existing file |
|-----------|--------------|---------------|
| `Button` (variant `default`, size `lg`) | All CTAs | `components/ui/button.tsx` |
| `Button` (variant `ghost`, size `sm`) | Footer logout button | same |
| `Card` + `CardHeader` + `CardContent` | Auth card on `/login`, `/signup`, `/verify-pending` | `components/ui/card.tsx` |
| `Input` | Email input | `components/ui/input.tsx` |
| `Label` | Form field labels (wrapped by shadcn `FormLabel`) | `components/ui/label.tsx` |
| `Form` + `FormField` + `FormItem` + `FormMessage` | RHF binding on LoginForm | NEW — `pnpm dlx shadcn@latest add form` in Wave 0 |
| `Alert` + `AlertTitle` + `AlertDescription` | Rate-limit banner, disposable-email banner, CAPTCHA failure | NEW — `pnpm dlx shadcn@latest add alert` in Wave 0 |
| `Separator` | "or" divider between OAuth and magic-link | NEW — `pnpm dlx shadcn@latest add separator` in Wave 0 |

**After the `@theme inline` brand override, `<Button>` default variant renders clay-on-sage automatically** — no `className="bg-clay"` overrides needed.

---

### Test File Locations (enforced by config)

**Source:** `vitest.config.ts` lines 11–13, `playwright.config.ts` line 4.

- Unit tests MUST live in `tests/unit/**/*.{test,spec}.{ts,tsx}` — Vitest `include` pattern
- E2E tests MUST live in `tests/e2e/*.spec.ts` — Playwright `testDir: 'tests/e2e'`
- Files outside these paths will NOT run in CI.

---

### SQL Migration Layout

**Source:** Project convention — `supabase/migrations/` (directory exists, currently empty) + `supabase/config.toml` + RESEARCH Pattern 5.

- Migration files live under `supabase/migrations/{NNN}_{slug}.sql` (research uses `{timestamp}`; planner picks naming)
- Every Phase 2 migration includes: `alter table ... enable row level security;` immediately after CREATE TABLE, even when zero policies are installed (default-deny pattern)
- All SECURITY DEFINER functions set `search_path = public, pg_temp` (RESEARCH line 546, 572, 599) — non-negotiable security hardening
- GRANT EXECUTE to `anon` + `authenticated` explicitly for RPC-callable functions

---

## No Analog Found

Files with no close match in the repo (planner falls back to verbatim RESEARCH patterns):

| File | Role | Data Flow | Reason | Fallback Source |
|------|------|-----------|--------|-----------------|
| `supabase/migrations/002_auth_tables.sql` | migration | batch DDL | No prior migration shipped; `seed.sql` is near-empty | RESEARCH Pattern 5 (lines 521–616) — canonical |
| `app/auth/confirm/route.ts` | GET route handler (verifyOtp) | request-response | `test-email/route.ts` is POST + Resend; shape mismatch | RESEARCH Pattern 2 (lines 372–395) — verbatim Supabase docs |
| `app/legal/{tos,privacy,guidelines}/page.tsx` | static prose page | request-response | No prose page exists; `app/page.tsx` is a CTA card | UI-SPEC Legal Page Titles (lines 197–221) — locked copy; pattern is standard `<article><h1><p>` |
| `components/layout/Footer.tsx` | persistent layout component | request-response | No footer in Phase 1; `app/page.tsx` inlines layout | UI-SPEC Footer Updates (lines 223–230) + RESEARCH Pattern 6 (shared `getClaims()` pattern) |
| `components/auth/LoginForm.tsx` | RHF + Zod + Turnstile form | event-driven | `fire-test-event.tsx` is a single-button client component; no form pattern yet | RESEARCH Pattern 3 + UI-SPEC Copywriting Contract |
| `lib/actions/auth.ts` | server actions | request-response | No server actions in Phase 1 | RESEARCH Pattern 3 (lines 408–466) — verbatim |
| `lib/utils/disposable-email.ts` | server-only utility calling npm pkg | transform | `admin.ts` is server-only but calls Supabase, not a blocklist | RESEARCH Pattern 7 (lines 698–709) — verbatim |
| `app/verify-pending/page.tsx` | full-page error / gate surface | request-response | No existing gate page | UI-SPEC Verify-Pending Page (lines 148–161) — locked copy |

---

## Key Codebase Conventions (discovered)

1. **`import 'server-only'` on line 1** of any module that must never be bundled into the client (example: `lib/supabase/admin.ts` line 1, `lib/supabase/server.ts` line 1). Rule repeated in admin.ts line 10 as a comment: "Public repo rule: never remove `import 'server-only'` from line 1."
2. **TypeScript path alias `@/` points to repo root** (`tsconfig.json` + `vitest.config.ts` line 17). Use `@/lib/...`, `@/components/...`, `@/app/...` everywhere. No relative `../../` imports.
3. **Database types imported as `type` only**: `import type { Database } from '@/lib/database.types'` (admin.ts line 3, server.ts line 4, middleware.ts line 3). Keeps runtime footprint zero.
4. **Explicit env-var non-null assertions** (`process.env.FOO!`) — Phase 1 convention (`client.ts` lines 6–7, `server.ts` lines 9–10). Matches Next's `NEXT_PUBLIC_*` guarantee for build-time validation.
5. **shadcn components use `data-slot`** (button.tsx line 55, card.tsx line 8, input.tsx line 9) — the new-york + Tailwind-v4 post-refactor. Don't add `data-slot` manually; leave shadcn-generated attributes intact.
6. **Tailwind classes use the `cn()` helper** from `lib/utils.ts` lines 4–6 — wraps `clsx` + `twMerge`. Use it whenever conditionally composing class strings; direct string concatenation is fine for static class lists.
7. **Metadata lives in exported `metadata: Metadata` constants** (`app/layout.tsx` line 10, `app/manifest.ts` line 3). Phase 2 legal pages follow the same pattern (export `metadata` with page-specific title).
8. **`pnpm` is the package manager** (package.json line 8, pnpm-lock.yaml present). Never use `npm install` or `yarn add`.
9. **Comments reference planning docs** (middleware.ts lines 5–6 cite "Phase 2 (AUTH-04, AUTH-09)"; admin.ts lines 6–8 cite "Phase 5 contact relay"). Maintain this traceability — future readers grep for requirement IDs.
10. **Dev-only endpoints guard on `NODE_ENV === 'production'`** (`test-email/route.ts` lines 12–14). Phase 2 doesn't need this pattern (all endpoints are prod-ready), but if a Wave-0 probe endpoint is added, use this guard.

---

## Metadata

**Analog search scope:** `/Users/ashleyakbar/barterkin/app/`, `/components/`, `/lib/`, `/middleware.ts`, `/supabase/`, `/tests/`

**Files scanned in full:** 23
- `app/layout.tsx`, `app/page.tsx`, `app/providers.tsx`, `app/globals.css`, `app/manifest.ts`, `app/sw.ts`
- `app/api/test-email/route.ts`
- `components/fire-test-event.tsx`, `components/ui/{button,card,input,label}.tsx`
- `lib/supabase/{client,server,middleware,admin}.ts`, `lib/utils.ts`, `lib/database.types.ts`
- `middleware.ts`, `components.json`, `package.json`, `next.config.ts`
- `vitest.config.ts`, `vitest.setup.ts`, `playwright.config.ts`
- `supabase/config.toml`, `supabase/seed.sql`
- `tests/unit/smoke.test.ts`, `tests/e2e/smoke.spec.ts`

**Upstream artifacts consumed:**
- `.planning/phases/02-authentication-legal/02-RESEARCH.md` (1178 lines — consumed fully across multiple reads)
- `.planning/phases/02-authentication-legal/02-UI-SPEC.md` (325 lines — consumed fully)

**Pattern extraction date:** 2026-04-19

**Ready for planning:** Planner can reference analog excerpts + RESEARCH.md patterns directly in PLAN.md action sections.
