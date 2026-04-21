---
phase: 4
slug: directory
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-04-20
---

# Phase 4 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | vitest |
| **Config file** | vitest.config.ts |
| **Quick run command** | `npx vitest run --reporter=verbose` |
| **Full suite command** | `npx vitest run` |
| **Estimated runtime** | ~15 seconds |

---

## Sampling Rate

- **After every task commit:** Run `npx vitest run --reporter=verbose`
- **After every plan wave:** Run `npx vitest run`
- **Before `/gsd-verify-work`:** Full suite must be green
- **Max feedback latency:** 30 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Threat Ref | Secure Behavior | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|------------|-----------------|-----------|-------------------|-------------|--------|
| 4-01-01 | 01 | 1 | DIR-05 | — | pg_trgm enabled, search_text populated | migration | `supabase db push && supabase db reset --local` | ❌ W0 | ⬜ pending |
| 4-01-02 | 01 | 1 | DIR-05 | — | search_text trigger fires on insert/update | unit | `npx vitest run tests/search-vector.test.ts` | ❌ W0 | ⬜ pending |
| 4-02-01 | 02 | 1 | DIR-01,DIR-02 | — | Authenticated users see profile cards | unit | `npx vitest run tests/directory.test.ts` | ❌ W0 | ⬜ pending |
| 4-02-02 | 02 | 1 | DIR-09 | — | Unverified/banned profiles excluded | unit | `npx vitest run tests/directory-rls.test.ts` | ❌ W0 | ⬜ pending |
| 4-03-01 | 03 | 2 | DIR-03,DIR-04 | — | Category + county filters produce AND logic | unit | `npx vitest run tests/filters.test.ts` | ❌ W0 | ⬜ pending |
| 4-03-02 | 03 | 2 | DIR-06 | — | URL params reflect filter state | unit | `npx vitest run tests/url-params.test.ts` | ❌ W0 | ⬜ pending |
| 4-04-01 | 04 | 2 | DIR-05 | — | Fuzzy search "bakng" returns baking profiles | unit | `npx vitest run tests/fuzzy-search.test.ts` | ❌ W0 | ⬜ pending |
| 4-05-01 | 05 | 3 | DIR-07 | — | Pagination renders 20 cards per page | unit | `npx vitest run tests/pagination.test.ts` | ❌ W0 | ⬜ pending |
| 4-06-01 | 06 | 3 | DIR-08 | — | Empty + zero-results states render CTA | unit | `npx vitest run tests/empty-states.test.ts` | ❌ W0 | ⬜ pending |
| 4-07-01 | 07 | 3 | DIR-10 | — | TTFB <1s at Vercel edge | manual | N/A | N/A | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `tests/search-vector.test.ts` — stubs for DIR-05 search_text trigger
- [ ] `tests/directory.test.ts` — stubs for DIR-01, DIR-02 profile cards
- [ ] `tests/directory-rls.test.ts` — stubs for DIR-09 visibility enforcement
- [ ] `tests/filters.test.ts` — stubs for DIR-03, DIR-04 filter AND logic
- [ ] `tests/url-params.test.ts` — stubs for DIR-06 URL param serialization
- [ ] `tests/fuzzy-search.test.ts` — stubs for DIR-05 pg_trgm fuzzy matching
- [ ] `tests/pagination.test.ts` — stubs for DIR-07 pagination
- [ ] `tests/empty-states.test.ts` — stubs for DIR-08 empty/zero-results states

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| TTFB <1s at Vercel edge | DIR-10 | Requires deployed environment + Vercel Speed Insights | Deploy to Vercel preview, run query with empty filters and category+county+keyword, verify TTFB <1s in Vercel Speed Insights dashboard |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 30s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
