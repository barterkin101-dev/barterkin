# Phase 9: Onboarding Wizard — Research

**Researched:** 2026-04-22
**Domain:** Next.js App Router route groups, Supabase RLS + migrations, server actions, middleware redirect patterns
**Confidence:** HIGH

---

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

**Wizard Container**
- D-01: Onboarding wizard lives at a dedicated `/onboarding` route with its own distraction-free layout — no AppNav. Route group `(onboarding)` mirrors the `(auth)` and `(admin)` pattern.
- D-02: Middleware intercepts authed + email-verified users whose `profiles.onboarding_completed_at IS NULL` and whose current path is not `/onboarding` — redirects them to `/onboarding`. This fires on the first post-verification request, typically right after `/auth/callback` or `/auth/confirm` redirects.
- D-03: On dismiss (user closes wizard mid-way), redirect to `/directory`. The wizard does not block access to the app.
- D-04: AppNav gets a persistent "Finish setup →" link that shows until `onboarding_completed_at` is set. Clicking it resumes at `/onboarding?step=N` where N is the last step the user reached. This is the only resume entry point.

**Step Interactivity**
- D-05: Steps are instructional — they explain what to do and provide a CTA that sends the user to the real page. No form logic is duplicated inside the wizard.
- D-06: Step 1 (Profile): Embeds a live read of `ProfileCompletenessChecklist` (the existing component). CTA "Edit my profile →" goes to `/profile/edit`. After saving, redirect goes back to `/onboarding?step=1`. On re-load, the wizard re-checks completeness — all 5 items green unlocks the Next button.
- D-07: Step 2 (Directory): Informational. CTA "Browse the directory →" opens `/directory` in same tab. No completion check — Next always active.
- D-08: Step 3 (Contact): Informational. CTA "Find someone to contact →" opens `/directory`. No completion check — reaching/viewing this step marks wizard as done.

**State Persistence**
- D-09: Add `onboarding_completed_at timestamptz` (nullable) to `profiles` table via new migration. NULL = in progress. Timestamp = completed.
- D-10: Middleware reads `onboarding_completed_at` via server-side Supabase query. If NULL + authed + verified, redirect to `/onboarding`.
- D-11: Wizard marked complete when user reaches and views Step 3. Server Action updates `profiles.onboarding_completed_at = now()` on Step 3 render.
- D-12: "Finish setup" AppNav link conditionally rendered based on server-side profile fetch returning `onboarding_completed_at IS NULL`. No client-side guessing.

**Step Structure**
- D-13: 3 steps, linear: Step 1 Profile → Step 2 Directory → Step 3 Contact. No intro welcome screen.
- D-14: Progress indicator shows step position (dots or "Step 1 of 3"). Design is Claude's discretion.
- D-15: Only Step 1 has a hard gate: profile must be complete (all 5 checklist items green) before Next activates. Steps 2 and 3 advance freely.
- D-16: Each step has a "Skip for now" or dismiss option that sends the user to `/directory` and does NOT mark the wizard as complete.

### Claude's Discretion
- Progress indicator visual design (dots vs. labelled tabs vs. step counter) — keep it minimal.
- Exact copy/tone for each step's headline and body — warm, community feel, sage/forest palette brand voice.
- Whether the AppNav "Finish setup" link uses a Badge/dot indicator vs. plain text.
- RLS policy for reading own `onboarding_completed_at` — whether this reuses the existing profile owner policy or needs a targeted addition.

### Deferred Ideas (OUT OF SCOPE)
None — discussion stayed within phase scope.
</user_constraints>

---

## Summary

Phase 9 builds a three-step, route-grouped onboarding wizard that fires once for new members after email verification. The wizard lives at `/onboarding` in its own `(onboarding)` route group with a distraction-free layout (no AppNav), matching the existing `(auth)` and `(admin)` patterns already in the codebase. State is persisted in a single nullable `timestamptz` column added to the `profiles` table.

The implementation has four discrete areas of work: (1) a Supabase migration to add `onboarding_completed_at` to `profiles`, (2) middleware logic to intercept new users and redirect them to `/onboarding`, (3) three wizard step components assembled from existing shadcn primitives, and (4) a conditional "Finish setup" link added to AppNav. No new shadcn primitives are introduced. No form logic is duplicated. The UI-SPEC is already approved and specifies exact copy, colors, spacing, and component assignments.

The biggest implementation nuance is the profile save redirect: `ProfileEditForm` currently stays on the profile edit page (toasts success). To route users back to `/onboarding?step=1` after saving, the save action or the form needs to support a `returnTo` query parameter. The existing `saveProfile` server action returns `{ ok: true, slug }` without a redirect — so the form component handles routing. The cleanest path is to read a `returnTo` query param from the page's `searchParams` and pass it into the form, which calls `router.push(returnTo)` on success instead of toasting in place.

**Primary recommendation:** Implement in three waves — (1) DB migration + middleware guard, (2) wizard route + step components, (3) AppNav "Finish setup" link. Each wave is independently deployable and testable.

