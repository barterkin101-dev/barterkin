# Phase 5: Contact Relay + Trust (joined) - Context

**Gathered:** 2026-04-20
**Status:** Ready for planning

<domain>
## Phase Boundary

Ship the platform-relayed first-contact mechanic together with its non-negotiable day-one trust floor (rate limits, block, report, admin ban, bounce handling). The Supabase Edge Function `send-contact` is the centerpiece — it validates sender eligibility, enforces rate limits, inserts the `contact_requests` row (KPI source of truth), sends the relay email via Resend, and fires the `contact_initiated` PostHog event.

**Does NOT include:** directory browse/search (Phase 4 — done), profile editing (Phase 3 — done), landing page (Phase 6), in-app messaging or inbox UI (out of scope for MVP — the email IS the inbox).

Joined by design: launching the relay without rate limits + block + report + ban = day-one spam cannon. These ship as one phase.

</domain>

<decisions>
## Implementation Decisions

### Contact Form UI

- **D-01:** Contact button on `/m/[username]` profile page opens a **right-side Sheet** (shadcn Sheet component). No page navigation — user stays in context on the profile page.
- **D-02:** On successful send, the form inside the Sheet is **replaced with an inline success state**: "✓ Sent! [Sender Name] will get your message and can reply directly." with a single [Close] button to dismiss the sheet. No toast, no redirect.
- **D-03:** Rate-limit / eligibility rejection errors (banned, blocked, not accepting contact, over-limit) surface as **inline errors within the Sheet** — not a toast. The form stays open so the user can read the reason clearly.

### Report + Block Affordance

- **D-04:** A **3-dot overflow menu** (`...` icon button, shadcn DropdownMenu) appears in the profile card header on `/m/[username]`. Menu items: "Block [Name]" and "Report [Name]".
- **D-05:** The overflow menu is hidden on the user's own profile (you can't block or report yourself). Show only when `viewer_id !== profile.owner_id`.
- **D-06:** **Block** triggers an AlertDialog: "Block [Name]? They won't appear in your directory and can't contact you." with [Block] and [Cancel] buttons. Confirmed block runs a server action, redirects user back to `/directory`, and the blocked member disappears from their directory view immediately (enforced by RLS via the `blocks` table).
- **D-07:** **Report** triggers a Dialog with a reason Select dropdown (harassment, spam, off-topic, impersonation, other per TRUST-01 enum) + optional note textarea + [Submit Report] and [Cancel]. On submit: inserts into `reports` table, emails admin (TRUST-06), shows inline confirmation: "Report submitted. We'll review it." sheet stays open briefly then auto-dismisses, or [Close].

### New Contact Badge (CONT-10)

- **D-08:** A badge (red dot or count) appears on the **"My Profile" nav bar link** when the authenticated user has unread contact requests. Clears once the user visits `/profile` (or `/profile/edit`). No separate inbox UI — the email is the inbox; the badge is just a nudge.
- **D-09:** Badge count is driven by a query: `count(*) from contact_requests where recipient_id = auth.uid() AND seen_at IS NULL`. A `seen_at` column on `contact_requests` is set server-side when user visits their profile page.

### Email Template

- **D-10:** A branded **React Email component** at `emails/contact-relay.tsx`. Forest-green header with "Barterkin · Georgia Barter Network", message body quoting the sender's text, and a clear "Reply to this email to respond directly to [Sender Name]" line.
- **D-11:** Email subject line: **"[Sender Name] wants to barter with you"** — personal and direct.
- **D-12:** Email footer and body detail: Claude's discretion — keep it minimal and trust-building. Include a link to the sender's profile (`/m/[username]`) so recipient can verify before replying. Standard footer: "Georgia Barter Network · barterkin.com". No unsubscribe link required for transactional relay (this is not marketing email).

### Claude's Discretion

