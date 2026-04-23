---
phase: 9
slug: onboarding-wizard-multi-step-in-app-guide-for-new-members-sh
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-04-22
---

# Phase 9 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Vitest (unit) + Playwright (E2E) |
| **Config file** | `vitest.config.ts` / `playwright.config.ts` |
| **Quick run command** | `pnpm vitest run` |
| **Full suite command** | `pnpm vitest run && pnpm playwright test` |
| **Estimated runtime** | ~15 seconds (unit) / ~60 seconds (E2E) |

---

## Sampling Rate

- **After every task commit:** Run `pnpm vitest run`
- **After every plan wave:** Run `pnpm vitest run && pnpm playwright test`
- **Before `/gsd-verify-work`:** Full suite must be green
- **Max feedback latency:** 60 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Threat Ref | Secure Behavior | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|------------|-----------------|-----------|-------------------|-------------|--------|
| 9-01-01 | 01 | 1 | Migration | — | Migration applied, column exists | manual | `supabase db push` | ✅ | ⬜ pending |
| 9-01-02 | 01 | 1 | Middleware | T-9-01 | Authed+verified users without `onboarding_completed_at` redirect to `/onboarding` | E2E | `pnpm playwright test onboarding` | ❌ W0 | ⬜ pending |
| 9-01-03 | 01 | 1 | Route group | — | `/onboarding` loads with no AppNav | E2E | `pnpm playwright test onboarding-layout` | ❌ W0 | ⬜ pending |
| 9-01-04 | 01 | 1 | Step 1 gate | — | "Next" disabled until all 5 checklist items green | E2E | `pnpm playwright test onboarding-step1` | ❌ W0 | ⬜ pending |
| 9-01-05 | 01 | 1 | Step 3 complete | — | `onboarding_completed_at` written on step 3 view | unit | `pnpm vitest run markOnboardingComplete` | ❌ W0 | ⬜ pending |
| 9-01-06 | 01 | 1 | AppNav link | T-9-02 | "Finish setup" only visible when `onboarding_completed_at IS NULL` | E2E | `pnpm playwright test finish-setup-link` | ❌ W0 | ⬜ pending |
| 9-01-07 | 01 | 1 | Dismiss | — | Dismiss sends to `/directory`, wizard not marked complete | E2E | `pnpm playwright test onboarding-dismiss` | ❌ W0 | ⬜ pending |
| 9-01-08 | 01 | 1 | returnTo | T-9-03 | `?returnTo=` only accepts relative paths — prevents open redirect | unit | `pnpm vitest run returnTo` | ❌ W0 | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `__tests__/onboarding/markOnboardingComplete.test.ts` — unit test for idempotent server action
- [ ] `__tests__/onboarding/returnTo.test.ts` — unit test for open-redirect validation
- [ ] `e2e/onboarding.spec.ts` — Playwright stubs for all E2E rows above
- [ ] `e2e/finish-setup-link.spec.ts` — AppNav conditional rendering test

*Existing Vitest and Playwright infrastructure is confirmed present (RESEARCH.md §Test Infrastructure).*

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Supabase migration applied in prod | Schema: `onboarding_completed_at` column | Requires live Supabase project access | Run `supabase db push` against prod; verify column in Studio |
| ProfileCompletenessChecklist re-checks after profile edit return | Step 1 UX flow | Requires authenticated session + profile edit | Sign up, enter wizard, edit profile, save, verify checklist refreshes |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 60s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
