---
phase: 02-authentication-legal
plan: 03a
subsystem: auth-ui
tags: [auth, components, turnstile, react-hook-form, zod, google-oauth, logout, server-component]

requires:
  - plan: 02-01
    provides: "@marsidev/react-turnstile installed, shadcn Form/Alert/Separator primitives, A4 probe resolved"
  - plan: 02-02
    provides: "sendMagicLink server action + SendMagicLinkResult type, /auth/signout route handler"
provides:
  - "app/globals.css Phase 2 brand override (clay primary/ring/muted-foreground)"
  - "TurnstileWidget — reusable Cloudflare Turnstile wrapper with onVerify/onExpire/onError callbacks"
  - "GoogleButton — AUTH-01 OAuth CTA disabled until captchaToken present"
  - "GoogleAuthBlock — AUTH-01+08 self-contained unit (GoogleButton + own Turnstile state)"
  - "LoginForm — AUTH-02 RHF+Zod+Turnstile form wired to sendMagicLink via useActionState"
  - "LogoutButton — AUTH-05 server component POST form to /auth/signout"
  - "ResendLinkButton — AUTH-04 UX: routes back to /login?email=<prefill>"
affects:
  - "02-03b-pages (consumes all six components + brand override)"
  - "02-04-tests-verify (fills E2E stubs for AUTH-01, AUTH-02, AUTH-05, AUTH-08)"

tech-stack:
  added: []
  patterns:
    - "captchaToken in signInWithOAuth: use Object.assign workaround — @supabase/auth-js@2.103.3 types omit this field but runtime supports it"
    - "useActionState(serverAction, null) for React 19 server action binding in client forms"
    - "Server component logout: plain <form method=POST> — no JS, no CSRF token needed (same-origin idempotent)"
    - "ResendLinkButton routes to /login?email=<prefill>; LoginForm useEffect reads it — avoids double Turnstile on /verify-pending"
    - "GoogleAuthBlock owns its own Turnstile state so OAuth path and magic-link path have independent CAPTCHA widgets"

key-files:
  created:
    - "components/auth/TurnstileWidget.tsx — 'use client'; exports TurnstileWidget; wraps @marsidev/react-turnstile"
    - "components/auth/GoogleButton.tsx — 'use client'; exports GoogleButton; signInWithOAuth + captchaToken gate"
    - "components/auth/GoogleAuthBlock.tsx — 'use client'; exports GoogleAuthBlock; owns Turnstile state for OAuth path"
    - "components/auth/LoginForm.tsx — 'use client'; exports LoginForm; RHF+Zod+useActionState wired to sendMagicLink"
    - "components/auth/LogoutButton.tsx — SERVER component (no use client); exports LogoutButton; POST form"
    - "components/auth/ResendLinkButton.tsx — 'use client'; exports ResendLinkButton; asChild <a> to /login?email="
  modified:
    - "app/globals.css — Phase 2 brand override appended to existing @theme inline block"

decisions:
  - "captchaToken in signInWithOAuth typed via Object.assign — @supabase/auth-js@2.103.3 SignInWithOAuthCredentials.options does not include captchaToken in TS types (runtime supports it). Object.assign avoids no-explicit-any lint while keeping the ESLint config clean."
  - "LogoutButton is a server component — no state/effects needed; plain HTML form handles the submit without JS; matches THREAT T-2-05 (POST-only same-origin idempotent logout is safe)"
  - "ResendLinkButton uses route-back-to-login pattern (not inline Turnstile) — avoids double-rendering Turnstile on /verify-pending; LoginForm useEffect already handles ?email= prefill"

metrics:
  duration: 463s
  completed: 2026-04-19T20:21:32Z
  tasks_completed: 5
  files_created: 6
  files_modified: 1
---

# Phase 2 Plan 03a: auth-components Summary

**One-liner:** Six auth UI components (TurnstileWidget, GoogleButton, GoogleAuthBlock, LoginForm, LogoutButton, ResendLinkButton) plus the `app/globals.css` brand override that makes `<Button>` render clay-on-sage automatically across all auth surfaces.

## Tasks Completed

