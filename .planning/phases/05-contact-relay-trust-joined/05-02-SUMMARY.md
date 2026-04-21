---
phase: 05-contact-relay-trust-joined
plan: "02"
subsystem: database
tags: [postgres, rls, supabase, migration, trust-floor, contact-relay, unit-tests]

requires:
  - phase: 05-01
    provides: "Zod schemas, TypeScript result types, shadcn primitives, test stubs with FILLED IN markers"
  - phase: 03-profile-georgia-gate
    provides: "profiles table (banned, accepting_contact columns), current_user_is_verified() function"
  - phase: 02-authentication-legal
    provides: "auth.users table, current_user_is_verified() SECURITY DEFINER function"

provides:
  - "supabase/migrations/005_contact_relay_trust.sql — contact_requests, blocks, reports tables with full RLS"
  - "public.contact_eligibility(uuid, uuid) SECURITY DEFINER RPC — single call returns all sender+recipient flags"
  - "public.utc_day(timestamptz) IMMUTABLE helper — enables partial unique index on UTC calendar day"
  - "Directory visibility policy cascade — blocked pairs hidden from each other in search"
  - "lib/database.types.ts — regenerated with contact_requests, blocks, reports, contact_eligibility types"
  - "tests/unit/contact-eligibility.test.ts — 6 live tests covering TRUST-07 eligibility conditions"
  - "tests/unit/reports-rls.test.ts — 6 live tests covering TRUST-05 reporter opacity"

affects:
  - "05-03 (send-contact Edge Function) — consumes contact_eligibility RPC, inserts contact_requests via service-role"
  - "05-04 (block/report server actions) — inserts into blocks and reports tables"
  - "05-05 (contact UI) — reads contact_requests for unseen badge count"
  - "05-06 (Resend webhook) — updates contact_requests.status via service-role"

tech-stack:
  added:
    - "public.contact_eligibility SECURITY DEFINER RPC (Postgres, SQL)"
    - "public.utc_day(timestamptz) IMMUTABLE wrapper function (Postgres, SQL)"
    - "contact_requests partial unique index contact_requests_pair_day_unique_idx"
    - "reports table with NO SELECT policy for authenticated (TRUST-05 opacity pattern)"
    - "blocks table with directional RLS (read/insert/delete own rows only)"
  patterns:
    - "SECURITY DEFINER + search_path lockdown for RPCs that read auth.users (Pitfall §5)"
    - "REVOKE from public/anon/authenticated + GRANT to service_role for Edge-Function-only RPCs"
    - "DROP + recreate policy pattern for extending existing RLS policies"
    - "IMMUTABLE wrapper function for STABLE built-ins used in index expressions"
    - "generateLink + verifyOtp for authenticated test sessions (project uses magic-link, no password auth)"
    - "Admin client initialized inside beforeAll (not at describe scope) to prevent failures when env vars absent"

key-files:
  created:
    - "supabase/migrations/005_contact_relay_trust.sql"
  modified:
    - "lib/database.types.ts (regenerated after supabase db push)"
    - "lib/actions/contact.types.ts (@ts-expect-error pragmas removed; tables now typed)"
    - "tests/unit/contact-eligibility.test.ts (stub fully implemented)"
    - "tests/unit/reports-rls.test.ts (stub fully implemented)"

key-decisions:
  - "Used utc_day() IMMUTABLE wrapper for partial unique index — Postgres requires IMMUTABLE in index expressions; date_trunc on timestamptz is only STABLE (depends on session timezone)"
  - "Removed reports_no_self_report CHECK constraint subquery — Postgres does not allow subqueries in CHECK constraints; self-report prevention enforced in reportMember server action (Plan 04)"
  - "Used generateLink + verifyOtp for test JWT acquisition — project uses magic-link auth only; signInWithPassword returns empty session (pre-existing limitation in directory-rls tests too)"
  - "Migration applied via supabase db query --linked (not supabase db push) — non-timestamped filenames caused ordering conflicts; 002/003/004 repaired in migration history first"

requirements-completed:
  - CONT-04
  - CONT-07
  - CONT-08
  - CONT-10
  - TRUST-01
  - TRUST-02
  - TRUST-03
  - TRUST-04
  - TRUST-05
  - TRUST-07

duration: 14min
completed: "2026-04-21"
---

# Phase 05 Plan 02: Migration 005 — Contact Relay + Trust Schema

Complete PostgreSQL schema for Phase 5 trust floor: three new tables (contact_requests, blocks, reports) with RLS, a SECURITY DEFINER eligibility RPC restricted to service_role, a directory visibility policy cascade for blocks, performance indexes including a partial unique dedup index, and live unit tests proving TRUST-05 opacity and TRUST-07 eligibility gates against the linked Supabase project.

## Performance

- **Duration:** ~14 minutes
- **Started:** 2026-04-21T09:28:55Z
- **Completed:** 2026-04-21T09:43:00Z
- **Tasks:** 3 / 3
- **Files modified:** 5

## Accomplishments

### Task 1: Author migration 005 (commit: 85510d9)

`supabase/migrations/005_contact_relay_trust.sql` created with 5 sections:

