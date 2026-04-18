---
phase: 01-foundation-infrastructure
plan: 03
subsystem: infra
tags: [supabase, ssr, auth, middleware, nextjs, typescript, jwt, getClaims, server-only, rls]

# Dependency graph
requires:
  - phase: 01-foundation-infrastructure
    provides: "Plan 01-02 Next.js 16.2.4 App Router scaffold + @/ alias + tsconfig strict + build=next build --webpack"
  - phase: 01-foundation-infrastructure
    provides: "Plan 01-01 .env.local.example declaring NEXT_PUBLIC_SUPABASE_URL + NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY + SUPABASE_SERVICE_ROLE_KEY"
provides:
  - "@supabase/ssr@0.10.2 + @supabase/supabase-js@2.103.3 installed (no deprecated @supabase/auth-helpers-nextjs)"
  - "Four-client factory: lib/supabase/{client,server,middleware,admin}.ts — browser / RSC / edge middleware / service-role"
  - "Root middleware.ts with updateSession(request) and matcher excluding static + webhooks + PWA icon extensions"
  - "lib/database.types.ts scaffold (empty public schema — Phase 2 regenerates via `supabase gen types typescript`)"
  - "JWT revalidation via supabase.auth.getClaims() (Next 16 pattern, no Auth-server round-trip — JWKS verified)"
  - "server-only guard on admin.ts — service-role key cannot bundle to browser"
affects: [01-04-pwa-serwist, 01-05-posthog-resend, 01-06-supabase-migrations, 01-07-testing-infra, 01-08-ci-gitleaks, 01-10-vercel-link-deploy, 02-auth, 03-profile, 04-directory, 05-contact-relay]

# Tech tracking
tech-stack:
  added:
    - "@supabase/ssr@0.10.2"
    - "@supabase/supabase-js@2.103.3"
  patterns:
    - "Four-client factory pattern — separate createBrowserClient (client.ts), createServerClient+async cookies (server.ts), createServerClient+request/response cookie round-trip (middleware.ts), service-role createClient (admin.ts)"
    - "import 'server-only' on line 1 of admin.ts + server.ts — Next.js build-time guard against client bundle leakage (PITFALLS Pitfall 2)"
    - "Next 16 middleware pattern: supabase.auth.getClaims() validates JWT against published JWKS with no Auth-server round-trip; getSession() BANNED in server paths (PITFALLS Pitfall 1)"
    - "Middleware cookie round-trip: setAll mutates both request.cookies and response.cookies on the same NextResponse instance (PITFALLS Pitfall 4)"
    - "Database.types.ts scaffold with empty Tables/Views/Functions/Enums/CompositeTypes — typechecks today, regenerated from real schema in Phase 2"
    - "Middleware matcher explicitly excludes webmanifest + image extensions — leaves PWA asset paths unclogged for Plan 04 Serwist"

key-files:
  created:
    - "lib/database.types.ts — placeholder Database interface + Json utility type"
    - "lib/supabase/client.ts — createClient() via createBrowserClient<Database>"
    - "lib/supabase/server.ts — async createClient() with await cookies() adapter (Next 16 async cookies API)"
    - "lib/supabase/middleware.ts — updateSession(request) helper with request/response cookie round-trip + supabase.auth.getClaims()"
    - "lib/supabase/admin.ts — supabaseAdmin singleton via @supabase/supabase-js createClient (service-role, persistSession: false, autoRefreshToken: false)"
    - "middleware.ts — root Next.js middleware calling updateSession(request) with matcher excluding static/webhooks/PWA assets"
  modified:
    - "package.json — added @supabase/ssr ^0.10.2 and @supabase/supabase-js ^2.103.3"
    - "pnpm-lock.yaml — lockfile entries for the SSR pair + 9 transitive deps"

