# Phase 3: Profile & Georgia Gate - Context

**Gathered:** 2026-04-20
**Status:** Ready for planning

<domain>
## Phase Boundary

Email-verified users can build a complete member profile (display name, bio, avatar, up to 5 skills offered, up to 5 skills wanted, exactly one of 159 Georgia counties, primary category, availability, contact preference, optional TikTok handle) and publish it. RLS enforces that only published + email-verified + not-banned profiles are visible at `/m/[username]` or in the directory. Editing any field reflects immediately (no approval step).

**Does NOT include:** directory browse/search (Phase 4), contact relay (Phase 5), landing page (Phase 6). Profile page at `/m/[username]` ships here as the member's public card; the directory grid ships in Phase 4.

</domain>

<decisions>
## Implementation Decisions

### Profile Editor Structure

- **D-01:** Single-page scrollable form with visual sections — not a multi-step wizard. Sections: Basic Info (display name, bio, avatar), Skills (offered + wanted), Location & Category (county, category, availability), Preferences (contact toggle, TikTok handle).
- **D-02:** Editor lives at `/profile/edit` as a dedicated route. Separate from the profile view at `/profile` (own published view). No inline view/edit toggle.
- **D-03:** Single "Save" button at the bottom of the page. No auto-save, no per-section save buttons. Validation runs on submit.
- **D-04:** After a successful save — stay on `/profile/edit` with a success toast. No redirect to view mode.

### Skills Input UX

- **D-05:** Dynamic text rows for both skills offered and skills wanted. Start with 1 empty row; "+ Add skill" button adds more rows up to the 5-item cap; each row has a remove (×) button. Free-text, 1–60 chars per skill. No external tag library needed.
- **D-06:** Two separate labeled sections on the form: "Skills I Offer" and "Skills I Want". Mirrors the DB schema (separate `skills_offered` / `skills_wanted` tables). Not tabbed — both sections visible simultaneously.

### Username for `/m/[username]`

- **D-07:** Auto-slug from display name (e.g. "Kerry Smith" → `kerry-smith`). Suffix-based collision resolution (e.g. `kerry-smith-2`). User does not pick or see the slug during profile creation — it's generated server-side on first profile save.
- **D-08:** Slug is set once on first profile save and locked. No slug changes after that. Prevents broken directory links. If display name changes later, slug stays the same.
- **D-09:** `/m/[username]` profile pages are auth-gated — accessible only to authenticated + email-verified users. Not publicly crawlable. Consistent with directory being member-only.

### Claude's Discretion

- **Avatar upload:** Client-side resize via canvas API before upload (target ≤500KB, max 1080px longest side). Storage path: `avatars/{user_id}/avatar.jpg` (overwrite on update, single file per user). Bucket name: `avatars`, public read via signed URL or storage transform.
- **Publish gate UI:** Disabled "Publish" toggle with tooltip listing missing fields (display name, county, category, ≥1 skill offered, avatar). On direct click of disabled toggle, show an inline checklist of unmet criteria.
- **County typeahead:** Static JSON of 159 FIPS-ordered Georgia counties bundled in the client (small, never changes). shadcn/ui Combobox pattern (Command + Popover). No Postgres round-trip needed for the list.
- **Form library:** shadcn/ui Form (react-hook-form + zod) — already established in Phase 2 auth forms. Extend the same pattern.
- **Route group:** Profile routes live under `app/(app)/` route group (authenticated shell), parallel to `app/(auth)/` established in Phase 2.

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Project-level

- `.planning/PROJECT.md` — Core value, constraints, key decisions. Especially: separate `skills_offered`/`skills_wanted` tables, honor-system Georgia gate, brand palette, auth constraints.
- `.planning/REQUIREMENTS.md` §Profile (PROF-01 through PROF-14) and §Georgia Gate (GEO-01, GEO-02) — Full requirement list for this phase.
- `.planning/ROADMAP.md` §Phase 3 — Goal statement + 5 success criteria.

### Phase 2 artifacts (patterns to extend, not replace)

- `.planning/phases/02-authentication-legal/02-PATTERNS.md` — Component and route patterns established in Phase 2. Profile routes follow the same shape as auth routes.
- `.planning/phases/02-authentication-legal/02-RESEARCH.md` — Supabase three-client factory, server action patterns, RLS patterns.
- `supabase/migrations/002_auth_tables.sql` — `current_user_is_verified()` helper function is already installed. Phase 3 RLS on `profiles` references it.

### Phase 1 artifacts

- `.planning/phases/01-foundation-infrastructure/01-CONTEXT.md` — D-01 through D-22. Especially: public-repo secret hygiene (D-06–D-09), env-var naming conventions (D-08), conventional commits format.

