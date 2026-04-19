---
phase: 2
slug: authentication-legal
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-04-19
---

# Phase 2 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Vitest 4.1.4 (unit) + Playwright 1.59.1 (E2E) |
| **Config file** | `vitest.config.ts` + `playwright.config.ts` (both installed Phase 1) |
| **Quick run command** | `pnpm test` |
| **Full suite command** | `pnpm test && pnpm e2e` |
| **Estimated runtime** | ~60 seconds (full) |

---

## Sampling Rate

- **After every task commit:** Run `pnpm lint && pnpm typecheck && pnpm test`
- **After every plan wave:** Run `pnpm lint && pnpm typecheck && pnpm test && pnpm e2e`
- **Before `/gsd-verify-work`:** Full suite must be green + Playwright smoke on Vercel preview URL
- **Max feedback latency:** 60 seconds (full suite)

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Threat Ref | Secure Behavior | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|------------|-----------------|-----------|-------------------|-------------|--------|
| AUTH-01 | TBD | 0 | AUTH-01 | T-2-01 (OAuth redirect injection) | Google OAuth round-trip lands authenticated; redirect URIs validated by Supabase Studio allowlist | E2E | `pnpm e2e tests/e2e/login-google-oauth.spec.ts` | ❌ Wave 0 | ⬜ pending |
| AUTH-02 | TBD | 0 | AUTH-02 | T-2-02 (magic-link replay) | Magic link → /auth/confirm → session set; PKCE prevents code injection | E2E | `pnpm e2e tests/e2e/login-magic-link.spec.ts` | ❌ Wave 0 | ⬜ pending |
| AUTH-03 | TBD | 0 | AUTH-03 | — | Session persists across browser refresh (30-day window) | E2E | `pnpm e2e tests/e2e/session-persistence.spec.ts` | ❌ Wave 0 | ⬜ pending |
| AUTH-04a | TBD | 0 | AUTH-04 | T-2-04 (RLS bypass) | Unverified user → /verify-pending redirect via middleware | E2E | `pnpm e2e tests/e2e/verify-pending-gate.spec.ts` | ❌ Wave 0 | ⬜ pending |
| AUTH-04b | TBD | 0 | AUTH-04 | T-2-04 (RLS bypass) | RLS blocks unverified profile from directory query even if middleware bypassed | Unit | `pnpm test tests/unit/rls-email-verify.test.ts` | ❌ Wave 0 | ⬜ pending |
| AUTH-05 | TBD | 0 | AUTH-05 | T-2-05 (CSRF on logout) | Logout POST handler clears session; GET prefetch cannot trigger logout | E2E | `pnpm e2e tests/e2e/logout.spec.ts` | ❌ Wave 0 | ⬜ pending |
| AUTH-06 | TBD | 0 | AUTH-06 | T-2-06 (bot mass signup) | 6th signup from same IP in 24h rejected with friendly error | Unit + E2E | `pnpm test tests/unit/rate-limit.test.ts` | ❌ Wave 0 | ⬜ pending |
| AUTH-07 | TBD | 0 | AUTH-07 | T-2-07 (disposable email) | @mailinator.com rejected; no auth.users row created | Unit + E2E | `pnpm test tests/unit/disposable-email.test.ts` | ❌ Wave 0 | ⬜ pending |
| AUTH-08 | TBD | 0 | AUTH-08 | T-2-08 (CAPTCHA bypass) | Signup without valid Turnstile token rejected at server action layer | E2E | `pnpm e2e tests/e2e/captcha-required.spec.ts` | ❌ Wave 0 | ⬜ pending |
| AUTH-09 | TBD | 0 | AUTH-09 | — | Authenticated user on /login redirected to /directory (or /) | E2E | `pnpm e2e tests/e2e/auth-group-redirect.spec.ts` | ❌ Wave 0 | ⬜ pending |
| AUTH-10 | TBD | 0 | AUTH-10 | — | All three legal pages render with correct H1 and required headings | E2E | `pnpm e2e tests/e2e/legal-pages.spec.ts` | ❌ Wave 0 | ⬜ pending |
| GEO-04 | TBD | 0 | GEO-04 | — | ToS contains locked non-residency clause verbatim | E2E | `pnpm e2e tests/e2e/legal-pages.spec.ts` (::tos-has-geo04) | ❌ Wave 0 | ⬜ pending |
| MAGIC-SCHEMA | TBD | 0 | AUTH-02 | — | Zod email schema validates/rejects correctly | Unit | `pnpm test tests/unit/magic-link-schema.test.ts` | ❌ Wave 0 | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

All test files are new (Vitest + Playwright already installed in Phase 1 — no framework install needed):

- [ ] `tests/unit/disposable-email.test.ts` — covers AUTH-07 (5 disposable, 5 legitimate domains)
- [ ] `tests/unit/rate-limit.test.ts` — covers AUTH-06 (function-level, in-memory mock)
- [ ] `tests/unit/magic-link-schema.test.ts` — Zod schema happy/unhappy paths (AUTH-02)
- [ ] `tests/unit/rls-email-verify.test.ts` — SQL integration against local `supabase start` (AUTH-04b)
- [ ] `tests/e2e/login-magic-link.spec.ts` — covers AUTH-02
- [ ] `tests/e2e/login-google-oauth.spec.ts` — covers AUTH-01 (mocked OAuth)
- [ ] `tests/e2e/verify-pending-gate.spec.ts` — covers AUTH-04a
- [ ] `tests/e2e/auth-group-redirect.spec.ts` — covers AUTH-09
- [ ] `tests/e2e/session-persistence.spec.ts` — covers AUTH-03
- [ ] `tests/e2e/logout.spec.ts` — covers AUTH-05
- [ ] `tests/e2e/captcha-required.spec.ts` — covers AUTH-08
- [ ] `tests/e2e/legal-pages.spec.ts` — covers AUTH-10 + GEO-04 verbatim clause
- [ ] `tests/e2e/footer-links.spec.ts` — covers UI-SPEC footer contract
- [ ] `tests/e2e/helpers/mock-supabase.ts` — shared Playwright fixture for mocking auth responses

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Real Google OAuth consent screen | AUTH-01 | Requires browser + live Google account; consent screen branding/permissions must be visually confirmed | Sign in with a real Google account on the Vercel preview URL; confirm app name "Barterkin", permission list (email only), and successful redirect back |
| Real Resend magic-link delivery | AUTH-02 | Inbox delivery cannot be automated without IMAP integration | Request magic link for barterkin101@gmail.com; confirm link arrives, is not in spam, and works end-to-end |
| Supabase Studio OAuth + Turnstile config | AUTH-01, AUTH-08 | Studio dashboard configuration cannot be tested by the app's own test suite | Follow Wave 0 runbook: configure Google client ID/secret, Turnstile site/secret, verify redirect URL allowlist includes prod + preview wildcard |
| Rate-limit behavior under IP rotation | AUTH-06 | Residential proxy bypass is a known limitation; cannot be fully automated | Document as known limitation; confirm single-IP rate limit works as designed |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 60s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
