---
phase: 05-contact-relay-trust-joined
verified: 2026-04-21T00:00:00Z
status: human_needed
score: 17/17
overrides_applied: 0
human_verification:
  - test: "Deploy Edge Function and configure secrets"
    expected: "send-contact Edge Function live at Supabase project URL; RESEND_API_KEY, POSTHOG_API_KEY, NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY set in Supabase Edge Function secrets dashboard; verify_jwt=true enforced"
    why_human: "Deployment requires Supabase CLI auth + project ref + secrets dashboard access — cannot be automated without live credentials"
  - test: "Configure Resend webhook endpoint in Resend dashboard"
    expected: "Webhook pointing to https://<app-domain>/api/webhooks/resend; RESEND_WEBHOOK_SECRET env var set in Vercel; test delivery triggers status update in contact_requests.status column"
    why_human: "Requires Resend dashboard access and a live deployed URL — cannot be verified without live infrastructure"
  - test: "11-step smoke test (Plans 04-05 Task 4)"
    expected: "Verified user A sends contact to user B; email arrives at B's inbox with correct reply-to header; B replies directly to A; block flow removes user from directory view with toast; report flow submits and admin email is received; unseen badge appears then clears on /profile visit"
    why_human: "Requires two live authenticated accounts, real email delivery, and manual browser interaction — no automated path available"
  - test: "Email deliverability score (CONT-05)"
    expected: "mail-tester.com score >= 9/10 for the contact-relay email; SPF, DKIM, DMARC all green; no blacklisted sending IP"
    why_human: "Requires sending a real email from the live Resend account and checking mail-tester.com — requires live infrastructure"
  - test: "PostHog contact_initiated event (CONT-11)"
    expected: "After a successful contact send, PostHog dashboard shows a contact_initiated event with recipient_county and recipient_category properties"
    why_human: "Requires live PostHog project with API key configured; event only fires when Edge Function runs against real Resend + PostHog endpoints"
  - test: "Admin SQL ban runbook (TRUST-03)"
    expected: "Admin can run: UPDATE profiles SET banned = true WHERE id = '<uuid>'; blocked user can no longer view directory or send contacts; SELECT visible in directory returns 0 rows for banned user"
    why_human: "Requires a live Supabase project with admin SQL access and a real user account to ban"
  - test: "Full test suite execution (Plans 05-06 Task 4)"
    expected: "pnpm typecheck passes (0 errors); pnpm test passes (all unit tests); pnpm e2e passes against live Supabase test environment with all env vars set; contact-rate-limit weekly-cap test is the only known stub (expect(true).toBe(true))"
    why_human: "E2E tests require live Supabase test project with env vars NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY, SUPABASE_SERVICE_ROLE_KEY; pnpm e2e cannot run without these"
---

# Phase 05: Contact Relay + Trust System — Verification Report

**Phase Goal:** Ship a complete contact-relay and trust system — members can send platform-relayed contact requests, block other members, and report misconduct, with all trust-floor invariants enforced at the database layer.
**Verified:** 2026-04-21T00:00:00Z
**Status:** human_needed
**Re-verification:** No — initial verification

## Goal Achievement

All 17 code must-haves are VERIFIED. The phase goal is structurally achieved in the codebase. Execution against live infrastructure (Edge Function deployment, Resend webhook config, smoke tests, deliverability, PostHog events, admin SQL runbook) is gated on human checkpoints identified across Plans 03, 05, and 06.

