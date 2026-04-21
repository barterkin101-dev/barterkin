---
phase: 05-contact-relay-trust-joined
status: issues_found
high: 3
medium: 3
low: 2
---

# Phase 5: Code Review Report

**Reviewed:** 2026-04-21T00:00:00Z
**Depth:** standard
**Files Reviewed:** 21
**Status:** issues_found

## Summary

Phase 5 adds the contact relay (sender → Resend → recipient), a block/report trust system, and the `contact_requests`/`blocks`/`reports` tables with RLS. The architecture is sound: the Edge Function correctly uses a service-role client to bypass RLS for the insert, and re-validates the JWT server-side via `getUser(jwt)`. The `contact_eligibility` SECURITY DEFINER RPC is well-scoped. The rate-limit enforcement is defence-in-depth (application checks + partial unique index).

Three HIGH findings were identified: a race-condition window that lets the same sender fire duplicate daily contacts via concurrent requests before the partial unique index fires; an overly broad UPDATE RLS policy on `contact_requests` that allows any field mutation (not just `seen_at`); and a missing `status` filter in the rate-limit daily/weekly counts that allows bounced/failed rows to inflate the cap and prematurely block legitimate senders.

Three MEDIUM findings cover: uncounted contacts badge in the AppLayout using `getClaims()` (spoofable cookie) which means the badge could be inflated/deflated by a crafted cookie; the `BlockedToast` re-firing on browser back-navigation because the toast name is passed as a URL query param without being cleaned up; and the `ReportDialogInner` using a `key` on the outer `ReportDialog` wrapper that never changes, which means the `useActionState` stale-success reset relies entirely on the `useEffect` reset path.

Two LOW findings are style/minor: the TikTok external link in `ProfileCard` still uses `rel="noopener"` without `noreferrer` (carried forward from Phase 3); and the `ContactForm` `useEffect` dependency on `form` (a new object reference each render under some RHF versions) can cause spurious re-runs of the `bad_message` error setter.

---

## HIGH Issues

### H-01: Race condition allows double-send before partial unique index fires

**File:** `supabase/functions/send-contact/index.ts:132-214`

**Issue:** The daily/weekly/pair rate-limit checks (lines 138-187) are read queries separated from the INSERT (line 190-213). Under concurrent requests from the same sender (two browser tabs, or a client retry), two requests can both pass the count checks simultaneously before either inserts a row. The partial unique index `contact_requests_pair_day_unique_idx` (migration line 57-59) only prevents duplicate `(sender, recipient, day)` with `status='sent'`, so the race window exists for different recipients on the same day — a sender could exceed the daily cap of 5 if 6 concurrent requests land simultaneously. The index itself is correct for the pair-dup case but does not cover the daily/weekly caps.

**Fix:** Add an application-level advisory lock or move the rate checks + insert into a single SQL function called with service-role (preferred at MVP scale):

```sql
-- In a new migration or extend contact_eligibility:
create or replace function public.send_contact_gated(
  p_sender_profile_id uuid,
  p_recipient_profile_id uuid,
  p_message text
) returns uuid
language plpgsql security definer
set search_path = public, pg_temp
as $$
declare
  v_daily  int;
  v_weekly int;
  v_pair   int;
  v_id     uuid;
begin
  -- Lock the sender row to serialize concurrent requests from same sender
  perform pg_advisory_xact_lock(hashtext(p_sender_profile_id::text));

  select count(*) into v_daily
    from contact_requests
   where sender_id = p_sender_profile_id
     and created_at >= now() - interval '24 hours'
     and status = 'sent';
  if v_daily >= 5 then raise exception 'daily_cap'; end if;

  select count(*) into v_weekly
    from contact_requests
   where sender_id = p_sender_profile_id
     and created_at >= now() - interval '7 days'
     and status = 'sent';
  if v_weekly >= 20 then raise exception 'weekly_cap'; end if;

  select count(*) into v_pair
    from contact_requests
   where sender_id = p_sender_profile_id
     and recipient_id = p_recipient_profile_id
     and created_at >= now() - interval '7 days'
     and status = 'sent';
  if v_pair >= 2 then raise exception 'pair_cap'; end if;

  insert into contact_requests(sender_id, recipient_id, message, status)
  values (p_sender_profile_id, p_recipient_profile_id, p_message, 'sent')
  returning id into v_id;

  return v_id;
end;
$$;
```