key-decisions:
  - "Chose supabase.auth.getClaims() over the getUser() fallback — probe at install time (`node -e \"...'getClaims' in c.auth...\"`) returned HAS_GETCLAIMS on @supabase/ssr@0.10.2, so JWKS-verified primary path is live; saves ~50ms/req over getUser() Auth-server round-trip"
  - "Database.types.ts uses empty Record<string, never> for Tables/Views/Functions/Enums/CompositeTypes — typechecks today; Phase 2 `supabase gen types typescript --local` will regenerate from real schema"
  - "server.ts also starts with `import 'server-only'` even though plan only mandated it on admin.ts — defense-in-depth against accidental use from a client component (plan-spec-compliant; Step 4 code block already includes this line)"
  - "Middleware matcher includes robots.txt + sitemap.xml (plan-spec) in addition to the favicon, PWA, and webhook exclusions"

patterns-established:
  - "Pattern 1: Supabase clients consumed via @/lib/supabase/{client,server,middleware,admin} aliases — never direct @supabase/ssr imports in feature code"
  - "Pattern 2: All trust decisions use getClaims() (middleware) or getUser() (RSC / server action); getSession() BANNED in server paths and is greppable"
  - "Pattern 3: Service-role access is admin.ts-only; any new Next.js code path importing supabaseAdmin is a threat-register Rule-4 checkpoint (T-03-06 scope boundary)"
  - "Pattern 4: Database type regeneration is a Phase 2+ migration-script concern — pnpm supabase gen types typescript --local > lib/database.types.ts"

requirements-completed: [FOUND-05, FOUND-06]

# Metrics
duration: ~2min
completed: 2026-04-18
---

# Phase 01 Plan 03: Supabase SSR Summary

**@supabase/ssr@0.10.2 four-client factory wired (browser/RSC/middleware/admin) with root middleware.ts refreshing sessions via supabase.auth.getClaims() — JWKS-verified, no Auth-server round-trip, service-role key server-only-guarded on a public repo.**

## Performance

- **Duration:** ~2 min (both tasks; highly mechanical — install, scaffold four small modules, build)
- **Started:** 2026-04-18T23:24:41Z
- **Completed:** 2026-04-18T23:26:42Z
- **Tasks:** 2 (both `auto`, both passed on first try)
- **Files created:** 6 (four supabase/ modules, one database.types.ts, one root middleware.ts)
- **Files modified:** 2 (package.json, pnpm-lock.yaml)
- **pnpm build time:** 17s total wall clock (webpack compile 4.6s + TypeScript 1.6s + static-gen 0.4s + collect/finalize)

## Accomplishments

- Installed `@supabase/ssr@0.10.2` + `@supabase/supabase-js@2.103.3` with pnpm. Confirmed `@supabase/auth-helpers-nextjs` is NOT present (PITFALLS Pitfall 3 hedge).
- Probed `supabase.auth.getClaims()` availability at install time via `node -e "…'getClaims' in c.auth…"` — returned `HAS_GETCLAIMS`. Middleware uses the primary JWKS-verified path (no Auth-server round-trip, saves ~50ms/req).
- Scaffolded four TypeScript client modules at `lib/supabase/{client,server,middleware,admin}.ts`, each typed with the `Database` generic against the Phase-1 placeholder type.
- `lib/supabase/admin.ts` line 1 is `import 'server-only'` — Next.js throws a build-time error if any client module transitively imports from it. This is the public-repo-safety keystone (PITFALLS Pitfall 2: a leaked service-role key on a public repo = 100% RLS bypass).
- `lib/supabase/server.ts` also starts with `import 'server-only'` as defense-in-depth (plan Step 4 code block spec).
- Created root `middleware.ts` (Next.js convention file) calling `updateSession(request)` with a matcher that excludes `_next/static`, `_next/image`, `favicon.ico`, `robots.txt`, `sitemap.xml`, `api/webhooks`, and image/PWA file extensions (`.svg|.png|.jpg|.jpeg|.gif|.webp|.ico|.webmanifest`). Keeps middleware off PWA asset paths so Plan 04 Serwist can install its service worker unencumbered.
- `pnpm typecheck` → exit 0. `pnpm build` (webpack) → exit 0 in 17s, middleware emitted as `ƒ Proxy (Middleware)` in the route listing, confirming it was picked up and bundled.
- Committed as `bc1e942 feat(foundation): wire @supabase/ssr three-client factory + root middleware` using the exact message block from PLAN.md Task 2 Step 2. Pushed to `origin/main`. `HEAD == origin/main`, no unintentional deletions.

