---
phase: 01-foundation-infrastructure
plan: 04
subsystem: infra
tags: [pwa, serwist, service-worker, manifest, next16, webpack, turbopack, offline]

# Dependency graph
requires:
  - phase: 01-foundation-infrastructure
    provides: Plan 02 (next-build --webpack pin, shadcn + Tailwind v4 palette, app/layout.tsx); Plan 03 (middleware matcher excluding .webmanifest + PWA icon extensions)
provides:
  - Serwist-backed PWA shell (@serwist/next@9.5.7 + serwist@9.5.7)
  - next.config.ts withSerwist wrapper (disabled in dev, runs on production webpack build)
  - app/sw.ts service worker source (precache + defaultCache + /~offline fallback)
  - app/manifest.ts dynamic manifest served at /manifest.webmanifest
  - app/~offline/page.tsx offline fallback page (sage-bg + forest-deep palette)
  - 3 placeholder PWA icons at public/icons/icon-{192,512,maskable}.png (sharp-generated, Phase 6 swaps for branded)
  - global.d.ts declaring ServiceWorkerGlobalScope for sw.ts typecheck
  - scripts/generate-icons.cjs reusable icon regeneration script
affects: 05-auth, 06-landing-polish (final icons), 08-ci-deploy (build must regenerate sw.js)

# Tech tracking
tech-stack:
  added:
    - "@serwist/next@9.5.7 (devDependency)"
    - "serwist@9.5.7 (devDependency)"
    - "sharp@0.34.5 (devDependency — placeholder icon generation; kept for Phase 6 regeneration)"
  patterns:
    - "PWA disabled in dev (Turbopack-friendly), enabled in production webpack build"
    - "Dynamic manifest via Next.js app/manifest.ts convention (served at /manifest.webmanifest)"
    - "Offline fallback routed via Serwist fallbacks.entries with document-matcher"
    - "Build artefacts (public/sw.js, public/swe-worker-*.js) gitignored; icons committed"

key-files:
  created:
    - app/sw.ts
    - app/manifest.ts
    - app/~offline/page.tsx
    - global.d.ts
    - public/icons/icon-192.png
    - public/icons/icon-512.png
    - public/icons/icon-maskable.png
    - scripts/generate-icons.cjs
  modified:
    - next.config.ts
    - app/layout.tsx
    - tsconfig.json
    - .gitignore
    - package.json
    - pnpm-lock.yaml

key-decisions:
  - "Serwist disable flag keyed on NODE_ENV === 'development' (RESEARCH Pattern 2). Avoids Turbopack incompat without forcing --webpack on dev."
  - "Added empty turbopack: {} config to silence Next 16's 'webpack config with no turbopack config' error that fired even when Serwist was disabled in dev."
  - "tsconfig.json lib += 'webworker' to expose ServiceWorkerGlobalScope for app/sw.ts (alternative: triple-slash reference comments)."
  - "sharp kept as devDependency past this plan — Phase 6 needs it for branded icon regeneration via scripts/generate-icons.cjs."
  - "swe-worker-*.js added to .gitignore alongside sw.js (both are Serwist build chunks regenerated per build)."

patterns-established:
  - "PWA wiring pattern: Serwist wrapper in next.config.ts, app/sw.ts at project-relative path 'app/sw.ts', swDest at public/sw.js"
  - "Dynamic manifest pattern: app/manifest.ts returning MetadataRoute.Manifest — Next.js serves at /manifest.webmanifest automatically"
  - "Offline fallback pattern: '/~offline' (tilde prefix avoids collision with future app routes)"
  - "Icon-generation pattern: SVG + sharp → PNG, committed as static assets (regeneratable via scripts/generate-icons.cjs)"

requirements-completed: [FOUND-09]

# Metrics
duration: ~12min
completed: 2026-04-18
---

# Phase 01 Plan 04: PWA Serwist Summary

**Serwist 9.5.7 PWA shell wired with dynamic manifest, offline fallback at /~offline, and 3 sharp-generated placeholder icons. Production webpack build emits a 50,686-byte public/sw.js; dev server runs clean on Turbopack with PWA disabled.**

## Performance

- **Duration:** ~12 min
- **Started:** 2026-04-18
- **Completed:** 2026-04-18
- **Tasks:** 2
- **Files modified/created:** 14
- **Build time (production, webpack):** 12-17s (cold/warm)
- **sw.js output size:** 50,686 bytes (49.5 KB)

## Accomplishments