At MVP traffic volumes the practical risk is low, but the design gap is real and should be documented or addressed before launch.

---

### H-02: `contact_requests` UPDATE RLS policy allows mutation of any column, not just `seen_at`

**File:** `supabase/migrations/005_contact_relay_trust.sql:35-37`

**Issue:** The `contact_requests_mark_seen` UPDATE policy (lines 35-37) gates *which rows* a recipient can update but places no constraint on *which columns* they can mutate. A recipient who crafts a direct Supabase REST or PostgREST call can update `message`, `status`, `resend_id`, or `sender_id` on any of their own received contact requests. The comment on line 33-34 says "Enforced by only exposing a 'markContactsSeen' server action" — this is application-level trust that can be bypassed by a user calling the Supabase API directly with their JWT.

This is a data-integrity issue: recipients should be able to flip `seen_at` only.

**Fix:** Postgres RLS cannot restrict specific columns in an UPDATE policy via `WITH CHECK` alone (that would require a column-level security extension), but you can close the gap with a SECURITY DEFINER function that is the only permitted UPDATE path:

```sql
-- Revoke direct UPDATE from authenticated
revoke update on public.contact_requests from authenticated;

-- Expose a narrow SECURITY DEFINER function instead
create or replace function public.mark_contacts_seen(p_recipient_profile_id uuid)
returns void
language sql security definer
set search_path = public, pg_temp
as $$
  update public.contact_requests
     set seen_at = now()
   where recipient_id = p_recipient_profile_id
     and seen_at is null;
$$;

revoke execute on function public.mark_contacts_seen(uuid) from public, anon;
grant execute on function public.mark_contacts_seen(uuid) to authenticated;
```

Update `markContactsSeen` server action to call this RPC instead of the direct `.update()`. The RLS UPDATE policy can then be dropped.

---

### H-03: Rate-limit counts include bounced/failed rows, causing premature cap exhaustion

**File:** `supabase/functions/send-contact/index.ts:138-187`

**Issue:** The daily cap (line 145) and weekly cap (line 163) queries filter on `.eq('status', 'sent')`. However, `status='sent'` is the initial state — it transitions to `delivered`, `bounced`, `complained`, or `failed` via the Resend webhook. If a recipient's mail server bounces 4 messages in a day, those rows flip to `status='bounced'`, meaning the sender's count drops below the cap again and they can fire another batch. The intent is clearly to count each *attempt*, not just currently-`sent` rows.

The per-pair query on line 171-177 has the same issue: a bounced contact doesn't consume the pair weekly slot from the cap's perspective.

**Fix:** Remove the `.eq('status', 'sent')` filter from the daily, weekly, and per-pair count queries so all attempts (regardless of delivery outcome) count toward the cap:

```typescript
// Daily cap — count all attempts regardless of delivery status
const { count: dailyCount } = await supabase
  .from('contact_requests')
  .select('id', { count: 'exact', head: true })
  .eq('sender_id', elig.sender_profile_id)
  .gte('created_at', dayAgo)
  // no status filter — count every attempt

// Same for weeklyCount and pairCount queries
```

Note: the partial unique index `contact_requests_pair_day_unique_idx` is scoped to `status = 'sent'` and should remain as-is (it prevents double-sending within the same UTC day, not cap enforcement).

---

## MEDIUM Issues

### M-01: Unseen contact badge in AppLayout uses `getClaims()` — spoofable cookie for non-critical but misleading UI

**File:** `app/(app)/layout.tsx:13-38`