---

## Architectural Responsibility Map

| Capability | Primary Tier | Secondary Tier | Rationale |
|------------|-------------|----------------|-----------|
| Onboarding redirect intercept | Middleware (Edge) | — | Route-level guard; must fire before any page renders |
| `onboarding_completed_at` read (middleware) | API / Backend | — | Service-role or anon-with-RLS Supabase query in `updateSession()` |
| Wizard step rendering | Frontend Server (SSR) | — | Server component reads `profiles` row for completeness; steps are server-rendered |
| Step 3 completion write | API / Backend | — | Server Action `markOnboardingComplete()` writes `onboarding_completed_at = now()` |
| Profile completeness check display | Frontend Server (SSR) | — | `ProfileCompletenessChecklist` is a pure presentational component; data fetched server-side |
| Profile save + return redirect | Frontend Server (SSR) | Browser / Client | `saveProfile` action server-side; redirect target determined client-side from `returnTo` param |
| AppNav "Finish setup" link | Frontend Server (SSR) | — | Rendered in `(app)/layout.tsx` server component which already fetches profile row |
| Progress indicator | Browser / Client | — | Client component for dot active-state, keyboard interactions |

---

## Standard Stack

All libraries are already installed. This phase introduces NO new npm dependencies.

### Core (already installed — confirmed via codebase inspection)

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| Next.js App Router | 16.2.x | Route groups, server components, server actions, `searchParams` | Already the project framework [VERIFIED: codebase] |
| `@supabase/ssr` | 0.10.x | Server-side DB client in middleware and server components | Established pattern — all phases use this [VERIFIED: codebase] |
| shadcn/ui (new-york) | existing install | `Card`, `Button`, `Badge`, `Separator`, `Skeleton`, `Tooltip`, `Alert` — all already in `components/ui/*` | Phase 1 installed these; UI-SPEC confirmed all are present [VERIFIED: codebase] |
| `lucide-react` | existing | `Check`, `ArrowRight`, `Compass`, `MessageSquare`, `X` icons | Already the icon library per `components.json` [VERIFIED: codebase] |
| Supabase Postgres | managed | `profiles` table migration | RLS-native, consistent with all prior migrations [VERIFIED: codebase] |

### No New Dependencies

The UI-SPEC Registry Safety section explicitly confirms: "Phase 9 introduces NO new shadcn primitives and NO third-party registries." [VERIFIED: UI-SPEC]

All required shadcn primitives are confirmed present:
- `Card` — `components/ui/card.tsx` (used by admin + directory)
- `Button` — `components/ui/button.tsx` (used everywhere)
- `Badge` — `components/ui/badge.tsx` (used in nav unseen count)
- `Separator` — `components/ui/separator.tsx`
- `Skeleton` — `components/ui/skeleton.tsx`
- `Tooltip` — `components/ui/tooltip.tsx` (for disabled Next button)
- `Alert` — `components/ui/alert.tsx`

---

## Architecture Patterns

### System Architecture Diagram

```
New Member Signs Up
        │
        ▼
Email Verification (Supabase Auth)
        │
        ▼
First App Request (any path)
        │
        ▼
middleware.ts → updateSession()
        │
        ├── onboarding_completed_at IS NULL? ──YES──► Redirect to /onboarding?step=1
        │                                                      │
        │                                                      ▼
        │                                          (onboarding)/layout.tsx [no AppNav]
        │                                                      │
        │                                                      ▼
        │                                          /onboarding/page.tsx (Server Component)
        │                                           reads: step param + profile row
        │                                                      │
        │                                      ┌───────────────┼───────────────┐
        │                                      ▼               ▼               ▼
        │                                  StepProfile   StepDirectory   StepContact
        │                                   (Step 1)      (Step 2)        (Step 3)
        │                                      │               │               │
        │                                      │               │               ▼
        │                              ProfileCompletenessChecklist    markOnboardingComplete()
        │                              (live read from profile row)   Server Action on render
        │                                      │
        │                              CTA: /profile/edit?returnTo=/onboarding?step=1
        │                                      │
        │                              ProfileEditForm (client)
        │                              reads returnTo → router.push on success
        │
        └── onboarding_completed_at IS NOT NULL? ──► App proceeds normally
                                                              │
                                                    (app)/layout.tsx
                                                    reads profile row
                                                              │
                                                    onboarding_completed_at IS NULL?
                                                    ──YES──► AppNav "Finish setup →" link visible
                                                    ──NO──► Normal nav (link hidden)
```

### Recommended Project Structure

```
app/
├── (onboarding)/
│   ├── layout.tsx              # Distraction-free layout, no AppNav, mirrors (admin)/layout.tsx
│   └── onboarding/
│       └── page.tsx            # Server component; reads searchParams.step + profile row
components/
├── onboarding/
│   ├── WizardLayout.tsx        # Card + progress header + step body slot + footer
│   ├── ProgressIndicator.tsx   # 3 dots with active/completed/inactive states
│   ├── StepProfile.tsx         # Step 1 composition (ProfileCompletenessChecklist embed)
│   ├── StepDirectory.tsx       # Step 2 composition (informational)
│   └── StepContact.tsx         # Step 3 composition (informational, triggers completion)
lib/
├── actions/
│   └── onboarding.ts           # markOnboardingComplete() server action
supabase/
└── migrations/
    └── 009_onboarding.sql      # ADD COLUMN onboarding_completed_at + RLS policy
```

