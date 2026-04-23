# Phase 9: Onboarding Wizard — Pattern Map

**Mapped:** 2026-04-22
**Files analyzed:** 11 new/modified files
**Analogs found:** 11 / 11

---

## File Classification

| New/Modified File | Role | Data Flow | Closest Analog | Match Quality |
|-------------------|------|-----------|----------------|---------------|
| `supabase/migrations/009_onboarding.sql` | migration | batch | `supabase/migrations/008_landing_public_reads.sql` | role-match |
| `lib/supabase/middleware.ts` *(modify)* | middleware | request-response | `lib/supabase/middleware.ts` itself (admin guard block) | exact |
| `app/(onboarding)/layout.tsx` | config/layout | request-response | `app/(auth)/layout.tsx` | exact |
| `app/(onboarding)/onboarding/page.tsx` | controller (server component) | request-response | `app/(app)/directory/page.tsx` | exact |
| `lib/actions/onboarding.ts` | service (server action) | CRUD | `lib/actions/profile.ts` — `setPublished()` | exact |
| `components/onboarding/WizardLayout.tsx` | component | request-response | `components/profile/ProfileCompletenessChecklist.tsx` | role-match |
| `components/onboarding/ProgressIndicator.tsx` | component | request-response | `components/layout/NavLinks.tsx` (client, pathname-aware) | role-match |
| `components/onboarding/StepProfile.tsx` | component | request-response | `components/profile/ProfileCompletenessChecklist.tsx` (embedding) | exact |
| `components/onboarding/StepDirectory.tsx` | component | request-response | `app/(app)/directory/page.tsx` header region | partial |
| `components/onboarding/StepContact.tsx` | component | request-response | `app/(app)/directory/page.tsx` + `lib/actions/profile.ts` (server-side side-effect) | role-match |
| `app/(app)/layout.tsx` *(modify)* | layout (server component) | CRUD | `app/(app)/layout.tsx` itself (existing profile query) | exact |
| `components/layout/AppNav.tsx` *(modify)* | component | request-response | `components/layout/NavLinks.tsx` | exact |
| `app/(app)/profile/edit/page.tsx` *(modify)* | controller (server component) | request-response | `app/(app)/profile/edit/page.tsx` itself | exact |
| `components/profile/ProfileEditForm.tsx` *(modify)* | component (client) | request-response | `components/profile/ProfileEditForm.tsx` itself | exact |
| `tests/unit/onboarding-action.test.ts` | test | — | `tests/unit/profile-action.test.ts` | exact |
| `tests/e2e/onboarding-redirect.spec.ts` | test | — | `tests/e2e/auth-group-redirect.spec.ts` + `tests/e2e/verify-pending-gate.spec.ts` | exact |

---

## Pattern Assignments

### `supabase/migrations/009_onboarding.sql` (migration, batch)

**Analog:** `supabase/migrations/008_landing_public_reads.sql`

**Header comment pattern** (lines 1-7 of 008):
```sql
-- Phase 6 — Landing public reads
-- Requirements: LAND-02 (founding strip + county coverage data source)
-- See: .planning/phases/06-landing-page-pwa-polish/06-RESEARCH.md Pitfall 1
-- Depends on: 003_profile_tables.sql (tables + authenticated policies already exist)
-- Security: V4 Access Control + V8 Data Protection — anon policies grant SELECT only;
--           UI layer MUST use explicit column lists (never .select('*')) to prevent leaks.
```

**ALTER TABLE + IF NOT EXISTS + COMMENT pattern** (derive from 003 patterns):
```sql
-- Phase 9: Onboarding Wizard state column
-- Requirements: D-09 — NULL = in progress, timestamp = completed
-- Depends on: 003_profile_tables.sql (profiles table)
-- No new RLS policy needed — "Owners see own profile" (SELECT) policy covers all columns;
-- "Owners update own profile" (UPDATE) policy allows writing any non-banned column.

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS onboarding_completed_at timestamptz;

COMMENT ON COLUMN public.profiles.onboarding_completed_at IS
  'NULL = onboarding not yet completed. Set to now() when user views Step 3 of the wizard.';
```