**Issue:** `AppLayout` calls `supabase.auth.getClaims()` (line 13) to obtain the user's identity, then uses `claims.sub` (line 21) to look up the profile and count unseen contact requests (lines 30-36). `getClaims()` reads the JWT from the cookie without revalidating it against Supabase Auth — as documented in `CLAUDE.md` ("getSession() just reads the cookie and is spoofable"). A user with a manually crafted or extended-lifetime cookie could spoof `claims.sub` to point to another user's profile ID and see that user's unseen contact count in the nav badge.

This is not a data-exfiltration risk (the count is just a number, and the actual contact_requests rows are RLS-gated), but it violates the project's stated auth security posture. The AppLayout comment says "getClaims() for display-only (nav header) per CLAUDE.md + RESEARCH Pitfall 4" — but CLAUDE.md bans `getSession()` precisely because it reads the cookie without revalidation. `getClaims()` has the same spoofability characteristic.

**Fix:** Use `getUser()` for the nav layout identity. The one additional round-trip is acceptable since the layout renders on every request (already `force-dynamic` via child pages):

```typescript
// app/(app)/layout.tsx
const { data: { user } } = await supabase.auth.getUser()
const userId = user?.id ?? null

if (userId) {
  const { data: profile } = await supabase
    .from('profiles')
    .select('id, display_name, avatar_url')
    .eq('owner_id', userId)
    .maybeSingle()
  // ...rest unchanged
}
```

---

### M-02: `BlockedToast` fires on back-navigation — URL query param is never cleaned up

**File:** `components/directory/BlockedToast.tsx:11-29` and `lib/actions/contact.ts:125`

**Issue:** `blockMember` redirects to `/directory?blocked=<displayName>` (line 125 of `contact.ts`). `BlockedToast` fires the toast on mount using that query param. If the user later navigates back to `/directory` using the browser back button (which preserves the query string in history), the toast fires again. The `firedRef.current` guard (line 12) only prevents re-fires within a single mount lifetime, not across navigation cycles that re-mount the component.

**Fix:** After firing the toast, use `router.replace` to strip the query param:

```typescript
'use client'
import { useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'

export function BlockedToast({ blockedName, errorFlag }: BlockedToastProps) {
  const firedRef = useRef(false)
  const router = useRouter()

  useEffect(() => {
    if (firedRef.current) return
    firedRef.current = true

    if (errorFlag) {
      toast.error("Couldn't block that member. Please try again.")
    } else if (blockedName && blockedName.trim().length > 0) {
      toast(`${blockedName} blocked.`, {
        description: "They've been removed from your directory view.",
      })
    } else {
      return
    }
    // Strip query param so back-navigation doesn't re-fire
    router.replace('/directory', { scroll: false })
  }, [blockedName, errorFlag, router])

  return null
}
```

---

### M-03: `contact_requests_mark_seen` UPDATE policy allows a recipient to set `seen_at` on rows that were already seen (redundant but not harmful) — and lacks a `status` column guard for the `markContactsSeen` action filtering

**File:** `lib/actions/contact.ts:238-248`

**Issue:** `markContactsSeen` (lines 238-248) issues:

```typescript
.update({ seen_at: new Date().toISOString() }, { count: 'exact' })
.eq('recipient_id', profile.id)
.is('seen_at', null)
```

This is correct — the `.is('seen_at', null)` filter is present. However, the `count` returned is the number of rows matched by the filter (`seen_at IS NULL`), not necessarily the number of rows actually updated (Postgres UPDATE with a `RETURNING` clause or `GET DIAGNOSTICS` gives the true affected count). With PostgREST/Supabase, `count: 'exact'` on an UPDATE reflects rows *matched by the filter*, which is correct here. No bug — but note that if the RLS UPDATE policy is ever broadened, a recipient could call `.update({ status: 'delivered' })` directly. This is the same root issue as H-02 above.

Actually, the specific medium concern here is: the server action is called at the top of `OwnProfilePage` with `.catch(() => {})` (line 14 of `profile/page.tsx`), meaning if `markContactsSeen` errors, `getUser()` still executes and the page renders — but the `unseenContactCount` in the nav badge (which is computed in AppLayout, not re-fetched after the mark) will remain stale until the next full page load. Users may see the badge persist after visiting `/profile`.

