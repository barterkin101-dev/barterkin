# Phase 5: Contact Relay + Trust (joined) - Pattern Map

**Mapped:** 2026-04-21
**Files analyzed:** 24 new/modified files
**Analogs found:** 22 / 24

---

## File Classification

| New/Modified File | Role | Data Flow | Closest Analog | Match Quality |
|-------------------|------|-----------|----------------|---------------|
| `supabase/functions/send-contact/index.ts` | edge-function | request-response + event-driven | `app/api/test-email/route.ts` (Resend) + `lib/utils/rate-limit.ts` (RPC pattern) | partial (no existing Edge Function analog) |
| `supabase/functions/send-contact/deno.json` | config | — | No analog (first Deno function) | none |
| `supabase/functions/send-contact/email.tsx` (inlined for Deno) | email-template | transform | `emails/contact-relay.tsx` (same phase, paired) | n/a |
| `supabase/migrations/005_contact_relay_trust.sql` | migration | schema | `supabase/migrations/003_profile_tables.sql` + `004_directory_search.sql` | exact |
| `app/api/webhooks/resend/route.ts` | route-handler | event-driven (webhook) | `app/api/test-email/route.ts` | role-match |
| `lib/actions/contact.ts` | server-action | CRUD + request-response | `lib/actions/profile.ts` (`saveProfile`, `setPublished`) | exact |
| `lib/actions/contact.types.ts` | types | — | `lib/actions/profile.types.ts` | exact |
| `lib/schemas/contact.ts` | schema | validation | `lib/schemas/profile.ts` | exact |
| `emails/contact-relay.tsx` | email-template | transform | No analog (first React Email in repo) | none (use RESEARCH §Pattern 5) |
| `components/profile/ContactButton.tsx` | component (client) | event-driven (open sheet) | `components/profile/PublishToggle.tsx` | role-match |
| `components/profile/ContactForm.tsx` | component (client form) | request-response | `components/profile/ProfileEditForm.tsx` | exact |
| `components/profile/ContactSuccessState.tsx` | component (client) | presentational | `app/(app)/profile/page.tsx` empty-state block | partial |
| `components/profile/OverflowMenu.tsx` | component (client) | event-driven | No existing DropdownMenu consumer; `components/profile/PublishToggle.tsx` (form + action) is closest | partial |
| `components/profile/BlockDialog.tsx` | component (client) | request-response (confirm→action) | `components/profile/PublishToggle.tsx` (action invocation + toast) | role-match |
| `components/profile/ReportDialog.tsx` | component (client form) | request-response | `components/profile/ProfileEditForm.tsx` (RHF + action) | role-match |
| `components/profile/ProfileCard.tsx` (edit) | component (server) | presentational | (self — extend existing) | n/a |
| `components/layout/NavLinks.tsx` (edit) | component (client) | presentational + count badge | (self — extend; badge pattern from `components/directory/DirectoryCard.tsx` Badge usage) | n/a |
| `app/(app)/layout.tsx` (edit) | server component | request-response | (self — extend existing fetch block) | n/a |
| `app/(app)/profile/page.tsx` (edit) | server component | CRUD (UPDATE seen_at) | (self — add markContactsSeen call) | n/a |
| `app/(app)/m/[username]/page.tsx` (edit) | server component | presentational | (self — add viewer context props) | n/a |
| `components/ui/sheet.tsx` | ui primitive | — | shadcn add (generated) | n/a |
| `components/ui/dropdown-menu.tsx` | ui primitive | — | shadcn add (generated) | n/a |
| `components/ui/select.tsx` | ui primitive | — | shadcn add (generated) | n/a |
| `tests/unit/contact-schema.test.ts` | test | unit | `tests/unit/profile-schema.test.ts` | exact |
| `tests/unit/contact-eligibility.test.ts` | test | RLS/RPC | `tests/unit/directory-rls-visibility.test.ts` | exact |
| `tests/unit/resend-webhook.test.ts` | test | route-handler | `tests/unit/rate-limit.test.ts` (vi.mock pattern) | role-match |
| `tests/unit/reports-rls.test.ts` | test | RLS | `tests/unit/directory-rls-visibility.test.ts` | exact |
| `tests/e2e/contact-relay.spec.ts` | test (e2e) | user flow | `tests/e2e/directory-card-render.spec.ts` | exact |
| `tests/e2e/contact-rate-limit.spec.ts` | test (e2e) | user flow | `tests/e2e/directory-card-render.spec.ts` | role-match |
| `tests/e2e/block-flow.spec.ts` | test (e2e) | user flow | `tests/e2e/directory-card-render.spec.ts` | role-match |
| `tests/e2e/report-flow.spec.ts` | test (e2e) | user flow | `tests/e2e/directory-card-render.spec.ts` | role-match |
| `tests/e2e/unseen-badge.spec.ts` | test (e2e) | user flow | `tests/e2e/directory-card-render.spec.ts` | role-match |
| `tests/e2e/ban-enforcement.spec.ts` | test (e2e) | user flow | `tests/e2e/directory-card-render.spec.ts` | role-match |

---

## Pattern Assignments

### `lib/schemas/contact.ts` (schema, validation)

**Analog:** `lib/schemas/profile.ts`

**Imports + export pattern** (lines 1, 15, 59–61):
```typescript
import { z } from 'zod'

export const ProfileFormSchema = z.object({ /* ... */ })

export type ProfileFormValues = z.infer<typeof ProfileFormSchema>
```

**Bounded string pattern with trim + min/max messages** (lines 17–21):
```typescript
displayName: z
  .string()
  .trim()
  .min(1, 'Display name is required.')
  .max(60, 'Display name must be 60 characters or fewer.'),
```

**Enum pattern (for report reason enum)** — use zod `z.enum([...] as const)`:
```typescript
// Mirror pattern of SetPublishedSchema in lib/actions/profile.ts lines 193–196
const SetPublishedSchema = z.object({
  profileId: z.string().uuid(),
  publish: z.enum(['true', 'false']),
})
```

