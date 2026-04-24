# Phase 3: Profile & Georgia Gate — Pattern Map

**Mapped:** 2026-04-20
**Files analyzed:** 22 new + 2 modified = 24
**Analogs found:** 21 / 24

> Phase 2 has fully landed. All patterns below reference *real, committed* codebase files (not hypothetical Phase 2 outputs). The cwd is `/Users/ashleyakbar/barterkin`. All paths are relative to that root unless noted otherwise.

---

## File Classification

| New/Modified File | Role | Data Flow | Closest Analog | Match Quality |
|---|---|---|---|---|
| `app/(app)/layout.tsx` | layout (server component) | request-response | `app/(auth)/layout.tsx` | exact |
| `app/(app)/profile/edit/page.tsx` | page (server component, RSC data fetch) | request-response | `app/verify-pending/page.tsx` | role-match |
| `app/(app)/profile/page.tsx` | page (server component, RSC data fetch) | request-response | `app/verify-pending/page.tsx` | role-match |
| `app/(app)/m/[username]/page.tsx` | page (server component, dynamic route) | request-response | `app/verify-pending/page.tsx` | role-match |
| `components/profile/ProfileEditForm.tsx` | client component (large form) | event-driven (RHF → server action) | `components/auth/LoginForm.tsx` | exact |
| `components/profile/SkillRowList.tsx` | client component (dynamic list input) | event-driven | `components/auth/LoginForm.tsx` | partial (client component, no direct analog for dynamic rows) |
| `components/profile/CountyCombobox.tsx` | client component (searchable select) | event-driven | `components/auth/LoginForm.tsx` | partial (client component; combobox is new pattern) |
| `components/profile/AvatarUpload.tsx` | client component (file upload) | file-I/O | `components/auth/GoogleButton.tsx` | partial (client component + Supabase browser client) |
| `components/profile/PublishToggle.tsx` | client component (toggle with gate) | event-driven | `components/auth/LogoutButton.tsx` | partial (button → server action) |
| `components/profile/ProfileCard.tsx` | server component (display) | request-response | `app/verify-pending/page.tsx` | role-match (server RSC display card) |
| `lib/actions/profile.ts` | server actions module | request-response (form → server → Supabase Postgres) | `lib/actions/auth.ts` | exact |
| `lib/data/georgia-counties.json` | static data (JSON) | — | none | no analog |
| `lib/data/categories.ts` | static data (typed constant) | — | none | no analog |
| `supabase/migrations/003_profile_tables.sql` | migration (DDL) | batch | `supabase/migrations/002_auth_tables.sql` | exact |
| `tests/unit/profile-schema.test.ts` | unit test (Zod schema) | batch | `tests/unit/magic-link-schema.test.ts` | exact |
| `tests/unit/slug-generation.test.ts` | unit test (pure function) | batch | `tests/unit/magic-link-schema.test.ts` | role-match |
| `tests/unit/avatar-validation.test.ts` | unit test (validation logic) | batch | `tests/unit/magic-link-schema.test.ts` | role-match |
| `tests/unit/georgia-counties.test.ts` | unit test (data integrity) | batch | `tests/unit/smoke.test.ts` | role-match |
| `tests/e2e/profile-edit.spec.ts` | E2E test | event-driven | `tests/e2e/login-magic-link.spec.ts` | exact |
| `tests/e2e/profile-visibility.spec.ts` | E2E test | event-driven | `tests/e2e/login-magic-link.spec.ts` | role-match |
| `tests/e2e/county-typeahead.spec.ts` | E2E test | event-driven | `tests/e2e/login-magic-link.spec.ts` | role-match |
| **MODIFIED** `middleware.ts` / `lib/supabase/middleware.ts` | middleware | request-response | self (Phase 2, already covers `/profile` and `/m/` in `VERIFIED_REQUIRED_PREFIXES`) | self-extend (no code change needed — prefixes already installed) |

---

## Pattern Assignments

### `app/(app)/layout.tsx` (layout, server component)

**Analog:** `app/(auth)/layout.tsx`

**Full file** (lines 1–13 of analog):
```tsx
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: { default: 'Sign in — Barterkin', template: '%s — Barterkin' },
}

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <main className="min-h-screen flex items-center justify-center py-16 px-6 bg-sage-bg">
      {children}
    </main>
  )
}
```

**Phase 3 adaptation:**
- Change `metadata.title.default` to `'Barterkin'` (app shell, no sign-in copy)
- The `(app)` layout renders an authenticated nav header above `{children}` (not just a centered `<main>`)
- No `<html>` or `<body>` tags — root layout owns those (same rule as `(auth)/layout.tsx`)
- Nav header should show the user's display name (use `supabase.auth.getClaims()` — never `getSession()`)

```tsx
import type { Metadata } from 'next'
import { createClient } from '@/lib/supabase/server'

export const metadata: Metadata = {
  title: { default: 'Barterkin', template: '%s — Barterkin' },
}

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient()
  const { data } = await supabase.auth.getClaims()
  const claims = data?.claims
  // render nav header with claims?.sub / claims?.email
  return (
    <>
      {/* nav header */}
      {children}
    </>
  )
}
```

---

### `app/(app)/profile/edit/page.tsx` (page, server component)

**Analog:** `app/verify-pending/page.tsx`

