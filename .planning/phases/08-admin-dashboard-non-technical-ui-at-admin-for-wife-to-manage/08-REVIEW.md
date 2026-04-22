---
phase: 08-admin-dashboard-non-technical-ui-at-admin-for-wife-to-manage
reviewed: 2026-04-22T00:00:00Z
depth: standard
files_reviewed: 22
files_reviewed_list:
  - .env.local.example
  - app/(admin)/contacts/page.tsx
  - app/(admin)/layout.tsx
  - app/(admin)/members/[id]/page.tsx
  - app/(admin)/members/page.tsx
  - app/(admin)/page.tsx
  - components/admin/AdminNav.tsx
  - components/admin/BanUnbanButton.tsx
  - components/admin/ContactStatusBadge.tsx
  - components/admin/ContactStatusTabs.tsx
  - components/admin/ContactsTable.tsx
  - components/admin/MemberDetailView.tsx
  - components/admin/MembersTable.tsx
  - components/admin/StatusBadge.tsx
  - components/ui/tabs.tsx
  - lib/actions/admin.ts
  - lib/data/admin.ts
  - lib/supabase/middleware.ts
  - tests/e2e/admin-auth-guard.spec.ts
  - tests/e2e/admin-ban-unban.spec.ts
  - tests/e2e/admin-member-detail.spec.ts
  - tests/unit/admin-data.test.ts
  - tests/unit/admin-members-search.test.tsx
findings:
  critical: 1
  warning: 4
  info: 3
  total: 8
status: issues_found
---

# Phase 8: Code Review Report

**Reviewed:** 2026-04-22
**Depth:** standard
**Files Reviewed:** 22
**Status:** issues_found

## Summary

This phase delivers a clean, well-scoped admin dashboard: stats overview, members list with client-side search, member detail with ban/unban, and a contacts table with status filtering. The authentication guard in middleware is correctly built — it uses `getClaims()` (JWKS-verified) and compares against the server-only `ADMIN_EMAIL` env var, consistent with CLAUDE.md's security requirements.

One critical issue was found: a real email address (`barterkin101@gmail.com`) is hardcoded in `.env.local.example`, which is checked into the public repository. Four warnings cover logic and robustness gaps in the data layer and server actions. Three info-level items flag minor code quality observations.

The test suite is well-structured. Unit tests cover the search component thoroughly. E2E tests cover the auth guard, ban/unban flow, and member detail view with proper fixture cleanup.

---

## Critical Issues

### CR-01: Real email address hardcoded in public `.env.local.example`