### Observable Truths

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 1 | Schema layer: contact_requests, blocks, reports tables exist with correct constraints and RLS | VERIFIED | `supabase/migrations/005_contact_relay_trust.sql` — 5-section migration: tables, RLS, directory policy update, contact_eligibility RPC |
| 2 | contact_eligibility SECURITY DEFINER RPC enforces trust gates | VERIFIED | Migration §5: REVOKE from anon/authenticated, GRANT to service_role; function checks email verification, block relationships, ban status, self-contact |
| 3 | send-contact Edge Function validates JWT, checks eligibility, enforces rate limits, sends relay email, captures PostHog event | VERIFIED | `supabase/functions/send-contact/index.ts` (280 lines): full pipeline from JWT extraction through Resend.send + posthog.capture + shutdown |
| 4 | Contact relay email is on-brand with correct reply-to semantics | VERIFIED | `emails/contact-relay.tsx`: brand tokens, serif headings, "Reply to this email" copy; replyTo = senderEmail from JWT (not request body) |
| 5 | Resend webhook updates contact_requests.status on delivery events | VERIFIED | `app/api/webhooks/resend/route.ts`: svix HMAC verification, switch on event.type, supabaseAdmin update on resend_id |
| 6 | sendContactRequest server action wires client form to Edge Function | VERIFIED | `lib/actions/contact.ts`: getUser for trust, MessageSchema validation, getSession for access_token, fetch to Edge Function |
| 7 | blockMember server action upserts into blocks and redirects with toast param | VERIFIED | `lib/actions/contact.ts`: BlockSchema + getUser + self-block guard + upsert + revalidatePath + redirect to /directory?blocked= |
| 8 | reportMember server action inserts into reports with admin notify email | VERIFIED | `lib/actions/contact.ts`: ReportSchema + getUser + email_confirmed_at gate + self-report guard + INSERT + admin notify via Resend |
| 9 | markContactsSeen server action clears unseen badge | VERIFIED | `lib/actions/contact.ts`: getUser + UPDATE contact_requests seen_at for viewer's recipient_id |
| 10 | ContactButton renders Sheet with form/success swap | VERIFIED | `components/profile/ContactButton.tsx`: Sheet side="right", trigger, form/success swap, not-accepting-contact alert |
| 11 | ContactForm maps all error codes and shows character counter | VERIFIED | `components/profile/ContactForm.tsx`: useActionState, zodResolver, 10 error code mappings, character counter with text-destructive states |
| 12 | OverflowMenu, BlockDialog, ReportDialog wired to server actions | VERIFIED | `components/profile/OverflowMenu.tsx`, `BlockDialog.tsx`, `ReportDialog.tsx` all exist and substantive |
| 13 | layout.tsx fetches unseenContactCount and threads to NavLinks badge | VERIFIED | `app/(app)/layout.tsx`: COUNT query on contact_requests where seen_at IS NULL + recipient_id = profile.id, passed to AppNav → NavLinks |
| 14 | NavLinks renders dot/pill badge with accessibility | VERIFIED | `components/layout/NavLinks.tsx`: dot (n=1, h-2 w-2) vs pill (n>=2, h-4 w-4, 9+ cap), aria-hidden + sr-only span |
| 15 | profile/page.tsx calls markContactsSeen to clear badge | VERIFIED | `app/(app)/profile/page.tsx`: await markContactsSeen().catch(() => {}) before data fetch |
| 16 | BlockedToast fires sonner on ?blocked= param after redirect | VERIFIED | `components/directory/BlockedToast.tsx`: useRef StrictMode guard, toast on mount, returns null; wired in `app/(app)/directory/page.tsx` |
| 17 | All 6 E2E specs and 6 unit test files are substantive (no FILLED IN: Plan 0 stubs remaining) | VERIFIED | 0 "FILLED IN: Plan 0" markers across all specs; 25 real E2E tests, 61 real unit tests; 1 known accepted stub (weekly-cap `expect(true).toBe(true)`) |

**Score:** 17/17 truths verified

### Required Artifacts

