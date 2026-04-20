# Phase 3: Profile & Georgia Gate — Research

**Researched:** 2026-04-20
**Domain:** Supabase Storage (avatar upload + RLS), Postgres schema (profiles + skills + counties + tsvector), Next.js App Router profile editor (react-hook-form + zod + shadcn Combobox), RLS for profile visibility gate, auto-slug generation
**Confidence:** HIGH on schema + RLS patterns (verified against Supabase docs + Context7); HIGH on form stack (same pattern as Phase 2, already installed); MEDIUM on canvas-resize client pattern (npm package verified, canvas pattern is training knowledge)

---

## Summary

Phase 3 ships the member profile lifecycle: a scrollable single-page editor at `/profile/edit`, server-enforced completeness gate before publish, RLS-enforced directory visibility at `/m/[username]`, and an avatar upload flow with client-side resize. It depends entirely on infrastructure built in Phases 1 and 2 — the three-client Supabase factory, the server action module pattern, the `(auth)` route group shell, and the `current_user_is_verified()` SQL helper already in the DB.

The key architectural question is the storage RLS policy. Supabase Storage uses `storage.objects` table policies, and the canonical pattern uses `(storage.foldername(name))[1] = (select auth.uid()::text)` to scope each user to their own folder within a bucket. Combined with `upsert: true` on upload, this allows overwriting a single `avatar.jpg` without needing a delete step. The avatars bucket should be set to **public read** so profile pages can render avatars without signed URLs (which expire and would break profile cards).

The profile completeness check (PROF-12) must be enforced in two places: the UI (disabled "Publish" toggle with missing-field tooltip) and a server action that re-validates before setting `is_published = true`. The RLS SELECT policy on `profiles` combines `is_published`, `current_user_is_verified()`, and `banned = false` — this is the gate enforced at the database layer regardless of UI state.

Phase 4 FTS depends on a `tsvector` generated column seeded in this phase's migration. That column must be defined now even though Phase 4 uses it. The migration for Phase 3 is `003_profile_tables.sql`.

**Primary recommendation:** Use the three-table schema (`profiles`, `skills_offered`, `skills_wanted`) with a `counties` reference table. Client-side `browser-image-compression` before Supabase Storage upload. shadcn Combobox (Command + Popover) with a bundled static JSON of 159 Georgia FIPS counties. Completeness gate enforced in both server action and RLS. Auto-slug on first save, locked after that.

---

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

- **D-01:** Single-page scrollable form — not a multi-step wizard. Sections: Basic Info → Skills I Offer → Skills I Want → Location & Category → Preferences.
- **D-02:** Editor at `/profile/edit`. Separate from `/profile` view. No inline view/edit toggle.
- **D-03:** Single "Save" button at bottom. No auto-save, no per-section save. Validation runs on submit.
- **D-04:** After successful save — stay on `/profile/edit`, show success toast. No redirect to view mode.
- **D-05:** Dynamic text rows for skills (offered + wanted). Start with 1 empty row; "+ Add skill" adds up to 5; each row has a remove (×) button. Free-text, 1–60 chars. No external tag library.
- **D-06:** Two separate labeled sections: "Skills I Offer" and "Skills I Want". Both visible simultaneously (not tabbed).
- **D-07:** Auto-slug from display name (`kerry-smith`). Suffix collision resolution (`kerry-smith-2`). User does not pick or see the slug.
- **D-08:** Slug set once on first save, locked forever. No slug changes after that.
- **D-09:** `/m/[username]` is auth-gated — accessible only to authenticated + email-verified users.

### Claude's Discretion

- **Avatar upload:** Client-side resize via `browser-image-compression` (target ≤500KB, max 1080px). Storage path: `avatars/{user_id}/avatar.jpg` (upsert = overwrite). Bucket: `avatars`, public read.
- **Publish gate UI:** Disabled "Publish" toggle with tooltip listing missing fields. On direct click of disabled toggle, show inline checklist of unmet criteria.
- **County typeahead:** Static JSON of 159 FIPS-ordered Georgia counties bundled in the client. shadcn/ui Combobox pattern (Command + Popover). No Postgres round-trip needed for the list.
- **Form library:** shadcn/ui Form (react-hook-form + zod) — already established in Phase 2 auth forms. Extend the same pattern.
- **Route group:** Profile routes live under `app/(app)/` route group (authenticated shell), parallel to `app/(auth)/`.

### Deferred Ideas (OUT OF SCOPE)

- Profile photo cropping UI (crop-to-square before upload) — skip for MVP; canvas resize is sufficient.
- Username change flow — slug locked post-first-save per D-08; post-MVP if pain point.
- Public profile pages — `/m/[username]` is auth-gated per D-09; revisit for Phase 6 or post-launch.
- Sub-categories — 10-category taxonomy ships in MVP; finer sub-taxonomy is v1.1+.
- Phase 2 captchaToken bug fix — not Phase 3 scope; needs pre-Phase-3 cleanup commit or gap plan.
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| PROF-01 | Display name (required, 1–60 chars) + short bio (optional, max 500 chars) | Zod schema field: `displayName: z.string().min(1).max(60)`, `bio: z.string().max(500).optional()`. Rendered as shadcn Form + Input + Textarea. |
| PROF-02 | Avatar upload ≤2MB, jpg/png/webp only, client-side resize before upload | `browser-image-compression@2.0.2` + Supabase Storage `avatars` bucket. Client validates MIME and size before compress+upload. Storage RLS prevents path traversal. |
| PROF-03 | Up to 5 "skills offered" (free-text, 1–60 chars each) | Dynamic row component. Stored in separate `skills_offered` table. Min 1 row required for publish gate. |
| PROF-04 | Up to 5 "skills wanted" (free-text, 1–60 chars each) | Same pattern as PROF-03. Stored in `skills_wanted` table. 0 allowed (optional). |
| PROF-05 | Exactly one of 159 Georgia counties via typeahead | Static JSON bundled client-side. shadcn Combobox (Command + Popover). County FK references `counties` reference table seeded in migration. Required for publish gate. |
| PROF-06 | Primary category from 10 seeded categories | shadcn Select or Combobox. Categories seeded in a `categories` table (or enum). Required for publish gate. |
| PROF-07 | Free-text availability (max 200 chars) | Zod field: `availability: z.string().max(200).optional()`. Rendered as Textarea. Not required for publish gate. |
| PROF-08 | `accepting_contact` preference (bool, default true) | shadcn Switch or Checkbox. Stored as `boolean` column on `profiles`. Default `true`. |
| PROF-09 | Optional TikTok handle with format validation `@username` | Zod: `z.string().regex(/^@[a-zA-Z0-9_.]{1,24}$/).optional().or(z.literal(''))`. Rendered as Input with `@` prefix hint. |
| PROF-10 | User views own profile with publish/unpublish toggle | `/profile` page (read view) showing own profile card + toggle. Toggle calls server action that checks completeness. |
| PROF-11 | Edits reflect immediately, no admin approval | `is_published` stays `true` on field edits. `updated_at` timestamps. No approval column. Immediate on next page load. |
| PROF-12 | "Complete" gate: display name + county + category + ≥1 skill offered + avatar required before publish | Completeness check helper function used in both server action and RLS `WITH CHECK` on `is_published = true`. |
| PROF-13 | Published + email-verified + not-banned profiles visible in directory; all others hidden by RLS | `is_published = true AND current_user_is_verified() AND NOT banned` in RLS SELECT policy. |
| PROF-14 | Member can view another member's profile at `/m/[username]` | Dynamic route `app/(app)/m/[username]/page.tsx`. Auth-gated per D-09. Queries profiles via `username` column. |
| GEO-01 | County selection required before publish (enforced in completeness check) | County is one of the 5 required fields in the completeness gate. Same `counties` table FK. |
| GEO-02 | All 159 Georgia counties available in typeahead, seeded from FIPS codes in `counties` reference table | `counties` table seeded in `003_profile_tables.sql`. Static JSON bundled from the same FIPS data for the client. |
</phase_requirements>

