---
phase: 03-profile-georgia-gate
reviewed: 2026-04-20T00:00:00Z
depth: standard
files_reviewed: 28
files_reviewed_list:
  - app/(app)/layout.tsx
  - app/(app)/m/[username]/page.tsx
  - app/(app)/profile/edit/page.tsx
  - app/(app)/profile/page.tsx
  - components/layout/AppNav.tsx
  - components/profile/AvatarUploader.tsx
  - components/profile/CategoryPicker.tsx
  - components/profile/CountyCombobox.tsx
  - components/profile/ProfileCard.tsx
  - components/profile/ProfileCompletenessChecklist.tsx
  - components/profile/ProfileEditForm.tsx
  - components/profile/PublishToggle.tsx
  - components/profile/SkillRowList.tsx
  - lib/actions/profile-helpers.ts
  - lib/actions/profile.ts
  - lib/actions/profile.types.ts
  - lib/data/categories.ts
  - lib/schemas/profile.ts
  - lib/utils/avatar-validation.ts
  - lib/utils/slug.ts
  - lib/supabase/middleware.ts
  - supabase/migrations/003_profile_tables.sql
  - supabase/migrations/003_profile_storage.sql
  - tests/unit/profile-action.test.ts
  - tests/unit/profile-schema.test.ts
  - tests/unit/avatar-validation.test.ts
  - tests/unit/slug-generation.test.ts
  - tests/e2e/profile-edit.spec.ts
  - tests/e2e/profile-visibility.spec.ts
findings:
  critical: 3
  warning: 6
  info: 4
  total: 13
status: issues_found
---

# Phase 03: Code Review Report

**Reviewed:** 2026-04-20
**Depth:** standard
**Files Reviewed:** 28
**Status:** issues_found

## Summary

This phase delivers the profile editing flow, avatar upload, publish gate, slug
generation, Georgia county/category selection, and supporting RLS policies. The
overall architecture is sound: `getUser()` is used correctly for DML gates,
RLS is enabled on all tables, skills are bounded at the DB layer, and the
schema/action split is clean.

Three critical issues were found. Two concern the avatar upload path: the
client-side MIME check relies on `File.type`, which is controlled by the
browser and trivially spoofed, and no server-side content-type verification
occurs before writing to Storage. The third is a race condition in slug
resolution that can produce duplicate inserts between the uniqueness check and
the upsert, allowing the random-suffix retry to set a slug that is also a
collision target. Several warnings address logic gaps in the publish gate,
missing `rel="noreferrer"` on an external link, a toast message that shows the
wrong state on repeated publish/unpublish cycles, and unchecked error returns
in the skills delete path. Info items cover the `as any` cast on the Zod
resolver, the missing `countyId` test in the profile-schema unit suite,
and unused re-export wrappers that add noise.

---

## Critical Issues

### CR-01: MIME type validation is client-controlled — arbitrary file types can be written to Storage

**File:** `components/profile/AvatarUploader.tsx:21-22` and `lib/utils/avatar-validation.ts:28`

**Issue:** `isValidAvatarFile` checks `file.type`, which is the browser-supplied
MIME string from the `File` object. An attacker can set `file.type` to
`image/jpeg` for any file (e.g., an SVG with `<script>` content, a polyglot
file, or a PHP payload) and the check will pass. The compressed output is forced
to `image/jpeg` by `browser-image-compression`, which does add a layer of
re-encoding protection — but only for pixel-decodable images. Files that cannot
be decoded as images (binary payloads, SVGs that some renderers execute) may
pass compression without conversion. Supabase Storage does not do server-side
MIME sniffing by default on free-tier buckets; the `contentType: 'image/jpeg'`
header in the upload call is set by the client.

The Storage RLS policy correctly restricts the upload path to `{uid}/...` but
does not restrict content type — any authenticated user can upload any bytes to
their avatar slot with a forged content-type.

