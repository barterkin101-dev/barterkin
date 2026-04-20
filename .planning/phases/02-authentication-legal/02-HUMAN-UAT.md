---
status: partial
phase: 02-authentication-legal
source: [02-VERIFICATION.md]
started: 2026-04-20T02:25:00Z
updated: 2026-04-20T02:25:00Z
---

## Current Test

[awaiting human testing]

## Tests

### 1. Single Turnstile widget on /login
expected: Load /login in a real browser with NEXT_PUBLIC_TURNSTILE_SITE_KEY set. Exactly ONE Cloudflare Turnstile widget appears. Both the "Continue with Google" button and the "Send magic link" button are disabled until the widget solves, then both become enabled simultaneously.
result: [pending]

### 2. Single Turnstile widget on /signup
expected: Same as /login — exactly one Turnstile widget, both auth actions gated behind the single token.
result: [pending]

### 3. Google OAuth → /directory (not /verify-pending)
expected: Load /login in a real browser. Complete Turnstile. Click "Continue with Google". Complete the Google consent screen. After approval, land at /directory — NOT /verify-pending.
result: [pending]

### 4. Magic-link sign-in flow
expected: Enter a real email address in the magic-link form. Click "Send magic link". Email arrives within 60s. Clicking the link lands at /directory authenticated.
result: [pending]

### 5. Resend verification link button
expected: Sign up via magic link but do NOT click the verify link. While on /verify-pending, click "Resend verification link". Should navigate to /login (with email prefilled if known). No dead click.
result: [pending]

### 6. Email-verify gate (unverified user blocked)
expected: Sign up via magic link but do NOT click the verify link. While logged in, navigate to /directory. Should redirect to /verify-pending, not load the directory.
result: [pending]

### 7. supabase db push (DB migration)
expected: Run `supabase db push` against the remote project. Verify signup_attempts + disposable_email_domains tables exist in Supabase Studio → Database → Tables. `supabase db diff --schema public` returns empty.
result: [pending]

### 8. Type regeneration after migration push
expected: Run `supabase gen types typescript --project-id hfdcsickergdcdvejbcw > lib/database.types.ts`, then remove the @ts-expect-error from lib/utils/rate-limit.ts line 25 and run `pnpm typecheck`. Exit 0 with no errors.
result: [pending]

## Summary

total: 8
passed: 0
issues: 0
pending: 8
skipped: 0
blocked: 0

## Gaps
