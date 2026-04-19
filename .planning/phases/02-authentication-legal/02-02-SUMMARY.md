---
phase: 2
plan: 2
name: migrations-backend
subsystem: auth
tags: [auth, migration, server-action, middleware, rate-limit, disposable-email]
dependency_graph:
  requires: [02-01]
  provides: [sendMagicLink, isDisposableEmail, checkSignupRateLimit, auth-route-handlers, middleware-gating]
  affects: [02-03, 02-04, 03-01]
tech_stack:
  added: [disposable-email-domains-js]
  patterns: [server-only import, SECURITY DEFINER Postgres functions, React 19 useActionState signature, getClaims JWKS-verified middleware]
key_files:
  created:
    - supabase/migrations/002_auth_tables.sql
    - lib/utils/disposable-email.ts
    - lib/utils/rate-limit.ts
    - lib/actions/auth.ts
    - app/auth/callback/route.ts
    - app/auth/confirm/route.ts
    - app/auth/signout/route.ts
    - app/auth/error/page.tsx
  modified:
    - lib/supabase/middleware.ts
    - middleware.ts
decisions:
  - "Outcome B confirmed (A4-PROBE): disposable-email-domains-js exports isDisposableEmail(email) as named function, not class — used direct named import"
  - "rate-limit.ts fails OPEN on RPC error — Turnstile is primary defense, Postgres counter is secondary"
  - "Pitfall 4 fallback (getUser() for OAuth email_verified) deferred — LOW frequency, add as follow-up if observed in staging"
  - "@ts-expect-error on check_signup_ip RPC call — types regenerated in Wave 3 Task 4.2 after migration push"
metrics:
  duration: 289s
  completed: 2026-04-19
  tasks_completed: 6
  files_created: 8
  files_modified: 2
---

# Phase 2 Plan 2: migrations-backend Summary

**One-liner:** Server-side auth plumbing — Postgres migration for per-IP rate-limiting and disposable-email trigger, `isDisposableEmail` / `checkSignupRateLimit` utilities, `sendMagicLink` server action, four auth route handlers, and middleware extended with AUTH-04 email-verify gate + AUTH-09 auth-group redirect.

## Tasks Completed

| Task | Name | Commit | Files |
|------|------|--------|-------|
| 2.1 | Write migration 002_auth_tables.sql | 14733bf | supabase/migrations/002_auth_tables.sql |
| 2.2 | lib/utils/disposable-email.ts | e929545 | lib/utils/disposable-email.ts |
| 2.3 | lib/utils/rate-limit.ts | be8a988 | lib/utils/rate-limit.ts |
| 2.4 | lib/actions/auth.ts sendMagicLink | 5ebba73 | lib/actions/auth.ts |
| 2.5 | auth route handlers + error page | 600910d | app/auth/{callback,confirm,signout,error}/ |
| 2.6 | Extend middleware AUTH-04 + AUTH-09 | 595bf2b | lib/supabase/middleware.ts, middleware.ts |

## Artifacts

### supabase/migrations/002_auth_tables.sql (144 LOC)

Contains (in order):
1. `public.signup_attempts` table — RLS enabled, ZERO policies (service-role-only via SECURITY DEFINER)
2. `public.check_signup_ip(p_ip text)` — increments per-IP per-day counter, returns `count <= 5`
3. `public.current_user_is_verified()` — AUTH-04 RLS helper for Phase 3 profiles table
4. `public.disposable_email_domains` table — seeded with **15** known-bad domains
5. `public.reject_disposable_email` trigger on `auth.users` BEFORE INSERT — defense-in-depth for OAuth bypass
6. All SECURITY DEFINER functions set `search_path = public, pg_temp` (T-2-11 hardening)

Seed list count: 15 domains (`mailinator.com` through `tempail.com`).

**NOT pushed yet** — Wave 3 Task 4.1 runs `supabase db reset` locally first to verify the `auth.users` trigger applies, then `supabase db push`. The trigger on `auth.users` requires the `postgres` superuser at deploy time; Supabase CLI `db push` runs as postgres — this is expected to work cleanly.