**Fix:** Add a server-side content sniffing step before accepting the URL into
the profile row. A minimal defence is to read the first 12 bytes of the uploaded
object via a Supabase Edge Function or a Next.js route handler and verify the
magic bytes match a known image format (JPEG: `FF D8 FF`; PNG: `89 50 4E 47`;
WebP: `52 49 46 46 ... 57 45 42 50`). Reject and delete the object if the magic
bytes do not match. For MVP, at minimum add this check inside `AvatarUploader`
using a `FileReader` to read the first bytes client-side — it still won't stop
a determined attacker but it narrows the spoofing surface:

```ts
async function sniffMagicBytes(file: File): Promise<boolean> {
  const buf = await file.slice(0, 12).arrayBuffer()
  const bytes = new Uint8Array(buf)
  // JPEG: FF D8 FF
  if (bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) return true
  // PNG: 89 50 4E 47
  if (bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4e && bytes[3] === 0x47) return true
  // WebP: RIFF....WEBP
  if (bytes[0] === 0x52 && bytes[1] === 0x49 && bytes[2] === 0x46 && bytes[3] === 0x46 &&
      bytes[8] === 0x57 && bytes[9] === 0x45 && bytes[10] === 0x42 && bytes[11] === 0x50) return true
  return false
}
```

Call this after the existing `isValidAvatarFile` check and reject if it returns
`false`. The authoritative fix remains a server-side sniff.

---

### CR-02: Slug uniqueness check has a TOCTOU race — concurrent first saves can produce duplicate usernames

**File:** `lib/actions/profile.ts:55-70` (`resolveUniqueSlug`) and `lib/actions/profile.ts:111-114`

**Issue:** `resolveUniqueSlug` issues a `SELECT count` to find a free slug, then
the outer `saveProfile` runs a separate `upsert`. Between the SELECT and the
upsert, another concurrent first-save with the same display name can claim the
same slug, causing the upsert to hit the `unique` constraint on `username` and
fall into the retry path. The retry path at line 139 generates a uuid-suffixed
slug (`${base}-${crypto.randomUUID().slice(0,8)}`), which is correct, but the
retry itself is also not race-free — two concurrent retrys can collide on the
same uuid suffix (probability low but not zero).

More importantly, the retry only executes if `upsertError.code === '23505' && !existing?.username` (line 137). If the race occurs on a second save attempt (when `existing.username` is already set), the condition is false and the error propagates as a generic "Something went wrong" — the user's profile save fails silently. This is a correctness bug in addition to the race.

**Fix (short-term):** Use a DB-level `INSERT ... ON CONFLICT (username) DO NOTHING` in the slug resolution, or use a Postgres advisory lock scoped to the slug string. For the retry guard, remove the `&& !existing?.username` restriction — a 23505 on username should always trigger a retry slug regardless of whether the profile previously existed:

```ts
// Line 137: change the condition
if (upsertError.code === '23505') {
  // username collision — always retry with a uuid suffix
  const base = generateSlug(values.displayName) || 'member'
  const retrySlug = `${base}-${crypto.randomUUID().slice(0, 8)}`
  // ...
}
```

The race itself is best fixed at the DB layer: add a `ON CONFLICT (username) DO UPDATE SET username = EXCLUDED.username || '-' || substr(gen_random_uuid()::text, 1, 8)` strategy, or generate the slug inside a Postgres function using `FOR UPDATE SKIP LOCKED`.

---

### CR-03: `profileId` in `setPublished` is trusted from client-submitted FormData without binding it to `auth.uid()` before the completeness fetch

**File:** `lib/actions/profile.ts:219-237`

**Issue:** `setPublished` validates that `profileId` is a UUID and then issues:

```ts
.eq('id', profileId)
.eq('owner_id', user.id)
```

