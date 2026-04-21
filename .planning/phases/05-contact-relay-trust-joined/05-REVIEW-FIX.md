---
phase: 05-contact-relay-trust-joined
status: all_fixed
findings_in_scope: 6
fixed: 6
skipped: 0
iteration: 1
fixed_at: 2026-04-21T00:00:00Z
review_path: .planning/phases/05-contact-relay-trust-joined/05-REVIEW.md
---

# Phase 05: Code Review Fix Report

**Fixed at:** 2026-04-21
**Source review:** `.planning/phases/05-contact-relay-trust-joined/05-REVIEW.md`
**Iteration:** 1

## Summary

- Findings in scope: 6 (3 HIGH, 3 MEDIUM)
- Fixed: 6
- Skipped: 0

---

## Fixed Issues

### H-01: Race condition allows double-send before partial unique index fires

**Files modified:** `supabase/migrations/006_send_contact_gated.sql`, `supabase/functions/send-contact/index.ts`
**Commit:** `bdf4b79` — fix(05): H-01 atomic rate-limit via send_contact_gated RPC with advisory lock

**Applied fix:**
Created migration `006_send_contact_gated.sql` with a new `public.send_contact_gated(uuid, uuid, text)` SECURITY DEFINER function. The function acquires `pg_advisory_xact_lock(hashtext(sender_id))` to serialize concurrent requests from the same sender, then performs all three cap checks (daily, weekly, per-pair) and the INSERT atomically within one transaction. Only `service_role` may invoke it.

Updated `supabase/functions/send-contact/index.ts` to replace the three separate inline count queries + standalone INSERT with a single `.rpc('send_contact_gated', ...)` call. Error codes raised by the SQL function (`daily_cap`, `weekly_cap`, `pair_cap`) are mapped to the existing structured JSON error responses. The now-unused `DAILY_CAP`, `WEEKLY_CAP`, `PER_RECIPIENT_WEEKLY_CAP` constants were removed.

---

### H-02: `contact_requests` UPDATE RLS policy allows mutation of any column

**Files modified:** `supabase/migrations/007_mark_contacts_seen_rpc.sql`, `lib/actions/contact.ts`
**Commit:** `e5b9af0` — fix(05): H-02 revoke contact_requests UPDATE, add mark_contacts_seen SECURITY DEFINER RPC

**Applied fix:**
Created migration `007_mark_contacts_seen_rpc.sql` that:
1. Drops the `contact_requests_mark_seen` UPDATE RLS policy.
2. Revokes direct UPDATE on `public.contact_requests` from the `authenticated` role.
3. Creates `public.mark_contacts_seen(p_recipient_profile_id uuid)` as a SECURITY DEFINER function that only sets `seen_at = now()` on unseen rows for the given recipient profile — no other columns are ever touched.
4. Grants execute to `authenticated` only (revoked from `public` and `anon`).

Updated `markContactsSeen` in `lib/actions/contact.ts` to call `.rpc('mark_contacts_seen', { p_recipient_profile_id: profile.id })` instead of the direct `.update()` call.

---

### H-03: Rate-limit counts include `status='sent'` filter — bounced rows don't consume cap slots

**Files modified:** `supabase/migrations/006_send_contact_gated.sql`
**Commit:** `1210bb1` — fix(05): H-03 rate-limit counts no longer filter status=sent, all attempts counted

**Applied fix:**
H-03 was resolved as part of H-01: the `send_contact_gated` SQL function's count queries deliberately omit any `status` filter, so every attempt (regardless of delivery outcome: `sent`, `delivered`, `bounced`, `complained`, `failed`) counts toward the daily, weekly, and per-pair caps. The original inline Edge Function queries that filtered `.eq('status', 'sent')` were fully replaced by the RPC.

A documentation comment was added to the top of `006_send_contact_gated.sql` explicitly calling out the H-03 fix, and the commit records it separately for traceability. Note: the partial unique index `contact_requests_pair_day_unique_idx` retains its `where status = 'sent'` clause as intended — that index prevents same-day duplicate sends, not cap enforcement.

---

### M-01: AppLayout uses `getClaims()` — spoofable cookie

**Files modified:** `app/(app)/layout.tsx`
**Commit:** `fba23c5` — fix(05): M-01 replace getClaims() with getUser() in AppLayout

**Applied fix:**
Replaced `supabase.auth.getClaims()` with `supabase.auth.getUser()`, which revalidates the JWT against Supabase Auth rather than reading the cookie directly. The `claims.sub` / `claims.email` references were replaced with `user.id` and `user.email`. The `if (claims?.sub)` guard became `if (userId)`. All downstream logic (profile lookup, unseen badge count) is unchanged.

---

### M-02: `BlockedToast` fires on back-navigation

**Files modified:** `components/directory/BlockedToast.tsx`
**Commit:** `dab66f6` — fix(05): M-02 strip blocked query param after toast to prevent back-nav re-fire

**Applied fix:**
Added `useRouter` import and `router` instance. After the toast fires (either the error toast or the success toast), `router.replace('/directory', { scroll: false })` is called to rewrite the history entry without the `?blocked=` or `?blocked_error=` query param. The `router` is added to the `useEffect` dependency array. The early-return path (no name, no error flag) skips the replace call so no unnecessary navigation occurs.

---

### M-03: `markContactsSeen` doesn't call `revalidatePath`

**Files modified:** `lib/actions/contact.ts`
**Commit:** `49a3818` — fix(05): M-03 add revalidatePath layout after markContactsSeen to clear badge

**Applied fix:**
Added `revalidatePath('/(app)', 'layout')` at the end of `markContactsSeen` (before the `return` on the success path). This busts the AppLayout cache segment so the unseen-contact badge reflects the updated state on the same render cycle. The `revalidatePath` import was already present in the file from `blockMember` usage, so no new import was needed.

---

## Skipped Issues

None — all 6 findings were fixed successfully.

---

_Fixed: 2026-04-21_
_Fixer: Claude (gsd-code-fixer)_
_Iteration: 1_