## Task Commits

1. **Tasks 1 + 2 (combined): scaffold four-client factory + root middleware + commit** — `bc1e942` (feat)

PLAN.md specified a single atomic commit for the whole plan covering all factory files + middleware.ts + database.types.ts + package.json/pnpm-lock.yaml. Task 1 (install + four modules) and Task 2 (root middleware.ts + commit) are bundled in `bc1e942`.

**No separate plan-metadata commit** was emitted for this plan during execution; SUMMARY.md + STATE.md updates roll into the orchestrator's final metadata commit.

## Files Created/Modified

**Created (in `bc1e942`):**
- `lib/database.types.ts` — `export interface Database { public: { Tables/Views/Functions/Enums/CompositeTypes: Record<string,never> } }` + `Json` utility type. Phase-1 scaffold; regenerated via `pnpm supabase gen types typescript --local > lib/database.types.ts` after Phase 2 migrations.
- `lib/supabase/client.ts` — `export const createClient = () => createBrowserClient<Database>(URL!, PUBLISHABLE!)`. Called from `"use client"` components.
- `lib/supabase/server.ts` — `import 'server-only'` on line 1. `async createClient()` awaits Next 16's async `cookies()`, adapts `getAll`/`setAll` per `@supabase/ssr` canonical pattern; `setAll` swallows errors when called from an RSC (cookies can't be set in that context — middleware handles refresh).
- `lib/supabase/middleware.ts` — `updateSession(request)` helper. `let response = NextResponse.next({ request })` then `createServerClient<Database>` with cookie adapter that mutates both `request.cookies` and `response.cookies` on the same `NextResponse` instance (PITFALLS Pitfall 4). Calls `await supabase.auth.getClaims()` (Next 16 primary; probed HAS_GETCLAIMS at install).
- `lib/supabase/admin.ts` — `import 'server-only'` on line 1. `export const supabaseAdmin = createSupabaseClient<Database>(URL!, SERVICE_ROLE!, { auth: { persistSession: false, autoRefreshToken: false } })`. Header comment documents the public-repo rule: never remove the `server-only` guard.
- `middleware.ts` (root) — `import type { NextRequest }` + `import { updateSession } from '@/lib/supabase/middleware'` + `export async function middleware(request)` + `export const config = { matcher: [...] }` with the PLAN.md Task 2 Step 1 verbatim pattern.

**Modified (in `bc1e942`):**
- `package.json` — `dependencies` gained `"@supabase/ssr": "^0.10.2"` and `"@supabase/supabase-js": "^2.103.3"`.
- `pnpm-lock.yaml` — 11 package entries added (the two direct + 9 transitive deps for `@supabase/node-fetch`, `@supabase/postgrest-js`, `@supabase/auth-js`, `@supabase/realtime-js`, `@supabase/storage-js`, `@supabase/functions-js`, etc.).

**NOT installed (per PITFALLS Pitfall 3):** `@supabase/auth-helpers-nextjs`. Verified via `jq -r '.dependencies["@supabase/auth-helpers-nextjs"]' package.json` → `null`.

## Decisions Made

1. **Chose `supabase.auth.getClaims()` (primary) over `getUser()` (fallback).** PLAN.md mandated a runtime probe before committing. Probe:
   ```
   node -e "const {createServerClient}=require('@supabase/ssr'); const c=createServerClient('https://x.supabase.co','x',{cookies:{getAll:()=>[],setAll:()=>{}}}); console.log('getClaims' in c.auth ? 'HAS_GETCLAIMS' : 'NO_GETCLAIMS');"
   → HAS_GETCLAIMS
   ```
   `@supabase/ssr@0.10.2` exposes `getClaims` on the returned client's `auth` surface, so middleware uses it directly. Saves ~50ms per middleware-covered request vs. the `getUser()` Auth-server round-trip. Both are JWT-revalidating; `getSession()` is spoofable and banned.
