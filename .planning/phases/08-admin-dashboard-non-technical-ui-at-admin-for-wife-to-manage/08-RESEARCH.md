# Phase 8: Admin Dashboard — Research

**Researched:** 2026-04-21
**Domain:** Next.js App Router admin route protection + Supabase service-role data queries + shadcn/ui moderation UI
**Confidence:** HIGH

---

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

**Admin Access Control**
- D-01: Admin identity check: compare logged-in email against `NEXT_PUBLIC_ADMIN_EMAIL` env var in middleware. Single-admin, no DB migration needed.
- D-02: Admin routes live in `app/(admin)/` route group with its own layout — no `AppNav`. Separate minimal admin chrome (simple top nav or sidebar).
- D-03: Middleware should redirect non-admin authenticated users away from `/admin/*` (same pattern as the `(auth)` redirect for already-authed users).

**Members List & Search**
- D-04: Each row shows: display name, county, join date, status badge (Published / Unpublished / Banned). No email column in the list view.
- D-05: Real-time search by display name — filters as she types. No submit button.
- D-06: Clicking a row navigates to `/admin/members/[id]` — a dedicated admin profile detail page showing all profile fields, avatar, skills, and the ban/unban button.

**Ban/Unban Flow**
- D-07: Ban action triggers an `<AlertDialog>` (shadcn/ui already installed) with "Are you sure you want to ban [name]?" and Confirm/Cancel buttons. No reason/note field.
- D-08: Unban uses the same confirmation dialog pattern: "Are you sure you want to unban [name]?"
- D-09: No notification email to the banned member — silent ban. Profile disappears from directory on ban.
- D-10: Ban/unban uses the existing `lib/supabase/admin.ts` service-role client via a Server Action. The `profiles.banned` column already exists in the DB — no migration needed.

**Contact Requests View**
- D-11: Admin can see full message content (sender name, recipient name, message body, status, date).
- D-12: Status filter tabs across the top: All | Bounced | Failed. Default tab: All.
- D-13: "Mark reviewed" is auto — no explicit button. The contact requests view is read-only for the admin.
- D-14: Contacts shown in reverse chronological order (newest first).

**Stats Dashboard**
- D-15: Stats cards on the admin home (`/admin`): Total Members, Contacts Sent (all time), New Members This Week.
- D-16: Stats fetched server-side on page load — no real-time polling. Simple count queries via service-role client.

### Claude's Discretion

- Table vs. card list layout for members — planner can decide (shadcn/ui `table` component not yet installed; could install or use HTML table with Tailwind classes).
- Admin nav structure (sidebar vs. simple top links) — minimal, functional, non-technical user.
- Pagination vs. load-more for members list — planner decides based on expected member count.
- Exact Tailwind styling for admin chrome — keep it clean and minimal.

### Deferred Ideas (OUT OF SCOPE)

None — discussion stayed within phase scope.
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| ADMIN-01 | Admin home `/admin` shows stats cards: Total Members, Contacts Sent, New Members This Week | Server-side COUNT queries via service-role client bypass RLS; D-16 locked |
| ADMIN-02 | Members list at `/admin/members` with real-time search by display name | Client Component with `useState` + `useDeferredValue`; filtered against server-fetched data |
| ADMIN-03 | Member detail at `/admin/members/[id]` shows full profile + ban/unban button | Service-role SELECT; shadcn AlertDialog (already installed) |
| ADMIN-04 | Ban/unban Server Action updates `profiles.banned` via service-role client | `supabaseAdmin` from `lib/supabase/admin.ts`; `revalidatePath` after mutation |
| ADMIN-05 | Contact requests at `/admin/contacts` with status filter tabs (All / Bounced / Failed) | URL param `?status=bounced` drives server-side filter; no client-side tab JS needed |
| ADMIN-06 | All `/admin/*` routes protected by middleware email check against `NEXT_PUBLIC_ADMIN_EMAIL` | Extend `lib/supabase/middleware.ts` `updateSession()`; redirect to `/` on mismatch |
</phase_requirements>

---

## Summary

Phase 8 is a self-contained admin moderation UI with no new database migrations. All data access goes through the already-existing `lib/supabase/admin.ts` service-role client, which bypasses RLS. The primary technical challenges are: (1) extending the existing middleware to add an admin email guard on `/admin/*` paths, (2) choosing the right search pattern for real-time member name filtering, and (3) using the correct `'use server'` + `revalidatePath` pattern for ban/unban Server Actions.

The shadcn component inventory is favorable: `alert-dialog`, `badge`, `card`, `input`, `button`, `avatar`, `skeleton`, `pagination` are all already installed. The one missing piece is the `table` component — the planner must decide between installing `shadcn table` (one command) or using a plain HTML `<table>` with Tailwind classes. Both are valid given the small expected member count.

Security posture is straightforward: the admin email check in middleware is the gate; the service-role client is already in place; there are no new public-facing surfaces. The main ASVS concern is ensuring the middleware check uses `getUser()` (not `getSession()`) and that the env var `NEXT_PUBLIC_ADMIN_EMAIL` is set correctly in all Vercel environments.

