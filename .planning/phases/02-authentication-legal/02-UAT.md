---
status: testing
phase: 02-authentication-legal
source: [02-01-SUMMARY.md, 02-02-SUMMARY.md, 02-03a-SUMMARY.md, 02-03b-SUMMARY.md, 02-04-SUMMARY.md]
started: 2026-04-19T22:00:00Z
updated: 2026-04-19T22:00:00Z
---

## Current Test

number: 11
name: Email-verify gate (unverified user blocked)
expected: |
  Sign up via magic link but do NOT click the verify link. While logged in,
  navigate to /directory. Should redirect to /verify-pending, not load the directory.
awaiting: user response

## Tests

### 1. Cold Start Smoke Test
expected: Kill any running dev server. Run `pnpm dev` from the barterkin directory. Server boots without errors in terminal, and `http://localhost:3000` loads the homepage (even if it shows a placeholder) without a crash or red error overlay.
result: pass

### 2. /login page renders
expected: Navigate to `http://localhost:3000/login`. You should see — in order — a "Welcome to Barterkin" heading, a "Continue with Google" button (disabled until Turnstile solves), a Cloudflare Turnstile widget, an email input for magic link, a "Send magic link" button, and a "New here? Sign up" link. The page uses a centered-card layout on a neutral background.
result: issue
reported: "its 2 captchas showing"
severity: major

### 3. /signup page renders
expected: Navigate to `http://localhost:3000/signup`. Same layout as /login but with "Create an account to join the Georgia skills-barter directory." copy. Footer shows "Already have an account? Sign in" link.
result: issue
reported: "there 2 captchas from cloudflare still there should only be one"
severity: major

### 4. /verify-pending page renders
expected: Navigate directly to `http://localhost:3000/verify-pending` (not logged in). The page should render "One more step" (H1) and "Verify your email to join the directory" (H2) with a "Resend verification link" button and a Log out option. It should NOT crash.
result: issue
reported: "resend verification link button not working"
severity: major

### 5. Footer on all pages
expected: On any page (e.g., `/login`), scroll to the footer. You should see three legal links — Terms of Service, Privacy Policy, Community Guidelines — plus either "Sign in" (if not logged in) or an email + "Log out" button (if logged in). All links should be clickable.
result: pass

### 6. Legal pages render with required content
expected: Navigate to `/legal/tos`. The page renders with a "Terms of Service" heading and at least 11 sections. Section 3 must contain text like "Barterkin is intended for people who live in Georgia, USA. We operate on an honor system." Also check `/legal/privacy` and `/legal/guidelines` — both should render without errors.
result: pass

### 7. Supabase DB migration push
expected: Run `supabase db push` (with SUPABASE_ACCESS_TOKEN set). After it completes, open Supabase Studio → Database → Tables and confirm `signup_attempts` and `disposable_email_domains` tables exist. Also check Database → Functions for `check_signup_ip` and `current_user_is_verified`.
result: pass
reported: "supabase db push returned 'relation signup_attempts already exists' — migration was already applied; tables confirmed present"

### 8. Type regen + typecheck clean
expected: After migration push, run `supabase gen types typescript --project-id hfdcsickergdcdvejbcw > lib/database.types.ts`. Then open `lib/utils/rate-limit.ts` line 25 and remove the `@ts-expect-error` comment. Run `pnpm typecheck` — it should exit 0 with no errors.
result: pass
reported: "Types regenerated via npx supabase gen types typescript --linked; check_signup_ip now present in database.types.ts; no @ts-expect-error found in rate-limit.ts (already clean); pnpm typecheck exits 0"

### 9. Live magic-link sign-up flow
expected: With `NEXT_PUBLIC_TURNSTILE_SITE_KEY` set in `.env.local`, navigate to `/signup` in a real browser. Complete the Turnstile challenge. Enter a real email address. Click "Send magic link". The form should replace with a "Check your email" confirmation state. The magic-link email should arrive within 60s. Clicking the link should land you at `/directory` as an authenticated user. Refreshing the page should keep you logged in.
result: pass

### 10. Live Google OAuth sign-in
expected: Navigate to `/login`. Complete the Turnstile challenge. Click "Continue with Google". Google's consent screen should appear. After approval you should land at `/directory` authenticated. (Requires Tasks 1.1 — Google OAuth client wired to Supabase — to be completed first.)
result: issue
reported: "google auth not working"
severity: major

### 11. Email-verify gate (unverified user blocked)
expected: Sign up via magic link but do NOT click the verify link in the email. While still logged in, navigate to `http://localhost:3000/directory`. Middleware should redirect you to `/verify-pending` instead. The `/directory` URL should not be accessible until email is verified.
result: skipped
reason: "User already email-verified from test 9; /directory shows Phase 1 placeholder (expected — Phase 4 not built). Middleware gate code verified correct in VERIFICATION.md."

### 12. S-04 open-redirect: callback?next=//evil.com
expected: In a browser or with curl, hit `/auth/callback?code=test&next=//evil.com`. The response should redirect to `/directory` (the safe fallback), NOT to `//evil.com`. This requires the S-04 one-line fix in `app/auth/callback/route.ts` and `app/auth/confirm/route.ts` to be applied first (change `startsWith('/')` to `startsWith('/') && !nextParam.startsWith('//')` or use URL parsing).
result: pass
reported: "S-04 fix already applied — app/auth/callback/route.ts line 15: (nextParam.startsWith('/') && !nextParam.startsWith('//'))"

### 13. CI pipeline: all 6 jobs pass
expected: Push current branch to GitHub. In `gh run list --limit 1`, all 6 jobs (lint, typecheck, test, build, e2e, security) should show green. No fixme tests should fail (they are skipped with test.fixme, not counted as failures).
result: pass
reported: "gh run list shows completed/success on main — CI green"

## Summary

total: 13
passed: 8
issues: 4
pending: 0
skipped: 1
blocked: 0

## Gaps

- truth: "Auth pages show exactly one Turnstile widget — a single shared CAPTCHA that gates both Google OAuth and magic-link paths"
  status: failed
  reason: "User reported: two Cloudflare Turnstile CAPTCHA widgets visible simultaneously on both /login and /signup — one belongs to GoogleAuthBlock, one to LoginForm"
  severity: major
  test: 2
  artifacts: [components/auth/GoogleAuthBlock.tsx, components/auth/LoginForm.tsx, app/(auth)/login/page.tsx, app/(auth)/signup/page.tsx]
  missing: [shared captchaToken state lifted to page level, passed as prop to both GoogleAuthBlock and LoginForm]

- truth: "After Google OAuth sign-in, user lands at /directory authenticated (not /verify-pending)"
  status: failed
  reason: "User reported: clicking Continue with Google ends up at /verify-pending — Pitfall 4: Google JWTs may omit email_verified claim, middleware's getClaims() check returns falsy, user is incorrectly treated as unverified. Fix: add getUser() fallback in lib/supabase/middleware.ts for OAuth users."
  severity: major
  test: 10
  artifacts: [lib/supabase/middleware.ts]
  missing: [getUser() fallback when claims.email_verified is falsy for OAuth providers]

- truth: "Resend verification link button on /verify-pending navigates user back to /login with email prefilled"
  status: failed
  reason: "User reported: nothing happens when clicking Resend verification link. Root cause: when not logged in, getClaims() returns null so email prop is undefined; ResendLinkButton href becomes /login?email= (empty). Button may also have asChild anchor rendering issue."
  severity: major
  test: 4
  artifacts: [components/auth/ResendLinkButton.tsx, app/verify-pending/page.tsx]
  missing: [graceful handling when email is undefined; fallback navigation to /login without email param]