---

## Architectural Responsibility Map

| Capability | Primary Tier | Secondary Tier | Rationale |
|------------|-------------|----------------|-----------|
| Profile form state | Browser/Client | — | RHF manages controlled state; submit posts to server action |
| Client-side image resize | Browser/Client | — | `browser-image-compression` runs in-browser before upload; reduces egress |
| Avatar upload to Storage | Browser/Client (Supabase Storage API) | Supabase Storage RLS | Client calls `supabase.storage.from('avatars').upload()` directly using browser client; RLS enforces path ownership |
| Profile upsert (all non-avatar fields) | API/Backend (Next.js Server Action) | Supabase Postgres RLS | `lib/actions/profile.ts` server action validates + upserts `profiles`, replaces `skills_offered`/`skills_wanted` rows |
| Publish gate enforcement (completeness) | API/Backend (Server Action) | Postgres RLS WITH CHECK | Server action checks completeness before setting `is_published = true`; RLS adds DB-layer enforcement |
| Slug generation | API/Backend (Server Action) | — | Runs once on first profile save; slug stored on `profiles.username` |
| County typeahead options | Browser/Client (static JSON) | — | 159 counties never change; no DB round-trip for the list |
| Category options | Browser/Client (static JSON or DB seed) | — | 10 categories seeded in DB; can bundle as static for perf |
| Profile visibility (SELECT gate) | Database/Postgres RLS | — | `is_published + current_user_is_verified() + NOT banned` — DB-enforced, not UI-only |
| Auth-gating `/m/[username]` and `/profile` | Frontend Server (Next.js middleware) | — | `VERIFIED_REQUIRED_PREFIXES` in `lib/supabase/middleware.ts` already covers `/m/` and `/profile` |
| Public profile card at `/m/[username]` | Frontend Server (RSC) | Postgres via server Supabase client | Server component queries profile by username; RLS filters automatically |
| tsvector generated column for FTS | Database/Postgres | — | Defined in migration; GIN index added; Phase 4 queries it |

---

## Standard Stack

### Core (all already installed — Phase 1 or 2)
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| `@supabase/ssr` | 0.10.2 [VERIFIED: package.json] | Three-client factory (browser, server, middleware) | Phase 2 established this as the only Supabase client pattern |
| `@supabase/supabase-js` | 2.103.3 [VERIFIED: package.json] | Underlying Supabase JS client | Peer dep of `@supabase/ssr`; used directly for Storage calls |
| `react-hook-form` | 7.72.1 [VERIFIED: package.json] | Client form state | Phase 2 auth forms use this; profile editor extends the same pattern |
| `zod` | 4.3.6 [VERIFIED: package.json] | Schema validation | Used in Phase 2 auth schemas; profile schema follows same pattern |
| `@hookform/resolvers` | 5.2.2 [VERIFIED: package.json] | Zod ↔ RHF adapter | Standard companion to zod + react-hook-form |
| `shadcn/ui` (CLI + components) | CLI 4.3.x [VERIFIED: package.json] | Form, Input, Textarea, Button, Card, Combobox, Switch, Toast | Phase 2 already installed Form, Input, Button, Card, Label, Separator, Alert |
| `lucide-react` | 1.8.0 [VERIFIED: package.json] | Icons (ChevronsUpDown, Check, X, etc.) | shadcn's default icon set |

### New in Phase 3
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| `browser-image-compression` | 2.0.2 [VERIFIED: npm registry] | Client-side image compress + resize before upload | Avatar upload before Supabase Storage call; keeps file ≤500KB without Pro-tier image transforms |
| `sonner` (shadcn component) | 2.0.7 [VERIFIED: npm registry via `shadcn add`] | Toast notifications | "Profile saved." success toast per D-04 |

### shadcn Components to Add in Wave 0
```bash
pnpm dlx shadcn@latest add combobox    # county typeahead (Command + Popover)
pnpm dlx shadcn@latest add textarea    # bio + availability fields
pnpm dlx shadcn@latest add switch      # accepting_contact toggle + publish toggle
pnpm dlx shadcn@latest add sonner      # "Profile saved." toast
pnpm dlx shadcn@latest add tooltip     # disabled publish toggle tooltip
pnpm dlx shadcn@latest add avatar      # avatar display (profile view + /m/[username])
```

Note: `Command` and `Popover` are pulled in as Combobox dependencies — install `combobox` and both arrive. [VERIFIED: Context7 /websites/ui_shadcn combobox pattern]

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| `pnpm` | 10.x [VERIFIED: package.json engines] | Package manager | Project-standard; never use npm/yarn |

### Installation (new in Phase 3)
```bash
pnpm add browser-image-compression
pnpm dlx shadcn@latest add combobox textarea switch sonner tooltip avatar
```

**Version verification:**
- `browser-image-compression`: `2.0.2` confirmed via `npm view browser-image-compression version` [VERIFIED: npm registry]
- `sonner`: `2.0.7` confirmed via `npm view sonner version` [VERIFIED: npm registry]
- `react-hook-form`: `7.72.1` confirmed [VERIFIED: npm registry]
- `zod`: `4.3.6` confirmed [VERIFIED: npm registry]

---

## Architecture Patterns

### System Architecture Diagram