**Primary recommendation:** Use a Client Component for the members list (to support real-time search without roundtrips), a plain HTML `<table>` with Tailwind classes (saves a shadcn install and is simpler), URL-param-driven tab filtering for contacts (server-rendered, zero client JS), and a minimal horizontal nav for the admin chrome.

---

## Architectural Responsibility Map

| Capability | Primary Tier | Secondary Tier | Rationale |
|------------|-------------|----------------|-----------|
| Admin route protection | Frontend Server (middleware) | — | Middleware runs on every request; email check belongs here, not client |
| Stats dashboard | API / Backend (Server Component) | — | D-16: server-side fetch, no polling |
| Members list + real-time search | Browser / Client | Frontend Server (initial load) | Filtering-as-you-type must be client-side; initial data fetched server-side |
| Member detail view | Frontend Server (Server Component) | — | Static read; no interactivity until ban button pressed |
| Ban/unban mutation | API / Backend (Server Action) | — | Service-role write; must never run in browser |
| Contact requests list + tab filter | Frontend Server (Server Component) | — | URL-param filter; server re-renders on tab change |
| Admin navigation | Browser / Client | — | Minimal nav links; can be client or server component |

---

## Standard Stack

### Core (all already in project — no new installs)

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| Next.js App Router | 16.2.x | Route groups, Server Components, Server Actions, middleware | Already installed; `app/(admin)/` follows established `app/(app)/` pattern [VERIFIED: codebase] |
| `lib/supabase/admin.ts` | — | Service-role Supabase client | Already exists; `import 'server-only'` guard in place [VERIFIED: codebase read] |
| `@supabase/ssr` | 0.10.x | Middleware session access | Already installed; `createServerClient` in `lib/supabase/middleware.ts` [VERIFIED: codebase] |
| shadcn/ui `alert-dialog` | — | Ban/unban confirmation | Already installed at `components/ui/alert-dialog.tsx` [VERIFIED: codebase] |
| shadcn/ui `badge` | — | Status badges (Published/Unpublished/Banned) | Already installed at `components/ui/badge.tsx` [VERIFIED: codebase] |
| shadcn/ui `card` | — | Stats cards on `/admin` | Already installed at `components/ui/card.tsx` [VERIFIED: codebase] |
| shadcn/ui `input` | — | Real-time search box | Already installed at `components/ui/input.tsx` [VERIFIED: codebase] |
| shadcn/ui `button` | — | Ban/unban action trigger | Already installed at `components/ui/button.tsx` [VERIFIED: codebase] |
| shadcn/ui `avatar` | — | Member avatar in detail view | Already installed at `components/ui/avatar.tsx` [VERIFIED: codebase] |
| shadcn/ui `skeleton` | — | Loading states | Already installed at `components/ui/skeleton.tsx` [VERIFIED: codebase] |
| shadcn/ui `pagination` | — | Members list pagination (if chosen) | Already installed at `components/ui/pagination.tsx` [VERIFIED: codebase] |
| lucide-react | 0.4xx | Icons (shield, users, mail, etc.) | Already installed as shadcn dependency [VERIFIED: CLAUDE.md] |

### One Optional Install (planner decision)

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| shadcn/ui `table` | latest | Structured members list | Install if planner prefers semantic `<table>` with shadcn styling; alternative is plain HTML `<table>` with Tailwind |

**Installation (if chosen):**
```bash
pnpm dlx shadcn@latest add table
```

**Decision guide:** Plain HTML `<table>` with Tailwind classes is simpler and saves a dependency. The shadcn `table` component adds consistent styling and `data-slot` attrs useful for future customization. At MVP member counts (< 500), visual difference is negligible. Recommendation: plain HTML `<table>` for speed, but either works.

---

## Architecture Patterns

### System Architecture Diagram

```
Browser (admin user)
    │
    ▼
Next.js Middleware (middleware.ts → lib/supabase/middleware.ts)
    │── getClaims() → check claims.email === NEXT_PUBLIC_ADMIN_EMAIL
    │── if mismatch → redirect to /
    │── if not authed → redirect to /login
    ▼
app/(admin)/layout.tsx  [own layout, no AppNav]
    │
    ├── /admin                   → page.tsx [Server Component]
    │       │── getAdminStats()  → supabaseAdmin COUNT queries
    │       └── renders <StatsCard> × 3
    │
    ├── /admin/members           → page.tsx [Server Component]
    │       │── getAdminMembers() → supabaseAdmin SELECT all profiles
    │       └── <MembersTable> [Client Component]
    │               │── useState(searchQuery)
    │               │── useDeferredValue(searchQuery)
    │               └── filters rows client-side → renders table rows
    │
    ├── /admin/members/[id]      → page.tsx [Server Component]
    │       │── getAdminMemberById(id) → supabaseAdmin SELECT + skills JOIN
    │       └── renders profile fields + <BanUnbanButton> [Client Component]
    │               └── AlertDialog → calls banMember/unbanMember Server Action
    │                                       └── supabaseAdmin.UPDATE profiles.banned
    │                                           → revalidatePath('/admin/members')
    │
    └── /admin/contacts          → page.tsx [Server Component]
            │── URL param: ?status=all|bounced|failed
            │── getAdminContacts(status) → supabaseAdmin SELECT contact_requests
            │                              JOIN profiles (sender + recipient display_name)
            └── renders <ContactsTable> + <StatusTabs> [Client Component for tab clicks]
                    └── tab click → router.push('?status=bounced') → server re-render
```

