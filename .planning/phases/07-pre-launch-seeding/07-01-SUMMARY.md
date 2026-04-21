---
phase: 07-pre-launch-seeding
plan: 01
subsystem: pre-launch-seeding
tags: [outreach, consent, seeding, test-scaffolds, wave-0]
requires:
  - legacy/index.html (source of 11 founding-member listing names + TikTok handles)
  - tests/unit/contact-eligibility.test.ts (env-gate pattern)
  - tests/e2e/landing-founding-strip.spec.ts (env-gate pattern)
  - tests/e2e/fixtures/directory-seed.ts (seedPublishedProfile with founding_member flag)
provides:
  - SEED-01 outreach template (DM variants + Google Form spec)
  - SEED-02 consent form field list
  - SEED-03 Wave 0 unit-test scaffold (idempotency + happy-path)
  - SEED-04 Wave 0 E2E test scaffold (DirectoryCard + /m/[username] badge)
affects:
  - scripts/seed-founding-members.mjs (will be authored by Plan 02, test file points at it)
  - components/profile/FoundingMemberBadge.tsx (will be authored by Plan 03, test file asserts it)
tech-stack:
  added: []
  patterns:
    - env-gate via `const hasAll = Boolean(URL && SERVICE)` + `hasAll ? describe : describe.skip`
    - Playwright `test.fixme` for Wave 0 placeholder bodies (reports as "fixme" in Playwright output)
    - Vitest `it.todo` for Wave 0 placeholder bodies (reports as "todo" in Vitest output)
key-files:
  created:
    - docs/outreach-template.md
    - tests/unit/seed-founding-members.test.ts
    - tests/e2e/founding-badge.spec.ts
  modified: []
decisions:
  - Kept pre-fill URL field ID as `{TIKTOK_FIELD_ID}` placeholder (Ashley fills once after form creation; no assumption of a specific Google Forms entry ID)
  - Used `test.fixme` (not `test.skip` at describe level) so Plan 03 executor sees two clearly-named placeholder tests in the Playwright run
  - Added `void createVerifiedUser; void seedPublishedProfile; void cleanupUser` inside each Playwright stub body to keep the imports compile-verified without TS unused-import errors while fixme keeps bodies inert
metrics:
  duration: "~5 minutes"
  completed: "2026-04-21"
---

# Phase 07 Plan 01: Outreach Template + Wave 0 Test Scaffolds Summary

Shipped the operational outreach runbook (`docs/outreach-template.md`) with 11 distinct per-listing DM hooks, Google Form spec, and tracking table; plus env-gated test scaffolds for the seed script (Plan 02) and founding-member badge (Plan 03) so every downstream verify command targets a file that already compiles.

## Context

Phase 7's first wave is pure scaffolding to satisfy Nyquist compliance (VALIDATION.md §Wave 0): every automated verify referenced in Plans 02 and 03 must point at a file that already exists. Without this plan, Plan 02's `pnpm vitest run tests/unit/seed-founding-members.test.ts` and Plan 03's `pnpm exec playwright test tests/e2e/founding-badge.spec.ts` both fail at the file-exists level.

The outreach template is the one doc Ashley will open while DMing the 11 legacy `index.html` listings. Everything she needs — base template, per-listing personal hooks, Google Form field list, Resend verification checklist, tracking table, sending order — is consolidated there.

## What Shipped

### 1. `docs/outreach-template.md` (SEED-01 + SEED-02 — 151 lines)

Nine sections: overview, base DM template with `{placeholder}` notation, per-listing personalization table (11 distinct hooks — Kerry's, GG's, Yellow Butterfly, etc.), Google Form field spec with URL pre-fill guidance, hello@barterkin.com verification preconditions, tracking table pre-populated with all 11 listings, cutoff date (`2026-06-01` per Pitfall 7), sending order/pacing with Kerry as Day 0 anchor, and FAQ anticipations. Every one of the 11 legacy listings appears with its TikTok handle verbatim; Kerry's ANCHOR role per D-11 is flagged in both the personalization and tracking tables.

### 2. `tests/unit/seed-founding-members.test.ts` (SEED-03 Wave 0 — 44 lines)