**Per-requirement JSDoc header** (lines 2–14) — replicate for CONT-02/TRUST-01 requirement traceability:
```typescript
/**
 * ProfileFormSchema — single source of truth for profile edit payloads.
 * Consumed identically by the client (RHF + zodResolver) and the server
 * (safeParse inside the profile server action in Plan 03).
 *
 * Requirement coverage:
 *   PROF-01 — displayName + bio length bounds
 *   ...
 */
```

**Phase 5 schema to copy:**
- `MessageSchema` (20–500 char `.trim()` on message, plus `recipientProfileId: z.string().uuid()`)
- `ReportReasonEnum = z.enum(['harassment','spam','off-topic','impersonation','other'] as const)`
- `ReportSchema` wrapping reason + `note: z.string().max(500).optional().or(z.literal(''))`

---

### `lib/actions/contact.ts` (server-action, CRUD + request-response)

**Analog:** `lib/actions/profile.ts`

**Module header + imports** (lines 1–18):
```typescript
'use server'

import { z } from 'zod'
import { createClient } from '@/lib/supabase/server'
import { ProfileFormSchema } from '@/lib/schemas/profile'
// ...
import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '@/lib/database.types'
```

**Auth pattern — `getUser()` for DML identity (Pitfall 4 — NEVER `getSession`)** (lines 78–84):
```typescript
const supabase = await createClient()
// Pitfall 4: getUser() for DML identity — not getSession()/getClaims().
const {
  data: { user },
  error: authError,
} = await supabase.auth.getUser()
if (authError || !user) return { ok: false, error: 'Not authenticated.' }
```

**useActionState-compatible signature** (lines 74–77):
```typescript
export async function saveProfile(
  _prev: SaveProfileResult | null,
  formData: FormData,
): Promise<SaveProfileResult> {
```

**Zod parse + flattened fieldErrors + PII-safe logging** (lines 86–96):
```typescript
const parsed = ProfileFormSchema.safeParse(input)
if (!parsed.success) {
  // Never log field values (PII). Return flattened errors to UI.
  console.error('[saveProfile] zod validation failed', { issues: parsed.error.issues.length })
  return {
    ok: false,
    error: 'Please fix the highlighted fields.',
    fieldErrors: parsed.error.flatten().fieldErrors as Record<string, string[]>,
  }
}
```

**DB error handling pattern — generic user copy, code-only log, no PII** (lines 105–108, 135–154):
```typescript
if (fetchError) {
  console.error('[saveProfile] fetch existing failed', { code: fetchError.code })
  return { ok: false, error: 'Something went wrong. Please try again.' }
}
```

**Unique-violation (`23505`) retry/rejection pattern** (lines 136–154, 498 in RESEARCH skeleton) — for Phase 5 the dedupe unique index on `contact_requests` maps to a "you already contacted this member" UI error instead of retry:
```typescript
if (upsertError.code === '23505' && !existing?.username) {
  // retry with uuid suffix — profile pattern
}
// Phase 5 variant: on 23505 return { ok: false, code: 'pair_dup', error: "You've already contacted this member recently." }
```

**Second action in same file — `setPublished` pattern for `blockMember`, `reportMember`, `markContactsSeen`** (lines 198–269):
```typescript
const SetPublishedSchema = z.object({
  profileId: z.string().uuid(),
  publish: z.enum(['true', 'false']),
})

export async function setPublished(
  _prev: SetPublishedResult | null,
  formData: FormData,
): Promise<SetPublishedResult> {
  const supabase = await createClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) return { ok: false, error: 'Not authenticated.' }

  const parsed = SetPublishedSchema.safeParse({
    profileId: formData.get('profileId'),
    publish: formData.get('publish'),
  })
  if (!parsed.success) return { ok: false, error: 'Invalid request.' }
  // ... RLS-guarded UPDATE ...
}
```

**`sendContactRequest` proxy-to-Edge-Function pattern (NEW for Phase 5)** — from RESEARCH §Code Examples Common Operation 1 (lines 1025–1077): build on the above pattern but add the documented ONE-TIME legitimate use of `supabase.auth.getSession()` to extract `access_token` for forwarding to the Edge Function. Comment the exception inline per Pitfall §1 exception carve-out.

**`blockMember` pattern (NEW)** — from RESEARCH §Code Examples Common Operation 2 (lines 1083–1109): `upsert` with `onConflict: 'blocker_id,blocked_id', ignoreDuplicates: true`, then `revalidatePath('/directory')` + `revalidatePath('/m/...')` + `redirect('/directory?blocked=...')`.

---

### `lib/actions/contact.types.ts` (types)

**Analog:** `lib/actions/profile.types.ts` (entire file, 26 lines)

**Full pattern to copy:**
```typescript
import type { Database } from '@/lib/database.types'

export interface SaveProfileResult {
  ok: boolean
  error?: string
  fieldErrors?: Record<string, string[]>
  slug?: string
}

export interface SetPublishedResult {
  ok: boolean
  error?: string
  missingFields?: Array<'displayName' | 'avatarUrl' | 'countyId' | 'categoryId' | 'skillsOffered'>
}

export type ProfileRow = Database['public']['Tables']['profiles']['Row']
```

**Phase 5 types to add:**
- `SendContactResult` = `{ ok: boolean; code?: 'unauthorized'|'bad_message'|'daily_cap'|'weekly_cap'|'pair_cap'|'pair_dup'|'sender_banned'|'recipient_unreachable'|'not_accepting'|'sender_blocked'|'send_failed'|'unknown'; error?: string }` (codes enumerated per RESEARCH §Edge Function skeleton lines 455–499)
- `BlockMemberResult` / `ReportMemberResult` — same `ok|error|code` envelope
- `ContactRequestRow = Database['public']['Tables']['contact_requests']['Row']`

---

### `supabase/migrations/005_contact_relay_trust.sql` (migration, schema)

