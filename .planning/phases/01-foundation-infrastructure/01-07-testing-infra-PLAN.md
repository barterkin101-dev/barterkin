---
phase: 01-foundation-infrastructure
plan: 07
plan_number: 7
plan_name: testing-infra
type: execute
wave: 5
depends_on: [5]
files_modified:
  - /Users/ashleyakbar/barterkin/package.json
  - /Users/ashleyakbar/barterkin/pnpm-lock.yaml
  - /Users/ashleyakbar/barterkin/vitest.config.ts
  - /Users/ashleyakbar/barterkin/vitest.setup.ts
  - /Users/ashleyakbar/barterkin/playwright.config.ts
  - /Users/ashleyakbar/barterkin/tests/unit/smoke.test.ts
  - /Users/ashleyakbar/barterkin/tests/e2e/smoke.spec.ts
  - /Users/ashleyakbar/barterkin/tsconfig.json
autonomous: true
requirements:
  - FOUND-11
must_haves:
  truths:
    - "vitest@3, @vitest/ui, @testing-library/react, @testing-library/jest-dom, jsdom, @playwright/test@1 all installed as devDependencies"
    - "vitest.config.ts + vitest.setup.ts exist; package.json has `test` and `test:watch` scripts"
    - "playwright.config.ts exists with webServer booting `pnpm dev`; package.json has `e2e` script"
    - "tests/unit/smoke.test.ts passes under `pnpm test --run`"
    - "tests/e2e/smoke.spec.ts passes under `pnpm e2e` (loads localhost:3000 and asserts 'Barterkin foundation' is rendered)"
    - "No watch flags (`--watch`, `-w`) in CI-facing scripts (VALIDATION.md Sign-Off item)"
    - "tsconfig.json excludes test files from the build + includes vitest/globals types"
  artifacts:
    - path: "/Users/ashleyakbar/barterkin/vitest.config.ts"
      provides: "Vitest config with jsdom, setup file, and tests/unit include pattern"
      contains: "environment: 'jsdom'"
    - path: "/Users/ashleyakbar/barterkin/vitest.setup.ts"
      provides: "Testing Library jest-dom matchers + any global mocks"
      contains: "@testing-library/jest-dom"
    - path: "/Users/ashleyakbar/barterkin/playwright.config.ts"
      provides: "Playwright config with baseURL + webServer"
      contains: "webServer"
    - path: "/Users/ashleyakbar/barterkin/tests/unit/smoke.test.ts"
      provides: "Trivial passing unit test"
      contains: "expect("
    - path: "/Users/ashleyakbar/barterkin/tests/e2e/smoke.spec.ts"
      provides: "Trivial Playwright test hitting http://localhost:3000"
      contains: "await page.goto"
  key_links:
    - from: "package.json scripts"
      to: "vitest.config.ts"
      via: "\"test\": \"vitest run\" — no --watch in CI mode"
      pattern: "\"test\": \"vitest run\""
    - from: "playwright.config.ts webServer"
      to: "pnpm dev on 3000"
      via: "webServer.command starts the dev server"
      pattern: "webServer"
---

<objective>
Install and configure Vitest (unit/component) and Playwright (e2e). Write one trivial passing test for each so CI (Plan 08) has real commands to run. VALIDATION.md Wave 0 explicitly requires this infra to exist before any FOUND-XX task can have a meaningful `<automated>` verify block.

Purpose: The VALIDATION.md gate says "Wave 0 must create `tests/smoke.test.ts` first" before any task relies on `pnpm test`. Plan 07 is the concrete materialisation of that gate — after it, Plan 08 can legitimately put `pnpm test` in `.github/workflows/ci.yml` and later phases can add real tests against a known-working framework.

Output: `pnpm test --run` passes; `pnpm e2e` passes against a locally-running `pnpm dev`; scripts exist in package.json; tsconfig includes test-friendly types.
</objective>

