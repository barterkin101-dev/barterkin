# Phase 7: Pre-Launch Seeding - Pattern Map

**Mapped:** 2026-04-21
**Files analyzed:** 7 new/modified files
**Analogs found:** 7 / 7

## File Classification

| New/Modified File | Role | Data Flow | Closest Analog | Match Quality |
|-------------------|------|-----------|----------------|---------------|
| `scripts/seed-founding-members.mjs` | utility (admin script) | batch | `scripts/seed-georgia-counties.mjs` + `tests/e2e/fixtures/directory-seed.ts` | role-match (seed pattern) + exact (auth.admin.createUser pattern) |
| `components/profile/FoundingMemberBadge.tsx` | component | request-response | `components/landing/FoundingMemberCard.tsx` lines 31–36 | exact (same Badge + same className) |
| `components/directory/DirectoryCard.tsx` (edit) | component | request-response | `components/landing/FoundingMemberCard.tsx` | exact (already has `relative` Card + absolute-positioned Badge) |
| `components/profile/ProfileCard.tsx` (edit) | component | request-response | `components/landing/FoundingMemberCard.tsx` | exact (same Badge pattern) |
| `lib/data/directory.types.ts` (edit) | utility (type contract) | CRUD | `lib/data/directory.types.ts` existing `DirectoryProfile` interface | exact (add one field to existing interface) |
| `docs/outreach-template.md` | config (planning artifact) | — | None (documentation artifact) | no analog |
| `.planning/STATE.md` (edit) | config (planning artifact) | — | Existing STATE.md structure | exact (append section) |

## Pattern Assignments

### `scripts/seed-founding-members.mjs` (utility, batch)

**Primary analog:** `tests/e2e/fixtures/directory-seed.ts`
**Secondary analog:** `scripts/send-mailtest.mjs`

**Imports pattern** — copy ESM shebang + imports from `directory-seed.ts` lines 1–12 and `send-mailtest.mjs` lines 1–16:

```javascript
#!/usr/bin/env node
import { createClient } from '@supabase/supabase-js'
// generateSlug is a .ts file; import as compiled or use inline equivalent
// Note: lib/utils/slug.ts exports generateSlug — import path resolves to
// the compiled output in the same repo. Use a local copy of the 4-line function
// to avoid ESM/TS interop in a plain .mjs script:
// function generateSlug(n) { return n.toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/(^-|-$)/g,'').slice(0,40) }
```

**Env guard pattern** (from `send-mailtest.mjs` lines 13–16):

```javascript
const to = process.argv[2];
if (!to) { console.error("Usage: node scripts/send-mailtest.mjs <addr>"); process.exit(1); }
const key = process.env.RESEND_API_KEY;
if (!key) { console.error("Missing RESEND_API_KEY"); process.exit(1); }
```

Adapt for seed script:

```javascript
const URL = process.env.NEXT_PUBLIC_SUPABASE_URL
const SERVICE = process.env.SUPABASE_SERVICE_ROLE_KEY
const RESEND = process.env.RESEND_API_KEY
if (!URL || !SERVICE) { console.error('Missing SUPABASE env vars'); process.exit(1) }
if (!RESEND) console.warn('RESEND_API_KEY missing — welcome emails will be skipped')
```

**Service-role admin client pattern** (from `directory-seed.ts` lines 13–19):

```typescript
export const admin = () =>
  createClient(URL, SERVICE, {
    auth: { autoRefreshToken: false, persistSession: false },
  })
```

In `.mjs` (top-level, single client instance):

```javascript
const admin = createClient(URL, SERVICE, {
  auth: { persistSession: false, autoRefreshToken: false },
})
```

**Auth user creation pattern** (from `directory-seed.ts` lines 21–31 + `contact-eligibility.test.ts` lines 31–36):

```typescript
const { data, error } = await admin().auth.admin.createUser({
  email,
  password,
  email_confirm: true,   // bypasses verify flow — this IS the verify
})
if (error) throw new Error(`createVerifiedUser failed: ${error.message}`)
```

**Profile insert pattern** (from `directory-seed.ts` lines 34–60):

```typescript
const { data, error } = await admin()
  .from('profiles')
  .insert({
    owner_id: opts.ownerId,
    display_name: opts.display_name,
    username,
    county_id: opts.county_id ?? 13001,
    category_id: opts.category_id ?? 1,
    is_published: true,
    banned: false,
    founding_member: opts.founding_member ?? false,  // set true for all seeds
  })
  .select('id')
  .single()

if (error) throw new Error(`seedPublishedProfile failed: ${error.message}`)
```