**Existing RLS wildcard pattern** (from `003_profile_tables.sql` lines 291-293):
```sql
create policy "Owners see own profile"
  on public.profiles for select to authenticated
  using (owner_id = auth.uid());
```
No new RLS policy is needed — the existing wildcard SELECT/UPDATE policies cover the new column.

---

### `lib/supabase/middleware.ts` (middleware, request-response) — MODIFY

**Analog:** `lib/supabase/middleware.ts` itself — the existing admin guard block (lines 103-123) is the pattern to mirror.

**ALWAYS_ALLOWED array** (lines 14-21) — add one entry:
```typescript
const ALWAYS_ALLOWED = [
  '/verify-pending',
  '/auth/callback',
  '/auth/confirm',
  '/auth/signout',
  '/auth/error',
  '/legal/',
  '/onboarding',   // D-02: prevents infinite redirect loop when user IS at /onboarding
]
```

**Admin guard pattern to mirror** (lines 103-123) — the onboarding guard inserts AFTER this block, before `return response`:
```typescript
// ADMIN-06 (Phase 8) — admin email guard
const ADMIN_PREFIX = '/admin'
if (pathname.startsWith(ADMIN_PREFIX)) {
  if (!isAuthed) {
    const url = request.nextUrl.clone()
    url.pathname = '/login'
    url.search = ''
    return NextResponse.redirect(url)
  }
  const adminEmail = process.env.ADMIN_EMAIL
  const userEmail = claims?.email as string | undefined
  if (!adminEmail || userEmail !== adminEmail) {
    const url = request.nextUrl.clone()
    url.pathname = '/'
    url.search = ''
    return NextResponse.redirect(url)
  }
}
```

**New onboarding guard to insert after admin guard** (same redirect pattern, same DB client):
```typescript
// D-02 / D-10: onboarding redirect — authed + verified + not already on exempt path
const isOnboardingRequired =
  isAuthed &&
  isVerified &&
  !pathname.startsWith('/onboarding') &&
  !pathname.startsWith('/admin') &&
  !ALWAYS_ALLOWED.some((p) => pathname.startsWith(p)) &&
  VERIFIED_REQUIRED_PREFIXES.some((p) => pathname.startsWith(p))

if (isOnboardingRequired) {
  const { data: onboardingProfile } = await supabase
    .from('profiles')
    .select('onboarding_completed_at')
    .eq('owner_id', claims!.sub as string)
    .maybeSingle()

  // NULL or no profile row → redirect to onboarding
  if (!onboardingProfile || onboardingProfile.onboarding_completed_at === null) {
    const url = request.nextUrl.clone()
    url.pathname = '/onboarding'
    url.search = ''
    return NextResponse.redirect(url)
  }
}
```

**Critical notes:**
- Use `claims!.sub` (not `getUser()`) — same as the admin guard, matches CLAUDE.md mandate to avoid `getSession()` on server paths.
- Scope to `VERIFIED_REQUIRED_PREFIXES` only (same as the email-verify check at line 68) to avoid adding a DB round-trip on every unauthenticated request.
- The `supabase` client here is the SSR anon client with user cookie — same as used throughout `updateSession()`. The "Owners see own profile" RLS policy allows this query.

---

### `app/(onboarding)/layout.tsx` (layout, request-response)

**Analog:** `app/(auth)/layout.tsx` (lines 1-13) — exact match (distraction-free, no AppNav):

```typescript
// app/(auth)/layout.tsx — reference (13 lines total)
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

**Adapted for onboarding** (copy auth layout, swap metadata and add Toaster):
```typescript
// app/(onboarding)/layout.tsx
import type { Metadata } from 'next'
import { Toaster } from '@/components/ui/sonner'

export const metadata: Metadata = {
  title: { default: 'Get started — Barterkin', template: '%s — Barterkin' },
}

