---
phase: 03-profile-georgia-gate
plan: "05"
subsystem: [ui, profile-view, publish-toggle, rls]
tags: [shadcn, server-component, client-component, publish-toggle, rls, playwright]

# Dependency graph
requires:
  - phase: 03-profile-georgia-gate
    plan: "02"
    provides: "public.profiles RLS, skills_offered/skills_wanted tables, counties, categories"
  - phase: 03-profile-georgia-gate
    plan: "03"
    provides: "saveProfile, setPublished, ProfileWithRelations, SetPublishedResult"
  - phase: 03-profile-georgia-gate
    plan: "04"
    provides: "ProfileCompletenessChecklist, ProfileEditForm, (app) layout, Avatar/Badge/Switch/Tooltip shadcn blocks"

provides:
  - /profile own-view with PublishToggle and Edit CTA
  - /m/[username] public auth-gated member profile
  - ProfileCard server component (Avatar + hero + skills grid + availability + TikTok link)
  - PublishToggle client component (Switch + Tooltip + setPublished + completeness gate)
  - tests/e2e/profile-visibility.spec.ts (2 passing redirect tests + 6 fixme stubs)

affects: [ui, profile-view, publish-toggle]

# Tech tracking
tech-stack:
  added:
    - shadcn/ui Tooltip + Badge + Switch (already installed in Plan 04; consumed here)
  patterns:
    - rsc-data-fetch-pass-to-client-child
    - publish-gate-tooltip-with-checklist
    - middleware-prefix-covers-view-route
    - rls-empty-state-not-available-copy
    - robots-no-index-on-auth-gated-pages

key-files:
  created:
    - components/profile/ProfileCard.tsx
    - components/profile/PublishToggle.tsx
    - app/(app)/profile/page.tsx
    - app/(app)/m/[username]/page.tsx
    - tests/e2e/profile-visibility.spec.ts
  modified:
    - lib/supabase/middleware.ts (Rule 2: added unauthenticated-user gate on VERIFIED_REQUIRED_PREFIXES)

key-decisions:
  - "/m/[username] generates not-indexed metadata per D-09 (robots: { index: false, follow: false })"
  - "/profile empty-first-save shows 'Build your profile' nudge + CTA to /profile/edit"
  - "PublishToggle wraps disabled switch in Tooltip for completeness checklist (ProfileCompletenessChecklist spread as props)"
  - "Phase 5 messaging placeholder shipped in ProfileCard and removed when contact relay lands"
  - "Middleware unauthenticated gate: VERIFIED_REQUIRED_PREFIXES was only gating authed+unverified; added redirect to /login for unauthenticated visitors"

# Metrics
duration: ~30min
completed: "2026-04-20"
---

# Phase 3 Plan 05: Profile Views + Visibility Gate Summary

**ProfileCard server component + PublishToggle client component + /profile own view + /m/[username] public member view + Playwright visibility E2E — pnpm typecheck/lint/build exit 0, 2 redirect E2E tests pass, RLS-enforced not-available empty state for all non-visible profiles.**

## Performance

- **Duration:** ~30 min
- **Completed:** 2026-04-20
- **Tasks:** 2
- **Files created:** 5
- **Files modified:** 1 (middleware.ts — Rule 2 auto-fix)

## Accomplishments

- **Task 1:** Built `components/profile/ProfileCard.tsx` (server component) composing Card/Avatar/Badge per UI-SPEC: 160px avatar, display name, county+category sub-band, bio, Skills I offer / Skills I want 2-col grid with sage-bg Badge chips, availability italic, TikTok link with ExternalLink icon + noopener, Phase 5 relay placeholder card
- **Task 1:** Built `components/profile/PublishToggle.tsx` (client component) using `useActionState(setPublished, null)`; `isProfileComplete` gate drives `disabled` state; disabled Switch wrapped in `TooltipProvider > Tooltip > TooltipTrigger > TooltipContent(ProfileCompletenessChecklist)`; Sonner toast `Profile published.` / `Profile unpublished.` on state change
- **Task 2:** Built `app/(app)/profile/page.tsx` — fetches own profile with skills+counties+categories via RLS; renders "Build your profile" nudge if no row; renders "Your profile is ready" inline helper when unpublished; renders PublishToggle + ProfileCard + Edit CTA
- **Task 2:** Built `app/(app)/m/[username]/page.tsx` — fetches by `.eq('username', username)` via RLS (returns 0 rows for unpublished/banned/nonexistent); renders "This profile isn't available." empty state with "Go to directory" CTA; `generateMetadata` with `robots: { index: false, follow: false }` per D-09
- **Task 2:** Wrote `tests/e2e/profile-visibility.spec.ts` with 2 concrete passing tests (unauthenticated redirect to `/login` for both `/m/[username]` and `/profile`) + 6 fixme stubs for authenticated fixture work

## Task Commits

| Task | Description | Commit |
|------|-------------|--------|
| 1 | ProfileCard + PublishToggle components | `3969169` |
| 2 | /profile page + /m/[username] page + visibility E2E | `f1884c5` |