**Server data-fetch + client component hand-off pattern** (lines 1–17 of analog):
```tsx
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { createClient } from '@/lib/supabase/server'
import { LogoutButton } from '@/components/auth/LogoutButton'
import { ResendLinkButton } from '@/components/auth/ResendLinkButton'

export const metadata = { title: 'Verify your email — Barterkin' }

export default async function VerifyPendingPage() {
  const supabase = await createClient()
  const { data } = await supabase.auth.getClaims()
  const realEmail = (data?.claims?.email as string | undefined) ?? null
  // ...
  return (
    <main className="min-h-screen flex items-center justify-center py-16 px-6 bg-sage-bg">
      <Card className="max-w-[480px] w-full bg-sage-pale border-sage-light">
```

**Phase 3 adaptation:**

Server component fetches the user's existing profile data (including skills), then passes it as `defaultValues` prop to `<ProfileEditForm>`. This addresses RESEARCH Pitfall 6 (empty form on existing profile).

```tsx
import { createClient } from '@/lib/supabase/server'
import { ProfileEditForm } from '@/components/profile/ProfileEditForm'
import { redirect } from 'next/navigation'

export const metadata = { title: 'Edit profile' }

export default async function ProfileEditPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()  // getUser() in server action; getClaims() for display-only
  if (!user) redirect('/login')

  // Fetch existing profile + skills (RLS allows owner to see own unpublished profile)
  const { data: profile } = await supabase
    .from('profiles')
    .select('*, skills_offered(*), skills_wanted(*)')
    .eq('owner_id', user.id)
    .maybeSingle()

  return <ProfileEditForm userId={user.id} defaultValues={profile ?? null} />
}
```

**Key rule:** Pass existing profile as `defaultValues` prop — not via `useEffect` or client-side fetch. This is the Pitfall 6 fix.

---

### `app/(app)/profile/page.tsx` (page, server component — own profile view)

**Analog:** `app/verify-pending/page.tsx` (server component with `createClient()` + display card)

**Pattern:**
```tsx
import { createClient } from '@/lib/supabase/server'
import { ProfileCard } from '@/components/profile/ProfileCard'
import { PublishToggle } from '@/components/profile/PublishToggle'
import { redirect } from 'next/navigation'

export const metadata = { title: 'My profile' }

export default async function OwnProfilePage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('*, skills_offered(*), skills_wanted(*), counties(name), categories(name)')
    .eq('owner_id', user.id)
    .maybeSingle()

  return (
    <main>
      <ProfileCard profile={profile} />
      {profile && <PublishToggle profileId={profile.id} isPublished={profile.is_published} />}
    </main>
  )
}
```

---

### `app/(app)/m/[username]/page.tsx` (page, dynamic route, server component)

**Analog:** `app/verify-pending/page.tsx` (server component + `createClient()`) — adapted for dynamic segment

**Dynamic route + RLS-filtered query pattern:**
```tsx
import { createClient } from '@/lib/supabase/server'
import { ProfileCard } from '@/components/profile/ProfileCard'
import { notFound } from 'next/navigation'

// PROF-14, D-09: auth-gated (middleware covers /m/ prefix via VERIFIED_REQUIRED_PREFIXES)
export default async function MemberProfilePage({
  params,
}: {
  params: Promise<{ username: string }>
}) {
  const { username } = await params
  const supabase = await createClient()

  // RLS SELECT policy: is_published AND current_user_is_verified() AND NOT banned
  // Own profile visible to owner regardless of is_published (RLS covers this)
  const { data: profile } = await supabase
    .from('profiles')
    .select('*, skills_offered(*), skills_wanted(*), counties(name), categories(name)')
    .eq('username', username)
    .maybeSingle()

  if (!profile) notFound()

  return <ProfileCard profile={profile} />
}
```

**Note:** No explicit auth check needed here — middleware already redirects unauthenticated/unverified users before this page runs (`VERIFIED_REQUIRED_PREFIXES` in `lib/supabase/middleware.ts` line 11 already includes `/m/`).

---

### `components/profile/ProfileEditForm.tsx` (client component, large RHF form)

**Analog:** `components/auth/LoginForm.tsx`

**Imports + client boundary + `useActionState` pattern** (lines 1–20 of analog):
```tsx
'use client'

import { useActionState, useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { AlertCircle } from 'lucide-react'
import { sendMagicLink, type SendMagicLinkResult } from '@/lib/actions/auth'
```

**Phase 3 adaptation — imports:**
```tsx
'use client'

import { useActionState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import {
  Form, FormControl, FormField, FormItem, FormLabel, FormMessage,
} from '@/components/ui/form'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { AlertCircle } from 'lucide-react'
import { toast } from 'sonner'
import { saveProfile, type SaveProfileResult } from '@/lib/actions/profile'
import { SkillRowList } from '@/components/profile/SkillRowList'
import { CountyCombobox } from '@/components/profile/CountyCombobox'
import { AvatarUpload } from '@/components/profile/AvatarUpload'
import type { ProfileWithRelations } from '@/lib/actions/profile'
```

**`useActionState` + RHF + `defaultValues` pattern** (analog lines 27–35):
```tsx
export function LoginForm({ captchaToken }: { captchaToken: string | null }) {
  const [state, formAction, pending] = useActionState<SendMagicLinkResult | null, FormData>(
    sendMagicLink,
    null,
  )
  const form = useForm<LoginValues>({
    resolver: zodResolver(LoginSchema),
    defaultValues: { email: '' },
  })
```