export default function OnboardingLayout({ children }: { children: React.ReactNode }) {
  return (
    <main className="min-h-screen flex items-start justify-center px-4 py-12 sm:py-16 bg-sage-bg">
      {children}
      <Toaster position="bottom-right" />
    </main>
  )
}
```

Also reference `app/(admin)/layout.tsx` (lines 1-20) for the Toaster import pattern:
```typescript
import { Toaster } from '@/components/ui/sonner'
// ...
<Toaster position="bottom-right" />
```

---

### `app/(onboarding)/onboarding/page.tsx` (controller/server component, request-response)

**Analog:** `app/(app)/directory/page.tsx` (server component with `searchParams`, auth guard, data fetch, conditional rendering)

**searchParams async pattern** (directory/page.tsx lines 18-24):
```typescript
export default async function DirectoryPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>
}) {
  const rawParams = await searchParams
  // ...
}
```

**Auth guard + profile fetch pattern** (from `app/(app)/profile/edit/page.tsx` lines 9-19):
```typescript
const supabase = await createClient()
const { data: { user } } = await supabase.auth.getUser()
if (!user) redirect('/login')

const { data } = await supabase
  .from('profiles')
  .select('*, skills_offered(*), skills_wanted(*)')
  .eq('owner_id', user.id)
  .maybeSingle()
```

**Import pattern** (from `app/(app)/profile/edit/page.tsx` lines 1-4):
```typescript
import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
```

**Metadata pattern** (from `app/(app)/profile/edit/page.tsx` line 5):
```typescript
export const dynamic = 'force-dynamic'
export const metadata = { title: 'Get started' }
```

**Conditional render by param** (mirror directory page's filter-based conditional rendering):
```typescript
const { step: rawStep } = await searchParams
const step = Math.max(1, Math.min(3, parseInt(rawStep ?? '1', 10) || 1))

// Redirect if already complete
if (profile?.onboarding_completed_at) redirect('/directory')

return (
  <WizardLayout currentStep={step}>
    {step === 1 && <StepProfile completenessInput={completenessInput} profileComplete={profileComplete} />}
    {step === 2 && <StepDirectory />}
    {step === 3 && <StepContact />}
  </WizardLayout>
)
```

---

### `lib/actions/onboarding.ts` (service/server action, CRUD)

**Analog:** `lib/actions/profile.ts` — `setPublished()` function (lines 198-269)

**'use server' + import pattern** (lines 1-18 of profile.ts):
```typescript
'use server'

import { z } from 'zod'
import { createClient } from '@/lib/supabase/server'
```

**getUser() auth check pattern** (lines 200-207 of profile.ts):
```typescript
const supabase = await createClient()
const {
  data: { user },
  error: authError,
} = await supabase.auth.getUser()
if (authError || !user) return { ok: false, error: 'Not authenticated.' }
```

**Targeted UPDATE + error pattern** (lines 219-228 of profile.ts — setPublished unpublish path):
```typescript
const { error } = await supabase
  .from('profiles')
  .update({ is_published: false })
  .eq('id', profileId)
  .eq('owner_id', user.id)
if (error) {
  console.error('[setPublished] unpublish failed', { code: error.code })
  return { ok: false, error: 'Something went wrong. Please try again.' }
}
return { ok: true }
```

**Adapted `markOnboardingComplete()` — idempotent update with null guard:**
```typescript
'use server'
import { createClient } from '@/lib/supabase/server'

export async function markOnboardingComplete(): Promise<{ ok: boolean }> {
  const supabase = await createClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) return { ok: false }

  const { error } = await supabase
    .from('profiles')
    .update({ onboarding_completed_at: new Date().toISOString() })
    .eq('owner_id', user.id)
    .is('onboarding_completed_at', null)   // idempotent: no-op if already set

  if (error) {
    console.error('[markOnboardingComplete] update failed', { code: error.code })
    return { ok: false }
  }
  return { ok: true }
}
```

**Key differences from setPublished:**
- No `formData` parameter (called programmatically from server component render).
- `.is('onboarding_completed_at', null)` guard makes it idempotent — if step 3 renders twice, the second call is a no-op.
- Silent degradation on failure (user still sees step 3; middleware will redirect on next request).

---

### `components/onboarding/WizardLayout.tsx` (component, request-response)

**Analog:** `app/(admin)/layout.tsx` (lines 10-20) for the outer container structure, combined with `components/profile/ProfileCompletenessChecklist.tsx` for component composition pattern.

**Outer container from admin layout** (lines 10-20 of admin layout):
```typescript
export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-sage-bg">
      <AdminNav />
      <main className="mx-auto max-w-5xl px-6 py-12">
        {children}
      </main>
      <Toaster position="bottom-right" />
    </div>
  )
}
```

**shadcn Card pattern** — use `Card`, `CardHeader`, `CardContent`, `CardFooter` from `components/ui/card.tsx`. WizardLayout wraps the step slot in a Card:
```typescript
// components/onboarding/WizardLayout.tsx — server component
import { Card, CardContent, CardHeader, CardFooter } from '@/components/ui/card'
import { ProgressIndicator } from './ProgressIndicator'

