---
phase: 02-authentication-legal
fixed_at: 2026-04-19T00:00:00Z
review_path: .planning/phases/02-authentication-legal/02-REVIEW.md
iteration: 1
findings_in_scope: 4
fixed: 4
skipped: 0
status: all_fixed
---

# Phase 02: Code Review Fix Report

**Fixed at:** 2026-04-19
**Source review:** .planning/phases/02-authentication-legal/02-REVIEW.md
**Iteration:** 1

**Summary:**
- Findings in scope: 4
- Fixed: 4
- Skipped: 0

## Fixed Issues

### CR-01: Supabase error message interpolated into redirect URL

**Files modified:** `app/auth/confirm/route.ts`
**Commit:** 668c1bb
**Applied fix:** Replaced `encodeURIComponent(error?.message ?? 'verify_failed')` with the hardcoded constant `verify_failed`. Also added a `console.error` logging `error.code` and `error.status` only (deliberately not logging `error.message`), consistent with the callback route pattern and the IN-03 guidance.

---

### WR-01: `captchaToken` schema missing max-length bound

**Files modified:** `lib/actions/auth.ts`
**Commit:** 4d1db14
**Applied fix:** Changed `z.string().min(1)` to `z.string().min(1).max(2048)` on the `captchaToken` field in `MagicLinkSchema`.

---

### WR-02: `LoginForm` success state uses race-prone `submittedEmail` state

**Files modified:** `components/auth/LoginForm.tsx`
**Commit:** ce0a3b3
**Applied fix:** Removed the `submittedEmail` local state variable and its `setSubmittedEmail` call in the form action. In the success branch, derived `displayEmail` from `form.getValues('email') || 'your inbox'` instead. Also removed the now-unused `useState` import.

---

### WR-03: `check_signup_ip` SECURITY DEFINER function granted to `anon`

**Files modified:** `supabase/migrations/002_auth_tables.sql`
**Commit:** 0fdaea8
**Applied fix:** Replaced `grant execute on function public.check_signup_ip(text) to anon, authenticated` with an explicit `revoke execute ... from anon` followed by `grant execute ... to authenticated`. Since the migration had not yet been applied to any environment (it was the only migration in the repo), the fix was applied directly to the migration file rather than adding a new migration. Added a comment explaining that the server action uses a service-role client and so unauthenticated signup rate-limit checks still function correctly server-side.

---

_Fixed: 2026-04-19_
_Fixer: Claude (gsd-code-fixer)_
_Iteration: 1_
