---
phase: 01-foundation-infrastructure
plan: 05
plan_number: 5
plan_name: posthog-resend
type: execute
wave: 4
depends_on: [4]
files_modified:
  - /Users/ashleyakbar/barterkin/package.json
  - /Users/ashleyakbar/barterkin/pnpm-lock.yaml
  - /Users/ashleyakbar/barterkin/app/providers.tsx
  - /Users/ashleyakbar/barterkin/app/layout.tsx
  - /Users/ashleyakbar/barterkin/app/page.tsx
  - /Users/ashleyakbar/barterkin/app/api/test-email/route.ts
  - /Users/ashleyakbar/barterkin/docs/events.md
  - /Users/ashleyakbar/barterkin/README.md
autonomous: true
requirements:
  - FOUND-04
  - FOUND-07
  - FOUND-08
  - FOUND-10
must_haves:
  truths:
    - "`posthog-js` + `posthog-node` + `resend` installed at pinned versions"
    - "app/providers.tsx exports PostHogProvider client component and initialises posthog-js on mount"
    - "app/layout.tsx wraps {children} with PostHogProvider, preserving Analytics + fonts from Plan 02/04"
    - "Home page has a 'Fire test event' button that calls posthog.capture('test_event') (used for ROADMAP success criterion #5)"
    - "app/api/test-email/route.ts is a Node-runtime POST endpoint that sends via Resend and is guarded off in production"
    - "docs/events.md declares the contact_initiated event schema (FOUND-10 source-of-truth)"
    - "README has a one-liner showing how to verify PostHog + Resend locally"
    - "`pnpm build` and `pnpm typecheck` exit 0"
    - "RESEND_API_KEY is never referenced from a client component"
  artifacts:
    - path: "/Users/ashleyakbar/barterkin/app/providers.tsx"
      provides: "'use client' PostHog provider"
      exports: ["PostHogProvider"]
    - path: "/Users/ashleyakbar/barterkin/app/api/test-email/route.ts"
      provides: "Server route that sends a Resend test email (dev-only)"
      exports: ["POST", "runtime"]
    - path: "/Users/ashleyakbar/barterkin/docs/events.md"
      provides: "PostHog event-schema source of truth"
      contains: "contact_initiated"
  key_links:
    - from: "app/layout.tsx"
      to: "app/providers.tsx"
      via: "import { PostHogProvider } + wrap children"
      pattern: "<PostHogProvider>"
    - from: "app/api/test-email/route.ts"
      to: "process.env.RESEND_API_KEY"
      via: "new Resend(process.env.RESEND_API_KEY!)"
      pattern: "new Resend\\("
    - from: "app/api/test-email/route.ts"
      to: "production safeguard"
      via: "early-return 404 when NODE_ENV === 'production'"
      pattern: "NODE_ENV === 'production'"
---

<objective>
Install PostHog (`posthog-js` client, `posthog-node` server), wrap the root layout with a `PostHogProvider`, expose a 'Fire test event' button on the home page so ROADMAP success criterion #5 is verifiable end-to-end, install Resend, and add a dev-only `POST /api/test-email` route that sends from the verified domain. Declare the `contact_initiated` event schema in `docs/events.md` (FOUND-10 source of truth — events themselves fire from the Phase 5 Edge Function).