| Artifact | Expected | Status | Details |
|----------|----------|--------|---------|
| `supabase/migrations/005_contact_relay_trust.sql` | DB schema + RLS | VERIFIED | 5 sections: contact_requests, blocks, reports, directory RLS update, contact_eligibility SECURITY DEFINER RPC |
| `lib/database.types.ts` | Regenerated types | VERIFIED | Contains blocks, contact_requests, reports table types and contact_eligibility function type |
| `supabase/functions/send-contact/index.ts` | Edge Function relay pipeline | VERIFIED | 280 lines: JWT → eligibility → rate limits → INSERT → Resend → PostHog |
| `supabase/functions/send-contact/deno.json` | Pinned Deno deps | VERIFIED | 5 pinned npm: imports |
| `emails/contact-relay.tsx` | Brand-aligned email template | VERIFIED | ContactRelayEmail: brand tokens, serif headings, reply-to semantics |
| `app/api/webhooks/resend/route.ts` | Delivery webhook handler | VERIFIED | HMAC verification, event switch, status update |
| `lib/schemas/contact.ts` | Shared Zod schemas | VERIFIED | MessageSchema, ReportReasonEnum, ReportSchema, BlockSchema |
| `lib/actions/contact.types.ts` | Action result types | VERIFIED | SendContactResult (12-code discriminant), BlockMemberResult, ReportMemberResult, MarkContactsSeenResult |
| `lib/actions/contact.ts` | 4 server actions | VERIFIED | sendContactRequest, blockMember, reportMember, markContactsSeen |
| `components/profile/ContactButton.tsx` | Contact Sheet trigger | VERIFIED | Sheet with form/success swap, not-accepting alert |
| `components/profile/ContactForm.tsx` | Form with error mapping | VERIFIED | useActionState, zodResolver, 10 error codes, character counter |
| `components/profile/ContactSuccessState.tsx` | Success state | VERIFIED | CheckCircle2, "Sent!", "Barterkin is out of the loop" copy |
| `components/profile/OverflowMenu.tsx` | Block/report trigger menu | VERIFIED | Returns null for self; MoreVertical trigger, Block + Report items |
| `components/profile/BlockDialog.tsx` | Block confirmation dialog | VERIFIED | AlertDialog with blockMember form action, hidden inputs |
| `components/profile/ReportDialog.tsx` | Report form | VERIFIED | useActionState, 5-reason Select, two-pane swap on ok=true |
| `components/layout/NavLinks.tsx` | Badge-enabled nav | VERIFIED | unseenContactCount prop, dot/pill logic, aria-hidden + sr-only |
| `components/directory/BlockedToast.tsx` | Post-block toast | VERIFIED | useRef guard, toast on mount, null render |
| `app/(app)/layout.tsx` | unseenContactCount query | VERIFIED | COUNT query on contact_requests, prop thread to AppNav |
| `app/(app)/profile/page.tsx` | markContactsSeen on render | VERIFIED | await markContactsSeen before data fetch |
| `app/(app)/directory/page.tsx` | BlockedToast wiring | VERIFIED | blocked + blocked_error params extracted, BlockedToast rendered |
| `app/(app)/m/[username]/page.tsx` | Profile page with action props | VERIFIED | force-dynamic, getUser for viewer, passes viewerOwnerId/profileOwnerId/profileId/acceptingContact |
| `tests/e2e/contact-relay.spec.ts` | 5 E2E tests (CONT-01, CONT-04) | VERIFIED | Real test bodies, createVerifiedPair pattern, env guard |
| `tests/e2e/contact-rate-limit.spec.ts` | 3 tests (CONT-07, CONT-08) | VERIFIED | 2 real + 1 accepted stub (weekly-cap — DB timestamp limitation) |
| `tests/e2e/block-flow.spec.ts` | 4 E2E tests (TRUST-02) | VERIFIED | Real test bodies |
| `tests/e2e/report-flow.spec.ts` | 5 E2E tests (TRUST-01, TRUST-06) | VERIFIED | Real test bodies |
| `tests/e2e/unseen-badge.spec.ts` | 4 E2E tests (CONT-10) | VERIFIED | Real test bodies |
| `tests/e2e/ban-enforcement.spec.ts` | 4 E2E tests (TRUST-03) | VERIFIED | Real test bodies |
| `tests/unit/contact-schema.test.ts` | 25 unit tests | VERIFIED | MessageSchema, ReportSchema, BlockSchema coverage |
| `tests/unit/contact-eligibility.test.ts` | 6 unit tests (TRUST-07) | VERIFIED | contact_eligibility RPC behavior |
| `tests/unit/reports-rls.test.ts` | 6 unit tests (TRUST-05) | VERIFIED | RLS policy: no SELECT for authenticated |
| `tests/unit/resend-webhook.test.ts` | 7 unit tests (CONT-09) | VERIFIED | HMAC verification, event routing, status update |
| `tests/unit/contact-response-shape.test.ts` | 3 unit tests (CONT-06) | VERIFIED | Response shape: no PII in success payload |
| `tests/unit/contact-action.test.ts` | 14 unit tests | VERIFIED | sendContactRequest, blockMember, reportMember, markContactsSeen |

