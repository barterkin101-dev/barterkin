---
phase: 6
slug: landing-page-pwa-polish
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-04-21
---

# Phase 6 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Vitest 4.1.4 (unit) + Playwright 1.59.1 (E2E) |
| **Config file** | `vitest.config.ts` (unit) + `playwright.config.ts` (E2E) |
| **Quick run command** | `pnpm test` |
| **Full suite command** | `pnpm test && pnpm build && pnpm e2e` |
| **Estimated runtime** | ~5s unit / ~60s full E2E suite |

---

## Sampling Rate

- **After every task commit:** Run `pnpm test` (unit tests only — fast)
- **After every plan wave:** Run `pnpm test && pnpm build && pnpm e2e`
- **Before `/gsd-verify-work`:** Full suite green + human UAT (Facebook Debugger + Chrome DevTools Lighthouse PWA + 360px physical/iPhone SE)
- **Max feedback latency:** ~5 seconds (unit), ~60 seconds (E2E with webserver)

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Threat Ref | Secure Behavior | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|------------|-----------------|-----------|-------------------|-------------|--------|
| 06-W0-01 | 01 | 0 | LAND-01 | — | N/A | E2E setup | `pnpm e2e -- landing-smoke.spec.ts` | ❌ W0 | ⬜ pending |
| 06-W0-02 | 01 | 0 | LAND-03 | — | N/A | E2E setup | `pnpm e2e --project=iphone-se` | ❌ W0 | ⬜ pending |
| 06-01-01 | 01 | 1 | LAND-01 | T-6-01 | Anon SELECT only public fields; never email/owner_id | E2E | `pnpm e2e -- landing-smoke.spec.ts` | ❌ W0 | ⬜ pending |
| 06-01-02 | 01 | 1 | LAND-02 | T-6-02 | XSS-safe display_name rendering | E2E | `pnpm e2e -- landing-smoke.spec.ts` | ❌ W0 | ⬜ pending |
| 06-01-03 | 01 | 1 | GEO-03 | — | N/A | E2E | `pnpm e2e -- landing-smoke.spec.ts` | ❌ W0 | ⬜ pending |
| 06-02-01 | 02 | 1 | LAND-02 | T-6-02 | Founding strip fallback (no email leak) | E2E + unit | `pnpm e2e -- landing-founding-strip.spec.ts` | ❌ W0 | ⬜ pending |
| 06-02-02 | 02 | 1 | LAND-02 | — | N/A | E2E | `pnpm e2e -- landing-smoke.spec.ts` | ❌ W0 | ⬜ pending |
| 06-03-01 | 03 | 1 | LAND-03 | — | N/A | E2E | `pnpm e2e --project=iphone-se -- landing-mobile.spec.ts` | ❌ W0 | ⬜ pending |
| 06-04-01 | 04 | 2 | LAND-04 | T-6-03 | metadataBase is production URL, not preview | E2E | `pnpm e2e -- landing-metadata.spec.ts` | ❌ W0 | ⬜ pending |
| 06-04-02 | 04 | 2 | LAND-04 | — | N/A | E2E | `pnpm e2e -- landing-metadata.spec.ts` | ❌ W0 | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `tests/e2e/landing-smoke.spec.ts` — hero, how-it-works, county section, GEO-03 copy, footer links (REPLACES `smoke.spec.ts` Phase-1 card assertion)
- [ ] `tests/e2e/landing-metadata.spec.ts` — OG tags, twitter:card, manifest 200, /opengraph-image 200
- [ ] `tests/e2e/landing-founding-strip.spec.ts` — empty-state branch + populated-strip branch
- [ ] `tests/e2e/landing-mobile.spec.ts` — 360px no horizontal scroll, tap targets ≥44px
- [ ] `playwright.config.ts` — add `{ name: 'iphone-se', use: { ...devices['iPhone SE'] } }` project
- [ ] Update or retire `tests/e2e/smoke.spec.ts` — currently asserts Phase-1 scaffold card; will fail

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Preview card renders on X, Facebook, iMessage | LAND-04 | Social crawlers can't be automated in CI | Run Facebook Debugger (`developers.facebook.com/tools/debug`), Twitter Card Validator, and share URL in iMessage; confirm OG image + title appear |
| Chrome mobile "Add to Home Screen" prompt appears | LAND-04 | Requires physical device or Chrome DevTools App mode | Open `https://barterkin.com` on Android Chrome; check for install banner; confirm app icon + sage theme on launch |
| App functions offline for shell after install | LAND-04 | Service worker behavior is hard to CI-test reliably | Install PWA, go offline in DevTools, reload — confirm shell (layout, nav) loads; Supabase data shows graceful error state |
| 360px physical device render | LAND-03 | Playwright `iPhone SE` project covers emulation; physical is ground truth | Open on a physical iPhone SE or 360px-wide Android device; confirm no horizontal scroll |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 60s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