### Pattern 1: Route Group with Own Layout (established, mirrors admin)

**What:** A parenthesized folder `(onboarding)` in `app/` defines a layout scope without adding a URL segment.

**When to use:** Any section of the app needing distinct chrome (no AppNav, different background, different metadata).

**Established codebase pattern:**
```typescript
// app/(admin)/layout.tsx — reference implementation
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

**New pattern (onboarding) — no nav:**
```typescript
// app/(onboarding)/layout.tsx
import type { Metadata } from 'next'
import { Toaster } from '@/components/ui/sonner'

export const metadata: Metadata = {
  title: { default: 'Get started — Barterkin', template: '%s — Barterkin' },
}

export default function OnboardingLayout({ children }: { children: React.ReactNode }) {
  return (
    <main className="min-h-screen bg-sage-bg flex items-start justify-center px-4 py-12 sm:py-16">
      {children}
      <Toaster position="bottom-right" />
    </main>
  )
}
```
[VERIFIED: mirrors app/(auth)/layout.tsx and app/(admin)/layout.tsx patterns from codebase]

### Pattern 2: Middleware Redirect Guard (extend existing updateSession)

**What:** In `lib/supabase/middleware.ts`, add an onboarding check after the existing admin guard. Reads `onboarding_completed_at` from the profiles row. If NULL, redirect to `/onboarding`.

**Critical constraint:** Must add `/onboarding` to `ALWAYS_ALLOWED` to prevent an infinite redirect loop. The existing `ALWAYS_ALLOWED` array controls which paths bypass all redirect checks.

**Current ALWAYS_ALLOWED (from codebase inspection):**
```typescript
const ALWAYS_ALLOWED = [
  '/verify-pending',
  '/auth/callback',
  '/auth/confirm',
  '/auth/signout',
  '/auth/error',
  '/legal/',
]
```

**After modification:**
```typescript
const ALWAYS_ALLOWED = [
  '/verify-pending',
  '/auth/callback',
  '/auth/confirm',
  '/auth/signout',
  '/auth/error',
  '/legal/',
  '/onboarding',  // D-02: prevent redirect loop when user IS at /onboarding
]
```

**Intercept logic (insert after admin guard, before final return):**
```typescript
// D-02 / D-10: onboarding redirect — authed + verified + not already on /onboarding
const isOnboardingPath = pathname.startsWith('/onboarding')
const isAlwaysAllowed = ALWAYS_ALLOWED.some((p) => pathname.startsWith(p))

if (isAuthed && isVerified && !isOnboardingPath && !isAlwaysAllowed) {
  // Only query DB if user is on a path that could be intercepted
  const { data: profile } = await supabase
    .from('profiles')
    .select('onboarding_completed_at')
    .eq('owner_id', claims!.sub)
    .maybeSingle()

  if (profile && profile.onboarding_completed_at === null) {
    const url = request.nextUrl.clone()
    url.pathname = '/onboarding'
    url.search = ''
    return NextResponse.redirect(url)
  }
}
```

[ASSUMED] The middleware DB query adds ~10-30ms per request for users who have not completed onboarding. Once `onboarding_completed_at` is set, the query still runs but returns quickly. A future optimization would cache the flag in the JWT claims (custom claim via Supabase hook) — but that is out of scope for this phase.

**Performance note:** The `profiles` row is already RLS-protected. The `owner_id = claims.sub` predicate is served by the existing `profiles_username_idx`-adjacent index (owner_id has a UNIQUE constraint, so it is effectively indexed).

### Pattern 3: Server Action for Completion Write (D-11)

**What:** A `markOnboardingComplete()` server action writes `onboarding_completed_at = now()` when Step 3 is rendered.

**When to invoke:** Called in Step 3's server component render path — not on a button click. The decision is: reaching Step 3 = done, regardless of whether the user sent a contact.

**Pattern:**
```typescript
// lib/actions/onboarding.ts
'use server'
import { createClient } from '@/lib/supabase/server'

export async function markOnboardingComplete(): Promise<{ ok: boolean }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { ok: false }

  const { error } = await supabase
    .from('profiles')
    .update({ onboarding_completed_at: new Date().toISOString() })
    .eq('owner_id', user.id)
    .is('onboarding_completed_at', null)  // idempotent: only writes if still null

  if (error) {
    console.error('[markOnboardingComplete] update failed', { code: error.code })
    return { ok: false }
  }
  return { ok: true }
}
```

[VERIFIED: pattern matches existing `setPublished` server action in `lib/actions/profile.ts`]

**Calling from a Server Component:** Server actions can be called from server components directly — this is the correct pattern for "on render" side-effects in Next.js App Router. The call happens before the component returns JSX.

```typescript
// components/onboarding/StepContact.tsx
// This is a Server Component
import { markOnboardingComplete } from '@/lib/actions/onboarding'