**Section 1 — contact_requests table:**
- Columns: id (uuid pk), sender_id (FK→profiles), recipient_id (FK→profiles), message (CHECK 20–500 chars), status (enum sent/delivered/bounced/complained/failed), resend_id, seen_at, created_at
- CHECK constraint: sender_id <> recipient_id (contact_requests_not_self)
- RLS: sender SELECT, recipient SELECT, recipient UPDATE (seen_at only)
- No INSERT for authenticated (service-role only via Edge Function — CONT-03)
- Indexes: sender+created, pair+created, recipient unseen (partial), resend_id (partial)
- Partial unique: contact_requests_pair_day_unique_idx on (sender_id, recipient_id, utc_day(created_at)) WHERE status='sent'

**Section 2 — blocks table:**
- Composite PK (blocker_id, blocked_id), self-block CHECK
- RLS: read/insert/delete own rows only (blocker_id = auth.uid()); no UPDATE
- Indexes: blocker_idx, blocked_idx

**Section 3 — reports table:**
- Columns: id, reporter_id (FK→auth.users), target_profile_id (FK→profiles), reason (enum CHECK), note (≤500 chars), status (enum), created_at
- RLS: INSERT only for authenticated (reporter_id=auth.uid() WITH CHECK + email-verified gate); NO SELECT for authenticated (TRUST-05)
- Indexes: target_idx, status+created_at

**Section 4 — Directory visibility cascade:**
- DROP + recreate "Verified members see published non-banned profiles" → "...non-blocked profiles"
- Added NOT EXISTS check against blocks table (bidirectional: blocker OR blocked)

**Section 5 — contact_eligibility SECURITY DEFINER RPC:**
- Returns 14 columns: sender/recipient profile info + 4 eligibility flags
- SECURITY DEFINER + search_path = public, pg_temp (Pitfall §5)
- REVOKE from public/anon/authenticated; GRANT to service_role only (TRUST-07, Pitfall §5)

### Task 2: Push migration + regenerate types (commit: 118936f)

- Applied migration via `supabase db query --linked --file` (non-timestamped migration names caused CLI ordering issues; repaired 002/003/004/005 history)
- Confirmed all 3 tables exist in remote: `SELECT tablename FROM pg_tables WHERE schemaname='public'...` → blocks, contact_requests, reports
- Confirmed contact_eligibility RPC exists in pg_proc
- Confirmed 7 RLS policies on new tables (blocks: 3, contact_requests: 3, reports: 1)
- Regenerated lib/database.types.ts (stderr redirected to /dev/null to avoid contamination)
- Removed @ts-expect-error pragmas from lib/actions/contact.types.ts
- pnpm typecheck: 0 errors; pnpm lint: 0 errors

### Task 3: Fill in unit tests (commit: 7a1be4c)

**tests/unit/contact-eligibility.test.ts (6 tests — TRUST-07):**
1. Happy path: all flags false, sender_profile_id populated, recipient_email present
2. Banned sender: sender_banned = true
3. Banned recipient: recipient_banned = true
4. Not accepting: accepting_contact = false
5. Blocked by recipient: blocked_by_recipient = true (block row inserted + cleaned up)
6. Blocked by sender: blocked_by_sender = true (block row inserted + cleaned up)

**tests/unit/reports-rls.test.ts (6 tests — TRUST-05):**
1. Service-role can INSERT + SELECT reports (confirms bypass of RLS)
2. Authenticated SELECT returns 0 rows (opacity invariant)
3. Authenticated cannot SELECT own submitted reports
4. Authenticated CAN insert own report (valid reason, own reporter_id)
5. Authenticated cannot insert with wrong reporter_id (RLS WITH CHECK rejection)
6. Invalid reason enum value rejected (CHECK constraint 23514)

All 12 tests pass against the live Supabase project.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] IMMUTABLE index expression — date_trunc not usable in index**
- **Found during:** Task 2 (supabase db query --linked returned error code 42P17)
- **Issue:** `date_trunc('day', created_at)` is STABLE (not IMMUTABLE) in Postgres because it depends on session timezone; cannot be used in index expressions
- **Fix:** Created `public.utc_day(timestamptz) IMMUTABLE` wrapper: `(ts at time zone 'UTC')::date`; used `utc_day(created_at)` in the partial unique index; GRANT to authenticated + service_role
- **Files modified:** supabase/migrations/005_contact_relay_trust.sql
- **Commit:** 118936f

**2. [Rule 1 - Bug] Subquery in CHECK constraint not supported**
- **Found during:** Task 2 (Postgres error 0A000 "cannot use subquery in check constraint")
- **Issue:** `reports_no_self_report CHECK (target_profile_id NOT IN (SELECT ...))` — Postgres does not allow subqueries in CHECK constraints at all (documented limitation)
- **Fix:** Removed the CHECK constraint; added a comment documenting that self-report prevention is enforced in the `reportMember` server action (Plan 04). The plan's own comment noted "for stronger invariant, enforce in reportMember server action" — this is the enforcement path.
- **Files modified:** supabase/migrations/005_contact_relay_trust.sql
- **Commit:** 118936f

