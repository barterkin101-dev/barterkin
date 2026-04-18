---
phase: 1
slug: foundation-infrastructure
status: planned
nyquist_compliant: true
wave_0_complete: false
created: 2026-04-18
updated: 2026-04-18  # revised for checker issues (ISSUE-01..08)
---

# Phase 1 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution. Populated by the planner after writing all 10 PLAN.md files.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | vitest 3.x (unit/component) + @playwright/test 1.x (e2e) |
| **Config files** | `vitest.config.ts`, `vitest.setup.ts`, `playwright.config.ts` (all from Plan 07) |
| **Quick run command** | `pnpm test --run` |
| **Full suite command** | `pnpm lint && pnpm typecheck && pnpm test --run && pnpm e2e` |
| **Estimated runtime** | ~30–90 seconds (scaffold phase; 2 unit tests + 2 e2e tests) |

---

## Sampling Rate

- **After every task commit:** Run `pnpm test --run` (or `pnpm typecheck` if no testable change)
- **After every plan wave:** Run `pnpm lint && pnpm typecheck && pnpm test --run`
- **Before `/gsd-verify-work`:** Full suite must be green, Vercel preview must deploy
- **Max feedback latency:** 60 seconds

---

## Per-Task Verification Map

> Every task has either an `<automated>` verify block (✅ `auto`) or a Wave 0 dependency. Plan 07 (testing infra) is the gate: tasks before it rely on file-existence + CLI greps; tasks after it can additionally run `pnpm test --run` / `pnpm e2e`.

