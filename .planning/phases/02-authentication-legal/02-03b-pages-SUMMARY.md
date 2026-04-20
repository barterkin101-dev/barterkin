---
phase: 02-authentication-legal
plan: "03b"
name: pages
subsystem: auth-ui
tags: [auth, legal, footer, next-app-router, server-components, geo-04, shadcn]

dependency_graph:
  requires:
    - "02-01: npm packages (react-hook-form, zod, shadcn Form/Alert/Separator installed)"
    - "02-02: server-side auth plumbing (createClient, getClaims, middleware gating)"
    - "02-03a: auth components (GoogleAuthBlock, LoginForm, LogoutButton, ResendLinkButton) — parallel wave, stubs used for build"
  provides:
    - "app/(auth)/layout.tsx — centered-card layout for /login and /signup"
    - "app/(auth)/login/page.tsx — login surface wiring GoogleAuthBlock + LoginForm"
    - "app/(auth)/signup/page.tsx — signup surface (identical structure, different copy)"
    - "app/verify-pending/page.tsx — AUTH-04 email-verify UX gate page"
    - "app/legal/tos/page.tsx — Terms of Service with GEO-04 locked clause verbatim"
    - "app/legal/privacy/page.tsx — Privacy Policy with UI-SPEC-locked sections"
    - "app/legal/guidelines/page.tsx — Community Guidelines with UI-SPEC-locked sections"
    - "components/layout/Footer.tsx — site-wide async server component (getClaims, legal links, LogoutButton)"
  affects:
    - "app/layout.tsx — Footer wired as last child inside PostHogProvider"
    - "02-04-tests-verify — Wave 3 E2E tests fill stubs against these pages"
    - "Phase 3 (profile/georgia-gate) — Footer will show authenticated user data"

tech-stack:
  added: []
  patterns:
    - "async server component reading getClaims() for auth state (Footer, verify-pending)"
    - "(auth) route group layout — thin wrapper, no html/body, Metadata title template"
    - "Static prose pages with max-w-2xl article scaffold + Lora H1/H2 + Inter body"
    - "GEO-04 locked copy pattern — comment-flagged verbatim string in tos/page.tsx"
    - "Stub component pattern for parallel-wave worktree builds (02-03a components)"

key-files:
  created:
    - "app/(auth)/layout.tsx — centered-card layout (min-h-screen flex items-center justify-center)"
    - "app/(auth)/login/page.tsx — login page: Welcome to Barterkin, GoogleAuthBlock, Separator, LoginForm, legal microcopy"
    - "app/(auth)/signup/page.tsx — signup page: identical structure, Create an account to join copy"
    - "app/verify-pending/page.tsx — One more step / Verify your email to join the directory, getClaims email"
    - "app/legal/tos/page.tsx — 11 sections, GEO-04 locked clause in section 3"
    - "app/legal/privacy/page.tsx — 10 sections, we never sell your data"
    - "app/legal/guidelines/page.tsx — 8 sections, Trade skills not goods or cash"
    - "components/layout/Footer.tsx — async Footer, getClaims, 3-col grid, LogoutButton for authed"
    - "components/auth/GoogleAuthBlock.tsx — stub (02-03a parallel)"
    - "components/auth/LoginForm.tsx — stub (02-03a parallel)"
    - "components/auth/LogoutButton.tsx — stub (02-03a parallel)"
    - "components/auth/ResendLinkButton.tsx — stub (02-03a parallel)"
  modified:
    - "app/layout.tsx — added Footer import + render inside PostHogProvider before Analytics"

key-decisions:
  - "Stub components for parallel-wave 02-03a: created minimal stubs (export function X() { return null }) so typecheck and build pass in the worktree without 02-03a's real implementations. These will be replaced by the merge."
  - "Footer placed inside PostHogProvider (not outside): keeps Footer render inside the provider context boundary. Analytics remains last child of body per Phase 1 convention."
  - "verify-pending uses getClaims() directly on server to read email from JWT claims — no round-trip to Auth server, no user_metadata trust (T-2-08 compliance)."
  - "Legal pages are static (no getClaims) but become dynamic once Footer is wired via root layout — acceptable tradeoff; legal pages are short and cheap to server-render."

metrics:
  duration: ~8min
  completed: 2026-04-19
  tasks_completed: 4
  files_created: 12
  files_modified: 1
---

# Phase 2 Plan 03b: pages Summary

