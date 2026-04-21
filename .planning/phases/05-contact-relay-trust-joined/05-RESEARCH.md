# Phase 5: Contact Relay + Trust (joined) - Research

**Researched:** 2026-04-21
**Domain:** Server-side email relay with rate-limiting + trust-and-safety floor (block, report, ban, bounce handling) on Next.js 16 / Supabase Edge Functions / Resend / PostHog
**Confidence:** HIGH (stack, patterns, and pitfalls all verified against codebase, official docs, and Context7-equivalent research artifacts in `.planning/research/`)

---

## Summary

Phase 5 ships the core Barterkin value prop — platform-relayed first contact — together with the non-negotiable day-one trust floor (per-sender + per-pair rate limits, self-serve block, self-serve report, admin ban via SQL, Resend bounce/complaint webhook). The architecture is prescribed: the relay lives in a **Supabase Edge Function** named `send-contact` (NOT a Next.js Server Action), so the service-role key and Resend API key stay out of the Next.js bundle. Trust enforcement is a **two-layer defense**: RLS policies on `profiles` / `blocks` / `contact_requests` at the database, re-checked inside the Edge Function for defense-in-depth. The success metric — `posthog.capture('contact_initiated', …)` — fires **server-side from the Edge Function** after a successful DB insert + Resend handoff (source of truth, not client-side).

Three new tables ship this phase: `contact_requests` (KPI source of truth + rate-limit source), `blocks` (self-serve directional relationship), `reports` (moderation queue; no admin UI at MVP — Supabase Studio is the queue). Two existing columns (`profiles.accepting_contact`, `profiles.banned`) are already in the DB from Phase 3 and must NOT be re-added. Phase 5 is also where Resend finally sends its first production-relay email, so the phase owns DNS verification of SPF/DKIM/DMARC (if not already done in Phase 1) and the first `mail-tester.com ≥9/10` validation.

The UI surface — right-side Sheet on `/m/[username]` for the Contact form, 3-dot DropdownMenu for Block/Report, AlertDialog for Block confirmation, Dialog for Report, nav badge for unseen contacts — is fully locked in `05-UI-SPEC.md`. The planner's job is to sequence the work (migration → Edge Function → server actions for block/report → UI → webhook → admin notifications) without violating the joined-launch invariant: **no relay ships without rate limits + block + report + bounce webhook live in the same phase.**

**Primary recommendation:** Plan this phase in a **strict data-first, trust-floor-before-UI order** — migrations (contact_requests + blocks + reports + RLS + unique/partial indexes for rate limiting), then Edge Function with ALL rate-limit/block/ban/accepting checks wired in day one, then server actions for block/report, then the Sheet/Dialog UI, then the Resend webhook, then the nav badge. Do **not** defer any of the trust floor to a "we'll add rate limits after launch" follow-up. Pitfalls §11 and §15 catalog exactly how this goes wrong.

---

## User Constraints (from CONTEXT.md)

### Locked Decisions

- **D-01:** Contact button on `/m/[username]` profile page opens a **right-side Sheet** (shadcn Sheet component). No page navigation — user stays in context on the profile page.
- **D-02:** On successful send, the form inside the Sheet is **replaced with an inline success state**: "✓ Sent! [Sender Name] will get your message and can reply directly." with a single [Close] button to dismiss the sheet. No toast, no redirect.
- **D-03:** Rate-limit / eligibility rejection errors (banned, blocked, not accepting contact, over-limit) surface as **inline errors within the Sheet** — not a toast. The form stays open so the user can read the reason clearly.
- **D-04:** A **3-dot overflow menu** (`...` icon button, shadcn DropdownMenu) appears in the profile card header on `/m/[username]`. Menu items: "Block [Name]" and "Report [Name]".
- **D-05:** The overflow menu is hidden on the user's own profile (you can't block or report yourself). Show only when `viewer_id !== profile.owner_id`.
- **D-06:** **Block** triggers an AlertDialog: "Block [Name]? They won't appear in your directory and can't contact you." with [Block] and [Cancel] buttons. Confirmed block runs a server action, redirects user back to `/directory`, and the blocked member disappears from their directory view immediately (enforced by RLS via the `blocks` table).
- **D-07:** **Report** triggers a Dialog with a reason Select dropdown (harassment, spam, off-topic, impersonation, other per TRUST-01 enum) + optional note textarea + [Submit Report] and [Cancel]. On submit: inserts into `reports` table, emails admin (TRUST-06), shows inline confirmation: "Report submitted. We'll review it." sheet stays open briefly then auto-dismisses, or [Close].
- **D-08:** A badge (red dot or count) appears on the **"My Profile" nav bar link** when the authenticated user has unread contact requests. Clears once the user visits `/profile` (or `/profile/edit`). No separate inbox UI — the email is the inbox; the badge is just a nudge.
- **D-09:** Badge count is driven by a query: `count(*) from contact_requests where recipient_id = auth.uid() AND seen_at IS NULL`. A `seen_at` column on `contact_requests` is set server-side when user visits their profile page.
- **D-10:** A branded **React Email component** at `emails/contact-relay.tsx`. Forest-green header with "Barterkin · Georgia Barter Network", message body quoting the sender's text, and a clear "Reply to this email to respond directly to [Sender Name]" line.
- **D-11:** Email subject line: **"[Sender Name] wants to barter with you"** — personal and direct.
- **D-12:** Email footer and body detail: Claude's discretion — keep it minimal and trust-building. Include a link to the sender's profile (`/m/[username]`) so recipient can verify before replying. Standard footer: "Georgia Barter Network · barterkin.com". No unsubscribe link required for transactional relay (this is not marketing email).

### Claude's Discretion