```
Browser                    Next.js Server              Supabase
─────────────────────      ─────────────────────       ─────────────────────
ProfileEditForm            Server Action               Postgres (profiles
  │                        lib/actions/profile.ts      skills_offered/wanted
  │ 1. RHF form state      │                           counties, categories)
  │    (controlled)        │ 3. Zod parse + validate    │
  │ 2. Submit FormData ──► │ 4. Completeness check      │
  │                        │ 5. Upsert profiles ──────► │ RLS: owner_id = auth.uid()
  │                        │ 6. Replace skills rows ──► │
  │                        │ 7. Slug generation         │
  │                        │    (first save only)       │
  ◄── 8. {ok, error} ──── │                            │
  │ 9. Show toast/errors   │                            │
  │                                                     │
  │ Avatar upload (parallel path):                      │
  │ 1. File input change                                │
  │ 2. browser-image-compression (≤500KB, ≤1080px)     │
  │ 3. supabase.storage.from('avatars')                Supabase Storage
  │    .upload(`avatars/${userId}/avatar.jpg`,─────────► RLS: foldername[1] = uid
  │       blob, { upsert: true })                      │ (path traversal blocked)
  │ 4. Get public URL ◄─────────────────────────────── │
  │ 5. Store avatar_url in form state for submit        │
  │
  │
  ├── /profile/edit (POST → server action above)
  ├── /profile     (GET → RSC → server Supabase client)
  │                           │
  │               profiles SELECT: owner_id = auth.uid()
  │               (returns own profile regardless of is_published)
  │
  └── /m/[username] (GET → RSC → server Supabase client)
                              │
              profiles SELECT:
              is_published = true
              AND current_user_is_verified()
              AND banned = false
              AND username = $param
```

### Recommended Project Structure (new files only)
```
app/
├── (app)/                        # NEW authenticated shell route group
│   ├── layout.tsx                # App shell layout (nav header + children)
│   ├── profile/
│   │   ├── edit/
│   │   │   └── page.tsx          # Profile editor (server component wrapper)
│   │   └── page.tsx              # Own profile view + publish toggle
│   └── m/
│       └── [username]/
│           └── page.tsx          # Another member's profile card
│
components/
├── profile/
│   ├── ProfileEditForm.tsx       # Client component — full editor form
│   ├── SkillRowList.tsx          # Dynamic skill row input (offered or wanted)
│   ├── CountyCombobox.tsx        # shadcn Command+Popover county typeahead
│   ├── AvatarUpload.tsx          # Client component — file input + compress + upload
│   ├── PublishToggle.tsx         # Client component — publish/unpublish with gate UI
│   └── ProfileCard.tsx           # Server component — public profile view card
│
lib/
├── actions/
│   └── profile.ts                # Server actions: saveProfile, setPublished
├── data/
│   ├── georgia-counties.json     # 159 FIPS-ordered county list (static, bundled)
│   └── categories.ts             # 10 categories constant (typed)
│
supabase/
└── migrations/
    └── 003_profile_tables.sql    # profiles, skills_offered, skills_wanted, counties, categories
```

### Pattern 1: Server Action — `saveProfile`

```typescript
// Source: extends lib/actions/auth.ts pattern (Phase 2 PATTERNS.md)
// lib/actions/profile.ts
'use server'

import { z } from 'zod'
import { createClient } from '@/lib/supabase/server'

const ProfileSchema = z.object({
  displayName: z.string().min(1).max(60),
  bio: z.string().max(500).optional(),
  avatarUrl: z.string().url().optional(),
  skillsOffered: z.array(z.string().min(1).max(60)).min(0).max(5),
  skillsWanted: z.array(z.string().min(1).max(60)).min(0).max(5),
  countyId: z.number().int().positive(),
  categoryId: z.number().int().positive(),
  availability: z.string().max(200).optional(),
  acceptingContact: z.boolean().default(true),
  tiktokHandle: z.string().regex(/^@[a-zA-Z0-9_.]{1,24}$/).optional().or(z.literal('')),
})

export async function saveProfile(
  _prevState: SaveProfileResult | null,
  formData: FormData,
): Promise<SaveProfileResult> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { ok: false, error: 'Not authenticated.' }

  const parsed = ProfileSchema.safeParse(/* ... parse formData ... */)
  if (!parsed.success) return { ok: false, error: 'Please fix the highlighted fields.' }

  // Upsert profile (slug generation on first save — see Pattern 4)
  // Delete + re-insert skills rows within a transaction (or sequential upserts)
  // Return { ok: true }
}
```

[ASSUMED] The exact transaction pattern for replacing skills (delete old + insert new vs upsert by skill_id) should be confirmed against Supabase JS docs — both work, but delete+insert is simpler for a bounded list.

### Pattern 2: Avatar Upload (Client Component)

```typescript
// Source: Supabase Storage docs [VERIFIED: Context7 /websites/supabase]
// components/profile/AvatarUpload.tsx
'use client'

import imageCompression from 'browser-image-compression'
import { createClient } from '@/lib/supabase/client'

async function handleAvatarUpload(file: File, userId: string) {
  // 1. Client-side validation (PROF-02)
  const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp']
  if (!ALLOWED_TYPES.includes(file.type)) throw new Error('Only JPG, PNG, and WebP allowed.')
  if (file.size > 2 * 1024 * 1024) throw new Error('File must be under 2MB.')

  // 2. Client-side resize (Claude's Discretion)
  const compressed = await imageCompression(file, {
    maxSizeMB: 0.5,           // 500KB target
    maxWidthOrHeight: 1080,
    useWebWorker: true,
    fileType: 'image/jpeg',   // normalize to JPEG
  })

  // 3. Upload to Supabase Storage
  const supabase = createClient()
  const path = `${userId}/avatar.jpg`  // path WITHIN the bucket = avatars/{user_id}/avatar.jpg
  const { error } = await supabase.storage
    .from('avatars')
    .upload(path, compressed, {
      cacheControl: '3600',
      upsert: true,              // overwrite on update (D-08 equivalent for avatars)
      contentType: 'image/jpeg',
    })
  if (error) throw error

  // 4. Get public URL (bucket is public-read)
  const { data } = supabase.storage.from('avatars').getPublicUrl(path)
  return data.publicUrl  // stored in profiles.avatar_url
}
```

### Pattern 3: County Combobox (Client Component)

```typescript
// Source: [VERIFIED: Context7 /websites/ui_shadcn combobox pattern]
// components/profile/CountyCombobox.tsx
'use client'

import * as React from 'react'
import { Check, ChevronsUpDown } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import {
  Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList,
} from '@/components/ui/command'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import georgiaCounties from '@/lib/data/georgia-counties.json'

// georgia-counties.json shape: [{ fips: 13001, name: "Appling County" }, ...]
// 159 entries, FIPS-ordered, bundled statically — no DB round-trip (Claude's Discretion)

export function CountyCombobox({
  value, onChange,
}: { value: number | null; onChange: (fips: number) => void }) {
  const [open, setOpen] = React.useState(false)
  const selected = georgiaCounties.find(c => c.fips === value)

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="outline" role="combobox" aria-expanded={open}>
          {selected?.name ?? 'Select county...'}
          <ChevronsUpDown className="ml-auto opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[300px] p-0">
        <Command>
          <CommandInput placeholder="Search Georgia counties..." />
          <CommandList>
            <CommandEmpty>No county found.</CommandEmpty>
            <CommandGroup>
              {georgiaCounties.map(county => (
                <CommandItem
                  key={county.fips}
                  value={county.name}
                  onSelect={() => { onChange(county.fips); setOpen(false) }}
                >
                  {county.name}
                  <Check className={cn('ml-auto', value === county.fips ? 'opacity-100' : 'opacity-0')} />
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  )
}
```