**Skills insert pattern** (from `directory-seed.ts` lines 62–71):

```typescript
if (opts.skills) {
  for (let i = 0; i < opts.skills.length; i++) {
    await admin()
      .from('skills_offered')
      .insert({ profile_id: id, skill_text: opts.skills[i], sort_order: i })
  }
}
```

**Resend email send pattern** (from `send-mailtest.mjs` lines 18–31):

```javascript
const res = await fetch("https://api.resend.com/emails", {
  method: "POST",
  headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
  body: JSON.stringify({
    from: "Barterkin <noreply@barterkin.com>",
    to: [to],
    subject: "Barterkin deliverability test",
    text: "...",
    html: "...",
  }),
});
const json = await res.json();
if (!res.ok) { console.error(`Resend error ${res.status}:`, json); process.exit(1); }
```

For the welcome email: change `from` to `"Barterkin <hello@barterkin.com>"` (D-09 is explicit — use hello@ not noreply@, so members can reply). Wrap in try/catch and continue the loop on failure (Pitfall 5).

**Idempotency pattern** — CRITICAL: `supabase.auth.admin.getUserByEmail` does NOT exist in the JS SDK. Use `listUsers`:

```javascript
// Option A (recommended at 11–30 users): list + in-memory filter
async function emailExists(email) {
  const { data, error } = await admin.auth.admin.listUsers({ page: 1, perPage: 1000 })
  if (error) throw error
  return data.users.some(u => u.email?.toLowerCase() === email.toLowerCase())
}
```

**Slug uniqueness pattern** — mirror `lib/actions/profile.ts` lines 44–70 (`resolveUniqueSlug`):

```javascript
async function resolveUniqueUsername(base) {
  const candidates = [base, ...Array.from({ length: 8 }, (_, i) => `${base}-${i + 2}`),
                      `${base}-${crypto.randomUUID().slice(0, 8)}`]
  for (const c of candidates) {
    const { count } = await admin
      .from('profiles')
      .select('id', { head: true, count: 'exact' })
      .eq('username', c)
    if ((count ?? 0) === 0) return c
  }
  return candidates.at(-1)
}
```

**Cutoff guard pattern** (Pitfall 7 — prevent post-launch misuse):

```javascript
const CUTOFF_DATE = new Date('2026-06-01')
if (new Date() > CUTOFF_DATE && !process.argv.includes('--force')) {
  console.error(`Past pre-launch cutoff. Use --force to override.`)
  process.exit(1)
}
```

**Error handling pattern** — catch-per-member, continue loop:

```javascript
const summary = { seeded: 0, skipped: 0, emailFailed: 0, errors: [] }
for (const m of members) {
  try {
    // ... seed logic
  } catch (err) {
    console.error(`✗ ${m.email} failed:`, err.message ?? err)
    summary.errors.push({ email: m.email, error: String(err) })
  }
}
console.log('\n=== Summary ===')
console.log(JSON.stringify(summary, null, 2))
```

**CLI invocation** (matching `send-mailtest.mjs` convention):

```bash
node --env-file=.env.local scripts/seed-founding-members.mjs
```

---

### `components/profile/FoundingMemberBadge.tsx` (component, request-response)

**Analog:** `components/landing/FoundingMemberCard.tsx` lines 1–6 (imports) and lines 31–36 (Badge)

**Imports pattern** (from `FoundingMemberCard.tsx` lines 1–6):

```tsx
import { Badge } from '@/components/ui/badge'
```

**Core pattern** — extract the Badge element from `FoundingMemberCard.tsx` lines 31–36 into a standalone component:

```tsx
// components/landing/FoundingMemberCard.tsx lines 31–36 (SOURCE)
<Badge
  className="absolute right-4 top-4 bg-clay/10 text-clay ring-1 ring-clay/20 font-normal"
  variant="secondary"
>
  Founding member
</Badge>
```

The new shared component removes positional classes (absolute/top/right) so callers control placement:

```tsx
// components/profile/FoundingMemberBadge.tsx (NEW)
import { Badge } from '@/components/ui/badge'

export function FoundingMemberBadge({ className }: { className?: string }) {
  return (
    <Badge
      variant="secondary"
      className={`bg-clay/10 text-clay ring-1 ring-clay/20 font-normal ${className ?? ''}`}
    >
      Founding member
    </Badge>
  )
}
```

