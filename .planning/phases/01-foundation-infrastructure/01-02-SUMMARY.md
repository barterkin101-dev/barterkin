---
phase: 01-foundation-infrastructure
plan: 02
subsystem: infra
tags: [nextjs, react, typescript, tailwindcss-v4, shadcn, new-york, webpack, next-font, app-router]

# Dependency graph
requires:
  - phase: 01-foundation-infrastructure
    provides: Plan 01 repo-init — .gitignore, .env.local.example, .planning/, legacy/, CLAUDE.md
provides:
  - Runnable Next.js 16.2.4 App Router scaffold
  - Tailwind v4 with Barterkin sage/forest/clay @theme tokens
  - @theme inline bridge for next/font CSS vars (PITFALLS Pitfall 4 guard)
  - shadcn new-york primitives (button, card, input, label) with data-slot
  - Inter (sans) + Lora (serif) via next/font/google
  - package.json scripts: dev, build (--webpack), start, lint, typecheck
  - @vercel/analytics wired into root layout
affects: [01-03-supabase-ssr, 01-04-pwa-serwist, 01-05-posthog-resend, 01-06-supabase-migrations, 01-07-testing-infra, 01-08-ci-gitleaks, 01-10-vercel-link-deploy]

# Tech tracking
tech-stack:
  added:
    - "next@16.2.4"
    - "react@19.2.4 / react-dom@19.2.4"
    - "typescript@^5 (5.9.3 resolved, strict mode on)"
    - "tailwindcss@^4 + @tailwindcss/postcss@^4"
    - "shadcn CLI 4.3.0 (new-york style, stone base color)"
    - "radix-ui (shadcn new-york Button Slot primitive)"
    - "lucide-react@1.8.0"
    - "tw-animate-css@1.4.0"
    - "@vercel/analytics@2.0.1"
    - "eslint@^9 + eslint-config-next@16.2.4"
  patterns:
    - "Tailwind v4 CSS-first: @import \"tailwindcss\" + @theme { --color-*: ... } instead of tailwind.config.js"
    - "@theme inline required to reference CSS vars defined elsewhere (next/font --font-sans); plain @theme can't resolve var() refs"
    - "shadcn new-york primitives carry data-slot attributes — the v4-era refactor marker"
    - "Palette is OKLCH (shadcn tokens) + sRGB hex (Barterkin brand tokens) — coexist in @theme blocks"
    - "build script uses --webpack instead of default turbopack so Plan 04 Serwist can drop in without rework (PITFALLS Pitfall 2)"

key-files:
  created:
    - "app/layout.tsx — Inter + Lora via next/font, Analytics wrapper, font-sans bg-sage-bg text-forest-deep body"
    - "app/page.tsx — Barterkin foundation placeholder (Card + 2 Button variants exercising palette)"
    - "app/globals.css — Barterkin palette @theme + @theme inline font bridge + shadcn :root/.dark tokens"
    - "components.json — shadcn config: new-york style, stone base color, cssVariables: true, lucide iconLibrary"
    - "components/ui/button.tsx, card.tsx, input.tsx, label.tsx — shadcn new-york primitives with data-slot"
    - "lib/utils.ts — cn() via clsx + tailwind-merge"
    - "package.json — engines pinned, build=next build --webpack, typecheck=tsc --noEmit"
    - "pnpm-lock.yaml, pnpm-workspace.yaml, next.config.ts, postcss.config.mjs, eslint.config.mjs, tsconfig.json"
    - "public/*.svg (scaffold assets), AGENTS.md (scaffold extra)"
  modified: []

key-decisions:
  - "shadcn CLI v4.3.0 used instead of planned v3.x — upstream moved; new-york style still available via registry"
  - "shadcn init defaulted to base-nova style + neutral base; manually overrode components.json to new-york + stone before running shadcn add, per PLAN acceptance criteria"
  - "next-env.d.ts intentionally NOT committed — already listed in .gitignore from Plan 01 (line 8); PLAN.md Task 3 command listed it but honouring gitignore per T-02-02 threat mitigation"
  - "Initial commit from prior partial session (42800db 'feat: initial commit') soft-reset and replaced with the PLAN.md-mandated message at 8d4680f"