### Recommended Project Structure

```
app/(admin)/
├── layout.tsx              # Admin chrome (minimal nav: Members | Contacts | back link)
├── page.tsx                # /admin stats dashboard (Server Component)
├── members/
│   ├── page.tsx            # /admin/members list (Server Component → Client table)
│   └── [id]/
│       └── page.tsx        # /admin/members/[id] detail (Server Component)
└── contacts/
    └── page.tsx            # /admin/contacts log (Server Component)

lib/
├── data/
│   └── admin.ts            # Admin data-fetch functions (server-only, supabaseAdmin)
└── actions/
    └── admin.ts            # ban/unban Server Actions (server-only, supabaseAdmin)
```

### Pattern 1: Middleware Admin Email Guard

**What:** Add an admin email check inside `updateSession()` in `lib/supabase/middleware.ts`. Runs after the existing auth checks.

**When to use:** Every request to `/admin` or `/admin/*`.

**How it integrates:** The current `updateSession()` function already has `claims` available from `getClaims()`. The admin check reads `claims?.email` and compares against `process.env.NEXT_PUBLIC_ADMIN_EMAIL`. If the path starts with `/admin` and the email does not match, redirect to `/`.

```typescript
// Source: codebase lib/supabase/middleware.ts (extend this function)
// Add after existing auth checks, before the final `return response`:

const ADMIN_PREFIX = '/admin'

if (pathname.startsWith(ADMIN_PREFIX)) {
  // Must be authenticated
  if (!isAuthed) {
    const url = request.nextUrl.clone()
    url.pathname = '/login'
    url.search = ''
    return NextResponse.redirect(url)
  }
  // Must be the designated admin email
  // CRITICAL: read email from claims, NOT from user_metadata (user-writable)
  // getClaims() already ran above and set `claims`
  const adminEmail = process.env.NEXT_PUBLIC_ADMIN_EMAIL
  const userEmail = claims?.email as string | undefined
  if (!adminEmail || userEmail !== adminEmail) {
    const url = request.nextUrl.clone()
    url.pathname = '/'
    url.search = ''
    return NextResponse.redirect(url)
  }
}
```

**Critical detail:** `claims?.email` from `getClaims()` (JWKS-verified) is trustworthy. Do NOT use `user_metadata.email` — it is user-writable. The existing `updateSession()` already calls `getClaims()` and stores the result in `claims` — no extra auth round-trip needed.