### Pattern 4: Auto-Slug Generation (Server-Side, First Save Only)

```typescript
// Source: lib/actions/profile.ts (locked logic from D-07, D-08 in CONTEXT.md)
function generateSlug(displayName: string): string {
  return displayName
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '')
    .slice(0, 40)
}

async function resolveUniqueSlug(
  supabase: SupabaseClient,
  base: string,
): Promise<string> {
  // Try base slug, then base-2 through base-9, then uuid suffix
  const candidates = [
    base,
    ...Array.from({ length: 8 }, (_, i) => `${base}-${i + 2}`),
    `${base}-${crypto.randomUUID().slice(0, 8)}`,
  ]
  for (const candidate of candidates) {
    const { count } = await supabase
      .from('profiles')
      .select('id', { count: 'exact', head: true })
      .eq('username', candidate)
    if (count === 0) return candidate
  }
  return candidates[candidates.length - 1] // uuid suffix is effectively unique
}

// In saveProfile server action:
// 1. Check if profile already has a username (slug is locked after first save — D-08)
// 2. If no username: generate slug, resolve uniqueness, set profiles.username
// 3. If has username: skip slug step entirely
```

### Pattern 5: Completeness Check (Server Action + RLS)

The completeness check runs in two places: server action (before setting `is_published = true`) and RLS `WITH CHECK` clause (DB enforcement).

```typescript
// In lib/actions/profile.ts
function isProfileComplete(profile: {
  displayName: string | null
  countyId: number | null
  categoryId: number | null
  avatarUrl: string | null
  skillsOfferedCount: number
}): boolean {
  return (
    !!profile.displayName &&
    !!profile.countyId &&
    !!profile.categoryId &&
    !!profile.avatarUrl &&
    profile.skillsOfferedCount >= 1
  )
}
```

```sql
-- In 003_profile_tables.sql — publish gate WITH CHECK on profiles UPDATE
-- [ASSUMED] Exact SQL syntax for the completeness subquery to be verified at implementation
create policy "Only complete profiles can be published"
on public.profiles
for update
to authenticated
using (owner_id = auth.uid())
with check (
  owner_id = auth.uid()
  AND (
    is_published = false  -- always allow unpublish
    OR (
      display_name IS NOT NULL
      AND county_id IS NOT NULL
      AND category_id IS NOT NULL
      AND avatar_url IS NOT NULL
      AND (SELECT count(*) FROM public.skills_offered WHERE profile_id = profiles.id) >= 1
    )
  )
);
```

### Pattern 6: Profile Visibility RLS (SELECT)

```sql
-- In 003_profile_tables.sql
-- Uses current_user_is_verified() installed in 002_auth_tables.sql (Phase 2)
-- [VERIFIED: function confirmed in supabase/migrations/002_auth_tables.sql line 63-74]

create policy "Published verified un-banned profiles visible to verified members"
on public.profiles
for select
to authenticated
using (
  -- Own profile always visible (for edit page queries)
  owner_id = auth.uid()
  OR
  (
    is_published = true
    AND public.current_user_is_verified()  -- viewer must be verified
    AND banned = false
    -- Note: profile owner's own verification is not re-checked here;
    -- Phase 2 design decision was that published = already-verified owner
    -- (publish requires completing profile, which requires auth session)
  )
);
```

### Pattern 7: Supabase Storage RLS for Avatars

```sql
-- In 003_profile_tables.sql
-- [VERIFIED: Context7 + Supabase docs access-control guide]
-- storage.objects uses (storage.foldername(name))[1] to extract first path segment
-- Path: avatars/{user_id}/avatar.jpg → foldername[1] = user_id

-- Upload / update own avatar
create policy "Users can upload their own avatar"
on storage.objects
for insert
to authenticated
with check (
  bucket_id = 'avatars'
  AND (storage.foldername(name))[1] = (select auth.uid()::text)
);

create policy "Users can update their own avatar"
on storage.objects
for update
to authenticated
using (
  bucket_id = 'avatars'
  AND (storage.foldername(name))[1] = (select auth.uid()::text)
);

-- Public read for avatars (bucket is public — still define policy for explicit control)
create policy "Avatar images are publicly readable"
on storage.objects
for select
to public
using (bucket_id = 'avatars');
```

**Storage bucket setup (Supabase Studio or migration):**
- Bucket name: `avatars`
- Public: `true` (serves files at `<supabase-url>/storage/v1/object/public/avatars/...`)
- No file size limit at bucket level (enforced client-side at 2MB)

**Critical:** Bucket must be created before the migration runs policies on `storage.objects`. Bucket creation can be done via Supabase Studio or a separate `createBucket` call in a Wave 0 task. [ASSUMED] Cannot create buckets via SQL migrations; must use Supabase Studio or Storage API call.

### Anti-Patterns to Avoid

- **Storing the full Supabase Storage URL in `profiles.avatar_url`:** The URL includes the project ref and can change if project is migrated. Store just the path (`avatars/{user_id}/avatar.jpg`) and derive the public URL at render time. [ASSUMED] — standard practice, but project can choose either approach. The simpler approach for MVP is to store the full public URL since the project ref is fixed for MVP.
- **Using `getSession()` in server action to get the user ID:** Always use `supabase.auth.getUser()` in server actions when you need the user ID for DML operations. `getSession()` is banned per CLAUDE.md.
- **Calling the Storage API from a Server Action to upload avatars:** Storage uploads must come from the client (browser) using the browser Supabase client. Server actions cannot receive file blobs efficiently in Next.js FormData without base64 overhead. Upload client-side, store the resulting URL server-side.
- **Deleting the old avatar before uploading the new one:** `upsert: true` handles overwrite atomically. A delete-then-upload creates a window where the avatar is missing.
- **Running the county typeahead against Postgres on every keystroke:** The 159-county list is static and tiny (~8KB JSON). Bundle it client-side and filter in memory with `CommandInput` filtering.
- **Blocking publish if `skills_wanted` is empty:** PROF-04 says 0–5 wanted skills (optional). Only `skills_offered` (≥1) is required for publish (PROF-12).

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Image compression/resize | Canvas API resize loop | `browser-image-compression` | Handles EXIF orientation, progressive JPEG, WebP output, Web Worker offload — ~2 edge cases per approach that trip up hand-rolled canvas |
| Form validation | Custom `useState` + manual checks | react-hook-form + zod | Already in Phase 2; consistent error surface; controlled re-render optimization |
| Searchable dropdown | Custom filtered `<select>` | shadcn Combobox (Command + Popover) | Accessible (keyboard nav, ARIA), already used in shadcn ecosystem, handles 159-item list gracefully |
| Unique slug collision | UUID fallback immediately | Suffix loop (base, base-2..base-9, then uuid) | Small suffix loop prevents ugly UUIDs for common names; UUID only as final fallback |
| Storage path traversal prevention | Client-side path sanitation | Supabase Storage RLS `foldername(name)[1] = auth.uid()` | Client validation is bypassable; RLS is the real guard |
| Toast notifications | Custom toast component | `sonner` via `pnpm dlx shadcn@latest add sonner` | Already in shadcn ecosystem; matches project component conventions |

