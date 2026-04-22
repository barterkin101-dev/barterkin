# Phase 8: Admin Dashboard — Context

**Gathered:** 2026-04-21
**Status:** Ready for planning

<domain>
## Phase Boundary

Non-technical moderation UI at `/admin` for a single named admin (wife). Covers: member list + search, per-member detail view, ban/unban action, contact request log with message content, and a basic stats dashboard. Protected by email-based middleware check. Does NOT include: email notifications to banned members, audit log with reasons, or any member-facing changes.

</domain>

<decisions>
## Implementation Decisions

### Admin Access Control

- **D-01:** Admin identity check: compare logged-in email against `NEXT_PUBLIC_ADMIN_EMAIL` env var in middleware. Single-admin, no DB migration needed.
- **D-02:** Admin routes live in `app/(admin)/` route group with its own layout — no `AppNav`. Separate minimal admin chrome (simple top nav or sidebar).
- **D-03:** Middleware should redirect non-admin authenticated users away from `/admin/*` (same pattern as the `(auth)` redirect for already-authed users).

### Members List & Search

- **D-04:** Each row shows: display name, county, join date, status badge (Published / Unpublished / Banned). No email column in the list view.
- **D-05:** Real-time search by display name — filters as she types. No submit button.
- **D-06:** Clicking a row navigates to `/admin/members/[id]` — a dedicated admin profile detail page showing all profile fields, avatar, skills, and the ban/unban button.

### Ban/Unban Flow

- **D-07:** Ban action triggers an `<AlertDialog>` (shadcn/ui already installed) with "Are you sure you want to ban [name]?" and Confirm/Cancel buttons. No reason/note field.
- **D-08:** Unban uses the same confirmation dialog pattern: "Are you sure you want to unban [name]?"
- **D-09:** No notification email to the banned member — silent ban. Profile disappears from directory on ban.
- **D-10:** Ban/unban uses the existing `lib/supabase/admin.ts` service-role client via a Server Action. The `profiles.banned` column already exists in the DB — no migration needed.

### Contact Requests View

- **D-11:** Admin can see full message content (sender name, recipient name, message body, status, date).
- **D-12:** Status filter tabs across the top: All | Bounced | Failed. Default tab: All.
- **D-13:** "Mark reviewed" is auto — no explicit button. The contact requests view is read-only for the admin; the existing `seen_at` column is member-facing and not repurposed for admin review state.
- **D-14:** Contacts shown in reverse chronological order (newest first).

### Stats Dashboard

- **D-15:** Stats cards on the admin home (`/admin`): Total Members, Contacts Sent (all time), New Members This Week. These match the ROADMAP spec exactly.
- **D-16:** Stats fetched server-side on page load — no real-time polling. Simple count queries via service-role client.

### Claude's Discretion

- Table vs. card list layout for members — planner can decide (shadcn/ui `table` component not yet installed; could install or use HTML table with Tailwind classes).
- Admin nav structure (sidebar vs. simple top links) — minimal, functional, non-technical user.
- Pagination vs. load-more for members list — planner decides based on expected member count.
- Exact Tailwind styling for admin chrome — keep it clean and minimal, consistent with sage/forest palette but can be simpler than the member-facing shell.

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Project foundation
- `.planning/PROJECT.md` — Core constraints (solo builder, free-tier, Supabase Auth only, no custom auth code).
- `.planning/REQUIREMENTS.md` — Full requirement list; admin dashboard requirements are in ROADMAP.md Phase 8 description.
- `.planning/ROADMAP.md` §Phase 8 — Goal statement and scope for this phase.

### Phase artifacts to extend (not replace)
- `.planning/phases/01-foundation-infrastructure/01-CONTEXT.md` — Stack decisions, route group patterns, Supabase client factory.
- `.planning/phases/03-profile-georgia-gate/03-CONTEXT.md` — Profile schema decisions; `profiles.banned` column origin.
- `.planning/phases/05-contact-relay-trust-joined/05-CONTEXT.md` — contact_requests table schema, trust model decisions.

### Database schema (read before writing admin queries)
- `supabase/migrations/003_profile_tables.sql` — profiles table schema including `banned`, `is_published`, `owner_id`.
- `supabase/migrations/005_contact_relay_trust.sql` — contact_requests table schema (sender_id, recipient_id, message, status, seen_at, created_at).
- `lib/database.types.ts` — TypeScript types for all tables.

### Existing patterns to follow
- `lib/supabase/admin.ts` — Service-role client (already exists). Admin server actions MUST use this, not the anon client.
- `lib/supabase/middleware.ts` — Existing middleware pattern; extend to add admin route protection.
- `app/(app)/layout.tsx` — Reference for route group layout pattern (admin uses its own layout, not this one).
- `components/ui/alert-dialog.tsx` — Already installed; use for ban/unban confirmation.
- `components/ui/badge.tsx` — Already installed; use for member status badges.

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `lib/supabase/admin.ts` — Service-role Supabase client. Admin server actions use this directly — no new client setup needed.
- `components/ui/alert-dialog.tsx` — Ban/unban confirmation dialog. Already installed and styled.
- `components/ui/badge.tsx` — Status badges (Published/Unpublished/Banned). Already installed.
- `components/ui/card.tsx` — Stats cards on `/admin` home. Already installed.
- `components/ui/input.tsx` — Real-time search input. Already installed.
- `components/ui/button.tsx` — Ban/unban action buttons. Already installed.
- `components/ui/avatar.tsx` — Member avatar in detail view. Already installed.
- `components/ui/skeleton.tsx` — Loading states. Already installed.
- `components/ui/pagination.tsx` — If planner chooses pagination for members list. Already installed.
- `lib/middleware.ts` (or `middleware.ts`) — Extend with admin email check for `/admin/*` routes.

### Established Patterns
- Route groups: `app/(auth)/` for auth shell, `app/(app)/` for member shell — admin uses `app/(admin)/` following same convention.
- Server Actions: `lib/actions/` directory. Admin ban/unban actions go here, using `supabase/admin.ts`.
- Data fetching: `lib/data/` directory for server-side data functions. Admin queries go here.
- Form validation: react-hook-form + zod — but admin ban/unban is just a confirm dialog, no form library needed.

### Integration Points
- `middleware.ts` — Add admin email check: if path starts with `/admin` and `session.user.email !== process.env.NEXT_PUBLIC_ADMIN_EMAIL`, redirect to `/`.
- `profiles` table — `banned` column exists; admin Server Action sets `banned = true/false` via service-role client.
- `contact_requests` table — Admin queries all rows (service-role bypasses RLS which only exposes own rows to members).

### Note on shadcn/ui table
- `components/ui/table.tsx` is NOT yet installed. Planner can either: (a) install it via `pnpm dlx shadcn@latest add table`, or (b) use a plain HTML `<table>` with Tailwind classes for the members list.

</code_context>

<specifics>
## Specific Ideas

- The admin is non-technical — UI must be self-explanatory. Labels should be plain English (not "banned: true", but "Banned" badge in red).
- Stats on the `/admin` home page serve as the landing screen when she logs in.
- The contact requests view is primarily for spotting abuse — message content visibility is intentional and important for moderation.

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope.

</deferred>

---

*Phase: 08-admin-dashboard-non-technical-ui-at-admin-for-wife-to-manage*
*Context gathered: 2026-04-21*