export async function StepContact() {
  await markOnboardingComplete()
  // ... render step 3 JSX
}
```

### Pattern 4: Profile Edit Return Redirect (D-06)

**What:** After profile edit save, redirect to `/onboarding?step=1` instead of staying on the edit page.

**Current behavior (from ProfileEditForm.tsx inspection):** The form calls `saveProfile` server action, which returns `{ ok: true, slug }`. The form's `useEffect` on `state.ok` currently calls `toast('Profile saved.')` — it stays on the page.

**Required change:** When `/profile/edit` is accessed with `?returnTo=...`, the profile edit form should `router.push(returnTo)` on success instead of toasting in place.

**Implementation approach:** Pass `returnTo` as a prop from the page's `searchParams` into `ProfileEditForm`, and use `router.push(returnTo)` in the `useEffect` when `state.ok === true` and `returnTo` is set.

```typescript
// app/(app)/profile/edit/page.tsx — add searchParams reading
export default async function ProfileEditPage({
  searchParams,
}: {
  searchParams: Promise<{ returnTo?: string }>
}) {
  const { returnTo } = await searchParams
  // validate returnTo — must start with '/' and not be an external URL
  const safeReturnTo = returnTo?.startsWith('/') ? returnTo : undefined
  // ...
  return (
    <ProfileEditForm userId={user.id} defaultValues={...} returnTo={safeReturnTo} />
  )
}
```

```typescript
// components/profile/ProfileEditForm.tsx — add returnTo prop
useEffect(() => {
  if (state?.ok) {
    if (returnTo) {
      router.push(returnTo)
    } else {
      toast('Profile saved.')
    }
  }
}, [state, returnTo, router])
```

[VERIFIED: searchParams is async in Next.js 16 — must be awaited. Pattern matches Next.js App Router docs.]
[VERIFIED: ProfileEditForm is a client component ('use client') — router.push is available via useRouter.]

### Pattern 5: Conditional AppNav "Finish setup" Link (D-12)

**What:** Add a "Finish setup →" link to `AppNav` that appears only when `onboarding_completed_at IS NULL`.

**Where it lives:** `(app)/layout.tsx` already fetches the profile row for `display_name` and `avatar_url`. Extend that query to also select `onboarding_completed_at`.

**Current query (from codebase):**
```typescript
const { data: profile } = await supabase
  .from('profiles')
  .select('id, display_name, avatar_url')
  .eq('owner_id', userId)
  .maybeSingle()
```

**Extended query:**
```typescript
const { data: profile } = await supabase
  .from('profiles')
  .select('id, display_name, avatar_url, onboarding_completed_at')
  .eq('owner_id', userId)
  .maybeSingle()