---

## Database Schema (Migration `003_profile_tables.sql`)

The following tables must be created in this phase. All tables enable RLS immediately on creation (default-deny pattern from Phase 2).

### `counties` reference table (GEO-02)
```sql
create table public.counties (
  id     serial primary key,
  fips   int unique not null,   -- FIPS code e.g. 13001 for Appling
  name   text not null          -- e.g. "Appling County"
);
alter table public.counties enable row level security;
-- Public read (reference data, no PII)
create policy "Counties are publicly readable" on public.counties for select to authenticated using (true);
-- Seed all 159 Georgia counties in the migration
```

### `categories` table (PROF-06)
```sql
create table public.categories (
  id    serial primary key,
  name  text unique not null,
  slug  text unique not null
);
alter table public.categories enable row level security;
create policy "Categories are publicly readable" on public.categories for select to authenticated using (true);
-- Seed 10 categories:
-- Food, Farm & Garden, Skilled Trades, Beauty & Hair, Wellness,
-- Crafts, Childcare/Tutoring, Tech, Home/Cleaning, Transportation
```

### `profiles` table (PROF-01 through PROF-14)
```sql
create table public.profiles (
  id                uuid primary key default gen_random_uuid(),
  owner_id          uuid not null unique references auth.users(id) on delete cascade,
  username          text unique,              -- slug, set once (D-07, D-08)
  display_name      text,                     -- required for publish (PROF-01)
  bio               text,                     -- optional, max 500
  avatar_url        text,                     -- required for publish (PROF-02)
  county_id         int references public.counties(id),   -- required for publish (PROF-05, GEO-01)
  category_id       int references public.categories(id), -- required for publish (PROF-06)
  availability      text,                     -- optional, max 200 (PROF-07)
  accepting_contact boolean not null default true,        -- PROF-08
  tiktok_handle     text,                     -- optional, @username format (PROF-09)
  is_published      boolean not null default false,       -- PROF-10, PROF-12, PROF-13
  banned            boolean not null default false,       -- PROF-13 (TRUST-03 Phase 5)
  founding_member   boolean not null default false,       -- SEED-04 (Phase 7)
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now(),
  -- Phase 4 FTS: tsvector generated column (PROF-11 + DIR-05)
  -- Concatenates display_name + bio + skills; Phase 4 queries it
  search_vector     tsvector generated always as (
    to_tsvector('english',
      coalesce(display_name, '') || ' ' ||
      coalesce(bio, '') || ' ' ||
      coalesce(tiktok_handle, '')
    )
  ) stored
);
alter table public.profiles enable row level security;

-- updated_at trigger
create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin new.updated_at = now(); return new; end; $$;
create trigger profiles_updated_at
  before update on public.profiles
  for each row execute function public.set_updated_at();

-- GIN index for Phase 4 FTS
create index profiles_search_vector_gin on public.profiles using gin(search_vector);
-- btree index for slug lookup
create index profiles_username_idx on public.profiles(username) where username is not null;
```

**Note on tsvector and skills:** The `search_vector` generated column does NOT yet include skills text because `skills_offered`/`skills_wanted` are in separate tables. Phase 4 can address this with a function-based or materialized approach. For now, name + bio suffices for the generated column, and the FTS index is forward-compatible. [ASSUMED] — confirm Phase 4 FTS design can work with this or needs a trigger-based tsvector update.

### `skills_offered` and `skills_wanted` tables (PROF-03, PROF-04)
```sql
create table public.skills_offered (
  id          uuid primary key default gen_random_uuid(),
  profile_id  uuid not null references public.profiles(id) on delete cascade,
  skill_text  text not null check (char_length(skill_text) between 1 and 60),
  sort_order  int not null default 0,
  created_at  timestamptz not null default now()
);
alter table public.skills_offered enable row level security;

create table public.skills_wanted (
  id          uuid primary key default gen_random_uuid(),
  profile_id  uuid not null references public.profiles(id) on delete cascade,
  skill_text  text not null check (char_length(skill_text) between 1 and 60),
  sort_order  int not null default 0,
  created_at  timestamptz not null default now()
);
alter table public.skills_wanted enable row level security;

-- RLS: owner can CRUD their own skills; authenticated users can read skills of visible profiles
-- (SELECT policy joins visibility through profiles table)
```

---

## Common Pitfalls

### Pitfall 1: Skills Table RLS — "Skills of hidden profiles must also be hidden"
**What goes wrong:** Skills tables get a simple `to authenticated using (true)` SELECT policy. This means anyone can query skills for unpublished/banned profiles by profile_id — bypassing the profile visibility gate.
**Why it happens:** Skills are a separate table; RLS on `profiles` doesn't automatically cascade to `skills_offered`.
**How to avoid:** Skills SELECT policy must check profile visibility: `using (exists (select 1 from public.profiles p where p.id = profile_id and (p.owner_id = auth.uid() or (p.is_published = true and public.current_user_is_verified() and p.banned = false))))`.
**Warning signs:** A test that queries `skills_offered` with a non-owner, non-verified user returns rows.

### Pitfall 2: Storage `foldername` Function — Supabase vs Standard Postgres
**What goes wrong:** Policy uses `storage.foldername(name)` which is a Supabase-provided function, not standard Postgres. It doesn't exist in local Supabase dev until the `storage` extension is loaded.
**Why it happens:** Supabase CLI `supabase start` loads the storage extension; but if the policy is tested with raw psql against a fresh cluster, it fails.
**How to avoid:** Test storage policies via `supabase start` local dev only. The function is available in the hosted project. [VERIFIED: Supabase docs confirm `storage.foldername()` is a built-in function, Context7 /websites/supabase]
**Warning signs:** `function storage.foldername(text) does not exist` during local migration run.