Both `eq` clauses are present in the completeness-check SELECT (line 235-236) and in the final UPDATE (lines 220-224 and 261-262), so ownership IS enforced. However, the unpublish path (lines 219-228) constructs the update with `.eq('id', profileId).eq('owner_id', user.id)` which is correct. The publish path performs the SELECT with owner check before updating. This is not a bypass in the current code.

**However**, the `profileId` value fed into `SetPublishedSchema` comes entirely from a hidden `<input>` in `PublishToggle` (line 47 of `PublishToggle.tsx`). The `profileId` prop is the DB row UUID passed from the server component. Because this is a server action, the `owner_id = user.id` check in the UPDATE is the real gate. However, a user who knows another profile's UUID can call the `setPublished` action with that UUID. The `owner_id` check prevents the UPDATE from matching, so the action will return `ok: true` with no rows updated — it silently succeeds from the caller's perspective with `{ ok: true }` even though no row was changed.

**Issue:** The publish path returns `{ ok: true }` if the UPDATE affects 0 rows because Supabase's `.update()` does not error on 0-row updates — it returns no error and `data: []`. An attacker submitting a non-owned `profileId` receives a success response. The toast then says "Profile published." even though nothing changed.

**Fix:** After the UPDATE, check that at least one row was affected. Supabase `.update().select('id')` returns the updated rows; if the result is empty, the profileId did not belong to this user:

```ts
const { data: updated, error: updateError } = await supabase
  .from('profiles')
  .update({ is_published: true })
  .eq('id', profileId)
  .eq('owner_id', user.id)
  .select('id')
if (updateError) { /* ... */ }
if (!updated || updated.length === 0) {
  return { ok: false, error: 'Profile not found.' }
}
```

Apply the same pattern to the unpublish path (lines 219-228).

---

## Warnings

### WR-01: `rel="noopener"` without `noreferrer` on TikTok external link

**File:** `components/profile/ProfileCard.tsx:97`