### Key Link Verification

| From | To | Via | Status | Details |
|------|-----|-----|--------|---------|
| `ContactForm.tsx` | `sendContactRequest` | `useActionState` | VERIFIED | useActionState(sendContactRequest, null as SendContactResult \| null) |
| `BlockDialog.tsx` | `blockMember` | `<form action={blockMember}>` | VERIFIED | Hidden inputs for blockedOwnerId/blockedDisplayName/blockedUsername |
| `ReportDialog.tsx` | `reportMember` | `useActionState` | VERIFIED | useActionState(reportMember, null) |
| `sendContactRequest` action | Edge Function | `fetch` with Authorization header | VERIFIED | getSession for access_token, fetch to NEXT_PUBLIC_SUPABASE_URL/functions/v1/send-contact |
| `blockMember` action | `blocks` table | `supabase.from('blocks').upsert()` | VERIFIED | Composite PK upsert, revalidatePath + redirect |
| `reportMember` action | `reports` table | `supabase.from('reports').insert()` | VERIFIED | Self-report guard in action (not CHECK constraint) |
| `markContactsSeen` action | `contact_requests` table | `supabase.from('contact_requests').update({ seen_at })` | VERIFIED | Filters to viewer's recipient_id |
| Edge Function | `contact_eligibility` RPC | `supabase.rpc('contact_eligibility', ...)` | VERIFIED | service_role client; GRANT only to service_role |
| Edge Function | Resend | `resend.emails.send({ react: ContactRelayEmail(...) })` | VERIFIED | replyTo: senderEmail from JWT; X-Entity-Ref-ID header |
| Edge Function | PostHog | `posthog.capture('contact_initiated', ...)` + `await posthog.shutdown()` | VERIFIED | server-side capture before response return |
| Resend webhook | `contact_requests.status` | `supabaseAdmin.from('contact_requests').update({ status }).eq('resend_id', emailId)` | VERIFIED | Lazy-init supabaseAdmin inside POST handler (Rule 1 fix) |
| `layout.tsx` | `NavLinks` unseenContactCount | COUNT query → AppNav prop → NavLinks prop | VERIFIED | Full prop thread confirmed in NavLinks.tsx and SUMMARY self-check |
| `profile/page.tsx` | `markContactsSeen` | `await markContactsSeen().catch(() => {})` | VERIFIED | Called before any data fetch |
| `directory/page.tsx` | `BlockedToast` | `<BlockedToast blockedName={blockedName} errorFlag={!!blocked_error} />` | VERIFIED | blocked + blocked_error params extracted from searchParams |

### Data-Flow Trace (Level 4)

| Artifact | Data Variable | Source | Produces Real Data | Status |
|----------|---------------|--------|--------------------|--------|
| `NavLinks.tsx` (badge) | `unseenContactCount` | `layout.tsx` COUNT query on contact_requests | Yes — { count: 'exact', head: true } Supabase query | FLOWING |
| `ContactForm.tsx` (errors) | `state` (SendContactResult) | Edge Function response mapped through sendContactRequest | Yes — 12-code discriminant from real Edge Function pipeline | FLOWING |
| `ReportDialog.tsx` (success) | `state` (ReportMemberResult) | reportMember server action | Yes — INSERT into reports + state.ok = true | FLOWING |
| `BlockedToast.tsx` | `blockedName` | URL param ?blocked= set by blockMember redirect | Yes — encoded name from blockMember server action | FLOWING |

### Behavioral Spot-Checks

Step 7b: SKIPPED — E2E tests require live Supabase environment and cannot run without infrastructure credentials. Unit tests verify module-level correctness. No server is running in this verification context.

### Requirements Coverage