- HMAC signature verification approach for the Resend webhook at `/api/webhooks/resend` (use Resend's `Webhook` class from the SDK — it handles signature validation)
- Whether `contact_requests.seen_at` is updated in the layout server component or via a separate server action on profile page load
- Specific shadcn Sheet dimensions and animation (right-side slide, standard width)
- RLS policy design for the `blocks`, `reports`, and `contact_requests` tables
- Whether to use `posthog-node` (server-side from Edge Function) or fire the event separately

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Project-level

- `.planning/PROJECT.md` — Core value, constraints, key decisions. Especially: Edge Function for relay (not Server Action), service-role key stays out of Next.js bundle, privacy constraint (member email never exposed), `contact_initiated` as KPI event.
- `.planning/REQUIREMENTS.md` §Contact Relay (CONT-01..CONT-11) and §Trust & Safety (TRUST-01..TRUST-07) — full requirement list for this phase.
- `.planning/ROADMAP.md` §Phase 5 — goal + 5 success criteria.

### Research (prescriptive for Phase 5)

- `.planning/research/PITFALLS.md` §11 and §15 — why relay and trust MUST ship together. Read before any architecture decision.
- `.planning/research/STACK.md` — Pinned versions (Resend 4.x, react-email 4.x, posthog-node). THE bible for dependency choices.
- `.planning/research/ARCHITECTURE.md` — Edge Function patterns, rate-limit counter caching, Resend + Supabase Edge Function integration patterns.

### Prior phase artifacts (patterns to extend)

- `.planning/phases/01-foundation-infrastructure/01-CONTEXT.md` — D-06–D-09: secret hygiene (service-role key NEVER in Next.js bundle), env-var naming conventions (D-08), conventional commits.
- `.planning/phases/03-profile-georgia-gate/03-CONTEXT.md` — server action pattern (`lib/actions/*.ts`), shadcn Form + react-hook-form + zod pattern, route group `app/(app)/`.
- `supabase/migrations/003_profile_tables.sql` — `profiles.accepting_contact` (bool, default true), `profiles.banned` (bool, default false) already exist. Phase 5 builds on these. No need to add these columns.
- `supabase/migrations/004_directory_search.sql` — RLS patterns for `profiles` visibility. Phase 5 `blocks` RLS must complement the existing `Verified members see published non-banned profiles` policy.

### External standards (read before implementing)

- https://supabase.com/docs/guides/functions — Supabase Edge Function deployment, secrets, JWT forwarding pattern.
- https://resend.com/docs/send-with-supabase-edge-functions — Resend + Edge Function integration (the exact Phase 5 pattern).
- https://react.email/docs — React Email component API, `resend.emails.send({ react: MyEmail(props) })` call pattern.

### Operational

- `~/.claude/projects/-Users-ashleyakbar/memory/barterkin.md` — Live Supabase project ref, Vercel team, Resend domain (secrets in 1Password only).

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets

- `app/(app)/m/[username]/page.tsx` — Profile view page. This is where the Contact button and the 3-dot overflow menu are added. ProfileCard component already renders here.
- `components/profile/ProfileCard` — Existing card component; extend to include Contact button and 3-dot menu.
- `components/ui/sheet.tsx`, `dialog.tsx`, `alert-dialog.tsx`, `dropdown-menu.tsx` — All available via shadcn. Core UI primitives for Contact Sheet, Block AlertDialog, Report Dialog, and 3-dot DropdownMenu.
- `lib/actions/profile.ts` — Server action pattern (`'use server'` + zod + `createClient()` from `server.ts`). Phase 5 adds `lib/actions/contact.ts` (block, report) following the same pattern.
- `lib/schemas/profile.ts` — Zod schema pattern. Phase 5 adds `lib/schemas/contact.ts` for message validation (20–500 chars) and report reason enum.
- `app/api/` — Existing route handler directory. Phase 5 adds `app/api/webhooks/resend/route.ts` for bounce/complaint handling.

### Established Patterns

- **Server actions:** `'use server'` modules in `lib/actions/`, imported into components via `useActionState` / `useFormStatus`. Block and Report actions follow this pattern.
- **Edge Function:** `supabase/functions/send-contact/index.ts` is Phase 5's new addition. Does NOT use `lib/actions/` — it's a standalone Deno function with its own Resend + Supabase client setup.
- **TypeScript strict:** All files must pass `pnpm typecheck`. No `any`. Edge Functions use Deno-native types.
- **RLS-first:** Every trust enforcement (banned, blocked, accepting_contact=false) is enforced in the Edge Function AND in database policies — never trust-by-UI alone.
- **Conventional commits:** `feat(relay): ...`, `feat(trust): ...`, `chore(relay): ...` scoped to phase domain.

### Integration Points

- **`profiles.accepting_contact`** — Already in DB from Phase 3. Edge Function checks this before sending.
- **`profiles.banned`** — Already in DB from Phase 3. Edge Function checks sender AND recipient. RLS on directory already filters banned profiles.
- **PostHog:** `posthog.capture('contact_initiated', ...)` fires from inside the Edge Function (server-side). PostHog provider already initialized from Phase 1.
- **Nav bar:** Phase 5 adds the new-contact badge to the existing `app/(app)/layout.tsx` nav bar component.
- **`lib/database.types.ts`** — Must be regenerated after Phase 5 migrations (`supabase gen types typescript`) to include `contact_requests`, `blocks`, `reports` tables.

</code_context>

<specifics>
## Specific Ideas

- **Contact Sheet trigger:** The "Contact [Name]" button on `/m/[username]` should be visually prominent — primary forest button, not a ghost. It's the core value prop action.
- **Contact Sheet header:** "Send [Name] a message" — personalizes the interaction.
- **Rate limit error copy:** "You've reached your daily contact limit. Try again tomorrow." / "You've already contacted this person recently." — specific and non-threatening, not just "Error".
- **Block aftermath:** After confirming block, redirect to `/directory` with a brief toast: "[Name] blocked." so the user knows it worked.
- **Report aftermath:** Inline in the dialog: "Report submitted. We'll review it." — don't close immediately; let them read confirmation.
- **New contact badge:** Only visible to authenticated users; server-rendered in the `app/(app)/layout.tsx` layout. Count resets on `/profile` visit.
- **Sender's profile link in email:** Include `View [Sender Name]'s profile: barterkin.com/m/[username]` in the email body — helps recipient verify before replying.

</specifics>

<deferred>
## Deferred Ideas

- **Unblock flow:** Users will eventually want to unblock someone. Defer to post-MVP — add to v1.1 backlog when users request it. For now, admin can clear via SQL.
- **Sender notification on bounce:** If Resend fires a bounce webhook, `contact_requests.status` updates but the sender is NOT notified in-app (no inbox). Post-MVP: add a notification when sender's next send attempt fails because their last message bounced.
- **Read receipts / contact history:** No inbox UI in MVP. Defer all "see my sent contacts" functionality.
- **Rate limit surfacing before send:** Showing "X of 5 daily sends used" proactively in the Contact Sheet. Nice UX, adds complexity. Defer to post-launch if users complain about surprise rate-limit errors.

</deferred>

---

*Phase: 05-contact-relay-trust-joined*
*Context gathered: 2026-04-20*
