---
phase: "05-contact-relay-trust-joined"
plan: "04"
subsystem: "contact-relay-trust"
tags: ["server-actions", "contact-relay", "trust-floor", "email", "vitest", "wave-3"]
dependency_graph:
  requires:
    - "05-02: blocks + reports + contact_requests tables with RLS"
    - "05-01: MessageSchema, ReportSchema, BlockSchema, result envelope types"
    - "05-03: send-contact Edge Function (CONT-03 proxy target)"
  provides:
    - "lib/actions/contact.ts (sendContactRequest, blockMember, reportMember, markContactsSeen)"
    - "emails/report-admin-notify.tsx (ReportAdminNotifyEmail)"
    - "tests/unit/contact-action.test.ts (14 passing tests)"
  affects:
    - "05-05 (UI): ContactForm uses sendContactRequest; BlockDialog uses blockMember; ReportDialog uses reportMember"
    - "05-06 (profile page): markContactsSeen called on profile page load to clear badge"
tech_stack:
  added:
    - "emails/ directory (new)"
    - "ReportAdminNotifyEmail React Email component"
  patterns:
    - "Server action proxy pattern: getUser() for trust, getSession() for JWT forwarding (documented Pitfall §1 exception)"
    - "Non-blocking try/catch for side-effect emails (Resend admin notify)"
    - "blockMember redirect-on-error pattern (one-shot form action, no return value)"
    - "Self-block + self-report guards at server action layer (defense-in-depth)"
    - "vi.mock hoisting-safe pattern: inline factory vi.fn() + vi.mocked() refs post-import"
key_files:
  created:
    - "lib/actions/contact.ts"
    - "emails/report-admin-notify.tsx"
    - "tests/unit/contact-action.test.ts"
decisions:
  - "sendContactRequest uses getSession() ONLY to extract access_token for Edge Function forwarding; trust decision precedes via getUser() — documented inline (Pitfall §1 legitimate exception)"
  - "reportMember admin notify is non-blocking: DB INSERT is the source of truth; email failure logged but does not fail the action (T-5-04-06 accepted)"
  - "blockMember returns Promise<void> and always redirects (never returns) — matches useActionState-incompatible one-shot form action pattern from UI-SPEC"
  - "vi.mock hoisting: used inline vi.fn() in factory bodies instead of outer-scope variables to avoid ReferenceError (TDZ) — changed from the plan's skeleton which used outer const mocks"
  - "Type cast in test helper uses 'as any' with eslint-disable comment rather than complex conditional type extraction — avoids 'does not sufficiently overlap' TS2352 error"
metrics:
  duration: "~10 minutes"
  completed: "2026-04-21"
  tasks_completed: 3
  files_created: 3
  files_modified: 0
---

# Phase 05 Plan 04: Contact Server Actions + Admin-Notify Email

Four Next.js server actions (`sendContactRequest`, `blockMember`, `reportMember`, `markContactsSeen`) providing the Vercel-Node-side glue between Phase 5 UI (Plan 05) and the Supabase primitives (Plans 02–03), plus a branded React Email admin-notify template and 14 unit tests.

## Tasks Completed

### Task 1: Admin-notify React Email template (commit: d3794df)

`emails/report-admin-notify.tsx` exports `ReportAdminNotifyEmail` accepting all required props:

- `reporterDisplayName`, `reporterEmail`, `reporterUsername`
- `targetDisplayName`, `targetUsername`, `targetProfileUrl`
- `reason` (harassment|spam|off-topic|impersonation|other)
- `note?` (optional, conditionally rendered with clay `border-left` quote block)
- `reportId` (monospace), `createdAt`

Brand tokens applied: `#2d5a27` (forest header), `#1e4420` (text), `#c4956a` (clay accent, link + note border).

Admin runbook hints embedded: SQL `SELECT * FROM public.reports WHERE id = '...'` and `UPDATE public.profiles SET banned = true WHERE id = '...'` (TRUST-04 pattern).

### Task 2: Contact server actions (commit: cf04e52)

`lib/actions/contact.ts` with `'use server'` on line 1, 4 exported async functions:

**`sendContactRequest(_prev, formData): Promise<SendContactResult>`**
- `getUser()` for identity (trust gate)
- `MessageSchema.safeParse()` for Zod validation (recipientProfileId UUID + message 20–500 chars)
- `getSession()` ONLY for `access_token` forwarding (documented Pitfall §1 exception, inline comment)
- `fetch()` to `${NEXT_PUBLIC_SUPABASE_URL}/functions/v1/send-contact` with `Authorization: Bearer <token>`
- Passthrough of Edge Function error codes (`daily_cap`, `weekly_cap`, `pair_dup`, etc.)

**`blockMember(formData): Promise<void>`**
- `getUser()` for identity; `redirect('/login')` if unauthed
- `BlockSchema.safeParse()` (blockedOwnerId UUID + display name + username)
- Self-block guard: `redirect('/directory')` silently if `blockedOwnerId === user.id`
- `supabase.from('blocks').upsert({...}, { onConflict: 'blocker_id,blocked_id', ignoreDuplicates: true })`
- `revalidatePath('/directory')` + `revalidatePath('/m/<username>')`
- `redirect('/directory?blocked=<encodedName>')` (toast-on-destination pattern)

**`reportMember(_prev, formData): Promise<ReportMemberResult>`**
- `getUser()` + `email_confirmed_at` verification gate
- `ReportSchema.safeParse()` (targetProfileId + reason enum + optional note)
- Self-report guard: compare `target.owner_id` vs `user.id`
- `supabase.from('reports').insert({...}).select('id, created_at').single()`
- Admin notify via Resend (non-blocking try/catch): `RESEND_API_KEY` env, `ADMIN_NOTIFY_EMAIL` env (fallback `hello@barterkin.com`), `ReportAdminNotifyEmail` template
- Returns `{ ok: true }` regardless of email outcome; DB insert is source of truth