### @ts-expect-error comments added

**File:** `lib/utils/rate-limit.ts`, line 25
**Reason:** `Database.public.Functions` is `Record<string, never>` in the placeholder `lib/database.types.ts` — the generated types don't include `check_signup_ip` yet.
**Removal:** Wave 3 Task 4.2 regenerates `lib/database.types.ts` after `supabase db push`. Remove the `@ts-expect-error` comment once the `check_signup_ip` function appears in the `Functions` map.

### Middleware behavior notes

**AUTH-09 (auth-group redirect):** Authed users hitting `/login` or `/signup` are redirected to `/directory`. Path check uses `startsWith` so `/login?next=...` is covered.

**AUTH-04 (email-verify gate):** Unverified authed users hitting any `VERIFIED_REQUIRED_PREFIXES` path (`/directory`, `/m/`, `/profile`) are redirected to `/verify-pending`. The check is a no-op until those pages exist (Phase 3/4).

**ALWAYS_ALLOWED paths:** `/verify-pending`, `/auth/callback`, `/auth/confirm`, `/auth/signout`, `/auth/error`, `/legal/` are always accessible to prevent redirect loops and ensure unverified users can complete the auth flow and read legal pages.

**Pitfall 4 fallback deferred:** The RESEARCH flags a LOW-frequency edge case where Google OAuth JWTs may lack `email_verified` in claims. Adding a `getUser()` fallback would incur an Auth-server round-trip on every request for affected users. Decision: monitor in staging; add the 5-line fallback if observed. Not added now.

## Deviations from Plan

### Auto-fixed Issues

None — plan executed exactly as written.

### Probe Outcome Applied

**[A4-PROBE Outcome B] disposable-email-domains-js uses named function export**
- **Found during:** Task 2.2 (read A4-PROBE.md per task instructions)
- **Issue:** Plan listed Outcome A (class-based `new DisposableEmailChecker()`) as the primary implementation. A4-PROBE.md confirmed Outcome B: package exports `isDisposableEmail(email: string)` as a named function.
- **Fix:** Used Outcome B import shape per A4-PROBE instructions. Wrapper function adds lowercase normalization and malformed-input guard before calling the library function.
- **Files modified:** `lib/utils/disposable-email.ts`
- **Commit:** e929545

## Known Stubs

None — all server-side exports are fully implemented. Wave 2 UI wires against these exports.

## Threat Surface Scan

No new network endpoints introduced beyond what the plan's threat model covers. All four auth route handlers (`/auth/callback`, `/auth/confirm`, `/auth/signout`, `/auth/error`) were pre-registered in the T-2-01 through T-2-05 threat register. No unplanned trust boundaries introduced.

## Verification Results

Post-plan verification passed:

- `supabase/migrations/002_auth_tables.sql` — exists, 144 LOC, 15 domain seeds
- `lib/utils/disposable-email.ts` — `import 'server-only'` line 1, named export `isDisposableEmail`
- `lib/utils/rate-limit.ts` — `import 'server-only'` line 1, named export `checkSignupRateLimit`, fails OPEN
- `lib/actions/auth.ts` — `'use server'` line 1, exports `sendMagicLink` + `SendMagicLinkResult`, all three guards wired
- `app/auth/callback/route.ts` — GET only, open-redirect guard
- `app/auth/confirm/route.ts` — GET only, open-redirect guard
- `app/auth/signout/route.ts` — POST only (no GET export), status 303
- `app/auth/error/page.tsx` — async searchParams (Next 16 pattern)
- `lib/supabase/middleware.ts` — `AUTH_GROUP_PATHS`, `VERIFIED_REQUIRED_PREFIXES`, `getClaims()`, no `getSession` calls, no `user_metadata` reads
- `middleware.ts` — comment updated, matcher unchanged
- `pnpm typecheck` — PASS
- `pnpm lint` — PASS
- `pnpm build` — PASS

## Self-Check: PASSED