patterns-established:
  - "Tailwind v4 @theme block defines Barterkin brand tokens; @theme inline bridges next/font vars + shadcn runtime-swappable tokens"
  - "shadcn primitives copy-pasted into components/ui/ via @/ alias (lib/utils cn() helper pattern)"
  - "pnpm 10.33.0 with corepack (engines >=9.0.0 allows forward-compat)"

requirements-completed: [FOUND-01, FOUND-02]

# Metrics
duration: ~22min (incl. shadcn upstream deviation handling + soft-reset)
completed: 2026-04-18
---

# Phase 01 Plan 02: Next.js Scaffold Summary

**Next.js 16.2.4 + Tailwind v4 + shadcn new-york (button/card/input/label) with Inter/Lora fonts and Barterkin sage/forest/clay palette wired as @theme tokens — build passes under webpack in 6.2s.**

## Performance

- **Duration:** ~22 min (Task 2 execution + Task 3 commit; Task 1 was pre-completed)
- **Started:** 2026-04-18T23:14:00Z (approx, this session's Task 2 work)
- **Completed:** 2026-04-18T23:36:00Z
- **Tasks:** 3 (Task 1 pre-completed; Tasks 2 + 3 executed this session)
- **Files modified:** 23 (all net-new in the 8d4680f commit)

## Accomplishments

- Scaffolded Next.js 16.2.4 App Router with React 19.2.4 + TypeScript strict into `~/barterkin` without clobbering Plan 01 artifacts (.planning/, legacy/, CLAUDE.md, .gitignore, README.md, .env.local.example).
- Ported the 7 sage/forest/clay brand tokens from `legacy/index.html` verbatim into Tailwind v4 `@theme { --color-* }` — all 7 verified present in served CSS at runtime.
- Bridged `next/font/google` `--font-sans` (Inter) + `--font-serif` (Lora) through `@theme inline` (PITFALLS Pitfall 4 guard; plain `@theme` cannot resolve `var(--font-sans)`).
- Installed shadcn new-york primitives (button, card, input, label) with `data-slot` attributes; button uses Radix UI `Slot` for `asChild` composition.
- Configured `next build --webpack` in package.json so Plan 04 (Serwist PWA) can drop in without compat rework (PITFALLS Pitfall 2).
- Placeholder home page exercises the full palette: Card with sage-pale bg + forest-mid border, Button variants in forest/sage-bg and clay outline. Renders "Barterkin foundation".
- `pnpm typecheck` exits 0. `pnpm build` exits 0 in 6.2s compile + 1.5s TS + 0.4s static-gen under webpack. `pnpm dev` serves HTTP 200 on `/` with body `Barterkin foundation`.
- Scaffold committed atomically at `8d4680f` and pushed to `origin/main`. Working tree clean, no `node_modules/` or `.next/` leakage into git index.

## Task Commits

Task 1 and Task 2 are bundled into a single scaffold commit per PLAN.md Task 3 (which requires one atomic `feat(foundation): scaffold Next.js 16.2 + Tailwind v4 + shadcn new-york` commit covering the whole plan):

1. **Tasks 1 + 2 + 3 (combined): scaffold + shadcn + commit** — `8d4680f` (feat)

**No separate plan-metadata commit** — PLAN.md specified a single commit for the plan; SUMMARY.md + STATE.md will be rolled into whatever the orchestrator's final-commit step emits.

## Files Created/Modified

**Created (all committed in 8d4680f):**
- `app/layout.tsx` — Inter + Lora via `next/font/google`, `<Analytics />` from `@vercel/analytics/next`, body classes `font-sans bg-sage-bg text-forest-deep min-h-screen antialiased`, `title: "Barterkin"`.
- `app/page.tsx` — Card + Button placeholder with Barterkin palette utility classes.
- `app/globals.css` — `@import "tailwindcss"` + `@import "tw-animate-css"` + `@custom-variant dark` + `@theme { --color-sage-*, --color-forest-*, --color-clay }` + `@theme inline` bridging next/font vars and shadcn runtime tokens + preserved shadcn `:root {}` / `.dark {}` oklch blocks + base layer `* { border-border outline-ring/50 }` / `body { bg-background text-foreground }`.
- `components.json` — `style: "new-york"`, `baseColor: "stone"`, `cssVariables: true`, `iconLibrary: "lucide"`, alias block per PLAN.
- `components/ui/button.tsx` — shadcn new-york Button with Radix `Slot` for asChild, CVA variants (default/destructive/outline/secondary/ghost/link + 8 sizes), `data-slot="button"`.
- `components/ui/card.tsx` — 7-part Card (Card/Header/Title/Description/Action/Content/Footer), each with `data-slot`.
- `components/ui/input.tsx` — `data-slot="input"`.
- `components/ui/label.tsx` — `data-slot="label"`.
- `lib/utils.ts` — `cn()` helper (clsx + tailwind-merge).
- `package.json` — engines (`node >=20`, `pnpm >=9`), scripts (`dev`, `build: next build --webpack`, `start`, `lint`, `typecheck: tsc --noEmit`), deps pinned at `next@16.2.4`, `react@19.2.4`.
- `pnpm-lock.yaml`, `pnpm-workspace.yaml`, `next.config.ts`, `postcss.config.mjs`, `eslint.config.mjs`, `tsconfig.json`.
- `public/*.svg` (file, globe, next, vercel, window — create-next-app defaults), `app/favicon.ico`.
- `AGENTS.md` (create-next-app extra, retained per task brief).

**Intentionally NOT committed:** `next-env.d.ts` — present in `.gitignore` from Plan 01 (line 8). PLAN.md Task 3 listed it, but honouring the Plan-01 `.gitignore` rule (T-02-02 threat mitigation) takes precedence. Next generates it on every build.

## Decisions Made

1. **shadcn CLI version** — PLAN.md referenced shadcn v3.x; the current CLI is v4.3.0 (`pnpm dlx shadcn@latest` resolved to this). Ran with v4.3.0; the `new-york` style remained available through the registry. Applied CLAUDE.md's "new-york + stone" intent by editing `components.json` post-init.
2. **First shadcn init produced `base-nova` + `neutral`** — v4.3.0's `--defaults` preset defaults to `base-nova` style (Base UI primitives) with `neutral` base color. Rolled that config back by rewriting `components.json` to `style: "new-york" / baseColor: "stone"`, deleted the base-nova button, re-ran `shadcn add button card input label --yes --overwrite` which pulled from the legacy `new-york` registry (Radix-based, `data-slot`-annotated). Verified by checking `button.tsx` imports `radix-ui` and not `@base-ui/react`.
3. **`next-env.d.ts` excluded from commit** — PLAN.md Task 3 listed it in the `git add` command, but Plan 01's `.gitignore` explicitly excludes it. Honouring `.gitignore` (per threat T-02-05 which requires Plan-01 gitignore to remain intact) and the Next.js convention that `next-env.d.ts` is auto-generated and not committed.
4. **Soft-reset of prior `feat: initial commit`** — A previous session had committed scaffold files under `feat: initial commit` (SHA 42800db). That did NOT match PLAN.md Task 3's required message. Soft-reset (keeping index), re-staged with full Task-2 edits, and committed with the exact PLAN.md message at 8d4680f. Commit was not pushed before reset, so no rewrite of public history.
5. **shadcn base palette kept at shadcn defaults (oklch neutral ~stone)** — PLAN.md says "stone base color" but the shadcn v4.3.0 new-york registry currently emits generic neutral-ish oklch values under `--background`, `--foreground`, etc. These are the tokens shadcn components consume; they don't conflict with the Barterkin sage/forest/clay brand tokens which live in their own `--color-sage-*` namespace.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 — Blocking] `shadcn init` CLI flags renamed in v4.3.0**
- **Found during:** Task 2 Step 1
- **Issue:** PLAN.md commanded `pnpm dlx shadcn@latest init --yes --force-css-conflict --base-color=stone`. The `--force-css-conflict` flag is unknown in shadcn CLI 4.3.0 and `--base-color` has been removed (the init is now preset-driven via `-p <name>` or `-d/--defaults`). Command exited with `error: unknown option '--force-css-conflict'`.
- **Fix:** Ran `pnpm dlx shadcn@latest init --defaults --force --cwd /Users/ashleyakbar/barterkin`. Then rewrote `components.json` to `style: "new-york"` + `baseColor: "stone"` + `iconLibrary: "lucide"` + the exact alias block from PLAN.md. Deleted the base-nova-style `components/ui/button.tsx` and re-ran `pnpm dlx shadcn@latest add button card input label --yes --overwrite` which pulled the new-york (Radix-based) primitives from the legacy registry.
- **Files modified:** components.json, components/ui/button.tsx (re-emitted), components/ui/{card,input,label}.tsx (newly added), lib/utils.ts, app/globals.css (init wrote shadcn tokens).
- **Verification:** `jq -r .style components.json` returns `new-york`; `grep 'data-slot="button"' components/ui/button.tsx` matches; `grep 'radix-ui' components/ui/button.tsx` matches (confirms Radix-based, not Base UI).
- **Committed in:** 8d4680f (as part of the single scaffold commit).

**2. [Rule 1 — Bug] shadcn init left a broken `@import "shadcn/tailwind.css"` in globals.css**
- **Found during:** Task 2 Step 3
- **Issue:** `shadcn init --defaults` wrote `@import "shadcn/tailwind.css"` at line 3 of `app/globals.css`. The `shadcn` npm package does not ship a `tailwind.css` entry; this import would fail at Tailwind-v4 PostCSS resolution and crash the build.
- **Fix:** Fully rewrote `app/globals.css` per PLAN.md Task 2 Step 3 (no `shadcn/tailwind.css` import; only `@import "tailwindcss"` + `@import "tw-animate-css"`).
- **Files modified:** app/globals.css.
- **Verification:** `pnpm build` exits 0 with webpack. Served CSS at `/_next/static/chunks/...` contains all 7 `--color-*` palette vars.
- **Committed in:** 8d4680f.

**3. [Rule 2 — Missing critical] shadcn tokens (`--color-card`, `--color-primary`, etc.) needed `@theme inline` bridges for component utilities to resolve**
- **Found during:** Task 2 Step 3 (while reconciling PLAN.md globals.css shape with shadcn-emitted `:root`)
- **Issue:** PLAN.md's globals.css skeleton only included `@theme inline` for `--font-sans` / `--font-serif`. But shadcn new-york components use utilities like `bg-card`, `bg-primary`, `border-border`, `ring-destructive` which expect Tailwind to expose `--color-card`, `--color-primary` etc. at the `@theme` layer. Without the `@theme inline` bridges, those utilities would not resolve — the Button / Card would fall back to unstyled.
- **Fix:** Added the full shadcn token bridge block inside the same `@theme inline` as the font vars, mapping `--color-background` → `var(--background)`, `--color-card` → `var(--card)`, …, `--color-ring` → `var(--ring)`, plus `--radius-*` bridges. This is the canonical shadcn v4 / Tailwind v4 pattern.
- **Files modified:** app/globals.css.
- **Verification:** `pnpm build` exits 0 (no unresolved utility errors). Served page rendered with shadcn Card + Button variants visible and correctly styled.
- **Committed in:** 8d4680f.

**4. [Rule 3 — Blocking] Previous session's `feat: initial commit` (42800db) did not match PLAN.md Task 3 mandated message**
- **Found during:** Task 3, pre-commit git-status inspection
- **Issue:** HEAD was already at `42800db feat: initial commit` containing scaffold files with a non-conformant message. PLAN.md Task 3 acceptance criterion requires `git log --oneline -1` to show `feat(foundation): scaffold Next.js 16.2 + Tailwind v4 + shadcn new-york`. Commit was local only (unpushed).
- **Fix:** `git reset --soft HEAD~1` to keep staged tree, staged the Task-2 modifications + new primitives, committed with the exact PLAN.md message block (+Co-Authored-By trailer), pushed to origin/main. Rewrote local history only — no force push needed since nothing had been pushed.
- **Files modified:** (no file changes — git metadata only)
- **Verification:** `git log --oneline -1` shows `8d4680f feat(foundation): scaffold Next.js 16.2 + Tailwind v4 + shadcn new-york`. `git status --porcelain` is empty. `git log origin/main..HEAD --oneline` is empty.
- **Committed in:** 8d4680f (the replacement commit).

---

**Total deviations:** 4 auto-fixed (1 missing-critical for shadcn tokens, 2 blocking for CLI-version drift and commit-message mismatch, 1 bug for broken shadcn import).

**Impact on plan:** All four were upstream-drift artifacts (shadcn v4.3 changed its init surface + output shape + token bridging convention; a stale `feat: initial commit` existed from a prior session). Zero semantic scope change: PLAN.md's acceptance criteria are still met verbatim.

## Threat Flags

None — scaffold introduces no network endpoints, auth paths, file-access patterns, or schema changes beyond what PLAN.md's threat register already covers (T-02-01 through T-02-06).

## Issues Encountered

- **shadcn CLI v3→v4.3 upgrade churn.** PLAN.md's research was written against shadcn 3.x; v4.3.0 introduced base-nova style (Base UI), preset-driven init, and renamed `--base-color` to `-p <preset>`. Resolved by manually editing `components.json` post-init to the PLAN-mandated new-york + stone shape, then re-adding primitives from the still-live legacy `new-york` registry.
- **Lucide-react 1.8.0, not 0.4xx as CLAUDE.md says.** The lucide-react package has since shipped a major 1.x line; 1.8.0 is the current release. No action — modern versions are API-compatible for the primitives shadcn uses.
- **pnpm 10.33.0 instead of 9.x.** `engines.pnpm: ">=9.0.0"` satisfied. No action.

## User Setup Required

None for this plan. External-service setup (Supabase, Vercel, Cloudflare, Resend) lands in Plans 03, 05, 09, 10 per ROADMAP.md.

## Next Phase Readiness

- **Plan 01-03 (Supabase SSR):** Ready. Has `@/` alias, tsconfig strict mode, App Router, pnpm 10.
- **Plan 01-04 (PWA Serwist):** Ready. `next build --webpack` already configured so Serwist drops in with no compat rework.
- **Plan 01-05 (PostHog + Resend):** Ready. `app/layout.tsx` has the Analytics wrapper — PostHog provider follows the same root-layout injection pattern.
- **Plan 01-06 (Supabase migrations):** Unblocked (independent of scaffold).
- **Plan 01-07 (Testing infra):** Ready. Vitest will consume the `@/` alias; Playwright will target `http://localhost:3000` already verified serving.

---

## Self-Check: PASSED

**Verified files exist:**
- `/Users/ashleyakbar/barterkin/app/layout.tsx` — FOUND
- `/Users/ashleyakbar/barterkin/app/page.tsx` — FOUND
- `/Users/ashleyakbar/barterkin/app/globals.css` — FOUND
- `/Users/ashleyakbar/barterkin/components.json` — FOUND
- `/Users/ashleyakbar/barterkin/components/ui/button.tsx` — FOUND
- `/Users/ashleyakbar/barterkin/components/ui/card.tsx` — FOUND
- `/Users/ashleyakbar/barterkin/components/ui/input.tsx` — FOUND
- `/Users/ashleyakbar/barterkin/components/ui/label.tsx` — FOUND
- `/Users/ashleyakbar/barterkin/lib/utils.ts` — FOUND
- `/Users/ashleyakbar/barterkin/package.json` — FOUND

**Verified commits exist:**
- `8d4680f` — FOUND (feat(foundation): scaffold Next.js 16.2 + Tailwind v4 + shadcn new-york)

**Verified acceptance criteria (end-to-end):**
- `pnpm typecheck` → exit 0 ✓
- `pnpm build` → exit 0 under webpack (Compiled in 6.2s + TS 1.5s + static-gen 0.4s) ✓
- `pnpm dev` → HTTP 200 on `http://localhost:3000` ✓
- Served HTML contains `Barterkin foundation` ✓
- Served CSS contains 7 distinct `--color-(sage-bg|sage-light|sage-pale|forest|forest-deep|forest-mid|clay)` vars ✓
- `jq -r .style components.json` → `new-york` ✓
- `grep 'data-slot="button"' components/ui/button.tsx` → match ✓
- `jq -r .scripts.build package.json` → `next build --webpack` ✓
- `grep '@theme inline' app/globals.css` → match ✓
- `git status --porcelain` → empty ✓
- `git log origin/main..HEAD --oneline` → empty (pushed) ✓
- `git ls-files | grep '^node_modules/'` → 0 ✓
- `git ls-files | grep '^\.next/'` → 0 ✓

---

*Phase: 01-foundation-infrastructure*
*Plan: 02-nextjs-scaffold*
*Completed: 2026-04-18*