**Phase 3 adaptation — form init with server-fetched defaultValues (Pitfall 6 fix):**
```tsx
export function ProfileEditForm({
  userId,
  defaultValues,
}: {
  userId: string
  defaultValues: ProfileWithRelations | null
}) {
  const [state, formAction, pending] = useActionState<SaveProfileResult | null, FormData>(
    saveProfile,
    null,
  )
  const form = useForm<ProfileFormValues>({
    resolver: zodResolver(ProfileFormSchema),
    defaultValues: {
      displayName: defaultValues?.display_name ?? '',
      bio: defaultValues?.bio ?? '',
      skillsOffered: defaultValues?.skills_offered?.map(s => s.skill_text) ?? [''],
      skillsWanted: defaultValues?.skills_wanted?.map(s => s.skill_text) ?? [''],
      countyId: defaultValues?.county_id ?? null,
      categoryId: defaultValues?.category_id ?? null,
      availability: defaultValues?.availability ?? '',
      acceptingContact: defaultValues?.accepting_contact ?? true,
      tiktokHandle: defaultValues?.tiktok_handle ?? '',
    },
  })
```

**Success toast pattern** (analog lines 44–57 show a success state; Phase 3 uses toast instead of inline replacement):
```tsx
// D-04: stay on page, show toast — no redirect
import { useEffect } from 'react'

useEffect(() => {
  if (state?.ok) toast('Profile saved.')  // D-04: plain copy, no emoji
}, [state])
```

**Error display pattern** (analog lines 67–72):
```tsx
{state && !state.ok && state.error && (
  <Alert variant="destructive">
    <AlertCircle className="h-4 w-4" />
    <AlertDescription>{state.error}</AlertDescription>
  </Alert>
)}
```

**Form submit pattern** (analog lines 62–65):
```tsx
<form
  action={(formData: FormData) => {
    formAction(formData)
  }}
  className="space-y-6"
>
```

**Save button** (analog lines 96–103):
```tsx
<Button
  type="submit"
  size="lg"
  className="w-full"
  disabled={pending}
>
  {pending ? 'Saving…' : 'Save'}
</Button>
```

---

### `components/profile/SkillRowList.tsx` (client component, dynamic list input)

**Analog:** `components/auth/LoginForm.tsx` (client component shape + RHF `useFormContext`)

**No direct analog** — the dynamic-row pattern (add/remove rows up to a cap) is new. Use RHF `useFieldArray` which integrates with the existing `react-hook-form` install.

**Client boundary + `useFieldArray` pattern:**
```tsx
'use client'

import { useFieldArray, useFormContext } from 'react-hook-form'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { X } from 'lucide-react'
import type { ProfileFormValues } from '@/lib/actions/profile'

export function SkillRowList({
  fieldName,        // 'skillsOffered' | 'skillsWanted'
  label,            // 'Skills I Offer' | 'Skills I Want'
  maxRows = 5,
}: {
  fieldName: 'skillsOffered' | 'skillsWanted'
  label: string
  maxRows?: number
}) {
  const { control, register } = useFormContext<ProfileFormValues>()
  const { fields, append, remove } = useFieldArray({ control, name: fieldName })

  return (
    <div className="space-y-2">
      <p className="text-sm font-medium">{label}</p>
      {fields.map((field, index) => (
        <div key={field.id} className="flex gap-2">
          <Input
            {...register(`${fieldName}.${index}` as const)}
            placeholder="e.g. Woodworking, web design…"
            maxLength={60}
          />
          {fields.length > 1 && (
            <Button
              type="button"
              variant="ghost"
              size="icon"
              onClick={() => remove(index)}
              aria-label="Remove skill"
            >
              <X className="h-4 w-4" />
            </Button>
          )}
        </div>
      ))}
      {fields.length < maxRows && (
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => append('')}
        >
          + Add skill
        </Button>
      )}
    </div>
  )
}
```

---

### `components/profile/CountyCombobox.tsx` (client component, shadcn Combobox)

**Analog:** `components/auth/LoginForm.tsx` (client component shape + `cn()` utility)

**No direct analog for the Combobox pattern** — it is the first use of `Command + Popover` in this repo. Copy verbatim from RESEARCH.md Pattern 3 (lines 312–367 of `03-RESEARCH.md`) which is derived from the verified shadcn Combobox docs.

