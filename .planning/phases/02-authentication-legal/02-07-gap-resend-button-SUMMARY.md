---
phase: 02-authentication-legal
plan: "07"
subsystem: auth-ux
tags: [gap-fix, uat, resend-button, next-link, e2e]
dependency_graph:
  requires: [02-03a-auth-components, 02-03b-pages]
  provides: [functional-resend-button, uat-gap-3-fix]
  affects: [verify-pending-page, login-prefill-flow]
tech_stack:
  added: []
  patterns: [next/link-under-button-asChild, null-vs-placeholder-separation]
key_files:
  created:
    - tests/e2e/resend-link-button.spec.ts
  modified:
    - components/auth/ResendLinkButton.tsx
    - app/verify-pending/page.tsx
decisions:
  - "Use null (not 'your inbox') as the no-email sentinel passed to ResendLinkButton — keeps URL-generation logic clean and avoids placeholder leaking into query params"
  - "Switch from raw <a> to next/link under Button asChild — guarantees Next.js router navigation fires in all browser contexts (raw <a> in Slot.Root can silently fail)"
  - "Treat 'your inbox' string explicitly as a non-email in hasRealEmail guard — defensive against future callers passing the placeholder accidentally"
metrics:
  duration: "~8 minutes"
  completed: "2026-04-20T02:15:00Z"
  tasks_completed: 3
  files_changed: 3
---

# Phase 02 Plan 07: Gap Fix — Resend Verification Link Button Summary

**One-liner:** Fixed UAT Gap 3 — ResendLinkButton now navigates reliably to `/login` (with email prefilled when known, bare `/login` when not) by switching to `next/link` and separating `realEmail` from `displayEmail` in `verify-pending`.

---

## What Was Done

### Task 1 — ResendLinkButton.tsx: widen prop + use next/link (commit `0e4b3e5`)

**Diff summary:**

| Change | Before | After |
|--------|--------|-------|
| Prop type | `{ email: string }` | `{ email?: string \| null }` |
| Link element | `<a href={resendHref}>` | `<Link href={resendHref}>` (next/link) |
| Href logic | Always `/login?email=<encoded>` | `/login?email=<encoded>` only when real email; `/login` otherwise |
| Guard | None | `hasRealEmail` check: rejects null/undefined/empty/`'your inbox'` |

Two failure modes prevented:
1. **Empty param** — `null` or `undefined` email → no `?email=` param appended at all
2. **Placeholder leaking** — `'your inbox'` literal explicitly rejected by the `hasRealEmail` guard — never becomes `?email=your%20inbox`

The `next/link` switch fixes the original "button does nothing" symptom: `<a href>` inside `Slot.Root` (shadcn `asChild`) can silently fail to navigate in some browser contexts because Radix's Slot forwarding may not pick up the `href` as a navigation intent. `next/link` renders a proper `<a>` that the Next.js router owns.

### Task 2 — app/verify-pending/page.tsx: split realEmail vs displayEmail (commit `d25b916`)

**Diff summary:**

```diff
- const email = (data?.claims?.email as string | undefined) ?? 'your inbox'
+ const realEmail = (data?.claims?.email as string | undefined) ?? null
+ const displayEmail = realEmail ?? 'your inbox'
```

```diff
- We sent a verification link to {email}.
+ We sent a verification link to {displayEmail}.
```

```diff
- <ResendLinkButton email={email} />
+ <ResendLinkButton email={realEmail} />
```

Result:
- Visible copy: still shows `"We sent a verification link to your inbox"` when user is not signed in (UX preserved)
- Button prop: receives `null` when no session → button navigates to bare `/login`
- `'your inbox' ?? null` count is exactly 1 (only `displayEmail` uses the placeholder)

### Task 3 — tests/e2e/resend-link-button.spec.ts: Playwright E2E coverage (commit `f8456cd`)

Two tests covering the actual broken UAT case:

1. **`unauthed visitor: button navigates to /login (no empty ?email= param)`**
   - Visits `/verify-pending` without a session
   - Asserts `href` attribute is exactly `'/login'` (not `'/login?email='`, not `'/login?email=your%20inbox'`)
   - Clicks button, asserts navigation to `/login`
   - Asserts email input value is `''` (no garbage prefill)

2. **`button is rendered as a real navigable link, not a non-functional button`**
   - Asserts the rendered element tag is `'a'` (not `'button'`)
   - Guards against the root cause of UAT Gap 3 recurring

Both tests: **2 passed (1.8s)**

---

## Deviations from Plan

### Pre-existing TypeScript errors (out of scope)

**Found during:** Task 1 verification (`pnpm typecheck`)

**Issue:** `app/(auth)/login/page.tsx` and `app/(auth)/signup/page.tsx` call `<LoginForm />` and `<GoogleAuthBlock />` without the required `captchaToken` prop. These components had `captchaToken: string | null` added as required props in plans 02-05/02-06, but the page-level Turnstile state wiring was not yet propagated to the page components.

**Action:** Logged to `deferred-items.md` — out of scope for this plan (not caused by plan 02-07 changes). Plan 02-07's two modified files (`ResendLinkButton.tsx`, `verify-pending/page.tsx`) both typecheck cleanly in isolation.

**Files logged:** `.planning/phases/02-authentication-legal/deferred-items.md`

---

## Re-tested UAT Items

| UAT Item | Before | After |
|----------|--------|-------|
| Test 4: Verify-pending page renders + Resend button works | `result: issue` (button dead) | `result: pass` (navigates to /login) |

---

## Known Stubs

None — the ResendLinkButton is fully functional; navigation target is real and tested.

---

## Threat Flags

None — no new network endpoints, auth paths, or trust boundary changes introduced.

---

## Self-Check: PASSED

| Check | Result |
|-------|--------|
| `components/auth/ResendLinkButton.tsx` exists | FOUND |
| `app/verify-pending/page.tsx` exists | FOUND |
| `tests/e2e/resend-link-button.spec.ts` exists | FOUND |
| `02-07-gap-resend-button-SUMMARY.md` exists | FOUND |
| Commit `0e4b3e5` (Task 1) | FOUND |
| Commit `d25b916` (Task 2) | FOUND |
| Commit `f8456cd` (Task 3) | FOUND |
| E2E tests | 2 passed |