- Serwist 9.5.7 (`@serwist/next` + `serwist`) wired via `withSerwist` in `next.config.ts` with `disable: process.env.NODE_ENV === 'development'`.
- Service worker source `app/sw.ts` wires `defaultCache`, `navigationPreload`, `skipWaiting`, `clientsClaim`, and a `/~offline` fallback for document requests.
- Dynamic manifest at `app/manifest.ts` with Barterkin name, description ("Georgia's community skills exchange."), `#eef3e8` sage background, `#2d5a27` forest theme, and 3 icon references (192, 512, 512-maskable).
- Offline page at `app/~offline/page.tsx` using the Barterkin palette (`bg-sage-bg` / `text-forest-deep` / `font-serif`) — matches the design language established in Plan 02.
- 3 placeholder PWA icons generated via a one-shot `sharp` script (solid forest squares with a Lora-style "B" in sage). Maskable variant uses 10% safe padding per PWA maskable-icon spec.
- Production build (`pnpm build --webpack`) emits `public/sw.js` (50,686 bytes); dev server (`pnpm dev`) runs clean on Turbopack with the PWA stubbed out.
- `app/layout.tsx` picked up `appleWebApp`, `applicationName`, `formatDetection`, and a `Viewport` export with `themeColor: '#2d5a27'` for correct browser chrome on iOS/Android.

## Task Commits

1. **Task 1 + 2: Serwist wiring + icons + verify build** — `76c74a5` (feat)
2. **Post-Task-2 hotfix: empty turbopack config to silence dev-server error** — `ced33a5` (fix)

Both commits pushed to `origin/main`. No separate `docs(...)` metadata commit — the SUMMARY is added as part of the Phase 1 housekeeping commit captured elsewhere.

## Files Created/Modified

### Created
- `app/sw.ts` — Serwist service worker (precache via `__SW_MANIFEST`, `defaultCache` runtime, `/~offline` document fallback).
- `app/manifest.ts` — Dynamic Next.js web app manifest.
- `app/~offline/page.tsx` — Offline fallback page (server component, static).
- `global.d.ts` — `declare const self: ServiceWorkerGlobalScope` for sw.ts typecheck.
- `public/icons/icon-192.png` — 192×192 PNG, 2,958 bytes.
- `public/icons/icon-512.png` — 512×512 PNG, 12,005 bytes.
- `public/icons/icon-maskable.png` — 512×512 maskable PNG, 11,010 bytes.
- `scripts/generate-icons.cjs` — Reusable icon-generation script (SVG → sharp → PNG).

### Modified
- `next.config.ts` — Added `withSerwist(...)` wrapper + `turbopack: {}` config + `images.remotePatterns` for Supabase hosts.
- `app/layout.tsx` — Added `appleWebApp`, `applicationName`, `formatDetection` on `metadata`; exported `viewport` with `themeColor: '#2d5a27'`.
- `tsconfig.json` — `lib` extended with `"webworker"` so `ServiceWorkerGlobalScope` resolves for `app/sw.ts`.
- `.gitignore` — Added `public/swe-worker-*.js` + `.map` patterns (Serwist runtime chunk artefact).
- `package.json` + `pnpm-lock.yaml` — Added `@serwist/next@9.5.7`, `serwist@9.5.7`, `sharp@0.34.5` as devDependencies.

## Decisions Made

- **Serwist disable in dev vs. `next dev --webpack`:** Went with `disable: process.env.NODE_ENV === 'development'` per RESEARCH Pattern 2 rather than flipping the dev script to `--webpack`. Keeps Turbopack's 400% dev-speed win for day-to-day work; PWA is only relevant for production / Chrome DevTools install testing anyway.
- **`turbopack: {}` in next.config.ts:** Required to silence Next 16's "webpack config with no turbopack config" error that fires when `withSerwist` injects its webpack config at config-eval time, even when `disable: true`. This is the documented silencer (next.js.org/docs/messages/webpack-config-with-turbopack).
- **`tsconfig lib += "webworker"`** (vs. triple-slash reference): Applies globally to the project so any future service-worker code paths resolve without per-file directives. Minimal risk — webworker lib adds `self`, `ServiceWorkerGlobalScope`, `ExtendableEvent` etc.; no conflict with DOM globals that `app/sw.ts` doesn't touch.
- **`sharp` retained as devDependency:** Phase 6 (Landing + Polish) will regenerate branded icons via `scripts/generate-icons.cjs` or swap to a Figma export pipeline. ~5 MB one-time install, acceptable cost.
- **`scripts/generate-icons.cjs` committed:** Trivial to re-run for Phase 6 ("produce 3 icons from a new SVG template in one command") rather than pasting a heredoc into a terminal again.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 — Blocking] tsconfig.json missing `webworker` lib**
- **Found during:** Task 1 (typecheck after creating `app/sw.ts`)
- **Issue:** `tsc --noEmit` errored with `TS2552: Cannot find name 'ServiceWorkerGlobalScope'` because `tsconfig.json` lib array only had `["dom", "dom.iterable", "esnext"]`. Plan mentioned this as a possibility in `<read_first>` (line 150) but didn't mandate the fix.
- **Fix:** Extended `compilerOptions.lib` to include `"webworker"`.
- **Files modified:** `tsconfig.json`
- **Verification:** `pnpm typecheck` exits 0.
- **Committed in:** `76c74a5` (Task 2 commit).