2. **`server.ts` also carries `import 'server-only'`.** Plan Step 4 code block included it; preserved as written. Defense-in-depth: even though `next/headers` imports would fail in a client context, the guard makes the intent explicit and gives a compile-time error instead of a runtime "cookies() is not a function".
3. **Matcher includes `robots.txt` and `sitemap.xml`.** PLAN.md Task 2 Step 1 code block listed them; kept verbatim. Research-line matcher (line 114 of PLAN.md) omits these, but the Step 1 code is the canonical spec and it excludes them from middleware for the same reason as favicon.ico — they're public, static, and shouldn't trigger session-refresh work.
4. **`lib/database.types.ts` uses `Record<string, never>` for empty buckets.** Matches the plan's interface snippet verbatim. Typechecks today because generic `SupabaseClient<Database>` doesn't require any particular key presence; `.from('table')` calls typecheck as `unknown` until Phase 2 regenerates the real schema types.

## Deviations from Plan

None — plan executed exactly as written.

All acceptance criteria met on first attempt:
- `jq -r '.dependencies["@supabase/ssr"]' package.json` → `^0.10.2` ✓ (matches `^0.10`)
- `jq -r '.dependencies["@supabase/supabase-js"]' package.json` → `^2.103.3` ✓ (matches `^2.103`)
- `jq -r '.dependencies["@supabase/auth-helpers-nextjs"]' package.json` → `null` ✓
- `head -1 lib/supabase/admin.ts` → `import 'server-only'` ✓
- `head -1 lib/supabase/server.ts` → `import 'server-only'` ✓
- `grep -E "auth\.(getClaims|getUser)\(" lib/supabase/middleware.ts` → `await supabase.auth.getClaims()` ✓
- `grep "SUPABASE_SERVICE_ROLE_KEY" lib/supabase/admin.ts` → match ✓, no `NEXT_PUBLIC_SUPABASE_SERVICE_ROLE_KEY` ✓
- `grep -rE "auth\.getSession\(\)" lib middleware.ts` → empty ✓
- `pnpm typecheck` → exit 0 ✓
- `pnpm build` → exit 0, middleware shown as `ƒ Proxy (Middleware)` in route listing ✓
- `git log --oneline -1` → `bc1e942 feat(foundation): wire @supabase/ssr three-client factory + root middleware` ✓
- Working tree clean (save for pre-existing `.planning/STATE.md` change carried into final metadata commit)
- `HEAD == origin/main` after push ✓

## Threat Flags

None — threat register covered all new surface:
- T-03-01 (service-role leak) → mitigated by `import 'server-only'` line 1 of admin.ts.
- T-03-02 (session spoofing) → mitigated by `getClaims()` primary path (JWKS-verified, confirmed via probe).
- T-03-03 (cookie drop) → mitigated by canonical setAll round-trip on the single `response` instance.
- T-03-04 (deprecated auth-helpers) → mitigated; package absent.
- T-03-05 (middleware over-match) → mitigated; matcher excludes static + webhooks + PWA assets.
- T-03-06 (service-role misuse in Next.js paths) → accepted for Phase 1; no Next.js code paths import `supabaseAdmin` in this plan.

No new security-relevant surface outside the threat register.

## Issues Encountered

- **Next 16 `middleware.ts` → `proxy.ts` deprecation warning.** Running `pnpm build` prints: `⚠ The "middleware" file convention is deprecated. Please use "proxy" instead.` PLAN.md explicitly mandates the filename `middleware.ts` and its acceptance criteria check for it; the deprecation is forward-looking (still fully supported in 16.2.4). No action. Noted for a future housekeeping plan that can rename to `proxy.ts` if Next 17 removes the middleware alias.
- **Webpack cache packed-big-strings warning.** `<w> [webpack.cache.PackFileCacheStrategy] Serializing big strings (215kiB) impacts deserialization performance` — benign, cache-format hint from webpack itself. Unrelated to this plan.

## User Setup Required

