---
status: partial
phase: 06-landing-page-pwa-polish
source: [06-VERIFICATION.md]
started: 2026-04-21T00:00:00Z
updated: 2026-04-21T00:00:00Z
---

## Current Test

[awaiting human testing]

## Tests

### 1. E2E test suite pass
expected: All 4 landing E2E specs (landing-smoke, landing-metadata, landing-founding-strip, landing-mobile) pass against a live dev server via `pnpm exec playwright test --grep landing`
result: [pending]

### 2. 360px mobile layout
expected: No horizontal scroll at 360px viewport; all CTAs ≥44px tap height on iPhone SE (test at chrome://flags or DevTools device emulation)
result: [pending]

### 3. Social OG card
expected: Sharing barterkin.com renders the 1200×630 forest-gradient OG image with "Trade skills with your Georgia neighbors." heading (test via opengraph.xyz or social share preview)
result: [pending]

### 4. PWA install prompt
expected: Running `pnpm build && pnpm start` and visiting localhost:3000 in Chrome shows the install-to-homescreen prompt; service worker registers without errors in DevTools → Application → Service Workers
result: [pending]

## Summary

total: 4
passed: 0
issues: 0
pending: 4
skipped: 0
blocked: 0

## Gaps