## Files Created/Modified

- `components/profile/ProfileCard.tsx` — server component; 160px Avatar; Skills I offer / Skills I want badge grids; TikTok link; Phase 5 placeholder
- `components/profile/PublishToggle.tsx` — client component; useActionState(setPublished); isProfileComplete gate; disabled Tooltip with checklist; Sonner toasts
- `app/(app)/profile/page.tsx` — own profile page; "Build your profile" first-save state; PublishToggle + ProfileCard + Edit CTA
- `app/(app)/m/[username]/page.tsx` — member profile page; RLS-gated select by username; not-available empty state; robots no-index metadata
- `tests/e2e/profile-visibility.spec.ts` — 2 passing redirect tests + 6 fixme stubs
- `lib/supabase/middleware.ts` — added `!isAuthed && isVerifiedOnlyPath` → redirect to `/login` gate (Rule 2 auto-fix)

## Decisions Made

- **Middleware unauthenticated gate:** `VERIFIED_REQUIRED_PREFIXES` was only handling `isAuthed && !isVerified` (→ `/verify-pending`). The `!isAuthed` case was not gated — unauthenticated visitors could load the page until the server component called `supabase.auth.getUser()`. Added a `!isAuthed && isVerifiedOnlyPath` → redirect to `/login` guard before the existing `isVerified` guard. Verified by E2E tests.
- **Phase 5 placeholder in ProfileCard:** Shipped as intentional stub per plan; removed when contact relay (Phase 5) lands. Documented in "Known Stubs" below.
- **robots: no-index for /m/[username]:** Applied via `generateMetadata` per D-09 STRIDE mitigation. Auth-gated pages should not be indexed; minimizes enumeration surface for crawlers.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 2 - Missing Auth Gate] Unauthenticated visitors not redirected from VERIFIED_REQUIRED_PREFIXES**
- **Found during:** Task 2 E2E test run
- **Issue:** `lib/supabase/middleware.ts` `updateSession()` only gated `isAuthed && !isVerified` (→ `/verify-pending`). Unauthenticated visitors to `/m/[username]` and `/profile` were not redirected to `/login` by middleware — the page server component's `supabase.auth.getUser()` call would eventually catch this, but the middleware gate is the canonical security layer.
- **Fix:** Added `if (!isAuthed && isVerifiedOnlyPath)` → redirect to `/login` immediately before the `isAuthed && !isVerified` guard. This also makes the E2E test correctly validate the middleware-level gate.
- **Files modified:** `lib/supabase/middleware.ts`
- **Commit:** `f1884c5`

**2. [Rule 3 - Blocking] Worktree missing .env.local for E2E Playwright server startup**
- **Found during:** Task 2 first E2E run
- **Issue:** Playwright's `webServer` (`pnpm start`) needs Supabase env vars. Worktree has no `.env.local`.
- **Fix:** Created symlink `/worktrees/agent-aec7fc66/.env.local -> /barterkin/.env.local` (gitignored, local-only; same fix as Plan 04).
- **Files modified:** `.env.local` (symlink — gitignored)

## Known Stubs

| Stub | File | Reason |
|------|------|--------|
| Phase 5 messaging placeholder div | `components/profile/ProfileCard.tsx` (bottom of CardContent) | Intentional per plan; text reads "Messaging arrives in a few weeks..." — renders in both /profile and /m/[username] views. Will be removed/replaced when Phase 5 contact relay ships. Does NOT block the plan's goal (profile viewing works without it). |

## Threat Flags

None new — all security surfaces from T-3-05-01 through T-3-05-07 accounted for:
- T-3-05-01: `robots: { index: false, follow: false }` in generateMetadata + middleware auth gate
- T-3-05-02: Accepted — username existence vs. visibility is indistinguishable to non-owners
- T-3-05-03: setPublished re-checks completeness server-side; RLS WITH CHECK is third gate
- T-3-05-04: Accepted — owner sees own row regardless of banned/is_published (intentional)
- T-3-05-05: React auto-escape + TikTok handle leading `@` stripped; no URL injection risk
- T-3-05-06: Accepted — hardcoded Link hrefs, no user input in CTAs
- T-3-05-07: Next.js server action CSRF protection built-in

## Self-Check

| Check | Result |
|-------|--------|
| components/profile/ProfileCard.tsx exists | FOUND |
| components/profile/PublishToggle.tsx exists | FOUND |
| app/(app)/profile/page.tsx exists | FOUND |
| app/(app)/m/[username]/page.tsx exists | FOUND |
| tests/e2e/profile-visibility.spec.ts exists | FOUND |
| commit 3969169 (Task 1) exists | FOUND |
| commit f1884c5 (Task 2) exists | FOUND |
| pnpm typecheck exits 0 | PASSED |
| pnpm lint exits 0 (1 pre-existing warning) | PASSED |
| pnpm build exits 0 | PASSED |
| E2E redirect tests (2) pass | PASSED |

## Self-Check: PASSED
