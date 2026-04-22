---
phase: 8
slug: admin-dashboard-non-technical-ui-at-admin-for-wife-to-manage
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-04-22
---

# Phase 8 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Vitest 3.x (unit) + Playwright 1.x (E2E) |
| **Config file** | `vitest.config.ts` (unit), `playwright.config.ts` (E2E) |
| **Quick run command** | `pnpm test` |
| **Full suite command** | `pnpm test && pnpm e2e` |
| **Estimated runtime** | ~30 seconds (unit suite), ~2 min (full suite) |

---

## Sampling Rate

- **After every task commit:** Run `pnpm test`
- **After every plan wave:** Run `pnpm test && pnpm e2e`
- **Before `/gsd-verify-work`:** Full suite must be green
- **Max feedback latency:** 30 seconds (unit), 120 seconds (full)

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Threat Ref | Secure Behavior | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|------------|-----------------|-----------|-------------------|-------------|--------|
| 8-01-01 | 01 | 0 | ADMIN-06 | T-8-01 | Non-admin redirected to / | E2E | `pnpm e2e -- tests/e2e/admin-auth-guard.spec.ts` | ❌ W0 | ⬜ pending |
| 8-01-02 | 01 | 0 | ADMIN-01 | — | Stats counts return correct values | unit | `pnpm test -- tests/unit/admin-data.test.ts` | ❌ W0 | ⬜ pending |
| 8-01-03 | 01 | 0 | ADMIN-05 | — | Status filter returns only matching rows | unit | `pnpm test -- tests/unit/admin-data.test.ts` | ❌ W0 | ⬜ pending |
| 8-02-01 | 02 | 1 | ADMIN-02 | — | Members list filters by name in real-time | unit | `pnpm test -- tests/unit/admin-members-search.test.ts` | ❌ W0 | ⬜ pending |
| 8-03-01 | 03 | 1 | ADMIN-03 | — | Member detail shows all fields + ban state | E2E | `pnpm e2e -- tests/e2e/admin-member-detail.spec.ts` | ❌ W0 | ⬜ pending |
| 8-03-02 | 03 | 1 | ADMIN-04 | T-8-02 | Ban sets banned=true; profile hidden from directory | E2E | `pnpm e2e -- tests/e2e/admin-ban-unban.spec.ts` | ❌ W0 | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `tests/unit/admin-data.test.ts` — stubs for ADMIN-01, ADMIN-05 (mock `supabaseAdmin`, assert COUNT values and status filter)
- [ ] `tests/unit/admin-members-search.test.ts` — stubs for ADMIN-02 (render `<MembersTable>`, type in search input, assert filtered rows)
- [ ] `tests/e2e/admin-auth-guard.spec.ts` — stubs for ADMIN-06 (non-admin redirect from all `/admin/*` paths)
- [ ] `tests/e2e/admin-member-detail.spec.ts` — stubs for ADMIN-03
- [ ] `tests/e2e/admin-ban-unban.spec.ts` — stubs for ADMIN-04 (admin UI flow: login → member detail → ban → confirm → badge change)

*Existing infrastructure (`vitest.config.ts`, `playwright.config.ts`) verified in prior phases — no framework installs needed.*

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Real-time search feels instantaneous as she types | ADMIN-02 | UX quality, not logic | Log in as admin → /admin/members → type progressively — filtering should be instant with no visible lag |
| Stats card "Last 7 days" label is unambiguous | ADMIN-01 | Copy review | Verify label reads "Last 7 days" not "This week" to avoid calendar-week ambiguity |
| Admin chrome is usable by a non-technical user | ADMIN-02 to ADMIN-05 | UX judgment | End-to-end walkthrough by the admin user before sign-off |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 30s (unit), 120s (E2E)
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