**Analog:** `supabase/migrations/003_profile_tables.sql` (primary) + `supabase/migrations/004_directory_search.sql` (secondary — for ALTER POLICY + trigger patterns)

**Header comment with requirement coverage** (003 lines 1–6):
```sql
-- Phase 3 — Profile & Georgia Gate
-- Requirements: PROF-01..PROF-14, GEO-01, GEO-02
-- See: .planning/phases/03-profile-georgia-gate/03-RESEARCH.md §Database Schema
-- Depends on: 002_auth_tables.sql (public.current_user_is_verified())
```

**Phase 5 header to write:**
```sql
-- Phase 5 — Contact Relay + Trust (joined)
-- Requirements: CONT-01..CONT-11, TRUST-01..TRUST-07
-- See: .planning/phases/05-contact-relay-trust-joined/05-RESEARCH.md §Architecture Patterns
-- Depends on: 003_profile_tables.sql (profiles.banned, profiles.accepting_contact),
--             002_auth_tables.sql (public.current_user_is_verified())
```

**Table creation + RLS enable pattern** (003 lines 219–247):
```sql
create table public.profiles (
  id                uuid primary key default gen_random_uuid(),
  owner_id          uuid not null unique references auth.users(id) on delete cascade,
  -- ... columns with inline CHECK constraints ...
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now(),
  constraint profiles_publish_requires_identity check (is_published = false OR (display_name is not null AND username is not null))
);
alter table public.profiles enable row level security;
```

**RLS policy pattern — owner self-write with `WITH CHECK`** (003 lines 299–322, critical for Pitfall §6 — "default-allow on insert/update"):
```sql
create policy "Verified users create own profile"
  on public.profiles for insert to authenticated
  with check (owner_id = auth.uid() AND public.current_user_is_verified());

create policy "Owners update own profile, publish only when complete"
  on public.profiles for update to authenticated
  using (owner_id = auth.uid())
  with check (
    owner_id = auth.uid()
    AND banned = false
    AND ( /* ... */ )
  );
```

**SECURITY DEFINER function + search_path pattern** (003 lines 250–253, 004 lines 13–39):
```sql
create or replace function public.set_updated_at()
  returns trigger language plpgsql
  security definer set search_path = public, pg_temp
  as $$ begin new.updated_at = now(); return new; end; $$;

-- Execute-permission tightening (004 line 39):
revoke execute on function public.refresh_profile_search_text(uuid) from public;
```

**DROP + RECREATE policy pattern for ALTERing directory visibility to include blocks check** (004 lines 57–60) — mirrors how Phase 5 will tighten the `Verified members see published non-banned profiles` policy:
```sql
drop trigger if exists profiles_refresh_search on public.profiles;
create trigger profiles_refresh_search /* ... */
```

**Phase 5 specifics (NEW, use RESEARCH §Pattern 3 lines 584–628 as the copy source):**
- `contact_requests (id uuid pk, sender_id uuid→profiles, recipient_id uuid→profiles, message text check 20..500, status text check in ('sent','delivered','bounced','complained','failed'), resend_id text, seen_at timestamptz, created_at timestamptz)` + partial unique index `(sender_id, recipient_id, (created_at::date)) where status = 'sent'`
- `blocks (blocker_id uuid, blocked_id uuid, created_at timestamptz, pk(blocker_id, blocked_id), check(blocker_id<>blocked_id))`
- `reports (id uuid pk, reporter_id uuid, target_profile_id uuid, reason text check in (enum), note text check <=500, status text default 'pending', created_at timestamptz)`
- `contact_eligibility(p_sender_owner_id, p_recipient_profile_id)` SECURITY DEFINER RPC, `REVOKE EXECUTE FROM anon, authenticated; GRANT EXECUTE TO service_role`
- DROP + recreate `Verified members see published non-banned profiles` policy to add `AND NOT EXISTS (SELECT 1 FROM blocks ...)` per RESEARCH lines 609–628

**Index pattern** (003 lines 259–261, 004 lines 89–111):
```sql
create index profiles_published_idx on public.profiles(is_published, banned) where is_published = true and banned = false;
```
→ Phase 5 equivalents: `contact_requests_sender_created_idx`, `contact_requests_pair_created_idx`, `contact_requests_recipient_unseen_idx WHERE seen_at IS NULL`.

---

### `app/api/webhooks/resend/route.ts` (route-handler, event-driven)

**Analog:** `app/api/test-email/route.ts`

**Imports + runtime declaration** (lines 1–5):
```typescript
import { NextResponse } from 'next/server'
import { Resend } from 'resend'

// Node runtime — resend SDK uses Node APIs.
export const runtime = 'nodejs'
```

**Env guard pattern** (lines 12–22):
```typescript
if (process.env.NODE_ENV === 'production') {
  return NextResponse.json({ error: 'disabled in production' }, { status: 404 })
}

const apiKey = process.env.RESEND_API_KEY
if (!apiKey) {
  return NextResponse.json(
    { error: 'RESEND_API_KEY not configured — populate .env.local' },
    { status: 500 },
  )
}
```

**Response pattern** (lines 26–45):
```typescript
if (!to) {
  return NextResponse.json({ error: 'missing `to` field in body' }, { status: 400 })
}
// ...
if (error) {
  return NextResponse.json({ error: error.message }, { status: 500 })
}
return NextResponse.json({ ok: true, id: data?.id })
```

**Phase 5 webhook-specific additions (NEW, from RESEARCH §Pattern 4 lines 631–681):**
- Read **raw body** via `await req.text()` (signature is byte-sensitive — do NOT `req.json()` first)
- Call `resend.webhooks.verify({ payload, headers: { id, timestamp, signature }, webhookSecret })`
- Switch on `event.type`: `email.bounced`→`bounced`, `email.complained`→`complained`, `email.delivered`→`delivered`, `email.failed`→`failed`
- Update `contact_requests` via `supabaseAdmin` from `lib/supabase/admin.ts` (pattern ALREADY noted in `admin.ts` line 12 comment: "Plan 05 does NOT use this; ... but admin.ts is safe for webhook route handlers.")