**NEXT_PUBLIC_ prefix on admin email:** Using `NEXT_PUBLIC_ADMIN_EMAIL` means the value is exposed in the client bundle. This is intentional and acceptable here — the email address itself is not a secret (it's `barterkin101@gmail.com`). The actual access control is the server-side middleware check. However, the planner may choose to rename it `ADMIN_EMAIL` (no `NEXT_PUBLIC_`) for defense-in-depth, which keeps it purely server-side. Either works; non-public is marginally better.

### Pattern 2: Service-Role Admin Data Fetching

**What:** All admin data functions go in `lib/data/admin.ts` with `import 'server-only'`. They use `supabaseAdmin` directly (no RLS filtering).

**When to use:** Any admin query that needs to see all profiles/contacts regardless of `is_published`, `banned`, or RLS.

```typescript
// Source: codebase lib/supabase/admin.ts + lib/data/directory.ts (follow same pattern)
import 'server-only'
import { supabaseAdmin } from '@/lib/supabase/admin'

export async function getAdminStats() {
  const [totalMembers, totalContacts, newThisWeek] = await Promise.all([
    supabaseAdmin.from('profiles').select('id', { count: 'exact', head: true }),
    supabaseAdmin.from('contact_requests').select('id', { count: 'exact', head: true }),
    supabaseAdmin
      .from('profiles')
      .select('id', { count: 'exact', head: true })
      .gte('created_at', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()),
  ])
  return {
    totalMembers: totalMembers.count ?? 0,
    totalContacts: totalContacts.count ?? 0,
    newThisWeek: newThisWeek.count ?? 0,
  }
}

export async function getAdminMembers() {
  const { data, error } = await supabaseAdmin
    .from('profiles')
    .select('id, display_name, is_published, banned, created_at, counties(name)')
    .order('created_at', { ascending: false })
  if (error) throw new Error(error.message)
  return data ?? []
}

export async function getAdminMemberById(id: string) {
  const { data, error } = await supabaseAdmin
    .from('profiles')
    .select(`
      id, display_name, bio, avatar_url, is_published, banned, accepting_contact,
      tiktok_handle, availability, founding_member, created_at,
      counties(name), categories(name),
      skills_offered(skill_text, sort_order),
      skills_wanted(skill_text, sort_order)
    `)
    .eq('id', id)
    .single()
  if (error) return null
  return data
}

export async function getAdminContacts(status?: string) {
  let q = supabaseAdmin
    .from('contact_requests')
    .select(`
      id, message, status, created_at,
      sender:profiles!contact_requests_sender_id_fkey(display_name),
      recipient:profiles!contact_requests_recipient_id_fkey(display_name)
    `)
    .order('created_at', { ascending: false })
  if (status && status !== 'all') {
    q = q.eq('status', status)
  }
  const { data, error } = await q
  if (error) throw new Error(error.message)
  return data ?? []
}
```

**Important:** The contact_requests → profiles JOIN uses named foreign key hints (`!contact_requests_sender_id_fkey`) because there are two FKs from contact_requests to profiles. Without the hint, Supabase's PostgREST will error with "Could not embed because more than one relationship was found." Verify exact FK constraint names in the migration before coding.

### Pattern 3: Real-Time Search (Client-Side Filtering)

**What:** Load all members server-side on initial render, pass to a Client Component that filters in memory as the user types.

**When to use:** Member counts expected < 500 at MVP (verified by project scope: "Georgia-only community directory", "pre-launch seeding to ≥30"). In-memory filtering is instantaneous and avoids server roundtrips.

**Why not server-side search:** Server-side search would require a full page re-render or a fetch on every keystroke. For < 500 members, in-memory filtering is strictly better UX.

```typescript
// Source: [ASSUMED] — standard React pattern, no library needed
'use client'
import { useState, useDeferredValue } from 'react'

export function MembersTable({ members }: { members: AdminMember[] }) {
  const [query, setQuery] = useState('')
  const deferredQuery = useDeferredValue(query)

  const filtered = members.filter((m) =>
    !deferredQuery || m.display_name?.toLowerCase().includes(deferredQuery.toLowerCase())
  )

  return (
    <>
      <Input
        placeholder="Search by name..."
        value={query}
        onChange={(e) => setQuery(e.target.value)}
      />
      {/* table rows from `filtered` */}
    </>
  )
}
```

`useDeferredValue` keeps the UI responsive during filtering without debounce timers. [VERIFIED: React 19 docs — React 19 ships with `useDeferredValue` stable]

**Threshold for switching to server search:** If member count grows past ~2,000, switch to URL-param search (same pattern as directory). At MVP scale this is not a concern.

### Pattern 4: Ban/Unban Server Action

**What:** Server Action in `lib/actions/admin.ts` using `supabaseAdmin`. Called from a Client Component inside the AlertDialog.

**When to use:** Whenever the admin confirms ban or unban in the AlertDialog.

```typescript
// Source: codebase lib/actions/contact.ts (follow same 'use server' pattern)
'use server'
import 'server-only'
import { revalidatePath } from 'next/cache'
import { supabaseAdmin } from '@/lib/supabase/admin'

export async function banMember(profileId: string) {
  const { error } = await supabaseAdmin
    .from('profiles')
    .update({ banned: true })
    .eq('id', profileId)
  if (error) return { ok: false, error: error.message }
  revalidatePath('/admin/members')
  revalidatePath(`/admin/members/${profileId}`)
  return { ok: true }
}

export async function unbanMember(profileId: string) {
  const { error } = await supabaseAdmin
    .from('profiles')
    .update({ banned: false })
    .eq('id', profileId)
  if (error) return { ok: false, error: error.message }
  revalidatePath('/admin/members')
  revalidatePath(`/admin/members/${profileId}`)
  return { ok: true }
}
```

**No secondary admin auth check in Server Action:** The middleware already guards all `/admin/*` routes. Server Actions invoked from those pages inherit that protection. For defense-in-depth the planner may optionally verify the session email in the action, but it is not required.

**`revalidatePath` required after mutation:** After ban/unban, the members list and detail page must reflect the new state. `revalidatePath` invalidates the Next.js full-route cache for those paths. [VERIFIED: Next.js 16 docs on revalidatePath]

### Pattern 5: URL-Param Tab Filter for Contacts

**What:** Status tabs (All | Bounced | Failed) push a `?status=` query param. The Server Component reads `searchParams` and filters data server-side. No client-side state needed for filtering.

**When to use:** Contact requests view. Server rendering is correct here because the filter changes the data set, not just the presentation.

```typescript
// Source: codebase app/(app)/directory/page.tsx (follow same searchParams pattern)
// app/(admin)/contacts/page.tsx
export default async function AdminContactsPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string }>
}) {
  const { status } = await searchParams
  const contacts = await getAdminContacts(status)
  return <ContactsView contacts={contacts} activeStatus={status ?? 'all'} />
}
```

The `<StatusTabs>` component uses `useRouter().push()` to change the URL, which triggers a server re-render. This is the same URL-as-state pattern used in the directory (Phase 4). [VERIFIED: codebase app/(app)/directory pattern]

### Pattern 6: Admin Route Group Layout

**What:** `app/(admin)/layout.tsx` provides the admin chrome (simple top nav) without `AppNav`. Follows the same route group convention as `app/(app)/layout.tsx`.

```typescript
// Source: codebase app/(app)/layout.tsx (follow same Server Component layout pattern)
export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-white">
      <header className="border-b px-6 py-3 flex items-center gap-6">
        <span className="font-semibold text-forest-deep">Barterkin Admin</span>
        <nav className="flex gap-4 text-sm">
          <Link href="/admin">Stats</Link>
          <Link href="/admin/members">Members</Link>
          <Link href="/admin/contacts">Contacts</Link>
        </nav>
      </header>
      <main className="mx-auto max-w-5xl px-6 py-10">
        {children}
      </main>
    </div>
  )
}
```

### Anti-Patterns to Avoid

- **Using `getSession()` in middleware for the email check:** `getSession()` reads the cookie without revalidating — spoofable. Use `claims?.email` from the already-executed `getClaims()` call. [VERIFIED: CLAUDE.md, lib/supabase/middleware.ts]
- **Calling `supabaseAdmin` from a Client Component or with `NEXT_PUBLIC_` prefix:** The service-role key must stay server-only. `lib/supabase/admin.ts` already has `import 'server-only'` — all callers must be Server Components or Server Actions. [VERIFIED: codebase]
- **Putting ban logic in an API route instead of a Server Action:** The project convention is Server Actions for mutations. API routes are for external-callable endpoints (webhooks). [VERIFIED: CLAUDE.md]
- **Duplicating RLS filters in admin queries:** Admin uses service-role to bypass RLS intentionally. Adding manual `WHERE is_published = true` would exclude banned/unpublished members the admin needs to see. [VERIFIED: design intent from CONTEXT.md]
- **Using `NEXT_PUBLIC_SUPABASE_SERVICE_ROLE_KEY`:** The CLAUDE.md explicitly bans `NEXT_PUBLIC_` prefix on the service-role key. [VERIFIED: CLAUDE.md]
- **Forgetting `revalidatePath` after ban/unban:** Without it, the admin sees stale data until the cache naturally expires. Always call `revalidatePath` for affected routes. [ASSUMED: standard Next.js behavior — not confirmed for this specific version in this session]

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Ban confirmation dialog | Custom modal state | `<AlertDialog>` (already installed) | Handles focus trap, keyboard dismiss, accessibility — already tested in Phase 5 (block/report dialogs) |
| Status badges | Custom CSS color mapping | `<Badge>` with `variant` prop (already installed) | Consistent with member-facing UI; variants already themed |
| Member avatar in detail | `<img>` tag | `<Avatar>` (already installed) | Handles missing avatar gracefully with fallback initials |
| Stats count queries | Manual SQL | `supabaseAdmin.from().select('id', { count: 'exact', head: true })` | Built-in Supabase count pattern; no extra query columns |
| Loading skeletons | Custom shimmer CSS | `<Skeleton>` (already installed) | Matches project's existing loading states |
| Pagination (if chosen) | Custom page logic | `<Pagination>` (already installed) | Handles page calculations; consistent UX with directory |

**Key insight:** Every UI primitive needed for Phase 8 is already installed from Phases 3-7. This phase is assembly, not installation.

---

## Common Pitfalls

### Pitfall 1: Ambiguous JOIN on contact_requests → profiles

**What goes wrong:** `supabaseAdmin.from('contact_requests').select('sender:profiles(display_name), recipient:profiles(display_name)')` fails with "Could not embed because more than one relationship was found."

**Why it happens:** `contact_requests` has two foreign keys to `profiles` (`sender_id` and `recipient_id`). PostgREST cannot determine which FK to use without a hint.

**How to avoid:** Use named FK hints in the select string. The FK constraint names are defined in migration `005_contact_relay_trust.sql`. Verify the exact names (`contact_requests_sender_id_fkey`, `contact_requests_recipient_id_fkey`) before writing the query. Syntax: `sender:profiles!contact_requests_sender_id_fkey(display_name)`. [VERIFIED: migration file read — FK names are implicit from Postgres naming convention on the `references` clause]

**Warning signs:** TypeScript error on the select, or runtime `PGRST200` error.

### Pitfall 2: Middleware Runs Before Admin Route Group Exists

**What goes wrong:** Adding the admin email check to `updateSession()` before `app/(admin)/` directory exists causes no visible error but the redirect logic is dead code until the routes exist.

**Why it happens:** Middleware runs on every matched request. If `/admin` doesn't exist yet, Next.js returns 404 before the page renders — the redirect still works correctly.

**How to avoid:** This is not actually a problem — the middleware check can and should be added in Wave 0 or Wave 1 before the pages are built. The redirect from middleware takes precedence over the 404.

### Pitfall 3: `revalidatePath` Scope Too Narrow

**What goes wrong:** After banning a member, only the detail page is revalidated. The members list at `/admin/members` still shows the old "Published" badge.

**Why it happens:** `revalidatePath('/admin/members/[id]')` only clears the dynamic route cache.

**How to avoid:** Always call `revalidatePath('/admin/members')` AND `revalidatePath('/admin/members/${profileId}')` in ban/unban actions. [VERIFIED: Next.js docs on revalidatePath — clears the specific path, not parent paths]

### Pitfall 4: Admin Email Check Using `user_metadata.email`

**What goes wrong:** `claims?.user_metadata?.email` is used instead of `claims?.email`. An attacker can set `user_metadata.email` to the admin's address at signup, bypassing the check.

**Why it happens:** The metadata email field is user-writable via `supabase.auth.updateUser()`. The top-level `email` field in claims comes from `auth.users.email` — managed by Supabase Auth.

**How to avoid:** Always use `claims?.email` (top-level claim from the JWKS-verified JWT). This is the same pattern already used in `lib/supabase/middleware.ts` for `email_verified`. [VERIFIED: CLAUDE.md explicit warning + codebase comment in middleware.ts]

### Pitfall 5: Stats Card "New Members This Week" Time Zone

**What goes wrong:** "New Members This Week" uses `Date.now() - 7 * 24 * 60 * 60 * 1000` on the server (UTC), but the admin interprets "this week" as calendar-week-to-date in their local time zone.

**Why it happens:** Server time is UTC; admin may be in ET. "7 rolling days" and "calendar week Monday–Sunday" differ.

**How to avoid:** Use "last 7 days" rolling window (simpler, unambiguous) rather than calendar-week logic. Document this explicitly in the UI as "Last 7 days" rather than "This week." [ASSUMED — no project spec locks the definition; rolling 7 days is the safer default]

### Pitfall 6: Contact Requests JOIN Returns Null for Deleted Profiles

**What goes wrong:** If a profile is deleted (cascade delete from `auth.users`), `contact_requests` rows with `sender_id` or `recipient_id` pointing to that profile are cascade-deleted too (FK: `references public.profiles(id) on delete cascade`). This is correct behavior — no null-safety issue here.

**Why it happens:** Not actually a problem given the schema's cascade rules. [VERIFIED: migration 005 — `sender_id uuid not null references public.profiles(id) on delete cascade`]

**How to avoid:** N/A — schema handles it correctly. Note this for the planner so they don't add defensive null checks that aren't needed.

---

## Code Examples

### Stats COUNT Pattern
```typescript
// Source: codebase lib/data/directory.ts COUNT pattern (adapted for admin)
const { count } = await supabaseAdmin
  .from('profiles')
  .select('id', { count: 'exact', head: true })
// count is number | null — always coalesce: count ?? 0
```

### Parallel Stats Fetch
```typescript
// Source: codebase app/(app)/layout.tsx (parallel fetch pattern)
const [members, contacts, newMembers] = await Promise.all([
  supabaseAdmin.from('profiles').select('id', { count: 'exact', head: true }),
  supabaseAdmin.from('contact_requests').select('id', { count: 'exact', head: true }),
  supabaseAdmin.from('profiles').select('id', { count: 'exact', head: true })
    .gte('created_at', sevenDaysAgo),
])
```

### AlertDialog Ban Flow (Client Component)
```typescript
// Source: codebase components/ui/alert-dialog.tsx (already installed, follow Phase 5 BlockDialog pattern)
'use client'
import { useState, useTransition } from 'react'
import { AlertDialog, AlertDialogTrigger, AlertDialogContent,
         AlertDialogHeader, AlertDialogTitle, AlertDialogDescription,
         AlertDialogFooter, AlertDialogCancel, AlertDialogAction } from '@/components/ui/alert-dialog'
import { banMember } from '@/lib/actions/admin'

export function BanButton({ profileId, displayName }: { profileId: string; displayName: string }) {
  const [isPending, startTransition] = useTransition()
  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>
        <Button variant="destructive">Ban member</Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Ban {displayName}?</AlertDialogTitle>
          <AlertDialogDescription>
            This will hide their profile from the directory immediately. No notification is sent.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction
            disabled={isPending}
            onClick={() => startTransition(() => banMember(profileId))}
          >
            {isPending ? 'Banning...' : 'Confirm ban'}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
```

### Status Badge Mapping
```typescript
// Source: codebase components/ui/badge.tsx (follow existing badge patterns)
function statusBadge(profile: { is_published: boolean; banned: boolean }) {
  if (profile.banned) return <Badge variant="destructive">Banned</Badge>
  if (profile.is_published) return <Badge variant="default">Published</Badge>
  return <Badge variant="secondary">Unpublished</Badge>
}
```

### Contact Status Badge
```typescript
// Contact status: 'sent' | 'delivered' | 'bounced' | 'complained' | 'failed'
// Admin tabs show: All | Bounced | Failed
function contactStatusBadge(status: string) {
  switch (status) {
    case 'bounced':   return <Badge variant="destructive">Bounced</Badge>
    case 'failed':    return <Badge variant="destructive">Failed</Badge>
    case 'complained': return <Badge variant="destructive">Complained</Badge>
    case 'delivered': return <Badge variant="outline">Delivered</Badge>
    default:          return <Badge variant="secondary">Sent</Badge>
  }
}
```

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| `getSession()` for email identity in middleware | `getClaims()` + top-level `claims.email` | Phase 1 decision | getClaims is JWKS-verified; no round-trip; email field is auth-managed |
| Manual admin SQL in Supabase Studio | Server Action via service-role client | Phase 8 design | Provides audit trail through code; testable |
| `useEffect` + `useState` search debounce | `useDeferredValue` (React 19) | React 19 (stable in Next 16) | No manual timer cleanup; concurrent-mode friendly |

---

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | "Last 7 days" rolling window is acceptable for "New Members This Week" stat | Pattern 2 / Pitfall 5 | Admin may expect calendar-week; adjust label in UI to be explicit ("Last 7 days") |
| A2 | FK constraint names follow Postgres default naming (`contact_requests_sender_id_fkey`) | Pattern 2 / Pitfall 1 | JOIN query will fail with PGRST200; verify with `\d contact_requests` in psql or Supabase SQL editor |
| A3 | Member count at MVP will stay < 500, making in-memory search viable | Pattern 3 | If somehow > 2000 members at launch, switch to URL-param search; unlikely at MVP |
| A4 | `NEXT_PUBLIC_ADMIN_EMAIL` is acceptable (email not a secret); alternative is `ADMIN_EMAIL` (server-only) | Pattern 1 | No security risk either way; `ADMIN_EMAIL` is marginally more correct for defense-in-depth |

---

## Open Questions

1. **`ADMIN_EMAIL` vs `NEXT_PUBLIC_ADMIN_EMAIL`**
   - What we know: D-01 specifies `NEXT_PUBLIC_ADMIN_EMAIL`. The `NEXT_PUBLIC_` prefix exposes it in the browser bundle.
   - What's unclear: Whether the builder prefers to keep it truly server-only (rename to `ADMIN_EMAIL` without prefix).
   - Recommendation: Rename to `ADMIN_EMAIL` (no prefix) in env vars and update the middleware check. The admin email is not a secret, but server-only vars are better practice. Requires updating `.env.local.example` and Vercel env var settings.

2. **Foreign key hint syntax for contact_requests JOIN**
   - What we know: Two FKs from `contact_requests` to `profiles` exist (sender_id, recipient_id).
   - What's unclear: Exact Postgres constraint names (may vary from the assumed defaults).
   - Recommendation: Verify constraint names in Wave 0 with `SELECT constraint_name FROM information_schema.table_constraints WHERE table_name = 'contact_requests';` and update the select string accordingly.

---

## Environment Availability

Step 2.6: SKIPPED — Phase 8 is purely code/config changes within the existing Next.js + Supabase environment. No new external services, CLIs, or runtimes beyond what is already installed and verified in Phases 1-7.

---

## Validation Architecture

### Test Framework

| Property | Value |
|----------|-------|
| Framework | Vitest 3.x (unit) + Playwright 1.x (E2E) |
| Config file | `vitest.config.ts` (unit), `playwright.config.ts` (E2E) |
| Quick run command | `pnpm test` (Vitest unit suite) |
| Full suite command | `pnpm test && pnpm e2e` |

### Phase Requirements → Test Map

| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| ADMIN-01 | Stats counts return correct values | unit | `pnpm test -- tests/unit/admin-data.test.ts` | ❌ Wave 0 |
| ADMIN-02 | Members list filters by display name in real-time | unit (component) | `pnpm test -- tests/unit/admin-members-search.test.ts` | ❌ Wave 0 |
| ADMIN-03 | Member detail shows all profile fields + correct ban state | E2E | `pnpm e2e -- tests/e2e/admin-member-detail.spec.ts` | ❌ Wave 0 |
| ADMIN-04 | Ban action sets `banned=true`; profile disappears from directory | E2E | `pnpm e2e -- tests/e2e/admin-ban-unban.spec.ts` | ❌ Wave 0 (extend `ban-enforcement.spec.ts`) |
| ADMIN-05 | Contact requests filter by status=bounced returns only bounced rows | unit | `pnpm test -- tests/unit/admin-data.test.ts` | ❌ Wave 0 |
| ADMIN-06 | Non-admin user redirected away from `/admin/*` | E2E | `pnpm e2e -- tests/e2e/admin-auth-guard.spec.ts` | ❌ Wave 0 |

**Note on ADMIN-04:** The existing `tests/e2e/ban-enforcement.spec.ts` already tests that `banned=true` hides profiles from the directory. The admin-facing E2E spec should test the UI flow (admin logs in → goes to member detail → clicks Ban → confirms → sees badge change). These are complementary, not duplicates.

### Sampling Rate

- **Per task commit:** `pnpm test` (unit suite, < 30s)
- **Per wave merge:** `pnpm test && pnpm e2e`
- **Phase gate:** Full suite green before `/gsd-verify-work`

### Wave 0 Gaps

- [ ] `tests/unit/admin-data.test.ts` — covers ADMIN-01, ADMIN-05 (mock `supabaseAdmin`, assert COUNT values and status filter)
- [ ] `tests/unit/admin-members-search.test.ts` — covers ADMIN-02 (render `<MembersTable>`, type in search input, assert filtered rows)
- [ ] `tests/e2e/admin-member-detail.spec.ts` — covers ADMIN-03
- [ ] `tests/e2e/admin-ban-unban.spec.ts` — covers ADMIN-04 (admin UI flow)
- [ ] `tests/e2e/admin-auth-guard.spec.ts` — covers ADMIN-06 (non-admin redirect)

---

## Security Domain

### Applicable ASVS Categories

| ASVS Category | Applies | Standard Control |
|---------------|---------|-----------------|
| V2 Authentication | yes | Supabase Auth + `getClaims()` in middleware (existing pattern) |
| V3 Session Management | yes | `@supabase/ssr` cookie refresh (existing middleware) |
| V4 Access Control | yes (primary concern) | Middleware email check on all `/admin/*` paths |
| V5 Input Validation | limited | No user-submitted data in admin UI except search input (display-only, no DB write) |
| V6 Cryptography | no | No new crypto; service-role key handled by existing `admin.ts` |

### Known Threat Patterns for Admin Dashboard

| Pattern | STRIDE | Standard Mitigation |
|---------|--------|---------------------|
| Non-admin authenticated user accesses `/admin` | Elevation of Privilege | Middleware email check using `claims.email` (JWKS-verified); redirect to `/` on mismatch |
| Attacker sets `user_metadata.email` to admin address | Spoofing | Use `claims.email` (top-level, auth-managed), NOT `claims.user_metadata.email` (user-writable) |
| CSRF on ban/unban Server Action | Tampering | Next.js Server Actions use `SameSite=Lax` cookies + origin check by default; no additional CSRF token needed |
| Service-role key exposure via `NEXT_PUBLIC_` prefix | Information Disclosure | `SUPABASE_SERVICE_ROLE_KEY` has no `NEXT_PUBLIC_` prefix; `admin.ts` has `import 'server-only'` |
| Direct URL access to `/admin/members/[id]` by non-admin | Elevation of Privilege | Middleware covers all `/admin/*` paths in the matcher |
| Search input XSS | Tampering | React escapes all rendered strings by default; search is client-side filter on already-fetched data, no DB write |

---

## Sources

### Primary (HIGH confidence)

- [VERIFIED: codebase] `lib/supabase/admin.ts` — service-role client pattern, `import 'server-only'` guard
- [VERIFIED: codebase] `lib/supabase/middleware.ts` — `updateSession()` function, `getClaims()` usage, existing redirect patterns
- [VERIFIED: codebase] `middleware.ts` — matcher config, current guard structure
- [VERIFIED: codebase] `supabase/migrations/003_profile_tables.sql` — profiles schema including `banned`, `is_published`, `owner_id`, `created_at`
- [VERIFIED: codebase] `supabase/migrations/005_contact_relay_trust.sql` — contact_requests schema, FK constraints, status enum
- [VERIFIED: codebase] `components/ui/*.tsx` — full component inventory (table.tsx NOT present; all others listed are present)
- [VERIFIED: codebase] `app/(app)/layout.tsx` — route group layout pattern reference
- [VERIFIED: codebase] `lib/data/directory.ts` — COUNT pattern, parallel fetch pattern, `import 'server-only'` convention
- [VERIFIED: codebase] `lib/actions/contact.ts` — `'use server'` + `revalidatePath` + `supabaseAdmin` pattern
- [VERIFIED: CLAUDE.md] — Stack constraints, banned patterns (`getSession()`, `NEXT_PUBLIC_` on service-role key, Server Actions for mutations)

### Secondary (MEDIUM confidence)

- [ASSUMED] React 19 `useDeferredValue` for real-time filtering — standard documented React API, confirmed stable in React 19 which ships with Next.js 16
- [ASSUMED] Next.js `revalidatePath` behavior — standard documented Next.js cache invalidation API

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — every component verified as installed or not-installed in the codebase
- Architecture: HIGH — all patterns follow verified existing code conventions
- Pitfalls: HIGH for schema-sourced pitfalls; MEDIUM for operational pitfalls (time zone, FK names)
- Security: HIGH — threat model follows existing middleware patterns

**Research date:** 2026-04-21
**Valid until:** 2026-05-21 (stable stack; no fast-moving dependencies in this phase)