No `'use client'` directive — this is a server component (pure render, no interactivity).

---

### `components/directory/DirectoryCard.tsx` (edit — add badge)

**Analog:** `components/landing/FoundingMemberCard.tsx` lines 30–36

The `FoundingMemberCard.tsx` already uses `<Card className="relative ...">` with `<Badge className="absolute right-4 top-4 ...">` (lines 30, 31–36). `DirectoryCard.tsx` currently has no `relative` on its Card (line 27) and no badge.

**Current Card element** (`DirectoryCard.tsx` line 27):

```tsx
<Card className="bg-sage-pale ring-1 ring-sage-light rounded-lg p-6 min-h-[220px] hover:ring-1 hover:ring-sage-light hover:shadow-sm hover:-translate-y-0.5 motion-reduce:hover:translate-y-0 motion-reduce:transition-none transition-all border-0">
```

**Edit: add `relative` + conditional badge** — copy exact pattern from `FoundingMemberCard.tsx`:

```tsx
// Add import at top (line 5 area):
import { FoundingMemberBadge } from '@/components/profile/FoundingMemberBadge'

// Edit Card className to add `relative`:
<Card className="relative bg-sage-pale ring-1 ring-sage-light rounded-lg p-6 min-h-[220px] hover:ring-1 hover:ring-sage-light hover:shadow-sm hover:-translate-y-0.5 motion-reduce:hover:translate-y-0 motion-reduce:transition-none transition-all border-0">
  {profile.founding_member && (
    <FoundingMemberBadge className="absolute right-4 top-4" />
  )}
  {/* ... rest of existing content unchanged */}
```

This requires `DirectoryProfile` type to expose `founding_member` (see `lib/data/directory.types.ts` edit below).

---

### `components/profile/ProfileCard.tsx` (edit — add badge)

**Analog:** `components/landing/FoundingMemberCard.tsx` lines 31–36; `components/profile/ProfileCard.tsx` lines 50–65 (existing header flex block)

The profile detail page uses a `CardHeader` with a `flex flex-row` layout (line 45). The badge should appear inline near the display name. The closest insert point is the `flex items-start justify-between` div at line 51 (which already contains `h1` + optional `OverflowMenu`).

**Edit: add badge below display name in the header flex column** (`ProfileCard.tsx` lines 50–65):

```tsx
// Add import at top:
import { FoundingMemberBadge } from '@/components/profile/FoundingMemberBadge'

// Inside <div className="flex-1 space-y-2"> (line 50), after the h1/OverflowMenu div:
{profile.founding_member && (
  <FoundingMemberBadge />
)}
```

The `space-y-2` class on the parent div (line 50) already handles vertical rhythm — no additional margin needed. Do NOT use `absolute` positioning here; the ProfileCard header is not a positioned container with reserved space.

**Note:** `ProfileWithRelations` (from `lib/actions/profile.types`) must expose `founding_member`. Check if `ProfileWithRelations` already includes all `profiles` columns — if it comes from a `SELECT *`, `founding_member` is already present. If it's an explicit select list, add the field.

---

### `lib/data/directory.types.ts` (edit — add founding_member field)

**Analog:** `lib/data/directory.types.ts` existing `DirectoryProfile` interface (lines 34–42)

**Current interface** (lines 34–42):

```typescript
export interface DirectoryProfile {
  id: string
  username: string | null
  display_name: string | null
  avatar_url: string | null
  counties: { name: string } | null
  categories: { name: string } | null
  skills_offered: DirectorySkill[]
}
```

**Edit: add one field** — `founding_member: boolean`:

```typescript
export interface DirectoryProfile {
  id: string
  username: string | null
  display_name: string | null
  avatar_url: string | null
  founding_member: boolean          // NEW — SEED-04
  counties: { name: string } | null
  categories: { name: string } | null
  skills_offered: DirectorySkill[]
}
```

**Corresponding edit in `lib/data/directory.ts`** — add `founding_member` to the `buildRows()` SELECT string (line 51):

```typescript
// Current (line 51):
`id, username, display_name, avatar_url,
 counties!inner(name),
 categories!inner(name),
 skills_offered(skill_text, sort_order)`

// Edit to:
`id, username, display_name, avatar_url, founding_member,
 counties!inner(name),
 categories!inner(name),
 skills_offered(skill_text, sort_order)`
```