const showFinishSetup = profile !== null && profile.onboarding_completed_at === null
```

Then pass `showFinishSetup` into `AppNav` (and onward into `NavLinks`), which renders the link conditionally.

**Resume step inference (CONTEXT D-04 specifics):**
```typescript
// The resume step is inferred from profile completeness:
// - Profile incomplete (any of 5 fields missing) → step=1
// - Profile complete → step=2 (or step=3 if we track last step, but DB has no last_step column)
// Simplest: always resume at step=1 if profile incomplete, step=2 if complete.
// No separate "last step reached" column is needed.
```

[ASSUMED] The CONTEXT says resume at "last step the user reached" but the DB schema (D-09) only stores `onboarding_completed_at`. There is no `onboarding_last_step` column. The inference from profile completeness (complete → resume at step 2, incomplete → resume at step 1) is the simplest implementation. Planner should decide whether step=3 resume is needed (only possible if user was on step 3 and dismissed — but D-11 marks completion on step 3 render, so dismissing from step 3 would have already completed the wizard). In practice: resume at max(1, completeness_step) is sufficient.

### Anti-Patterns to Avoid

- **Putting onboarding in a Dialog/Sheet:** CONTEXT D-01 explicitly rejects this. Use the dedicated route group.
- **Reading `onboarding_completed_at` from the JWT:** The field is in the profiles table, not auth.users. Claims-based fast path (getClaims) won't have it. Must query the DB.
- **Using `getSession()` in middleware for the onboarding check:** CLAUDE.md bans `getSession()` on server paths. Use `getClaims()` for auth identity, then a separate profiles query for `onboarding_completed_at`.
- **Calling `markOnboardingComplete()` on a button click:** D-11 says "when the user reaches and views Step 3" — call it during server component render, not client interaction. This is idempotent (`.is('onboarding_completed_at', null)` guard).
- **Redirecting from Step 3 immediately:** The step must render (so the user sees the content) before any redirect. Do not call `redirect()` in the same render as `markOnboardingComplete()`. The user clicks "I'm all set" to leave.
- **Forgetting to add `/onboarding` to ALWAYS_ALLOWED:** This causes an infinite redirect loop. This is the single highest-risk mistake in the middleware implementation.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Step container UI | Custom card component | Existing `Card` from `components/ui/card.tsx` | Already themed to sage-pale pattern |
| Completion checklist | Re-implementing 5-item check | `ProfileCompletenessChecklist` from `components/profile/` | Zero duplication, already correct (PROF-12 logic) |
| Disabled button tooltip | Custom tooltip implementation | shadcn `Tooltip` from `components/ui/tooltip.tsx` | Accessible, keyboard-aware, already installed |
| Error boundary display | Custom error div | `Alert` from `components/ui/alert.tsx` | Consistent styling, variant="destructive" |
| Route-group layout | Custom layout from scratch | Mirror `app/(admin)/layout.tsx` exactly | 15-line file; established pattern |
| Profile completeness logic | Re-implement 5-field check | `isProfileComplete()` from `lib/schemas/profile.ts` | Same function used by Phase 3's RLS policy |

**Key insight:** Phase 9 is almost entirely composition of existing code. The DB migration and middleware addition are the only net-new logic; all UI is assembly.

---

## Common Pitfalls

### Pitfall 1: Infinite Redirect Loop from Missing ALWAYS_ALLOWED Entry

**What goes wrong:** Middleware redirects user to `/onboarding`. The `/onboarding` request hits middleware again. Middleware checks `onboarding_completed_at` — still NULL — redirects again. Infinite loop, browser shows "Too many redirects."

**Why it happens:** `ALWAYS_ALLOWED` is the escape valve. If `/onboarding` is not in it, the intercept fires on the `/onboarding` request itself.

**How to avoid:** Add `'/onboarding'` to `ALWAYS_ALLOWED` BEFORE wiring the intercept logic. Deploy the migration and middleware change together, not separately.

**Warning signs:** Browser reports "ERR_TOO_MANY_REDIRECTS" or "This page isn't working" immediately after login for new users.

### Pitfall 2: Middleware DB Query Blocks All Authed Requests

**What goes wrong:** Every request from an authed user triggers a `SELECT onboarding_completed_at FROM profiles WHERE owner_id = $1` query — even after the user has completed onboarding. This adds 10-30ms to every server render.

**Why it happens:** The check is unconditional — it runs even when the user finished onboarding months ago.

**How to avoid:** Scope the query to only run when necessary. Option A: check `onboarding_completed_at` only on paths in `VERIFIED_REQUIRED_PREFIXES` (directory, profile, member pages) — this reduces surface to authenticated app paths. Option B: skip the query entirely if a session cookie / JWT custom claim signals completion (more complex, out of scope here). For MVP at low traffic, the unconditional query is acceptable — flag for optimization post-launch.

**Warning signs:** Noticeable latency increase on all app page loads; Supabase database CPU spike correlating with page views.

### Pitfall 3: ProfileEditForm returnTo Validation — Open Redirect

**What goes wrong:** `?returnTo=https://evil.com` passed to the profile edit page. The form redirects the user to an external site after saving.

**Why it happens:** returnTo is read from a query param which anyone can set to any value.

**How to avoid:** Validate returnTo in the page server component: `returnTo?.startsWith('/') ? returnTo : undefined`. Only allow relative paths (starting with `/`). Never allow protocol-relative or absolute external URLs.

**Warning signs:** Security audit flags `router.push(returnTo)` without validation.

### Pitfall 4: TypeScript Errors After Migration — Stale database.types.ts

**What goes wrong:** `profiles.onboarding_completed_at` exists in the DB but not in `Database['public']['Tables']['profiles']['Row']`. TypeScript errors when accessing the field.

**Why it happens:** `lib/database.types.ts` is generated from the current DB schema and must be regenerated after each migration.

**How to avoid:** Include `supabase gen types typescript --project-id $PROJECT_ID > lib/database.types.ts` as a mandatory step in Wave 0 (after migration runs). The CONTEXT.md canonical refs call this out explicitly.

**Warning signs:** TypeScript errors referencing `onboarding_completed_at` as "property does not exist."

### Pitfall 5: Step 3 Completion Fires Twice (Idempotency)

**What goes wrong:** User navigates to step 3, then back, then to step 3 again. `markOnboardingComplete()` is called twice. If the update is not guarded, it writes `now()` twice (harmless but wasteful).

**Why it happens:** Server component render = action call. Two renders = two calls.

**How to avoid:** Add `.is('onboarding_completed_at', null)` to the update query predicate. The second call finds no matching row (column is already set) and is a no-op.

**Warning signs:** None visible to user — but check server logs for unexpected update calls on step re-renders.

### Pitfall 6: AppNav Layout Query Missing onboarding_completed_at

**What goes wrong:** The `(app)/layout.tsx` profile query doesn't include `onboarding_completed_at`, so the "Finish setup" link is never shown (or always shown).

**Why it happens:** Forgetting to extend the existing `select()` call.

