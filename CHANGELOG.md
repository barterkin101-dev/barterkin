# Changelog

All notable changes to Barterkin are documented here.

---

## [0.1.0.0] - 2026-04-24

**Two major workflows ship: admin tools for the operator and a guided onboarding wizard for new members.**

Phase 8 and Phase 9 land together. The admin dashboard gives Ashley's wife a clean, non-technical surface to manage members — search the full roster, view any profile, ban and unban with a confirmation dialog, and see at-a-glance stats (total members, contacts sent, new members this week) — all behind a server-enforced email guard that never touches user-writable metadata. The onboarding wizard gives every new member a three-step guide (complete your profile, browse your neighbors, say hello) shown automatically after first sign-in, with middleware that enforces the redirect, a skip-for-now escape hatch, and a persistent "Finish setup" link in the nav that disappears once they're done.

No external dependencies were added. The admin guard uses JWKS-verified claims, the open-redirect protection on `?returnTo=` is a pure function with 9 unit tests, and the full test suite (171 Vitest + 60 Playwright) is green.

### Added

**Admin dashboard** (Phase 8)
- `/admin` overview page — total members, contacts sent, new members this week
- `/admin/members` — full member roster with real-time client-side search (no round-trip)
- `/admin/members/[id]` — full profile detail: bio, skills, county, category, published/banned status
- Ban/Unban button with AlertDialog confirmation — one click to hide or restore a member from the directory
- `/admin/contacts` — all contact requests with status filter tabs (All / Bounced / Failed)
- Admin route group with its own nav (`AdminNav`) separate from the member-facing `AppNav`
- Middleware guard: unauthenticated `/admin` hits redirect to `/login`; authed non-admin redirects to `/`
- Server-only `ADMIN_EMAIL` environment variable — no `NEXT_PUBLIC_` prefix, never bundled to the browser

**Onboarding wizard** (Phase 9)
- Three-step wizard at `/onboarding` in its own route group (distraction-free, no `AppNav`)
- Step 1 (Profile): checklist of 5 required fields with live completeness check; Next button disabled until all 5 are green
- Step 2 (Directory): explains how to browse and search; links to the directory
- Step 3 (Contact): explains how to send a first contact request; marks `onboarding_completed_at` on render
- Middleware redirect: verified members with a null `onboarding_completed_at` are redirected to `/onboarding` from any app page
- "Finish setup" link in `AppNav` — visible only while `onboarding_completed_at` is null, styled in clay accent
- "Skip for now" link navigates to `/directory` without marking onboarding complete (resumable)
- `?returnTo=` support on `/profile/edit`: after saving, the form redirects to the wizard step instead of toasting in place
- Open-redirect prevention via `safeReturnTo()` — external URLs silently fall back to toast-in-place behavior
- DB migration `009_onboarding.sql` adds nullable `onboarding_completed_at` column to `profiles`

### Changed

- `app/(app)/layout.tsx` — profile query extended to include `onboarding_completed_at`; derives `showFinishSetup` boolean passed through `AppNav` into `NavLinks`
- `components/layout/NavLinks.tsx` — conditional "Finish setup →" link rendered before the Directory link when `showFinishSetup` is true
- `app/(app)/profile/edit/page.tsx` — reads `?returnTo` searchParam, validates via `safeReturnTo()`, passes to form
- `components/profile/ProfileEditForm.tsx` — accepts `returnTo` prop; `router.push(returnTo)` on save success when set, `toast('Profile saved.')` otherwise
- `lib/supabase/middleware.ts` — two new guard blocks: admin email check (Phase 8) and onboarding redirect (Phase 9)
- `app/layout.tsx` — added `icons` field to metadata (favicon + Apple touch icon)
- `app/opengraph-image.tsx` — added Barterkin logo mark to the OG image

### For contributors

- 28 new tests: 13 unit tests (Vitest) + 15 E2E specs (Playwright) covering onboarding flows; 4 admin unit tests + 9 admin E2E tests (all green)
- `lib/data/admin.ts` and `lib/actions/admin.ts` use `import 'server-only'` — safe from client bundle
- `safeReturnTo()` pure helper in `lib/utils/returnTo.ts` — 9 unit tests, no dependencies
- Admin Server Actions (`banMember`, `unbanMember`) rely on middleware for auth; no secondary `getUser()` call (documented tradeoff)
