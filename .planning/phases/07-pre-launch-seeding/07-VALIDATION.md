---
phase: 7
slug: pre-launch-seeding
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-04-21
---

# Phase 7 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Vitest 3.x + Playwright 1.x (existing) |
| **Config file** | `vitest.config.ts`, `playwright.config.ts` |
| **Quick run command** | `pnpm test` |
| **Full suite command** | `pnpm test && pnpm e2e` |
| **Estimated runtime** | ~60 seconds (unit) / ~3 minutes (full) |

---

## Sampling Rate

- **After every task commit:** Run `pnpm test`
- **After every plan wave:** Run `pnpm test && pnpm e2e`
- **Before `/gsd-verify-work`:** Full suite must be green + SQL coverage gate satisfied
- **Max feedback latency:** 60 seconds (unit only)

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Threat Ref | Secure Behavior | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|------------|-----------------|-----------|-------------------|-------------|--------|
| 07-01-01 | 01 | 1 | SEED-01 | — | Outreach template approved by Ashley before any DMs are sent | manual | N/A — artifact review of `docs/outreach-template.md` | ❌ W0 | ⬜ pending |
| 07-01-02 | 01 | 1 | SEED-02 | — | Google Form captures all required fields (consent, display name, skills, county, email) | manual | N/A — form spec review | ❌ W0 (spec in PLAN.md) | ⬜ pending |
| 07-02-01 | 02 | 2 | SEED-03 | — | Seed script creates Supabase auth user + profile row with founding_member=true | unit | `pnpm vitest run tests/unit/seed-founding-members.test.ts` | ❌ W0 | ⬜ pending |
| 07-02-02 | 02 | 2 | SEED-03 | — | Script is idempotent — skips existing emails, safe to re-run | unit | `pnpm vitest run tests/unit/seed-founding-members.test.ts -t idempotent` | ❌ W0 | ⬜ pending |
| 07-03-01 | 03 | 2 | SEED-04 | — | DirectoryCard renders founding-member badge when founding_member=true | e2e | `pnpm playwright test tests/e2e/founding-badge.spec.ts` | ❌ W0 | ⬜ pending |
| 07-03-02 | 03 | 2 | SEED-04 | — | Profile detail page renders founding-member badge when founding_member=true | e2e | `pnpm playwright test tests/e2e/founding-badge.spec.ts -t "detail page"` | ❌ W0 | ⬜ pending |
| 07-04-01 | 04 | 3 | SEED-05 | — | ≥30 seeded profiles spanning ≥2 counties and ≥3 categories confirmed before launch | sql | `psql $DATABASE_URL -f scripts/sql/seed-coverage.sql` or inline in seed script (D-13) | ❌ W0 | ⬜ pending |
| 07-05-01 | 05 | 3 | SEED-06 | — | STATE.md contains Founder Commitment entry | artifact | `grep -c "Founder Commitment" .planning/STATE.md` ≥ 1 | — direct file check | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `tests/unit/seed-founding-members.test.ts` — unit stubs for SEED-03 (idempotency + profile insert logic)
- [ ] `tests/e2e/founding-badge.spec.ts` — E2E stubs for SEED-04 (DirectoryCard + detail page badge rendering)
- [ ] `scripts/sql/seed-coverage.sql` — SQL assertion for ≥30 profiles / ≥2 counties / ≥3 categories (or inline in seed script)

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Outreach template tone and content is warm, personal, references specific listing | SEED-01 | Human judgment required — no automated content quality check | Ashley reviews `docs/outreach-template.md` before sending any DMs |
| Google Form includes consent Y/N, display name, skills, county, email fields | SEED-02 | Google Form is an external artifact — cannot be tested in CI | Ashley reviews the live form spec in PLAN.md and the actual form URL before outreach begins |
| 11 TikTok DMs sent with individualized references | SEED-01 | External social platform — no API automation | Ashley confirms all 11 DMs sent; outreach log updated in `docs/outreach-template.md` |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 60s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