Mirrors `tests/unit/contact-eligibility.test.ts` env-gate pattern. `describe.skip` when env vars absent; otherwise `beforeAll` creates the admin Supabase client and `afterAll` deletes any leftover test user (cascade removes profile + skills). Two `it.todo` stubs name the two acceptance criteria Plan 02 will satisfy: happy-path seed and idempotency. `pnpm test tests/unit/seed-founding-members.test.ts` exits 0 reporting "2 todo" (or skipped when env absent).

### 3. `tests/e2e/founding-badge.spec.ts` (SEED-04 Wave 0 — 48 lines)

Mirrors `tests/e2e/landing-founding-strip.spec.ts` env-gate pattern. Two `test.fixme` stubs — one for the `/directory` card badge, one for the `/m/[username]` detail-page badge — both reference the exact `Founding member` copy from UI-SPEC. Imports `createVerifiedUser`, `seedPublishedProfile`, `cleanupUser` from `./fixtures/directory-seed` to compile-verify the fixture surface Plan 03 will use. `playwright test --list` enumerates 2 tests (4 rows across chromium + iphone-se projects).

## Acceptance & Verification

| Gate | Command | Result |
|------|---------|--------|
| All 3 files exist | `test -f docs/... && test -f tests/unit/... && test -f tests/e2e/...` | PASS |
| TypeScript compiles | `tsc --noEmit` (equivalent to `pnpm typecheck`) | PASS (exit 0) |
| Vitest runs | `vitest run tests/unit/seed-founding-members.test.ts` | PASS — 2 todo reported |
| Playwright lists | `playwright test tests/e2e/founding-badge.spec.ts --list` | PASS — 4 tests listed (2 × projects) |
| "Founding member" copy cross-ref | `grep -c 'Founding member' <spec> <doc>` | 4 total hits (2 each) |

Task-level grep acceptance also satisfied:
- `docs/outreach-template.md`: 9 top-level headings (≥7), `hello@barterkin.com` ×5 (≥2), Kerry ×7 / `@kerryscountrylife` ×2 (≥1), `{GOOGLE_FORM_URL}` ×2 (≥1), 151 lines ∈ [150, 300], 11 listings referenced (27 total hits across the personalization + tracking tables), County-required ×4, decline ×1, `2026-06-01` ×1.
- `tests/unit/seed-founding-members.test.ts`: `it.todo(` ×2 exactly, `from 'vitest'` ×1, `from '@supabase/supabase-js'` ×1, `hasAll = Boolean(URL && SERVICE)` ×1, `hasAll ? describe : describe.skip` ×1.
- `tests/e2e/founding-badge.spec.ts`: `test.fixme(` ×2 exactly, `from '@playwright/test'` ×1, `from './fixtures/directory-seed'` ×1, fixture imports ×3+, `const hasEnv` ×1, `Founding member` ×2.

## Commits

| Task | Hash | Message |
|------|------|---------|
| 1 | aa8b408 | feat(07-01): add docs/outreach-template.md for founding-member outreach |
| 2 | b5b71f6 | test(07-01): add env-gated SEED-03 test stub for seed-founding-members |
| 3 | 3c26c0a | test(07-01): add env-gated SEED-04 Playwright stub for founding-member badge |

## Deviations from Plan

**1. [Rule 2 - Critical Functionality] Added `void createVerifiedUser; void seedPublishedProfile; void cleanupUser` inside Playwright stub bodies.**
- **Found during:** Task 3 TypeScript compile
- **Issue:** The plan's exact file content imports the three fixtures at module scope, but the stubbed `test.fixme` bodies only reference `expect.soft(page.url())`. Under strict TS / Next 16 tsconfig this could surface as unused-import warnings and Plan 03 executors would chase a false-positive.
- **Fix:** Added `void createVerifiedUser`, `void seedPublishedProfile`, `void cleanupUser` inside each stub body. Zero runtime effect (fixme never executes), but the imports are now verified by the TS compiler as touched, matching the plan's intent ("confirms the fixture compile-path works").
- **Files modified:** tests/e2e/founding-badge.spec.ts
- **Commit:** 3c26c0a

**2. [Rule 3 - Blocking] Symlinked `node_modules` from parent repo into the worktree.**
- **Found during:** Task 2 verification (`pnpm test` → "vitest: command not found")
- **Issue:** Parallel-executor worktrees don't carry `node_modules`; `pnpm` inside the worktree wants to install, which would conflict with sibling agents.
- **Fix:** `ln -s /Users/ashleyakbar/barterkin/node_modules node_modules` — read-only symlink reuses the already-installed dev tools (vitest 4.1.4, @playwright/test). No install performed.
- **Files modified:** none tracked in git; symlink is untracked and worktree-local.
- **Commit:** none (out-of-scope housekeeping; symlink is in worktree only)