**`markContactsSeen(): Promise<MarkContactsSeenResult>`**
- `getUser()` → resolve profile id from profiles table
- `UPDATE contact_requests SET seen_at=now() WHERE recipient_id=<profile.id> AND seen_at IS NULL`
- Returns `{ ok: true, count: N }` (best-effort; errors return `ok: false` but don't throw)

**Env vars referenced:**
- `NEXT_PUBLIC_SUPABASE_URL` — Edge Function endpoint construction
- `RESEND_API_KEY` — admin-notify email sending
- `ADMIN_NOTIFY_EMAIL` — recipient address (fallback: `hello@barterkin.com`)
- `NEXT_PUBLIC_SITE_URL` — reporter/target profile URL construction (fallback: `https://barterkin.com`)

### Task 3: Unit tests (commit: b520fff)

`tests/unit/contact-action.test.ts` — 14 passing assertions:

| Describe | Test | Count |
|----------|------|-------|
| sendContactRequest | unauthorized (no user) | 1 |
| sendContactRequest | bad_message (< 20 chars) | 1 |
| sendContactRequest | ok + contactId (happy path) | 1 |
| sendContactRequest | daily_cap passthrough | 1 |
| sendContactRequest | unknown on fetch error | 1 |
| blockMember | redirect /login (unauthed) | 1 |
| blockMember | silent redirect /directory (self-block) | 1 |
| blockMember | upsert + revalidate + redirect (happy path) | 1 |
| reportMember | unauthorized (no user) | 1 |
| reportMember | unauthorized (unverified email) | 1 |
| reportMember | self_report guard | 1 |
| reportMember | happy path: insert + admin notify | 1 |
| markContactsSeen | not-authed | 1 |
| markContactsSeen | ok + count | 1 |

**Total: 14 / 14 passing**

## Final Verification

| Check | Result |
|-------|--------|
| `pnpm test tests/unit/contact-action.test.ts` | 14 passing, 0 failures |
| `pnpm typecheck` | 0 errors |
| `pnpm lint` | 0 errors (30 warnings, all pre-existing stubs) |
| `emails/report-admin-notify.tsx` | FOUND — all 8 props + brand tokens + runbook SQL |
| `lib/actions/contact.ts` exports all 4 actions | CONFIRMED |
| `getSession()` used exactly once (Pitfall §1 exception) | CONFIRMED |
| `getUser()` used in all 4 actions (≥ 4 calls) | CONFIRMED |
| PII-safe logging (code-only, no email/message/names) | CONFIRMED |

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] vi.mock hoisting: outer-scope variable approach fails**
- **Found during:** Task 3 (initial test run)
- **Issue:** The plan's test skeleton declared `const getUserMock = vi.fn()` at module scope before `vi.mock()` calls, but Vitest hoists `vi.mock()` factory calls to before all variable declarations — causing `ReferenceError: Cannot access 'revalidatePathMock' before initialization`
- **Fix:** Restructured to use inline `vi.fn()` calls inside factory bodies; accessed mocks post-import via `vi.mocked()` + a `makeSupabaseMock()` helper that calls `vi.mocked(createClient).mockResolvedValue(...)` per test
- **Files modified:** `tests/unit/contact-action.test.ts`
- **Commit:** b520fff

**2. [Rule 1 - Bug] TypeScript TS2352 on partial mock object cast**
- **Found during:** Task 3 (pnpm typecheck after initial test write)
- **Issue:** `client as ReturnType<typeof createClient> extends Promise<infer T> ? T : never` produced a "does not sufficiently overlap" error because the test double doesn't implement 24 SupabaseClient members
- **Fix:** Replaced with `client as any` guarded by an `eslint-disable-next-line @typescript-eslint/no-explicit-any` comment — standard pattern for test doubles of complex external types
- **Files modified:** `tests/unit/contact-action.test.ts`
- **Commit:** b520fff

## Known Stubs

None — all three files are fully implemented. The plan's E2E test stubs (`block-flow.spec.ts`, `report-flow.spec.ts`) are pre-existing scaffolding from Plan 01 with `FILLED IN: Plan 04` markers — those are filled by Plan 05 (UI), not this plan.

## Threat Surface Scan

This plan adds no new network endpoints or auth paths. Files created:

- `lib/actions/contact.ts` — Server Actions (CSRF-protected by Next.js, user-session Supabase client, no service-role key exposure). All STRIDE mitigations from plan's threat register confirmed present:
  - T-5-04-01: `blocker_id = user.id` from `getUser()` (not from form)
  - T-5-04-02: `reporter_id = user.id` from `getUser()` (not from form)
  - T-5-04-03: Explicit `target.owner_id !== user.id` self-report check before INSERT
  - T-5-04-04: `MessageSchema.safeParse()` validates before forwarding to Edge Function
  - T-5-04-05: `getSession()` used once, after `getUser()` trust gate, with inline comment
  - T-5-04-08: `markContactsSeen` updates only rows matching `recipient_id = profile.id` (user's own profile)
  - T-5-04-09: `blockMember` redirects to fixed paths only; `blockedDisplayName` is `encodeURIComponent`'d

- `emails/report-admin-notify.tsx` — React Email template; no network calls, no secrets, no sensitive data exposed.

## Self-Check: PASSED

- `emails/report-admin-notify.tsx` — FOUND
- `lib/actions/contact.ts` — FOUND
- `tests/unit/contact-action.test.ts` — FOUND
- Commits d3794df, cf04e52, b520fff — all present in git log