- HMAC signature verification approach for the Resend webhook at `/api/webhooks/resend` (use Resend's `Webhook` class from the SDK — it handles signature validation)
- Whether `contact_requests.seen_at` is updated in the layout server component or via a separate server action on profile page load
- Specific shadcn Sheet dimensions and animation (right-side slide, standard width)
- RLS policy design for the `blocks`, `reports`, and `contact_requests` tables
- Whether to use `posthog-node` (server-side from Edge Function) or fire the event separately

### Deferred Ideas (OUT OF SCOPE)

- **Unblock flow:** Users will eventually want to unblock someone. Defer to post-MVP — add to v1.1 backlog when users request it. For now, admin can clear via SQL.
- **Sender notification on bounce:** If Resend fires a bounce webhook, `contact_requests.status` updates but the sender is NOT notified in-app (no inbox). Post-MVP: add a notification when sender's next send attempt fails because their last message bounced.
- **Read receipts / contact history:** No inbox UI in MVP. Defer all "see my sent contacts" functionality.
- **Rate limit surfacing before send:** Showing "X of 5 daily sends used" proactively in the Contact Sheet. Nice UX, adds complexity. Defer to post-launch if users complain about surprise rate-limit errors.

---

## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| CONT-01 | Member can open Contact form from any profile page (when recipient `accepting_contact=true`) | §UI Pattern: Contact Sheet on `/m/[username]` uses shadcn Sheet — existing `alert-dialog.tsx`, `dialog.tsx`, `button.tsx` primitives already installed; registry add for `sheet`, `dropdown-menu`, `select` |
| CONT-02 | Sender writes 20–500 char message and submits | §Zod schema in `lib/schemas/contact.ts` — mirrors `ProfileFormSchema` pattern; min(20).max(500) + trim |
| CONT-03 | Submission handled by Supabase **Edge Function** `send-contact`, not a Server Action | §Edge Function Architecture — service-role key stays in Supabase secrets, never in Vercel env; Pitfall 2 (service-role leak) avoided by construction |
| CONT-04 | Edge Function inserts a `contact_requests` row (this IS the `contact_initiated` source of truth) | §Data Model — partial unique index `(sender_id, recipient_id, (created_at::date))` enforces per-pair daily dedupe at DB level |
| CONT-05 | Email sent via Resend: `From: noreply@<domain>`, `Reply-To: <sender_email>`, `To: <recipient_email>`, `X-Entity-Ref-ID: <contact_request_id>` | §Resend pattern — `reply_to` field on `resend.emails.send()`; `X-Entity-Ref-ID` via `headers` option |
| CONT-06 | Recipient's email never exposed to sender in-app until they voluntarily reply | §Privacy invariant — recipient email fetched server-side inside Edge Function via service-role query of `auth.users`; never returned to client |
| CONT-07 | Per-sender rate limit: ≤5/day, ≤20/week; unique index prevents duplicate sends to same recipient within 24h | §Rate-limiting Architecture — 3-layer defense: DB unique index + edge function COUNT + optional IP-based soft limit |
| CONT-08 | Per-recipient rate limit: any one sender may contact same recipient ≤2 per week | §Rate-limiting Architecture — edge function COUNT over 7-day window partitioned by `(sender_id, recipient_id)` |
| CONT-09 | Resend bounce + complaint webhook at `/api/webhooks/resend` updates `contact_requests.status` | §Resend Webhook Signing — `svix` signature verification via `resend.webhooks.verify()` SDK method; webhook secret in env |
| CONT-10 | Recipient sees in-app badge "1 new contact" on next login | §Nav Badge — server-rendered `count(*) from contact_requests where recipient_id = auth.uid() AND seen_at IS NULL`; cleared by server action on `/profile` visit |
| CONT-11 | Successful send fires `posthog.capture('contact_initiated', ...)` with anonymized ids | §PostHog Server-Side — `npm:posthog-node` inside Edge Function; `posthog.shutdown()` after capture to flush; anonymized recipient_county/recipient_category, NOT email/name |
| TRUST-01 | Any authed member can report another profile with reason enum + optional note | §Reports table — reason enum: `harassment`, `spam`, `off-topic`, `impersonation`, `other`; RLS: reporter writes own rows only |
| TRUST-02 | Any authed member can block another member; blocks hide blockee from directory + prevent contact | §Blocks table + RLS — directional `(blocker_id, blocked_id)`; directory query NOT EXISTS check via RLS or server query; contact relay edge function rejects if either direction exists |
| TRUST-03 | `profiles.banned` flag exists; when `true`, profile hidden from directory + relay rejects sends to/from | §Already in schema (Phase 3 migration 003); RLS policy `Verified members see published non-banned profiles` already filters; Edge Function re-checks |
| TRUST-04 | Admin sets `banned=true` via Supabase SQL (no admin UI at MVP) | §Ops pattern — documented runbook only; no code change needed in Phase 5 |
| TRUST-05 | Reports table scaffolded day-one with RLS; reporter identity visible only to service-role | §Reports RLS — no SELECT policy for authenticated role; service-role bypasses RLS for admin queries via Supabase Studio |
| TRUST-06 | Report submission emails the admin address (simple notification; no UI) | §Report Notification — fired from `reportMember` server action after DB insert; Resend call with `ADMIN_NOTIFY_EMAIL` env var as recipient |
| TRUST-07 | Contact relay Edge Function rejects when: sender banned, recipient banned, recipient `accepting_contact=false`, recipient blocked sender, sender blocked recipient | §Edge Function Eligibility Gate — single SQL query joining `profiles` + `blocks` returns eligibility flags; Edge Function maps to user-facing error copy |

---

## Project Constraints (from CLAUDE.md)

Distilled from `./CLAUDE.md` — these have the same authority as locked decisions. The planner MUST verify plans comply with all of them.

**Auth & security:**
- **Never `supabase.auth.getSession()` on the server** — use `getUser()` (revalidates against auth server) or `getClaims()` (JWKS-verified, fast path). `getSession()` is spoofable.
- **Never `@supabase/auth-helpers-nextjs`** — deprecated; use `@supabase/ssr` only.
- **Service-role key is server-only**: never `NEXT_PUBLIC_*` prefix; any file importing it must start with `import 'server-only'`. Phase 5's Edge Function is the canonical service-role call site; the admin.ts `supabaseAdmin` client is for Node server paths only (NOT used in Phase 5 — the Edge Function has its own service-role setup).
- **Resend key is server-only** — never in Next.js bundle; lives in Supabase Edge Function secrets (`supabase secrets set RESEND_API_KEY=…`).

**Email & deliverability:**
- `From: noreply@<domain>` requires SPF + DKIM + DMARC at DNS. Planner must verify these were set in Phase 1; if not, Phase 5 must include the remediation task BEFORE first prod send.
- `Reply-To` is server-assigned from authenticated sender's verified email — never from request body.
- CAN-SPAM alignment: Phase 5 contact-relay email should include "This message was sent via Barterkin's contact relay on behalf of [sender]. Reply directly to reach them." (already implied by D-10 + D-12).

**Server actions vs route handlers:**
- Server actions for **block, report, mark-contacts-seen** (profile-page mutations) — established pattern in `lib/actions/profile.ts`.
- API route for **Resend webhook** (`app/api/webhooks/resend/route.ts`) — externally callable endpoint.
- Edge Function for **send-contact** — per CONT-03 this is non-negotiable.

**TypeScript strict, no `any`:**
- Edge Functions use Deno-native types; Next.js code uses `Database` from `lib/database.types.ts` (regenerated after Phase 5 migrations).

**Conventional commits:**
- `feat(relay): …`, `feat(trust): …`, `chore(relay): …` scoped to phase domain.

**GSD workflow enforcement:**
- Before using Edit/Write tools, work through a GSD command. Phase 5 plans are created via `/gsd-plan-phase`; execution via `/gsd-execute-phase 5`.

**Testing split:**
- Vitest for unit (Zod schemas, pure helpers, Edge Function logic if isolated) — already configured at `vitest.config.ts`.
- Playwright for E2E — `tests/e2e/` pattern established; Phase 5 adds contact-sheet, block-flow, report-flow, badge-clear specs.

---

## Architectural Responsibility Map

Phase 5 crosses five tiers. Mapping each capability to its primary owner prevents the classic misassignment where "send email" lands in the Next.js layer and leaks the Resend key.

| Capability | Primary Tier | Secondary Tier | Rationale |
|------------|--------------|----------------|-----------|
| Contact Sheet form UI (textarea, char count, submit) | Browser / Client | — | Client state only; submits to server via Server Action that proxies to Edge Function |
| Contact form server action (RHF + zod parse) | Frontend Server (Next.js) | — | Runs on Vercel Node; validates, forwards user JWT to Edge Function, does NOT touch Resend |
| **Relay send (eligibility gate + rate limit + insert + Resend + PostHog)** | **Supabase Edge Function (Deno)** | Database (RLS defense-in-depth) | CONT-03 mandates; keeps service-role + Resend keys out of Next bundle; co-locates with DB for rate-limit COUNT queries |
| Block mutation (insert into `blocks`) | Frontend Server (Server Action) | Database (RLS) | Simple DML; the user's own cookie-bound session is sufficient; service-role NOT needed |
| Report mutation (insert into `reports` + admin email) | Frontend Server (Server Action) | Database (RLS) + Resend | Insert via user's session (RLS allows self-insert); admin email via Resend using a **Vercel-env** `RESEND_API_KEY` — BUT see §Design Note below, this is the one place Phase 5 considers whether to use Edge Function or Server Action |
| Resend webhook handler (bounce/complaint → status update) | Frontend Server (Route Handler) | Database | External webhook must have a public URL; `app/api/webhooks/resend/route.ts` is the idiomatic Next.js spot; middleware already excludes `api/webhooks` from auth gating |
| New-contact badge (server-rendered count) | Frontend Server (Server Component) | Database | Layout `app/(app)/layout.tsx` queries via user's session; passes count as prop to client `<NavLinks />` |
| Mark-seen mutation (clears badge on `/profile` visit) | Frontend Server (Server Component or Server Action) | Database | Fires during server render of `/profile/page.tsx`; simple UPDATE on `contact_requests.seen_at` |
| Directory visibility when blocked | Database (RLS) | Frontend Server | RLS on `profiles` SELECT must also check NOT EXISTS in `blocks` for the viewer; UI does not filter — database filters |
| Nav badge "clear on visit" | Frontend Server | Database | Simple; no Edge Function; runs inside the existing profile page server component |

**Design Note — Report admin-notification email.** TRUST-06 ("email the admin address") creates a question: where does the Resend API call happen for the admin notify? Two options:

1. **Inside the Server Action** (Vercel Node). Requires `RESEND_API_KEY` in Vercel env vars, which would be a new secret surface — a minor-but-real expansion of where the key lives.
2. **Inside a second Edge Function** (e.g., `send-admin-alert`) called from the server action. Keeps Resend exclusive to Supabase Edge. More code, more deploy surface.

**Recommendation:** Option 1 — `RESEND_API_KEY` in Vercel env vars for admin notifications ONLY. The contact-relay email (high-volume, user-triggered) stays in the Edge Function; the admin-notify (low-volume, internal) lives in a Server Action. Reasoning: a second Edge Function doubles deploy complexity for a rare send; the service-role key stays exclusive to Supabase; the key leak surface expands by one constant-rate low-volume path. **[ASSUMED — flag for user confirmation in discuss-phase if not already decided; CONTEXT.md does not explicitly lock this.]** A CEO-level alternative: skip the admin email entirely and rely on a saved Supabase Studio bookmark `SELECT * FROM reports WHERE status = 'pending' ORDER BY created_at DESC` as the "queue" — per PITFALLS §21 this is actually the MVP-correct approach, and TRUST-06 is arguably over-engineered. **Planner should surface this to the user for confirmation.**

---

## Standard Stack

### Core (already installed — verify versions; do not re-install)

| Library | Installed Version | Purpose | Why Standard |
|---------|-------------------|---------|--------------|
| `resend` | `^6.12.0` (latest: **6.12.2** per `npm view`) | Transactional email SDK — contact relay + admin notify | [VERIFIED: npm view resend version → 6.12.2] Free tier: 3000/mo, 100/day. `resend.webhooks.verify()` built-in for Phase 5 webhook validation. |
| `posthog-node` | `^5.29.2` (latest: **5.29.2** — current) | Server-side PostHog SDK — fires `contact_initiated` from Edge Function | [VERIFIED: npm view posthog-node version → 5.29.2] Works in Deno via `npm:posthog-node@5.29.2` specifier. Must call `posthog.shutdown()` before Edge Function returns to flush events. |
| `@supabase/ssr` | `^0.10.2` | Server/browser Supabase clients | [VERIFIED: package.json] Already wired; Phase 5 extends `lib/supabase/server.ts` usage; no new install. |
| `@supabase/supabase-js` | `^2.103.3` | Underlying JS client used in Edge Function via `npm:@supabase/supabase-js@2.x` specifier | [VERIFIED: package.json] |
| `zod` | `^4.3.6` | Message schema (20–500 chars), report reason enum | [VERIFIED: package.json] Shared across client form + server action validation |
| `react-hook-form` + `@hookform/resolvers` | `^7.72.1` + `^5.2.2` | Contact form client state | [VERIFIED: package.json] Same pattern as `ProfileEditForm` |

### New (install this phase)

| Library | Version | Purpose | Install Command |
|---------|---------|---------|-----------------|
| `react-email` + `@react-email/components` | `react-email@^4.x`, `@react-email/components@^0.1.x` | Branded React Email template for D-10 (forest-green header, quoted message, reply-instruction) | [CITED: https://react.email/docs] `pnpm add react-email @react-email/components` — peer of Resend 6.x. **Note:** `npm view react-email version` returned `6.0.0`; the CLI bumped its major to match Resend's line. CLAUDE.md STACK.md pins `react-email@4.x` which appears stale. [ASSUMED — reconcile: install latest `react-email@^4` that is compatible, or bump to `^6` with the Resend SDK. Verify at install by reading `react-email` peer deps.] |
| `svix` (OPTIONAL) | `^1.91.x` (latest: **1.91.1** per npm view) | Manual webhook signature verification if the Resend SDK's built-in `resend.webhooks.verify()` proves insufficient | [VERIFIED: npm view svix version → 1.91.1] **Prefer Resend SDK `resend.webhooks.verify()` first** — it wraps svix internally. Install svix only if building webhook test fixtures or handling webhooks from other providers. |

### shadcn UI primitives (from 05-UI-SPEC.md)

Already present in `components/ui/`: `alert-dialog.tsx`, `alert.tsx`, `avatar.tsx`, `badge.tsx`, `button.tsx`, `card.tsx`, `dialog.tsx`, `form.tsx`, `input.tsx`, `label.tsx`, `separator.tsx`, `skeleton.tsx`, `sonner.tsx`, `textarea.tsx`, `tooltip.tsx` — [VERIFIED: `ls components/ui/`].

**NEW to add via `npx shadcn add`** (per UI-SPEC §Registry additions):
- `sheet` — Contact Sheet (D-01/D-02/D-03)
- `dropdown-menu` — Overflow menu (D-04/D-05)
- `select` — Report reason dropdown (D-07)

```bash
pnpm dlx shadcn@latest add sheet dropdown-menu select
```

### Alternatives Considered

| Instead of | Could Use | Tradeoff | Recommendation |
|------------|-----------|----------|----------------|
| Supabase Edge Function for relay | Next.js Server Action | Simpler deploy (one less runtime), one less key-storage location. BUT violates CONT-03 ("keeps service-role + Resend keys out of Next bundle") and PITFALLS Pitfall 2 safety stance. | **Use Edge Function** — locked by CONT-03 |
| `resend.webhooks.verify()` (SDK method) | Raw `svix` package | SDK is higher-level, couples to Resend; svix is lower-level and more portable. | **Use Resend SDK method** per Resend's own docs; drop to svix only if SDK misbehaves |
| `posthog-node` inside Edge Function | Fire PostHog event from Next.js after Edge Function returns | Client/edge round-trip adds latency and couples "event fired" to "form succeeded" in UI. Server-fired is source-of-truth. | **Fire from Edge Function**; optionally double-fire from client for funnel UX analytics (safe — PostHog dedupes by `distinct_id` + `timestamp` if needed, or `insert_id`) |
| Separate `admin-notify` Edge Function for TRUST-06 | Server Action w/ Vercel-env Resend key | Dedicated Edge Function keeps all Resend out of Next; costs a second deploy target. | **Server Action** for admin notify; weighed in Architectural Responsibility Map |
| Block enforcement in application code | RLS policy using `NOT EXISTS (SELECT 1 FROM blocks …)` in directory query | App-code filter is easy to forget; RLS is defense-in-depth. | **RLS** — directory SELECT policy on `profiles` adds `AND NOT EXISTS (SELECT 1 FROM blocks WHERE (blocker_id = auth.uid() AND blocked_id = profiles.owner_id) OR (blocker_id = profiles.owner_id AND blocked_id = auth.uid()))` |

### Installation Commands

```bash
# new shadcn primitives
pnpm dlx shadcn@latest add sheet dropdown-menu select

# react-email (for branded template). Verify version at install time — CLAUDE.md STACK.md pins 4.x; npm registry shows 6.0.0 as current major.
pnpm add react-email @react-email/components

# optional: svix (only if building test fixtures for webhook signatures)
# pnpm add svix
```

### Version Verification (performed 2026-04-21)

| Package | Registry Version | Phase 5 Plan |
|---------|------------------|--------------|
| `resend` | 6.12.2 [VERIFIED] | Already installed `^6.12.0` — in range, do not re-install |
| `posthog-node` | 5.29.2 [VERIFIED] | Already installed `^5.29.2` — in range |
| `@react-email/components` | 1.0.12 [VERIFIED] | Install pinned to `^1.0` (current). If CLAUDE.md's `react-email@4.x` pin is wrong, correct it in commit message. |
| `react-email` (CLI) | 6.0.0 [VERIFIED] | CLI only needed for dev-preview of templates; dependency `@react-email/components` is what production needs |
| `svix` | 1.91.1 [VERIFIED] | Optional |

---

## Architecture Patterns

### System Architecture Diagram (Phase 5 sub-system)

```
                    ┌──────────────────────────────────────────┐
                    │  BROWSER (/m/[username] page)             │
                    │                                            │
                    │  ProfileCard                               │
                    │   ├─ Contact [Name] button ─┐              │
                    │   └─ 3-dot overflow menu    │              │
                    │        ├─ Block [Name]      │              │
                    │        └─ Report [Name]     │              │
                    └───────────┬────────┬────────┴──────────────┘
                                │        │
                     opens      │        │ triggers
                                ▼        ▼
                    ┌───────────────────┐  ┌─────────────────────┐
                    │  Sheet: Contact   │  │ AlertDialog: Block  │
                    │  Form (RHF+Zod)   │  │ Dialog: Report      │
                    └─────────┬─────────┘  └──────────┬──────────┘
                              │ submit                │ confirm
                              ▼                       ▼
         ┌────────────────────────────────┐  ┌─────────────────────────┐
         │ Server Action:                 │  │ Server Action:          │
         │ sendContactRequest()           │  │ blockMember() /         │
         │  • getUser() → sender_id       │  │ reportMember()          │
         │  • zod.parse message           │  │  • getUser() → actor_id │
         │  • fetch('/functions/v1/       │  │  • INSERT blocks|reports│
         │     send-contact', {           │  │  • (report) → Resend    │
         │     headers: Authorization:    │  │     admin notify        │
         │     Bearer <user JWT>})        │  └───────────┬─────────────┘
         └────────────────┬───────────────┘              │
                          │ HTTPS POST + JWT             │ RLS
                          ▼                              ▼
   ┌────────────────────────────────────────────┐  ┌─────────────────┐
   │  SUPABASE EDGE FUNCTION: send-contact       │  │ Supabase DB:    │
   │  (Deno, verify_jwt=true in config.toml)     │  │ blocks INSERT   │
   │                                              │  │ reports INSERT  │
   │  1. supabase.auth.getClaims(jwt) →          │  └─────────────────┘
   │     sender_id = claims.sub                   │
   │  2. ELIGIBILITY QUERY (service-role):        │
   │     SELECT p.banned, p.accepting_contact,    │
   │            s.banned as sender_banned,        │
   │            EXISTS(blocks A→B), EXISTS(B→A)   │
   │     FROM profiles p, profiles s, … WHERE …   │
   │  3. RATE LIMIT CHECKS (service-role):        │
   │     • COUNT(*) sender 24h > 5 → 429          │
   │     • COUNT(*) sender 7d > 20 → 429          │
   │     • COUNT(*) sender→recipient 7d > 2 → 429 │
   │  4. INSERT contact_requests (sender_id,      │
   │     recipient_id, message, status='sent')    │
   │     ← unique index (sender, recipient, date) │
   │       catches duplicate-in-24h               │
   │  5. resend.emails.send({                     │
   │       from: noreply@barterkin.com,           │
   │       to: recipient.email,                   │
   │       reply_to: sender.email,                │
   │       subject: "{sender} wants to barter…",  │
   │       react: ContactRelayEmail({...}),       │
   │       headers:{'X-Entity-Ref-ID': req.id}    │
   │     })                                        │
   │  6. UPDATE contact_requests SET              │
   │     resend_id = res.id WHERE id = req.id     │
   │  7. posthog.capture('contact_initiated', {   │
   │       recipient_county, recipient_category,  │
   │       sender_id_hash, recipient_id_hash }); │
   │     await posthog.shutdown()                 │
   │  8. RETURN { ok: true, contact_id }          │
   └────────────────┬─────────────────────────────┘
                    │                                    back to Next.js → sonner toast,
                    │ Resend API call                    Sheet swaps to success state (D-02)
                    ▼
   ┌──────────────────────────────────────┐
   │  RESEND (external SaaS)               │
   │  • Sends email                        │
   │  • Later: fires webhook when bounce   │
   │    or complaint occurs                │
   └─────────────┬────────────────────────┘
                 │ async webhook (minutes-to-days later)
                 │ signed with svix (X-Webhook-Signature headers)
                 ▼
   ┌──────────────────────────────────────────┐
   │  Next.js Route: /api/webhooks/resend      │
   │  (excluded from middleware auth gate)     │
   │                                            │
   │  1. raw body → resend.webhooks.verify()   │
   │     (throws on bad signature)             │
   │  2. switch (event.type):                  │
   │       'email.bounced'    → status=bounced │
   │       'email.complained' → status=complained│
   │       'email.delivered'  → (optional)     │
   │  3. UPDATE contact_requests SET status=…  │
   │     WHERE resend_id = event.data.email_id │
   │  4. (MVP) sender NOT notified — deferred   │
   └──────────────────────────────────────────┘
```

### Recommended File Structure (Phase 5 additions to barterkin/)

```
barterkin/
├── app/
│   ├── (app)/
│   │   ├── m/[username]/
│   │   │   └── page.tsx                 # EDIT: add ContactButton + OverflowMenu via ProfileCard props
│   │   ├── profile/
│   │   │   └── page.tsx                 # EDIT: call markContactsSeen() on render (D-08 clear)
│   │   └── layout.tsx                   # EDIT: fetch unseen contact count, pass to AppNav → NavLinks
│   ├── api/
│   │   └── webhooks/
│   │       └── resend/
│   │           └── route.ts             # NEW: Resend bounce/complaint handler (CONT-09)
│   └── profile/edit/page.tsx            # (no change — visits to /profile suffice to clear D-08)
│
├── components/
│   ├── profile/
│   │   ├── ProfileCard.tsx              # EDIT: accept viewer-context props; render ContactButton + OverflowMenu when viewer ≠ owner
│   │   ├── ContactButton.tsx            # NEW: wraps Sheet trigger + Sheet + ContactForm + SuccessState
│   │   ├── ContactForm.tsx              # NEW: client, RHF + zod, textarea, char counter, submit → sendContactRequest action
│   │   ├── ContactSuccessState.tsx      # NEW: swap-in component post-send (D-02)
│   │   ├── OverflowMenu.tsx             # NEW: DropdownMenu trigger + items for Block/Report (D-04/D-05)
│   │   ├── BlockDialog.tsx              # NEW: AlertDialog wrapping blockMember action (D-06)
│   │   └── ReportDialog.tsx             # NEW: Dialog wrapping reportMember action (D-07)
│   ├── layout/
│   │   └── NavLinks.tsx                 # EDIT: accept unseenContactCount prop; render badge dot on Your-profile Avatar
│   └── ui/
│       ├── sheet.tsx                    # NEW (npx shadcn add sheet)
│       ├── dropdown-menu.tsx            # NEW (npx shadcn add dropdown-menu)
│       └── select.tsx                   # NEW (npx shadcn add select)
│
├── lib/
│   ├── actions/
│   │   └── contact.ts                   # NEW: 'use server' — sendContactRequest (proxy to Edge Function), blockMember, reportMember, markContactsSeen
│   ├── schemas/
│   │   └── contact.ts                   # NEW: MessageSchema (20..500), ReportReasonEnum, ReportSchema
│   └── supabase/
│       ├── admin.ts                     # (no change — Phase 5 does NOT use this; Edge Function has its own service-role client)
│       └── server.ts                    # (no change)
│
├── emails/
│   └── contact-relay.tsx                # NEW: React Email template (D-10) — forest-green header, quoted message, reply instruction, sender-profile link
│
├── supabase/
│   ├── migrations/
│   │   └── 005_contact_relay_trust.sql  # NEW: contact_requests + blocks + reports + RLS + indexes + seen_at; triggers for directory-visibility-via-blocks
│   └── functions/
│       └── send-contact/
│           ├── index.ts                 # NEW: Deno Edge Function — the Phase 5 centerpiece
│           └── deno.json                # NEW: Deno config with npm: specifiers pinned
│
├── tests/
│   ├── unit/
│   │   ├── contact-schema.test.ts       # NEW: zod schema bounds
│   │   ├── contact-rate-limit.test.ts   # NEW: pure rate-limit helper if extracted from Edge Function
│   │   └── contact-rls.test.ts          # NEW: RLS visibility — blocked pair should not see each other
│   └── e2e/
│       ├── contact-relay.spec.ts        # NEW: open profile → open Sheet → submit → success state
│       ├── contact-rate-limit.spec.ts   # NEW: 6th send rejected; 3rd per-recipient rejected
│       ├── block-flow.spec.ts           # NEW: confirm block → redirect /directory → blockee not in grid
│       ├── report-flow.spec.ts          # NEW: open report → select reason → submit → inline confirm
│       └── unseen-badge.spec.ts         # NEW: unseen badge shows; visit /profile clears
│
└── .env.local.example                   # EDIT: document new envs — RESEND_WEBHOOK_SECRET (Vercel), RESEND_API_KEY (Edge Function secret), POSTHOG_API_KEY (Edge Function secret), ADMIN_NOTIFY_EMAIL (Vercel)
```

### Pattern 1: Supabase Edge Function (Deno) — send-contact

**What:** The centerpiece of Phase 5. Runs in Deno, has its own Supabase client with service-role key from Supabase-managed secrets (NOT from Vercel env), validates the user's JWT manually for `sender_id` extraction, performs eligibility checks in a single composite SQL, enforces rate limits via COUNT queries, inserts `contact_requests`, calls Resend, fires PostHog.

**When to use:** Only for the first-contact email relay. Admin-notify, bounce-handler, and all other mutations use Server Actions / Route Handlers.

**Example (skeleton — use as planner reference, not final implementation):**

```typescript
// supabase/functions/send-contact/index.ts
// Source: https://supabase.com/docs/guides/functions/quickstart + https://resend.com/docs/send-with-supabase-edge-functions
// Verified pattern 2026-04-21

import { createClient } from 'npm:@supabase/supabase-js@2.103.3'
import { Resend } from 'npm:resend@6.12.2'
import { PostHog } from 'npm:posthog-node@5.29.2'
import { ContactRelayEmail } from './email.tsx' // React Email template inlined or bundled

const supabaseUrl = Deno.env.get('SUPABASE_URL')!
const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
const resendApiKey = Deno.env.get('RESEND_API_KEY')!
const posthogApiKey = Deno.env.get('POSTHOG_API_KEY')!
const emailFrom = Deno.env.get('EMAIL_FROM') ?? 'Barterkin <noreply@barterkin.com>'
const siteUrl = Deno.env.get('NEXT_PUBLIC_SITE_URL') ?? 'https://barterkin.com'

// Rate-limit knobs (sourced from CONT-07, CONT-08; document in CONTEXT if adjusted):
const DAILY_CAP = 5
const WEEKLY_CAP = 20
const PER_RECIPIENT_WEEKLY_CAP = 2

Deno.serve(async (req) => {
  if (req.method !== 'POST') {
    return json({ error: 'Method not allowed' }, 405)
  }

  // Extract user JWT from Authorization header — config.toml sets verify_jwt = true
  // so Supabase has already validated the JWT signature by the time we get here.
  // But we still need the claims to get sender_id.
  const authHeader = req.headers.get('Authorization')
  if (!authHeader?.startsWith('Bearer ')) {
    return json({ error: 'Unauthorized' }, 401)
  }
  const jwt = authHeader.slice('Bearer '.length)

  // Service-role client — bypasses RLS for eligibility + rate-limit queries.
  const supabase = createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  })

  // Get sender from JWT claims (JWKS-verified by Supabase platform before we got here)
  const { data: userData, error: userErr } = await supabase.auth.getUser(jwt)
  if (userErr || !userData?.user) return json({ error: 'Unauthorized' }, 401)
  const sender = userData.user
  const senderId = sender.id
  const senderEmail = sender.email

  // Sender must be email-verified
  if (!sender.email_confirmed_at) {
    return json({ code: 'unverified', error: 'Verify your email before contacting members.' }, 403)
  }

  const body = await req.json()
  const { recipient_profile_id, message } = body as { recipient_profile_id: string; message: string }

  // Zod-like validation (inline for Deno — keep dependency count low)
  if (typeof message !== 'string' || message.trim().length < 20 || message.length > 500) {
    return json({ code: 'bad_message', error: 'Message must be 20–500 characters.' }, 400)
  }

  // 1. Eligibility: single query joining profiles + blocks + sender profile row
  const { data: elig, error: eligErr } = await supabase.rpc('contact_eligibility', {
    p_sender_owner_id: senderId,
    p_recipient_profile_id: recipient_profile_id,
  }).single()
  // (contact_eligibility is a SECURITY DEFINER function in migration 005 that returns:
  //  sender_banned, sender_profile_id, recipient_owner_id, recipient_email, recipient_banned,
  //  accepting_contact, blocked_by_recipient, blocked_by_sender, recipient_display_name,
  //  recipient_username, recipient_county, recipient_category)
  if (eligErr || !elig) return json({ code: 'unknown', error: 'Something went wrong.' }, 500)

  if (elig.sender_banned)        return json({ code: 'sender_banned', error: 'Your account is suspended.' }, 403)
  if (elig.recipient_banned)     return json({ code: 'recipient_unreachable', error: "This member isn't reachable." }, 403)
  if (!elig.accepting_contact)   return json({ code: 'not_accepting', error: `${elig.recipient_display_name} isn't accepting messages right now.` }, 403)
  if (elig.blocked_by_recipient) return json({ code: 'recipient_unreachable', error: `${elig.recipient_display_name} isn't reachable.` }, 403) // DO NOT reveal block
  if (elig.blocked_by_sender)    return json({ code: 'sender_blocked', error: `You've blocked ${elig.recipient_display_name}.` }, 403)

  // 2. Rate limits
  const now = new Date()
  const dayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000).toISOString()
  const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString()

  const { count: dailyCount } = await supabase.from('contact_requests')
    .select('id', { count: 'exact', head: true })
    .eq('sender_id', elig.sender_profile_id)
    .gte('created_at', dayAgo)
    .eq('status', 'sent')
  if ((dailyCount ?? 0) >= DAILY_CAP) return json({ code: 'daily_cap', error: "You've reached your daily contact limit." }, 429)

  const { count: weeklyCount } = await supabase.from('contact_requests')
    .select('id', { count: 'exact', head: true })
    .eq('sender_id', elig.sender_profile_id)
    .gte('created_at', weekAgo)
    .eq('status', 'sent')
  if ((weeklyCount ?? 0) >= WEEKLY_CAP) return json({ code: 'weekly_cap', error: "You've reached your weekly contact limit." }, 429)

  const { count: pairCount } = await supabase.from('contact_requests')
    .select('id', { count: 'exact', head: true })
    .eq('sender_id', elig.sender_profile_id)
    .eq('recipient_id', recipient_profile_id)
    .gte('created_at', weekAgo)
    .eq('status', 'sent')
  if ((pairCount ?? 0) >= PER_RECIPIENT_WEEKLY_CAP) {
    return json({ code: 'pair_cap', error: `You've already contacted ${elig.recipient_display_name} this week.` }, 429)
  }

  // 3. Insert (unique index catches the per-day dedupe race at DB level)
  const { data: request, error: insertErr } = await supabase.from('contact_requests').insert({
    sender_id: elig.sender_profile_id,
    recipient_id: recipient_profile_id,
    message: message.trim(),
    status: 'sent',
  }).select('id').single()
  if (insertErr) {
    if (insertErr.code === '23505') return json({ code: 'pair_dup', error: "You've already contacted this member recently." }, 429)
    return json({ code: 'unknown', error: 'Something went wrong.' }, 500)
  }

  // 4. Resend
  const resend = new Resend(resendApiKey)
  const profileUrl = `${siteUrl}/m/${elig.recipient_username}`
  const { data: sent, error: sendErr } = await resend.emails.send({
    from: emailFrom,
    to: elig.recipient_email,
    replyTo: senderEmail, // NOTE: key name in Resend 6.x SDK — verify per SDK docs; older docs use reply_to
    subject: `${elig.sender_display_name} wants to barter with you`, // D-11
    react: ContactRelayEmail({
      senderDisplayName: elig.sender_display_name,
      senderUsername: elig.sender_username,
      message: message.trim(),
      profileUrl: `${siteUrl}/m/${elig.sender_username}`, // per §Specifics — so recipient can verify
    }),
    headers: { 'X-Entity-Ref-ID': request.id }, // CONT-05
  })
  if (sendErr || !sent) {
    // Mark as failed; sender sees generic error. Do NOT roll back the insert — the row is the dedupe primitive.
    await supabase.from('contact_requests').update({ status: 'failed' }).eq('id', request.id)
    return json({ code: 'send_failed', error: 'Something went wrong sending your message.' }, 502)
  }

  // Record Resend id for webhook cross-reference
  await supabase.from('contact_requests').update({ resend_id: sent.id }).eq('id', request.id)

  // 5. PostHog (CONT-11) — anonymized IDs, county/category context
  const posthog = new PostHog(posthogApiKey, { host: 'https://app.posthog.com' })
  posthog.capture({
    distinctId: await hashId(senderId), // anonymize
    event: 'contact_initiated',
    properties: {
      recipient_county_id: elig.recipient_county_id,
      recipient_category_id: elig.recipient_category_id,
      contact_request_id: request.id,
    },
  })
  await posthog.shutdown() // CRITICAL: flush before function returns

  return json({ ok: true, contact_id: request.id }, 200)
})

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  })
}