**3. [Rule 1 - Bug] signInWithPassword returns empty session (magic-link-only project)**
- **Found during:** Task 3 (reports-rls.test.ts beforeAll assertion failed on empty JWT)
- **Issue:** The Supabase project uses magic-link auth only; Email+Password provider not enabled; `signInWithPassword` silently returns null session
- **Fix:** Replaced with `admin.auth.admin.generateLink({ type: 'magiclink', email })` → `anonClient.auth.verifyOtp({ email, token: email_otp, type: 'magiclink' })` to obtain a real JWT without password auth
- **Scope note:** Same bug exists in `directory-rls-visibility.test.ts` (pre-existing, out of scope for this plan)
- **Files modified:** tests/unit/reports-rls.test.ts
- **Commit:** 7a1be4c

**4. [Rule 1 - Bug] Admin client initialized at describe scope caused failures without env vars**
- **Found during:** Task 3 (test run without env vars — 2 test files failed instead of skipping)
- **Issue:** `createSupabaseClient(URL!, SERVICE!, ...)` called at describe body level; even with `describe.skip`, Vitest evaluates the body; `URL!` was undefined
- **Fix:** Moved `admin = createSupabaseClient(...)` inside `beforeAll` (consistent with directory-rls-visibility.test.ts reference pattern)
- **Files modified:** tests/unit/contact-eligibility.test.ts, tests/unit/reports-rls.test.ts
- **Commit:** 7a1be4c

**5. [Rule 1 - Bug] Unused @ts-expect-error in reports-rls.test.ts**
- **Found during:** Task 3 (pnpm typecheck returned TS2578)
- **Issue:** `@ts-expect-error` on `reason: 'invalid-reason'` was unnecessary because the generated `reports` table type uses `string` (not a union), so TypeScript accepts any string value
- **Fix:** Replaced with inline comment explaining intent
- **Files modified:** tests/unit/reports-rls.test.ts
- **Commit:** 7a1be4c

**6. [Rule 3 - Blocking] Supabase migration history repair needed**
- **Found during:** Task 2 (supabase db push --linked failed with "already exists" errors)
- **Issue:** Non-timestamped migration filenames (002_*, 003_*, 004_*) were already applied to the remote DB from prior phases but not recorded in supabase_migrations.schema_migrations; CLI re-applied them
- **Fix:** Used `supabase migration repair --status applied 002/003/004` to mark prior migrations as applied; applied 005 via `supabase db query --linked --file`; marked 005 via `supabase migration repair --status applied 005`
- **Files modified:** None (remote migration history only)
- **Commit:** 118936f

## Deferred Items

The following pre-existing issues are out of scope for this plan but should be fixed in a future session:

- `tests/unit/directory-rls-visibility.test.ts` — uses `signInWithPassword` which returns empty session (same root cause as Deviation 3 above); needs migration to `generateLink + verifyOtp` pattern
- `tests/unit/directory-data.test.ts` — likely same JWT issue; 6 tests fail when env vars are present

## Known Stubs

None — all stub markers (`FILLED IN: Plan 02`) removed from both test files. Stub marker count = 0 in both files.

## Threat Surface Scan

This plan adds three new tables and one RPC. All threat mitigations from the plan's STRIDE register are present:

| Flag | File | Disposition |
|------|------|-------------|
| T-5-02-01 Block-bombing | blocks_insert_self WITH CHECK | mitigated — enforced at DB level |
| T-5-02-02 Report-bombing | reports_insert_self WITH CHECK + email-verify | mitigated — enforced at DB level |
| T-5-02-03 Reporter identity leak | No SELECT on reports for authenticated | mitigated — TRUST-05 confirmed by test |
| T-5-02-04 contact_eligibility probe via PostgREST | REVOKE from anon/authenticated | mitigated — only service_role can invoke |
| T-5-02-05 search_path hijack on contact_eligibility | SET search_path = public, pg_temp | mitigated — standard SECURITY DEFINER hardening |
| T-5-02-06 Spam cannon (same-day duplicate) | contact_requests_pair_day_unique_idx | mitigated — partial unique enforces DB-level dedup |
| T-5-02-07 Direct authenticated INSERT into contact_requests | No INSERT policy on authenticated | mitigated — only service_role can insert |
| T-5-02-08 Self-report / self-block | blocks CHECK (blocker_id <> blocked_id); reports self-report: server action | partially mitigated — blocks CHECK at DB; reports at server action |
| T-5-02-09 Blocked users visible in directory | NOT EXISTS blocks in profile RLS | mitigated — bidirectional block check in policy |
| T-5-02-10 Recipient manipulates contact_requests.status | Accept | accepted — per plan |

## Self-Check: PASSED

- `supabase/migrations/005_contact_relay_trust.sql` — FOUND
- `lib/database.types.ts` (contains `contact_requests:`) — FOUND
- `lib/actions/contact.types.ts` (no @ts-expect-error) — FOUND
- `tests/unit/contact-eligibility.test.ts` — FOUND (no FILLED IN markers)
- `tests/unit/reports-rls.test.ts` — FOUND (no FILLED IN markers)
- Commits 85510d9, 118936f, 7a1be4c — all present in git log