And in the `profiles` mapping block (line 97–114), add:

```typescript
founding_member: (row as any).founding_member ?? false,
```

---

### `tests/unit/seed-founding-members.test.ts` (new test)

**Analog:** `tests/unit/contact-eligibility.test.ts` — env-gated Vitest integration test using service-role admin client

**Structure pattern** (from `contact-eligibility.test.ts` lines 1–20):

```typescript
import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { createClient as createSupabaseClient } from '@supabase/supabase-js'

const URL = process.env.NEXT_PUBLIC_SUPABASE_URL
const SERVICE = process.env.SUPABASE_SERVICE_ROLE_KEY
const hasAll = Boolean(URL && SERVICE)
const d = hasAll ? describe : describe.skip

d('SEED-03 — seed-founding-members idempotency', () => {
  let admin: any
  const testEmail = `seed-test-${Date.now()}@test.local`

  beforeAll(async () => {
    admin = createSupabaseClient(URL!, SERVICE!, {
      auth: { persistSession: false, autoRefreshToken: false },
    })
  }, 30_000)

  afterAll(async () => {
    // cleanup: delete created user (cascades to profiles)
    const { data } = await admin.auth.admin.listUsers({ page: 1, perPage: 1000 })
    const user = data?.users?.find((u: any) => u.email === testEmail)
    if (user) await admin.auth.admin.deleteUser(user.id)
  }, 30_000)

  it('seeds a founding member and is idempotent on re-run', async () => {
    // ... invoke seed logic, assert no duplicate auth user created on second pass
  })
})
```

---

### `tests/e2e/founding-badge.spec.ts` (new E2E test)

**Analog:** `tests/e2e/landing-founding-strip.spec.ts` — seeds a `founding_member=true` profile and checks badge visibility

**Structure pattern** (from `landing-founding-strip.spec.ts` lines 1–50):

```typescript
import { test, expect } from '@playwright/test'
import {
  createVerifiedUser,
  seedPublishedProfile,
  cleanupUser,
} from './fixtures/directory-seed'

const hasEnv =
  !!process.env.NEXT_PUBLIC_SUPABASE_URL &&
  !!process.env.SUPABASE_SERVICE_ROLE_KEY

test.describe('SEED-04: founding member badge renders', () => {
  // Seed one founding_member=true profile, one founding_member=false profile
  // Verify badge shows for former, absent for latter — on /directory and /m/[username]
})
```

The `seedPublishedProfile` fixture already accepts `founding_member: true` (line 41 of `directory-seed.ts`) — no fixture changes needed.

---

### `docs/outreach-template.md` (new planning artifact)

**Analog:** None — first documentation artifact of this kind in the repo.

This is a planning/operational document, not code. No code pattern applies. The planner produces this from the CONTEXT.md specifics:
- Eleven personalized DM variants, one per listing (D-01, D-03)
- Google Form spec: 8 fields (D-04)
- Reply-to: hello@barterkin.com (D-02)
- Signed as Ashley (D-03)

---

### `.planning/STATE.md` (edit — append Founder Commitment)

**Analog:** Existing STATE.md section structure — append a new `## Founder Commitment (SEED-06)` block.

**Pattern** (match STATE.md heading style and table format at lines 1–14):

```markdown
## Founder Commitment (SEED-06)

**Founder:** Ashley (solo operator)
**Commitment:** I will personally reply to every contact request received in the first 14 days post-launch.
**Launch date:** YYYY-MM-DD
**Commitment window closes:** YYYY-MM-DD
**Tracking:** PostHog `contact_initiated` event count vs manual reply log in STATE.md

_First recorded: 2026-04-XX by Phase 7._
```

---

## Shared Patterns

### Service-Role Admin Client Instantiation
**Source:** `tests/e2e/fixtures/directory-seed.ts` lines 13–19
**Apply to:** `scripts/seed-founding-members.mjs`, `tests/unit/seed-founding-members.test.ts`

```typescript
createClient(URL, SERVICE, {
  auth: { autoRefreshToken: false, persistSession: false },
})
```

### Auth User Creation with Email Pre-Confirmed
**Source:** `tests/e2e/fixtures/directory-seed.ts` lines 22–31
**Apply to:** `scripts/seed-founding-members.mjs`