async function hashId(id: string): Promise<string> {
  const enc = new TextEncoder().encode(id)
  const buf = await crypto.subtle.digest('SHA-256', enc)
  return Array.from(new Uint8Array(buf)).map((b) => b.toString(16).padStart(2, '0')).join('').slice(0, 16)
}
```

**Deno config:**

```jsonc
// supabase/functions/send-contact/deno.json
{
  "imports": {
    "@supabase/supabase-js": "npm:@supabase/supabase-js@2.103.3",
    "resend": "npm:resend@6.12.2",
    "posthog-node": "npm:posthog-node@5.29.2"
  }
}
```

**Secrets setup (one-time per Supabase project):**

```bash
supabase secrets set RESEND_API_KEY=re_xxx
supabase secrets set POSTHOG_API_KEY=phc_xxx
supabase secrets set EMAIL_FROM="Barterkin <noreply@barterkin.com>"
supabase secrets set NEXT_PUBLIC_SITE_URL=https://barterkin.com
# SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are auto-injected — do NOT set manually
```

### Pattern 2: `SECURITY DEFINER` eligibility RPC (avoids RLS trap)

Placing the eligibility JOIN in a `SECURITY DEFINER` Postgres function (with `set search_path = ''`) in the `public` schema and called via RPC lets the Edge Function get a single atomic answer without round-tripping 5 queries. Put the function in a `private.` schema if you want belt-and-suspenders; or leave in `public` with `REVOKE EXECUTE FROM anon, authenticated; GRANT EXECUTE TO service_role` so only service-role can invoke it. **Source:** [CITED: PITFALLS.md §5 — "Views and RPCs bypassed via ... Postgres views default to `SECURITY DEFINER` behavior ... Functions that must be `SECURITY DEFINER` (rare) get a comment and their own PR review."]

### Pattern 3: RLS for `blocks`

```sql
-- blocks table
create table public.blocks (
  blocker_id uuid not null references auth.users(id) on delete cascade,
  blocked_id uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (blocker_id, blocked_id),
  check (blocker_id <> blocked_id)
);
alter table public.blocks enable row level security;