<execution_context>
@$HOME/.claude/get-shit-done/workflows/execute-plan.md
@$HOME/.claude/get-shit-done/templates/summary.md
</execution_context>

<context>
@/Users/ashleyakbar/barterkin/.planning/phases/01-foundation-infrastructure/01-VALIDATION.md
@/Users/ashleyakbar/barterkin/.planning/research/STACK.md
@/Users/ashleyakbar/barterkin/package.json
@/Users/ashleyakbar/barterkin/tsconfig.json
@/Users/ashleyakbar/barterkin/.planning/phases/01-foundation-infrastructure/01-05-SUMMARY.md

<interfaces>
Package versions (RESEARCH §Supporting dev):
- `vitest`: `^3.0.0`
- `@vitest/ui`: `^3.0.0`
- `@testing-library/react`: `^16.x`
- `@testing-library/jest-dom`: `^6.x`
- `jsdom`: `^25.x` or later
- `@playwright/test`: `^1.x` (latest)

Scripts to add to package.json:
```json
{
  "test": "vitest run",
  "test:watch": "vitest",
  "test:ui": "vitest --ui",
  "e2e": "playwright test",
  "e2e:ui": "playwright test --ui",
  "e2e:install": "playwright install --with-deps chromium"
}
```

VALIDATION.md gate (line 77): "No watch-mode flags (`--watch`, `-w`) in CI commands." The `test` script MUST be `vitest run` (not `vitest`); `e2e` MUST be `playwright test` (not `playwright test --ui`).

Playwright browser install is a heavyweight step (~250MB Chromium). For local dev the `e2e:install` script runs `playwright install --with-deps chromium` once; CI gets chromium via `microsoft/playwright-github-action@v1` (Plan 08 handles this).

Playwright config must run against a production build in CI (not Turbopack dev) so the e2e suite exercises the same bundler the production site ships with. Local dev is the only place we may see `pnpm dev` — `reuseExistingServer: !process.env.CI` allows a developer to run `pnpm dev` themselves and point Playwright at it. In CI, Playwright boots `pnpm start` after a prior `pnpm build` step (see Plan 08 e2e job):
```ts
webServer: {
  command: 'pnpm start',
  url: 'http://localhost:3000',
  timeout: 120_000,
  reuseExistingServer: !process.env.CI,
}
```
Note: `pnpm start` requires `pnpm build` to have run first; CI's e2e job (Plan 08) chains them explicitly. For local dev, run `pnpm build && pnpm start` (or just `pnpm dev` and let Playwright attach via `reuseExistingServer`).
</interfaces>
</context>

<tasks>