**How to avoid:** Extend the existing select: `'id, display_name, avatar_url, onboarding_completed_at'`. The column is owned by the same user (RLS owner policy allows it). No new RLS policy needed — existing "Owners see own profile" policy covers all profile columns.

### Pitfall 7: Middleware Query Uses Wrong Client

**What goes wrong:** Middleware uses the anon client with the user's cookie, but the `onboarding_completed_at` column is not in the anon SELECT policy's allowlist. Query returns NULL (no row) even when the user has a profile — middleware always redirects.

**Why it happens:** The existing "Owners see own profile" RLS policy covers all columns including the new one — but only when `auth.uid() = owner_id`. The middleware Supabase client IS the anon client configured with the user's cookie (same as existing admin guard logic) — so this should work. Verify the existing profile owner SELECT policy covers all columns (it does — it's a wildcard policy: `using (owner_id = auth.uid())`).

**How to avoid:** Confirm the existing "Owners see own profile" RLS policy on `profiles` covers the new column (it does — wildcards all columns). No new policy needed.

---

## Code Examples

### Migration: Add onboarding_completed_at

```sql
-- supabase/migrations/009_onboarding.sql
-- Phase 9: Onboarding Wizard state column
-- Requirement: D-09 — NULL = in progress, timestamp = completed

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS onboarding_completed_at timestamptz;

-- No new RLS policy needed.
-- Existing "Owners see own profile" (SELECT) policy covers all columns including this one.
-- Existing "Owners update own profile" (UPDATE) policy allows owners to write any non-banned column.
-- Server Action uses createClient() which operates as the authenticated user (owner) — RLS passes.
-- Middleware uses the anon client with user cookie — same RLS applies.

COMMENT ON COLUMN public.profiles.onboarding_completed_at IS
  'NULL = onboarding not yet completed. Set to now() when user views Step 3 of the wizard.';
```

### Middleware addition (insert after admin guard)

```typescript
// lib/supabase/middleware.ts — additions

// Add to ALWAYS_ALLOWED array:
'/onboarding',

// Add to updateSession(), after the admin guard block, before `return response`:
const isOnboardingRequired =
  isAuthed &&
  isVerified &&
  !pathname.startsWith('/onboarding') &&
  !ALWAYS_ALLOWED.some((p) => pathname.startsWith(p)) &&
  !pathname.startsWith('/admin')

if (isOnboardingRequired) {
  const { data: onboardingProfile } = await supabase
    .from('profiles')
    .select('onboarding_completed_at')
    .eq('owner_id', claims!.sub as string)
    .maybeSingle()

  // NULL means no profile yet OR profile exists but onboarding not complete — both redirect
  if (onboardingProfile?.onboarding_completed_at === undefined ||
      onboardingProfile?.onboarding_completed_at === null) {
    const url = request.nextUrl.clone()
    url.pathname = '/onboarding'
    url.search = ''
    return NextResponse.redirect(url)
  }
}
```

### Wizard page (server component)

```typescript
// app/(onboarding)/onboarding/page.tsx
import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { isProfileComplete } from '@/lib/schemas/profile'
import { WizardLayout } from '@/components/onboarding/WizardLayout'
import { StepProfile } from '@/components/onboarding/StepProfile'
import { StepDirectory } from '@/components/onboarding/StepDirectory'
import { StepContact } from '@/components/onboarding/StepContact'

export default async function OnboardingPage({
  searchParams,
}: {
  searchParams: Promise<{ step?: string }>
}) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('*, skills_offered(id)')
    .eq('owner_id', user.id)
    .maybeSingle()

  // If wizard already complete, skip to directory
  if (profile?.onboarding_completed_at) redirect('/directory')

  const { step: rawStep } = await searchParams
  const step = Math.max(1, Math.min(3, parseInt(rawStep ?? '1', 10) || 1))

  const completenessInput = {
    displayName: profile?.display_name,
    avatarUrl: profile?.avatar_url,
    countyId: profile?.county_id,
    categoryId: profile?.category_id,
    skillsOfferedCount: profile?.skills_offered?.length ?? 0,
  }
  const profileComplete = isProfileComplete(completenessInput)

  return (
    <WizardLayout currentStep={step}>
      {step === 1 && <StepProfile completenessInput={completenessInput} profileComplete={profileComplete} />}
      {step === 2 && <StepDirectory />}
      {step === 3 && <StepContact />}  {/* markOnboardingComplete() called inside StepContact */}
    </WizardLayout>
  )
}
```

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| `next-pwa` for PWA | Serwist | 2024 | Not relevant to this phase |
| Dialog/Sheet onboarding overlays | Dedicated route group with own layout | Established convention in this codebase | Simpler, no hydration complexity |
| Client-side onboarding state (localStorage) | DB column `onboarding_completed_at` | Project design decision | Server-authoritative, no client-sync bugs |