**3. [Rule 1 - Bug prevention] Rephrased docstring comments to stop `grep -c 'it.todo('` / `grep -c 'test.fixme('` from matching the prose mention inside the file header.**
- **Found during:** Task 2 + Task 3 grep acceptance checks (initially returned 3 matches each; spec required exactly 2)
- **Issue:** The plan-supplied file content included prose mentions `test bodies are stubbed with 'it.todo(...)'` / `'test.fixme(...)'` inside the opening comment. These matched the grep acceptance pattern and broke the "exactly 2" check.
- **Fix:** Replaced the prose with "stubbed with todo markers" / "stubbed with fixme markers" — identical meaning, no accidental grep hit.
- **Files modified:** tests/unit/seed-founding-members.test.ts, tests/e2e/founding-badge.spec.ts
- **Commit:** Rolled into b5b71f6 and 3c26c0a respectively (same commit as the file creation).

No auth gates. No architectural changes (Rule 4). No out-of-scope items.

## Handoff Notes

### Plan 02 (Seed script — SEED-03)

- Edit `tests/unit/seed-founding-members.test.ts` — replace the two `it.todo(...)` calls with real `it(...)` bodies. The existing `beforeAll` + `afterAll` scaffold and `testEmail` variable are ready to reuse.
- The test file expects `scripts/seed-founding-members.mjs` to expose a callable interface (dynamic import is the simplest path; see PATTERNS.md §"tests/unit/seed-founding-members.test.ts" lines 355-391 for the recommended function-extract approach).
- Plan 02 also must add `CUTOFF_DATE = '2026-06-01'` and the `--force` flag per Section 7 of `docs/outreach-template.md`.

### Plan 03 (Founding-member badge — SEED-04)

- Edit `tests/e2e/founding-badge.spec.ts` — replace the two `test.fixme(...)` calls with real `test(...)` bodies. The fixture imports (`createVerifiedUser`, `seedPublishedProfile`, `cleanupUser`) are ready; `seedPublishedProfile` already accepts `founding_member: boolean` (verified at `tests/e2e/fixtures/directory-seed.ts:40`).
- Assert the exact copy `Founding member` (sentence case, per `07-UI-SPEC.md`). Both stubs already reference the literal string in their titles.
- Badge implementation location: `components/profile/FoundingMemberBadge.tsx` (new file) + integration in DirectoryCard (`/directory`) and ProfileDetail (`/m/[username]`) per PATTERNS.md.

### Plan 04 (Outreach execution — SEED-05)

- Use `docs/outreach-template.md` verbatim. Ashley works top-down:
  1. Complete the Section 5 verification checklist before sending DM #1
  2. Create the Google Form per Section 4 and substitute `{GOOGLE_FORM_URL}` in the base template
  3. Look up the TikTok field's `entry.XXXXXXX` ID once; substitute `{TIKTOK_FIELD_ID}` in each per-listing URL
  4. Follow the Section 8 sending order (Kerry Day 0, Paulding cluster Day 0-1, geographic reach Day 2, unknown-county trio Day 3, GG last Day 4-5)
  5. Update the Section 6 tracking table after each DM and commit the change so there's an audit trail
- When seeding runs (Plan 02 invoked per responder), come back to this doc and fill the "Seeded? (Plan 04)" column.

## Known Stubs

The two test bodies are intentional stubs for downstream plans (Plan 02 and Plan 03 respectively). Both carry clear handoff notes in-file and in this SUMMARY. No stubs that prevent the plan's goal — the goal IS to land the scaffolds.

## Self-Check: PASSED

- FOUND: docs/outreach-template.md (151 lines)
- FOUND: tests/unit/seed-founding-members.test.ts (44 lines)
- FOUND: tests/e2e/founding-badge.spec.ts (48 lines)
- FOUND: commit aa8b408 (feat 07-01 outreach template)
- FOUND: commit b5b71f6 (test 07-01 vitest stub)
- FOUND: commit 3c26c0a (test 07-01 playwright stub)
- Vitest exits 0 reporting 2 todo
- Playwright --list exits 0 reporting 2 tests × 2 projects = 4 rows
- pnpm typecheck (tsc --noEmit) exits 0