**Middleware exclusion (ALREADY DONE)** — `middleware.ts` line 20 matcher already excludes `api/webhooks`. No change needed.

---

### `supabase/functions/send-contact/index.ts` (edge-function, request-response + event-driven)

**Analog:** partial — no existing Edge Function in repo. Closest analogs:
- `app/api/test-email/route.ts` — for the `Resend.emails.send()` call shape
- `lib/actions/profile.ts` — for the auth + zod-parse + DB-error-handling flow
- `lib/utils/rate-limit.ts` — for the `supabase.rpc(...)` SECURITY DEFINER invocation pattern

**Auth invocation pattern from `rate-limit.ts`** (lines 21–38):
```typescript
const supabase = await createClient()
const { data, error } = await supabase.rpc('check_signup_ip', { p_ip: cleanIp })

if (error) {
  console.error('[rate-limit] check_signup_ip RPC failed', {
    ip_prefix: cleanIp.slice(0, 8),
    code: error.code,
    message: error.message,
  })
  return { allowed: true }  // fail-OPEN in phase 2
}
```

**Resend send call pattern from `test-email/route.ts`** (lines 30–45):
```typescript
const resend = new Resend(apiKey)
const { data, error } = await resend.emails.send({
  from: 'Barterkin <hello@barterkin.com>',
  to: [to],
  subject: 'Barterkin Phase 1 — Resend test send',
  text: '...',
})
if (error) return NextResponse.json({ error: error.message }, { status: 500 })
return NextResponse.json({ ok: true, id: data?.id })
```

**Phase 5 Edge Function — FULL skeleton in RESEARCH §Pattern 1 lines 383–555.** Key deltas from Next.js analogs:
- Deno runtime: `npm:@supabase/supabase-js@2.103.3`, `npm:resend@6.12.2`, `npm:posthog-node@5.29.2` specifiers
- Service-role client constructed inline (NOT imported from `lib/supabase/admin.ts`): `createClient(supabaseUrl, serviceRoleKey, { auth: { persistSession: false, autoRefreshToken: false }})`
- JWT extraction: `Authorization: Bearer <jwt>` → `supabase.auth.getUser(jwt)` (NOT `getUser()` without arg — Edge Function has no cookies)
- Eligibility via single `supabase.rpc('contact_eligibility', {...}).single()` — the SECURITY DEFINER function in migration 005
- Rate-limit COUNT queries pattern: `.select('id', { count: 'exact', head: true }).eq(...).gte('created_at', ...).eq('status', 'sent')`
- Error envelope (copy from RESEARCH lines 454–459, 471–488): always `{ code, error }` with HTTP 403/429/500/502 status codes — maps to `SendContactResult.code` in the server action caller
- **CRITICAL**: `await posthog.shutdown()` BEFORE `return new Response(...)` per Pitfall "Resend webhook race with PostHog send" (RESEARCH lines 859–866)
- Deno-native `crypto.subtle.digest('SHA-256', ...)` for `hashId()` anonymization (RESEARCH lines 550–554) — NOT Node's `crypto` module

**Deno config** — `supabase/functions/send-contact/deno.json` per RESEARCH lines 559–568.

---

### `components/profile/ContactForm.tsx` (component, client form)

**Analog:** `components/profile/ProfileEditForm.tsx`

**Client directive + RHF+zodResolver+useActionState imports** (lines 1–23):
```typescript
'use client'
import { useActionState, useEffect } from 'react'
import { useForm, FormProvider, Controller } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { toast } from 'sonner'
import {
  Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage,
} from '@/components/ui/form'
import { Textarea } from '@/components/ui/textarea'
import { Button } from '@/components/ui/button'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { AlertCircle } from 'lucide-react'
import { saveProfile } from '@/lib/actions/profile'
```

**useActionState + useForm wiring** (lines 36–56):
```typescript
const [state, formAction, pending] = useActionState<SaveProfileResult | null, FormData>(
  saveProfile,
  null,
)

const form = useForm<ProfileFormValues>({
  resolver: zodResolver(ProfileFormSchema) as any,
  defaultValues: { /* ... */ },
})
```

**Character counter in FormDescription** (lines 143, 233):
```typescript
<FormDescription>Optional. Up to 500 characters. {(field.value ?? '').length}/500</FormDescription>
```
→ Phase 5: `{(field.value ?? '').length}/500` for the 20..500 message field.

**Inline Alert for server error (D-03 pattern)** (lines 103–108):
```typescript
{state && !state.ok && state.error && !state.fieldErrors && (
  <Alert variant="destructive">
    <AlertCircle className="h-4 w-4" />
    <AlertDescription>{state.error}</AlertDescription>
  </Alert>
)}
```
→ Phase 5 D-03: render this inline WITHIN the Sheet so Sheet stays open on rate-limit / eligibility rejection. Map `state.code` → specific user-facing copy per RESEARCH §Edge Function skeleton lines 455–499.

**Server→client fieldError mapping** (lines 67–76):
```typescript
useEffect(() => {
  if (state && !state.ok && state.fieldErrors) {
    const msgs = state.fieldErrors
    for (const [key, errors] of Object.entries(msgs)) {
      if (errors && errors.length > 0) {
        form.setError(key as keyof ProfileFormValues, { message: errors[0] })
      }
    }
  }
}, [state, form])
```

**FormData serialization** (lines 79–92):
```typescript
function onSubmit(values: ProfileFormValues) {
  const fd = new FormData()
  fd.set('displayName', values.displayName)
  // ...
  formAction(fd)
}
```

**Submit button with pending state** (lines 283–287):
```typescript
<Button type="submit" size="lg" disabled={pending} className="min-w-[160px]">
  {pending ? 'Saving...' : 'Save profile'}
</Button>
```
→ Phase 5: `{pending ? 'Sending…' : `Send message`}` for D-01.

