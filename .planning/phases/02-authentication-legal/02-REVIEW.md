---
phase: 02-authentication-legal
reviewed: 2026-04-19T00:00:00Z
depth: standard
files_reviewed: 20
files_reviewed_list:
  - app/(auth)/login/LoginAuthCard.tsx
  - app/(auth)/login/page.tsx
  - app/(auth)/signup/page.tsx
  - app/auth/callback/route.ts
  - app/auth/confirm/route.ts
  - app/auth/error/page.tsx
  - app/auth/signout/route.ts
  - app/verify-pending/page.tsx
  - components/auth/GoogleAuthBlock.tsx
  - components/auth/GoogleButton.tsx
  - components/auth/LoginForm.tsx
  - components/auth/ResendLinkButton.tsx
  - lib/actions/auth.ts
  - lib/supabase/middleware.ts
  - lib/supabase/server.ts
  - lib/utils/disposable-email.ts
  - lib/utils/rate-limit.ts
  - middleware.ts
  - supabase/migrations/002_auth_tables.sql
  - tests/e2e/oauth-verified-gate.spec.ts
  - tests/e2e/resend-link-button.spec.ts
  - tests/e2e/single-turnstile.spec.ts
findings:
  critical: 1
  warning: 3
  info: 4
  total: 8
status: issues_found
---

# Phase 02: Authentication & Legal — Code Review

**Reviewed:** 2026-04-19
**Depth:** standard
**Files Reviewed:** 20
**Status:** issues_found

## Summary

Reviewed the full Phase 2 auth surface: login/signup pages, OAuth callback, magic-link confirm, email-verify gate, server action, middleware, rate-limit utility, disposable-email guard, SQL migration, and E2E test specs.

The overall implementation is well-structured. Security-sensitive patterns are largely correct: `getClaims()` is used exclusively on the server (never `getSession()`), open-redirect guards check both `startsWith('/')` and `!startsWith('//')`, the signout route is POST-only, and `user_metadata.email_verified` is explicitly untrusted throughout.

One critical bug was found in the `confirm/route.ts` — an error-message string is passed unsanitized into a URL query parameter and later rendered in the browser. Three warnings cover missing error handling paths, a logic gap in the LoginForm success state, and a SQL security-definer function granted to `anon`. Four info items flag dead code and minor hardening opportunities.

---

## Critical Issues

### CR-01: Supabase error message interpolated into redirect URL — potential information disclosure

**File:** `app/auth/confirm/route.ts:25`
**Issue:** When `verifyOtp` fails, the raw `error.message` from Supabase is URL-encoded and placed in a query parameter:
```ts
redirect(`/auth/error?reason=${encodeURIComponent(error?.message ?? 'verify_failed')}`)
```
`error.message` may contain internal details from the Supabase Auth server (e.g., JWT structure hints, token metadata, internal service names). The `auth/error/page.tsx` COPY lookup falls back to `COPY.default` for unknown keys — but the full Supabase error string remains visible in the browser address bar and will appear in browser history, referrer headers, and any analytics that capture URL parameters. The callback route (`app/auth/callback/route.ts`) correctly avoids this: it hardcodes `?reason=exchange_failed` rather than interpolating the error message.

**Fix:** Normalize to a fixed enum key before encoding, mirroring the callback route:
```ts
// Replace the current error redirect:
redirect(`/auth/error?reason=verify_failed`)

// If different failure modes need distinct copy, map to known keys first:
const knownReasons: Record<string, string> = {
  'Token has expired or is invalid': 'token_expired',
  'Email link is invalid or has expired': 'token_expired',
}
const reasonKey = knownReasons[error.message] ?? 'verify_failed'
redirect(`/auth/error?reason=${reasonKey}`)
```
Also add `token_expired` to the `COPY` record in `auth/error/page.tsx` with user-friendly copy.

---

## Warnings

### WR-01: `sendMagicLink` has no max-length guard on `captchaToken` — amplified payload accepted

**File:** `lib/actions/auth.ts:11`
**Issue:** The Zod schema validates captcha token presence with `z.string().min(1)` but no upper bound. A client can POST an arbitrarily large string as `cf-turnstile-response`. The payload travels through the action layer and is forwarded to Supabase Auth before being rejected. For a server action callable from any client, a `max` bound adds a cheap, zero-cost server-side gate.
**Fix:**
```ts
captchaToken: z.string().min(1).max(2048),
```
Cloudflare Turnstile tokens are typically ~2 KB; 2048 is a conservative safe ceiling.

---

### WR-02: `LoginForm` success state shows stale `submittedEmail` if re-rendered before submission completes

**File:** `components/auth/LoginForm.tsx:32,63-65`
**Issue:** `submittedEmail` is set synchronously inside the form `action` callback before `formAction(formData)` is called:
```ts
action={(formData: FormData) => {
  setSubmittedEmail(String(formData.get('email') ?? ''))
  formAction(formData)
}}
```
If the component unmounts and remounts (e.g., hot reload, Suspense boundary) while the action is in-flight, `submittedEmail` resets to `''`. The success message would then read "We sent a magic link to your inbox." This is a minor race condition but produces confusing UX when the email was known.