---

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | Middleware DB query for `onboarding_completed_at` adds ~10-30ms per request for new users. Acceptable at MVP traffic. | Architecture Patterns §Pattern 2 | Higher latency than expected; may need optimization sooner |
| A2 | Resume step inferred from profile completeness: incomplete → step=1, complete → step=2. No `onboarding_last_step` column. | Architecture Patterns §Pattern 5 | Users who dismissed from step 2 or 3 always resume at step 1 or 2 — slightly less ideal UX but functionally correct |
| A3 | Existing "Owners see own profile" RLS SELECT policy covers `onboarding_completed_at` without modification (wildcards all columns). | Common Pitfalls §Pitfall 7 | If policy uses explicit column list, new column is invisible to user's own queries |
| A4 | Existing "Owners update own profile" RLS UPDATE policy allows writing `onboarding_completed_at` (not in the banned fields list). | Code Examples §Migration | If policy rejects the column, `markOnboardingComplete()` silently fails |

**A3 and A4 can be verified in 30 seconds by reading the `003_profile_tables.sql` migration** — which was reviewed during research. The policies use `using (owner_id = auth.uid())` with no column restrictions, so A3 and A4 are effectively verified. [VERIFIED: `003_profile_tables.sql` lines 290-322]

---

## Open Questions

1. **Middleware query scope: all paths vs. verified-only paths**
   - What we know: The check costs a DB round-trip per request. For completed users, it's wasted.
   - What's unclear: Should the intercept only fire on paths in `VERIFIED_REQUIRED_PREFIXES` (directory, profile, member pages) to reduce surface area?
   - Recommendation: Scope to `VERIFIED_REQUIRED_PREFIXES` paths only — same as the email-verify check. This means users who directly navigate to `/` (landing) don't trigger the check. On first authenticated app-path request, they get redirected. Acceptable.

2. **Profile row absence: new user with no profile yet**
   - What we know: A new user who just verified email may not have a profile row yet (profile creation is via the edit form, not auth).
   - What's unclear: `maybeSingle()` returns `null` if no row. If `profile` is `null`, `profile?.onboarding_completed_at` is `undefined` — the middleware should treat this as "redirect to onboarding."
   - Recommendation: Treat `null` (no profile) the same as `{ onboarding_completed_at: null }` — redirect to onboarding. The onboarding wizard is the correct first step even for users without profiles. Step 1 shows the checklist with all items unchecked.

3. **`onboarding_completed_at` write failure on Step 3 render**
   - What we know: `markOnboardingComplete()` is called during server component render. If it fails (DB error), the step renders without setting the completion timestamp.
   - What's unclear: Should the wizard show an error, or silently degrade?
   - Recommendation: Silent degradation. The user sees Step 3 content; the completion write failing doesn't block them. Middleware will redirect them to `/onboarding` on the next request, but they can dismiss via "Skip for now" → `/directory`. Log the error server-side for monitoring.

---

## Environment Availability

Step 2.6: SKIPPED — This phase is purely code/config changes with no new external dependencies. Supabase (already provisioned), Next.js, and all npm packages are already installed and in use.

---

## Validation Architecture

`nyquist_validation: true` in `.planning/config.json`.

### Test Framework

| Property | Value |
|----------|-------|
| Framework | Vitest 4.1.x (unit) + Playwright 1.59.x (e2e) |
| Config file | `vitest.config.ts` (present), `playwright.config.ts` (present) |
| Quick run command | `pnpm test` (Vitest unit suite) |
| Full suite command | `pnpm test && pnpm e2e` |

### Phase Requirements → Test Map

| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| D-02 | Middleware redirects new verified user to `/onboarding` | e2e | `pnpm e2e --grep "onboarding-redirect"` | ❌ Wave 0 |
| D-03 | "Skip for now" dismisses to `/directory`, does not set `onboarding_completed_at` | e2e | `pnpm e2e --grep "onboarding-skip"` | ❌ Wave 0 |
| D-04 | AppNav "Finish setup →" visible when `onboarding_completed_at IS NULL`, hidden when set | e2e | `pnpm e2e --grep "finish-setup-nav"` | ❌ Wave 0 |
| D-09/D-11 | `markOnboardingComplete()` writes timestamp on Step 3 view | unit | `pnpm test -- onboarding-action` | ❌ Wave 0 |
| D-10 | Middleware reads `onboarding_completed_at`; completed user not redirected | e2e | `pnpm e2e --grep "onboarding-completed"` | ❌ Wave 0 |
| D-15 | Step 1 Next button disabled until all 5 checklist items green | e2e | `pnpm e2e --grep "step1-gate"` | ❌ Wave 0 |
| D-16 | Skip does not mark wizard complete (timestamp remains NULL) | e2e | `pnpm e2e --grep "onboarding-skip"` | ❌ Wave 0 |
| returnTo | Profile edit page returnTo redirects to `/onboarding?step=1` after save | unit | `pnpm test -- profile-edit-return` | ❌ Wave 0 |
| returnTo-security | Open redirect blocked: external returnTo silently ignored | unit | `pnpm test -- profile-edit-return` | ❌ Wave 0 |

### Sampling Rate