---

### `components/profile/ContactButton.tsx` (component, event-driven shell)

**Analog:** `components/profile/PublishToggle.tsx`

**Client directive + action import + toast** (lines 1–15):
```typescript
'use client'
import { useActionState, useEffect } from 'react'
import { toast } from 'sonner'
import { setPublished } from '@/lib/actions/profile'
```

**Success-side-effect useEffect** (lines 34–43) — Phase 5 D-02 uses this to swap the Sheet into `<ContactSuccessState />` rather than toast:
```typescript
useEffect(() => {
  if (state?.ok) {
    toast(isPublished ? 'Profile unpublished.' : 'Profile published.')
  } else if (state && state.ok === false && state.error) {
    toast.error(state.error)
  }
}, [state])
```

**Form wrapping the Switch — pattern to copy for Sheet-wrapped Contact form** (lines 45–63):
```typescript
<form action={formAction} className="inline-flex">
  <input type="hidden" name="profileId" value={profileId} />
  <input type="hidden" name="publish" value={isPublished ? 'false' : 'true'} />
  <Switch /* ... */ />
</form>
```

**Phase 5 specifics (NEW):**
- Wrap `<Sheet>` (new shadcn primitive) around the Contact form
- D-02: conditional render — swap form for `<ContactSuccessState />` when `state?.ok === true`
- D-03: rate-limit / eligibility `state.code` branches to inline `<Alert variant="destructive">` within the Sheet — NO toast

---

### `components/profile/BlockDialog.tsx` (component, confirm→action)

**Analog:** `components/profile/PublishToggle.tsx` (form + action invocation + post-success side effects)

**Form + hidden input pattern** (PublishToggle lines 46–48):
```typescript
<form action={formAction} className="inline-flex">
  <input type="hidden" name="profileId" value={profileId} />
  <input type="hidden" name="publish" value={isPublished ? 'false' : 'true'} />
```
→ Phase 5: hidden inputs for `blockedOwnerId`, `blockedDisplayName`, `blockedUsername`.

**Tooltip/dialog wrapping pattern** (lines 73–91):
```typescript
<TooltipProvider>
  <Tooltip>
    <TooltipTrigger asChild>
      <span>{switchEl}</span>
    </TooltipTrigger>
    <TooltipContent /* ... */>
      <ProfileCompletenessChecklist {...completeness} />
    </TooltipContent>
  </Tooltip>
</TooltipProvider>
```
→ Phase 5: swap `Tooltip*` for `AlertDialog*` from `components/ui/alert-dialog.tsx` (already installed). The `[Block] / [Cancel]` buttons submit the enclosing form.

**Phase 5-specific:** The `blockMember` server action uses `redirect('/directory?blocked=…')` (RESEARCH lines 1108) which bypasses the `useActionState` return — so the post-success `toast` surfaces on `/directory` via URL param, not via useEffect on this component. Different pattern than PublishToggle.

---

### `components/profile/ReportDialog.tsx` (component, client form)

**Analog:** `components/profile/ProfileEditForm.tsx` (RHF + action + inline error) + `components/profile/CategoryPicker.tsx` (controlled RadioGroup / Select pattern)

**RadioGroup-as-Controller pattern from CategoryPicker** (lines 12–44) — for the **reason Select dropdown** (D-07), swap RadioGroup for the new `components/ui/select.tsx` primitive:
```typescript
<RadioGroup
  value={value != null ? String(value) : ''}
  onValueChange={(v) => onChange(Number(v))}
>
```

**FormField with Controller for controlled dropdown** (ProfileEditForm lines 190–203):
```typescript
<Controller
  name="countyId"
  control={form.control}
  render={({ field }) => (
    <FormItem>
      <FormLabel>County</FormLabel>
      <CountyCombobox value={field.value} onChange={field.onChange} />
      <FormMessage />
    </FormItem>
  )}
/>
```

**Phase 5 specifics:** Dialog wraps the form (not AlertDialog — a full Dialog per D-07). On submit success, inline confirmation text ("Report submitted. We'll review it.") replaces the form body for ~2s, then the Dialog auto-closes or user clicks [Close].

---

### `emails/contact-relay.tsx` (email-template, transform)

**No codebase analog** — first React Email template. Use RESEARCH §Pattern 5 lines 692–755 as the copy source.

**Brand tokens to use** (extracted from existing `components/profile/ProfileCard.tsx` + `AppNav.tsx`):
- Forest-deep text: `#1e4420` (ProfileCard `text-forest-deep`)
- Sage backgrounds: `#eef3e8` (pale), `#f4f7f0` (bg) — used in ProfileCard + AppNav
- Clay accent (buttons, border-left quote): `#c4956a` — matches UI-SPEC CTA color
- Fonts: `Lora, Georgia, serif` for headings; `Inter, Arial, sans-serif` for body — matches `font-serif` Tailwind class in ProfileCard

---

### `app/(app)/layout.tsx` (edit) (server component)

**Analog:** self (existing file lines 1–39).

**Fetch-then-pass-to-client-nav pattern** (lines 10–32):
```typescript
export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient()
  const { data } = await supabase.auth.getClaims()
  const claims = data?.claims
  // ...
  if (claims?.sub) {
    const { data: profile } = await supabase
      .from('profiles')
      .select('display_name, avatar_url')
      .eq('owner_id', claims.sub as string)
      .maybeSingle()
    // ...
  }
  return (
    <div className="min-h-screen bg-sage-bg">
      <AppNav displayName={displayName} avatarUrl={avatarUrl} />
      {/* ... */}
    </div>
  )
}
```

**Phase 5 extension:** Add a `count(*)` query for unseen contacts (D-09), pass `unseenContactCount` prop to `AppNav` → `NavLinks`:
```typescript
let unseenContactCount = 0
if (claims?.sub) {
  const { count } = await supabase
    .from('contact_requests')
    .select('id', { count: 'exact', head: true })
    .eq('recipient_id', /* resolve profile.id from owner_id=claims.sub */)
    .is('seen_at', null)
  unseenContactCount = count ?? 0
}
```