```typescript
const { data, error } = await admin().auth.admin.createUser({
  email,
  password,
  email_confirm: true,
})
if (error) throw new Error(`createVerifiedUser failed: ${error.message}`)
```

Note: For the seed script, omit `password` — founding members claim their account via magic link (no password set is correct behavior per D-07).

### Env-Gated Vitest Test with BeforeAll/AfterAll Cleanup
**Source:** `tests/unit/contact-eligibility.test.ts` lines 13–74
**Apply to:** `tests/unit/seed-founding-members.test.ts`

```typescript
const hasAll = Boolean(URL && ANON && SERVICE)
const d = hasAll ? describe : describe.skip
// ... beforeAll creates users, afterAll deletes via admin.auth.admin.deleteUser
```

### E2E Test with Directory Seed Fixture
**Source:** `tests/e2e/landing-founding-strip.spec.ts` lines 1–50
**Apply to:** `tests/e2e/founding-badge.spec.ts`

```typescript
import { createVerifiedUser, seedPublishedProfile, cleanupUser } from './fixtures/directory-seed'
// seed with founding_member: true, assert badge text visible, cleanup in finally block
```

### Badge Styling Token
**Source:** `components/landing/FoundingMemberCard.tsx` lines 31–36
**Apply to:** `components/profile/FoundingMemberBadge.tsx` (definition), `components/directory/DirectoryCard.tsx` (via component), `components/profile/ProfileCard.tsx` (via component)

Exact class string to reuse for visual consistency across all three surfaces:
```
bg-clay/10 text-clay ring-1 ring-clay/20 font-normal
```

### Resend Fetch Pattern (no SDK, direct fetch)
**Source:** `scripts/send-mailtest.mjs` lines 18–31
**Apply to:** `scripts/seed-founding-members.mjs` `sendWelcomeEmail` helper

```javascript
const res = await fetch("https://api.resend.com/emails", {
  method: "POST",
  headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
  body: JSON.stringify({ from, to: [addr], subject, text, html }),
});
const json = await res.json();
if (!res.ok) { /* log, do NOT throw — email failure is non-blocking */ }
```

### Slug Generation (inline copy for .mjs context)
**Source:** `lib/utils/slug.ts` lines 15–21
**Apply to:** `scripts/seed-founding-members.mjs` (inline, to avoid TS/ESM interop)

```javascript
function generateSlug(displayName) {
  return displayName
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '')
    .slice(0, 40)
}
```

---

## No Analog Found

| File | Role | Data Flow | Reason |
|------|------|-----------|--------|
| `docs/outreach-template.md` | documentation | — | First outreach/DM template artifact in the repo; no prior markdown template to copy structure from. Planner produces from CONTEXT.md §D-01 through D-05 specs directly. |

---

## Critical Implementation Notes for Planner

1. **`getUserByEmail` does not exist** in `@supabase/supabase-js`. D-10's idempotency check MUST use `admin.auth.admin.listUsers({ page: 1, perPage: 1000 })` with in-memory `.some()` filter. Do not reference `getUserByEmail` anywhere in the plan actions.

2. **`founding_member` field propagation** — three files change together: `lib/data/directory.types.ts` (type), `lib/data/directory.ts` (SELECT string + mapping), `components/directory/DirectoryCard.tsx` (conditional render). All three must ship in the same task or TypeScript will error.

3. **`ProfileWithRelations` type check** — before adding `{profile.founding_member && ...}` to `ProfileCard.tsx`, verify that `lib/actions/profile.types.ts` → `ProfileWithRelations` includes `founding_member`. If it is derived from a `SELECT *` or `select('*')`, the field is already present. If it is an explicit column list, add `founding_member` there too.

4. **Service-role INSERT bypasses PROF-12 completeness RLS** — the seed script must validate each member object in the array before inserting: `display_name`, `county_id`, `category_id`, and at least one `skills_offered` entry. Pitfall 2 in RESEARCH.md.

5. **`FoundingMemberBadge` is a server component** — no `'use client'` directive. It receives no props that require client interactivity. The optional `className` prop for positional overrides is a plain string.

---

## Metadata

**Analog search scope:** `/Users/ashleyakbar/barterkin/scripts/`, `/Users/ashleyakbar/barterkin/components/`, `/Users/ashleyakbar/barterkin/lib/`, `/Users/ashleyakbar/barterkin/tests/`
**Files scanned:** 14 source files read
**Pattern extraction date:** 2026-04-21
