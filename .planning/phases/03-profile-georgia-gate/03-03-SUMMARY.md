---
phase: 03-profile-georgia-gate
plan: "03"
subsystem: [server-action, profile, slug]
tags: [server-action, profile, validation, slug, tdd]

# Dependency graph
requires:
  - phase: 03-profile-georgia-gate
    plan: "01"
    provides: "ProfileFormSchema, isProfileComplete, generateSlug"
  - phase: 03-profile-georgia-gate
    plan: "02"
    provides: "public.profiles, public.skills_offered, public.skills_wanted tables with RLS, lib/database.types.ts"

provides:
  - saveProfile
  - setPublished
  - resolveUniqueSlug
  - parseSkillArray
  - coerceFormDataToProfileInput
  - SaveProfileResult
  - SetPublishedResult
  - ProfileWithRelations

affects: [03-04, 03-05, profile-editor, publish-toggle]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - useactionstate-server-action
    - zod-flattenederrors-surfacing
    - getuser-for-dml
    - slug-collision-retry-23505
    - delete-plus-insert-skills-replacement
    - double-gate-completeness

key-files:
  created:
    - lib/actions/profile.ts
    - lib/actions/profile.types.ts
    - tests/unit/profile-action.test.ts
  modified: []

key-decisions:
  - "FormData skillsOffered/skillsWanted transmitted as JSON-stringified string[] — coerceFormDataToProfileInput parses them before Zod validation"
  - "avatar_url stored as full public URL (no signed URLs on free tier per RESEARCH Pitfall 3)"
  - "setPublished returns missingFields array for UI checklist rendering in Plan 05"
  - "isProfileComplete from lib/schemas/profile is NOT imported in profile.ts — setPublished re-implements the completeness check inline against DB row data (form values unavailable at publish time)"

# Metrics
duration: ~3min
completed: "2026-04-20"
---

# Phase 03-03: Server-Side Profile Mutation Layer Summary

**saveProfile + setPublished server actions with slug-collision retry (23505), delete+insert skills replacement, double-gate completeness, and getUser() DML identity — 7 unit tests pass, pnpm typecheck clean**

## Performance

- **Duration:** ~3 min
- **Completed:** 2026-04-20
- **Tasks:** 1 (TDD RED + GREEN within single task)
- **Files modified:** 3

## Accomplishments

- TDD RED gate: `tests/unit/profile-action.test.ts` authored with 7 assertions for `parseSkillArray` and `coerceFormDataToProfileInput` — correctly failing before implementation
- TDD GREEN gate: `lib/actions/profile.ts` implemented; all 7 unit tests pass; full suite 78/78 green; `pnpm typecheck` exits 0
- `lib/actions/profile.types.ts`: `SaveProfileResult`, `SetPublishedResult`, `ProfileWithRelations`, `SkillOfferedRow`, `SkillWantedRow` — shared types for Plan 04 + 05 UI consumption
- `lib/actions/profile.ts`: `saveProfile` validates with `ProfileFormSchema.safeParse`, upserts `public.profiles`, replaces `skills_offered` + `skills_wanted` atomically (delete+insert), generates slug on first save only (D-07/D-08 lock), retries on 23505 with uuid8 suffix (RESEARCH Pitfall 5)
- `setPublished`: double gate — server-side completeness check + RLS WITH CHECK from Plan 02 (PROF-12); returns `missingFields` array for UI feedback

## Task Commits

1. **RED: Failing unit tests** — `c69d46d` (test(03-03))
2. **GREEN: Server actions implementation** — `2909a15` (feat(profile))

## Files Created/Modified

- `lib/actions/profile.ts` — saveProfile, setPublished, resolveUniqueSlug, parseSkillArray, coerceFormDataToProfileInput (290 lines)
- `lib/actions/profile.types.ts` — SaveProfileResult, SetPublishedResult, ProfileWithRelations, SkillOfferedRow, SkillWantedRow
- `tests/unit/profile-action.test.ts` — 7 assertions for pure helpers (parseSkillArray + coerceFormDataToProfileInput)

## Decisions Made

- **FormData skills as JSON string:** `skillsOffered` and `skillsWanted` are JSON-stringified arrays on form submit. `parseSkillArray` deserializes them inside `coerceFormDataToProfileInput` before Zod parses the coerced shape.
- **avatar_url as full public URL:** MVP simplicity; avoids signed-URL complexity on free tier. Matches Plan 02 decision.
- **setPublished returns missingFields:** Plan 05 `<PublishToggle>` can render a checklist showing exactly which fields are incomplete, giving users actionable feedback without a full page reload.
- **isProfileComplete not imported in profile.ts:** The `setPublished` action re-fetches the profile row from the DB (including skills count via join) to check completeness — the form values are not available at publish time. The `isProfileComplete` helper from Plan 01 remains the client-side/RHF completeness predicate; the server action implements the same logic against DB row data.

## Deviations from Plan

None — plan executed exactly as specified. The `isProfileComplete` import was omitted (it is not used in the server action file), which is an improvement over the plan's suggestion to import it unnecessarily.

## TDD Gate Compliance

- RED gate commit: `c69d46d` (test(03-03): add failing unit tests)
- GREEN gate commit: `2909a15` (feat(profile): add saveProfile + setPublished server actions)
- REFACTOR: not needed — implementation is clean

## Known Stubs

None — this plan is server-action only with no UI rendering. No stub data flows to UI from this plan.

## Threat Flags

None new — all security surfaces were accounted for in the plan's threat model (T-3-03-01 through T-3-03-09). Confirmed:
- No `getSession()` or `getClaims()` in profile.ts (T-3-03-02)
- No PII in console.error calls — only `error.code` logged (T-3-03-04)
- Slug immutability enforced at application layer (T-3-03-05)
- `owner_id = user.id` WHERE clause on both SELECT and UPDATE in setPublished (T-3-03-09)

## Self-Check: PASSED

| Check | Result |
|-------|--------|
| lib/actions/profile.ts exists | FOUND |
| lib/actions/profile.types.ts exists | FOUND |
| tests/unit/profile-action.test.ts exists | FOUND |
| commit c69d46d (RED) exists | FOUND |
| commit 2909a15 (GREEN) exists | FOUND |
