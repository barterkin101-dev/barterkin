---
phase: 02-authentication-legal
plan: 05
subsystem: auth-ui
tags: [captcha, turnstile, uat-gap, client-component, single-widget]
dependency_graph:
  requires: [02-03a-auth-components, 02-03b-pages]
  provides: [single-turnstile-per-auth-page]
  affects: [app/(auth)/login, app/(auth)/signup, components/auth/GoogleAuthBlock, components/auth/LoginForm]
tech_stack:
  added: []
  patterns: [page-level-state-lift, server-component-metadata-client-component-state]
key_files:
  created:
    - app/(auth)/login/LoginAuthCard.tsx
    - tests/e2e/single-turnstile.spec.ts
  modified:
    - components/auth/GoogleAuthBlock.tsx
    - components/auth/LoginForm.tsx
    - app/(auth)/login/page.tsx
    - app/(auth)/signup/page.tsx
decisions:
  - LoginAuthCard colocated at app/(auth)/login/ as a shared client component to avoid duplicating state logic in each page while keeping server-component metadata exports on both page files
  - Playwright test uses div#cf-turnstile selector (the container @marsidev/react-turnstile renders) instead of the iframe src — because in headless test environments the Cloudflare iframe does not load but the container div is always present
metrics:
  duration: 18min
  completed: "2026-04-20T02:18:38Z"
  tasks_completed: 3
  files_changed: 6
---

# Phase 02 Plan 05: gap-turnstile Summary

**One-liner:** Lifted captchaToken state to page-level LoginAuthCard client component so a single Turnstile widget gates both Google OAuth and magic-link auth on /login and /signup.

## What Was Built

UAT Gap 1 fix: two Cloudflare Turnstile CAPTCHA widgets were rendering simultaneously on `/login` and `/signup` because both `GoogleAuthBlock` and `LoginForm` each instantiated their own `TurnstileWidget` with independent local state.

### Fix: State Lift to Page-Level

**Pattern used:** Keep `page.tsx` as a server component (preserves `export const metadata`) and introduce a thin `LoginAuthCard` client component that owns `captchaToken` state and renders the single `TurnstileWidget`.

### Files Modified — Before/After Widget Count

| File | Before (TurnstileWidget renders) | After |
|------|----------------------------------|-------|
| `components/auth/GoogleAuthBlock.tsx` | 1 (internal) | 0 |
| `components/auth/LoginForm.tsx` | 1 (internal) | 0 |
| `app/(auth)/login/LoginAuthCard.tsx` | (new) | 1 (the single widget) |
| `app/(auth)/login/page.tsx` | 0 (server component shell) | 0 |
| `app/(auth)/signup/page.tsx` | 0 (server component shell) | 0 |
| **Total per page** | **2** | **1** |

### New File: app/(auth)/login/LoginAuthCard.tsx

Client component (`'use client'`) that:
- Owns `captchaToken: string | null` state via `useState`
- Renders `<GoogleAuthBlock captchaToken={captchaToken} />`
- Renders `<LoginForm captchaToken={captchaToken} />`
- Renders exactly one `<TurnstileWidget onVerify onExpire onError />`
- Used by both `/login` and `/signup` pages (signup imports from `../login/LoginAuthCard`)

**Rationale for colocated client wrapper:** Next.js App Router forbids `export const metadata` in client components. Keeping `page.tsx` as a server component preserves metadata SEO exports. The state management lives in the colocated `LoginAuthCard.tsx` wrapper which is safe to be a client component.

### Playwright Spec: tests/e2e/single-turnstile.spec.ts

Two tests:
- `/login renders exactly one Turnstile container` — passes
- `/signup renders exactly one Turnstile container` — passes

**Selector note:** The test uses `div#cf-turnstile` (the container `@marsidev/react-turnstile` renders) rather than `iframe[src*="challenges.cloudflare.com"]` — in headless test environments the Cloudflare challenge iframe does not load (no external network), but the container div is always rendered.

### Re-tested UAT Items

- **UAT Test 2** (single Turnstile on /login): now passes — exactly one `div#cf-turnstile` present
- **UAT Test 3** (single Turnstile on /signup): now passes — exactly one `div#cf-turnstile` present

## Commits

| Task | Commit | Description |
|------|--------|-------------|
| Task 1 | `afe9f74` | refactor: strip internal Turnstile from GoogleAuthBlock and LoginForm |
| Task 2 | `2308268` | feat: add page-level Turnstile owner; single shared CAPTCHA gates both auth paths |
| Task 3 | `5464dde` | test: add Playwright spec asserting single Turnstile widget per auth page |

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Playwright test selector adjusted for headless environment**
- **Found during:** Task 3
- **Issue:** Plan's test template used `iframe[src*="challenges.cloudflare.com"]` as the detection selector. In headless Playwright runs without Cloudflare network access, the iframe never loads — widgetCount was `0` instead of `1`.
- **Fix:** Changed selector to `div#cf-turnstile` (the outer container rendered by `@marsidev/react-turnstile` unconditionally). This is present as soon as React hydrates the component, regardless of Cloudflare network availability.
- **Files modified:** `tests/e2e/single-turnstile.spec.ts`
- **Commit:** `5464dde`

## Verification

- `grep -c "TurnstileWidget" components/auth/GoogleAuthBlock.tsx` → `0` ✓
- `grep -c "TurnstileWidget" components/auth/LoginForm.tsx` → `0` ✓
- `grep -c "<TurnstileWidget" app/(auth)/login/LoginAuthCard.tsx` → `1` ✓
- `pnpm typecheck` → exit 0 ✓
- `pnpm build` → exit 0 ✓
- `pnpm playwright test tests/e2e/single-turnstile.spec.ts` → 2 passed ✓

## Known Stubs

None — all Turnstile state is fully wired. The `mode` prop on `LoginAuthCard` is intentionally presentational (reserved for future copy variants); both login and signup render the same auth composition.

## Threat Flags

None — no new network endpoints, auth paths, or trust-boundary changes introduced. This plan only reorganizes existing client-side component composition.

## Self-Check: PASSED

- `app/(auth)/login/LoginAuthCard.tsx` — exists ✓
- `tests/e2e/single-turnstile.spec.ts` — exists ✓
- Commit `afe9f74` — exists ✓
- Commit `2308268` — exists ✓
- Commit `5464dde` — exists ✓