**Fix:** Since `AppLayout` fetches the count independently from a separate Supabase query, and `/profile/page.tsx` calls `markContactsSeen` before that layout fetch completes (server rendering is top-down, layout before page), the badge *should* reflect the updated state. Verify this ordering is correct in Next.js App Router — layout and page data fetches are concurrent, not sequential. If they are concurrent, the layout's count query may race with the `markContactsSeen` update and return the pre-update count.

If that race occurs, pass `unseenContactCount` as a prop from the page to the layout (requires making the layout a client component), or use `revalidatePath('/profile')` inside `markContactsSeen` to bust the layout cache. As a quick fix:

```typescript
// lib/actions/contact.ts — add at end of markContactsSeen
revalidatePath('/(app)', 'layout') // bust the AppLayout segment
return { ok: true, count: count ?? 0 }
```

---

## LOW Issues

### L-01: TikTok external link missing `rel="noreferrer"`

**File:** `components/profile/ProfileCard.tsx:143-149`

**Issue:** The TikTok link at line 143 uses `rel="noopener"` but omits `noreferrer`. Without `noreferrer`, the `Referer` header is sent to TikTok's servers when users click the link, leaking the profile URL (including the username). This was flagged in the Phase 3 review and was not corrected.

**Fix:**
```tsx
rel="noopener noreferrer"
```

---

### L-02: `ContactForm` `useEffect` for `bad_message` field error has `form` as a dependency — can cause spurious re-runs

**File:** `components/profile/ContactForm.tsx:128-132`

**Issue:**

```typescript
useEffect(() => {
  if (state && !state.ok && state.code === 'bad_message' && state.error) {
    form.setError('message', { message: state.error })
  }
}, [state, form])
```

`form` is the `UseFormReturn` object from `react-hook-form`. In RHF v7, this object reference is stable across renders (it doesn't change), so this is unlikely to cause a practical problem. However, `form` is not in the React stable refs guarantee contract and ESLint's `react-hooks/exhaustive-deps` requires it in the dependency array. If `form` ever does change reference (e.g., after a reset), this effect re-runs, potentially re-setting the field error from a stale `state`. The guard `state && !state.ok && state.code === 'bad_message'` limits the blast radius but does not eliminate the theoretical double-call.

**Fix:** Derive `setError` directly from the stable `form.setError` ref:

```typescript
const { setError } = form
useEffect(() => {
  if (state && !state.ok && state.code === 'bad_message' && state.error) {
    setError('message', { message: state.error })
  }
}, [state, setError])
```

`form.setError` is a stable function reference in RHF v7 and satisfies the exhaustive-deps rule without the spurious-re-run risk.

---

## Files Reviewed

- `app/api/webhooks/resend/route.ts`
- `lib/actions/contact.ts`
- `lib/actions/contact.types.ts`
- `lib/schemas/contact.ts`
- `components/profile/ContactButton.tsx`
- `components/profile/ContactForm.tsx`
- `components/profile/ContactSuccessState.tsx`
- `components/profile/OverflowMenu.tsx`
- `components/profile/BlockDialog.tsx`
- `components/profile/ReportDialog.tsx`
- `components/profile/ProfileCard.tsx`
- `components/layout/AppNav.tsx`
- `components/layout/NavLinks.tsx`
- `app/(app)/m/[username]/page.tsx`
- `app/(app)/layout.tsx`
- `app/(app)/profile/page.tsx`
- `app/(app)/directory/page.tsx`
- `components/directory/BlockedToast.tsx`
- `emails/contact-relay.tsx`
- `emails/report-admin-notify.tsx`
- `supabase/migrations/005_contact_relay_trust.sql`
- `supabase/functions/send-contact/index.ts`

---

_Reviewed: 2026-04-21T00:00:00Z_
_Reviewer: Claude (gsd-code-reviewer)_
_Depth: standard_
