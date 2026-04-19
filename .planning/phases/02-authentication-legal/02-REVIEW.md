---
phase: 02
status: issues_found
reviewed_at: 2026-04-19T14:00:00Z
---

# Phase 02: Authentication & Legal — Code Review

Advisory only. No changes required before merge unless marked **Blocker**.

---

## Security Issues

### S-01 — Turnstile on Google OAuth path: token may be stale by the time the user clicks [Advisory]

**File:** `components/auth/GoogleAuthBlock.tsx`, `components/auth/GoogleButton.tsx`

The `GoogleAuthBlock` holds a single `captchaToken` state. The Turnstile widget renders below the Google button, but a user could: (1) solve Turnstile, (2) navigate away briefly, (3) return and click "Continue with Google" with a token that Cloudflare has already expired (~5 min). The `onExpire` handler clears the token, which disables the button — this is correct. No exploit here, but it is worth noting that the two Turnstile instances (one in `GoogleAuthBlock`, one in `LoginForm`) render the Cloudflare iframe twice on every `/login` and `/signup` page load. Cloudflare may throttle or flag the double-iframe pattern. Consider a shared `TurnstileWidget` at the page level with two independent callbacks if that becomes a problem post-launch.

### S-02 — `x-forwarded-for` IP extraction: first hop trusted [Advisory]

**File:** `lib/actions/auth.ts`, line 57

```ts
const ip = (hdrs.get('x-forwarded-for') ?? '').split(',')[0].trim() || 'unknown'
```

Splitting on `,` and taking `[0]` is correct for Vercel (which prepends the real IP). On non-Vercel deployments or if a proxy chain is involved, this could be the first proxy, not the client. Acceptable for the current Vercel-only hosting target; add a comment to revisit if infra changes.

### S-03 — `getClaims()` usage is correct throughout [Informational]

**Files:** `lib/supabase/middleware.ts`, `app/verify-pending/page.tsx`, `components/layout/Footer.tsx`

All trust decisions use `getClaims()`, not `getSession()`. This is correct per CLAUDE.md and the threat register. `user_metadata.email_verified` is never trusted — the top-level `claims.email_verified` is used everywhere. No issues.

### S-04 — Open-redirect guard in callback + confirm routes [Informational]

**Files:** `app/auth/callback/route.ts` line 14, `app/auth/confirm/route.ts` line 16

Both guard `next` param by checking `nextParam.startsWith('/')`. This is the correct minimal check for same-origin redirects. No bypass risk (scheme-relative `//evil.com` does NOT start with `/` followed by a letter without a second slash... actually `//` does start with `/`).

**Wait — potential issue:** `'//evil.com'.startsWith('/')` returns `true`. A `?next=//evil.com/steal` param would pass the guard and redirect to `evil.com` in most browsers.

**Severity: Blocker**

**Fix:** Change guard to:
```ts
const next = (_next && _next.startsWith('/') && !_next.startsWith('//')) ? _next : '/directory'
```

Apply to both `app/auth/callback/route.ts` and `app/auth/confirm/route.ts`.

### S-05 — Disposable email check: fails open on malformed input [Informational — by design]

**File:** `lib/utils/disposable-email.ts`

The function returns `false` (not disposable) for malformed input. This is intentional and documented ("Fails OPEN on malformed input — the Postgres trigger is defense-in-depth"). Acceptable.

### S-06 — Rate limit fails open on RPC error [Informational — by design]

**File:** `lib/utils/rate-limit.ts`

Returns `{ allowed: true }` if the RPC errors. Documented and intentional. Turnstile + the DB trigger are primary defenses. Acceptable.

### S-07 — LogoutButton has no CSRF token [Advisory]

**File:** `components/auth/LogoutButton.tsx`

The logout form POSTs to `/auth/signout` with no CSRF token. This is a same-origin cookie-bound POST and the comment in `app/auth/signout/route.ts` explains why: the action is idempotent and the cookie is SameSite=Lax (Supabase default). A CSRF attack would log the victim out — not steal their session. For a community directory with no destructive server-side actions behind the logout button, this is acceptable. Note: if any future form uses the same pattern for state-mutating actions, a CSRF token will be required.

---

## Logic Errors

### L-01 — `sendMagicLink` does not validate `captchaToken` format beyond `min(1)` [Advisory]

**File:** `lib/actions/auth.ts`, line 11

```ts
captchaToken: z.string().min(1),
```

A single-character string satisfies this. Supabase Auth will reject the invalid token server-side. This is fine — the Zod check is just a presence guard, not a format check. Cloudflare tokens are opaque strings anyway. No issue.

### L-02 — `ResendLinkButton` navigates back to `/login?email=<prefill>` [Advisory]

**File:** `components/auth/ResendLinkButton.tsx`

The "Resend verification link" button on `/verify-pending` sends users to `/login?email=...`, relying on the `LoginForm` hydration useEffect to prefill the email. This is a redirect chain (`/verify-pending` → `/login`) rather than a direct resend. The comment acknowledges this as a deliberate MVP trade-off (avoids double Turnstile on `/verify-pending`). The UX is a bit rough: a user clicking "Resend" gets sent to the login page instead of seeing a confirmation. Flag for post-launch UX review.

### L-03 — `verify-pending` uses `getClaims()` to get email but doesn't handle unauthenticated state [Advisory]

**File:** `app/verify-pending/page.tsx`, lines 15-16