### Pitfall 3: Supabase Storage Bucket Must Pre-Exist Before RLS Policies
**What goes wrong:** The SQL migration runs `create policy ... on storage.objects where bucket_id = 'avatars'` but the `avatars` bucket doesn't exist yet. The policies succeed (they're on `storage.objects`, not the bucket itself) but uploads fail until the bucket is created.
**Why it happens:** Buckets are not created via SQL; they're created via the Supabase Storage API or Studio.
**How to avoid:** Wave 0 task: create the `avatars` bucket (public = true) in Supabase Studio before running Wave 1 migration. Document this as a manual prerequisite step. [ASSUMED] — Supabase may support `insert into storage.buckets` in SQL migrations; verify at implementation time.
**Warning signs:** `Bucket not found` error on first avatar upload attempt.

### Pitfall 4: `getUser()` vs `getClaims()` in Server Actions
**What goes wrong:** Server action calls `supabase.auth.getClaims()` to get `user.id` but uses it to write data as if it's trusted. For DML operations (INSERT/UPDATE), the `auth.uid()` in RLS is the authoritative source — but if the server action itself needs the user ID before the DB call (e.g. to generate the slug), it must use `getUser()` to get a guaranteed-current user object.
**Why it happens:** `getClaims()` is JWKS-verified but is a read from the JWT payload. For write operations, `getUser()` (single Auth server round-trip) is the right call to confirm the session is still live.
**How to avoid:** In `lib/actions/profile.ts`, call `const { data: { user } } = await supabase.auth.getUser()` and check `if (!user) return { ok: false, error: 'Not authenticated.' }`. This is the Phase 2 pattern from `lib/actions/auth.ts`.
**Warning signs:** `getClaims()` returns stale user data after a session revocation; RLS still blocks the write, but the server action didn't catch it first.

### Pitfall 5: `username` Uniqueness Race Condition
**What goes wrong:** Two users with "Kerry Smith" as display name submit their first profile save simultaneously. Both pass the uniqueness check, both try to insert `username = 'kerry-smith'`, one gets a unique constraint violation.
**Why it happens:** The check-then-insert is not atomic without a DB-level unique constraint + retry.
**How to avoid:** The `profiles.username` column has a `UNIQUE` constraint. Server action catches the Postgres unique violation error (`23505`) and retries with `kerry-smith-2`. Implement the retry loop in `resolveUniqueSlug()`.
**Warning signs:** Supabase returns `{ code: '23505' }` error on profile insert.

### Pitfall 6: RHF `defaultValues` Not Loaded From Existing Profile
**What goes wrong:** Profile edit page mounts with empty form even for users who already have profile data.
**Why it happens:** Server component fetches the profile, but the client component (`ProfileEditForm`) doesn't receive `defaultValues`.
**How to avoid:** Server component page (`app/(app)/profile/edit/page.tsx`) fetches profile data, passes it as props to the client form component. The form initializes with `useForm({ defaultValues: existingProfile })`.
**Warning signs:** Saving an otherwise-complete profile with empty fields because the defaults weren't loaded.

### Pitfall 7: Avatar URL Becomes Stale After Overwrite
**What goes wrong:** After the user updates their avatar, old `avatar_url` is cached by the browser and doesn't update.
**Why it happens:** The storage path never changes (`avatars/{user_id}/avatar.jpg`) so the URL is identical on re-upload. Browser caches the old image.
**How to avoid:** Append a cache-busting query param to the avatar URL when storing it: `avatar_url = publicUrl + '?t=' + Date.now()`. Or set `Cache-Control: no-cache` on the storage object. The `cacheControl: '3600'` in the upload options sets the CDN TTL — set it lower or add a query param.
**Warning signs:** Avatar shows the old image after successful upload with no error.

---

## Code Examples

### Verified: Supabase Storage Upload (JavaScript/TypeScript)
```typescript
// Source: [VERIFIED: Context7 /websites/supabase + Supabase JS docs]
const { data, error } = await supabase
  .storage
  .from('avatars')
  .upload(`${userId}/avatar.jpg`, file, {
    cacheControl: '3600',
    upsert: true,
    contentType: 'image/jpeg',
  })
```

### Verified: Storage RLS with `foldername`
```sql
-- Source: [VERIFIED: Supabase docs storage/security/access-control + Context7 /websites/supabase]
create policy "User can insert in their own folders"
on storage.objects
for insert
to authenticated
with check (
  (storage.foldername(name))[1] = (select auth.uid()::text)
);
```

### Verified: shadcn Combobox Pattern
```tsx
// Source: [VERIFIED: Context7 /websites/ui_shadcn combobox docs]
// Condensed from full pattern — see Pattern 3 above for full implementation
<Popover open={open} onOpenChange={setOpen}>
  <PopoverTrigger asChild>
    <Button variant="outline" role="combobox" aria-expanded={open}>
      {selected?.label ?? 'Select...'}
      <ChevronsUpDown className="ml-auto opacity-50" />
    </Button>
  </PopoverTrigger>
  <PopoverContent className="w-[300px] p-0">
    <Command>
      <CommandInput placeholder="Search..." />
      <CommandList>
        <CommandEmpty>No results.</CommandEmpty>
        <CommandGroup>
          {items.map(item => (
            <CommandItem key={item.value} value={item.value} onSelect={...}>
              {item.label}
              <Check className={cn('ml-auto', isSelected ? 'opacity-100' : 'opacity-0')} />
            </CommandItem>
          ))}
        </CommandGroup>
      </CommandList>
    </Command>
  </PopoverContent>
</Popover>
```

### Verified: Supabase Storage Public URL
```typescript
// Source: [VERIFIED: Supabase JS docs]
// For public buckets — no expiry, no round-trip
const { data } = supabase.storage.from('avatars').getPublicUrl(`${userId}/avatar.jpg`)
const avatarUrl = data.publicUrl
// Returns: https://<project-ref>.supabase.co/storage/v1/object/public/avatars/{userId}/avatar.jpg
```

### Verified: browser-image-compression Basic Usage
```typescript
// Source: [VERIFIED: npm registry confirms 2.0.2 current; pattern from package README — ASSUMED training knowledge for options]
import imageCompression from 'browser-image-compression'

const compressed = await imageCompression(originalFile, {
  maxSizeMB: 0.5,
  maxWidthOrHeight: 1080,
  useWebWorker: true,
  fileType: 'image/jpeg',
})
```

### Verified: Sonner Toast (already available via shadcn add)
```typescript
// Source: [VERIFIED: Context7 /websites/ui_shadcn sonner docs]
import { toast } from 'sonner'

// In the form's success handler:
toast('Profile saved.')   // D-04: plain copy, no emoji
```

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Supabase Storage Image Transformations for resize | Client-side resize (`browser-image-compression`) | Pro-plan restriction enforced 2024 | Free tier must resize before upload; Pro tier can use transform URLs later |
| Custom county `<select>` with all options | shadcn Combobox (Command + Popover) with search | shadcn 2023+ | 159-item list is searchable; accessible keyboard navigation |
| Slug from UUID | Slug from display name + suffix collision | Community standard | Human-readable URLs; much better for sharing |
| Signed URLs for avatar display | Public bucket + public URL | Always valid for non-sensitive content | Signed URLs expire and break profile cards; public URL is permanent |