export function WizardLayout({
  currentStep,
  children,
}: {
  currentStep: number
  children: React.ReactNode
}) {
  return (
    <Card className="w-full max-w-xl">
      <CardHeader>
        <ProgressIndicator currentStep={currentStep} totalSteps={3} />
      </CardHeader>
      <CardContent>{children}</CardContent>
    </Card>
  )
}
```

---

### `components/onboarding/ProgressIndicator.tsx` (component, request-response)

**Analog:** `components/layout/NavLinks.tsx` (lines 1-66) — client component, pathname/state-aware conditional styling with `cn()`.

**'use client' + cn pattern** (lines 1-4 of NavLinks.tsx):
```typescript
'use client'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'
```

**Conditional class pattern** (lines 23-31 of NavLinks.tsx):
```typescript
className={cn(
  'text-sm',
  isDirectory
    ? 'text-forest-deep border-b-2 border-clay pb-1'
    : 'text-forest-mid hover:text-forest-deep',
)}
```

**ProgressIndicator pattern** (3 dots, active/completed/inactive states):
```typescript
'use client'
import { cn } from '@/lib/utils'

export function ProgressIndicator({
  currentStep,
  totalSteps,
}: {
  currentStep: number
  totalSteps: number
}) {
  return (
    <div className="flex items-center gap-2" aria-label={`Step ${currentStep} of ${totalSteps}`}>
      {Array.from({ length: totalSteps }, (_, i) => {
        const stepNum = i + 1
        const isCompleted = stepNum < currentStep
        const isActive = stepNum === currentStep
        return (
          <span
            key={stepNum}
            aria-current={isActive ? 'step' : undefined}
            className={cn(
              'h-2 w-2 rounded-full transition-colors',
              isCompleted && 'bg-forest-mid',
              isActive && 'bg-clay',
              !isCompleted && !isActive && 'bg-sage-light',
            )}
          />
        )
      })}
      <span className="ml-2 text-xs text-muted-foreground">
        Step {currentStep} of {totalSteps}
      </span>
    </div>
  )
}
```

---

### `components/onboarding/StepProfile.tsx` (component, request-response)

**Analog:** `components/profile/ProfileCompletenessChecklist.tsx` (lines 1-28) — exact reuse; StepProfile embeds it directly.

**ProfileCompletenessChecklist props pattern** (lines 13-28):
```typescript
export function ProfileCompletenessChecklist(input: ProfileCompletenessInput) {
  return (
    <ul className="space-y-2 text-sm">
      <li className="font-medium">Profile must be complete to publish:</li>
      {REQUIREMENTS.map((r) => {
        const ok = r.test(input)
        return (
          <li key={r.key} className="flex items-center gap-2">
            {ok ? <Check className="h-4 w-4 text-forest-mid" /> : <X className="h-4 w-4 text-destructive" />}
            <span className={cn(ok ? 'text-forest-mid' : 'text-destructive')}>{r.label}</span>
          </li>
        )
      })}
    </ul>
  )
}
```

**Button pattern with disabled state** (from `components/profile/ProfileEditForm.tsx` lines 283-286):
```typescript
<Button type="submit" size="lg" disabled={pending} className="min-w-[160px]">
  {pending ? 'Saving...' : 'Save profile'}