<task type="auto" tdd="false">
  <name>Task 1: Install Vitest + write unit config + smoke test</name>
  <files>
    - /Users/ashleyakbar/barterkin/package.json
    - /Users/ashleyakbar/barterkin/pnpm-lock.yaml
    - /Users/ashleyakbar/barterkin/vitest.config.ts
    - /Users/ashleyakbar/barterkin/vitest.setup.ts
    - /Users/ashleyakbar/barterkin/tests/unit/smoke.test.ts
    - /Users/ashleyakbar/barterkin/tsconfig.json
  </files>
  <read_first>
    - /Users/ashleyakbar/barterkin/tsconfig.json (current — need to extend `types`)
    - /Users/ashleyakbar/barterkin/package.json (scripts — need to add test commands)
    - /Users/ashleyakbar/barterkin/.planning/phases/01-foundation-infrastructure/01-VALIDATION.md (Wave 0 list + no-watch rule)
  </read_first>
  <action>
  Step 1 — Install Vitest + Testing Library + jsdom:
  ```bash
  cd /Users/ashleyakbar/barterkin
  pnpm add -D vitest @vitest/ui @testing-library/react @testing-library/jest-dom @testing-library/user-event jsdom @vitejs/plugin-react
  ```
  (`@vitejs/plugin-react` is required for Vitest to transform JSX in tests.)

  Step 2 — Create `vitest.config.ts`:
  ```ts
  import { defineConfig } from 'vitest/config'
  import react from '@vitejs/plugin-react'
  import path from 'node:path'

  export default defineConfig({
    plugins: [react()],
    test: {
      environment: 'jsdom',
      globals: true,
      setupFiles: ['./vitest.setup.ts'],
      include: ['tests/unit/**/*.{test,spec}.{ts,tsx}'],
      exclude: ['tests/e2e/**', 'node_modules/**', '.next/**'],
      css: true,
    },
    resolve: {
      alias: {
        '@': path.resolve(__dirname, './'),
      },
    },
  })
  ```

  Step 3 — Create `vitest.setup.ts`:
  ```ts
  import '@testing-library/jest-dom/vitest'
  ```

  Step 4 — Create `tests/unit/smoke.test.ts`:
  ```ts
  import { describe, it, expect } from 'vitest'

  describe('smoke', () => {
    it('vitest is wired', () => {
      expect(1 + 1).toBe(2)
    })

    it('jsdom document is available', () => {
      const el = document.createElement('div')
      el.textContent = 'Barterkin'
      expect(el.textContent).toBe('Barterkin')
    })
  })
  ```

  Step 5 — Extend `tsconfig.json` to (a) exclude tests from the build output and (b) include vitest globals so test files typecheck. Use Edit tool to modify — preserve the rest of the config:
  - In `compilerOptions.types`, add `"vitest/globals"` and `"@testing-library/jest-dom"` (merge with any existing types array; if no `types` present, add it).
  - In top-level `include`, confirm it contains `"**/*.ts"` and `"**/*.tsx"` so test files are included for type checking.
  - Leave `next-env.d.ts` and shadcn/Next defaults untouched.

  Example diff (illustrative):
  ```json
  {
    "compilerOptions": {
      /* ... existing Next.js scaffold options ... */
      "types": ["vitest/globals", "@testing-library/jest-dom"],
      "paths": { "@/*": ["./*"] }
    },
    "include": ["next-env.d.ts", "**/*.ts", "**/*.tsx", ".next/types/**/*.ts"],
    "exclude": ["node_modules"]
  }
  ```

  Step 6 — Add the test scripts to `package.json`. Use Edit tool to extend the `"scripts"` block (preserve dev/build/start/lint/typecheck from prior plans):
  ```json
  "scripts": {
    "dev": "next dev",
    "build": "next build --webpack",
    "start": "next start",
    "lint": "next lint",
    "typecheck": "tsc --noEmit",
    "test": "vitest run",
    "test:watch": "vitest",
    "test:ui": "vitest --ui"
  }
  ```
  VALIDATION.md Sign-Off item #4: `test` MUST be `vitest run` (no watch).

  Step 7 — Verify:
  ```bash
  cd /Users/ashleyakbar/barterkin
  pnpm typecheck
  pnpm test --run   # expect: 1 file, 2 tests, 0 failed
  ```
  </action>
  <acceptance_criteria>
    - `jq -r '.devDependencies.vitest' /Users/ashleyakbar/barterkin/package.json` matches `^3`
    - `jq -r '.devDependencies.jsdom' /Users/ashleyakbar/barterkin/package.json` is non-null
    - `jq -r '.devDependencies["@testing-library/react"]' /Users/ashleyakbar/barterkin/package.json` matches `^16` or later
    - `jq -r '.scripts.test' /Users/ashleyakbar/barterkin/package.json` equals `vitest run` (NOT `vitest`, NOT containing `--watch`)
    - `jq -r '.scripts["test:watch"]' /Users/ashleyakbar/barterkin/package.json` equals `vitest`
    - `test -f /Users/ashleyakbar/barterkin/vitest.config.ts && grep -q "environment: 'jsdom'" /Users/ashleyakbar/barterkin/vitest.config.ts`
    - `grep -q "setupFiles:" /Users/ashleyakbar/barterkin/vitest.config.ts`
    - `test -f /Users/ashleyakbar/barterkin/vitest.setup.ts && grep -q "@testing-library/jest-dom/vitest" /Users/ashleyakbar/barterkin/vitest.setup.ts`
    - `test -f /Users/ashleyakbar/barterkin/tests/unit/smoke.test.ts && grep -q "expect(1 + 1).toBe(2)" /Users/ashleyakbar/barterkin/tests/unit/smoke.test.ts`
    - `jq -r '.compilerOptions.types[]' /Users/ashleyakbar/barterkin/tsconfig.json | grep -q "vitest/globals"` (or `grep -q "vitest/globals" /Users/ashleyakbar/barterkin/tsconfig.json`)
    - `cd /Users/ashleyakbar/barterkin && pnpm test --run` exits 0 and reports `2 passed`
    - `cd /Users/ashleyakbar/barterkin && pnpm typecheck` exits 0
  </acceptance_criteria>
  <verify>
    <automated>cd /Users/ashleyakbar/barterkin && pnpm typecheck && pnpm test --run</automated>
  </verify>
  <done>Vitest installed + configured; 2 trivial unit tests pass; `pnpm test` is watch-free; tsconfig knows about vitest globals.</done>
