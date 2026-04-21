---
status: partial
phase: 05-contact-relay-trust-joined
source: [05-VERIFICATION.md]
started: 2026-04-21T03:50:00Z
updated: 2026-04-21T03:50:00Z
---

## Current Test

[awaiting human testing]

## Tests

### 1. Edge Function live deployment
expected: `pnpm supabase functions deploy send-contact` exits 0, `pnpm supabase secrets list` shows all 4 secrets
result: [pending]

### 2. Resend webhook configuration
expected: Webhook at https://barterkin.com/api/webhooks/resend enabled, 4 events, RESEND_WEBHOOK_SECRET in Vercel
result: [pending]

### 3. Email deliverability (CONT-05)
expected: Real email sent via relay, mail-tester.com score >= 9/10, SPF/DKIM/DMARC pass
result: [pending]

### 4. 11-step smoke test
expected: Two live accounts — contact send (reply-to correct), block flow (directory hidden), report flow (admin notified), badge clears on /profile visit
result: [pending]

### 5. PostHog contact_initiated event (CONT-11)
expected: Event appears in PostHog with recipient_county and recipient_category properties
result: [pending]

### 6. Admin SQL ban runbook (TRUST-03)
expected: SET banned=true hides user from directory and contact_eligibility returns ineligible
result: [pending]

### 7. Full test suite against live Supabase test project
expected: pnpm typecheck + pnpm test pass; 24/25 E2E pass (weekly-cap stub accepted)
result: [pending]

## Summary

total: 7
passed: 0
issues: 0
pending: 7
skipped: 0
blocked: 0

## Gaps