| Task | Name | Commit | Files |
|------|------|--------|-------|
| 3a.1 | Extend globals.css with Phase 2 brand overrides | ddb6097 | app/globals.css |
| 3a.2 | TurnstileWidget.tsx — CAPTCHA widget wrapper | e11abc5 | components/auth/TurnstileWidget.tsx |
| 3a.3 | GoogleButton.tsx + GoogleAuthBlock.tsx | 355d20d, ebf445c | components/auth/GoogleButton.tsx, GoogleAuthBlock.tsx |
| 3a.4 | LoginForm.tsx — RHF + Zod + Turnstile magic-link form | 5352276 | components/auth/LoginForm.tsx |
| 3a.5 | LogoutButton.tsx + ResendLinkButton.tsx | 25bd911 | components/auth/LogoutButton.tsx, ResendLinkButton.tsx |

## Component Inventory

| File | Boundary | Exports | Notes |
|------|----------|---------|-------|
| `components/auth/TurnstileWidget.tsx` | Client | `TurnstileWidget` | Wraps @marsidev/react-turnstile; callback-only API (dumb widget) |
| `components/auth/GoogleButton.tsx` | Client | `GoogleButton` | signInWithOAuth + captchaToken gate; disabled until token present |
| `components/auth/GoogleAuthBlock.tsx` | Client | `GoogleAuthBlock` | Owns Turnstile state; passes token down to GoogleButton |
| `components/auth/LoginForm.tsx` | Client | `LoginForm` | RHF+Zod+useActionState; cf-turnstile-response hidden input |
| `components/auth/LogoutButton.tsx` | **Server** | `LogoutButton` | Plain HTML `<form method="POST">` — no JS required |
| `components/auth/ResendLinkButton.tsx` | Client | `ResendLinkButton` | Routes to /login?email=<prefill> via asChild <a> |

## Brand Override Note

The Phase 2 brand override in `app/globals.css` extends the existing `@theme inline` block with:
- `--color-primary: var(--color-clay)` — makes `<Button>` default variant render clay background
- `--color-primary-foreground: var(--color-sage-bg)` — sage text on clay buttons
- `--color-ring: var(--color-clay)` — clay focus rings on all interactive elements
- `--color-muted-foreground: var(--color-forest-mid)` — muted text in forest-mid green

The Phase 1 fire-test-event button (uses `<Button>` default variant) now renders clay-on-sage — the brand override propagated automatically without touching `app/page.tsx`. Phase 1 surfaces verified: `.dark` block untouched, `:root` stone defaults untouched.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] captchaToken missing from signInWithOAuth TypeScript types**
- **Found during:** Task 3a.3 (pnpm typecheck after creating GoogleButton.tsx)
- **Issue:** `@supabase/auth-js@2.103.3` `SignInWithOAuthCredentials.options` does not include `captchaToken` in its TypeScript type definition. The plan's exact code caused a `TS2353: Object literal may only specify known properties` error.
- **Fix:** Used `Object.assign(oauthOptions, { captchaToken })` to inject the runtime-supported field without triggering `@typescript-eslint/no-explicit-any` lint error. captchaToken is still passed at runtime (Supabase Auth server verifies it). When `@supabase/auth-js` types are updated to include `captchaToken` in OAuth options, `Object.assign` workaround can be removed.
- **Files modified:** `components/auth/GoogleButton.tsx`
- **Commit:** ebf445c

## Known Stubs

None — all six components are fully implemented. Plan 02-03b consumes them to assemble page surfaces.

## UI-SPEC Copy Adjustments

Zero adjustments. All locked strings preserved verbatim:
- "Continue with Google" — GoogleButton
- "Protected by Cloudflare Turnstile. [Privacy] · [Terms]" — TurnstileWidget
- "Send magic link" / "Sending…" — LoginForm submit button
- "Check your email" — LoginForm success heading
- "Resend verification link" — ResendLinkButton
- "Log out" / `aria-label="Log out of Barterkin"` — LogoutButton

## Threat Surface Scan

No new network endpoints introduced. All trust boundaries are within the plan's threat register:
- T-2-01: redirectTo hardcoded to `${window.location.origin}/auth/callback?next=/directory` — enforced in GoogleButton
- T-2-02: TurnstileWidget emits token once per render; widget auto-refreshes after expiry — enforced in TurnstileWidget callbacks
- T-2-05: LogoutButton uses POST-only same-origin form — no CSRF token needed; enforced by server component pattern

## Self-Check: PASSED