**2. [Rule 2 — Missing Critical] `.gitignore` missing `swe-worker-*.js` pattern**
- **Found during:** Task 2 (post-build `git status`)
- **Issue:** Serwist 9.5.7 emits a second per-build chunk at `public/swe-worker-<hash>.js` (runtime chunk separate from `sw.js`). Plan's `.gitignore` (from Plan 01) only excluded `sw.js` + `workbox-*.js`; the `swe-worker-*.js` file appeared untracked after every build, begging to be accidentally committed.
- **Fix:** Added `public/swe-worker-*.js` + `.map` lines to `.gitignore`, matching the existing `workbox-*.js` pattern.
- **Files modified:** `.gitignore`
- **Verification:** `git status` clean after build; `git ls-files public/ | grep swe-worker` returns empty.
- **Committed in:** `76c74a5` (Task 2 commit).

**3. [Rule 1 — Bug] Dev server crashed after Serwist wiring**
- **Found during:** Final smoke test (after commit `76c74a5`, running `pnpm dev`)
- **Issue:** `withSerwist` injects a webpack config at config-evaluation time even when `disable: true`. Next 16 Turbopack (default for `next dev`) errors out on any config that has webpack settings but no turbopack settings: "This build is using Turbopack, with a `webpack` config and no `turbopack` config." Dev server would not start — regression from the Serwist wiring.
- **Fix:** Added `turbopack: {}` (empty config) to `next.config.ts` per Next.js's own error-message guidance. Serwist is still disabled in dev, so nothing functionally changes — this is just a silencer.
- **Files modified:** `next.config.ts`
- **Verification:** `pnpm dev` starts in 307ms; `curl http://localhost:3000/manifest.webmanifest` → 200; `curl http://localhost:3000/~offline` → 200 with "You're offline" body.
- **Committed in:** `ced33a5` (dedicated fix commit).

---

**Total deviations:** 3 auto-fixed (1 blocking, 1 missing-critical, 1 bug).
**Impact on plan:** All three were necessary for the plan to actually satisfy its `<verification>` clauses (typecheck, clean git status, dev-mode reachability implied by the `autonomous: true` smoke-test flow). No scope creep — every change was correctness-driven.

## Issues Encountered

- Next 16's dev-server Turbopack strictness around webpack config (handled as Deviation #3 above). Worth a note in project memory: any future `withX` wrapper that touches webpack config (PWA plugins, CMS wrappers, sentry, etc.) will hit the same error and the fix is always `turbopack: {}`.
- Pre-existing `⚠ The "middleware" file convention is deprecated` warning from Next 16 appeared in build output — confirmed this is from Plan 03's `middleware.ts` and is already logged as future housekeeping. No action taken (per agent contract).

## User Setup Required

None — the PWA shell is fully wired. Placeholder icons are committed; Phase 6 will swap them for branded assets. Smoke test for a human tester (post-deploy):

1. Run `pnpm build && pnpm start`.
2. Open `http://localhost:3000` in Chrome.
3. DevTools → Application → Manifest — "Barterkin" with all 3 icons and the sage/forest colors.
4. DevTools → Application → Service Workers — `sw.js` active.
5. Click the install button in the URL bar; confirm "Barterkin" installs as a standalone app.

## Next Phase Readiness

- **Plan 01-05 (Supabase project + env scaffold / auth wiring):** Ready. No PWA surface touches Supabase; unblocked.
- **Phase 6 (Landing + Polish):** Icon pipeline is already in place — regenerate via `node scripts/generate-icons.cjs` after dropping in a new SVG template, or swap the script to read from an SVG file. Manifest theme colors will likely get re-tuned once the final brand palette is locked.
- **Phase 8 (CI / Deploy):** CI must run `pnpm build --webpack` (not `--turbopack`) for Serwist to emit `public/sw.js`. The `build` script in `package.json` already pins `--webpack`, so CI inherits it automatically — no extra config needed.

## Self-Check: PASSED

Verified on disk post-commit:

- `app/sw.ts` — FOUND (contains `new Serwist(`)
- `app/manifest.ts` — FOUND (contains `short_name: 'Barterkin'`)
- `app/~offline/page.tsx` — FOUND (contains "You're offline")
- `global.d.ts` — FOUND
- `public/icons/icon-192.png` — FOUND (192×192, 2958 bytes)
- `public/icons/icon-512.png` — FOUND (512×512, 12005 bytes)
- `public/icons/icon-maskable.png` — FOUND (512×512, 11010 bytes)
- `public/sw.js` — FOUND (50,686 bytes, post-build; gitignored — NOT tracked)
- `scripts/generate-icons.cjs` — FOUND
- Commit `76c74a5` — FOUND on `origin/main`
- Commit `ced33a5` — FOUND on `origin/main`
- `pnpm typecheck` — exits 0
- `pnpm build` — exits 0, emits `public/sw.js`
- `git ls-files public/sw.js` — empty (correctly untracked)
- `git ls-files public/icons/` — 3 entries (correctly tracked)

---
*Phase: 01-foundation-infrastructure*
*Completed: 2026-04-18*
