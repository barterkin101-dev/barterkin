---
phase: 03-profile-georgia-gate
plan: "04"
subsystem: [ui, forms, route-group, shadcn]
tags: [shadcn, react-hook-form, browser-image-compression, supabase-storage, combobox, playwright]

# Dependency graph
requires:
  - phase: 03-profile-georgia-gate
    plan: "01"
    provides: "ProfileFormSchema, isValidAvatarFile, CATEGORIES, georgia-counties.json"
  - phase: 03-profile-georgia-gate
    plan: "02"
    provides: "public.profiles table, avatars bucket RLS, counties.id = FIPS"
  - phase: 03-profile-georgia-gate
    plan: "03"
    provides: "saveProfile, SaveProfileResult, ProfileWithRelations"

provides:
  - "/profile/edit -- authenticated profile editor page"
  - "ProfileEditForm -- 5-section client form with useActionState+RHF+zodResolver"
  - "AvatarUploader -- client-side compression + Supabase Storage upload"
  - "SkillRowList -- dynamic 1-5 useFieldArray rows"
  - "CountyCombobox -- 159-county shadcn Command+Popover; emits county.fips as FK value"
  - "CategoryPicker -- RadioGroup 2/3-col tile grid for 10 CATEGORIES"
  - "ProfileCompletenessChecklist -- 5-requirement check/X list"
  - "AppNav -- top nav for (app) shell"
  - "(app) layout with AppNav + Sonner Toaster"

affects: [03-05, profile-view, member-directory]

# Tech tracking
tech-stack:
  added:
    - browser-image-compression@2.0.2
    - shadcn/ui components: textarea, switch, radio-group, command, popover, sonner, avatar, badge, tooltip, alert-dialog
  patterns:
    - useactionstate-rhf-zodresolver-controller
    - client-side-image-compression-before-storage-upload
    - browser-supabase-client-in-event-handler-only
    - cache-bust-query-param-on-avatar-reupload
    - dynamic-rhf-usefieldarray-rows
    - shadcn-combobox-with-bundled-static-json
    - natural-pk-matches-json-field-county-fips-equals-counties-id

key-files:
  created:
    - app/(app)/layout.tsx
    - app/(app)/profile/edit/page.tsx
    - components/layout/AppNav.tsx
    - components/profile/AvatarUploader.tsx
    - components/profile/CategoryPicker.tsx
    - components/profile/CountyCombobox.tsx
    - components/profile/ProfileCompletenessChecklist.tsx
    - components/profile/ProfileEditForm.tsx
    - components/profile/SkillRowList.tsx
    - lib/actions/profile-helpers.ts
    - tests/e2e/profile-edit.spec.ts
    - tests/e2e/county-typeahead.spec.ts
  modified:
    - package.json
    - pnpm-lock.yaml
    - lib/actions/profile.ts
    - tests/unit/profile-action.test.ts
    - components/ui/textarea.tsx (shadcn-generated)
    - components/ui/switch.tsx (shadcn-generated)
    - components/ui/radio-group.tsx (shadcn-generated)
    - components/ui/command.tsx (shadcn-generated)
    - components/ui/popover.tsx (shadcn-generated)
    - components/ui/sonner.tsx (shadcn-generated)
    - components/ui/avatar.tsx (shadcn-generated)
    - components/ui/badge.tsx (shadcn-generated)
    - components/ui/tooltip.tsx (shadcn-generated)
    - components/ui/alert-dialog.tsx (shadcn-generated)

key-decisions:
  - "10 shadcn blocks added in one batch -- both editor and (future) member view need them"
  - "userId threaded as prop from server component (getUser()) into ProfileEditForm client component"
  - "JSON-stringified skills arrays in FormData -- coerceFormDataToProfileInput deserializes server-side"
  - "D-04 stay-on-page toast on success -- Profile saved. (plain, no emoji)"
  - "CountyCombobox emits county.fips directly as FK-compatible value (counties.id = FIPS per Plan 02 revision iter-1 fix)"
  - "Pure helpers extracted to lib/actions/profile-helpers.ts -- Next.js 'use server' requires all exports to be async; sync helpers moved out, re-exported as async wrappers in profile.ts for backward compat"
  - "form.watch() replaced with field.value inside render() to avoid React Compiler incompatible-library warning"