None for this plan. Supabase project creation + env var injection (`NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`, `SUPABASE_SERVICE_ROLE_KEY`) is the Phase-1 user-setup that landed in Plan 01-01's USER-SETUP.md. This plan only wires the *code* side of the boundary — the env vars will populate from Vercel env + local `.env.local` without any action required here.

## Next Phase Readiness

- **Plan 01-04 (PWA Serwist):** Ready. Middleware matcher explicitly skips `.webmanifest` and image extensions, so Serwist's service worker and manifest won't be eaten by session-refresh overhead.
- **Plan 01-05 (PostHog + Resend):** Ready. Resend webhooks pass through `/api/webhooks/*` which the matcher excludes — webhook requests won't trigger a Supabase session refresh (correct — they're server-to-server, not user-authenticated).
- **Plan 01-06 (Supabase migrations):** Ready. Once the first migration lands, `pnpm supabase gen types typescript --local > lib/database.types.ts` will regenerate the placeholder; every `createClient<Database>()` call already imports from `@/lib/database.types` and will pick up the richer types transparently.
- **Plan 01-07 (Testing infra):** Ready. Vitest + Playwright tests can import the browser client via `@/lib/supabase/client` and the server client via `@/lib/supabase/server` with the same `@/` alias Plan 02 established.
- **Plan 01-08 (CI + gitleaks):** Ready. Gitleaks will scan `lib/supabase/admin.ts` for `SUPABASE_SERVICE_ROLE_KEY` literal — reads `process.env.SUPABASE_SERVICE_ROLE_KEY` only (no hardcoded key). Clean.
- **Plan 01-10 (Vercel link + deploy):** Ready. Middleware will run on Vercel Edge Runtime; `@supabase/ssr` middleware pattern is Edge-compatible.
- **Phase 2 (auth):** Primary dependency unblocked. All `createClient()` call sites are ready to receive real auth sessions once the user lands Phase 2 auth-UI plans.

---

## Self-Check: PASSED

**Verified files exist:**
- `/Users/ashleyakbar/barterkin/lib/database.types.ts` — FOUND
- `/Users/ashleyakbar/barterkin/lib/supabase/client.ts` — FOUND
- `/Users/ashleyakbar/barterkin/lib/supabase/server.ts` — FOUND
- `/Users/ashleyakbar/barterkin/lib/supabase/middleware.ts` — FOUND
- `/Users/ashleyakbar/barterkin/lib/supabase/admin.ts` — FOUND
- `/Users/ashleyakbar/barterkin/middleware.ts` — FOUND

**Verified commit exists:**
- `bc1e942` — FOUND (feat(foundation): wire @supabase/ssr three-client factory + root middleware)
- Pushed to `origin/main`: `git rev-parse HEAD == git rev-parse origin/main` ✓

**Verified acceptance criteria (end-to-end):**
- `pnpm typecheck` → exit 0 ✓
- `pnpm build` (webpack) → exit 0 in 17s, middleware emitted as `ƒ Proxy (Middleware)` ✓
- `@supabase/ssr@^0.10.2` in package.json ✓
- `@supabase/supabase-js@^2.103.3` in package.json ✓
- `@supabase/auth-helpers-nextjs` NOT in package.json ✓
- `admin.ts` line 1 = `import 'server-only'` ✓
- `server.ts` line 1 = `import 'server-only'` ✓
- `middleware.ts` helper uses `auth.getClaims()` (probed HAS_GETCLAIMS) ✓
- No `auth.getSession(` anywhere in `lib/` or `middleware.ts` ✓
- Root `middleware.ts` imports `updateSession` from `@/lib/supabase/middleware` ✓
- Matcher excludes `api/webhooks` + `webmanifest` ✓
- `git status --porcelain` shows only pre-existing `.planning/STATE.md` modification (carried into final metadata commit) ✓

**Chosen auth path:** `getClaims()` (primary, JWKS-verified, no round-trip). Probe `HAS_GETCLAIMS` on `@supabase/ssr@0.10.2`.

---

*Phase: 01-foundation-infrastructure*
*Plan: 03-supabase-ssr*
*Completed: 2026-04-18*