</task>

<task type="auto" tdd="false">
  <name>Task 2: Install Playwright, write e2e smoke spec, commit</name>
  <files>
    - /Users/ashleyakbar/barterkin/package.json
    - /Users/ashleyakbar/barterkin/pnpm-lock.yaml
    - /Users/ashleyakbar/barterkin/playwright.config.ts
    - /Users/ashleyakbar/barterkin/tests/e2e/smoke.spec.ts
    - /Users/ashleyakbar/barterkin/.gitignore
  </files>
  <read_first>
    - /Users/ashleyakbar/barterkin/app/page.tsx (Plan 05 version — the e2e test asserts against "Barterkin foundation" text rendered here)
    - /Users/ashleyakbar/barterkin/package.json (scripts — extend, don't overwrite)
    - /Users/ashleyakbar/barterkin/.gitignore (confirm playwright-report + test-results + /playwright/.cache/ from Plan 01 are present)
  </read_first>
  <action>
  Step 1 — Install Playwright + the chromium browser:
  ```bash
  cd /Users/ashleyakbar/barterkin
  pnpm add -D @playwright/test
  pnpm exec playwright install --with-deps chromium    # ~250MB download — first run only
  ```

  Step 2 — Create `playwright.config.ts`:
  ```ts
  import { defineConfig, devices } from '@playwright/test'

  export default defineConfig({
    testDir: 'tests/e2e',
    fullyParallel: true,
    forbidOnly: !!process.env.CI,
    retries: process.env.CI ? 2 : 0,
    workers: process.env.CI ? 2 : undefined,
    reporter: process.env.CI ? 'github' : [['list'], ['html', { open: 'never' }]],
    use: {
      baseURL: process.env.PLAYWRIGHT_BASE_URL ?? 'http://localhost:3000',
      trace: 'on-first-retry',
      screenshot: 'only-on-failure',
    },
    projects: [
      { name: 'chromium', use: { ...devices['Desktop Chrome'] } },
    ],
    webServer: {
      // CI runs `pnpm build && pnpm start` (production build, webpack — not Turbopack dev).
      // Locally, a developer can `pnpm dev` first and Playwright will reuse that server.
      command: 'pnpm start',
      url: 'http://localhost:3000',
      timeout: 120_000,
      reuseExistingServer: !process.env.CI,
    },
  })
  ```

  Step 3 — Create `tests/e2e/smoke.spec.ts` — the test asserts the Plan-02/Plan-05 home page renders:
  ```ts
  import { test, expect } from '@playwright/test'

  test.describe('smoke', () => {
    test('home page renders Barterkin foundation card', async ({ page }) => {
      await page.goto('/')
      await expect(page.getByRole('heading', { name: 'Barterkin foundation' })).toBeVisible()
    })

    test('fire test event button is present', async ({ page }) => {
      await page.goto('/')
      await expect(page.getByRole('button', { name: /fire posthog test_event/i })).toBeVisible()
    })
  })
  ```
  (Button aria-label is `Fire PostHog test_event` per Plan 05 `components/fire-test-event.tsx`.)

  Step 4 — Add Playwright scripts to `package.json`:
  ```json
  "scripts": {
    "dev": "next dev",
    "build": "next build --webpack",
    "start": "next start",
    "lint": "next lint",
    "typecheck": "tsc --noEmit",
    "test": "vitest run",
    "test:watch": "vitest",
    "test:ui": "vitest --ui",
    "e2e": "playwright test",
    "e2e:ui": "playwright test --ui",
    "e2e:install": "playwright install --with-deps chromium"
  }
  ```

  Step 5 — Confirm `.gitignore` already excludes Playwright artefacts (Plan 01 had them). If any missing, append:
  ```
  /playwright-report/
  /playwright/.cache/
  /test-results/
  ```

  Step 6 — Verify the e2e smoke passes. The Playwright webServer now runs `pnpm start`, which requires a prior production build. Run:
  ```bash
  cd /Users/ashleyakbar/barterkin
  pnpm typecheck
  pnpm build   # webpack production build (Plan 02 pin)
  pnpm e2e     # webServer boots `pnpm start`; both tests pass
  ```
  Minimal `.env.local` (just `NEXT_PUBLIC_SUPABASE_URL`) is sufficient — Supabase factories tolerate missing vars at import; the home page is a server component that doesn't invoke `createClient()`.

  Step 7 — Commit:
  ```bash
  git add package.json pnpm-lock.yaml vitest.config.ts vitest.setup.ts playwright.config.ts tests/ tsconfig.json .gitignore
  git commit -m "feat(foundation): vitest + playwright infra + smoke tests

- vitest@3 + @vitest/ui + @testing-library/react + jsdom installed
- vitest.config.ts uses jsdom env + tests/unit include pattern
- playwright@1 installed; playwright.config.ts boots pnpm start via webServer (CI runs pnpm build then pnpm e2e; production build tested, not Turbopack dev)
- tests/unit/smoke.test.ts — 2 trivial unit tests
- tests/e2e/smoke.spec.ts — loads localhost:3000 + asserts 'Barterkin foundation' heading + 'Fire test event' button visible
- package.json scripts: test / test:watch / e2e / e2e:install — no watch flags on CI-facing commands
- tsconfig.json extends with vitest/globals + jest-dom types

Covers FOUND-11 (test substrate for CI). Real tests land in Phases 2+."
  git push origin main
  ```
  </action>
  <acceptance_criteria>
    - `jq -r '.devDependencies["@playwright/test"]' /Users/ashleyakbar/barterkin/package.json` matches `^1`
    - `test -f /Users/ashleyakbar/barterkin/playwright.config.ts && grep -q "webServer:" /Users/ashleyakbar/barterkin/playwright.config.ts`
    - `grep -q "command: 'pnpm start'" /Users/ashleyakbar/barterkin/playwright.config.ts`
    - `grep -q "reuseExistingServer: !process.env.CI" /Users/ashleyakbar/barterkin/playwright.config.ts`
    - `test -f /Users/ashleyakbar/barterkin/tests/e2e/smoke.spec.ts && grep -q "Barterkin foundation" /Users/ashleyakbar/barterkin/tests/e2e/smoke.spec.ts`
    - `jq -r '.scripts.e2e' /Users/ashleyakbar/barterkin/package.json` equals `playwright test` (NO `--ui`)
    - `jq -r '.scripts["e2e:install"]' /Users/ashleyakbar/barterkin/package.json` contains `playwright install`
    - `cd /Users/ashleyakbar/barterkin && pnpm test --run` exits 0 (still passes after Playwright install)
    - `cd /Users/ashleyakbar/barterkin && pnpm e2e` exits 0 (both smoke tests green — with chromium already installed via `playwright install`)
    - `git log --oneline -1 | grep -q "vitest + playwright infra"`
    - `git ls-files "playwright-report/*" 2>/dev/null | wc -l` returns `0` (artefacts not tracked)
  </acceptance_criteria>
  <verify>
    <automated>cd /Users/ashleyakbar/barterkin && pnpm typecheck && pnpm test --run && pnpm e2e && jq -r '.scripts.test' package.json | grep -q "vitest run" && jq -r '.scripts.e2e' package.json | grep -q "^playwright test$"</automated>
  </verify>
  <done>Playwright installed with chromium; e2e smoke tests pass against `pnpm dev`; all four testing scripts exist; tests + configs committed.</done>
</task>

</tasks>

<threat_model>
## Trust Boundaries

| Boundary | Description |
|----------|-------------|
| Test artefacts → public repo | `playwright-report/` and `test-results/` gitignored to avoid leaking screenshots / traces (which can contain real API responses). |
| `pnpm test --run` in CI → Vercel-preview env | Plan 08 runs tests against ephemeral GH Actions runners; Supabase/Resend/PostHog keys are GH Actions secrets, not committed. |
| Playwright browser install → npm registry + Playwright CDN | ~250MB Chromium download on first run; supply-chain risk equivalent to any other devDependency. |

## STRIDE Threat Register

| Threat ID | Category | Component | Disposition | Mitigation Plan |
|-----------|----------|-----------|-------------|-----------------|
| T-07-01 | Information Disclosure | Playwright traces/screenshots containing env-var values committed to repo | mitigate | `.gitignore` excludes `playwright-report/`, `test-results/`, `/playwright/.cache/` (Plan 01 + verified here) |
| T-07-02 | Denial of Service | CI test run hanging because `webServer` never boots | mitigate | `playwright.config.ts` sets `webServer.timeout: 120_000` (120s); CI failure is loud, not silent |
| T-07-03 | Spoofing | `vitest` running in watch mode in CI, consuming indefinite runner time | mitigate | VALIDATION.md Sign-Off item #4 + acceptance criterion: `"test": "vitest run"` (no `--watch`) |
| T-07-04 | Tampering | Test file accidentally included in production bundle | mitigate | `tests/` directory is not inside `app/` or `components/`; Next.js bundler only pulls in imported files. Vitest config `exclude` also guards. |
| T-07-05 | Information Disclosure | Smoke test output containing secret-like strings | accept | Current smoke tests assert on hardcoded literals ("Barterkin foundation", "Fire PostHog test_event"); no env vars consulted |
</threat_model>

<verification>
Plan 07 is complete when:
1. `pnpm test --run` exits 0 with 2 passing unit tests
2. `pnpm e2e` exits 0 with 2 passing Playwright tests
3. `package.json` scripts.test equals `vitest run`, scripts.e2e equals `playwright test`
4. `vitest.config.ts` + `vitest.setup.ts` + `playwright.config.ts` all exist
5. `tests/unit/smoke.test.ts` + `tests/e2e/smoke.spec.ts` committed
6. No Playwright artefact directories tracked in git
7. Commit on `origin/main`
</verification>

<success_criteria>
- FOUND-11 substrate satisfied: test commands that Plan 08 CI will invoke actually run
- VALIDATION.md Wave 0 requirements (vitest.config.ts, playwright.config.ts, tests/smoke files) all met
- No watch flags on CI-facing scripts; CI time budget respected
</success_criteria>

<output>
After completion, create `/Users/ashleyakbar/barterkin/.planning/phases/01-foundation-infrastructure/01-07-SUMMARY.md`. Capture exact vitest + playwright versions installed and the commit SHA. Update `/Users/ashleyakbar/barterkin/.planning/phases/01-foundation-infrastructure/01-VALIDATION.md` frontmatter: set `wave_0_complete: true` and `nyquist_compliant: true` — all Phase 1 tasks that rely on `pnpm test` now have working test infrastructure.
</output>