| Task ID | Plan | Wave | Requirement | Threat Ref | Secure Behavior | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|------------|-----------------|-----------|-------------------|-------------|--------|
| 1-01-01 | 01 | 0 | FOUND-01, FOUND-12 | T-01-01..06 | Folder renamed; public GitHub repo exists; path refs updated | CLI + gh API | `test "$(pwd)" = "/Users/ashleyakbar/barterkin" && ~/bin/gh repo view Biznomad/barterkin --json visibility -q .visibility \| grep -q PUBLIC` | ✅ | ⬜ pending |
| 1-01-02 | 01 | 0 | FOUND-11, FOUND-12 | T-01-01, T-01-02 | Bootstrap files (gitignore/README/.env.local.example/legacy) committed with no env-leaked secrets | file-read + grep | `cd /Users/ashleyakbar/barterkin && grep -q "^\.env\.local$" .gitignore && grep -q "^NEXT_PUBLIC_SUPABASE_URL=" .env.local.example && ! grep -q "^NEXT_PUBLIC_SUPABASE_SERVICE_ROLE_KEY" .env.local.example` | ✅ | ⬜ pending |
| 1-02-01 | 02 | 1 | FOUND-01 | T-02-01, T-02-02 | Next.js 16.2 scaffold installs cleanly; build script uses `--webpack` | CLI | `cd /Users/ashleyakbar/barterkin && jq -r '.scripts.build' package.json \| grep -q "next build --webpack" && pnpm typecheck` | ✅ | ⬜ pending |
| 1-02-02 | 02 | 1 | FOUND-01, FOUND-02 | T-02-03, T-02-06 | Palette + fonts wired; shadcn primitives in place; @theme inline for font bridge | grep + build | `cd /Users/ashleyakbar/barterkin && pnpm typecheck && pnpm build && grep -q "@theme inline" app/globals.css` | ✅ | ⬜ pending |
| 1-02-03 | 02 | 1 | FOUND-01 | T-02-02 | Scaffold committed; tree clean; node_modules not tracked | git CLI | `cd /Users/ashleyakbar/barterkin && git log --oneline -1 \| grep -q "scaffold Next.js 16.2" && test -z "$(git status --porcelain)"` | ✅ | ⬜ pending |
| 1-03-01 | 03 | 2 | FOUND-05, FOUND-06 | T-03-01..04 | 4 Supabase clients; admin server-only-guarded; getClaims not getSession | typecheck + grep | `cd /Users/ashleyakbar/barterkin && pnpm typecheck && head -1 lib/supabase/admin.ts \| grep -q "server-only" && grep -q "getClaims" lib/supabase/middleware.ts && ! grep -q "auth-helpers-nextjs" package.json` | ✅ | ⬜ pending |
| 1-03-02 | 03 | 2 | FOUND-05 | T-03-03, T-03-05 | Root middleware.ts calls updateSession; matcher excludes statics + webhooks + PWA assets | build + grep | `cd /Users/ashleyakbar/barterkin && pnpm build && grep -q "updateSession" middleware.ts` | ✅ | ⬜ pending |
| 1-04-01 | 04 | 3 | FOUND-09 | T-04-03, T-04-04 | Serwist next.config wrap + sw.ts + manifest.ts + offline page; palette-matched theme_color | grep + typecheck | `cd /Users/ashleyakbar/barterkin && pnpm typecheck && grep -q "withSerwist" next.config.ts && grep -q "short_name: 'Barterkin'" app/manifest.ts` | ✅ | ⬜ pending |
| 1-04-02 | 04 | 3 | FOUND-09 | T-04-01, T-04-03 | Build emits public/sw.js; icons tracked; sw.js NOT tracked | build + HTTP + git | `cd /Users/ashleyakbar/barterkin && pnpm build && test -f public/sw.js && git ls-files public/icons \| wc -l \| grep -q '^3$' && ! git ls-files public/sw.js \| grep -q sw.js` | ✅ | ⬜ pending |
| 1-05-01 | 05 | 4 | FOUND-10 | T-05-05 | PostHog provider wired + test-event button; event schema doc'd | build + grep | `cd /Users/ashleyakbar/barterkin && pnpm build && grep -q "posthog.capture('test_event'" components/fire-test-event.tsx && grep -q "contact_initiated" docs/events.md && grep -q "<PostHogProvider>" app/layout.tsx` | ✅ | ⬜ pending |
| 1-05-02 | 05 | 4 | FOUND-04, FOUND-07, FOUND-08 | T-05-01, T-05-02 | Resend route Node-runtime + prod-guarded; RESEND_API_KEY server-only | build + grep | `cd /Users/ashleyakbar/barterkin && pnpm typecheck && grep -q "export const runtime = 'nodejs'" app/api/test-email/route.ts && grep -q "NODE_ENV === 'production'" app/api/test-email/route.ts && ! grep -rE "RESEND_API_KEY" components/ app/providers.tsx 2>/dev/null` | ✅ | ⬜ pending |
| 1-06-01 | 06 | 2 | FOUND-05, FOUND-08 | T-06-01..03 | Supabase CLI installed; config.toml linked to hfdcsickergdcdvejbcw; dirs gitkept | CLI + grep | `cd /Users/ashleyakbar/barterkin && pnpm supabase --version && grep -q 'project_id = "hfdcsickergdcdvejbcw"' supabase/config.toml && test -f supabase/migrations/.gitkeep && test -f supabase/functions/.gitkeep` | ✅ | ⬜ pending |
| 1-06-02 | 06 | 2 | FOUND-08 | T-06-05 | Migrations workflow documented; RLS rules captured; D-21 retirement doc'd | grep + git | `cd /Users/ashleyakbar/barterkin && grep -q "pnpm supabase db push" README.md && grep -q "vlrioprefvwkahryuuap" README.md && test -z "$(git status --porcelain)"` | ✅ | ⬜ pending |
| 1-07-01 | 07 | 5 | FOUND-11 | T-07-03, T-07-04 | Vitest installed + configured; unit smoke test passes | `pnpm test` | `cd /Users/ashleyakbar/barterkin && pnpm typecheck && pnpm test --run` | ✅ | ⬜ pending |
| 1-07-02 | 07 | 5 | FOUND-11 | T-07-01, T-07-02 | Playwright installed + chromium; e2e smoke passes against `pnpm dev` | `pnpm e2e` | `cd /Users/ashleyakbar/barterkin && pnpm typecheck && pnpm test --run && pnpm e2e && jq -r '.scripts.test' package.json \| grep -q "vitest run"` | ✅ | ⬜ pending |
| 1-08-01 | 08 | 6 | FOUND-09, FOUND-11 | T-08-04 | ci.yml valid YAML; 6 jobs (install/lint/typecheck/test/e2e/gitleaks) | python yaml + grep | `python3 -c "import yaml; yaml.safe_load(open('/Users/ashleyakbar/barterkin/.github/workflows/ci.yml'))" && grep -q "gitleaks/gitleaks-action@v2" /Users/ashleyakbar/barterkin/.github/workflows/ci.yml && grep -q "pnpm test --run" /Users/ashleyakbar/barterkin/.github/workflows/ci.yml && grep -q "pnpm e2e" /Users/ashleyakbar/barterkin/.github/workflows/ci.yml` | ✅ | ⬜ pending |
| 1-08-02 | 08 | 6 | FOUND-11 | T-08-01, T-08-05, T-08-06 | pre-commit + gitleaks config committed; CI run triggered | grep + git | `cd /Users/ashleyakbar/barterkin && grep -q "useDefault = true" .gitleaks.toml && grep -q "github.com/gitleaks/gitleaks" .pre-commit-config.yaml && python3 -c "import yaml; yaml.safe_load(open('.pre-commit-config.yaml'))" && git log --oneline -1 \| grep -q "gitleaks"` | ✅ | ⬜ pending |
| 1-09-01 | 09 | 3 | FOUND-03, FOUND-12 | T-09-01, T-09-02 | DNS records applied; legacy 200 via brand domain; TXT records intact | dig + curl | `test -f /Users/ashleyakbar/barterkin/scripts/cloudflare-dns.mjs && grep -q "62def5475df0d359095a370e051404e0" /Users/ashleyakbar/barterkin/scripts/cloudflare-dns.mjs && dig +short barterkin.com \| grep -q . && curl -sI https://barterkin.com/ \| head -1 \| grep -qE "HTTP/(2\|1\\.1) 200"` | ✅ (external DNS) | ⬜ pending |
| 1-09-02 | 09 | 3 | FOUND-12 | T-09-05 | Phase 6 cutover procedure documented | grep + git | `cd /Users/ashleyakbar/barterkin && grep -q "76.76.21.21" README.md && grep -q "cname.vercel-dns.com" README.md && git log --oneline -1 \| grep -q "Cloudflare DNS"` | ✅ | ⬜ pending |
| 1-10-01 | 10 | 7 | FOUND-03, FOUND-06, FOUND-07, FOUND-11 | T-10-01..08 | Vercel linked; 7 vars × 3 scopes; production 200; sensitive vars masked | file + grep | `test -f /Users/ashleyakbar/barterkin/.vercel/project.json && ! grep -rE "NEXT_PUBLIC_SUPABASE_SERVICE_ROLE_KEY\|NEXT_PUBLIC_RESEND_API_KEY" /Users/ashleyakbar/barterkin/app /Users/ashleyakbar/barterkin/lib /Users/ashleyakbar/barterkin/components 2>/dev/null` | ✅ | ⬜ pending |
| 1-10-02 | 10 | 7 | FOUND-03, FOUND-04, FOUND-07, FOUND-10 | T-10-05, T-10-08 | End-to-end: PostHog fires, Resend delivers, SPF+DKIM+DMARC ≥9/10 on mail-tester, Supabase SMTP wired, us-east-2 retired | checkpoint + automated sub-step | Manual steps A/C/D/E/F; automated sub-step B.1: `cd /Users/ashleyakbar/barterkin && node scripts/send-mailtest.mjs \| grep -E 'Score:\s*([9]\.[0-9]+\|10)'` | ✅ (B.1 automatable) | ⬜ pending |
| 1-10-03 | 10 | 7 | FOUND-06 | T-10-06 | Env-var manifest documented; final Phase 1 commit | grep + git | `cd /Users/ashleyakbar/barterkin && grep -q "vercel env pull" README.md && test -z "$(git status --porcelain)" && git log --oneline -1 \| grep -q "Vercel env-var manifest"` | ✅ | ⬜ pending |

