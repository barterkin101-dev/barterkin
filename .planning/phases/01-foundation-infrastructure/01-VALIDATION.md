---
phase: 1
slug: foundation-infrastructure
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-04-18
---

# Phase 1 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | vitest (unit/component) + @playwright/test (e2e) |
| **Config file** | `vitest.config.ts` + `playwright.config.ts` (Wave 0 installs) |
| **Quick run command** | `pnpm test --run` |
| **Full suite command** | `pnpm lint && pnpm typecheck && pnpm test --run && pnpm e2e` |
| **Estimated runtime** | ~30-60 seconds (scaffold phase; few tests yet) |

---

## Sampling Rate

- **After every task commit:** Run `pnpm test --run` (or `pnpm typecheck` if no testable change)
- **After every plan wave:** Run `pnpm lint && pnpm typecheck && pnpm test --run`
- **Before `/gsd-verify-work`:** Full suite must be green, Vercel preview must deploy
- **Max feedback latency:** 60 seconds

---

## Per-Task Verification Map

> Populated by planner. Each task gets either an `<automated>` verify block or a `wave_0` dependency flagged `❌ W0`.

| Task ID | Plan | Wave | Requirement | Threat Ref | Secure Behavior | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|------------|-----------------|-----------|-------------------|-------------|--------|
| 1-XX-XX | XX   | N    | FOUND-XX    | T-1-XX / — | {secure behavior} | {type}  | `{command}`       | ✅ / ❌ W0 | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `vitest.config.ts` — framework install + config
- [ ] `playwright.config.ts` — e2e framework install + config
- [ ] `tests/smoke.test.ts` — smoke test stub (proves framework runs)
- [ ] `e2e/smoke.spec.ts` — Playwright smoke stub (proves browser runs)
- [ ] `.github/workflows/ci.yml` — CI infrastructure so commands are actually invoked on PRs

*Rationale: brand-new scaffold — no existing test infrastructure to reuse. Wave 0 installs vitest + playwright and proves they run before any FOUND-XX tasks rely on them.*

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| DNS propagation (SPF/DKIM/DMARC ≥9/10) | FOUND-04 | Already verified pre-phase (10/10 on mail-tester); re-verification requires external third-party site | Re-run `mail-tester.com` once per phase commit if DNS changes |
| Vercel preview deploy renders app | FOUND-06, FOUND-09 | Vercel integration is external; PR check surfaces status but rendering check is manual visual on preview URL | On PR, click Vercel preview URL → see app render |
| PostHog event appears in dashboard | FOUND-08 | Event arrives async (up to 60s); live dashboard is external | After `posthog.capture('test_event')`, visit PostHog dashboard → confirm event |
| Resend email delivery end-to-end | FOUND-04 | External deliverability signal; requires checking inbox | Send test email via API route → confirm delivery in test inbox |
| Netlify legacy page stays reachable during Phases 1–5 | FOUND-12 | Visual check on Netlify-hosted URL | `curl -I https://<netlify-url>` must return 200 for all Phase 1 commits |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references (vitest, playwright, CI workflow)
- [ ] No watch-mode flags (`--watch`, `-w`) in CI commands
- [ ] Feedback latency < 60s
- [ ] `nyquist_compliant: true` set in frontmatter once planner populates Per-Task Verification Map

**Approval:** pending