**One-liner:** Auth route group, login/signup pages, verify-pending gate, three legal prose pages (ToS with GEO-04 locked clause), and site-wide Footer async server component wired into root layout.

## Tasks Completed

| Task | Name | Commit | Key Files |
|------|------|--------|-----------|
| 3b.1 | auth route group layout + login + signup pages | 9747e98 | app/(auth)/layout.tsx, app/(auth)/login/page.tsx, app/(auth)/signup/page.tsx + 4 stubs |
| 3b.2 | verify-pending page — AUTH-04 UX gate | 001232e | app/verify-pending/page.tsx |
| 3b.3 | Three legal pages (ToS GEO-04, Privacy, Guidelines) | d744d49 | app/legal/{tos,privacy,guidelines}/page.tsx |
| 3b.4 | Footer component + wire into root layout | 3a6a706 | components/layout/Footer.tsx, app/layout.tsx |

## Accomplishments

- Created `app/(auth)/layout.tsx` — thin centered-card wrapper; does NOT emit `<html>`/`<body>` (Next.js nesting rule)
- Created `/login` page with exact UI-SPEC-locked copy: "Welcome to Barterkin", "Sign in to find and offer skills in your Georgia community.", cross-link to `/signup`, legal microcopy linking all three legal pages
- Created `/signup` page with structurally identical layout, different copy: "Create an account to join the Georgia skills-barter directory.", cross-link to `/login`
- Created `/verify-pending` as an async server component that reads `getClaims()` for the user's email, passes it to `ResendLinkButton` and displays locked copy: "One more step" (H1), "Verify your email to join the directory" (H2), "this keeps Barterkin a real-community space and protects members from bots and duplicate accounts"
- Created `/legal/tos` with GEO-04 locked clause verbatim in Section 3: "Barterkin is intended for people who live in Georgia, USA. We operate on an honor system…"
- Created `/legal/privacy` with 10 UI-SPEC sections including locked lead "we never sell your data"
- Created `/legal/guidelines` with 8 UI-SPEC sections including "Trade skills, not goods or cash"
- Created `Footer` async server component — 3-column grid, legal nav links, conditional auth state via `getClaims()`, `LogoutButton` for authed users, "Sign in" link for unauthed
- Wired Footer into `app/layout.tsx` as last child of PostHogProvider; `<Analytics />` stays as last child of `<body>`
- `pnpm typecheck && pnpm build` both pass

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Missing stubs] Created stub components for 02-03a parallel components**
- **Found during:** Task 3b.1 (typecheck fails without component files)
- **Issue:** 02-03a (GoogleAuthBlock, LoginForm, LogoutButton, ResendLinkButton) runs in parallel worktree; files don't exist in this worktree at execution time
- **Fix:** Created minimal stub exports (`export function X() { return null }`) so TypeScript resolves imports and build passes. Stubs will be replaced by real implementations after wave merge.
- **Files modified:** components/auth/{GoogleAuthBlock,LoginForm,LogoutButton,ResendLinkButton}.tsx
- **Commit:** 9747e98

**2. [Observation] 02-03a agent wrote real implementations into /Users/ashleyakbar/barterkin (main repo)**
- **Found during:** Task 3b.1 execution — system reminders showed 02-03a modifying GoogleAuthBlock.tsx, LoginForm.tsx, LogoutButton.tsx, ResendLinkButton.tsx with real implementations in the main repo path
- **No action needed:** This is the parallel agent operating in its own worktree context. The stubs in this worktree will be replaced by the merge orchestrator.
- **Note:** Working directory confusion initially — clarified that this agent must write to `/Users/ashleyakbar/barterkin/.claude/worktrees/agent-a0af5148/`, not to `/Users/ashleyakbar/barterkin/`

**3. [Rule 2 - Security comment] Added T-2-08 compliance comment to Footer.tsx**
- **Found during:** Task 3b.4 review of STRIDE threat register
- **Issue:** T-2-08 requires that Footer uses `claims.sub` only for authed check, never `user_metadata`
- **Fix:** Added explicit JSDoc comment documenting T-2-08 compliance. Implementation correctly reads `claims.sub` (not `user_metadata`) and `claims.email` only for display (not trust decisions).
- **Commit:** 3a6a706

## Known Stubs

The four `components/auth/` files are intentional stubs for parallel-wave compatibility:

| File | Stub | Resolved by |
|------|------|-------------|
| `components/auth/GoogleAuthBlock.tsx` | `export function GoogleAuthBlock() { return null }` | Merge of 02-03a worktree |
| `components/auth/LoginForm.tsx` | `export function LoginForm() { return null }` | Merge of 02-03a worktree |
| `components/auth/LogoutButton.tsx` | `export function LogoutButton() { return null }` | Merge of 02-03a worktree |
| `components/auth/ResendLinkButton.tsx` | `export function ResendLinkButton({ email }) { return null }` | Merge of 02-03a worktree |

These stubs prevent the plan's goal from being blocked — the page files are correct, the components will be wired after merge. The stubs do not represent missing functionality in the final merged codebase.

## UI-SPEC Copy Verification

All locked strings preserved exactly as specified in `02-UI-SPEC.md`:

| String | File | Status |
|--------|------|--------|
| "Welcome to Barterkin" | login/page.tsx, signup/page.tsx | VERBATIM |
| "Sign in to find and offer skills in your Georgia community." | login/page.tsx | VERBATIM |
| "Create an account to join the Georgia skills-barter directory." | signup/page.tsx | VERBATIM |
| "One more step" | verify-pending/page.tsx | VERBATIM |
| "Verify your email to join the directory" | verify-pending/page.tsx | VERBATIM |
| "this keeps Barterkin a real-community space and protects members from bots and duplicate accounts" | verify-pending/page.tsx | VERBATIM |
| "Still stuck?" | verify-pending/page.tsx | VERBATIM |
| GEO-04 clause (full) | legal/tos/page.tsx Section 3 | VERBATIM |
| "we never sell your data" | legal/privacy/page.tsx | VERBATIM |
| "Trade skills, not goods or cash" | legal/guidelines/page.tsx | VERBATIM |
| "© 2026 Barterkin · A Georgia community skills directory" | Footer.tsx | VERBATIM |

Zero locked strings modified.

## Threat Surface Scan

No new unplanned network endpoints or auth paths introduced.

| Flag | File | Description |
|------|------|-------------|
| getClaims in Footer | components/layout/Footer.tsx | Footer reads JWKS-verified claims for isAuthed check. Only `claims.sub` used for boolean check; `claims.email` used for display only (not trust). T-2-08 compliant. |

The Footer's `getClaims()` call was pre-planned in the threat model (T-2-08 covers it). No new unregistered threat surfaces.

## Verification Results

Post-plan verification passed:

- All 8 target files exist
- `pnpm typecheck` — PASS (0 errors)
- `pnpm build` — PASS (17 routes, all expected)
- `app/(auth)/layout.tsx` — no `<html>` or `<body>` tags
- All UI-SPEC-locked copy strings verified verbatim
- Footer uses `getClaims()` only (no `getSession` calls in non-comment code)
- `app/layout.tsx` contains `<Footer />` and `<Analytics />` (both preserved)
- No `getSession` calls in any page file created by this plan

## Self-Check: PASSED

Files exist:
- `/Users/ashleyakbar/barterkin/.claude/worktrees/agent-a0af5148/app/(auth)/layout.tsx` — FOUND
- `/Users/ashleyakbar/barterkin/.claude/worktrees/agent-a0af5148/app/(auth)/login/page.tsx` — FOUND
- `/Users/ashleyakbar/barterkin/.claude/worktrees/agent-a0af5148/app/(auth)/signup/page.tsx` — FOUND
- `/Users/ashleyakbar/barterkin/.claude/worktrees/agent-a0af5148/app/verify-pending/page.tsx` — FOUND
- `/Users/ashleyakbar/barterkin/.claude/worktrees/agent-a0af5148/app/legal/tos/page.tsx` — FOUND
- `/Users/ashleyakbar/barterkin/.claude/worktrees/agent-a0af5148/app/legal/privacy/page.tsx` — FOUND
- `/Users/ashleyakbar/barterkin/.claude/worktrees/agent-a0af5148/app/legal/guidelines/page.tsx` — FOUND
- `/Users/ashleyakbar/barterkin/.claude/worktrees/agent-a0af5148/components/layout/Footer.tsx` — FOUND

Commits exist:
- 9747e98 — FOUND (feat: auth route group layout, login page, signup page)
- 001232e — FOUND (feat: verify-pending page)
- d744d49 — FOUND (feat: three legal pages)
- 3a6a706 — FOUND (feat: site-wide Footer + wire into root layout)
