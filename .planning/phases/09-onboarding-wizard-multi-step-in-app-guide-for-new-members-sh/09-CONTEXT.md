# Phase 9: Onboarding Wizard — Context

**Gathered:** 2026-04-22
**Status:** Ready for planning

<domain>
## Phase Boundary

A one-time, multi-step in-app guide for new members shown after first sign-up. Teaches them to complete their profile (so it appears in the directory), browse the directory, and send their first contact request. Dismissible mid-wizard and resumable. Wizard state persisted in the DB.

Does NOT include: profile edit form changes, directory changes, contact relay changes, email notifications triggered by onboarding completion, or any analytics events beyond what's already captured by PostHog.

</domain>

<decisions>
## Implementation Decisions

### Wizard Container

- **D-01:** Onboarding wizard lives at a dedicated `/onboarding` route with its own distraction-free layout — no AppNav. Route group `(onboarding)` mirrors the `(auth)` and `(admin)` pattern.
- **D-02:** Middleware intercepts authed + email-verified users whose `profiles.onboarding_completed_at IS NULL` and whose current path is not `/onboarding` — redirects them to `/onboarding`. This fires on the first post-verification request, typically right after `/auth/callback` or `/auth/confirm` redirects.
- **D-03:** On dismiss (user closes wizard mid-way), redirect to `/directory`. The wizard does not block access to the app.
- **D-04:** AppNav gets a persistent "Finish setup →" link that shows until `onboarding_completed_at` is set. Clicking it resumes at `/onboarding?step=N` where N is the last step the user reached. This is the only resume entry point.

### Step Interactivity

- **D-05:** Steps are instructional — they explain what to do and provide a CTA that sends the user to the real page. No form logic is duplicated inside the wizard.
- **D-06:** Step 1 (Profile): Embeds a live read of `ProfileCompletenessChecklist` (the existing component) showing which of the 5 fields are done. CTA "Edit my profile →" goes to `/profile/edit`. After saving the profile edit form, the save redirect goes back to `/onboarding?step=1`. On re-load, the wizard re-checks completeness — all 5 items green unlocks the Next button.
- **D-07:** Step 2 (Directory): Informational explanation of how the directory works. CTA "Browse the directory →" opens `/directory` in the same tab. No completion check — Next button is always active on this step.
- **D-08:** Step 3 (Contact): Informational explanation of how to send a contact request. CTA "Find someone to contact →" opens `/directory`. No completion check — reaching/viewing this step marks the wizard as done.

### State Persistence

- **D-09:** Add `onboarding_completed_at timestamptz` (nullable) column to the `profiles` table via a new migration. `NULL` = onboarding in progress. A timestamp = completed on that date.
- **D-10:** Middleware reads `onboarding_completed_at` via a server-side Supabase query (service-role or anon with RLS policy allowing owner to read own row). If `NULL` and user is authed + verified, redirect to `/onboarding`.
- **D-11:** Wizard is marked complete (timestamp written) when the user reaches and views Step 3 — regardless of whether they have sent a contact request. Server Action updates `profiles.onboarding_completed_at = now()` when Step 3 is rendered.
- **D-12:** The "Finish setup" AppNav link is conditionally rendered based on whether the server-side profile fetch returns `onboarding_completed_at IS NULL`. No client-side guessing.

### Step Structure

- **D-13:** 3 steps, linear: Step 1 Profile → Step 2 Directory → Step 3 Contact. No introductory welcome screen.
- **D-14:** Progress indicator shows step position (e.g., dots or "Step 1 of 3"). Design is Claude's discretion (simple dot indicator or pill tabs labelled Profile / Directory / Contact).
- **D-15:** Only Step 1 has a hard gate: profile must be complete (all 5 `ProfileCompletenessChecklist` items green) before Next activates. Steps 2 and 3 advance freely.
- **D-16:** Each step has a "Skip for now" or dismiss option that sends the user to `/directory` and does NOT mark the wizard as complete.

### Claude's Discretion