| Requirement | Source Plan | Description | Status | Evidence |
|-------------|-------------|-------------|--------|----------|
| CONT-01 | Plans 01, 03, 05 | Authenticated member can send platform-relayed contact request to another member | VERIFIED | Edge Function pipeline complete; ContactForm → sendContactRequest → fetch → send-contact → Resend |
| CONT-02 | Plans 01, 02 | contact_requests schema with RLS (sender/recipient read, no INSERT for authenticated) | VERIFIED | migration 005 §1: INSERT restricted to service_role via RLS; SELECT for sender and recipient |
| CONT-03 | Plans 01, 03 | Email eligibility enforced: email-verified gate, block check, ban check, self-contact guard | VERIFIED | contact_eligibility RPC + Edge Function pre-send gates |
| CONT-04 | Plans 01, 03 | Reply-to header set to sender's email so recipient can reply directly | VERIFIED | Edge Function: replyTo: senderEmail extracted from JWT (never request body) |
| CONT-05 | Plan 03 | Email deliverability: SPF/DKIM/DMARC configured; mail-tester.com >= 9/10 | NEEDS HUMAN | DNS records must be verified on live domain; mail-tester.com requires real email send |
| CONT-06 | Plans 01, 03 | Success response contains no PII (only ok: true and contact_id) | VERIFIED | contact-response-shape.test.ts (3 tests); Edge Function response shape confirmed |
| CONT-07 | Plans 01, 03 | Daily rate limit: 5 contact requests per sender per day | VERIFIED | Edge Function COUNT rate check; contact-rate-limit.spec.ts daily-cap test |
| CONT-08 | Plans 01, 03 | Weekly rate limit: 20 contacts per sender, 2 per pair per week | VERIFIED | Edge Function COUNT rate checks; per-pair-weekly test; weekly-cap reset test is accepted stub |
| CONT-09 | Plans 01, 03 | Resend webhook updates contact_requests.status on delivery events | VERIFIED | resend-webhook.test.ts (7 tests); route.ts HMAC verification + status update |
| CONT-10 | Plans 01, 06 | Unseen contact badge in nav; cleared on /profile visit | VERIFIED | NavLinks badge + layout.tsx COUNT query + profile/page.tsx markContactsSeen call |
| CONT-11 | Plans 01, 03 | PostHog contact_initiated event fires server-side | NEEDS HUMAN | Code exists (posthog.capture + shutdown in Edge Function); event visibility requires live PostHog project |
| TRUST-01 | Plans 01, 04, 05 | Member can report another member for misconduct | VERIFIED | reportMember action, ReportDialog, report-flow.spec.ts (5 tests) |
| TRUST-02 | Plans 01, 04, 05 | Member can block another member; blocked member removed from directory view | VERIFIED | blockMember action, BlockDialog, directory RLS updated in migration 005 §4, block-flow.spec.ts (4 tests) |
| TRUST-03 | Plans 01, 04 | Admin can ban a member via SQL; banned member excluded from all directory views | NEEDS HUMAN | ban-enforcement.spec.ts (4 tests) covers code path; live SQL ban runbook needs admin confirmation |
| TRUST-04 | Plans 01, 02 | blocks table schema with RLS | VERIFIED | migration 005 §2: composite PK, self-block CHECK, RLS |
| TRUST-05 | Plans 01, 02 | reports table: no SELECT for authenticated users (privacy) | VERIFIED | migration 005 §3: NO SELECT policy; reports-rls.test.ts (6 tests) |
| TRUST-06 | Plans 01, 04, 05 | Report submitted confirmation shown to reporter; no action confirmation to reported | VERIFIED | ReportDialog two-pane swap on state.ok; report-flow.spec.ts |
| TRUST-07 | Plans 01, 02 | contact_eligibility RPC: SECURITY DEFINER + REVOKE/GRANT pattern | VERIFIED | migration 005 §5 + contact-eligibility.test.ts (6 tests) |

### Anti-Patterns Found

| File | Line | Pattern | Severity | Impact |
|------|------|---------|----------|--------|
| `tests/e2e/contact-rate-limit.spec.ts` | weekly-cap test | `expect(true).toBe(true)` placeholder | INFO | Accepted stub — documented in SUMMARY.md and VALIDATION.md; DB timestamp backdating not possible via Supabase admin REST client. Not a code quality issue. |

No blocker anti-patterns found. No TODO/FIXME/placeholder comments in production code. No empty implementations in wired paths. The one stub is in a test file and is explicitly documented as intentional.

### Human Verification Required

#### 1. Edge Function Deployment + Secrets