- **Per task commit:** `pnpm test` (Vitest unit suite, ~30s)
- **Per wave merge:** `pnpm test && pnpm e2e`
- **Phase gate:** Full suite green before `/gsd-verify-work`

### Wave 0 Gaps

- [ ] `tests/unit/onboarding-action.test.ts` — covers D-11 (markOnboardingComplete idempotency), returnTo validation
- [ ] `tests/e2e/onboarding-redirect.spec.ts` — covers D-02, D-03, D-04, D-10, D-15, D-16
- [ ] No framework install needed — Vitest and Playwright already configured

---

## Security Domain

### Applicable ASVS Categories

| ASVS Category | Applies | Standard Control |
|---------------|---------|-----------------|
| V2 Authentication | no | Wizard is post-auth; no auth logic |
| V3 Session Management | no | Session handling unchanged |
| V4 Access Control | yes | RLS owner policy covers `onboarding_completed_at`; middleware guards `/onboarding` path |
| V5 Input Validation | yes | `returnTo` query param validated server-side (relative-path-only check) |
| V6 Cryptography | no | No new crypto |

### Known Threat Patterns

| Pattern | STRIDE | Standard Mitigation |
|---------|--------|---------------------|
| Open redirect via `?returnTo=https://evil.com` | Spoofing | Validate returnTo starts with `/`; reject absolute URLs |
| Forced step skip (user manually sets `?step=3` to bypass step 1 gate) | Tampering | Step completeness re-checked server-side on each render; middleware intercept is stateless |
| Direct `profiles` update to set `onboarding_completed_at` by non-owner | Tampering | RLS "Owners update own profile" policy: `using (owner_id = auth.uid())` prevents |
| JWT claim `email_verified` spoofing on onboarding path | Tampering | Existing middleware uses `getUser()` fallback for OAuth users (already implemented) |

---

## Sources

### Primary (HIGH confidence)
- [VERIFIED: codebase] `lib/supabase/middleware.ts` — existing `ALWAYS_ALLOWED`, `updateSession()`, admin guard pattern
- [VERIFIED: codebase] `components/profile/ProfileCompletenessChecklist.tsx` — 5-field check component, `ProfileCompletenessInput` type
- [VERIFIED: codebase] `app/(admin)/layout.tsx` — route-group layout reference (no AppNav pattern)
- [VERIFIED: codebase] `app/(auth)/layout.tsx` — distraction-free layout reference
- [VERIFIED: codebase] `app/(app)/layout.tsx` — AppNav profile query, extendable for `onboarding_completed_at`
- [VERIFIED: codebase] `lib/actions/profile.ts` — server action pattern (`setPublished`, `saveProfile`)
- [VERIFIED: codebase] `lib/schemas/profile.ts` — `isProfileComplete()`, `ProfileCompletenessInput` type
- [VERIFIED: codebase] `supabase/migrations/003_profile_tables.sql` — profiles RLS policies (wildcard SELECT/UPDATE)
- [VERIFIED: codebase] `components/profile/ProfileEditForm.tsx` — current save behavior (toast-in-place, no redirect)
- [VERIFIED: codebase] `components/layout/NavLinks.tsx` — existing nav link pattern
- [VERIFIED: UI-SPEC] `09-UI-SPEC.md` — approved component inventory, copy, color, spacing contracts

### Secondary (MEDIUM confidence)
- [ASSUMED] Middleware DB query latency estimate (10-30ms) — based on Supabase free-tier documented response times; no direct measurement in this project

---

## Project Constraints (from CLAUDE.md)

Directives that apply to this phase:

1. **No `supabase.auth.getSession()` on any server path** — middleware must use `getClaims()` for identity; profiles query uses the anon client with cookie (existing pattern).
2. **`@supabase/ssr@0.10.x` only** — no auth-helpers-nextjs.
3. **Server Actions for profile mutations** — `markOnboardingComplete()` is a server action, consistent with the mandate.
4. **`SUPABASE_SERVICE_ROLE_KEY` is server-only** — middleware already uses the publishable (anon) key; no changes needed.
5. **Tailwind v4 CSS-first** — all new components use `bg-sage-pale`, `text-forest-mid`, etc. as CSS custom properties already defined in `app/globals.css`. No inline hex values.
6. **shadcn new-york preset** — all new UI compositions use existing shadcn primitives. No new primitives introduced (confirmed by UI-SPEC Registry Safety section).
7. **pnpm** — install commands use pnpm (no new installs needed this phase).
8. **TypeScript strict** — all new files must satisfy `pnpm typecheck`. Regenerate `lib/database.types.ts` after migration.

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — no new libraries; all confirmed present in codebase
- Architecture: HIGH — direct extension of established patterns (middleware guard, route groups, server actions)
- Pitfalls: HIGH — infinite redirect loop and open redirect are well-known; others verified against codebase
- Middleware query performance: MEDIUM — estimated, not measured

**Research date:** 2026-04-22
**Valid until:** 2026-05-22 (stable stack — no fast-moving dependencies)