</Button>
```

**StepProfile composition:**
```typescript
// components/onboarding/StepProfile.tsx — server component
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { ArrowRight } from 'lucide-react'
import { ProfileCompletenessChecklist } from '@/components/profile/ProfileCompletenessChecklist'
import type { ProfileCompletenessInput } from '@/lib/schemas/profile'

export function StepProfile({
  completenessInput,
  profileComplete,
}: {
  completenessInput: ProfileCompletenessInput
  profileComplete: boolean
}) {
  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <h2 className="font-serif text-2xl font-bold text-forest-deep">Complete your profile</h2>
        <p className="text-base text-muted-foreground">
          Your profile is how Georgians find you in the directory.
        </p>
      </div>
      <ProfileCompletenessChecklist {...completenessInput} />
      <div className="flex items-center gap-3">
        <Button asChild variant="outline">
          <Link href="/profile/edit?returnTo=/onboarding?step=1">
            Edit my profile <ArrowRight className="ml-1 h-4 w-4" />
          </Link>
        </Button>
        {profileComplete ? (
          <Button asChild>
            <Link href="/onboarding?step=2">Next <ArrowRight className="ml-1 h-4 w-4" /></Link>
          </Button>
        ) : (
          <Tooltip>
            <TooltipTrigger asChild>
              <span tabIndex={0}>
                <Button disabled>Next</Button>
              </span>
            </TooltipTrigger>
            <TooltipContent>Complete all 5 checklist items first.</TooltipContent>
          </Tooltip>
        )}
      </div>
    </div>
  )
}
```

---

### `components/onboarding/StepDirectory.tsx` (component, request-response)

**Analog:** `app/(app)/directory/page.tsx` header region (lines 34-42) — informational heading + body copy pattern.

**Heading + muted body pattern** (directory/page.tsx lines 34-42):
```typescript
<header className="space-y-2">
  <h1 className="font-serif text-[32px] font-bold leading-[1.15] text-forest-deep">
    Directory
  </h1>
  <p className="text-base text-muted-foreground">
    Browse Georgians by skill, category, and county.
  </p>
</header>
```

**Button/Link CTA pattern** (from NavLinks.tsx line 22-30 for link-as-button):
```typescript
import { Compass } from 'lucide-react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
```

**StepDirectory is a server component** (no 'use client' needed — no interactivity):
```typescript
// components/onboarding/StepDirectory.tsx — server component
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { ArrowRight, Compass } from 'lucide-react'

export function StepDirectory() {
  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <h2 className="font-serif text-2xl font-bold text-forest-deep">Browse the directory</h2>
        <p className="text-base text-muted-foreground">
          The directory lists every published Barterkin member by skill, category, and county.
          Find someone whose skills complement yours, then send a contact request.
        </p>
      </div>
      <div className="flex items-center gap-3">
        <Button asChild variant="outline">
          <Link href="/directory">
            <Compass className="mr-1 h-4 w-4" /> Browse the directory
          </Link>
        </Button>
        <Button asChild>
          <Link href="/onboarding?step=3">Next <ArrowRight className="ml-1 h-4 w-4" /></Link>
        </Button>
      </div>
    </div>
  )
}
```

---

### `components/onboarding/StepContact.tsx` (component, request-response)

**Analog:** `components/profile/ProfileCompletenessChecklist.tsx` for structure; `lib/actions/profile.ts` `setPublished()` for the server-side side-effect call.

**Server component calling server action during render** (D-11):
```typescript
// components/onboarding/StepContact.tsx — server component
// markOnboardingComplete() is called during render, not on button click
import { markOnboardingComplete } from '@/lib/actions/onboarding'
```

**Alert pattern for final confirmation** (from ProfileEditForm.tsx lines 103-108):
```typescript
import { Alert, AlertDescription } from '@/components/ui/alert'
import { AlertCircle } from 'lucide-react'
```

**StepContact composition — calls markOnboardingComplete() before returning JSX:**
```typescript
export async function StepContact() {
  // D-11: reaching step 3 = wizard complete. Idempotent — safe to call on re-render.
  await markOnboardingComplete()

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <h2 className="font-serif text-2xl font-bold text-forest-deep">Send your first contact</h2>
        <p className="text-base text-muted-foreground">
          When you find someone you'd like to barter with, tap "Send a contact request" on their profile.
          Barterkin forwards your message by email — your inbox stays private.
        </p>
      </div>
      <div className="flex items-center gap-3">
        <Button asChild>
          <Link href="/directory">
            <MessageSquare className="mr-1 h-4 w-4" /> Find someone to contact
          </Link>
        </Button>
      </div>
    </div>
  )
}
```

---

### `app/(app)/layout.tsx` (layout, CRUD) — MODIFY

**Analog:** `app/(app)/layout.tsx` itself — extend the existing profile query (lines 24-32).

**Existing profile query** (lines 24-32):
```typescript
const { data: profile } = await supabase
  .from('profiles')
  .select('id, display_name, avatar_url')
  .eq('owner_id', userId)
  .maybeSingle()
