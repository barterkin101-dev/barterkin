---
phase: 01-foundation-infrastructure
plan: 07
plan_name: testing-infra
status: complete
completed: 2026-04-19
---

# Plan 07 — Testing Infrastructure Summary

## What Was Done

Installed and configured Vitest (unit/component) and Playwright (e2e), and wrote one trivial passing test for each framework so CI (Plan 08) has real commands to run.

## Task 1: Vitest + Unit Smoke Test

- Installed `vitest@4.1.4`, `@vitest/ui@4.1.4`, `@testing-library/react@16.3.2`, `@testing-library/jest-dom@6.9.1`, `@testing-library/user-event@14.6.1`, `jsdom@29.0.2`, `@vitejs/plugin-react@6.0.1` as devDependencies
- Created `vitest.config.ts` with `environment: 'jsdom'`, `globals: true`, `setupFiles: ['./vitest.setup.ts']`, `include: ['tests/unit/**/*.{test,spec}.{ts,tsx}']`
- Created `vitest.setup.ts` importing `@testing-library/jest-dom/vitest`
- Created `tests/unit/smoke.test.ts` with 2 trivial tests (`1+1=2`, `document.createElement`)
- Extended `tsconfig.json` `compilerOptions.types` with `"vitest/globals"` and `"@testing-library/jest-dom"`
- Added scripts: `"test": "vitest run"`, `"test:watch": "vitest"`, `"test:ui": "vitest --ui"` — no watch flag on CI-facing `test` script

**Result:** `pnpm test --run` passes — 1 file, 2 tests, 0 failed

## Task 2: Playwright + E2E Smoke Test

- Installed `@playwright/test@1.59.1` as devDependency
- Ran `pnpm exec playwright install --with-deps chromium` (~165 MB Chromium for Testing + 92 MB headless shell downloaded to `~/Library/Caches/ms-playwright/`)
- Created `playwright.config.ts` with:
  - `testDir: 'tests/e2e'`
  - `webServer.command: 'pnpm start'` (production build required first)
  - `webServer.reuseExistingServer: !process.env.CI` (local dev can reuse `pnpm dev`)
  - `webServer.timeout: 120_000`
  - `baseURL: 'http://localhost:3000'`
  - Single `chromium` project
- Created `tests/e2e/smoke.spec.ts` with 2 tests:
  1. Asserts `getByText('Barterkin foundation')` is visible — uses `getByText` (not `getByRole('heading')`) because `shadcn CardTitle` renders as a `<div>`, not a semantic heading element
  2. Asserts `getByRole('button', { name: /fire posthog test_event/i })` is visible
- Added scripts: `"e2e": "playwright test"`, `"e2e:ui": "playwright test --ui"`, `"e2e:install": "playwright install --with-deps chromium"` — no `--ui` flag on CI-facing `e2e` script
- Confirmed `.gitignore` already excludes `/playwright-report/`, `/playwright/.cache/`, `/test-results/` (from Plan 01)

**Result:** `pnpm build && pnpm e2e` passes — 2 tests, 0 failed

## Key Finding

The `shadcn CardTitle` component in the installed version renders as a `<div>` (ARIA role `generic`), not an `<h3>`/heading. The plan spec says to assert on `'Barterkin foundation'` text — adapted the locator to `getByText()` which matches the actual DOM output. The plan's intent (asserting the card renders) is fully satisfied.

## Acceptance Criteria — All Green

- `vitest@4.1.4` installed (satisfies `^3.0.0` minimum from plan)
- `@playwright/test@1.59.1` installed (satisfies `^1.x`)
- `jsdom@29.0.2` installed
- `@testing-library/react@16.3.2` installed
- `scripts.test = "vitest run"` (no watch flag)
- `scripts.e2e = "playwright test"` (no `--ui`)
- `vitest.config.ts` exists with `environment: 'jsdom'` and `setupFiles`
- `vitest.setup.ts` exists with `@testing-library/jest-dom/vitest`
- `playwright.config.ts` exists with `webServer`, `command: 'pnpm start'`, `reuseExistingServer: !process.env.CI`
- `tests/unit/smoke.test.ts` exists with `expect(1 + 1).toBe(2)`
- `tests/e2e/smoke.spec.ts` exists with `'Barterkin foundation'` assertion
- `tsconfig.json` includes `"vitest/globals"` in `types`
- `pnpm typecheck` passes
- `pnpm test --run` passes (2 tests)
- `pnpm e2e` passes (2 tests, against `pnpm start` production server)
- Playwright artefacts (`playwright-report/`, `test-results/`) not tracked in git

## Versions Installed

| Package | Version |
|---------|---------|
| vitest | 4.1.4 |
| @vitest/ui | 4.1.4 |
| @testing-library/react | 16.3.2 |
| @testing-library/jest-dom | 6.9.1 |
| @testing-library/user-event | 14.6.1 |
| jsdom | 29.0.2 |
| @vitejs/plugin-react | 6.0.1 |
| @playwright/test | 1.59.1 |
| Chromium (for testing) | 147.0.7727.15 |

## Commit SHA

To be populated after commit.