-- Self-write only; no read for others
create policy "blocks_insert_self" on public.blocks for insert to authenticated
  with check (blocker_id = (select auth.uid()));
create policy "blocks_delete_self" on public.blocks for delete to authenticated
  using (blocker_id = (select auth.uid())); -- supports future unblock UI
create policy "blocks_read_self" on public.blocks for select to authenticated
  using (blocker_id = (select auth.uid()));

create index blocks_blocker_idx on public.blocks(blocker_id);
create index blocks_blocked_idx on public.blocks(blocked_id);
```

**Directory visibility cascade:** The existing `Verified members see published non-banned profiles` policy on `profiles` must be **extended** to also exclude blocked profiles. Option A: modify the policy `USING` clause to add `AND NOT EXISTS (SELECT 1 FROM blocks …)`. Option B: add a second policy — but policies OR together per command/role, so Option A is required for a tightening filter.

Suggested modified policy (migration 005 ALTERs):

```sql
-- Drop and recreate the existing policy to add the blocks check (can't ALTER POLICY … USING in-place on Postgres < 15 without care).
drop policy "Verified members see published non-banned profiles" on public.profiles;

create policy "Verified members see published non-banned non-blocked profiles"
  on public.profiles for select to authenticated
  using (
    is_published = true
    AND public.current_user_is_verified()
    AND banned = false
    AND NOT EXISTS (
      SELECT 1 FROM public.blocks b
      WHERE (b.blocker_id = (select auth.uid()) AND b.blocked_id = profiles.owner_id)
         OR (b.blocker_id = profiles.owner_id AND b.blocked_id = (select auth.uid()))
    )
  );
```

### Pattern 4: Resend webhook handler

```typescript
// app/api/webhooks/resend/route.ts
// Source: https://resend.com/docs/dashboard/webhooks/verify-webhooks-requests (2026-04-21 verified)

import { Resend } from 'resend'
import { supabaseAdmin } from '@/lib/supabase/admin'

export async function POST(req: Request) {
  // Read RAW body — signature verification is byte-sensitive
  const raw = await req.text()
  const svixId = req.headers.get('svix-id') ?? ''
  const svixTimestamp = req.headers.get('svix-timestamp') ?? ''
  const svixSignature = req.headers.get('svix-signature') ?? ''

  const resend = new Resend(process.env.RESEND_API_KEY!)
  let event
  try {
    event = resend.webhooks.verify({
      payload: raw,
      headers: { id: svixId, timestamp: svixTimestamp, signature: svixSignature },
      webhookSecret: process.env.RESEND_WEBHOOK_SECRET!,
    })
  } catch {
    return new Response('Bad signature', { status: 401 })
  }

  // Event types confirmed 2026-04-21 via https://resend.com/docs/webhooks/event-types:
  // email.sent / email.delivered / email.delivery_delayed / email.bounced /
  // email.complained / email.clicked / email.opened / email.failed
  const emailId = event?.data?.email_id ?? event?.data?.id
  if (!emailId) return new Response('ok', { status: 200 })

  let status: string | null = null
  switch (event.type) {
    case 'email.bounced':    status = 'bounced'; break
    case 'email.complained': status = 'complained'; break
    case 'email.delivered':  status = 'delivered'; break
    case 'email.failed':     status = 'failed'; break
    default: return new Response('ok', { status: 200 }) // ignore opens/clicks for MVP
  }

  await supabaseAdmin
    .from('contact_requests')
    .update({ status })
    .eq('resend_id', emailId)

  return new Response('ok', { status: 200 })
}

// Middleware already excludes /api/webhooks — verified in lib/supabase/middleware.ts
```

**Env vars needed in Vercel (production + preview):**
- `RESEND_API_KEY` — [ASSUMED — if admin-notify path is chosen (see Architectural Responsibility Map note), this also serves the admin-notify call. Otherwise the webhook is a read-only verifier and this var can be scoped to verification only.]
- `RESEND_WEBHOOK_SECRET` — created in Resend dashboard when configuring the webhook endpoint
- `SUPABASE_SERVICE_ROLE_KEY` — for the `supabaseAdmin` client that updates `contact_requests.status` (existing env var; no change)

### Pattern 5: React Email template (D-10)

```tsx
// emails/contact-relay.tsx
// Source: https://react.email/docs + D-10..D-12

import { Html, Head, Body, Container, Heading, Text, Button, Hr, Section } from '@react-email/components'

export interface ContactRelayEmailProps {
  senderDisplayName: string
  senderUsername: string
  message: string
  profileUrl: string // https://barterkin.com/m/<senderUsername>
}

export function ContactRelayEmail({ senderDisplayName, senderUsername, message, profileUrl }: ContactRelayEmailProps) {
  return (
    <Html lang="en">
      <Head />
      <Body style={{ backgroundColor: '#eef3e8', fontFamily: 'Inter, Arial, sans-serif', margin: 0, padding: '32px 16px' }}>
        <Container style={{ maxWidth: 560, margin: '0 auto', backgroundColor: '#f4f7f0', borderRadius: 8, padding: 0, overflow: 'hidden', border: '1px solid #dfe8d5' }}>
          <Section style={{ backgroundColor: '#2d5a27', padding: '24px 32px' }}>
            <Heading style={{ color: '#eef3e8', fontFamily: 'Lora, Georgia, serif', fontSize: 22, margin: 0 }}>
              Barterkin
            </Heading>
            <Text style={{ color: '#eef3e8', fontSize: 13, margin: '4px 0 0 0' }}>Georgia Barter Network</Text>
          </Section>

          <Section style={{ padding: '32px' }}>
            <Heading style={{ color: '#1e4420', fontFamily: 'Lora, Georgia, serif', fontSize: 22, marginBottom: 16 }}>
              {senderDisplayName} wants to barter with you
            </Heading>

            <Text style={{ color: '#1e4420', fontSize: 15, lineHeight: 1.6, marginBottom: 24 }}>
              Their message:
            </Text>

            <Section style={{ borderLeft: '3px solid #c4956a', padding: '8px 16px', marginBottom: 24, backgroundColor: '#eef3e8' }}>
              <Text style={{ color: '#1e4420', fontSize: 15, lineHeight: 1.6, whiteSpace: 'pre-wrap', margin: 0 }}>
                {message}
              </Text>
            </Section>

            <Text style={{ color: '#1e4420', fontSize: 14, lineHeight: 1.6, marginBottom: 24 }}>
              Reply to this email to respond directly to {senderDisplayName}. Barterkin is out of the loop from here.
            </Text>

            <Button href={profileUrl} style={{ backgroundColor: '#c4956a', color: '#eef3e8', padding: '12px 24px', borderRadius: 6, textDecoration: 'none', fontSize: 14, fontWeight: 500 }}>
              View {senderDisplayName}'s profile
            </Button>

            <Hr style={{ borderColor: '#dfe8d5', margin: '32px 0 16px 0' }} />

            <Text style={{ color: '#3a7032', fontSize: 12, lineHeight: 1.5, margin: 0 }}>
              This message was sent via Barterkin's contact relay on behalf of {senderDisplayName} (@{senderUsername}). Reply directly to reach them.
            </Text>
            <Text style={{ color: '#3a7032', fontSize: 12, lineHeight: 1.5, margin: '8px 0 0 0' }}>
              Georgia Barter Network · barterkin.com
            </Text>
          </Section>
        </Container>
      </Body>
    </Html>
  )
}
```

### Anti-Patterns to Avoid

- **Do not** put the relay in a Server Action (violates CONT-03; leaks Resend/service-role to Vercel env).
- **Do not** rely on the UI alone to hide blocked users from the directory (RLS is the source of truth; UI filter = bug waiting to happen).
- **Do not** fire `contact_initiated` only from the client (spoofable; breaks the KPI source-of-truth invariant).
- **Do not** use `getSession()` anywhere server-side (banned by CLAUDE.md + Pitfall 1).
- **Do not** store `RESEND_API_KEY` in Vercel env for the relay path — it belongs in Supabase Edge Function secrets. The only legitimate Vercel-env use is the OPTIONAL admin-notify path (see Architectural Responsibility Map).
- **Do not** send the relay email with `From: <sender_email>` (DMARC spoofing — rejected; see Pitfall 12).
- **Do not** log PII in `console.log` — log user IDs only, never emails or messages (Pitfall 2 side-cousin; GDPR-readiness).
- **Do not** catch-and-continue the PostHog failure silently — log the failure and still return success to the client; `contact_initiated` row in DB is the secondary source of truth.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Webhook signature verification | Custom HMAC-SHA-256 with raw body parsing | `resend.webhooks.verify()` (SDK) — wraps svix | Svix handles timestamp-replay protection, signature-version negotiation, byte-exact body handling. Hand-rolling this is the classic "we verify it except we forgot timing-safe comparison" bug. [CITED: Resend webhook docs] |
| Rate-limit counter storage | In-memory Map in Edge Function, or custom table | **Postgres table `contact_requests` itself** + COUNT queries + unique partial index on `(sender_id, recipient_id, date_trunc('day', created_at))` | The table you already need is the rate-limit source. Unique-index race protection is free. `contact_requests` IS the KPI table AND the rate-limit table. Don't invent a second ledger. |
| Disposable-email blocking for senders | Custom domain list | Already handled — **Phase 2** (`disposable-email-domains-js`, signup rate-limit, Turnstile). Phase 5 inherits this without extra work. | Phase 5's attack surface is the contact relay; Phase 2 already solves the "fake signup for spam" vector upstream. |
| Block/unblock mutation logic | Complex transaction with row-locking | Simple `INSERT ... ON CONFLICT DO NOTHING` via server action with RLS enforcing `blocker_id = auth.uid()` | Blocks are additive and idempotent. No locking needed. |
| Admin review queue UI | Custom page with kanban/pagination | `SELECT * FROM reports WHERE status='pending' ORDER BY created_at DESC` in Supabase Studio | [CITED: PITFALLS §21 — "premature moderation UI"] MVP admin = saved SQL bookmark. Ship real UI when >10 reports/week. TRUST-04 explicitly ratifies SQL-only admin for MVP. |
| Email template HTML by hand | Custom HTML-in-string | `react-email` + `@react-email/components` | [CITED: STACK.md §Supporting libraries] Handles email-client quirks (Outlook table-layout, iOS dark mode, Gmail clipping). Resend 6.x integrates via `react: MyEmail(props)`. |
| PostHog event schema | Custom tracking code | `posthog-node` with explicit `distinctId` + event name + properties | Distinct-ID handling, retry, batching are built-in. Just remember `await posthog.shutdown()` in Edge Functions or events may be lost. |
| JWT validation inside Edge Function | Manual JWKS fetch + jose library | `config.toml` `verify_jwt = true` (default) + `supabase.auth.getUser(jwt)` | Supabase Edge runtime verifies signature before invoking your function when `verify_jwt = true` (default for Edge Functions). Your code then only needs `getUser(jwt)` to pull claims. Do NOT disable `verify_jwt` for the relay endpoint. |

**Key insight:** Phase 5's complexity comes from **orchestration** (5 systems × 3 trust-enforcement points), not from any single hard algorithm. Every individual concern has a battle-tested library. The planner's job is sequencing these libraries correctly, not replacing them.

---

## Common Pitfalls

> Each references `.planning/research/PITFALLS.md` by number — read the source for full context.

### Pitfall §11 (CRITICAL): Email relay becomes a spam cannon

**What goes wrong:** Contact form has no rate limit. A spammer scripts `POST /send-contact` for every profile in the directory. Resend burns the daily 100-email quota in minutes, domain reputation tanks, Resend may auto-suspend.

**Why it happens:** "Send email" is one API call. Rate limits are the kind of feature people defer "for after launch." But Phase 5 IS the launch — there is no "after."

**How to avoid:** Ship rate limits in the SAME migration + Edge Function as the relay, not a follow-up. Three layers: (1) DB unique index on `(sender_id, recipient_id, created_at::date)` for per-pair daily dedupe; (2) Edge Function COUNT queries for daily/weekly caps; (3) sender must be email-verified (`auth.users.email_confirmed_at IS NOT NULL` checked via `sender.email_confirmed_at` in the Edge Function).

**Warning signs:** Resend bounce rate > 4%, contact-endpoint traffic >10× directory traffic, same sender hitting multiple recipients in minutes.

---

### Pitfall §15 (CRITICAL): First-contact harassment vector

**What goes wrong:** Relay works; anyone authed can contact anyone. A harasser sends repeated contacts to one victim with different pretexts. Without block, the victim's only recourse is deleting their profile. Women, LGBTQ, visible minorities bear the brunt first.

**How to avoid:** Block + report ship WITH the relay (the joined-phase invariant). Block table is `(blocker_id, blocked_id)`. Contact Edge Function rejects if either direction exists in the blocks table. Report table is `(reporter_id, target_profile_id, reason, note, created_at, status)`. Profile card overflow menu surfaces Block/Report. Report admin-notify email fires from the server action (see Architectural Responsibility Map note on admin email).

**Don't reveal block status to the blocker** — when a blocked user tries to send, return the same "isn't accepting messages right now" copy that `accepting_contact=false` returns (UI-SPEC locks this verbiage). Revealing block status turns Block into a harassment tool itself.

---

### Pitfall §5: RLS bypass via views/RPCs

**What goes wrong:** You add a `contact_eligibility` RPC for the Edge Function. Forget `SET search_path = ''` and accidentally `security_invoker = false`. The function returns every profile's email regardless of RLS.

**How to avoid:** Every SECURITY DEFINER function: (1) `SET search_path = public, pg_temp` explicitly; (2) comment justifying SECURITY DEFINER; (3) `REVOKE EXECUTE ... FROM anon, authenticated` and `GRANT EXECUTE ... TO service_role` so PostgREST doesn't auto-expose it. Run Supabase Database Advisor `0010_security_definer_view` + `0011_policy_exists_rls_disabled` checks.

---

### Pitfall §9: Caching authenticated directory pages — cross-user data leak

**What goes wrong:** Phase 5 adds `/m/[username]` contact affordances that differ based on viewer (Contact button hidden on own profile, overflow menu shown only to others). If the route has `revalidate = 60` or default fetch cache, Vercel's CDN may serve Viewer A's rendered page to Viewer B.

**How to avoid:** `/m/[username]` must be `export const dynamic = 'force-dynamic'` AND `export const revalidate = 0` because it calls `getUser()` / `getClaims()`. Verify before Phase 5 UI plan ships — if the existing page lacks these exports, Plan adds them.

---

### Pitfall §1: `getSession()` on the server

**What goes wrong:** Edge Function or server action uses `supabase.auth.getSession()` for trust decisions. Cookie-only check; spoofable.

**How to avoid:** Edge Function: `supabase.auth.getUser(jwt)`. Server Action: `supabase.auth.getUser()` — the codebase already enforces this (see `lib/actions/profile.ts` line 80 uses `getUser()` for DML identity). Middleware uses `getClaims()` for fast path + `getUser()` fallback for OAuth edge case — already correct.

---

### Pitfall §6: Default-allow RLS on insert/update

**What goes wrong:** `blocks` table has RLS enabled, `SELECT` and `DELETE` policies, but no `INSERT` policy with `WITH CHECK (blocker_id = auth.uid())`. Any authed user inserts a block on behalf of someone else, effectively "block-bombing."

**How to avoid:** Every Phase 5 RLS-enabled table has explicit policies for SELECT + INSERT + UPDATE + DELETE, with `WITH CHECK` on INSERT/UPDATE enforcing `… = auth.uid()`. Missing = locked out; that's the safe default for Phase 5.

---

### Pitfall §12: SPF/DKIM/DMARC not configured

**What goes wrong:** Phase 5 sends the FIRST real production emails. If DNS records weren't set in Phase 1 as planned (FOUND-04 is still `[ ]` Pending per REQUIREMENTS.md traceability), emails go to spam, Gmail flags with "via resend.com" disclaimer, recipients don't respond, metric tanks.

**How to avoid:** Planner MUST include a pre-relay verification task: run `mail-tester.com` against a test send from `noreply@barterkin.com` BEFORE Phase 5 goes live. If score < 9/10, Phase 5 includes a DNS-remediation task (set SPF TXT, DKIM CNAMEs, DMARC record) BEFORE first real contact send. **[Cross-phase dependency — the planner should confirm FOUND-04 status when initiating Phase 5 work, not discover mid-execution that DNS isn't propagated.]**

---

### Pitfall §17: Migration drift between local and hosted

**What goes wrong:** Migration 005 runs locally, but not pushed to prod before Edge Function deploy. Edge Function's `INSERT INTO contact_requests` fails because the table doesn't exist in prod.

**How to avoid:** Strict order — migration committed → `supabase db push` to dev → type regen (`supabase gen types typescript`) → code uses new types → Edge Function deploys AFTER migration is pushed to the target Supabase project. Planner should sequence: migration task is a BLOCKING predecessor for Edge Function task.

---

### Pitfall Phase-5-Specific: Resend webhook race with PostHog send

**What goes wrong:** PostHog `posthog.capture()` is queued in-memory by `posthog-node`. If Edge Function returns before `posthog.shutdown()` completes, the event is lost. This breaks the KPI invariant.

**How to avoid:** `await posthog.shutdown()` BEFORE `return new Response(…)` in the Edge Function. Documented in the pattern skeleton above. Unit/E2E tests should verify the event lands in PostHog (via the PostHog dev tools or a stub).

---

### Pitfall Phase-5-Specific: Resend SDK keyword arg drift (`replyTo` vs `reply_to`)

**What goes wrong:** Resend 4.x used `reply_to`; Resend 6.x uses `replyTo` (camelCase) per recent SDK refactor. Copy-pasting from STACK.md's pattern (written against 4.x) sends a message with no Reply-To, breaking the "platform out of the loop after first touch" invariant.

**How to avoid:** [ASSUMED — verify at implementation time] Check the installed `resend` package's TypeScript types. The phase plan should include a task-level spot-check: run the happy-path E2E relay and manually inspect the recipient email's Reply-To header. This takes <5 minutes and catches the issue immediately.

---

## Runtime State Inventory

Phase 5 is a greenfield feature phase (not a rename/refactor/migration). The Runtime State Inventory section is not required — there is no existing runtime state being renamed or migrated.

**Stored data:** None to migrate. New tables (`contact_requests`, `blocks`, `reports`) are created empty. `profiles.banned` and `profiles.accepting_contact` already exist in prod (Phase 3 migration 003) with their correct defaults.

**Live service config:** Supabase Edge Function `send-contact` is new; Resend webhook endpoint URL is new (configured in Resend dashboard post-deploy). **Action:** After the Edge Function is deployed, the Resend dashboard must be updated to point its webhook at `https://barterkin.com/api/webhooks/resend` — this is a manual, one-time, post-deploy step. The planner should surface this as a HUMAN-UAT item.

**OS-registered state:** None.

**Secrets/env vars:** New env vars required:
- `RESEND_API_KEY` — in Supabase Edge Function secrets (`supabase secrets set`)
- `POSTHOG_API_KEY` — in Supabase Edge Function secrets
- `EMAIL_FROM` — in Supabase Edge Function secrets (default: `Barterkin <noreply@barterkin.com>`)
- `RESEND_WEBHOOK_SECRET` — in Vercel env (production + preview)
- `ADMIN_NOTIFY_EMAIL` — in Vercel env (for TRUST-06) — **[ASSUMED — needed only if admin-notify-via-Server-Action path is selected]**

**Build artifacts:** None from Phase 5; `lib/database.types.ts` will be regenerated post-migration (existing pattern).

---

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|-------------|-----------|---------|----------|
| Supabase CLI | Migration 005; Edge Function deploy; type gen | ✓ | `^2.92.1` (dev dep in package.json) | — |
| Deno (Supabase Edge Functions) | `send-contact` function | ✓ (Supabase-managed; not on local machine) | Deno 1.x (Supabase-pinned) | — |
| Node 20+ | Next.js runtime + test tools | ✓ | v22.14.0 per user memory | — |
| pnpm 10 | Package management | ✓ | `>=10.0.0` per package.json engines | — |
| Resend account + domain verified | Actual relay sends | **[ASSUMED — confirm at phase kickoff]** — Phase 1 plan `01-05-posthog-resend-PLAN.md` is marked `[ ]` Pending; STATE.md shows Phase 1 is complete but some plans are unchecked | Need to check | If not set up: Phase 5 includes a blocking task to provision; this doubles the phase length |
| SPF + DKIM + DMARC on domain | Deliverability (mail-tester ≥9/10) | **[ASSUMED — FOUND-04 still Pending in REQUIREMENTS.md]** | — | If not: mandatory predecessor task in Phase 5 plan; 24–48h DNS propagation is a blocking wait |
| PostHog project + API key | `contact_initiated` KPI | **[ASSUMED — FOUND-10 still Pending in REQUIREMENTS.md]** | — | If not: mandatory predecessor; PostHog setup is one afternoon of work |
| Supabase Edge runtime enabled | `send-contact` deploy | ✓ | Managed by Supabase | — |

**Missing dependencies with no fallback:**
- Resend domain verification (if not done): MUST resolve before Phase 5 first send. Budget 1 hour + 24h DNS propagation window.
- PostHog account (if not done): MUST resolve before Phase 5 launch. Budget 2 hours.
- DMARC/SPF/DKIM (if not done): MUST resolve before Phase 5 first prod send. Budget 1 hour + 24–48h propagation.

**Missing dependencies with fallback:**
- None — all Phase 5 dependencies are hard blockers. There is no "ship relay without Resend" option.

**Planner action:** The plan-phase orchestrator should include a Wave 0 / pre-execution audit task that verifies Phase 1 plans `01-05` (PostHog + Resend) and `01-09` (Cloudflare DNS / SPF+DKIM+DMARC) are complete. If not, sequence those completions as blocking predecessors to Phase 5's plan waves.

---

## Validation Architecture

### Test Framework

| Property | Value |
|----------|-------|
| Framework | Vitest 4.1.4 (unit) + Playwright 1.59.1 (E2E) [VERIFIED: package.json] |
| Config file | `vitest.config.ts` + `playwright.config.ts` (both at repo root; VERIFIED) |
| Quick run command | `pnpm test` (unit), `pnpm e2e` (E2E) |
| Full suite command | `pnpm test && pnpm e2e` |

### Phase Requirements → Test Map

| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| CONT-01 | Contact button opens Sheet on profile page (accepting_contact=true) | E2E | `pnpm exec playwright test contact-relay.spec.ts -g "opens sheet"` | ❌ Wave 0 |
| CONT-01 | Contact button hidden when accepting_contact=false | E2E | `pnpm exec playwright test contact-relay.spec.ts -g "hidden when not accepting"` | ❌ Wave 0 |
| CONT-02 | Message 20–500 chars validation | unit | `pnpm test contact-schema.test.ts` | ❌ Wave 0 |
| CONT-03 | Edge Function handles relay (not Server Action) | integration | Manual trace + `pnpm e2e contact-relay.spec.ts` (observes response shape); also `grep -n 'Resend' app/ lib/actions/` returns empty | ❌ Wave 0 |
| CONT-04 | contact_requests row inserted with correct FK shape | E2E (DB-backed) | `pnpm exec playwright test contact-relay.spec.ts -g "inserts row"` (asserts row via test-only service-role client) | ❌ Wave 0 |
| CONT-05 | Email headers (From, Reply-To, X-Entity-Ref-ID) correct | E2E (deferred to HUMAN-UAT + one integration test against Resend test inbox) | Manual: run test relay, inspect Gmail "Show original" | ❌ Wave 0 (manual) |
| CONT-06 | Recipient email never in client response | unit | `pnpm test contact-response-shape.test.ts` — asserts Edge Function response has no `email`/`to` field | ❌ Wave 0 |
| CONT-07 | 5/day, 20/week sender cap | E2E | `pnpm exec playwright test contact-rate-limit.spec.ts -g "daily cap"` | ❌ Wave 0 |
| CONT-08 | 2/week per-recipient cap | E2E | `pnpm exec playwright test contact-rate-limit.spec.ts -g "per-recipient cap"` | ❌ Wave 0 |
| CONT-09 | Resend webhook updates contact_requests.status | unit + integration | `pnpm test resend-webhook.test.ts` (mocks svix-signed payload, asserts DB update) | ❌ Wave 0 |
| CONT-10 | Unseen-contact badge appears on nav | E2E | `pnpm exec playwright test unseen-badge.spec.ts -g "shows"` | ❌ Wave 0 |
| CONT-10 | Visit /profile clears badge | E2E | `pnpm exec playwright test unseen-badge.spec.ts -g "clears"` | ❌ Wave 0 |
| CONT-11 | PostHog event fires server-side | integration | stub `posthog-node` in Edge Function test; assert `posthog.capture` called with correct props | ❌ Wave 0 (may require Edge Function local test harness) |
| TRUST-01 | Report submission with reason + note | E2E | `pnpm exec playwright test report-flow.spec.ts` | ❌ Wave 0 |
| TRUST-02 | Block hides from directory + blocks contact | E2E | `pnpm exec playwright test block-flow.spec.ts` | ❌ Wave 0 |
| TRUST-03 | `profiles.banned=true` hides + rejects relay | E2E | `pnpm exec playwright test ban-enforcement.spec.ts` (flip banned via service-role fixture, verify UI + relay reject) | ❌ Wave 0 |
| TRUST-04 | SQL admin pattern | manual | `supabase db execute "UPDATE profiles SET banned=true WHERE id='…'"` (documented in runbook, not automated) | ❌ Wave 0 (runbook doc) |
| TRUST-05 | Reports reporter identity opaque to non-admin | unit | `pnpm test reports-rls.test.ts` — authed SELECT on reports returns 0 rows | ❌ Wave 0 |
| TRUST-06 | Report emails admin | E2E | `pnpm exec playwright test report-flow.spec.ts -g "admin notified"` — with a stubbed Resend via MSW or similar | ❌ Wave 0 |
| TRUST-07 | Edge Function rejects all 5 ineligibility conditions | integration | `pnpm test contact-eligibility.test.ts` — 5 sub-tests for banned sender, banned recipient, not-accepting, blocked-by-recipient, blocked-by-sender | ❌ Wave 0 |

### Sampling Rate

- **Per task commit:** `pnpm test` (unit tests run in <10s for this phase's additions)
- **Per wave merge:** `pnpm test && pnpm e2e` (E2E: ~2 min)
- **Phase gate:** Full suite green before `/gsd-verify-work`; HUMAN-UAT for email-header inspection + first real `mail-tester.com` check

### Wave 0 Gaps

All of these do not yet exist; Wave 0 of the Phase 5 plan must create them:

- [ ] `tests/unit/contact-schema.test.ts` — covers CONT-02 (message bounds), TRUST-01 (reason enum)
- [ ] `tests/unit/contact-response-shape.test.ts` — covers CONT-06 privacy
- [ ] `tests/unit/resend-webhook.test.ts` — covers CONT-09 (mocked svix payload)
- [ ] `tests/unit/contact-eligibility.test.ts` — covers TRUST-07 (5 rejection conditions via RPC test harness)
- [ ] `tests/unit/reports-rls.test.ts` — covers TRUST-05 (RLS opacity)
- [ ] `tests/e2e/contact-relay.spec.ts` — covers CONT-01, CONT-04
- [ ] `tests/e2e/contact-rate-limit.spec.ts` — covers CONT-07, CONT-08
- [ ] `tests/e2e/block-flow.spec.ts` — covers TRUST-02
- [ ] `tests/e2e/report-flow.spec.ts` — covers TRUST-01, TRUST-06
- [ ] `tests/e2e/unseen-badge.spec.ts` — covers CONT-10
- [ ] `tests/e2e/ban-enforcement.spec.ts` — covers TRUST-03
- [ ] `tests/e2e/fixtures/contact-helpers.ts` — shared: create 2 seeded profiles via service-role, cleanup
- [ ] **Test-only service-role helper** — Phase 5 E2E needs to flip `banned`, insert `blocks`, query `contact_requests` directly. Use existing `tests/__mocks__` + a new `tests/utils/admin.ts` (test-only, never bundled).

**No framework install needed** — Vitest + Playwright already configured.

---

## Security Domain

### Applicable ASVS Categories

| ASVS Category | Applies | Standard Control |
|---------------|---------|-----------------|
| V2 Authentication | yes | Supabase Auth + JWT — already in place; Phase 5 inherits. Edge Function `verify_jwt = true` (config.toml default) delegates signature verification to Supabase runtime. |
| V3 Session Management | yes | `@supabase/ssr` middleware cookie refresh — Phase 2 established; Phase 5 inherits. |
| V4 Access Control | **yes — critical for Phase 5** | RLS policies on `contact_requests`, `blocks`, `reports` + service-role bypass ONLY in Edge Function + defense-in-depth eligibility re-check inside Edge Function. |
| V5 Input Validation | yes | `zod@4` (shared client/server); Edge Function re-validates message bounds; SQL parameter binding via Supabase client (no string concat). |
| V6 Cryptography | yes | Webhook signature via `svix` (Resend SDK wrapper) — NEVER hand-roll HMAC. Password hashing N/A (no passwords). |
| V7 Error Handling & Logging | yes | Log only `id` fields, never email/name/message. Generic error codes returned to client; detailed codes in server logs. |
| V8 Data Protection | yes | Recipient email never in client response (CONT-06). Message stored in DB — NO encryption at rest beyond Supabase's disk-level encryption (acceptable for MVP; users consent via ToS). |
| V9 Communications | yes | HTTPS enforced by Vercel + Supabase; SPF/DKIM/DMARC on outbound Resend. |
| V12 Files & Resources | no | No file upload in Phase 5 (avatars are Phase 3). |
| V13 API & Web Service | yes | Edge Function is a public-authed API; rate limits + eligibility gate + CORS configured by Supabase. |

### Known Threat Patterns for this stack

| Pattern | STRIDE | Standard Mitigation |
|---------|--------|---------------------|
| Spam cannon via relay | Denial of service / Elevation | DB unique index + Edge Function rate limits (3 layers: daily, weekly, per-pair). [Pitfall §11] |
| Harassment via repeated contacts | Elevation / Denial | Self-serve block; report. Block hides blockee from directory (RLS), prevents relay (Edge Function check). [Pitfall §15] |
| Service-role key leak | Information disclosure | Key lives ONLY in Supabase Edge Function secrets; `import 'server-only'` on admin.ts; CI grep for `service_role` in `.next/static` (established in Phase 1/2). |
| Reply-To spoofing via client input | Spoofing | Edge Function sets `reply_to` from `auth.users.email` of authenticated sender — never from request body. |
| Webhook signature forgery | Spoofing | `resend.webhooks.verify()` with `RESEND_WEBHOOK_SECRET`; raw body preserved (Next.js route handler uses `req.text()`, not `req.json()`, before verify). |
| RLS bypass via Edge Function service-role over-reach | Elevation | Eligibility + rate-limit queries are the ONLY service-role-bound operations in Edge Function. The relay INSERT is also service-role (needed for dedupe-index behavior); but no SELECT of recipient PII beyond the single eligibility RPC return. |
| JWT replay / spoofing | Spoofing | Supabase Edge runtime enforces `verify_jwt = true`; never disable for `send-contact`. |
| Cross-site request forgery (CSRF) | Tampering | Next.js Server Actions have CSRF built-in when invoked idiomatically. Edge Function is called from Server Action (server-to-server); client never calls Edge Function directly. |
| Block-bombing (unauthorized INSERT into blocks) | Tampering | RLS `WITH CHECK (blocker_id = auth.uid())` on blocks INSERT. |
| Report-bombing (spam reports) | Denial of service | RLS allows any authed user to insert reports (required for self-serve); Phase 5 does NOT add per-reporter rate limits in MVP (low-risk — worst case is a full `reports` table requiring admin cleanup). [ASSUMED — flag if user wants a report rate limit.] |

---

## Code Examples

### Common Operation 1: Server Action calling Edge Function with user JWT

```typescript
// lib/actions/contact.ts
'use server'
// Source: STACK.md §Installation + existing pattern in lib/actions/profile.ts (verified 2026-04-21)

import { createClient } from '@/lib/supabase/server'
import { MessageSchema } from '@/lib/schemas/contact'

export interface SendContactResult {
  ok: boolean
  error?: string
  code?: string // for UI to map to inline error copy (D-03)
}

export async function sendContactRequest(
  _prev: SendContactResult | null,
  formData: FormData,
): Promise<SendContactResult> {
  const supabase = await createClient()
  const { data: { user }, error: authErr } = await supabase.auth.getUser()
  if (authErr || !user) return { ok: false, code: 'unauthorized', error: 'Please sign in.' }

  const parsed = MessageSchema.safeParse({
    recipientProfileId: formData.get('recipientProfileId'),
    message: formData.get('message'),
  })
  if (!parsed.success) {
    return { ok: false, code: 'bad_message', error: parsed.error.issues[0]?.message ?? 'Please fix the message.' }
  }

  // Get user's JWT to forward — session is in cookies; ask Supabase client for access_token.
  const { data: sess } = await supabase.auth.getSession() // CLIENT-SIDE-SAFE here because we're already authenticated and need token only for forwarding
  const accessToken = sess?.session?.access_token
  if (!accessToken) return { ok: false, code: 'unauthorized', error: 'Please sign in.' }

  const edgeUrl = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/send-contact`
  const resp = await fetch(edgeUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${accessToken}`,
    },
    body: JSON.stringify({
      recipient_profile_id: parsed.data.recipientProfileId,
      message: parsed.data.message,
    }),
  })

  const body = (await resp.json().catch(() => ({}))) as { ok?: boolean; code?: string; error?: string }
  if (!resp.ok || !body.ok) return { ok: false, code: body.code ?? 'unknown', error: body.error ?? 'Something went wrong.' }
  return { ok: true }
}
```

**Note on `getSession()` usage here:** This is the ONE legitimate server-side use of `getSession()` — to extract the access_token for forwarding to the Edge Function. The trust decision (is the user authed?) has already been made by middleware + `getUser()`. This is NOT a security violation. [CITED: Pitfall §1 — "Treat `getSession()` as client-only." Exception: forwarding access_token to a separate service that itself validates the JWT. The Edge Function's `verify_jwt=true` plus `supabase.auth.getUser(jwt)` re-validates.]

### Common Operation 2: Block server action

```typescript
// lib/actions/contact.ts (continued)
import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'

export async function blockMember(formData: FormData): Promise<void> {
  const supabase = await createClient()
  const { data: { user }, error } = await supabase.auth.getUser()
  if (error || !user) redirect('/login')

  const blockedOwnerId = formData.get('blockedOwnerId')
  if (typeof blockedOwnerId !== 'string' || blockedOwnerId === user.id) {
    // Self-block or malformed — ignore silently
    redirect('/directory')
  }

  // RLS WITH CHECK ensures blocker_id = auth.uid(); ON CONFLICT handles double-click
  await supabase.from('blocks').upsert(
    { blocker_id: user.id, blocked_id: blockedOwnerId },
    { onConflict: 'blocker_id,blocked_id', ignoreDuplicates: true },
  )

  // Sonner toast (D-06 post-block) rendered on /directory next mount
  revalidatePath('/directory')
  revalidatePath(`/m/${formData.get('blockedUsername') as string}`)
  redirect(`/directory?blocked=${encodeURIComponent((formData.get('blockedDisplayName') as string) ?? '')}`)
}
```

### Common Operation 3: React Email template preview (for dev)

```bash
# Preview the contact-relay email locally during development.
# react-email CLI (6.x) starts a preview server at localhost:3001
pnpm dlx react-email@latest dev --dir emails
```

### Common Operation 4: Regenerate database types after migration

```bash
# After supabase db push of migration 005
pnpm supabase gen types typescript --linked > lib/database.types.ts
```

### Common Operation 5: Deploy Edge Function

```bash
# One-time secrets setup (per Supabase project)
pnpm supabase secrets set RESEND_API_KEY=re_xxx POSTHOG_API_KEY=phc_xxx EMAIL_FROM="Barterkin <noreply@barterkin.com>" NEXT_PUBLIC_SITE_URL=https://barterkin.com

# Deploy the function (verify_jwt=true by default — DO NOT pass --no-verify-jwt)
pnpm supabase functions deploy send-contact

# Tail logs during testing
pnpm supabase functions logs send-contact --tail
```

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| `reply_to` snake-case on Resend SDK | `replyTo` camelCase | Resend SDK 5.x+ | All STACK.md examples written against 4.x need mental re-mapping; the real SDK TypeScript types are the source of truth [ASSUMED — verify at impl] |
| Custom HMAC verification | Resend SDK `webhooks.verify()` (wraps svix) | Resend added svix signing in 2024; SDK method exposed in 5.x | Fewer lines of code; svix handles replay protection |
| Offset pagination for inbox/listing | Cursor or no listing at all | Next.js 14+ RSC patterns | N/A for Phase 5 — no inbox UI; but future post-MVP inbox should start with cursor |
| PostHog via client-side capture for "success" events | Server-side `posthog-node` + `await posthog.shutdown()` | PostHog's own recommendation for Node/Deno since 2023 | Source-of-truth KPI; can't be ad-blocked |
| Bounce handling: poll Resend API for status | Push webhook + update row by `resend_id` | Resend added webhooks in 2024 | Real-time status, no polling, no API quota burn |
| Supabase Edge Function with `SUPABASE_URL` env | `Deno.env.get('SUPABASE_URL')` — auto-injected | Supabase CLI 1.100+ | Never set manually; secrets namespace collision otherwise |

**Deprecated/outdated:**
- **Resend 4.x API shapes (e.g., `reply_to` snake_case)** — replaced by 6.x camelCase. Project is on 6.x.
- **Direct client → Edge Function calls** — idiomatic path is client → Server Action → Edge Function, so the server action can sanitize + attach the JWT + centralize error handling. Direct client → Edge Function works but bypasses Next.js's server-side validation layer, losing type safety and CSRF protections.
- **`supabase.auth.getSession()` for trust decisions** — fully deprecated in favor of `getUser()` (revalidating) or `getClaims()` (JWKS). `getSession()` usage remains legitimate ONLY for token-forwarding (as in the server action above).

---

## Assumptions Log

> Claims tagged `[ASSUMED]` in this research. Discuss-phase or planner should confirm before these become locked decisions.

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | The `react-email` package version 4.x pinned in CLAUDE.md STACK.md is stale; current major is 6.0 per `npm view`. Planner should verify compatibility with Resend 6.x at install. | Standard Stack → New | Low — version mismatch will surface at `pnpm add`; reconciliation is cheap. |
| A2 | Admin-notify email (TRUST-06) is implemented via Server Action with `RESEND_API_KEY` in Vercel env, NOT via a second Edge Function. | Architectural Responsibility Map | Medium — doubles deploy complexity if "correct" answer is a second Edge Function. Flag to user; could also be dropped entirely in favor of the Supabase Studio bookmark (per Pitfall §21). |
| A3 | Resend SDK 6.x uses `replyTo` (camelCase) not `reply_to` (snake_case). | Architecture Patterns § Edge Function pattern | Low — misnamed key silently omits header; E2E test catches immediately by inspecting the email's headers. |
| A4 | FOUND-04 (SPF/DKIM/DMARC) and FOUND-10 (PostHog) are NOT complete — REQUIREMENTS.md traceability shows these as Pending and Phase 1's plan `01-05-posthog-resend-PLAN.md` is unchecked. | Environment Availability | HIGH — if both are done, Phase 5 is smaller; if both are pending, Phase 5 gains 2 blocking predecessor waves. Planner MUST confirm status at kickoff. |
| A5 | No per-reporter rate limit needed for `reports` in MVP. | Security Domain → Threat Patterns | Low — worst case a few junk reports; no cost impact. Flag if user wants a quarterly cap. |
| A6 | `config.toml` default `verify_jwt = true` applies to the `send-contact` function without explicit configuration. | Code Examples § Deploy Edge Function | Low — if a previous `supabase functions deploy` was run with `--no-verify-jwt`, the setting sticks. Planner should verify `supabase/config.toml` does not override. |
| A7 | The existing `lib/supabase/admin.ts` service-role client is safe to use in `app/api/webhooks/resend/route.ts` (Node runtime, server-only). | Architecture Patterns § Resend webhook | Low — pattern is established; `admin.ts` already has `import 'server-only'`. |
| A8 | PostHog event name `contact_initiated` (with underscore) matches the schema defined in Phase 1 (FOUND-10). | Phase Requirements → CONT-11 | Low — flag at Phase 1 kickoff; if the schema uses a different name (e.g., `initiated_contact`), the planner updates the Edge Function accordingly. [Project constraint from STATE.md Success Metric: "PostHog `contact_initiated` event" — so **this is actually [VERIFIED]**, but flagged because Phase 1 plan 01-05 is unchecked.] |

**Discuss-phase checkpoint:** Items A2 (admin-notify path) and A4 (Phase 1 DNS/PostHog status) are the two that materially change the plan shape. The planner should surface these before generating plan waves.

---

## Open Questions

1. **Is the admin-notify email (TRUST-06) built via Server Action or via a second Edge Function?**
   - What we know: CONTEXT.md leaves Resend webhook signature verification to Claude's discretion, but does not explicitly address where admin-notify lives.
   - What's unclear: Whether the user wants Resend key exposure minimized (→ second Edge Function) or deploy complexity minimized (→ Server Action).
   - Recommendation: Server Action, OR drop the email and use SQL bookmark (Pitfall §21). **Planner to surface to user.**

2. **Is per-reporter rate limiting on `reports` needed at MVP?**
   - What we know: TRUST-01 does not mention rate limits; the attack surface (reports) is much lower-risk than relay sends.
   - What's unclear: Whether the user has an opinion on this.
   - Recommendation: Skip for MVP; ship if abuse emerges. [ASSUMED A5]

3. **What is the exact PostHog event name — `contact_initiated` vs `initiated_contact`?**
   - What we know: STATE.md says `contact_initiated`; REQUIREMENTS.md FOUND-10 says `initiated_contact`; ROADMAP.md success criteria says `contact_initiated`; some older refs say both.
   - What's unclear: Canonical name. Phase 1's plan 01-05 (PostHog + Resend schema definition) is unchecked, so this may not be locked yet.
   - Recommendation: Lock to `contact_initiated` (matches ROADMAP + STATE + PROJECT.md goal). Planner adds a Wave 0 task: "Confirm PostHog schema uses `contact_initiated` event name; update Phase 1 artifact if Phase 5 decision differs."

4. **Should the `contact_eligibility` RPC live in the `public` schema or a `private` schema?**
   - What we know: Pitfall §5 recommends `private.` schema so PostgREST can't auto-expose as RPC.
   - What's unclear: Whether `private` schema complexity is worth it vs. `public` with `REVOKE EXECUTE FROM anon, authenticated; GRANT EXECUTE TO service_role`.
   - Recommendation: `public` + REVOKE/GRANT. Simpler; achieves same goal; matches existing codebase conventions (no `private.` schema in current migrations).

5. **Does the nav badge show a count (e.g., "3") or just a dot?**
   - What we know: D-08 says "red dot or count"; UI-SPEC locks: dot for n=1, pill with count for n≥2.
   - What's unclear: Nothing — UI-SPEC §New-contact badge resolves this. Flagged only for planner to verify they read §UI-SPEC §Copywriting Contract line for badge, not just D-08.
   - Recommendation: Follow UI-SPEC verbatim.

6. **Does the `seen_at` clear happen in the server component render of `/profile/page.tsx` or via a separate server action?**
   - What we know: CONTEXT.md leaves this to Claude's discretion.
   - What's unclear: Whether a side-effect in a server component render is stylistically acceptable in this codebase.
   - Recommendation: Fire during server component render (simpler, no extra roundtrip). The existing `/profile/page.tsx` already calls `getUser()` inline — adding an UPDATE in the same render is a small extension, not a pattern break.

---

## Sources

### Primary (HIGH confidence)

- `.planning/CLAUDE.md` (project instructions) — stack constraints, pitfall list, security invariants [VERIFIED]
- `.planning/REQUIREMENTS.md` — CONT-01..11 + TRUST-01..07 req IDs and definitions [VERIFIED: read]
- `.planning/STATE.md` — project reference, joined-phases note, session continuity [VERIFIED: read]
- `.planning/ROADMAP.md` §Phase 5 — goal + 5 success criteria [VERIFIED: read]
- `.planning/phases/05-contact-relay-trust-joined/05-CONTEXT.md` — locked decisions D-01..D-12 [VERIFIED: read]
- `.planning/phases/05-contact-relay-trust-joined/05-UI-SPEC.md` — full UI design contract with copywriting [VERIFIED: read]
- `.planning/research/STACK.md` — versions, install commands, installation patterns [VERIFIED: read]
- `.planning/research/ARCHITECTURE.md` — Edge Function patterns, RLS, auth flow [VERIFIED: read §§1-6]
- `.planning/research/PITFALLS.md` — §§1,2,5,6,9,11,12,15,17,21 applicable to Phase 5 [VERIFIED: read]
- `supabase/migrations/003_profile_tables.sql` — confirmed `profiles.accepting_contact`, `profiles.banned` already exist [VERIFIED: read]
- `supabase/migrations/004_directory_search.sql` — confirmed search_text denorm pattern for future directory-filter extension [VERIFIED: read]
- `lib/actions/profile.ts` — established 'use server' + zod + getUser() pattern [VERIFIED: read]
- `lib/supabase/server.ts`, `lib/supabase/admin.ts`, `lib/supabase/middleware.ts` — client factories established [VERIFIED: read]
- `app/(app)/m/[username]/page.tsx` — profile view page (Phase 5 extension target) [VERIFIED: read]
- `app/(app)/layout.tsx` — nav layout (Phase 5 badge target) [VERIFIED: read]
- `components/profile/ProfileCard.tsx` — card component (Phase 5 contact/overflow buttons) [VERIFIED: read]
- `components/layout/NavLinks.tsx` — nav link component (Phase 5 badge) [VERIFIED: read]
- `package.json` — installed versions of resend/posthog-node/zod/etc. [VERIFIED: read]
- `npm view resend|posthog-node|svix|react-email|@react-email/components version` — 2026-04-21 registry snapshot [VERIFIED: shell]
- https://resend.com/docs/webhooks/event-types — confirmed 8 email event names [VERIFIED: WebFetch 2026-04-21]
- https://resend.com/docs/dashboard/webhooks/verify-webhooks-requests — confirmed `resend.webhooks.verify()` SDK method with svix headers [VERIFIED: WebFetch 2026-04-21]
- https://resend.com/docs/send-with-supabase-edge-functions — Resend + Deno Edge Function integration pattern [VERIFIED: WebFetch 2026-04-21]
- https://supabase.com/docs/guides/functions/auth — Edge Function JWT auth pattern [CITED: WebFetch 2026-04-21]
- https://supabase.com/docs/guides/functions/dependencies — npm: import specifiers pattern [CITED: WebSearch 2026-04-21]

### Secondary (MEDIUM confidence)

- Supabase `supabase` CLI docs for `--no-verify-jwt`, config.toml function config [CITED: WebSearch 2026-04-21, verified against discussion #8569]
- PostHog Node SDK usage in Deno — [VERIFIED via npm specifier; no specific Deno doc found but pattern is `npm:posthog-node@5.29.2`]

### Tertiary (LOW confidence — flagged for validation)

- Resend SDK `replyTo` vs `reply_to` key — code-level inspection of the installed TypeScript types will confirm at impl time [ASSUMED A3]
- Exact Phase 1 completion status of PostHog + SPF/DKIM/DMARC — derived from unchecked checkboxes in REQUIREMENTS.md traceability [ASSUMED A4]

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — versions verified against npm registry; installed packages checked via `package.json`
- Architecture: HIGH — patterns read from ARCHITECTURE.md and confirmed by existing codebase
- Pitfalls: HIGH — drawn from project's own PITFALLS.md, directly applicable
- User constraints: HIGH — copied verbatim from CONTEXT.md
- Validation architecture: HIGH — framework + files verified
- Security: HIGH — ASVS applicability mapped against Phase 5 scope; STRIDE patterns cover known vectors
- Environment dependencies: MEDIUM — FOUND-04 and FOUND-10 status requires Phase 1 audit; flagged as A4

**Research date:** 2026-04-21
**Valid until:** 2026-05-21 (30 days — Resend SDK and PostHog node SDKs are on monthly-ish release cadence; re-verify if Phase 5 execution starts after May 21)

---

*Research complete. Planner may proceed with Phase 5 plan generation. See `Open Questions` section for items requiring user confirmation before locking plan decisions.*