### External standards

- https://supabase.com/docs/guides/storage — Supabase Storage upload pattern, RLS for storage buckets, signed URLs.
- https://supabase.com/docs/guides/database/full-text-search — For Phase 4 FTS; Phase 3 only needs the profile schema to define the right `tsvector` column.
- https://ui.shadcn.com/docs/components/combobox — shadcn/ui Combobox (Command + Popover) — canonical county typeahead pattern.
- https://ui.shadcn.com/docs/components/form — shadcn/ui Form with react-hook-form + zod, same as Phase 2 auth forms.

### Operational

- `~/.claude/projects/-Users-ashleyakbar/memory/barterkin.md` — Live Supabase project ref (`hfdcsickergdcdvejbcw`), Vercel team, Resend domain. Secrets in 1Password only.

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets

- `components/ui/form.tsx`, `input.tsx`, `button.tsx`, `card.tsx`, `label.tsx`, `separator.tsx` — All already installed. Profile editor uses these exclusively for field rendering.
- `lib/supabase/client.ts`, `server.ts`, `middleware.ts` — Three-client factory already established. Profile server actions use `createClient()` from `server.ts`; client-side avatar upload uses `createClient()` from `client.ts`.
- `lib/actions/auth.ts` — Server action module pattern for Phase 3 to follow in `lib/actions/profile.ts`.
- `app/(auth)/layout.tsx` — Auth shell layout pattern. Phase 3 adds an `app/(app)/layout.tsx` for the authenticated app shell (nav, etc.).
- `components/ui/alert.tsx` — Already installed; use for inline form errors.

### Established Patterns

- **Server actions:** `lib/actions/*.ts` — server action modules, imported into forms via `useActionState` / `useFormStatus`. Follow same pattern as `lib/actions/auth.ts`.
- **Route groups:** `app/(auth)/` pattern for grouped routes with shared layout. Phase 3 adds `app/(app)/` for the authenticated shell.
- **TypeScript strict:** All files must pass `pnpm typecheck`. No `any` types.
- **Conventional commits:** `feat(profile): ...`, `chore(profile): ...` etc. scoped to phase domain.

### Integration Points

- **RLS:** Phase 3 migration adds `profiles`, `skills_offered`, `skills_wanted`, `counties` tables with RLS. `current_user_is_verified()` (already in DB from Phase 2) is used in the `profiles` visibility policy.
- **Middleware:** Phase 2 middleware already handles `/verify-pending` redirect for unverified users. Phase 3 adds `/profile/edit` to the set of routes that require a complete session.
- **PostHog:** No new events in Phase 3 (the KPI event `contact_initiated` is Phase 5). PostHog provider already initialized in Phase 1.
- **Phase 4 FTS:** Phase 3 schema must include a `tsvector` generated column on `profiles` (name + bio + skills concatenated) with a GIN index — Phase 4 queries it. Define the column in the migration even though Phase 4 uses it.

</code_context>

<specifics>
## Specific Ideas

- **Section order on the form:** Basic Info → Skills I Offer → Skills I Want → Location & Category → Preferences. Completeness-required fields (name, county, category, ≥1 skill offered, avatar) should be in the first three sections so the user hits them naturally.
- **"+ Add skill" placement:** Below the last filled row, not at the top. Disabled when 5 rows exist.
- **Success toast copy:** "Profile saved." — plain, no emoji. Use shadcn/ui Sonner or the existing alert component.
- **Auto-slug logic:** `displayName.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '')`. Truncate to 40 chars. DB unique constraint on `profiles.username`; collision retry adds `-2`, `-3` up to `-9`, then falls back to UUID suffix.

</specifics>

<deferred>
## Deferred Ideas

- **Phase 2 bug (captchaToken prop not wired in login/signup pages):** Discovered in Phase 2 deferred-items. Not Phase 3 scope — needs a gap plan in Phase 2 or a pre-Phase-3 cleanup commit.
- **Profile photo cropping UI:** Crop-to-square before upload. Skipped for MVP; client-side canvas resize is sufficient. Revisit in PWA Polish (Phase 6) if avatar quality matters.
- **Username change flow:** Users can't change their slug (D-08). If this becomes a pain point post-launch, add a change-with-redirect mechanism post-MVP.
- **Public profile pages:** `/m/[username]` is auth-gated (D-09). Revisit for Phase 6 or post-launch if sharing/SEO becomes valuable.
- **Sub-categories:** 10-category taxonomy ships in MVP. Finer sub-taxonomy is v1.1+.

</deferred>

---

*Phase: 03-profile-georgia-gate*
*Context gathered: 2026-04-20*