---

### `components/layout/NavLinks.tsx` (edit) (component, client)

**Analog:** self + `components/ui/badge.tsx` (already imported in `DirectoryCard.tsx` line 4).

**Existing nav link structure** (lines 32–41):
```typescript
<Link href="/profile" className="flex items-center gap-2 text-sm text-forest-mid hover:text-forest-deep">
  <Avatar className="h-8 w-8 border border-sage-light">
    <AvatarImage src={avatarUrl ?? undefined} alt={displayName ?? ''} />
    <AvatarFallback>{initial}</AvatarFallback>
  </Avatar>
  <span>Your profile</span>
</Link>
```

**Phase 5 extension** — add `unseenContactCount?: number` prop, render red dot or `Badge` count overlay on the Avatar when > 0:
```typescript
{unseenContactCount > 0 && (
  <span
    aria-label={`${unseenContactCount} new contact${unseenContactCount === 1 ? '' : 's'}`}
    className="absolute -right-1 -top-1 flex h-4 w-4 items-center justify-center rounded-full bg-clay text-[10px] font-medium text-white"
  >
    {unseenContactCount > 9 ? '9+' : unseenContactCount}
  </span>
)}
```

---

### `app/(app)/m/[username]/page.tsx` (edit) (server component)

**Analog:** self (existing file lines 1–71).

**Profile query pattern** (lines 42–46):
```typescript
const { data: profileRow } = await supabase
  .from('profiles')
  .select('*, skills_offered(*), skills_wanted(*), counties(name), categories(id, name, slug)')
  .eq('username', username)
  .maybeSingle()
```

**Phase 5 extensions (per Pitfall §9 — prevent cross-user cache leak):**
1. Add `export const dynamic = 'force-dynamic'` AND `export const revalidate = 0` at top of file
2. Call `supabase.auth.getUser()` to get `viewer.id`, compare to `profileRow.owner_id` — pass `isOwnProfile` prop + viewer context to ProfileCard so ContactButton + OverflowMenu are conditionally rendered per D-05
3. Extend ProfileCard to accept `viewerId`, `isOwnProfile` props; render `<ContactButton />` + `<OverflowMenu />` when `!isOwnProfile`

---

### `app/(app)/profile/page.tsx` (edit) (server component, CRUD UPDATE)

**Analog:** self (existing file lines 1–78).

**Phase 5 extension** — on render, fire a mark-seen UPDATE (D-09):
```typescript
// After getUser() and before or after profile fetch
await supabase
  .from('contact_requests')
  .update({ seen_at: new Date().toISOString() })
  .eq('recipient_id', /* resolved profile.id */)
  .is('seen_at', null)
```
Alternative: a `markContactsSeen` server action in `lib/actions/contact.ts` called via a `useEffect` on an invisible client component — RESEARCH leaves this to Claude's discretion (CONTEXT §Claude's Discretion). **Recommendation: server-side UPDATE inline in page.tsx** (simpler, same request).

---

### `tests/unit/contact-schema.test.ts` (test, unit)

**Analog:** `tests/unit/profile-schema.test.ts`

**Full file structure pattern (lines 1–116):**
```typescript
import { describe, it, expect } from 'vitest'
import { ProfileFormSchema, isProfileComplete } from '@/lib/schemas/profile'

describe('ProfileFormSchema', () => {
  const valid = { /* baseline valid object */ }

  it('accepts a valid complete profile object', () => {
    const result = ProfileFormSchema.safeParse(valid)
    expect(result.success).toBe(true)
  })

  it('rejects empty displayName (PROF-01 min 1)', () => {
    const result = ProfileFormSchema.safeParse({ ...valid, displayName: '' })
    expect(result.success).toBe(false)
  })

  it('trims whitespace from displayName', () => {
    const result = ProfileFormSchema.safeParse({ ...valid, displayName: '  Kerry Smith  ' })
    if (result.success) {
      expect(result.data.displayName).toBe('Kerry Smith')
    } else {
      throw new Error('expected parse success')
    }
  })
})
```

**Phase 5 test cases to write (CONT-02, TRUST-01):**
- accepts 20–500 char message
- rejects 19-char message (min 20)
- rejects 501-char message (max 500)
- trims whitespace
- accepts each report reason (`harassment`, `spam`, `off-topic`, `impersonation`, `other`)
- rejects invalid report reason
- report note optional, accepts empty string, rejects 501-char

---

### `tests/unit/resend-webhook.test.ts` (test)

**Analog:** `tests/unit/rate-limit.test.ts`

**`vi.mock` + module import pattern** (lines 1–12):
```typescript
import { describe, it, expect, vi, beforeEach } from 'vitest'

const rpcMock = vi.fn()
vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn(async () => ({
    rpc: rpcMock,
  })),
}))

// Import AFTER the mock is set up
import { checkSignupRateLimit } from '@/lib/utils/rate-limit'
```

**Phase 5 test target:** the webhook route handler. Mock `@/lib/supabase/admin` (supabaseAdmin) + `resend.webhooks.verify()`. Assertions per CONT-09: valid signature → `contact_requests.status` updated; bad signature → 401; unsupported event → 200 no-op.

---

### `tests/unit/contact-eligibility.test.ts` + `tests/unit/reports-rls.test.ts` (test, RLS/RPC)

**Analog:** `tests/unit/directory-rls-visibility.test.ts`

**Env-gated describe pattern** (lines 16–22):
```typescript
const URL = process.env.NEXT_PUBLIC_SUPABASE_URL
const ANON = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY
const SERVICE = process.env.SUPABASE_SERVICE_ROLE_KEY
const hasAll = Boolean(URL && ANON && SERVICE)
const d = hasAll ? describe : describe.skip

d('DIR-09 — RLS directory visibility', () => { /* ... */ })
```

