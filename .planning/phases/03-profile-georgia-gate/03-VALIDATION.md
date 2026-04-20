---
phase: 3
slug: profile-georgia-gate
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-04-20
---

# Phase 3 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Vitest 4.x (unit) + Playwright 1.59.x (E2E) |
| **Config file** | `vitest.config.ts` + `playwright.config.ts` |
| **Quick run command** | `pnpm test` |
| **Full suite command** | `pnpm test && pnpm e2e` |
| **Estimated runtime** | ~10s (unit) / ~120s (full) |

---

## Sampling Rate

- **After every task commit:** Run `pnpm test` (unit suite, <10s)
- **After every plan wave:** Run `pnpm test && pnpm e2e` (full suite)
- **Before `/gsd-verify-work`:** Full suite must be green
- **Max feedback latency:** 10 seconds (unit), 120 seconds (full)

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Threat Ref | Secure Behavior | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|------------|-----------------|-----------|-------------------|-------------|--------|
| 3-01-01 | 01 | 0 | PROF-01 | T-3-05 | Display name min 1 / max 60 enforced | unit | `pnpm test tests/unit/profile-schema.test.ts` | ❌ W0 | ⬜ pending |
| 3-01-02 | 01 | 0 | PROF-02 | T-3-01 | Avatar MIME + size client-side rejection | unit | `pnpm test tests/unit/avatar-validation.test.ts` | ❌ W0 | ⬜ pending |
| 3-01-03 | 01 | 0 | PROF-03 | — | Skills offered min 1 / max 5 | unit | `pnpm test tests/unit/profile-schema.test.ts` | ❌ W0 | ⬜ pending |
| 3-01-04 | 01 | 0 | PROF-04 | — | Skills wanted 0–5 allowed | unit | `pnpm test tests/unit/profile-schema.test.ts` | ❌ W0 | ⬜ pending |
| 3-01-05 | 01 | 0 | PROF-09 | — | TikTok handle format `@username` | unit | `pnpm test tests/unit/profile-schema.test.ts` | ❌ W0 | ⬜ pending |
| 3-01-06 | 01 | 0 | GEO-02 | — | Static JSON has exactly 159 Georgia counties | unit | `pnpm test tests/unit/georgia-counties.test.ts` | ❌ W0 | ⬜ pending |
| 3-01-07 | 01 | 0 | PROF-07 | T-3-04 | Auto-slug from display name; locked after first save | unit | `pnpm test tests/unit/slug-generation.test.ts` | ❌ W0 | ⬜ pending |
| 3-02-01 | 02 | 1 | PROF-05 | — | County typeahead renders all 159 counties | E2E | `pnpm e2e --grep "county typeahead"` | ❌ W0 | ⬜ pending |
| 3-02-02 | 02 | 1 | PROF-12 | T-3-02 | Publish toggle disabled when profile incomplete | E2E | `pnpm e2e --grep "publish gate"` | ❌ W0 | ⬜ pending |
| 3-02-03 | 02 | 1 | PROF-12 | T-3-02 | Server rejects publish for incomplete profile | E2E | `pnpm e2e --grep "publish gate"` | ❌ W0 | ⬜ pending |
| 3-03-01 | 03 | 2 | PROF-13 | T-3-03 | Unpublished profile hidden at /m/[username] | E2E | `pnpm e2e --grep "profile visibility"` | ❌ W0 | ⬜ pending |
| 3-03-02 | 03 | 2 | PROF-14 | T-3-03 | Published + verified profile visible at /m/[username] | E2E | `pnpm e2e --grep "profile visibility"` | ❌ W0 | ⬜ pending |
| 3-03-03 | 03 | 2 | PROF-14 | T-3-03 | Banned profile returns 404/empty | E2E | `pnpm e2e --grep "profile visibility"` | ❌ W0 | ⬜ pending |
| 3-04-01 | 04 | 2 | PROF-02 | T-3-01 | Storage RLS rejects wrong-user path upload | manual | — | manual-only | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `tests/unit/profile-schema.test.ts` — stubs for PROF-01, PROF-03, PROF-04, PROF-09 Zod schema validation
- [ ] `tests/unit/slug-generation.test.ts` — covers PROF-07 slug logic (pure function, no DB needed)
- [ ] `tests/unit/avatar-validation.test.ts` — covers PROF-02 MIME + size client-side check
- [ ] `tests/unit/georgia-counties.test.ts` — covers GEO-02 static JSON has exactly 159 entries
- [ ] `tests/e2e/profile-edit.spec.ts` — covers PROF-12 publish gate UI
- [ ] `tests/e2e/profile-visibility.spec.ts` — covers PROF-13, PROF-14, RLS auth gate
- [ ] `tests/e2e/county-typeahead.spec.ts` — covers PROF-05 typeahead renders 159 counties

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Storage RLS rejects wrong-user path upload | PROF-02 | Requires 2 concurrent auth sessions | Log in as User A, copy User B's avatar storage path, attempt PUT/POST to that path with User A's token — expect 403 |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 10s (unit)
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