**Imports pattern** (adapts from LoginForm's shadcn imports, analog line 7–14):
```tsx
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
```

**Core Combobox pattern** (RESEARCH.md Pattern 3, confirmed from shadcn docs):
```tsx
export function CountyCombobox({
  value,
  onChange,
}: {
  value: number | null
  onChange: (fips: number) => void
}) {
  const [open, setOpen] = React.useState(false)
  const selected = georgiaCounties.find(c => c.fips === value)

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="outline" role="combobox" aria-expanded={open} className="w-full justify-between">
          {selected?.name ?? 'Select county…'}
          <ChevronsUpDown className="ml-auto opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[300px] p-0">
        <Command>
          <CommandInput placeholder="Search Georgia counties…" />
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

---

### `components/profile/AvatarUpload.tsx` (client component, file upload)

**Analog:** `components/auth/GoogleButton.tsx` — both are client components that call `createClient()` from `@/lib/supabase/client` inside an event handler.

**Client Supabase browser client pattern** (analog `GoogleButton.tsx` uses `createClient` inside async handler — same pattern as `lib/supabase/client.ts` lines 1–8):
```tsx
'use client'
import { createClient } from '@/lib/supabase/client'
// ...
async function handleUpload(file: File) {
  const supabase = createClient()  // called inside handler, not at module scope
  await supabase.storage.from('avatars').upload(...)
}
```

**Full pattern** (RESEARCH.md Pattern 2, lines 270–308):
```tsx
'use client'

import { useState } from 'react'
import imageCompression from 'browser-image-compression'
import { createClient } from '@/lib/supabase/client'

const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp']

async function compressAndUpload(file: File, userId: string): Promise<string> {
  // PROF-02: MIME + size client validation
  if (!ALLOWED_TYPES.includes(file.type)) throw new Error('Only JPG, PNG, and WebP allowed.')
  if (file.size > 2 * 1024 * 1024) throw new Error('File must be under 2MB.')

  // Claude's Discretion: client-side resize
  const compressed = await imageCompression(file, {
    maxSizeMB: 0.5,
    maxWidthOrHeight: 1080,
    useWebWorker: true,
    fileType: 'image/jpeg',
  })

  // Upload to Supabase Storage (browser client + RLS blocks path traversal)
  const supabase = createClient()
  const path = `${userId}/avatar.jpg`
  const { error } = await supabase.storage
    .from('avatars')
    .upload(path, compressed, {
      cacheControl: '3600',
      upsert: true,   // overwrite on update — no delete step needed
      contentType: 'image/jpeg',
    })
  if (error) throw error

  // Public bucket — no expiry, no round-trip (RESEARCH State of the Art)
  const { data } = supabase.storage.from('avatars').getPublicUrl(path)
  return data.publicUrl + `?t=${Date.now()}`  // cache-bust for re-uploads (Pitfall 7)
}
```

---

### `components/profile/PublishToggle.tsx` (client component, toggle with gate)

**Analog:** `components/auth/LogoutButton.tsx` — a simple component that POSTs to a server action.

**LogoutButton pattern** (lines 1–26):
```tsx
import { Button } from '@/components/ui/button'
import { LogOut } from 'lucide-react'

export function LogoutButton() {
  return (
    <form action="/auth/signout" method="POST" className="inline-block">
      <Button type="submit" variant="ghost" size="sm" ...>
        Log out
      </Button>
    </form>
  )
}
```

**Phase 3 adaptation:** `PublishToggle` is a `'use client'` component (needs `useActionState` for completeness-error display and disabled state logic). It calls `setPublished` server action.

```tsx
'use client'

import { useActionState } from 'react'
import { Button } from '@/components/ui/button'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { setPublished, type SetPublishedResult } from '@/lib/actions/profile'

export function PublishToggle({
  profileId,
  isPublished,
}: {
  profileId: string
  isPublished: boolean
}) {
  const [state, formAction, pending] = useActionState<SetPublishedResult | null, FormData>(
    setPublished,
    null,
  )

  return (
    <div className="space-y-2">
      {state && !state.ok && state.error && (
        <Alert variant="destructive">
          <AlertDescription>{state.error}</AlertDescription>
        </Alert>
      )}
      <form action={formAction}>
        <input type="hidden" name="profileId" value={profileId} />
        <input type="hidden" name="publish" value={isPublished ? 'false' : 'true'} />
        <Button type="submit" disabled={pending}>
          {isPublished ? 'Unpublish' : 'Publish profile'}
        </Button>
      </form>
    </div>
  )
}
```

---

### `components/profile/ProfileCard.tsx` (server component, display)

**Analog:** `app/verify-pending/page.tsx` (server component composing shadcn Card + data display)

**Server component display pattern** (analog lines 1–58 — Card + CardHeader + CardContent):
```tsx
import { Card, CardContent, CardHeader } from '@/components/ui/card'
// ...
export default async function VerifyPendingPage() {
  // ...
  return (
    <main className="...">
      <Card className="max-w-[480px] w-full bg-sage-pale border-sage-light">
        <CardHeader className="space-y-6">
          <h1 className="font-serif text-3xl md:text-[32px] font-bold leading-[1.15]">...</h1>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-base leading-[1.5]">...</p>
        </CardContent>
      </Card>
    </main>
  )
}
```

**Phase 3 adaptation — ProfileCard is a server component (not a page) that can be imported by pages:**
```tsx
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar'
import type { ProfileWithRelations } from '@/lib/actions/profile'

export function ProfileCard({ profile }: { profile: ProfileWithRelations }) {
  return (
    <Card className="bg-sage-pale border-sage-light">
      <CardHeader className="flex flex-row items-center gap-4">
        <Avatar>
          <AvatarImage src={profile.avatar_url ?? undefined} alt={profile.display_name ?? ''} />
          <AvatarFallback>{(profile.display_name ?? '?')[0].toUpperCase()}</AvatarFallback>
        </Avatar>
        <div>
          <h1 className="font-serif text-2xl font-bold leading-[1.2]">{profile.display_name}</h1>
          {/* county + category badges */}
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {profile.bio && <p className="text-base leading-[1.5]">{profile.bio}</p>}
        {/* skills offered + wanted lists */}
      </CardContent>
    </Card>
  )
}
```

---

### `lib/actions/profile.ts` (server actions module)

**Analog:** `lib/actions/auth.ts` — the closest exact match in the codebase. Copy the entire structure.

**Directive + imports pattern** (analog lines 1–8):
```ts
'use server'

import { headers } from 'next/headers'
import { z } from 'zod'
import { createClient } from '@/lib/supabase/server'
import { isDisposableEmail } from '@/lib/utils/disposable-email'
import { checkSignupRateLimit } from '@/lib/utils/rate-limit'
```

**Phase 3 imports:**
```ts
'use server'

import { z } from 'zod'
import { createClient } from '@/lib/supabase/server'
```

**Result type + schema pattern** (analog lines 9–17):
```ts
export const MagicLinkSchema = z.object({
  email: z.string().trim().toLowerCase().email(),
  captchaToken: z.string().min(1).max(2048),
})

export interface SendMagicLinkResult {
  ok: boolean
  error?: string
}
```

**Phase 3 adaptation — ProfileSchema and result types:**
```ts
export const ProfileFormSchema = z.object({
  displayName: z.string().min(1).max(60),
  bio: z.string().max(500).optional(),
  avatarUrl: z.string().url().optional().or(z.literal('')),
  skillsOffered: z.array(z.string().min(1).max(60)).min(0).max(5),
  skillsWanted: z.array(z.string().min(1).max(60)).min(0).max(5),
  countyId: z.number().int().positive(),
  categoryId: z.number().int().positive(),
  availability: z.string().max(200).optional(),
  acceptingContact: z.boolean().default(true),
  tiktokHandle: z.string().regex(/^@[a-zA-Z0-9_.]{1,24}$/).optional().or(z.literal('')),
})

export interface SaveProfileResult {
  ok: boolean
  error?: string
}

export interface SetPublishedResult {
  ok: boolean
  error?: string
}
```

**`getUser()` auth check pattern** (analog lines 32–44 — exact pattern to copy):
```ts
export async function sendMagicLink(
  _prevState: SendMagicLinkResult | null,
  formData: FormData,
): Promise<SendMagicLinkResult> {
  const parsed = MagicLinkSchema.safeParse({
    email: formData.get('email'),
    captchaToken: formData.get('cf-turnstile-response'),
  })
  if (!parsed.success) {
    return { ok: false, error: 'Please enter a valid email.' }
  }
```

**Phase 3 `saveProfile` auth-then-validate pattern:**
```ts
export async function saveProfile(
  _prevState: SaveProfileResult | null,
  formData: FormData,
): Promise<SaveProfileResult> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()  // PROF: always getUser() for DML (never getSession())
  if (!user) return { ok: false, error: 'Not authenticated.' }

  const parsed = ProfileFormSchema.safeParse(
    Object.fromEntries(formData)  // adapt FormData → object before safeParse
  )
  if (!parsed.success) {
    return { ok: false, error: 'Please fix the highlighted fields.' }
  }

  // Upsert profile, replace skills rows, generate slug on first save
  // See RESEARCH.md Patterns 1, 4, 5 for full implementation
}
```

**Error logging pattern** (analog lines 78–85 — never log PII):
```ts
console.error('[sendMagicLink] signInWithOtp failed', {
  code: error.code,
  status: error.status,
  // deliberately NOT logging error.message or email — may contain PII
})
```

Phase 3 pattern for DB errors:
```ts
console.error('[saveProfile] upsert failed', {
  code: error.code,
  // NOT logging error.details — may contain field values (PII)
})
return { ok: false, error: 'Something went wrong. Please try again.' }
```

---

### `supabase/migrations/003_profile_tables.sql` (migration, DDL)

**Analog:** `supabase/migrations/002_auth_tables.sql`

**File header + requirement-ID comment pattern** (analog lines 1–4):
```sql
-- Phase 2 — Authentication & Legal
-- Requirements: AUTH-04 (email-verify helper), AUTH-06 (per-IP rate limit), AUTH-07 (disposable-email trigger)
-- See: .planning/phases/02-authentication-legal/02-RESEARCH.md Pattern 5
```

**Phase 3 header:**
```sql
-- Phase 3 — Profile & Georgia Gate
-- Requirements: PROF-01 through PROF-14, GEO-01, GEO-02
-- See: .planning/phases/03-profile-georgia-gate/03-RESEARCH.md Schema section
```

**`enable row level security` immediately after CREATE TABLE** (analog line 17 pattern — every table):
```sql
create table public.signup_attempts ( ... );
alter table public.signup_attempts enable row level security;
-- RLS enabled with ZERO policies: only SECURITY DEFINER functions can mutate.
```

**SECURITY DEFINER function pattern** (analog lines 23–43 — set search_path, exact shape):
```sql
create or replace function public.set_updated_at()
returns trigger language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;
```

**RLS policy pattern** (analog lines 63–76 — `current_user_is_verified()` reference):
```sql
create policy "Published verified un-banned profiles visible to verified members"
on public.profiles
for select
to authenticated
using (
  owner_id = auth.uid()
  OR (
    is_published = true
    AND public.current_user_is_verified()  -- PROF-13: viewer must be verified
    AND banned = false
  )
);
```

Full schema: see RESEARCH.md `## Database Schema` section (lines 551–647 of `03-RESEARCH.md`) — copy verbatim, including the `counties`, `categories`, `profiles`, `skills_offered`, `skills_wanted` table definitions, the `set_updated_at` trigger, the GIN index, and all RLS policies.

---

### `tests/unit/profile-schema.test.ts` (unit test, Zod schema)

**Analog:** `tests/unit/magic-link-schema.test.ts` — exact match (Zod schema unit tests)

**Full analog** (lines 1–59):
```ts
import { describe, it, expect } from 'vitest'
import { MagicLinkSchema } from '@/lib/actions/auth'

describe('MagicLinkSchema (AUTH-02)', () => {
  it('accepts valid email + captchaToken', () => {
    const result = MagicLinkSchema.safeParse({
      email: 'user@example.com',
      captchaToken: 'some-turnstile-token',
    })
    expect(result.success).toBe(true)
  })

  it('rejects missing email', () => { ... })
  it('rejects malformed email (no @)', () => { ... })
  it('rejects empty captchaToken', () => { ... })
  it('lowercases email after parse', () => { ... })
  it('trims whitespace from email', () => { ... })
})
```

**Phase 3 adaptation:**
```ts
import { describe, it, expect } from 'vitest'
import { ProfileFormSchema } from '@/lib/actions/profile'

describe('ProfileFormSchema (PROF-01, PROF-03, PROF-04, PROF-09)', () => {
  it('accepts valid complete profile', () => { ... })
  it('rejects displayName > 60 chars (PROF-01)', () => { ... })
  it('rejects skillsOffered > 5 items (PROF-03)', () => { ... })
  it('allows 0 skillsWanted (PROF-04)', () => { ... })
  it('rejects tiktokHandle without @ prefix (PROF-09)', () => { ... })
  it('accepts empty tiktokHandle (optional, PROF-09)', () => { ... })
  it('rejects bio > 500 chars (PROF-01)', () => { ... })
})
```

---

### `tests/unit/slug-generation.test.ts` (unit test, pure function)

**Analog:** `tests/unit/magic-link-schema.test.ts` (pure function test structure)

**Test structure pattern** (analog lines 1–4 + describe/it shape):
```ts
import { describe, it, expect } from 'vitest'
import { generateSlug } from '@/lib/actions/profile'  // exported pure fn

describe('generateSlug (D-07)', () => {
  it('lowercases and slugifies "Kerry Smith" to "kerry-smith"', () => {
    expect(generateSlug('Kerry Smith')).toBe('kerry-smith')
  })
  it('strips leading/trailing hyphens', () => { ... })
  it('truncates to 40 chars', () => { ... })
  it('handles special characters', () => { ... })
})
```

---

### `tests/unit/avatar-validation.test.ts` (unit test, validation logic)

**Analog:** `tests/unit/magic-link-schema.test.ts`

```ts
import { describe, it, expect } from 'vitest'
// import the validation logic extracted from AvatarUpload.tsx

describe('avatar upload validation (PROF-02)', () => {
  it.todo('rejects file over 2MB')
  it.todo('rejects non-image MIME type (e.g. application/pdf)')
  it.todo('accepts image/jpeg')
  it.todo('accepts image/png')
  it.todo('accepts image/webp')
})
```

---

### `tests/unit/georgia-counties.test.ts` (unit test, data integrity)

**Analog:** `tests/unit/smoke.test.ts` (simple data assertion)

```ts
import { describe, it, expect } from 'vitest'
import georgiaCounties from '@/lib/data/georgia-counties.json'

describe('georgia-counties.json (GEO-02)', () => {
  it('has exactly 159 entries', () => {
    expect(georgiaCounties).toHaveLength(159)
  })
  it('each entry has fips (number) and name (string)', () => {
    for (const county of georgiaCounties) {
      expect(typeof county.fips).toBe('number')
      expect(typeof county.name).toBe('string')
    }
  })
  it('FIPS codes are unique', () => {
    const fips = georgiaCounties.map(c => c.fips)
    expect(new Set(fips).size).toBe(159)
  })
})
```

---

### `tests/e2e/profile-edit.spec.ts` (E2E test)

**Analog:** `tests/e2e/login-magic-link.spec.ts` — exact pattern.

**Full analog** (lines 1–29):
```ts
import { test, expect } from '@playwright/test'

test.describe('login — magic link (AUTH-02)', () => {
  test('email input renders on /login', async ({ page }) => {
    await page.goto('/login')
    await expect(page.getByLabel('Email address')).toBeVisible()
  })
  test.fixme('after valid submit, shows "Check your email" confirmation', async () => {
    // Needs: Turnstile test mode + mocked sendMagicLink response
  })
})
```

**Phase 3 adaptation:**
```ts
import { test, expect } from '@playwright/test'

test.describe('profile editor (PROF-01..PROF-12, D-01..D-04)', () => {
  // These tests require an authenticated + verified session — use Playwright storageState
  test.fixme('renders all 4 form sections (Basic Info, Skills, Location, Preferences)', async () => {})
  test.fixme('publish toggle is disabled when profile is incomplete (PROF-12)', async () => {})
  test.fixme('clicking disabled publish toggle shows missing fields checklist', async () => {})
  test.fixme('save shows "Profile saved." toast (D-04)', async () => {})
  test.fixme('+ Add skill button adds a row up to 5, then disables (D-05)', async () => {})
})
```

---

### `tests/e2e/profile-visibility.spec.ts` (E2E test)

**Analog:** `tests/e2e/login-magic-link.spec.ts`

```ts
import { test, expect } from '@playwright/test'

test.describe('profile visibility RLS (PROF-13, PROF-14, D-09)', () => {
  test.fixme('/m/[username] redirects unauthenticated visitor to /login', async ({ page }) => {
    await page.goto('/m/some-user')
    await expect(page).toHaveURL(/\/login/)
  })
  test.fixme('/m/[username] returns 404 for unpublished profile (PROF-13)', async () => {})
  test.fixme('/m/[username] returns 404 for banned profile (PROF-13)', async () => {})
  test.fixme('published profile visible to verified member (PROF-14)', async () => {})
})
```

---

### `tests/e2e/county-typeahead.spec.ts` (E2E test)

**Analog:** `tests/e2e/login-magic-link.spec.ts`

```ts
import { test, expect } from '@playwright/test'

test.describe('county typeahead (PROF-05, GEO-02)', () => {
  test.fixme('combobox renders on /profile/edit', async () => {})
  test.fixme('typing "Appling" filters to Appling County', async () => {})
  test.fixme('selecting a county closes the popover and shows the county name', async () => {})
})
```

---

### MODIFIED: `middleware.ts` + `lib/supabase/middleware.ts`

**Analog:** self — already done in Phase 2. No code change required for Phase 3.

**Verification** — `lib/supabase/middleware.ts` line 11 already has:
```ts
const VERIFIED_REQUIRED_PREFIXES = ['/directory', '/m/', '/profile']
```

Both `/m/` and `/profile` are already in `VERIFIED_REQUIRED_PREFIXES`. The middleware already gates these routes correctly for Phase 3. No edits needed.

---

## Shared Patterns

### Supabase Server Client (all server actions + RSC pages)

**Source:** `lib/supabase/server.ts` (lines 1–27)
**Apply to:** `lib/actions/profile.ts`, `app/(app)/layout.tsx`, `app/(app)/profile/edit/page.tsx`, `app/(app)/profile/page.tsx`, `app/(app)/m/[username]/page.tsx`, `components/profile/ProfileCard.tsx`

```ts
import 'server-only'
import { cookies } from 'next/headers'
import { createServerClient } from '@supabase/ssr'
import type { Database } from '@/lib/database.types'

export const createClient = async () => {
  const cookieStore = await cookies()
  return createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    {
      cookies: {
        getAll: () => cookieStore.getAll(),
        setAll: (toSet) => {
          try {
            toSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options),
            )
          } catch {
            // Called from a Server Component — cookies can't be set here.
          }
        },
      },
    },
  )
}
```

Usage: `const supabase = await createClient()` — always `await` (factory is async in Next 16).

---

### Supabase Browser Client (avatar upload only)

**Source:** `lib/supabase/client.ts` (lines 1–8)
**Apply to:** `components/profile/AvatarUpload.tsx` only (never use browser client in server actions or route handlers)

```ts
import { createBrowserClient } from '@supabase/ssr'
import type { Database } from '@/lib/database.types'

export const createClient = () =>
  createBrowserClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
  )
```

Call inside the upload handler (not at module scope).

---

### `getUser()` in Server Actions for DML

**Source:** `lib/actions/auth.ts` lines 35–44 + CLAUDE.md constraint + RESEARCH Pitfall 4
**Apply to:** `lib/actions/profile.ts` (`saveProfile`, `setPublished`)

```ts
const supabase = await createClient()
const { data: { user } } = await supabase.auth.getUser()
if (!user) return { ok: false, error: 'Not authenticated.' }
```

`getClaims()` is used for display-only (layout, footer). `getUser()` is required before any INSERT/UPDATE in server actions — it revalidates the session against Supabase Auth, making it safe for trust decisions on DML.

---

### `getClaims()` for Layout / Display-Only Auth State

**Source:** `lib/supabase/middleware.ts` line 45, `components/layout/Footer.tsx` lines 13–16
**Apply to:** `app/(app)/layout.tsx` (nav header auth state), any RSC that only reads auth state for display

```ts
const supabase = await createClient()
const { data } = await supabase.auth.getClaims()
const claims = data?.claims
const isAuthed = !!claims?.sub
```

Never use `getSession()` — banned per CLAUDE.md.

---

### Server Action Return Type (discriminated union)

**Source:** `lib/actions/auth.ts` lines 14–17, 41–43
**Apply to:** all server actions in `lib/actions/profile.ts`

```ts
export interface SaveProfileResult {
  ok: boolean
  error?: string
}

// On failure:
return { ok: false, error: 'User-friendly message. (UI-SPEC-locked copy)' }

// On success:
return { ok: true }
```

Never `throw` from a server action — React 19 `useActionState` expects a return value.

---

### Zod Schema Pattern (server action validation)

**Source:** `lib/actions/auth.ts` lines 9–12, 37–43
**Apply to:** `lib/actions/profile.ts`

```ts
export const MagicLinkSchema = z.object({
  email: z.string().trim().toLowerCase().email(),
  captchaToken: z.string().min(1).max(2048),
})

const parsed = MagicLinkSchema.safeParse({
  email: formData.get('email'),
  captchaToken: formData.get('cf-turnstile-response'),
})
if (!parsed.success) {
  return { ok: false, error: 'Please enter a valid email.' }
}
const { email, captchaToken } = parsed.data
```

---

### Error Logging (never log PII)

**Source:** `lib/actions/auth.ts` lines 78–85
**Apply to:** `lib/actions/profile.ts`

```ts
console.error('[saveProfile] db operation failed', {
  code: error.code,
  status: error.status,
  // NOT logging error.message, email, display_name, or any user-supplied value
})
```

---

### RHF + shadcn Form + `useActionState` binding

**Source:** `components/auth/LoginForm.tsx` lines 27–106
**Apply to:** `components/profile/ProfileEditForm.tsx`

Key shape to preserve:
1. `useActionState(serverAction, null)` — binds action to form state
2. `useForm({ resolver: zodResolver(Schema), defaultValues: {...} })` — client-side validation
3. `<form action={(fd) => formAction(fd)}>` — wires RHF to the server action
4. `<Form {...form}><FormField ...><FormControl><Input /></FormControl><FormMessage /></FormField></Form>` — shadcn form wrapper
5. Error alert above fields: `{state && !state.ok && <Alert variant="destructive">...}}`
6. Submit button: `disabled={pending}` — from `useActionState`

---

### `@/` Path Alias (all files)

**Source:** `lib/supabase/server.ts` line 5, `components/auth/LoginForm.tsx` line 8
**Apply to:** all new Phase 3 files

```ts
import { createClient } from '@/lib/supabase/server'   // correct
import { createClient } from '../../lib/supabase/server' // WRONG — never relative
```

---

### SQL Migration Conventions

**Source:** `supabase/migrations/002_auth_tables.sql` (full file)
**Apply to:** `supabase/migrations/003_profile_tables.sql`

1. `alter table ... enable row level security;` immediately after each `create table`
2. All `SECURITY DEFINER` functions set `set search_path = public, pg_temp`
3. Explicit `grant execute on function ... to authenticated;` (and `revoke from anon` where appropriate)
4. Comments reference requirement IDs: `-- PROF-12`, `-- GEO-01`, etc.
5. File name follows `NNN_slug.sql` convention (`003_profile_tables.sql`)

---

### Test File Locations (enforced by config)

**Source:** `vitest.config.ts` line 11, `playwright.config.ts` line 4
**Apply to:** all Phase 3 tests

- Unit tests: `tests/unit/**/*.{test,spec}.{ts,tsx}`
- E2E tests: `tests/e2e/*.spec.ts`
- Files outside these paths will not run in CI.

---

### `cn()` for Conditional Tailwind Classes

**Source:** `lib/utils.ts` (wraps `clsx` + `twMerge`)
**Apply to:** `components/profile/CountyCombobox.tsx`, `components/profile/ProfileCard.tsx`, any component with conditional class strings

```tsx
import { cn } from '@/lib/utils'

<Check className={cn('ml-auto', value === county.fips ? 'opacity-100' : 'opacity-0')} />
```

---

## No Analog Found

| File | Role | Data Flow | Reason | Fallback Source |
|---|---|---|---|---|
| `lib/data/georgia-counties.json` | static JSON | — | No existing static data files in the repo | RESEARCH.md `### Pattern 3` shows shape: `[{ fips: 13001, name: "Appling County" }, ...]` · Source: Georgia FIPS codes (159 counties) |
| `lib/data/categories.ts` | static typed constant | — | No existing static typed constants in the repo | RESEARCH.md `### categories` table seed — same 10 values; bundle as `export const CATEGORIES = [...]` typed array |
| `components/profile/SkillRowList.tsx` | dynamic field-array component | event-driven | No multi-row dynamic input exists yet; react-hook-form `useFieldArray` is new to this repo | RESEARCH.md D-05 description + react-hook-form docs for `useFieldArray` |
| `components/profile/CountyCombobox.tsx` | shadcn Combobox (Command + Popover) | event-driven | First use of `Command` + `Popover` components in the repo | RESEARCH.md Pattern 3 (lines 312–367) — verbatim shadcn Combobox pattern from verified Context7 docs |

---

## Key Codebase Conventions (confirmed from Phase 2 artifacts)

1. **`'use server'` on line 1** of all server action modules (`lib/actions/auth.ts` line 1). `lib/actions/profile.ts` must match.
2. **`import 'server-only'` on line 1** of utility modules not meant for the browser (`lib/supabase/server.ts` line 1, `lib/supabase/admin.ts` line 1). Server actions use `'use server'` directive which serves the same purpose.
3. **`@/` path alias everywhere** — never `../../` relative imports (confirmed across all Phase 2 files).
4. **`import type { Database }` — type-only import** for database types (`lib/supabase/server.ts` line 4). Keeps runtime footprint zero.
5. **`export const metadata`** for page metadata (`app/(auth)/login/page.tsx` line 5).
6. **Comments reference requirement IDs** (`lib/supabase/middleware.ts` lines 5, 8, 53) — use `// PROF-01`, `// GEO-01` etc. in Phase 3 code.
7. **Explicit env-var non-null assertions** (`process.env.NEXT_PUBLIC_SUPABASE_URL!`) — Phase 1 convention carried through Phase 2.
8. **`pnpm` only** — never `npm install` or `yarn add`.
9. **TypeScript strict: no `any` types** — all Phase 3 files must pass `pnpm typecheck`.
10. **Conventional commits scoped to domain** — `feat(profile):`, `chore(profile):`, `feat(geo):` per CONTEXT.md Phase 1 conventions.

---

## Metadata

**Analog search scope:** `app/`, `components/`, `lib/`, `middleware.ts`, `supabase/migrations/`, `tests/`

**Files scanned in full:** 21
- `lib/actions/auth.ts`
- `lib/supabase/server.ts`, `lib/supabase/client.ts`, `lib/supabase/middleware.ts`
- `components/auth/LoginForm.tsx`, `components/auth/GoogleButton.tsx`, `components/auth/LogoutButton.tsx`, `components/auth/LoginAuthCard.tsx`
- `components/layout/Footer.tsx`
- `components/ui/form.tsx` (first 60 lines)
- `app/(auth)/layout.tsx`, `app/(auth)/login/page.tsx`
- `app/verify-pending/page.tsx`
- `app/auth/callback/route.ts`
- `middleware.ts`
- `supabase/migrations/002_auth_tables.sql` (first 80 lines)
- `tests/unit/smoke.test.ts`, `tests/unit/magic-link-schema.test.ts`
- `tests/e2e/smoke.spec.ts`, `tests/e2e/login-magic-link.spec.ts`

**Upstream artifacts consumed:**
- `.planning/phases/03-profile-georgia-gate/03-CONTEXT.md`
- `.planning/phases/03-profile-georgia-gate/03-RESEARCH.md`
- `.planning/phases/02-authentication-legal/02-PATTERNS.md`

**Pattern extraction date:** 2026-04-20

**Ready for planning:** Planner can reference analog excerpts directly in PLAN.md action sections.