**Admin user creation + seed pattern** (lines 33–72):
```typescript
async function createUser(email: string, verified: boolean): Promise<string> {
  const { data } = await admin.auth.admin.createUser({
    email,
    email_confirm: verified,
    password: 'test-only-password-12345',
  })
  // ...
}

async function seed(opts: { /* ... */ }): Promise<string> {
  const { data } = await admin.from('profiles').insert({ /* ... */ }).select('id').single()
  // ...
}
```

**Viewer-JWT client pattern** (lines 129–133):
```typescript
function viewerClient() {
  return createSupabaseClient(URL!, ANON!, {
    global: { headers: { Authorization: `Bearer ${viewerJwt}` } },
  })
}
```

**Cleanup in `afterAll`** (lines 125–127):
```typescript
afterAll(async () => {
  for (const id of userIds) await admin.auth.admin.deleteUser(id)
}, 60_000)
```

**Phase 5 test files:**
- `contact-eligibility.test.ts`: 5 sub-tests for `contact_eligibility` RPC — banned sender, banned recipient, not-accepting, blocked-by-recipient, blocked-by-sender (TRUST-07)
- `reports-rls.test.ts`: authenticated viewer SELECT on `reports` returns 0 rows even if reports exist (TRUST-05 — reporter identity opaque to non-admin)

---

### `tests/e2e/contact-relay.spec.ts` + siblings (test, e2e)

**Analog:** `tests/e2e/directory-card-render.spec.ts`

**Env-guarded skip + fixture import** (lines 1–13):
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
```

**beforeAll/afterAll with seed+cleanup** (lines 22–42):
```typescript
test.beforeAll(async () => {
  test.skip(!hasEnv, 'Supabase env vars not set — skip DB-seeded E2E')
  viewerId = await createVerifiedUser(viewerEmail, viewerPassword)
  subjectId = await createVerifiedUser(/* ... */)
  await seedPublishedProfile({ /* ... */ })
})

test.afterAll(async () => {
  if (viewerId) await cleanupUser(viewerId)
  if (subjectId) await cleanupUser(subjectId)
})
```

**Login + navigate + assertion pattern** (lines 44–80):
```typescript
await page.goto('/login')
await page.getByLabel(/email/i).fill(viewerEmail)
const pwField = page.getByLabel(/password/i)
if (await pwField.isVisible()) {
  await pwField.fill(viewerPassword)
  await page.getByRole('button', { name: /sign in|log in|continue/i }).click()
}
await page.waitForURL(/\/(directory|profile)/, { timeout: 15_000 }).catch(() => undefined)

await page.goto('/directory')
const card = page.getByRole('listitem').filter({ hasText: subjectName }).first()
await expect(card).toBeVisible({ timeout: 10_000 })
```

**Phase 5 E2E specs to write (one file per trust/relay flow per RESEARCH Wave 0 Gaps lines 968–983):**
- `contact-relay.spec.ts` (CONT-01, CONT-04)
- `contact-rate-limit.spec.ts` (CONT-07, CONT-08)
- `block-flow.spec.ts` (TRUST-02)
- `report-flow.spec.ts` (TRUST-01, TRUST-06)
- `unseen-badge.spec.ts` (CONT-10)
- `ban-enforcement.spec.ts` (TRUST-03)
- `tests/e2e/fixtures/contact-helpers.ts` — shared seed+cleanup for two profiles (extend `directory-seed.ts`)

---

## Shared Patterns

### Pattern S1: Server-Only Import Guard

**Source:** `lib/supabase/admin.ts` line 1, `lib/utils/rate-limit.ts` line 1
**Apply to:** any file that imports/uses service-role key, Resend key, or other server-only env

```typescript
import 'server-only'
```

Phase 5: applies to `app/api/webhooks/resend/route.ts` (webhook handler reuses `supabaseAdmin`). Edge Function (Deno) does NOT use this import — Deno runtime is server-only by construction.

---

### Pattern S2: Auth Pattern (getUser / getClaims — NEVER getSession)

**Source:**
- `lib/actions/profile.ts` lines 79–84 — server action: `getUser()` for DML identity
- `app/(app)/layout.tsx` line 13 — server component: `getClaims()` for display-only
- `lib/supabase/middleware.ts` lines 45–85 — middleware: `getClaims()` fast path, `getUser()` fallback on OAuth `email_verified` absence

**Apply to:** ALL Phase 5 server-side code.

```typescript
// Server Action (lib/actions/contact.ts) — use getUser()
const supabase = await createClient()
const { data: { user }, error: authError } = await supabase.auth.getUser()
if (authError || !user) return { ok: false, error: 'Not authenticated.' }

// Server Component (app/(app)/layout.tsx, /profile/page.tsx, /m/[username]/page.tsx) —
// use getClaims() for display-only; getUser() when you need email_confirmed_at

// Edge Function (supabase/functions/send-contact/index.ts) — use getUser(jwt) with extracted JWT
const { data: userData } = await supabase.auth.getUser(jwt)
```

**ONE-TIME exception** (carved out in RESEARCH lines 1055–1058, 1079): `getSession()` in the Contact server action is the legal path to extract `access_token` for forwarding to the Edge Function. Document the exception inline with a comment citing Pitfall §1.

---

### Pattern S3: Server-Error Handling (PII-safe)

**Source:** `lib/actions/profile.ts` lines 88–96, 105–108, 135–154
**Apply to:** all Phase 5 server actions + route handlers + Edge Function

```typescript
if (error) {
  console.error('[<action-name>] <operation> failed', { code: error.code })
  return { ok: false, error: 'Something went wrong. Please try again.' }
}
```

Rules:
1. Never log email, name, message body, or any PII
2. Log only `code` / enum values / ID length
3. Return generic user copy; map specific codes to UI-facing error enum (D-03 pattern)
4. Never return raw DB error message to client

---

### Pattern S4: RLS "Self-Write + WITH CHECK" for Mutations

**Source:** `supabase/migrations/003_profile_tables.sql` lines 299–322
**Apply to:** Phase 5 `blocks`, `reports`, `contact_requests` RLS policies

```sql
create policy "<name> insert own" on public.<table> for insert to authenticated
  with check (<owner_col> = auth.uid() AND public.current_user_is_verified());