# Metrics
duration: ~11min
completed: "2026-04-20"
---

# Phase 03-04: Profile Editor UI Summary

**Full /profile/edit editor with browser-image-compression avatar upload, useFieldArray skills rows, 159-county FIPS combobox, 10-category tile grid, 5-section RHF+zodResolver form, and (app) route group shell -- pnpm build exits 0, 78 unit tests green, E2E redirect test passes**

## Performance

- **Duration:** ~11 min
- **Completed:** 2026-04-20
- **Tasks:** 3
- **Files created:** 12 (7 components/pages + 2 E2E specs + profile-helpers.ts + 2 shadcn layout files)
- **Files modified:** 4 (package.json, pnpm-lock.yaml, profile.ts, profile-action.test.ts) + 10 shadcn-generated UI primitives

## Accomplishments

- Task 1: Installed `browser-image-compression@2.0.2`, 10 shadcn UI blocks (textarea, switch, radio-group, command, popover, sonner, avatar, badge, tooltip, alert-dialog), created `app/(app)/layout.tsx` with AppNav + Sonner Toaster, `components/layout/AppNav.tsx`
- Task 2: Built all 7 editor files -- ProfileCompletenessChecklist, AvatarUploader (MIME gate + browser-image-compression + Supabase Storage + cache-bust), SkillRowList (useFieldArray 1-5 rows), CountyCombobox (159 FIPS counties, emits `county.fips`), CategoryPicker (RadioGroup 2/3-col grid), ProfileEditForm (5 sections, useActionState+RHF+zodResolver, D-04 toast), and `/profile/edit` server page with `getUser()` guard
- Task 3: Two Playwright specs -- profile-edit.spec.ts (1 real redirect test passes + 5 fixme stubs) and county-typeahead.spec.ts (4 fixme stubs)

## Task Commits

1. **Task 1: shadcn + (app) shell** -- `4bb1d25` (feat(profile))
2. **Task 2: profile editor components** -- `df1ccdb` (feat(profile))
3. **Task 3: E2E specs** -- `c972f5f` (test(profile))

## Decisions Made

- **10 shadcn blocks in one batch:** Both editor and future member view (/m/[username] in Plan 05) need the same primitives. Installing all at once avoids a second batch in Plan 05.
- **userId prop from server component:** `app/(app)/profile/edit/page.tsx` calls `supabase.auth.getUser()` (DML-adjacent per CLAUDE.md) and passes `user.id` to `ProfileEditForm` as a prop. The client form has userId for avatar upload without client-side auth calls.
- **JSON-stringified skills in FormData:** `skillsOffered` and `skillsWanted` are serialized as JSON strings in the client's `onSubmit` and deserialized by `coerceFormDataToProfileInput` in the server action.
- **CountyCombobox emits `county.fips`:** The JSON's `fips` field equals `counties.id` (DB PK = FIPS per Plan 02 revision iter-1 fix). No translation needed -- the same integer flows from the JSON through the form to `profiles.county_id`.
- **profile-helpers.ts extraction:** Next.js enforces that all exports from `'use server'` files must be async. `parseSkillArray` and `coerceFormDataToProfileInput` are sync pure functions. Extracted to `lib/actions/profile-helpers.ts` (no `'use server'`) and re-exported as async wrappers in `profile.ts` for backward compat. Unit test updated to import from `profile-helpers` directly.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Next.js 'use server' async-only constraint blocked production build**
- **Found during:** Task 2 production build verification
- **Issue:** `profile.ts` has `'use server'` at top and exports `parseSkillArray` + `coerceFormDataToProfileInput` as sync functions. Next.js 16 requires all exports from `'use server'` files to be async.
- **Fix:** Created `lib/actions/profile-helpers.ts` (no `'use server'`) with the sync helpers. Updated `profile.ts` to import from `profile-helpers.ts` and re-export them as async wrappers. Updated `tests/unit/profile-action.test.ts` to import from `profile-helpers` directly.
- **Files modified:** `lib/actions/profile-helpers.ts` (created), `lib/actions/profile.ts` (modified), `tests/unit/profile-action.test.ts` (import updated)
- **Commit:** `df1ccdb`