```ts
const { data } = await supabase.auth.getClaims()
const email = (data?.claims?.email as string | undefined) ?? 'your inbox'
```

If an unauthenticated user navigates directly to `/verify-pending`, middleware does NOT redirect them away (it's in `ALWAYS_ALLOWED`). The page renders with `email = 'your inbox'` — which is grammatically odd ("We sent a verification link to your inbox"). Not a security issue but a minor UX edge case.

### L-04 — Auth error page exposes `reason` param verbatim in the URL but only surfaces known copy [Informational]

**File:** `app/auth/error/page.tsx`

The `reason` query param is used as a lookup key against `COPY`, and unknown values fall back to `COPY.default`. Supabase error messages are passed via `encodeURIComponent(error?.message)` from `confirm/route.ts` — those messages could contain PII or internal error strings visible in the URL. The page itself only shows controlled copy, but the URL is visible to the user. For MVP this is fine; post-launch, consider normalizing to a small enum before encoding.

---

## Missing Edge Cases

### E-01 — No max-length enforcement on `captchaToken` in Zod schema [Advisory]

**File:** `lib/actions/auth.ts`

A malicious client could send an extremely large `captchaToken` string. Supabase will reject it, but the string still passes through the action layer. Adding `z.string().min(1).max(2048)` would add a cheap server-side guard.

### E-02 — `disposable-email-domains-js` package sync cadence undocumented [Advisory]

**File:** `supabase/migrations/002_auth_tables.sql`, line 87 comment

The SQL migration mentions "Quarterly refresh: rerun scripts/sync-disposable-domains.mjs" but that script does not appear to exist yet in the repo. The `disposable-email-domains-js` npm package updates weekly automatically (it's a dependency), so the primary gate is always current. The Postgres seed table is defense-in-depth only. The missing script is not a blocker, but `scripts/sync-disposable-domains.mjs` should be created before launch so the DB layer stays in sync.

### E-03 — `signup_attempts` table has no index beyond PK on `(ip, day)` [Informational]

**File:** `supabase/migrations/002_auth_tables.sql`

The GC query `DELETE FROM public.signup_attempts WHERE day < current_date - interval '7 days'` runs inside `check_signup_ip` on every signup attempt. The `(ip, day)` primary key index covers lookup by `ip + day` but the delete scans on `day` alone. For a table that stays small (5 signups/IP/day * active IPs), this is fine at MVP scale. Add a partial index on `day` if signup volume grows.

### E-04 — No rate limit on magic-link resend path [Advisory]

The `/login?email=...` resend path re-runs the full `sendMagicLink` action including the per-IP rate limit (AUTH-06) and Turnstile (AUTH-08). This means a user on `/verify-pending` clicking "Resend" must solve Turnstile again, and they are rate-limited the same as a new signup attempt. This is intentional (see `ResendLinkButton` comment), but it conflates "existing user resending verify link" with "new signup attempt" in the rate limit counter. Post-launch, a separate resend endpoint with its own lower rate limit (e.g., 3 resends per hour per email) would improve UX.

### E-05 — `ALWAYS_ALLOWED` in middleware does not include `/verify-pending` for unauthenticated users [Advisory]

**File:** `lib/supabase/middleware.ts`, line 22

`/verify-pending` is in `ALWAYS_ALLOWED` (correctly preventing redirect loops for authed+unverified users). However, an unauthenticated user who navigates directly to `/verify-pending` is not redirected — they see the page with no session. The middleware only redirects authed users away from `/login`/`/signup` — it does not redirect unauthenticated users away from `/verify-pending`. The page renders harmlessly (shows "your inbox"), so this is not a security issue, but it could confuse users who bookmark the page after logging out.

---

## Summary

| ID | Severity | File | Issue |
|----|----------|------|-------|
| S-04 | **Blocker** | `app/auth/callback/route.ts`, `app/auth/confirm/route.ts` | `//evil.com` passes `startsWith('/')` open-redirect guard |
| S-01 | Advisory | `GoogleAuthBlock.tsx` | Double Turnstile iframe may trigger Cloudflare throttle |
| S-02 | Advisory | `lib/actions/auth.ts` | `x-forwarded-for` first-hop trust is Vercel-specific |
| S-07 | Advisory | `LogoutButton.tsx` | No CSRF token (acceptable for idempotent logout) |
| L-02 | Advisory | `ResendLinkButton.tsx` | Resend redirects to /login — rough UX |
| L-03 | Advisory | `app/verify-pending/page.tsx` | Unauthenticated visit shows "your inbox" |
| L-04 | Advisory | `app/auth/error/page.tsx` | Supabase error messages visible in URL |
| E-01 | Advisory | `lib/actions/auth.ts` | No max-length on captchaToken in Zod |
| E-02 | Advisory | `002_auth_tables.sql` | `scripts/sync-disposable-domains.mjs` missing |
| E-03 | Informational | `002_auth_tables.sql` | No index on `day` column for GC query |
| E-04 | Advisory | `ResendLinkButton.tsx` | Resend conflates with new-signup rate limit |
| E-05 | Advisory | `lib/supabase/middleware.ts` | Unauthenticated `/verify-pending` not redirected |

**One blocker (S-04):** Fix the `//` open-redirect bypass in both route handlers before shipping to production.

All other findings are advisory — they do not block the phase goal or represent exploitable vulnerabilities at current MVP scale.

---
_Reviewed: 2026-04-19_
_Reviewer: Claude (gsd-code-review)_