create policy "<name> update own" on public.<table> for update to authenticated
  using (<owner_col> = auth.uid())
  with check (<owner_col> = auth.uid());
```

**Per Pitfall §6** — missing `WITH CHECK` on INSERT/UPDATE = "block-bombing" / report-bombing vulnerability.

Phase 5 exceptions (documented):
- `reports` has no SELECT policy for `authenticated` — reporter identity opaque per TRUST-05
- `contact_requests` INSERT is service-role only (via Edge Function); no RLS INSERT policy for `authenticated`
- `blocks_read_self` (RESEARCH line 602) uses `using (blocker_id = auth.uid())` — self-only read

---

### Pattern S5: SECURITY DEFINER Function with search_path Lockdown

**Source:** `supabase/migrations/003_profile_tables.sql` lines 250–253, `004_directory_search.sql` lines 13–39
**Apply to:** Phase 5 `contact_eligibility` RPC

```sql
create or replace function public.<function_name>(<args>)
  returns <type>
  language plpgsql
  security definer
  set search_path = public, pg_temp
as $$
  -- body
$$;

revoke execute on function public.<function_name>(<args>) from public;
grant execute on function public.<function_name>(<args>) to service_role;
```

**Per Pitfall §5** — missing `set search_path` = search_path-hijack attack surface; missing REVOKE = PostgREST auto-exposes as RPC to anon.

---

### Pattern S6: useActionState + Inline Alert + Toast

**Source:** `components/profile/ProfileEditForm.tsx` lines 36–76, 103–108; `components/profile/PublishToggle.tsx` lines 27–43, 66–72
**Apply to:** all Phase 5 client components that call a server action

```typescript
const [state, formAction, pending] = useActionState<ResultType | null, FormData>(actionFn, null)

// Success side-effect
useEffect(() => {
  if (state?.ok) toast('Saved.')
  else if (state && state.ok === false && state.error) toast.error(state.error)
}, [state])

// Inline error (D-03 for Phase 5 — preferred over toast for Contact form)
{state && !state.ok && state.error && (
  <Alert variant="destructive">
    <AlertCircle className="h-4 w-4" />
    <AlertDescription>{state.error}</AlertDescription>
  </Alert>
)}
```

---

### Pattern S7: Middleware Exclusion for Webhooks (already in place)

**Source:** `middleware.ts` line 20 — matcher already excludes `api/webhooks`
**Apply to:** `app/api/webhooks/resend/route.ts` — no change needed. The matcher pattern `'/((?!_next/static|_next/image|favicon.ico|robots.txt|sitemap.xml|api/webhooks|...).*)'` lets Resend POST hit the route without auth gating.

---

### Pattern S8: Brand Token Usage (Forest / Sage / Clay)

**Source:** `components/profile/ProfileCard.tsx` (lines 17, 19, 22, 28), `components/directory/DirectoryCard.tsx` (lines 27, 34, 37, 51)
**Apply to:** all Phase 5 UI additions + the React Email template

Tailwind utility classes used project-wide:
- `bg-sage-bg`, `bg-sage-pale`, `border-sage-light` — container backgrounds
- `text-forest-deep` — primary text
- `text-forest-mid` — secondary text
- `bg-clay` / `text-clay` — accent (buttons, badges, quote rules)
- `font-serif` → Lora (headings), default sans → Inter (body)

Email template inlines these as hex literals (RESEARCH §Pattern 5) because email clients don't run Tailwind.

---

## No Analog Found

Files with no close match in the codebase (planner should use RESEARCH.md patterns + external docs):

| File | Role | Data Flow | Reason |
|------|------|-----------|--------|
| `supabase/functions/send-contact/index.ts` | edge-function | request-response + event-driven | First Deno Edge Function in repo; use RESEARCH §Pattern 1 (lines 383–555) as primary source. External refs: supabase.com/docs/guides/functions, resend.com/docs/send-with-supabase-edge-functions |
| `supabase/functions/send-contact/deno.json` | config | — | First Deno config; use RESEARCH lines 559–568 |
| `emails/contact-relay.tsx` | email-template | transform | First React Email component in repo; use RESEARCH §Pattern 5 (lines 692–755). External ref: react.email/docs |
| `components/ui/sheet.tsx`, `dropdown-menu.tsx`, `select.tsx` | ui primitive | — | Generated by `pnpm dlx shadcn@latest add sheet dropdown-menu select` |

---

## Metadata

**Analog search scope:**
- `/Users/ashleyakbar/barterkin/lib/actions/*.ts`
- `/Users/ashleyakbar/barterkin/lib/schemas/*.ts`
- `/Users/ashleyakbar/barterkin/lib/supabase/*.ts`
- `/Users/ashleyakbar/barterkin/lib/utils/*.ts`
- `/Users/ashleyakbar/barterkin/components/profile/*.tsx`
- `/Users/ashleyakbar/barterkin/components/layout/*.tsx`
- `/Users/ashleyakbar/barterkin/components/directory/*.tsx`
- `/Users/ashleyakbar/barterkin/components/ui/*.tsx`
- `/Users/ashleyakbar/barterkin/app/(app)/**/*.tsx`
- `/Users/ashleyakbar/barterkin/app/api/**/*.ts`
- `/Users/ashleyakbar/barterkin/supabase/migrations/*.sql`
- `/Users/ashleyakbar/barterkin/middleware.ts`
- `/Users/ashleyakbar/barterkin/tests/unit/*.test.ts`
- `/Users/ashleyakbar/barterkin/tests/e2e/*.spec.ts`

**Files scanned:** ~60
**Pattern extraction date:** 2026-04-21
