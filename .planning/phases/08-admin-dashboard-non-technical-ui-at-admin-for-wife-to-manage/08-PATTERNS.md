# Phase 8: Admin Dashboard — Pattern Map

**Mapped:** 2026-04-21
**Files analyzed:** 14
**Analogs found:** 12 / 14

---

## File Classification

| New/Modified File | Role | Data Flow | Closest Analog | Match Quality |
|-------------------|------|-----------|----------------|---------------|
| `app/(admin)/layout.tsx` | layout | request-response | `app/(auth)/layout.tsx` + `app/(app)/layout.tsx` | role-match |
| `app/(admin)/page.tsx` | page (Server Component) | CRUD (read-only) | `app/(app)/directory/page.tsx` | role-match |
| `app/(admin)/members/page.tsx` | page (Server Component + Client component) | CRUD (read-only) | `app/(app)/directory/page.tsx` | role-match |
| `app/(admin)/members/[id]/page.tsx` | page (Server Component) | CRUD (read-only) | `app/(app)/m/[username]/page.tsx` | exact |
| `app/(admin)/contacts/page.tsx` | page (Server Component) | CRUD (read-only, URL-param filter) | `app/(app)/directory/page.tsx` | role-match |
| `lib/data/admin.ts` | data layer | CRUD (read-only, service-role) | `lib/data/directory.ts` + `lib/data/landing.ts` | exact |
| `lib/actions/admin.ts` | server action | CRUD (write, service-role) | `lib/actions/contact.ts` | exact |
| `middleware.ts` | middleware | request-response | `middleware.ts` (self — extend) | exact |
| `lib/supabase/middleware.ts` | middleware utility | request-response | `lib/supabase/middleware.ts` (self — extend) | exact |
| `tests/unit/admin-data.test.ts` | unit test | batch | `tests/unit/directory-data.test.ts` | exact |
| `tests/unit/admin-members-search.test.ts` | unit test | request-response | `tests/unit/contact-action.test.ts` | role-match |
| `tests/e2e/admin-auth-guard.spec.ts` | E2E test | request-response | `tests/e2e/auth-group-redirect.spec.ts` | exact |
| `tests/e2e/admin-member-detail.spec.ts` | E2E test | request-response | `tests/e2e/ban-enforcement.spec.ts` | role-match |
| `tests/e2e/admin-ban-unban.spec.ts` | E2E test | request-response | `tests/e2e/ban-enforcement.spec.ts` | exact |

---

## Pattern Assignments

### `app/(admin)/layout.tsx` (layout, request-response)

**Analogs:** `app/(auth)/layout.tsx` (lines 1-13) for minimal Server Component layout structure; `app/(app)/layout.tsx` (lines 1-52) for the async Server Component layout pattern with auth.

**Imports pattern** (from `app/(auth)/layout.tsx` lines 1-2):
```typescript
import type { Metadata } from 'next'
// No auth client needed — middleware has already guarded all /admin/* paths
```

**Core layout pattern** (from `app/(auth)/layout.tsx` lines 6-13, adapted):
```typescript
export default function AdminLayout({ children }: { children: React.ReactNode }) {
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
      <main className="mx-auto max-w-5xl px-6 py-10">{children}</main>
    </div>
  )
}
```

**Key difference from `app/(app)/layout.tsx`:** Admin layout is a plain (non-async) Server Component — no `getUser()` call, no profile fetch, no `<Toaster>`. Middleware has already validated the admin session before the layout renders.

---

### `app/(admin)/page.tsx` (page, CRUD read-only)

**Analog:** `app/(app)/directory/page.tsx` (lines 18-81) for Server Component page + data function pattern; `lib/data/landing.ts` (lines 159-193) for parallel `Promise.all` + `count: 'exact'` stats pattern.

**Imports pattern** (from `app/(app)/directory/page.tsx` lines 1-9, adapted):
```typescript
import type { Metadata } from 'next'
import { getAdminStats } from '@/lib/data/admin'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
```