Purpose: This is the last scaffold-wiring plan. After this, the app can emit `test_event` to PostHog (unblocking ROADMAP criterion #5) and send a test email via Resend (validating the pre-phase SPF/DKIM/DMARC work). Phase 5 (Contact Relay) replaces `/api/test-email` with a Supabase Edge Function; this Phase 1 route exists only to prove the Resend wiring is alive.

Output: Home-page button fires `test_event` → appears in PostHog dashboard within 60s. `curl POST /api/test-email` returns 200 + email arrives. `docs/events.md` describes the `contact_initiated` schema.
</objective>

<execution_context>
@$HOME/.claude/get-shit-done/workflows/execute-plan.md
@$HOME/.claude/get-shit-done/templates/summary.md
</execution_context>

<context>
@/Users/ashleyakbar/barterkin/.planning/phases/01-foundation-infrastructure/01-CONTEXT.md
@/Users/ashleyakbar/barterkin/.planning/phases/01-foundation-infrastructure/01-RESEARCH.md
@/Users/ashleyakbar/barterkin/.planning/research/STACK.md
@/Users/ashleyakbar/barterkin/app/layout.tsx
@/Users/ashleyakbar/barterkin/app/page.tsx
@/Users/ashleyakbar/barterkin/.env.local.example
@/Users/ashleyakbar/barterkin/.planning/phases/01-foundation-infrastructure/01-04-SUMMARY.md

<interfaces>
Package versions (RESEARCH §Standard Stack; verify with `pnpm view` if > 30 days):
- `posthog-js`: `^1.200.0` (current line; 1.x is the long-lived major)
- `posthog-node`: `^4.x` (latest major)
- `resend`: `^4.0.0`

Env vars (already in .env.local.example from Plan 01):
- `NEXT_PUBLIC_POSTHOG_KEY` — client-safe
- `NEXT_PUBLIC_POSTHOG_HOST` — defaults to `https://us.i.posthog.com` (US PostHog per memory)
- `RESEND_API_KEY` — SERVER ONLY, no NEXT_PUBLIC_ prefix

PostHog provider pattern (RESEARCH Pattern 3, line ~480):
```tsx
'use client'
import posthog from 'posthog-js'
import { PostHogProvider as PHProvider } from 'posthog-js/react'
import { useEffect } from 'react'

export function PostHogProvider({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    posthog.init(process.env.NEXT_PUBLIC_POSTHOG_KEY!, {
      api_host: process.env.NEXT_PUBLIC_POSTHOG_HOST ?? 'https://us.i.posthog.com',
      person_profiles: 'identified_only',
      capture_pageview: true,
      capture_pageleave: true,
      defaults: '2026-01-30',
    })
  }, [])
  return <PHProvider client={posthog}>{children}</PHProvider>
}
```

Resend test route pattern (RESEARCH Pattern 4, line ~540):
- `export const runtime = 'nodejs'`
- Production guard: `if (NODE_ENV === 'production') return 404`
- From: `'Barterkin <hello@barterkin.com>'` (A2 assumption in RESEARCH — mail domain = barterkin.com; confirmed 10/10 mail-tester pre-phase per CONTEXT)
- Subject: `'Barterkin Phase 1 — Resend test send'`

Event schema (RESEARCH §Phase Requirements → Test Map line ~1182):
- `contact_initiated` — fired from the Phase 5 `send-contact` Supabase Edge Function
- Properties: `recipient_county` (FIPS), `recipient_category` (slug), `sender_tenure_days` (int)
- Source of truth: `public.contact_requests` row
- Phase 1 scope: document only; no firing yet.
</interfaces>
</context>

<tasks>

<task type="auto" tdd="false">
  <name>Task 1: Install PostHog, add provider, wire layout, add test-event button</name>
  <files>
    - /Users/ashleyakbar/barterkin/package.json
    - /Users/ashleyakbar/barterkin/pnpm-lock.yaml
    - /Users/ashleyakbar/barterkin/app/providers.tsx
    - /Users/ashleyakbar/barterkin/app/layout.tsx
    - /Users/ashleyakbar/barterkin/app/page.tsx
    - /Users/ashleyakbar/barterkin/docs/events.md
  </files>
  <read_first>
    - /Users/ashleyakbar/barterkin/.planning/phases/01-foundation-infrastructure/01-RESEARCH.md §Pattern 3 (lines ~472-528), §Phase Requirements Test Map for events (~line 1182)
    - /Users/ashleyakbar/barterkin/app/layout.tsx (current layout from Plan 02 + Plan 04 — MUST preserve font imports, metadata, Analytics, viewport)
    - /Users/ashleyakbar/barterkin/app/page.tsx (current home page from Plan 02 — add a test-event button; don't delete the Card showcase)
    - /Users/ashleyakbar/barterkin/.env.local.example (confirm NEXT_PUBLIC_POSTHOG_KEY + NEXT_PUBLIC_POSTHOG_HOST present)
  </read_first>
  <action>
  Step 1 — Install PostHog client + server:
  ```bash
  cd /Users/ashleyakbar/barterkin
  pnpm add posthog-js posthog-node
  ```

  Step 2 — Create `app/providers.tsx` (verbatim from RESEARCH Pattern 3):
  ```tsx
  'use client'

  import posthog from 'posthog-js'
  import { PostHogProvider as PHProvider } from 'posthog-js/react'
  import { useEffect } from 'react'

  export function PostHogProvider({ children }: { children: React.ReactNode }) {
    useEffect(() => {
      const key = process.env.NEXT_PUBLIC_POSTHOG_KEY
      if (!key) {
        // No-op when missing — Phase 1 preview deploys may not have POSTHOG_KEY wired yet
        // (Plan 10 sets Vercel env vars). Avoid noisy init errors in local dev.
        return
      }
      posthog.init(key, {
        api_host: process.env.NEXT_PUBLIC_POSTHOG_HOST ?? 'https://us.i.posthog.com',
        person_profiles: 'identified_only',
        capture_pageview: true,
        capture_pageleave: true,
        defaults: '2026-01-30',
      })
    }, [])

    return <PHProvider client={posthog}>{children}</PHProvider>
  }
  ```

  Step 3 — Edit `app/layout.tsx` to wrap `{children}` with `<PostHogProvider>`. Preserve all existing imports (next/font/google, Analytics), the `metadata`/`viewport` exports from Plan 04, and the `<html>`/`<body>` structure. Use the Edit tool — only insert the PostHogProvider wrap:
  ```tsx
  import { PostHogProvider } from './providers'
  // ... existing imports (Inter, Lora, Analytics)

  export default function RootLayout({ children }: { children: React.ReactNode }) {
    return (
      <html lang="en" className={`${inter.variable} ${lora.variable}`}>
        <body className="font-sans bg-sage-bg text-forest-deep min-h-screen antialiased">
          <PostHogProvider>
            {children}
          </PostHogProvider>
          <Analytics />
        </body>
      </html>
    )
  }
  ```

  Step 4 — Extend `app/page.tsx` with a 'Fire test event' button that calls `posthog.capture('test_event')`. The button must be in a client component — extract to a new file `components/fire-test-event.tsx` to keep the page itself server-friendly:

  Create `/Users/ashleyakbar/barterkin/components/fire-test-event.tsx`:
  ```tsx
  'use client'

  import { Button } from '@/components/ui/button'
  import posthog from 'posthog-js'
  import { useState } from 'react'

  export function FireTestEvent() {
    const [status, setStatus] = useState<'idle' | 'fired'>('idle')
    return (
      <Button
        variant="secondary"
        onClick={() => {
          posthog.capture('test_event', { source: 'phase-1-home-button', ts: new Date().toISOString() })
          setStatus('fired')
          setTimeout(() => setStatus('idle'), 3000)
        }}
        aria-label="Fire PostHog test_event"
      >
        {status === 'fired' ? 'Fired — check PostHog' : 'Fire test event'}
      </Button>
    )
  }
  ```

  Then edit `app/page.tsx` to import and render it inside the existing `<CardContent>` alongside the two palette buttons:
  ```tsx
  import { Button } from '@/components/ui/button'
  import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
  import { FireTestEvent } from '@/components/fire-test-event'

  export default function HomePage() {
    return (
      <main className="min-h-screen flex items-center justify-center p-6">
        <Card className="max-w-xl w-full bg-sage-pale border-forest-mid/20">
          <CardHeader>
            <CardTitle className="font-serif text-3xl text-forest-deep">Barterkin foundation</CardTitle>
            <CardDescription className="text-forest-mid">
              Phase 1 scaffold: palette + fonts + shadcn + PWA + PostHog. Auth, directory, and contact relay ship in Phases 2–5.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-wrap gap-3">
            <Button className="bg-forest hover:bg-forest-deep text-sage-bg">Sage / forest primary</Button>
            <Button variant="outline" className="border-clay text-clay hover:bg-clay/10">Clay accent</Button>
            <FireTestEvent />
          </CardContent>
        </Card>
      </main>
    )
  }
  ```

  Step 5 — Create `docs/events.md` (FOUND-10 event-schema source of truth):
  ```bash
  mkdir -p docs
  ```
  Then write:
  ```markdown
  # Analytics Events

  PostHog is the source of truth for product metrics on Barterkin. Events fired in this file MUST match the schema documented here — any drift between code and this doc is a bug.

  **Project:** PostHog project id `387571` (US host: `https://us.i.posthog.com`).
  **Firing pattern:** server-side via `posthog-node` from the Phase 5 Supabase Edge Function `send-contact`, or client-side via `posthog-js` from client components when user-context is needed.

  ## KPI event: `contact_initiated`

  The KPI of Barterkin v1. Fired from the `send-contact` Supabase Edge Function (Phase 5) after a successful platform-relayed contact send. One event = one successful first-touch relay.

  **When fired:** Edge Function validates sender eligibility → inserts `contact_requests` row → calls Resend → on Resend success → fires the event.

  **Properties (all anonymised / low-cardinality):**

  | Property | Type | Required | Description |
  |----------|------|----------|-------------|
  | `recipient_county` | string (FIPS) | yes | 5-digit Georgia FIPS county code. No county names. |
  | `recipient_category` | string (slug) | yes | One of the 10 seeded Georgia category slugs (Phase 3). |
  | `sender_tenure_days` | integer | yes | `floor((now - profiles.created_at) / 1 day)`. |
  | `$host`, `$lib` | string | auto | PostHog defaults. |

  **Source of truth:** the `public.contact_requests` row inserted by the Edge Function. Event-stream rebuildable from DB if PostHog data is ever lost.

  **Phase 1 scope:** declare schema only. No firing from the Next.js app (the Edge Function lands in Phase 5).

  ## Phase-1-only events

  | Event | Purpose | Fires from |
  |-------|---------|------------|
  | `test_event` | Validates end-to-end wiring for ROADMAP success criterion #5 ("`posthog.capture('test_event', ...)` appears in the PostHog dashboard within 60 seconds"). | `components/fire-test-event.tsx` on home-page button click. Safe to fire anytime; ignored for KPI funnels. |

  ## Future events (out of scope for Phase 1)

  | Event | Phase | Notes |
  |-------|-------|-------|
  | `signup_started` / `signup_completed` | Phase 2 | Covers AUTH-01, AUTH-02 funnels. |
  | `profile_published` | Phase 3 | Covers PROF-12 publish gate. |
  | `directory_filter_applied` | Phase 4 | DIR-03..DIR-06. Include filter dimensions but not free-text keyword. |
  | `contact_reported` / `contact_blocked` | Phase 5 | TRUST-01, TRUST-02 signals. |
  ```

  Step 6 — Typecheck:
  ```bash
  cd /Users/ashleyakbar/barterkin
  pnpm typecheck
  pnpm build   # ensures PostHog wrap survives production build under webpack
  ```
  </action>
  <acceptance_criteria>
    - `jq -r '.dependencies["posthog-js"]' /Users/ashleyakbar/barterkin/package.json` matches `^1`
    - `jq -r '.dependencies["posthog-node"]' /Users/ashleyakbar/barterkin/package.json` matches `^[34]`
    - `test -f /Users/ashleyakbar/barterkin/app/providers.tsx && head -1 /Users/ashleyakbar/barterkin/app/providers.tsx | grep -q "'use client'"`
    - `grep -q "posthog.init(" /Users/ashleyakbar/barterkin/app/providers.tsx`
    - `grep -q "capture_pageview: true" /Users/ashleyakbar/barterkin/app/providers.tsx`
    - `grep -q "<PostHogProvider>" /Users/ashleyakbar/barterkin/app/layout.tsx`
    - `test -f /Users/ashleyakbar/barterkin/components/fire-test-event.tsx && grep -q "posthog.capture('test_event'" /Users/ashleyakbar/barterkin/components/fire-test-event.tsx`
    - `grep -q "<FireTestEvent" /Users/ashleyakbar/barterkin/app/page.tsx`
    - `test -f /Users/ashleyakbar/barterkin/docs/events.md && grep -q "contact_initiated" /Users/ashleyakbar/barterkin/docs/events.md`
    - `grep -q "recipient_county" /Users/ashleyakbar/barterkin/docs/events.md`
    - `cd /Users/ashleyakbar/barterkin && pnpm typecheck && pnpm build` both exit 0
  </acceptance_criteria>
  <verify>
    <automated>cd /Users/ashleyakbar/barterkin && pnpm typecheck && pnpm build && grep -q "posthog.capture('test_event'" components/fire-test-event.tsx && grep -q "contact_initiated" docs/events.md && grep -q "<PostHogProvider>" app/layout.tsx</automated>
  </verify>
  <done>PostHog installed, provider wired, test-event button rendered on home page, event schema documented, build + typecheck green.</done>
</task>

<task type="auto" tdd="false">
  <name>Task 2: Install Resend + test-email route + README note + commit</name>
  <files>
    - /Users/ashleyakbar/barterkin/package.json
    - /Users/ashleyakbar/barterkin/pnpm-lock.yaml
    - /Users/ashleyakbar/barterkin/app/api/test-email/route.ts
    - /Users/ashleyakbar/barterkin/README.md
  </files>
  <read_first>
    - /Users/ashleyakbar/barterkin/.planning/phases/01-foundation-infrastructure/01-RESEARCH.md §Pattern 4 (lines ~532-575)
    - /Users/ashleyakbar/barterkin/README.md (Plan 01 README — add a "Verifying Phase 1 wiring" section; don't overwrite existing content)
    - /Users/ashleyakbar/barterkin/middleware.ts (matcher already excludes `api/webhooks` — confirm `api/test-email` is ALSO excluded or accept middleware runs on it; Phase 1 middleware is session-refresh only, safe either way)
  </read_first>
  <action>
  Step 1 — Install Resend:
  ```bash
  cd /Users/ashleyakbar/barterkin
  pnpm add resend
  ```

  Step 2 — Create `app/api/test-email/route.ts` (verbatim from RESEARCH Pattern 4 line 540, with an added guard for missing API key so dev without `RESEND_API_KEY` populated returns a clear error instead of a crash):
  ```ts
  import { NextResponse } from 'next/server'
  import { Resend } from 'resend'

  // Node runtime — resend SDK uses Node APIs.
  export const runtime = 'nodejs'

  // Dev-only endpoint. Phase 5 replaces this with a Supabase Edge Function
  // (send-contact) where the service-role + Resend keys live in managed secrets,
  // not the Next.js bundle.
  export async function POST(request: Request) {
    // Production guard — if this ever deploys to prod by mistake, return 404.
    if (process.env.NODE_ENV === 'production') {
      return NextResponse.json({ error: 'disabled in production' }, { status: 404 })
    }

    const apiKey = process.env.RESEND_API_KEY
    if (!apiKey) {
      return NextResponse.json(
        { error: 'RESEND_API_KEY not configured — populate .env.local' },
        { status: 500 },
      )
    }

    const body = (await request.json().catch(() => ({}))) as { to?: string }
    const to = body.to
    if (!to) {
      return NextResponse.json({ error: 'missing `to` field in body' }, { status: 400 })
    }

    const resend = new Resend(apiKey)
    const { data, error } = await resend.emails.send({
      // Mail domain confirmed 10/10 mail-tester pre-phase (CONTEXT.md).
      // A2 in RESEARCH §Assumptions Log — if the mail domain differs, edit the `from:` here.
      from: 'Barterkin <hello@barterkin.com>',
      to: [to],
      subject: 'Barterkin Phase 1 — Resend test send',
      text:
        'If you received this, Resend is correctly wired to the verified domain. ' +
        'This endpoint is disabled in production; Phase 5 replaces it with a Supabase Edge Function.',
    })

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }
    return NextResponse.json({ ok: true, id: data?.id })
  }
  ```

  Step 3 — Append a "Verifying Phase 1 wiring" section to `README.md`. Use the Edit tool to add after the "Local setup" section (do NOT overwrite):
  ```markdown
  ## Verifying Phase 1 wiring

  After `pnpm dev` is running with a populated `.env.local`:

  **PostHog** (FOUND-10 / ROADMAP success criterion #5):
  1. Visit http://localhost:3000
  2. Click "Fire test event"
  3. In https://us.posthog.com (project 387571) → Activity, confirm `test_event` appears within 60s.

  **Resend** (FOUND-04, FOUND-07):
  ```bash
  curl -X POST http://localhost:3000/api/test-email \
    -H "Content-Type: application/json" \
    -d '{"to":"your-inbox@example.com"}'
  # Expect: {"ok":true,"id":"..."}
  # Check the inbox — email arrives from hello@barterkin.com.
  ```

  The `/api/test-email` route returns 404 in production (safe to ship as-is; Phase 5 replaces it with a Supabase Edge Function).

  **Supabase Studio SMTP** (FOUND-07 — one-time manual step):
  In https://supabase.com/dashboard/project/hfdcsickergdcdvejbcw → Authentication → SMTP Settings, plug in the Resend credentials:
  - Host: `smtp.resend.com`
  - Port: `465` (SSL)
  - User: `resend`
  - Pass: your RESEND_API_KEY
  - Sender: `Barterkin <hello@barterkin.com>`

  Then click "Send test email" in Studio — confirm delivery. Full validation lands in Phase 2 with the first magic-link signup.
  ```

  Step 4 — Verify build + commit:
  ```bash
  cd /Users/ashleyakbar/barterkin
  pnpm typecheck
  pnpm build

  git add package.json pnpm-lock.yaml app/providers.tsx app/layout.tsx app/page.tsx components/fire-test-event.tsx app/api/test-email/route.ts docs/events.md README.md
  git commit -m "feat(foundation): PostHog provider + test-event button + Resend test route + event schema

- posthog-js + posthog-node installed; app/providers.tsx wraps layout (RESEARCH Pattern 3)
- Home page gains a 'Fire test event' button → ROADMAP success criterion #5 verifiable
- resend@4 installed; app/api/test-email/route.ts is Node-runtime, dev-only (NODE_ENV guard), returns 404 in prod
- docs/events.md declares contact_initiated KPI schema (Phase 5 will fire it)
- README: 'Verifying Phase 1 wiring' section with curl examples + Studio SMTP instructions

Covers FOUND-04 (Resend test path), FOUND-07 (SMTP documented), FOUND-08 (PostHog integration), FOUND-10 (event schema)."
  git push origin main
  ```
  </action>
  <acceptance_criteria>
    - `jq -r '.dependencies.resend' /Users/ashleyakbar/barterkin/package.json` matches `^4`
    - `test -f /Users/ashleyakbar/barterkin/app/api/test-email/route.ts`
    - `grep -q "export const runtime = 'nodejs'" /Users/ashleyakbar/barterkin/app/api/test-email/route.ts`
    - `grep -q "NODE_ENV === 'production'" /Users/ashleyakbar/barterkin/app/api/test-email/route.ts` (prod guard)
    - `grep -q "new Resend(apiKey)" /Users/ashleyakbar/barterkin/app/api/test-email/route.ts`
    - `grep -q "from: 'Barterkin <hello@barterkin.com>'" /Users/ashleyakbar/barterkin/app/api/test-email/route.ts`
    - `! grep -q "NEXT_PUBLIC_RESEND" /Users/ashleyakbar/barterkin/app/api/test-email/route.ts` (RESEND_API_KEY server-only)
    - `! grep -rE "process\.env\.RESEND_API_KEY" /Users/ashleyakbar/barterkin/app/providers.tsx /Users/ashleyakbar/barterkin/components/ 2>/dev/null` (Resend key NEVER in any client module)
    - `grep -q "Verifying Phase 1 wiring" /Users/ashleyakbar/barterkin/README.md`
    - `grep -q "smtp.resend.com" /Users/ashleyakbar/barterkin/README.md` (Supabase SMTP setup documented)
    - `cd /Users/ashleyakbar/barterkin && pnpm typecheck && pnpm build` both exit 0
    - `pnpm dev &` then `curl -s -X POST -H "Content-Type: application/json" -d '{}' http://localhost:3000/api/test-email` returns `{"error":"missing \`to\` field in body"}` with HTTP 400 (proves the route is reachable; no actual send happens without a `to` field)
    - `git log --oneline -1 | grep -q "PostHog provider + test-event button + Resend"`
  </acceptance_criteria>
  <verify>
    <automated>cd /Users/ashleyakbar/barterkin && pnpm typecheck && pnpm build && grep -q "export const runtime = 'nodejs'" app/api/test-email/route.ts && grep -q "NODE_ENV === 'production'" app/api/test-email/route.ts && ! grep -rE "RESEND_API_KEY" components/ app/providers.tsx 2>/dev/null</automated>
  </verify>
  <done>Resend + test route wired with production guard; README has verification + SMTP instructions; event schema committed; build green; commit on origin/main.</done>
</task>

</tasks>

<threat_model>
## Trust Boundaries

| Boundary | Description |
|----------|-------------|
| `RESEND_API_KEY` → client bundle | Must never cross — only `app/api/test-email/route.ts` (server Route Handler) reads it. |
| `NEXT_PUBLIC_POSTHOG_KEY` → client bundle | Safe by design (PostHog client SDK keys are public-by-design; write key vs API-Key distinction enforced by PostHog). |
| `POST /api/test-email` → outside world | Production guard returns 404; dev-only endpoint. |
| `/api/test-email` without rate limits | Accepted for Phase 1 dev scope; Phase 5 replaces with Edge Function + rate limits. |

## STRIDE Threat Register

| Threat ID | Category | Component | Disposition | Mitigation Plan |
|-----------|----------|-----------|-------------|-----------------|
| T-05-01 | Information Disclosure | RESEND_API_KEY leaking into client bundle | mitigate | Route handler is server-only by Next.js convention (`app/api/*/route.ts` never ships to browser); env var has NO `NEXT_PUBLIC_` prefix; acceptance criterion greps `components/` + `app/providers.tsx` to confirm absence |
| T-05-02 | Elevation of Privilege | Production deploy accidentally exposes `/api/test-email` as an open relay | mitigate | First statement in the handler is `if (NODE_ENV === 'production') return 404`; Vercel deploy sets NODE_ENV=production automatically |
| T-05-03 | Denial of Service | `/api/test-email` used to spam the Resend account free-tier quota (100/day) from dev | accept (Phase 1) | Endpoint requires an explicit `to:` body field — abusers need to know it exists; Plan 08 gitleaks CI watches for `re_`-prefixed key leaks. Phase 5 Edge Function replaces with rate-limited version. |
| T-05-04 | Spoofing | Arbitrary `to:` address used to send spam appearing to come from barterkin.com | accept (Phase 1) | Dev-only — NODE_ENV guard. If the dev-team shares the endpoint publicly, worst case is burning 100 daily Resend sends. Phase 5 Edge Function validates `to:` against `profiles` and enforces per-sender quotas. |
| T-05-05 | Information Disclosure | PostHog `test_event` payload leaking PII | mitigate | Payload is `{ source: 'phase-1-home-button', ts }` — no user identifier; `person_profiles: 'identified_only'` in PostHog init prevents anonymous-visitor identity writes |
| T-05-06 | Tampering | PostHog capture_pageview inflating page-view counts on preview deploys | accept | Preview deploys use the same PostHog project (per RESEARCH env-var table); skew is acceptable for a pre-launch dev project and filterable by `$host` in PostHog dashboards |
</threat_model>

<verification>
Plan 05 is complete when:
1. `posthog-js`, `posthog-node`, `resend` all installed
2. `app/providers.tsx` client provider exists; `app/layout.tsx` wraps children with it
3. 'Fire test event' button on home page fires `test_event` to PostHog
4. `POST /api/test-email` is Node runtime, production-guarded, and requires a `to:` body field
5. `docs/events.md` declares `contact_initiated` schema
6. No client file references `RESEND_API_KEY`
7. `pnpm build` + `pnpm typecheck` exit 0
8. Commit on `origin/main`
</verification>

<success_criteria>
- FOUND-04 satisfied (Resend plumbing exists; pre-phase DNS work remains validated via mail-tester)
- FOUND-07 satisfied (Resend SDK wired; Studio SMTP documented in README for the manual step)
- FOUND-08 satisfied (PostHog integrated with posthog-js + posthog-node)
- FOUND-10 satisfied (event schema declared in docs/events.md)
- ROADMAP success criterion #5 testable end-to-end: home-page button → PostHog dashboard
</success_criteria>

<output>
After completion, create `/Users/ashleyakbar/barterkin/.planning/phases/01-foundation-infrastructure/01-05-SUMMARY.md`. Capture the exact installed versions of posthog-js, posthog-node, and resend, plus the commit SHA. Flag that Supabase Studio SMTP config is a manual step the developer must perform once (README documents the exact fields).
</output>