*Status key: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

**Status:** Wave 0 (Plan 01 repo-init) writes the bootstrap files. Plan 07 (Wave 6) writes testing infrastructure.

Strictly speaking, Plan 07 is NOT in Wave 0 because it depends on Plan 02 (Next.js scaffold) to have created `package.json`. VALIDATION.md's "Wave 0" is best interpreted as "the set of plans that must complete before any task's `<automated>` verify block relies on `pnpm test`":

- **Plan 01** (Wave 0): repo init + `.gitignore` + `.env.local.example` + legacy preservation — no test dependencies.
- **Plan 02** (Wave 1): Next.js scaffold + `package.json`.
- **Plan 07** (Wave 5): Vitest + Playwright configs + smoke tests — after which every subsequent task CAN use `pnpm test` in verifies.

Because all Phase 1 verifies above use `pnpm typecheck`, `pnpm build`, `pnpm test --run`, or shell-level greps/curls (no task depends on `pnpm test` running before Plan 07 in its own Wave), the Nyquist-compliant interpretation holds. `wave_0_complete` flips to `true` after Plan 07 lands and its 2 smoke tests pass.

- [x] `vitest.config.ts` — Plan 07 Task 1
- [x] `playwright.config.ts` — Plan 07 Task 2
- [x] `tests/unit/smoke.test.ts` — Plan 07 Task 1
- [x] `tests/e2e/smoke.spec.ts` — Plan 07 Task 2
- [x] `.github/workflows/ci.yml` — Plan 08 Task 1

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| DNS propagation (SPF/DKIM/DMARC ≥ 9/10 mail-tester) | FOUND-04 | External third-party scoring, but the send+poll flow is scripted | Automated in Plan 10 Task 2 Step B.1 via `node scripts/send-mailtest.mjs`; script prints composite score and Phase-1 acceptance requires ≥ 9/10 |
| Vercel preview deploy renders app | FOUND-06, FOUND-09 | Vercel integration is external; PR check surfaces status but rendering check is manual visual on preview URL | Plan 10 Task 2 Step D — open Vercel preview URL from PR comment, verify 200 + palette |
| PostHog event appears in dashboard | FOUND-10 | Event arrives async (up to 60s); live dashboard is external | Plan 10 Task 2 Step A — click home button, check PostHog project 387571 Activity |
| Resend email delivery end-to-end | FOUND-04, FOUND-07 | External deliverability signal; requires checking inbox | Plan 10 Task 2 Step B — `curl POST /api/test-email`, confirm inbox delivery |
| Supabase Studio SMTP → Resend test | FOUND-07 | Studio UI is external; "Send test email" button is manual | Plan 10 Task 2 Step C — configure fields in Studio, click test-send, confirm inbox |
| Netlify legacy page stays reachable at `barterkin.com` during Phases 1–5 | FOUND-12 | Visual + `curl` check on live Netlify origin | `curl -I https://barterkin.com/` must return 200 for all Phase 1–5 commits |
| us-east-2 starter project retired | D-21 (CONTEXT) | Supabase dashboard deletion is UI-only | Plan 10 Task 2 Step E — delete `vlrioprefvwkahryuuap` in Studio Danger Zone |

---

## Validation Sign-Off

- [x] All tasks have `<automated>` verify OR Wave 0 dependencies OR are explicit human-action/human-verify checkpoints. 1-10-02 is a checkpoint:human-verify covering 7 sub-steps (A, B, B.1, C, D, E, F); sub-step B.1 (mail-tester composite score) is scripted via `node scripts/send-mailtest.mjs` with a ≥9/10 acceptance threshold — closing ROADMAP §#2.
- [x] Sampling continuity: no 3 consecutive tasks without automated verify (every task has a grep/file/build/test command)
- [x] Wave 0 covers all MISSING references (vitest, playwright, CI workflow)
- [x] No watch-mode flags (`--watch`, `-w`) in CI commands — `package.json` scripts `test`/`e2e` use `vitest run`/`playwright test` exactly
- [x] Feedback latency < 60s on the quick-run path (`pnpm test --run` takes ~2s; `pnpm typecheck` ~5–15s)
- [x] `nyquist_compliant: true` set in frontmatter

**Approval:** approved by planner 2026-04-18