**Issue:** The TikTok link uses `rel="noopener"` but omits `noreferrer`. Without
`noreferrer`, the `Referer` header is sent to tiktok.com, leaking the viewer's
current URL (which contains the member's username). This is a minor privacy leak
for a directory that is intentionally auth-gated.

**Fix:**
```tsx
rel="noopener noreferrer"
```

---

### WR-02: Toast state message in `PublishToggle` is derived from stale prop, not action outcome

**File:** `components/profile/PublishToggle.tsx:38`

**Issue:** On successful action, the toast reads:

```ts
toast(isPublished ? 'Profile unpublished.' : 'Profile published.')
```

`isPublished` is the prop value at the time the component rendered, not the new
state after the action. This is correct for the first toggle. But if the server
component re-renders and the parent page re-fetches (which happens via Next.js
revalidation), the `isPublished` prop updates. However, if revalidation is fast
and `state` is re-evaluated after re-render, the `useEffect([state])` fires again
with the old `state` (React keeps effect deps stable across re-renders if `state`
reference hasn't changed), which can show a stale or duplicate toast.

The deeper issue: `setPublished` returns `{ ok: true }` but does not return the
new `is_published` value. The toast message is inferred from the prop rather than
confirmed from server response.

**Fix:** Return `newIsPublished` from the action:

```ts
// In SetPublishedResult
export interface SetPublishedResult {
  ok: boolean
  newIsPublished?: boolean  // add this
  error?: string
  missingFields?: ...
}

// In setPublished action, on success:
return { ok: true, newIsPublished: shouldPublish }
```

Then in the effect:
```ts
if (state?.ok) {
  toast(state.newIsPublished ? 'Profile published.' : 'Profile unpublished.')
}
```

---

### WR-03: Unchecked error return from `skills_offered` delete before insert

**File:** `lib/actions/profile.ts:161`

**Issue:** The delete of existing skills rows does not check for an error:

```ts
await supabase.from('skills_offered').delete().eq('profile_id', profileId)
```

If this delete fails (e.g., transient network error, RLS policy unexpectedly
rejects it), the code falls through and attempts the insert on the existing rows.
This can result in duplicate skill entries if the delete partially succeeded, or
insert-constraint violations if it did not. The same issue applies to line 174
(`skills_wanted` delete).

**Fix:** Capture and check the error:

```ts
const { error: deleteOfferedErr } = await supabase
  .from('skills_offered').delete().eq('profile_id', profileId)
if (deleteOfferedErr) {
  console.error('[saveProfile] skills_offered delete failed', { code: deleteOfferedErr.code })
  return { ok: false, error: 'Something went wrong saving your skills. Please try again.' }
}
```

Apply the same pattern at line 174 for `skills_wanted`.

---

### WR-04: `avatarUrl` Zod schema accepts any URL including non-Storage origins

**File:** `lib/schemas/profile.ts:28`

**Issue:** `avatarUrl: z.string().url().optional().or(z.literal(''))` accepts any
valid URL. A user could submit `https://evil.com/tracking-pixel.jpg` as their
avatar URL by bypassing the normal upload flow (e.g., calling the server action
directly from curl). The profile would render an `<img>` pointing to an
attacker-controlled domain, causing an outbound request from every viewer's
browser — a privacy leak and potential tracking vector.

**Fix:** Add a `.refine()` that restricts accepted URLs to the Supabase Storage
public URL origin:

```ts
avatarUrl: z
  .string()
  .url()
  .refine(
    (url) => url === '' || url.startsWith(process.env.NEXT_PUBLIC_SUPABASE_URL + '/storage/'),
    { message: 'Avatar must be uploaded through Barterkin.' }
  )
  .optional()
  .or(z.literal('')),
```

Because `ProfileFormSchema` is used on both client and server, use the env var
directly (it is `NEXT_PUBLIC_` so it is safe to reference client-side).

---

### WR-05: `categoryId` and `countyId` are not validated against the known-valid value set in the Zod schema

**File:** `lib/schemas/profile.ts:40-42`

**Issue:** `categoryId: z.number().int().positive().nullable()` accepts any
positive integer. The server action then upserts it directly as a FK into
`categories(id)`. If a user passes `categoryId: 999`, Postgres will reject it
with a FK violation, and the action returns a generic error. However, there is
no Zod-level validation that the value is within the 1–10 range, so the server
error message gives no field-level hint. The same applies to `countyId` (valid
FIPS values are 13001–13321, odd increments). An invalid value that happens to
satisfy `positive()` will fail silently at the DB layer.

**Fix:** Use `z.enum` or a `refine` for both:

```ts
import { CATEGORIES } from '@/lib/data/categories'
const VALID_CATEGORY_IDS = CATEGORIES.map((c) => c.id) as [number, ...number[]]

categoryId: z.number().int().refine(
  (v) => VALID_CATEGORY_IDS.includes(v),
  { message: 'Please select a valid category.' }
).nullable(),
```

For countyId, a `refine` against the imported JSON is appropriate. This surfaces
a proper field error rather than a generic "Something went wrong."

---

### WR-06: `profileId` fallback fetch after failed upsert is a separate query that could race

**File:** `lib/actions/profile.ts:155-158`

**Issue:**
```ts
const profileId =
  upserted?.id ??
  (await supabase.from('profiles').select('id').eq('owner_id', user.id).single()).data?.id
```

If `upserted` is `null` (upsert returned no data without an error, which can
happen with certain Supabase client versions when `onConflict` matches but
`.select().single()` fails), a second query runs. This fallback is not guarded
for error — if the second query errors, `profileId` is `undefined` and the
action returns the generic error message. This is an edge-case but the right fix
is to make the fallback explicit:

```ts
let profileId = upserted?.id
if (!profileId) {
  const { data: fallback, error: fallbackErr } = await supabase
    .from('profiles').select('id').eq('owner_id', user.id).single()
  if (fallbackErr || !fallback?.id) {
    console.error('[saveProfile] profileId fallback failed', { code: fallbackErr?.code })
    return { ok: false, error: 'Something went wrong. Please try again.' }
  }
  profileId = fallback.id
}
```

---

## Info

### IN-01: `zodResolver` cast to `any` suppresses type safety for the entire form

**File:** `components/profile/ProfileEditForm.tsx:43`

**Issue:** `resolver: zodResolver(ProfileFormSchema) as any` silences TypeScript
for the resolver. The `as any` is annotated with an eslint-disable comment. The
common cause is a mismatch between the Zod schema's inferred type and `useForm`'s
generic. In Zod 4 + `@hookform/resolvers@5`, this cast should not be needed.

**Fix:** Remove the cast and the eslint-disable comment. If the resolver still
has a type error, align the `ProfileFormValues` type with what `useForm` expects
(often a matter of ensuring `z.infer<typeof ProfileFormSchema>` is passed as the
generic explicitly):

```ts
const form = useForm<ProfileFormValues>({
  resolver: zodResolver(ProfileFormSchema),
  ...
})
```

---

### IN-02: `parseSkillArray` and `coerceFormDataToProfileInput` async wrappers in `profile.ts` are dead exports

**File:** `lib/actions/profile.ts:23-40`

**Issue:** Lines 23–40 re-export the helpers from `profile-helpers.ts` as async
wrappers "for unit testing." The unit tests import directly from
`profile-helpers.ts` (line 4 of `profile-action.test.ts`), not from
`profile.ts`. The wrappers are never called anywhere else in the reviewed files.
They add surface area to the server action module with no benefit.

**Fix:** Remove the async wrapper re-exports from `profile.ts`. The comment
explaining them is accurate but the implementation is unneeded since tests
already import from `profile-helpers.ts`.

---

### IN-03: Unit test suite has no test for `countyId` out-of-range value via `coerceFormDataToProfileInput`

**File:** `tests/unit/profile-action.test.ts`

**Issue:** The `coerceFormDataToProfileInput` tests verify that an empty string
becomes `null` and that a valid FIPS string (`'13001'`) becomes `13001`. There
is no test for a non-FIPS positive integer (e.g., `'99999'`), which currently
passes through and would fail at the DB FK layer. If WR-05 is fixed (adding a
Zod refine for valid county IDs), a test for this rejection should be added.

**Fix:** Add to `profile-schema.test.ts`:

```ts
it('rejects countyId 99999 (not a valid Georgia FIPS code)', () => {
  const result = ProfileFormSchema.safeParse({ ...valid, countyId: 99999 })
  expect(result.success).toBe(false)
})
```

---

### IN-04: `generateSlug` does not normalize Unicode before slugifying — accented characters are dropped rather than transliterated

**File:** `lib/utils/slug.ts:16-20`

**Issue:** `generateSlug('café')` produces `'caf-'` then strips the trailing
dash to yield `'caf'`. The `é` is silently removed rather than transliterated to
`e`. This means two users named "René" and "Ren" could both resolve to the slug
`ren`. The slug collision logic handles this at the DB level (it will append a
number suffix), so it is not a correctness bug — but it produces aesthetically
odd slugs and could surprise users. The test `'café au lait' → 'caf-au-lait'`
in `slug-generation.test.ts:22-24` confirms and codifies this behavior.

**Fix (optional):** Add Unicode normalization before slugifying:

```ts
export function generateSlug(displayName: string): string {
  return displayName
    .normalize('NFD')                   // decompose accents
    .replace(/[\u0300-\u036f]/g, '')    // strip combining marks (é → e)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '')
    .slice(0, 40)
}
```

This converts `'café au lait'` to `'cafe-au-lait'` and `'René'` to `'rene'`.
Update the existing test accordingly.

---

_Reviewed: 2026-04-20_
_Reviewer: Claude (gsd-code-reviewer)_
_Depth: standard_