**File:** `.env.local.example:60`
**Issue:** `ADMIN_EMAIL=barterkin101@gmail.com` is committed to the repository. The file header states "Repo is PUBLIC" (line 7). This directly exposes the admin account's email address to anyone who views the repository. An attacker who knows the admin email can target it for phishing, credential stuffing, or social engineering to gain admin access. The CLAUDE.md explicitly prohibits `NEXT_PUBLIC_` prefix for this variable — but the value itself being public in an example file undermines that intent.
**Fix:** Replace the real address with a placeholder:
```
ADMIN_EMAIL=admin@yourdomain.com
```
Set the real value exclusively in Vercel environment variables (already described in the file's own comment on line 59). Rotate the admin account password as a precaution since this has been public.

---

## Warnings

### WR-01: `banMember` / `unbanMember` server actions have no row-existence check — silent no-op on invalid IDs

**File:** `lib/actions/admin.ts:24-41` and `lib/actions/admin.ts:43-60`
**Issue:** Both actions call `.update({ banned: true/false }).eq('id', profileId)` and return `{ ok: true }` as long as Supabase doesn't return an error. Supabase's `.update()` with a non-matching `.eq()` clause returns zero rows affected but no error — so banning a UUID that doesn't exist silently returns success. The UI will show a success toast while nothing changed in the database.
**Fix:** Use `.select('id')` after the update to confirm a row was actually modified, or add a `.select('id', { count: 'exact' })` check:
```typescript
const { error, count } = await supabaseAdmin
  .from('profiles')
  .update({ banned: true }, { count: 'exact' })
  .eq('id', profileId)

if (error) { /* ... */ }
if (!count || count === 0) {
  return { ok: false, error: 'Member not found.' }
}
```

### WR-02: `getAdminMemberById` silently returns `null` on query errors — detail page cannot distinguish "not found" from "DB error"

**File:** `lib/data/admin.ts:134-136`
**Issue:** When the Supabase query returns an error, the function logs the error and returns `null`. The caller in `app/(admin)/members/[id]/page.tsx:26` treats `null` as "not found" and calls `notFound()`. A database outage or permission error is therefore silently rendered as a 404, giving the admin no feedback that there is a transient infrastructure problem. The other three data functions (`getAdminStats`, `getAdminMembers`, `getAdminContacts`) all `throw` on error — this one is inconsistent.
**Fix:** Make error handling consistent with the rest of the module:
```typescript
if (error) {
  console.error('[getAdminMemberById] query error', { code: error.code })
  throw new Error(error.message)
}
if (!data) return null
```
The page-level error boundary (Next.js `error.tsx`) will then catch and display a proper error state.

### WR-03: `getAdminMembers` casts the entire Supabase row to `Record<string, unknown>` — type safety loss for a service-role query

**File:** `lib/data/admin.ts:105`
**Issue:** The line `return (data ?? []).map((row: Record<string, unknown>) => ({` bypasses all TypeScript inference on the query result. If the DB schema changes (e.g., `banned` column renamed), the compiler will not catch the mismatch — the cast will succeed at compile time and produce `undefined` at runtime. The same pattern is repeated in `getAdminMemberById` (line 140) and `getAdminContacts` (line 189). Since the project uses `supabase gen types typescript`, the generated `Database` type should flow through the query result without needing any cast.
**Fix:** Remove the `as Record<string, unknown>` cast and use the inferred type from the Supabase client. If the joined relation type is complex, use a local `type` alias derived from the select shape rather than a blanket cast:
```typescript
// Let TypeScript infer the mapped type from the select string
const { data, error } = await supabaseAdmin
  .from('profiles')
  .select('id, display_name, is_published, banned, created_at, avatar_url, counties(name)')
  .order('created_at', { ascending: false })

// data is inferred — no cast needed
return (data ?? []).map((row) => ({
  id: row.id,
  display_name: row.display_name ?? null,
  // ...
}))
```

### WR-04: `MembersTable` search filters only on `display_name` but members without a name set silently disappear from results

**File:** `components/admin/MembersTable.tsx:29-33`
**Issue:** The filter is:
```typescript
(m.display_name ?? '').toLowerCase().includes(q)
```
Members with `display_name: null` always produce an empty string, so they will never match any non-empty query. This is the correct MVP behavior, but it means a member who signed up but never set a display name is invisible when the admin types anything in the search box — even typing their username or county will not surface them. For an admin tool used to locate specific members this is a subtle trap: the admin may think a member does not exist.

The search could be extended to also match against `username` or `county_name`, which are both present on `AdminMemberRow`. At minimum, a comment should note the intentional scope limitation.
**Fix:** Either extend the filter to cover `username`:
```typescript
members.filter((m) =>
  (m.display_name ?? '').toLowerCase().includes(q) ||
  (m.username ?? '').toLowerCase().includes(q)
)
```
Or add an inline comment explaining the intentional scope.

---

## Info

### IN-01: `skill` list items in `MemberDetailView` use array index as `key`

**File:** `components/admin/MemberDetailView.tsx:101` and `components/admin/MemberDetailView.tsx:119`
**Issue:** `key={i}` is used for both `skills_offered` and `skills_wanted` list items. If skills can be reordered or removed, React will use the wrong key for reconciliation, potentially producing stale renders. The skills are pre-sorted and rendered read-only in this view, so the risk is low in practice, but it is a code smell.
**Fix:** Use a stable identifier — `sort_order` is present and unique within each array, or use `skill_text` if guaranteed unique per member:
```tsx
<li key={s.sort_order} ...>
```

### IN-02: Hardcoded fallback password in E2E tests is committed to the repo

**File:** `tests/e2e/admin-ban-unban.spec.ts:9` and `tests/e2e/admin-member-detail.spec.ts:9`
**Issue:** `const ADMIN_PASSWORD_TEST = process.env.ADMIN_PASSWORD_TEST ?? 'TestOnly-admin-pw-12345!'` commits a specific password value. Tests skip when `ADMIN_EMAIL` is not set, so the fallback only activates in CI with `ADMIN_EMAIL` set. In that scenario the committed password would be used to authenticate as the admin account, which is a credential in source control.
**Fix:** Remove the hardcoded fallback and require the env var explicitly:
```typescript
const ADMIN_PASSWORD_TEST = process.env.ADMIN_PASSWORD_TEST
if (!ADMIN_PASSWORD_TEST) test.skip(true, 'requires ADMIN_PASSWORD_TEST env var')
```
Alternatively, keep the fallback only if the admin test user is always created fresh (and the committed password is solely for that ephemeral test account created by `ensureAdminUser()`). Add a comment making that constraint explicit so it is not confused with the real admin account credentials.

### IN-03: `ALLOWED_STATUSES` in `contacts/page.tsx` does not include `'complained'` — filtering by that status is impossible

**File:** `app/(admin)/contacts/page.tsx:10`
**Issue:** `const ALLOWED_STATUSES = new Set(['all', 'bounced', 'failed'])` — the value `'complained'` is a valid status in `AdminContactRow['status']` and is handled by `ContactStatusBadge`, but is not in the allowed set and there is no tab for it in `ContactStatusTabs`. An admin cannot filter to see only complained contacts. This appears intentional for MVP (the tabs only show bounced and failed), but the omission is worth flagging in case `complained` should surface in the UI.
**Fix:** Either add a `complained` tab to `ContactStatusTabs` and add `'complained'` to `ALLOWED_STATUSES`, or add a comment in `contacts/page.tsx` noting that `complained` is intentionally excluded from filtering at MVP.

---

_Reviewed: 2026-04-22_
_Reviewer: Claude (gsd-code-reviewer)_
_Depth: standard_