displayName = profile?.display_name ?? email
avatarUrl = profile?.avatar_url ?? null
```

**Extended query** — add `onboarding_completed_at` to select, derive `showFinishSetup`:
```typescript
const { data: profile } = await supabase
  .from('profiles')
  .select('id, display_name, avatar_url, onboarding_completed_at')
  .eq('owner_id', userId)
  .maybeSingle()
displayName = profile?.display_name ?? email
avatarUrl = profile?.avatar_url ?? null
const showFinishSetup = profile !== null && profile.onboarding_completed_at === null
```

Pass `showFinishSetup` into `AppNav`:
```typescript
<AppNav
  displayName={displayName}
  avatarUrl={avatarUrl}
  unseenContactCount={unseenContactCount}
  showFinishSetup={showFinishSetup}
/>
```

---

### `components/layout/AppNav.tsx` + `components/layout/NavLinks.tsx` (component) — MODIFY

**Analog:** `components/layout/NavLinks.tsx` (lines 1-66) — existing conditional link render pattern.

**Existing prop signature** (AppNav.tsx lines 4-12):
```typescript
export function AppNav({
  displayName,
  avatarUrl,
  unseenContactCount,
}: {
  displayName?: string | null
  avatarUrl?: string | null
  unseenContactCount?: number
})
```

**Extended prop signature** — add `showFinishSetup`:
```typescript
export function AppNav({
  displayName,
  avatarUrl,
  unseenContactCount,
  showFinishSetup,
}: {
  displayName?: string | null
  avatarUrl?: string | null
  unseenContactCount?: number
  showFinishSetup?: boolean
})
```

**Conditional link pattern in NavLinks.tsx** (mirrors the unseenContactCount badge at lines 43-60):
```typescript
// In NavLinks.tsx — add showFinishSetup prop and render:
{showFinishSetup && (
  <Link
    href="/onboarding"
    className="flex items-center gap-1 text-sm font-medium text-clay hover:text-forest-deep"
  >
    Finish setup <ArrowRight className="h-3.5 w-3.5" />
  </Link>
)}
```

---

### `app/(app)/profile/edit/page.tsx` (controller, request-response) — MODIFY

**Analog:** `app/(app)/profile/edit/page.tsx` itself (lines 1-26) — add `searchParams` reading.

**Current page signature** (lines 9-10):
```typescript
export const dynamic = 'force-dynamic'
export default async function ProfileEditPage() {
```

**Extended signature with searchParams** (mirror directory/page.tsx searchParams pattern):
```typescript
export default async function ProfileEditPage({
  searchParams,
}: {
  searchParams: Promise<{ returnTo?: string }>
}) {
  const { returnTo } = await searchParams
  // Validate: only allow relative paths (D-06 + Pitfall 3 open-redirect prevention)
  const safeReturnTo = returnTo?.startsWith('/') ? returnTo : undefined
  // ... rest unchanged, pass safeReturnTo into ProfileEditForm
  return (
    <div className="mx-auto max-w-2xl">
      <ProfileEditForm userId={user.id} defaultValues={...} returnTo={safeReturnTo} />
    </div>
  )
}
```

---

### `components/profile/ProfileEditForm.tsx` (component/client, request-response) — MODIFY

**Analog:** `components/profile/ProfileEditForm.tsx` itself — modify the `useEffect` success handler (lines 59-64).

**Current success handler** (lines 59-64):
```typescript
// D-04: stay on page, toast success
useEffect(() => {
  if (state?.ok) toast('Profile saved.')
  else if (state && state.ok === false && !state.fieldErrors) {
    toast.error(state.error ?? "Couldn't save your profile. Please try again in a moment.")
  }
}, [state])
```

**Extended handler with returnTo** — add `returnTo` prop and `router.push`:
```typescript
// Add to imports:
import { useRouter } from 'next/navigation'

// Add prop:
export function ProfileEditForm({
  userId,
  defaultValues,
  returnTo,
}: {
  userId: string
  defaultValues: ProfileWithRelations | null
  returnTo?: string
}) {
  const router = useRouter()
  // ...
  useEffect(() => {
    if (state?.ok) {
      if (returnTo) {
        router.push(returnTo)
      } else {
        toast('Profile saved.')
      }
    } else if (state && state.ok === false && !state.fieldErrors) {
      toast.error(state.error ?? "Couldn't save your profile. Please try again in a moment.")
    }
  }, [state, returnTo, router])
```

---

### `tests/unit/onboarding-action.test.ts` (test)

**Analog:** `tests/unit/profile-action.test.ts` (lines 1-54) — Vitest unit test for server action pure helpers.

**Test file header pattern** (lines 1-5 of profile-action.test.ts):
```typescript
import { describe, it, expect } from 'vitest'
// Pure helpers live in profile-helpers.ts (not 'use server') so they can be sync-tested.
import { parseSkillArray, coerceFormDataToProfileInput } from '@/lib/actions/profile-helpers'
```

**describe + it + expect pattern** (lines 6-10):
```typescript
describe('parseSkillArray (PROF-03, PROF-04)', () => {
  it('parses a JSON array of strings', () => {
    expect(parseSkillArray(JSON.stringify(['a', 'b']))).toEqual(['a', 'b'])
  })
```

**Onboarding test coverage required:**
- `markOnboardingComplete()` idempotency (`.is('onboarding_completed_at', null)` guard)
- `returnTo` validation: `returnTo?.startsWith('/') ? returnTo : undefined`
- External URL rejection: `https://evil.com` → `undefined`

Note: `markOnboardingComplete` uses `createClient()` which is a server-only module. Tests must mock `@/lib/supabase/server` (same pattern as `tests/__mocks__/server-only.ts`).

---

### `tests/e2e/onboarding-redirect.spec.ts` (test)

**Analog:** `tests/e2e/auth-group-redirect.spec.ts` (lines 1-18) + `tests/e2e/verify-pending-gate.spec.ts` (lines 1-27) — Playwright e2e spec structure.

**Spec file header pattern** (lines 1-3 of auth-group-redirect.spec.ts):
```typescript
import { test, expect } from '@playwright/test'

test.describe('auth-group redirect (AUTH-09)', () => {
```

**Fixme pattern for auth-required tests** (lines 16-17):
```typescript
test.fixme('authed user visiting /login is redirected to /directory', async () => {})
```

**Visible element assertion pattern** (verify-pending-gate.spec.ts lines 6-8):
```typescript
test('/verify-pending renders "One more step" heading', async ({ page }) => {
  await page.goto('/verify-pending')
  await expect(page.getByRole('heading', { name: 'One more step' })).toBeVisible()
})
```

**Coverage mapping for onboarding-redirect.spec.ts:**
```typescript
test.describe('onboarding redirect (D-02, D-03, D-04, D-10, D-15, D-16)', () => {
  test('/onboarding renders step 1 heading', async ({ page }) => { ... })
  test.fixme('D-02: authed+verified user with NULL onboarding_completed_at is redirected to /onboarding', async () => {})
  test.fixme('D-03: Skip for now redirects to /directory, does not set onboarding_completed_at', async () => {})
  test.fixme('D-04: AppNav Finish setup link visible when onboarding_completed_at IS NULL', async () => {})
  test.fixme('D-10: completed user is NOT redirected to /onboarding', async () => {})
  test.fixme('D-15: Step 1 Next button disabled until all 5 checklist items green', async () => {})
  test.fixme('D-16: Skip does not mark wizard complete', async () => {})
})
```

---

## Shared Patterns

### Authentication (getUser on server paths)
**Source:** `app/(app)/layout.tsx` lines 15-16 and `app/(app)/profile/edit/page.tsx` lines 10-13
**Apply to:** `app/(onboarding)/onboarding/page.tsx`, `lib/actions/onboarding.ts`
```typescript
const supabase = await createClient()
const { data: { user } } = await supabase.auth.getUser()
if (!user) redirect('/login')
```
CLAUDE.md mandate: always `getUser()` (not `getSession()`, not `getClaims()`) for DML and page-gate decisions.

### Middleware getClaims (fast path, no round-trip)
**Source:** `lib/supabase/middleware.ts` lines 45-50
**Apply to:** `lib/supabase/middleware.ts` (the onboarding guard addition)
```typescript
const { data } = await supabase.auth.getClaims()
const claims = data?.claims
const isAuthed = !!claims?.sub
let isVerified = !!claims?.email_verified
```
Use `claims.sub` for the profiles query, not `getUser()`, to avoid a second round-trip on the guard check.

### Error Handling (server actions)
**Source:** `lib/actions/profile.ts` lines 84, 105-108, 135-138
**Apply to:** `lib/actions/onboarding.ts`
```typescript
if (authError || !user) return { ok: false, error: 'Not authenticated.' }
// ...
if (error) {
  console.error('[actionName] step failed', { code: error.code })
  return { ok: false, error: 'Something went wrong. Please try again.' }
}
return { ok: true }
```
Never log field values (PII). Return `{ code: error.code }` only.

### Tailwind Color Tokens (CSS vars, never hex)
**Source:** Throughout `app/(admin)/layout.tsx`, `components/layout/NavLinks.tsx`, `components/profile/ProfileCompletenessChecklist.tsx`
**Apply to:** All new components
```
bg-sage-bg, bg-sage-pale, border-sage-light
text-forest-deep, text-forest-mid
bg-clay, border-clay, text-clay
text-destructive, bg-destructive
text-muted-foreground
```
CLAUDE.md mandate: Tailwind v4 CSS-first — use named tokens from `app/globals.css`. No raw hex.

### shadcn Import Pattern
**Source:** `components/profile/ProfileEditForm.tsx` lines 14-20
**Apply to:** All new components using shadcn
```typescript
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
```

### lucide-react Icon Import Pattern
**Source:** `components/profile/ProfileCompletenessChecklist.tsx` line 1
**Apply to:** All new components using icons
```typescript
import { Check, X } from 'lucide-react'
import { ArrowRight, Compass, MessageSquare } from 'lucide-react'
```
One icon per destructured import. Tree-shaken.

### Supabase Server Client
**Source:** `lib/actions/profile.ts` line 5, `app/(app)/profile/edit/page.tsx` line 1
**Apply to:** `app/(onboarding)/onboarding/page.tsx`, `lib/actions/onboarding.ts`
```typescript
import { createClient } from '@/lib/supabase/server'
// ...
const supabase = await createClient()
```

### `cn()` Conditional Class Pattern
**Source:** `components/profile/ProfileCompletenessChecklist.tsx` line 25, `components/layout/NavLinks.tsx` lines 24-31
**Apply to:** `components/onboarding/ProgressIndicator.tsx`
```typescript
import { cn } from '@/lib/utils'
// ...
className={cn(
  'base-class',
  condition && 'conditional-class',
  !condition && 'other-class',
)}
```

---

## No Analog Found

All files have close analogs in the codebase. No files require falling back to RESEARCH.md patterns exclusively.

---

## Metadata

**Analog search scope:** `app/`, `components/`, `lib/`, `supabase/migrations/`, `tests/`
**Files scanned:** 16 source files read in full
**Pattern extraction date:** 2026-04-22
