---
phase: 5
slug: contact-relay-trust-joined
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-04-21
---

# Phase 5 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Vitest 4.1.4 (unit) + Playwright 1.59.1 (E2E) |
| **Config file** | `vitest.config.ts` + `playwright.config.ts` (both at repo root) |
| **Quick run command** | `pnpm test` |
| **Full suite command** | `pnpm test && pnpm e2e` |
| **Estimated runtime** | ~10s (unit) + ~2 min (E2E) |

---

## Sampling Rate

- **After every task commit:** Run `pnpm test`
- **After every plan wave:** Run `pnpm test && pnpm e2e`
- **Before `/gsd-verify-work`:** Full suite must be green + HUMAN-UAT for email-header inspection + `mail-tester.com ≥9/10`
- **Max feedback latency:** ~10 seconds (unit); ~120 seconds (E2E)

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Threat Ref | Secure Behavior | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|------------|-----------------|-----------|-------------------|-------------|--------|
| 5-W0-01 | W0 | 0 | CONT-02 | — | Message bounds validated server-side | unit | `pnpm test contact-schema.test.ts` | ❌ W0 | ⬜ pending |
| 5-W0-02 | W0 | 0 | CONT-06 | T-privacy | Recipient email not in response shape | unit | `pnpm test contact-response-shape.test.ts` | ❌ W0 | ⬜ pending |
| 5-W0-03 | W0 | 0 | CONT-09 | T-webhook-forgery | Webhook updates status when signed correctly | unit | `pnpm test resend-webhook.test.ts` | ❌ W0 | ⬜ pending |
| 5-W0-04 | W0 | 0 | TRUST-07 | T-eligibility | Edge Function rejects all 5 ineligibility conditions | unit | `pnpm test contact-eligibility.test.ts` | ❌ W0 | ⬜ pending |
| 5-W0-05 | W0 | 0 | TRUST-05 | T-rls | Reports table opaque to authed non-admin | unit | `pnpm test reports-rls.test.ts` | ❌ W0 | ⬜ pending |
| 5-E2E-01 | relay | 2+ | CONT-01 | — | Contact button opens Sheet when accepting_contact=true | E2E | `pnpm exec playwright test contact-relay.spec.ts -g "opens sheet"` | ❌ W0 | ⬜ pending |
| 5-E2E-02 | relay | 2+ | CONT-01 | — | Button hidden when accepting_contact=false | E2E | `pnpm exec playwright test contact-relay.spec.ts -g "hidden when not accepting"` | ❌ W0 | ⬜ pending |
| 5-E2E-03 | relay | 2+ | CONT-04 | T-spam | contact_requests row inserted with correct FK | E2E | `pnpm exec playwright test contact-relay.spec.ts -g "inserts row"` | ❌ W0 | ⬜ pending |
| 5-E2E-04 | relay | 2+ | CONT-07 | T-spam | Sender 5/day cap enforced | E2E | `pnpm exec playwright test contact-rate-limit.spec.ts -g "daily cap"` | ❌ W0 | ⬜ pending |
| 5-E2E-05 | relay | 2+ | CONT-08 | T-spam | 2/week per-recipient cap enforced | E2E | `pnpm exec playwright test contact-rate-limit.spec.ts -g "per-recipient cap"` | ❌ W0 | ⬜ pending |
| 5-E2E-06 | trust | 2+ | TRUST-02 | T-harassment | Block hides from directory + blocks relay | E2E | `pnpm exec playwright test block-flow.spec.ts` | ❌ W0 | ⬜ pending |
| 5-E2E-07 | trust | 2+ | TRUST-01 | — | Report submission with reason + note | E2E | `pnpm exec playwright test report-flow.spec.ts` | ❌ W0 | ⬜ pending |
| 5-E2E-08 | trust | 2+ | TRUST-06 | — | Report emails admin (stubbed Resend) | E2E | `pnpm exec playwright test report-flow.spec.ts -g "admin notified"` | ❌ W0 | ⬜ pending |
| 5-E2E-09 | badge | 2+ | CONT-10 | — | Unseen-contact badge appears after send | E2E | `pnpm exec playwright test unseen-badge.spec.ts -g "shows"` | ❌ W0 | ⬜ pending |
| 5-E2E-10 | badge | 2+ | CONT-10 | — | Visiting /profile clears badge | E2E | `pnpm exec playwright test unseen-badge.spec.ts -g "clears"` | ❌ W0 | ⬜ pending |
| 5-E2E-11 | trust | 2+ | TRUST-03 | T-ban | profiles.banned=true hides + rejects relay | E2E | `pnpm exec playwright test ban-enforcement.spec.ts` | ❌ W0 | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `tests/unit/contact-schema.test.ts` — stubs for CONT-02 (message bounds 20–500), TRUST-01 (reason enum)
- [ ] `tests/unit/contact-response-shape.test.ts` — CONT-06 privacy invariant (no email field in response)
- [ ] `tests/unit/resend-webhook.test.ts` — CONT-09 (mocked svix-signed payload, asserts DB status update)
- [ ] `tests/unit/contact-eligibility.test.ts` — TRUST-07 (5 rejection conditions via RPC test harness)
- [ ] `tests/unit/reports-rls.test.ts` — TRUST-05 (authed SELECT on reports returns 0 rows)
- [ ] `tests/e2e/contact-relay.spec.ts` — CONT-01, CONT-04
- [ ] `tests/e2e/contact-rate-limit.spec.ts` — CONT-07, CONT-08
- [ ] `tests/e2e/block-flow.spec.ts` — TRUST-02
- [ ] `tests/e2e/report-flow.spec.ts` — TRUST-01, TRUST-06
- [ ] `tests/e2e/unseen-badge.spec.ts` — CONT-10
- [ ] `tests/e2e/ban-enforcement.spec.ts` — TRUST-03
- [ ] `tests/e2e/fixtures/contact-helpers.ts` — shared: create 2 seeded profiles via service-role, cleanup
- [ ] `tests/utils/admin.ts` — test-only service-role helper for flipping `banned`, inserting `blocks`, querying `contact_requests` (never bundled into app)

**No framework install needed** — Vitest + Playwright already configured.

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Email headers (From, Reply-To, X-Entity-Ref-ID) correct | CONT-05 | Requires real Resend send + email client inspection | Send a test relay, open in Gmail, click "Show original", verify `From: noreply@<domain>`, `Reply-To: <sender_email>`, `X-Entity-Ref-ID: <uuid>` |
| Reply in mail client reaches sender, not Barterkin | CONT-05, CONT-06 | End-to-end mail client behavior can't be automated | Recipient replies to relay email; verify reply arrives in sender's inbox only |
| `mail-tester.com ≥9/10` deliverability score | CONT-05 | External DNS + mail reputation check | Send to a `mail-tester.com` generated address before launch; requires SPF/DKIM/DMARC configured |
| PostHog event `contact_initiated` fires with anonymized IDs | CONT-11 | Edge Function Deno env makes posthog-node test harness complex | Trigger a send in staging, verify event appears in PostHog dashboard with correct properties (anonymized county/category, NOT email/name) |
| Admin SQL ban pattern | TRUST-04 | No admin UI at MVP; runbook doc only | `supabase db execute "UPDATE profiles SET banned=true WHERE id='<uuid>'"` then verify profile disappears from directory and relay rejects |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 10s (unit) / 120s (E2E)
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