**Deprecated/outdated:**
- `@supabase/auth-helpers-nextjs`: deprecated (Phase 2 established); never use.
- Supabase Storage `getPublicUrl()` returning `{ publicURL }`: old API; current API returns `{ data: { publicUrl } }`. [VERIFIED: Context7]

---

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | Storage bucket cannot be created via SQL migration; requires Studio or API call | Pitfall 3 + Storage section | If wrong: can add `insert into storage.buckets` to migration and skip manual step |
| A2 | `browser-image-compression` options: `fileType: 'image/jpeg'` normalizes PNG to JPEG | Pattern 2 | If wrong: choose `fileType` based on original file type or omit to keep original format |
| A3 | `skills_offered`/`skills_wanted` delete+re-insert pattern is simpler than upsert-by-skill-id for MVP | Pattern 1 | If wrong (e.g. Supabase rate limits or FK cascade issues): use upsert-with-id instead |
| A4 | tsvector generated column cannot include skills from child tables — needs trigger | Database Schema section | If wrong: Postgres 14+ supports subquery in generated columns via IMMUTABLE function — verify at migration time |
| A5 | `storage.foldername` function accepts `name` (the object's full path, not just filename) | Pattern 7 | If wrong: policy silently allows all paths; verify with a test upload |
| A6 | Avatar URL with cache-bust query param is the simplest way to bust browser cache on re-upload | Pitfall 7 | If wrong: use CDN purge or shorter `cacheControl` value |

---

## Open Questions

1. **How does Phase 4 FTS handle skills text that lives in child tables?**
   - What we know: `search_vector` generated column on `profiles` includes `display_name + bio`; Phase 4 requires skills in FTS.
   - What's unclear: Generated columns in Postgres cannot reference other tables. Either (a) add a trigger that updates `search_vector` on skills insert/update, or (b) Phase 4 uses a `UNION` / join in the query.
   - Recommendation: Phase 3 defines the column for name+bio only. Add a Phase 3 note for Phase 4 planner: "Skills FTS requires a trigger-based tsvector update pattern."

2. **Does the `authenticated` role require `email_confirmed_at` to be non-null?**
   - What we know: Supabase Auth sets a user as `authenticated` role regardless of email verification. The `current_user_is_verified()` function checks `email_confirmed_at IS NOT NULL`.
   - What's unclear: Can a user with an unverified email call `supabase.from('profiles').insert()` and bypass the email-verify gate?
   - Recommendation: RLS SELECT policy gates visibility on `current_user_is_verified()` for *viewer*. Profile INSERT/UPDATE should also check `current_user_is_verified()` — otherwise unverified users can create profiles that are invisible. Add this check to the INSERT/UPDATE policies.

3. **What happens to `profiles.username` if `display_name` is null on first save?**
   - What we know: Slug is generated from `display_name` on first profile save. But what if someone submits the form with an empty display name on the first save?
   - What's unclear: Zod validation requires `displayName: z.string().min(1)` — so it should never be null. But the schema `display_name text` is nullable for the DB column.
   - Recommendation: Add a DB `CHECK` constraint `check (is_published = false or display_name is not null)` for defense in depth. Don't rely solely on the application layer.

---

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| Supabase project `hfdcsickergdcdvejbcw` | profiles migration, Storage bucket, RLS | ✓ | Postgres 17 (managed) | — |
| `supabase` CLI | Local dev, `supabase db reset`, type gen | [ASSUMED] installed globally or via npx | 1.25.x+ | `npx supabase@latest` |
| Node.js | Server actions, Next.js build | ✓ | 22.14.0 (user env) | — |
| pnpm | Package installs | ✓ | 10.x (per package.json engines) | — |
| `browser-image-compression` | Avatar upload | Not yet installed | 2.0.2 (latest) | Canvas API hand-roll (not recommended) |
| Supabase Storage `avatars` bucket | Avatar upload | Not yet created | — | Create in Wave 0 via Studio |

**Missing with no fallback:**
- None that block execution — all can be resolved in Wave 0.

**Wave 0 pre-requisites before code lands:**
1. `pnpm add browser-image-compression`
2. `pnpm dlx shadcn@latest add combobox textarea switch sonner tooltip avatar`
3. Create `avatars` bucket in Supabase Studio (public = true)
4. Run `supabase db push` or `pnpm supabase migration up` with `003_profile_tables.sql`
5. Run `pnpm supabase gen types typescript > lib/database.types.ts` after migration

---

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | Vitest 4.x (unit) + Playwright 1.59.x (E2E) |
| Config file | `vitest.config.ts` + `playwright.config.ts` |
| Quick run command | `pnpm test` (Vitest unit suite) |
| Full suite command | `pnpm test && pnpm e2e` |

### Phase Requirements → Test Map

| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| PROF-01 | Display name validation (min 1, max 60) | unit | `pnpm test tests/unit/profile-schema.test.ts` | ❌ Wave 0 |
| PROF-02 | Avatar MIME + size validation | unit | `pnpm test tests/unit/avatar-validation.test.ts` | ❌ Wave 0 |
| PROF-02 | Storage RLS rejects wrong-user path upload | E2E (manual) | — | manual-only (requires 2 auth sessions) |
| PROF-03 | Skills offered: min 1 for publish, max 5 entries | unit | `pnpm test tests/unit/profile-schema.test.ts` | ❌ Wave 0 |
| PROF-04 | Skills wanted: 0–5 entries allowed | unit | `pnpm test tests/unit/profile-schema.test.ts` | ❌ Wave 0 |
| PROF-05 | County typeahead shows all 159 counties | E2E | `pnpm e2e --grep "county typeahead"` | ❌ Wave 0 |
| PROF-09 | TikTok handle format validation `@username` | unit | `pnpm test tests/unit/profile-schema.test.ts` | ❌ Wave 0 |
| PROF-12 | Publish toggle disabled when incomplete | E2E | `pnpm e2e --grep "publish gate"` | ❌ Wave 0 |
| PROF-12 | Publish blocked server-side for incomplete profile | E2E | `pnpm e2e --grep "publish gate"` | ❌ Wave 0 |
| PROF-13 | Unpublished profile hidden at /m/[username] for other users | E2E | `pnpm e2e --grep "profile visibility"` | ❌ Wave 0 |
| PROF-14 | Published profile visible at /m/[username] for verified member | E2E | `pnpm e2e --grep "profile visibility"` | ❌ Wave 0 |
| PROF-14 | Banned profile returns 404/empty at /m/[username] | E2E | `pnpm e2e --grep "profile visibility"` | ❌ Wave 0 |
| D-07/D-08 | Auto-slug generation from display name | unit | `pnpm test tests/unit/slug-generation.test.ts` | ❌ Wave 0 |
| D-07/D-08 | Slug locked after first save | E2E | `pnpm e2e --grep "slug locked"` | ❌ Wave 0 |
| GEO-02 | All 159 counties in static JSON | unit | `pnpm test tests/unit/georgia-counties.test.ts` | ❌ Wave 0 |

### Sampling Rate
- **Per task commit:** `pnpm test` (unit suite, <10s)
- **Per wave merge:** `pnpm test && pnpm e2e` (full suite)
- **Phase gate:** Full suite green before `/gsd-verify-work`

### Wave 0 Gaps
- [ ] `tests/unit/profile-schema.test.ts` — covers PROF-01, PROF-03, PROF-04, PROF-09 Zod schema validation
- [ ] `tests/unit/slug-generation.test.ts` — covers D-07 slug logic (pure function, no DB needed)
- [ ] `tests/unit/avatar-validation.test.ts` — covers PROF-02 MIME + size client-side check
- [ ] `tests/unit/georgia-counties.test.ts` — covers GEO-02 static JSON has exactly 159 entries
- [ ] `tests/e2e/profile-edit.spec.ts` — covers PROF-12 publish gate UI
- [ ] `tests/e2e/profile-visibility.spec.ts` — covers PROF-13, PROF-14, D-09 auth gate
- [ ] `tests/e2e/county-typeahead.spec.ts` — covers PROF-05 typeahead renders 159 counties

---

## Security Domain

### Applicable ASVS Categories

| ASVS Category | Applies | Standard Control |
|---------------|---------|-----------------|
| V2 Authentication | no | Session already handled by Phase 2 middleware |
| V3 Session Management | no | Handled by `@supabase/ssr` (Phase 2) |
| V4 Access Control | yes | Supabase RLS (profile visibility + storage path scoping) |
| V5 Input Validation | yes | Zod schema on server action input; DB CHECK constraints for defense-in-depth |
| V6 Cryptography | no | Storage uses Supabase-managed encryption at rest |
| V13 API / File Upload | yes | MIME + size validation client-side; Storage RLS server-side; `upsert` path prevents new-path abuse |

### Known Threat Patterns

| Pattern | STRIDE | Standard Mitigation |
|---------|--------|---------------------|
| Path traversal on avatar upload | Tampering | Storage RLS `foldername(name)[1] = auth.uid()` — enforced at DB level |
| Publishing incomplete profile to appear in directory | Tampering | Server action completeness check + RLS `WITH CHECK` |
| Viewing another user's unpublished/banned profile | Information Disclosure | RLS SELECT policy: `is_published AND current_user_is_verified() AND NOT banned` |
| Editing another user's profile | Tampering | RLS UPDATE policy: `owner_id = auth.uid()` |
| Open redirect via `?next=` on auth callback | Tampering | Not introduced in Phase 3; existing middleware pattern handles this |
| Storing service-role key client-side | Elevation of Privilege | Avatar upload uses browser Supabase client with anon key + RLS, not service-role |
| SQL injection via display name or skills | Tampering | Parameterized queries via Supabase JS client; Zod validates string length/format |
| MIME type spoofing (upload non-image with image extension) | Tampering | Client validates `file.type`; Storage RLS does not check MIME — this is a client enforcement. For MVP, client check + 2MB size limit is sufficient. [ASSUMED] |

---

## Project Constraints (from CLAUDE.md)

| Directive | Enforcement Point |
|-----------|------------------|
| `getSession()` BANNED on all server paths | Use `getUser()` in server actions for user identity; `getClaims()` in middleware |
| `@supabase/auth-helpers-nextjs` BANNED | Not in `package.json`; do not add |
| TypeScript strict — no `any` types | `pnpm typecheck` in CI; profile action types must be explicit |
| Conventional commits: `feat(profile):`, `chore(profile):` etc. | All commits scoped to `profile` or `geo` domain |
| pnpm is the only package manager | `pnpm add` / `pnpm dlx`; never `npm install` |
| Storage Image Transformations are Pro-only | Use `browser-image-compression` on client; do not use Supabase transform URLs |
| Public repo secret hygiene | `SUPABASE_SERVICE_ROLE_KEY` never `NEXT_PUBLIC_`; storage upload uses anon key + RLS |
| `import 'server-only'` on line 1 of all server-only modules | `lib/actions/profile.ts` must have `'use server'` directive (server actions are inherently server-only) |
| `@/` path alias everywhere | No relative `../../` imports |
| `cn()` helper for conditional Tailwind | Not raw string concatenation |
| Comments reference requirement IDs | `// PROF-12`, `// GEO-01` etc. in migration and server action |

---

## Sources

### Primary (HIGH confidence)
- [VERIFIED: Context7 /websites/ui_shadcn] — Combobox (Command + Popover) pattern, Sonner toast, Form + RHF + Zod
- [VERIFIED: Context7 /websites/supabase] — Storage upload API, RLS `foldername` pattern, signed vs public URL, RLS policy examples
- [VERIFIED: supabase/migrations/002_auth_tables.sql lines 63–74] — `current_user_is_verified()` function confirmed installed
- [VERIFIED: package.json] — all currently installed package versions
- [VERIFIED: npm registry] — `browser-image-compression@2.0.2`, `sonner@2.0.7`, `react-hook-form@7.72.1`, `zod@4.3.6`
- [VERIFIED: lib/supabase/middleware.ts] — `VERIFIED_REQUIRED_PREFIXES` already covers `/profile` and `/m/`
- [CITED: https://supabase.com/docs/guides/storage/security/access-control] — `storage.foldername(name)[1] = auth.uid()::text` anti-traversal pattern

### Secondary (MEDIUM confidence)
- [CITED: Phase 2 RESEARCH.md + PATTERNS.md] — server action module pattern, three-client factory, RHF + Zod form structure

### Tertiary (LOW confidence / ASSUMED)
- `browser-image-compression` options syntax (fileType, maxSizeMB, maxWidthOrHeight) — from package README/training; verify at implementation
- Bucket creation cannot be done via SQL migration — verify with Supabase CLI docs at implementation
- tsvector generated column limitation re: child table data — verify Postgres 14+ behavior at migration time

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — all libraries already installed and version-verified
- Schema design: HIGH — follows Supabase RLS patterns verified from docs
- Storage RLS pattern: HIGH — verified against Supabase docs (foldername function)
- Architecture: HIGH — extends proven Phase 2 patterns (server actions, route groups, three-client factory)
- Pitfalls: MEDIUM/HIGH — most from pattern knowledge + one verified (storage RLS)
- tsvector + FTS column design: MEDIUM — Phase 4 dependency not fully designed; note left in Open Questions

**Research date:** 2026-04-20
**Valid until:** 2026-05-20 (stable stack; Supabase Storage patterns rarely change)