**Core Server Component pattern** (from `app/(app)/directory/page.tsx` lines 18-25, adapted):
```typescript
export default async function AdminPage() {
  const stats = await getAdminStats()
  return (
    <>
      <h1 className="font-serif text-2xl font-bold text-forest-deep mb-8">Dashboard</h1>
      {/* render 3 stat cards from stats.totalMembers, stats.totalContacts, stats.newThisWeek */}
    </>
  )
}
```

**Parallel fetch + count pattern** (from `lib/data/landing.ts` lines 162-178):
```typescript
const [totalResult, contactsResult] = await Promise.all([
  supabaseAdmin.from('profiles').select('id', { head: true, count: 'exact' }),
  supabaseAdmin.from('contact_requests').select('id', { head: true, count: 'exact' }),
])
// Always coalesce: totalResult.count ?? 0
```

---

### `app/(admin)/members/page.tsx` (page, CRUD read-only + client search)

**Analog:** `app/(app)/directory/page.tsx` (lines 18-81) for the Server Component shell that passes data to a Client Component.

**Server Component shell pattern** (from `app/(app)/directory/page.tsx` lines 18-81):
```typescript
export default async function AdminMembersPage() {
  const members = await getAdminMembers()
  return (
    <>
      <h1 className="font-serif text-2xl font-bold text-forest-deep mb-6">Members</h1>
      <MembersTable members={members} />
    </>
  )
}
```

**Client Component real-time search pattern** (standard React pattern — no codebase analog; use `useDeferredValue`):
```typescript
'use client'
import { useState, useDeferredValue } from 'react'
import { Input } from '@/components/ui/input'

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
        className="mb-4 max-w-sm"
      />
      {/* render filtered rows in <table> with Tailwind classes */}
    </>
  )
}
```

---

### `app/(admin)/members/[id]/page.tsx` (page, CRUD read-only)

**Analog:** `app/(app)/m/[username]/page.tsx` — exact same Server Component pattern: fetch by ID, handle not-found, render profile fields + a Client Component action button.

**Imports pattern** (from `app/(app)/m/[username]/page.tsx` lines 1-7, adapted):
```typescript
import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { getAdminMemberById } from '@/lib/data/admin'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { BanUnbanButton } from '@/components/admin/BanUnbanButton'
```

**Core pattern** (from `app/(app)/m/[username]/page.tsx` lines 36-87):
```typescript
export default async function AdminMemberDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const profile = await getAdminMemberById(id)
  if (!profile) notFound()

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      {/* Avatar, display_name, status badge, all profile fields */}
      <BanUnbanButton profileId={profile.id} displayName={profile.display_name ?? 'Member'} isBanned={profile.banned} />
    </div>
  )
}
```

**Not-found guard pattern** (from `app/(app)/m/[username]/page.tsx` lines 54-69):
```typescript
if (!profile) {
  return (
    <div className="text-center space-y-4">
      <h1 className="font-serif text-2xl font-bold">Member not found.</h1>
      <Link href="/admin/members">Back to members</Link>
    </div>
  )
}
```

---

### `app/(admin)/contacts/page.tsx` (page, CRUD read-only with URL-param filter)

**Analog:** `app/(app)/directory/page.tsx` (lines 18-25) — exact same `searchParams` pattern for URL-driven server-side filtering.

**Imports pattern** (from `app/(app)/directory/page.tsx` lines 1-9, adapted):
```typescript
import type { Metadata } from 'next'
import { getAdminContacts } from '@/lib/data/admin'
```

**searchParams pattern** (from `app/(app)/directory/page.tsx` lines 18-25):
```typescript
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

**Tab navigation Client Component pattern** — use `useRouter().push('?status=bounced')` from `next/navigation`. No codebase analog exists; apply the same searchParams-as-state pattern already used in `DirectoryFilters`.

---

### `lib/data/admin.ts` (data layer, CRUD read-only, service-role)

**Analogs:** `lib/data/directory.ts` (lines 1-131) for `import 'server-only'`, error handling, and Supabase query structure; `lib/data/landing.ts` (lines 1-194) for `Promise.all` parallel count queries.

**Imports pattern** (from `lib/data/directory.ts` lines 14-21, adapted):
```typescript
import 'server-only'
import { supabaseAdmin } from '@/lib/supabase/admin'
```

**Count query pattern** (from `lib/data/landing.ts` lines 162-178):
```typescript
const { count, error } = await supabaseAdmin
  .from('profiles')
  .select('id', { count: 'exact', head: true })