A secondary gap: if `formData.get('email')` is empty or null (e.g., JS disabled or field cleared), `submittedEmail` becomes an empty string and the success message shows the fallback "your inbox" even when the user typed a real address.

**Fix:** Derive the display email from `state` rather than a parallel local state, or read the email from the form field value at the time of submit:
```ts
// In the success branch, read from the RHF form value instead:
if (state?.ok) {
  const displayEmail = form.getValues('email') || 'your inbox'
  // ...
}
```
This reads from RHF's controlled state (still populated after submit) rather than a race-prone side channel.

---

### WR-03: `check_signup_ip` SECURITY DEFINER function granted to `anon` role

**File:** `supabase/migrations/002_auth_tables.sql:45`
**Issue:**
```sql
grant execute on function public.check_signup_ip(text) to anon, authenticated;
```
The function is `SECURITY DEFINER` — it runs with the privileges of the function owner (typically `postgres`/superuser), not the caller. Granting execute to `anon` means any unauthenticated Supabase client can call `supabase.rpc('check_signup_ip', { p_ip: 'arbitrary' })` directly from a browser, which:
1. Increments the rate-limit counter for any IP the caller supplies — a targeted counter-manipulation attack could exhaust another user's daily quota by calling `check_signup_ip` with their IP repeatedly.
2. Exposes the existence and semantics of the rate-limit table to unauthenticated callers.

The function is only legitimately called from the server action (inside `lib/utils/rate-limit.ts`), which already runs with service-role-equivalent context.

**Fix:** Remove `anon` from the grant and instead invoke via the service role key (which already bypasses RLS) within the server action. If the server client uses the publishable key, create a dedicated service-role client for this call or use a Postgres trigger/rule that fires on `auth.users` insert instead.

At minimum, restrict to authenticated only and ensure the server action is the sole caller:
```sql
-- Remove anon grant:
revoke execute on function public.check_signup_ip(text) from anon;
grant execute on function public.check_signup_ip(text) to authenticated;
```
Then ensure `lib/utils/rate-limit.ts` creates a service-role client (not the publishable-key client) so the call succeeds for unauthenticated signup attempts server-side.

---

## Info

### IN-01: `_mode` prop in `LoginAuthCard` is unused — dead code

**File:** `app/(auth)/login/LoginAuthCard.tsx:17`
**Issue:** The `mode` prop is destructured as `_mode` and never referenced in the component body. The comment says it is "reserved for future copy variants" but the two pages (`/login` and `/signup`) render identical JSX with only the surrounding `CardDescription` copy differing. This is harmless today but the reserved prop creates the expectation of future divergence that may never materialize.
**Fix:** Either use the prop for the copy variants now, or remove it and the `_mode` parameter until it is actually needed. If deferring, a `// TODO:` comment would at minimum signal intent.

---

### IN-02: `scripts/sync-disposable-domains.mjs` referenced in migration but does not exist

**File:** `supabase/migrations/002_auth_tables.sql:87`
**Issue:** The comment reads "Quarterly refresh: rerun scripts/sync-disposable-domains.mjs to re-seed." That script is not present in the repo. The `disposable-email-domains-js` npm package (primary gate) updates weekly via package updates, so the seed table being stale is not a security gap today. However, the missing script means the DB-layer defense-in-depth (`reject_disposable_email` trigger) will drift over time.
**Fix:** Create `scripts/sync-disposable-domains.mjs` before launch, or remove the comment and document that the trigger's seed list is intentionally frozen at install time. Do not reference a non-existent maintenance script in shipped code.

---

### IN-03: `error.message` logged to `console.error` in `confirm/route.ts` is potentially PII-containing

**File:** `app/auth/confirm/route.ts`
**Issue:** Unlike `app/auth/callback/route.ts` which logs only `{ code, status }` (deliberately not logging `error.message`), the confirm route does not log at all. This is actually fine — but the fix for CR-01 (above) should not introduce a `console.error` that logs the raw Supabase error message, as the callback route's comment explicitly calls out "deliberately NOT logging error.message" for PII reasons.
**Fix:** When implementing the CR-01 fix, add logging consistent with the callback pattern:
```ts
console.error('[auth/confirm] verifyOtp failed', {
  code: error.code,
  status: error.status,
  // deliberately NOT logging error.message — may contain PII
})
```

---

### IN-04: `ALWAYS_ALLOWED` in middleware does not redirect unauthenticated users away from `/verify-pending`

**File:** `lib/supabase/middleware.ts:14-21`
**Issue:** `/verify-pending` is correctly in `ALWAYS_ALLOWED` to prevent redirect loops for authenticated-but-unverified users. A side effect is that unauthenticated users who navigate directly to `/verify-pending` (e.g., from a bookmark after logging out) are not redirected — they see the page with `displayEmail = 'your inbox'` and a "Resend verification link" button pointing to `/login`. The page renders without crashing, so this is not a bug, but the user experience is confusing.
**Fix (optional):** Add an unauthenticated redirect in the middleware before the `ALWAYS_ALLOWED` check, or handle it in the `VerifyPendingPage` server component:
```ts
// In VerifyPendingPage, after getClaims():
if (!data?.claims?.sub) {
  redirect('/login')
}
```

---

_Reviewed: 2026-04-19_
_Reviewer: Claude (gsd-code-reviewer)_
_Depth: standard_