- Progress indicator visual design (dots vs. labelled tabs vs. step counter) — keep it minimal.
- Exact copy/tone for each step's headline and body — warm, community feel, consistent with the sage/forest palette brand voice.
- Whether the AppNav "Finish setup" link uses a Badge/dot indicator for attention vs. just plain text.
- RLS policy for reading own `onboarding_completed_at` field — planner decides if this reuses the existing profile owner policy or needs a targeted addition.

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Project foundation
- `.planning/PROJECT.md` — Core constraints: solo builder, free-tier, Supabase Auth only.
- `.planning/ROADMAP.md` §Phase 9 — Goal statement: "shown once after first sign-up, dismissible, resumable."

### Schema and migrations to extend
- `supabase/migrations/003_profile_tables.sql` — profiles table; the new `onboarding_completed_at` column goes here as a new migration.
- `lib/database.types.ts` — TypeScript types; must be regenerated after migration.

### Existing patterns to follow
- `lib/supabase/middleware.ts` — All middleware logic lives here. The onboarding redirect check (D-02, D-10) must be added to `updateSession()` following the existing admin-guard pattern. Extend `ALWAYS_ALLOWED` to include `/onboarding` so the redirect doesn't loop.
- `app/auth/callback/route.ts` — Currently redirects to `/directory` (or `?next=`). No changes needed here — middleware handles the intercept.
- `components/profile/ProfileCompletenessChecklist.tsx` — The 5 completeness requirements already encoded. Step 1 renders this component directly.
- `app/(admin)/layout.tsx` — Reference for a route group layout with its own chrome (no AppNav). The `(onboarding)` group follows this same pattern.
- `components/layout/AppNav.tsx` — "Finish setup →" link added here conditionally; reads profile's `onboarding_completed_at` server-side.

### Prior phase context (read for patterns)
- `.planning/phases/01-foundation-infrastructure/01-CONTEXT.md` — Route group conventions, Supabase client factory.
- `.planning/phases/03-profile-georgia-gate/03-CONTEXT.md` — Profile completeness requirements origin (PROF-12).

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `components/profile/ProfileCompletenessChecklist.tsx` — 5-item checklist component. Step 1 of the wizard embeds this directly. Accepts `ProfileCompletenessInput` type.
- `components/ui/dialog.tsx`, `components/ui/sheet.tsx` — Available but NOT used for this wizard (dedicated route chosen instead).
- `components/ui/button.tsx`, `components/ui/badge.tsx` — Used for CTA buttons and optional AppNav badge.
- `components/ui/separator.tsx`, `components/ui/skeleton.tsx` — Available for wizard layout polish.

### Established Patterns
- Route groups with own layouts: `(auth)`, `(app)`, `(admin)` — `(onboarding)` follows the same pattern.
- Middleware redirect guards: `ALWAYS_ALLOWED` list + path prefix checks in `updateSession()` — onboarding redirect slotted in here.
- Server Actions for profile mutations: `actions/profile.ts` (Phase 3) — `onboarding_completed_at` write uses same server action pattern.
- Supabase SSR client: `lib/supabase/server.ts` — used in wizard page to fetch profile completeness.

### Integration Points
- `middleware.ts` / `lib/supabase/middleware.ts` — intercept logic for new users.
- `app/(app)/layout.tsx` — AppNav lives here; conditionally show "Finish setup" based on `onboarding_completed_at`.
- `app/(app)/profile/edit/page.tsx` — Save redirect must be parameterized to support `?returnTo=/onboarding` so the wizard gets control back after profile edit.

</code_context>

<specifics>
## Specific Ideas

- Step 1 shows the `ProfileCompletenessChecklist` live (server-rendered, shows current field state) with the "Edit my profile →" CTA. After the user returns from `/profile/edit`, the page re-fetches and all 5 items green = Next unlocks. This re-uses existing code with zero duplication.
- "Finish setup →" in AppNav: visible only when `onboarding_completed_at IS NULL`. Clicking it goes to `/onboarding?step=N` where N is inferred from which steps are done (profile complete = step 1 done → resume at step 2, etc.).
- Middleware guard: add `/onboarding` to `ALWAYS_ALLOWED` so the redirect doesn't create a loop. The onboarding intercept fires only on paths NOT in `ALWAYS_ALLOWED` and NOT already `/onboarding`.

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope.

</deferred>

---

*Phase: 09-onboarding-wizard-multi-step-in-app-guide-for-new-members-sh*
*Context gathered: 2026-04-22*