// Always coalesce: count ?? 0
```

**Parallel fetch pattern** (from `lib/data/landing.ts` lines 161-178):
```typescript
const [totalMembers, totalContacts, newThisWeek] = await Promise.all([
  supabaseAdmin.from('profiles').select('id', { count: 'exact', head: true }),
  supabaseAdmin.from('contact_requests').select('id', { count: 'exact', head: true }),
  supabaseAdmin.from('profiles').select('id', { count: 'exact', head: true })
    .gte('created_at', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()),
])
```

**Error handling pattern** (from `lib/data/directory.ts` lines 75-128):
```typescript
if (error) {
  console.error('[getAdminMembers] query error', { code: error.code })
  throw new Error(error.message)
}
return data ?? []
```

**Conditional filter pattern** (from `lib/data/directory.ts` lines 36-44):
```typescript
// Contacts status filter
let q = supabaseAdmin.from('contact_requests').select('...').order('created_at', { ascending: false })
if (status && status !== 'all') {
  q = q.eq('status', status)
}
const { data, error } = await q
```

---

### `lib/actions/admin.ts` (server action, CRUD write, service-role)

**Analog:** `lib/actions/contact.ts` (lines 1-255) — exact same `'use server'` + `revalidatePath` + error handling structure.

**Imports pattern** (from `lib/actions/contact.ts` lines 1-18, adapted):
```typescript
'use server'
import 'server-only'
import { revalidatePath } from 'next/cache'
import { supabaseAdmin } from '@/lib/supabase/admin'
```

**Core Server Action pattern** (from `lib/actions/contact.ts` lines 95-126, adapted for ban):
```typescript
export async function banMember(profileId: string): Promise<{ ok: boolean; error?: string }> {
  const { error } = await supabaseAdmin
    .from('profiles')
    .update({ banned: true })
    .eq('id', profileId)
  if (error) {
    console.error('[banMember] update failed', { code: error.code })
    return { ok: false, error: error.message }
  }
  revalidatePath('/admin/members')
  revalidatePath(`/admin/members/${profileId}`)
  return { ok: true }
}
```

**revalidatePath pattern** (from `lib/actions/contact.ts` lines 122-125):
```typescript
revalidatePath('/admin/members')
revalidatePath(`/admin/members/${profileId}`)
// Both paths — list badge and detail page badge must both update
```

**No `getUser()` call in admin actions:** Middleware already guards all `/admin/*` routes. Admin Server Actions use `supabaseAdmin` directly — no RLS session needed.

---

### `middleware.ts` (middleware, extend existing)

**Analog:** `middleware.ts` (lines 1-22) — extend, do not replace.

**Existing file** (lines 1-22 — read-only reference, extend only the `updateSession` logic in `lib/supabase/middleware.ts`):
```typescript
import type { NextRequest } from 'next/server'
import { updateSession } from '@/lib/supabase/middleware'

export async function middleware(request: NextRequest) {
  return await updateSession(request)
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|robots.txt|sitemap.xml|api/webhooks|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|webmanifest)$).*)',
  ],
}
```

**No changes needed to `middleware.ts` itself.** The admin email guard is added inside `updateSession()` in `lib/supabase/middleware.ts`. The existing matcher already covers `/admin/*` paths.

---

### `lib/supabase/middleware.ts` (middleware utility, extend existing)

**Analog:** `lib/supabase/middleware.ts` (lines 1-104) — extend `updateSession()` with admin email guard after existing checks.

**Existing guard structure to extend** (lines 23-103 — insertion point is before `return response` on line 103):
```typescript
// After the existing AUTH-04 verify gate (line 96-101), before `return response`:

const ADMIN_PREFIX = '/admin'

if (pathname.startsWith(ADMIN_PREFIX)) {
  // Must be authenticated (isAuthed already set from getClaims() on line 46-47)
  if (!isAuthed) {
    const url = request.nextUrl.clone()
    url.pathname = '/login'
    url.search = ''
    return NextResponse.redirect(url)
  }
  // Must be the designated admin email
  // CRITICAL: use claims?.email (top-level, JWKS-verified) NOT user_metadata.email (user-writable)
  // claims is already set from getClaims() on line 45-47 — no extra round-trip needed
  const adminEmail = process.env.ADMIN_EMAIL // server-only, no NEXT_PUBLIC_ prefix
  const userEmail = claims?.email as string | undefined
  if (!adminEmail || userEmail !== adminEmail) {
    const url = request.nextUrl.clone()
    url.pathname = '/'
    url.search = ''
    return NextResponse.redirect(url)
  }
}
```

**Critical pattern from existing code** (lines 45-47 — `claims` is already available):
```typescript
const { data } = await supabase.auth.getClaims()
const claims = data?.claims
const isAuthed = !!claims?.sub
```

**Do NOT use `claims?.user_metadata?.email`** — existing file comment on line 49-50 confirms this: trust only `claims?.email` (top-level, from `auth.users.email`).

---

### `tests/unit/admin-data.test.ts` (unit test, batch)

**Analog:** `tests/unit/directory-data.test.ts` (lines 1-144) — exact same pattern: conditional `describe.skip` when env vars missing, `beforeAll`/`afterAll` with fixture seeding, named imports of the function under test.

**File structure pattern** (from `tests/unit/directory-data.test.ts` lines 1-14):
```typescript
import { afterAll, beforeAll, describe, expect, it } from 'vitest'

const hasAdmin = Boolean(
  process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY,
)
const d = hasAdmin ? describe : describe.skip

d('ADMIN-01/05 — admin data layer', () => {
  // ... beforeAll: import supabaseAdmin, seed fixture profiles/contacts
  // ... afterAll: cleanup seeded users
  // ... it: getAdminStats returns correct counts
  // ... it: getAdminContacts with status='bounced' returns only bounced rows
})
```

**Admin client import pattern** (from `tests/unit/directory-data.test.ts` lines 59-62):
```typescript
beforeAll(async () => {
  const mod = await import('@/lib/supabase/admin')
  admin = mod.supabaseAdmin
  // seed test data using admin client
}, 30_000)
```

**Cleanup pattern** (from `tests/unit/directory-data.test.ts` lines 70-72):
```typescript
afterAll(async () => {
  for (const id of fixtureUserIds) await admin.auth.admin.deleteUser(id)
}, 30_000)
```

---

### `tests/unit/admin-members-search.test.ts` (unit test, request-response)

**Analog:** `tests/unit/contact-action.test.ts` (lines 1-82) for mock setup pattern with `vi.mock`, `vi.fn()`, and `beforeEach` reset.

**Mock setup pattern** (from `tests/unit/contact-action.test.ts` lines 7-31):
```typescript
import { describe, it, expect, vi, beforeEach } from 'vitest'

// vi.mock is hoisted — declare before imports
vi.mock('next/cache', () => ({ revalidatePath: vi.fn() }))
// For MembersTable component test, mock nothing — render with React Testing Library
// and assert filtered output after user events (type in search input)
```

**Reset pattern** (from `tests/unit/contact-action.test.ts` lines 72-82):
```typescript
beforeEach(() => {
  vi.clearAllMocks()
})
```

**Note:** `MembersTable` is a pure Client Component (no server deps). Use `@testing-library/react` + `userEvent` to render with fixture data and assert filtered rows. No Supabase mocking needed.

---

### `tests/e2e/admin-auth-guard.spec.ts` (E2E test, request-response)

**Analog:** `tests/e2e/auth-group-redirect.spec.ts` (lines 1-18) — exact same redirect guard test structure.

**E2E redirect test pattern** (from `tests/e2e/auth-group-redirect.spec.ts` lines 1-18):
```typescript
import { test, expect } from '@playwright/test'

test.describe('admin auth guard (ADMIN-06)', () => {
  test('unauthenticated user visiting /admin is redirected to /login', async ({ page }) => {
    await page.goto('/admin')
    await expect(page).toHaveURL(/\/login/)
  })

  test('unauthenticated user visiting /admin/members is redirected to /login', async ({ page }) => {
    await page.goto('/admin/members')
    await expect(page).toHaveURL(/\/login/)
  })

  test.fixme('authenticated non-admin user visiting /admin is redirected to /', async () => {})
})
```

---

### `tests/e2e/admin-member-detail.spec.ts` (E2E test, request-response)

**Analog:** `tests/e2e/ban-enforcement.spec.ts` (lines 1-138) — same structure: `hasEnv` guard, `createVerifiedPair` fixture, `loginAs` helper, admin login flow.

**hasEnv guard pattern** (from `tests/e2e/ban-enforcement.spec.ts` lines 10-11):
```typescript
const hasEnv =
  !!process.env.NEXT_PUBLIC_SUPABASE_URL && !!process.env.SUPABASE_SERVICE_ROLE_KEY
```

**loginAs helper pattern** (from `tests/e2e/ban-enforcement.spec.ts` lines 13-22 — reuse or copy):
```typescript
async function loginAs(page, email: string, password: string) {
  await page.goto('/login')
  await page.getByLabel(/email/i).fill(email)
  // ... handle password field + submit
  await page.waitForURL(/\/(directory|profile|m\/)/, { timeout: 15_000 }).catch(() => undefined)
}
```

**Admin login pattern** — admin logs in via `/login` (same Supabase Auth flow), then navigates to `/admin`. No separate admin login page.

---

### `tests/e2e/admin-ban-unban.spec.ts` (E2E test, request-response)

**Analog:** `tests/e2e/ban-enforcement.spec.ts` (lines 1-138) — exact same fixture + flow structure. This spec tests the admin UI flow (button click → AlertDialog → confirm); `ban-enforcement.spec.ts` tests the directory visibility effect. Both are needed.

**Fixture import pattern** (from `tests/e2e/ban-enforcement.spec.ts` lines 1-8):
```typescript
import { test, expect } from '@playwright/test'
import {
  createVerifiedPair,
  cleanupPair,
  setBanned,
  adminClient,
} from './fixtures/contact-helpers'
import type { VerifiedPair } from './fixtures/contact-helpers'
```

**beforeAll/afterAll fixture pattern** (from `tests/e2e/ban-enforcement.spec.ts` lines 27-38):
```typescript
test.beforeAll(async () => {
  test.skip(!hasEnv, 'requires Supabase env')
  pair = await createVerifiedPair('admin-ban')
})

test.afterAll(async () => {
  if (pair) {
    await setBanned(pair.recipientId, false).catch(() => undefined)
    await cleanupPair(pair.senderId, pair.recipientId)
  }
})
```

---

## Shared Patterns

### Admin Client (Service-Role)
**Source:** `lib/supabase/admin.ts` (lines 1-15)
**Apply to:** `lib/data/admin.ts`, `lib/actions/admin.ts`
```typescript
import 'server-only'
import { createClient as createSupabaseClient } from '@supabase/supabase-js'
import type { Database } from '@/lib/database.types'

export const supabaseAdmin = createSupabaseClient<Database>(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { persistSession: false, autoRefreshToken: false } },
)
```
Import as: `import { supabaseAdmin } from '@/lib/supabase/admin'`

### `import 'server-only'` Guard
**Source:** `lib/data/directory.ts` line 14; `lib/supabase/admin.ts` line 1
**Apply to:** `lib/data/admin.ts`, `lib/actions/admin.ts`
All data-layer and server-action files that use `supabaseAdmin` must have `import 'server-only'` as the first import.

### Error Handling in Data Functions
**Source:** `lib/data/directory.ts` lines 75-128
**Apply to:** All functions in `lib/data/admin.ts`
```typescript
if (error) {
  console.error('[functionName] query error', { code: error.code })
  throw new Error(error.message)   // or return { ..., error: 'description' }
}
return data ?? []
```
Pattern: log with bracketed function name + structured `{ code }` object; never expose raw Supabase error messages to the client.

### `revalidatePath` After Mutation
**Source:** `lib/actions/contact.ts` lines 120-125; `lib/actions/profile.ts`
**Apply to:** `lib/actions/admin.ts`
```typescript
revalidatePath('/admin/members')
revalidatePath(`/admin/members/${profileId}`)
// Call both — list page and detail page both cache independently
```

### AlertDialog for Destructive Confirmation
**Source:** `components/ui/alert-dialog.tsx` (already installed); Phase 5 `BlockDialog` and `ReportDialog` patterns in `app/(app)/m/[username]/page.tsx`
**Apply to:** `BanUnbanButton` Client Component (inside `app/(admin)/members/[id]/page.tsx`)
```typescript
'use client'
import { useState, useTransition } from 'react'
import {
  AlertDialog, AlertDialogTrigger, AlertDialogContent,
  AlertDialogHeader, AlertDialogTitle, AlertDialogDescription,
  AlertDialogFooter, AlertDialogCancel, AlertDialogAction,
} from '@/components/ui/alert-dialog'
import { banMember } from '@/lib/actions/admin'

export function BanUnbanButton({ profileId, displayName, isBanned }: Props) {
  const [isPending, startTransition] = useTransition()
  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>
        <Button variant={isBanned ? 'outline' : 'destructive'}>
          {isBanned ? 'Unban member' : 'Ban member'}
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{isBanned ? 'Unban' : 'Ban'} {displayName}?</AlertDialogTitle>
          <AlertDialogDescription>
            {isBanned
              ? 'Their profile will reappear in the directory immediately.'
              : 'Their profile will be hidden from the directory immediately. No notification is sent.'}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction
            disabled={isPending}
            onClick={() => startTransition(() => isBanned ? unbanMember(profileId) : banMember(profileId))}
          >
            {isPending ? 'Working...' : 'Confirm'}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
```

### Status Badge Mapping
**Source:** `components/ui/badge.tsx` (already installed)
**Apply to:** Members list table rows, member detail page
```typescript
function statusBadge(profile: { is_published: boolean; banned: boolean }) {
  if (profile.banned) return <Badge variant="destructive">Banned</Badge>
  if (profile.is_published) return <Badge variant="default">Published</Badge>
  return <Badge variant="secondary">Unpublished</Badge>
}
```

### Admin Email Guard (Claims-Based)
**Source:** `lib/supabase/middleware.ts` lines 44-50 (existing `getClaims()` call)
**Apply to:** `lib/supabase/middleware.ts` extension (admin email block)
```typescript
// claims is already available from the existing getClaims() call on line 45
// NEVER use claims?.user_metadata?.email — user-writable, spoofable
const adminEmail = process.env.ADMIN_EMAIL
const userEmail = claims?.email as string | undefined  // top-level claim, JWKS-verified
```

### Parallel Promise.all Fetch
**Source:** `lib/data/landing.ts` lines 159-178; `lib/data/directory.ts` lines 76-80
**Apply to:** `lib/data/admin.ts` `getAdminStats()`
```typescript
const [r1, r2, r3] = await Promise.all([query1, query2, query3])
// Check each result's .error before accessing .count or .data
```

### E2E Fixture Pattern (contact-helpers)
**Source:** `tests/e2e/fixtures/contact-helpers.ts` (lines 1-194)
**Apply to:** `tests/e2e/admin-member-detail.spec.ts`, `tests/e2e/admin-ban-unban.spec.ts`
The existing `createVerifiedPair`, `cleanupPair`, `setBanned`, and `adminClient` helpers cover all fixture needs for admin E2E tests. Import directly — do not duplicate.

---

## No Analog Found

| File | Role | Data Flow | Reason |
|------|------|-----------|--------|
| `app/(admin)/members/page.tsx` (Client portion — `MembersTable`) | component | event-driven (real-time filter) | No existing Client Component with in-memory `useDeferredValue` search exists. Apply standard React 19 pattern per RESEARCH.md Pattern 3. |
| `app/(admin)/contacts/page.tsx` (Client portion — `StatusTabs`) | component | event-driven (URL push) | No existing tab navigation component exists. Use `useRouter().push('?status=…')` from `next/navigation` — standard Next.js pattern. |

---

## Metadata

**Analog search scope:** `app/`, `lib/`, `tests/` — all TypeScript source files
**Files scanned:** 47
**Pattern extraction date:** 2026-04-21