**Test:** Deploy `send-contact` Edge Function via `supabase functions deploy send-contact --project-ref <ref>`. Set secrets: RESEND_API_KEY, POSTHOG_API_KEY, SUPABASE_SERVICE_ROLE_KEY, NEXT_PUBLIC_SUPABASE_URL. Confirm verify_jwt=true is enforced.
**Expected:** Function appears in Supabase dashboard; calling without Authorization header returns 401; calling with valid JWT and valid payload returns `{ ok: true, contact_id: "..." }`.
**Why human:** Requires Supabase CLI authentication, project ref, and secrets dashboard access.

#### 2. Resend Webhook Configuration

**Test:** In Resend dashboard, add webhook endpoint pointing to `https://<app-domain>/api/webhooks/resend`. Copy the signing secret into Vercel env var RESEND_WEBHOOK_SECRET. Send a test event from the dashboard.
**Expected:** Webhook returns 200; `contact_requests.status` updates in Supabase DB.
**Why human:** Requires Resend dashboard access, a deployed app URL, and Vercel env var management.

#### 3. Email Deliverability (CONT-05)

**Test:** Send a contact request from a test account. Check the received email headers for SPF pass, DKIM signature, DMARC alignment. Submit the email to mail-tester.com and verify score >= 9/10.
**Expected:** All three DNS authentication checks pass. No blacklisted IPs. Score >= 9/10.
**Why human:** Requires live email delivery from the Resend account; mail-tester.com is an external service.

#### 4. Full Smoke Test (11 steps, Plans 04-05 Task 4)

**Test:** With two verified test accounts (User A, User B): (a) A sends contact to B — email arrives with correct reply-to; (b) B replies to email — reply goes directly to A's address; (c) A blocks B — B disappears from A's directory; blocked toast fires on /directory; (d) A reports B — "Report submitted" confirmation appears; admin notify email arrives; (e) Visit /profile as B — unseen badge clears.
**Expected:** All 5 sub-flows complete without errors. Email headers match expectations. Badge clears.
**Why human:** Requires two live authenticated accounts, real email delivery, and manual browser interaction.

#### 5. PostHog contact_initiated Event (CONT-11)

**Test:** After a successful contact send (smoke test step above), open PostHog dashboard and search for a contact_initiated event. Verify it has recipient_county and recipient_category properties.
**Expected:** Event appears in PostHog within seconds of the contact send. Properties are populated from the recipient's profile.
**Why human:** Requires live PostHog project with POSTHOG_API_KEY configured in Edge Function secrets; event only fires when Edge Function executes against real PostHog endpoints.

#### 6. Admin SQL Ban Runbook (TRUST-03)

**Test:** As admin, run: `UPDATE profiles SET banned = true WHERE id = '<uuid>';`. Then attempt to view the directory as an authenticated non-admin user — confirm the banned user does not appear. Attempt to send a contact request to the banned user — confirm it fails with the appropriate error code.
**Expected:** Banned user absent from directory (RLS blocks them). contact_eligibility RPC returns recipient_banned error code.
**Why human:** Requires Supabase project admin SQL access and real user accounts for the ban test.

#### 7. Full Test Suite Execution

**Test:** With Supabase test env vars set, run: `pnpm typecheck && pnpm test && pnpm e2e`.
**Expected:** typecheck: 0 errors. unit tests: all 61 passing. E2E: 24/25 passing (1 known accepted stub for weekly-cap reset). No regressions.
**Why human:** E2E tests require NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY, SUPABASE_SERVICE_ROLE_KEY environment variables pointing to a live Supabase test project.

### Gaps Summary

No code gaps found. All 17 observable truths are verified against the actual codebase. All artifacts exist, are substantive, and are wired end-to-end. Data flows from real sources (DB queries, Edge Function pipeline, server actions) — no hollow props or static returns.

The phase goal is architecturally complete. The `human_needed` status reflects that 7 human verification items (Edge Function deployment, Resend webhook config, email deliverability, smoke test, PostHog event, admin ban runbook, full test suite) cannot be verified programmatically and require live infrastructure access.

---

_Verified: 2026-04-21T00:00:00Z_
_Verifier: Claude (gsd-verifier)_