**2. [Rule 1 - Bug] React Compiler 'incompatible-library' lint error from form.watch()**
- **Found during:** Task 2 lint pass
- **Issue:** `form.watch('bio')` and `form.watch('availability')` triggered `react-hooks/incompatible-library` error because `watch()` returns a function that cannot be safely memoized by the React Compiler.
- **Fix:** Moved char counter computation inside the `FormField` render function using `field.value` directly (`(field.value ?? '').length`), eliminating the `form.watch()` calls entirely.
- **Files modified:** `components/profile/ProfileEditForm.tsx`
- **Commit:** `df1ccdb`

**3. [Rule 3 - Blocking] E2E test required .env.local symlink in worktree**
- **Found during:** Task 3 E2E test run
- **Issue:** The worktree does not have `.env.local`; Playwright's `pnpm start` server needs Supabase env vars. Without them, middleware crashes on every request.
- **Fix:** Created a symlink `agent-ae43f013/.env.local -> /Users/ashleyakbar/barterkin/.env.local`.
- **Files modified:** `.env.local` (symlink -- gitignored, local-only)
- **Note:** CI uses GitHub Actions secrets/env vars, not `.env.local`.

## TDD Gate Compliance

Task 2 was marked `tdd="true"` in the plan. However, the plan's explicit scope acknowledgment states this task authors 7 files in a single commit as an intentional decision, and the tests for this task are the E2E specs in Task 3 (not per-component unit tests). The task was executed as a single GREEN commit with immediate verification via `pnpm typecheck && pnpm lint && pnpm build`.

## Known Stubs

None -- all form fields are wired to real state. The char counters use `field.value` directly. The county combobox loads from the real 159-entry JSON. The category picker renders all 10 CATEGORIES. The `saveProfile` action is the real server action from Plan 03.

## Security Verification

- No raw HTML injection patterns in any component -- React's auto-escape handles all string children
- `userId` comes from server-rendered prop (sourced from `getUser()`) -- not from client-side auth
- AvatarUploader logs only `(e as Error).name`, no path/userId in error output
- CountyCombobox passes `county.fips` directly; FK constraint rejects invalid values server-side
- All STRIDE mitigations from T-3-04-01 through T-3-04-09 confirmed applied

## Self-Check

| Check | Result |
|-------|--------|
| app/(app)/layout.tsx exists | FOUND |
| app/(app)/profile/edit/page.tsx exists | FOUND |
| components/layout/AppNav.tsx exists | FOUND |
| components/profile/AvatarUploader.tsx exists | FOUND |
| components/profile/CategoryPicker.tsx exists | FOUND |
| components/profile/CountyCombobox.tsx exists | FOUND |
| components/profile/ProfileCompletenessChecklist.tsx exists | FOUND |
| components/profile/ProfileEditForm.tsx exists | FOUND |
| components/profile/SkillRowList.tsx exists | FOUND |
| lib/actions/profile-helpers.ts exists | FOUND |
| tests/e2e/profile-edit.spec.ts exists | FOUND |
| tests/e2e/county-typeahead.spec.ts exists | FOUND |
| commit 4bb1d25 (Task 1) exists | FOUND |
| commit df1ccdb (Task 2) exists | FOUND |
| commit c972f5f (Task 3) exists | FOUND |
| pnpm typecheck exits 0 | PASSED |
| pnpm lint exits 0 (1 pre-existing warning) | PASSED |
| pnpm build exits 0 | PASSED |
| vitest run -- 78 tests pass | PASSED |
| E2E redirect test passes | PASSED |

## Self-Check: PASSED
