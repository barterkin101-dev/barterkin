---
phase: 07-pre-launch-seeding
plan: 04
subsystem: pre-launch-seeding
tags: [outreach-execution, seeding, consent-loop, checkpoint-pending, wave-3]
requires:
  - docs/outreach-template.md (Plan 01 outreach runbook — base template + 11-listing personalization + tracking table)
  - scripts/seed-founding-members.mjs (Plan 02 idempotent seed script with empty members[] awaiting consent data)
  - components/profile/FoundingMemberBadge.tsx (Plan 03 shared badge component wired into DirectoryCard + ProfileCard)
  - hello@barterkin.com inbox (external — Phase 1 mail routing, human-verified at Task 1)
  - Resend domain verification for barterkin.com (external — Phase 1 deliverable)
  - Google Form "Barterkin — Founding Member Consent" (external — Ashley creates before Task 1 checkpoint)
  - TikTok account security on Ashley's personal handle (out-of-band; outreach channel)
provides:
  - SEED-01 outreach execution (11 personalized DMs, tracking table fully populated) — PENDING (awaiting Task 2)
  - SEED-02 consent responses flowing into Google Sheet — PENDING (awaiting Task 1 form creation + Task 2 DMs)
  - SEED-05 production coverage gate (≥30 founders / ≥2 counties / ≥3 categories) — PENDING (awaiting Task 3 seed run + Task 4 SQL verification)
affects:
  - scripts/seed-founding-members.mjs (members[] array will be populated in Task 3 from consent responses)
  - docs/outreach-template.md (Section 6 tracking table will be filled + {GOOGLE_FORM_URL} substituted in Task 1/2)
  - Production Supabase profiles/auth.users/skills_offered/skills_wanted tables (will receive ≥30 founding-member rows)
tech-stack:
  added: []
  patterns:
    - Human-action-first checkpoint sequencing (Task 1 gates all mechanical work; external-system verification cannot be automated)
    - Idempotent re-runnable seed loop (members[] grows over days as consent responses arrive; existing emails skip)
    - Anchor-first outreach cadence per D-11 (Kerry's DM before the other 10 to leverage her 1,400-follower amplification)
    - Audit trail via git-committed tracking table (every DM send date + response status recorded in docs/outreach-template.md)
key-files:
  created:
    - .planning/phases/07-pre-launch-seeding/07-04-SUMMARY.md (this file — checkpoint state record)
  modified: []
decisions:
  - Paused at Task 1 (checkpoint:human-verify, gate=blocking) per plan spec — preconditions CANNOT be automated (inbox test, Resend dashboard check, Google Form creation, TikTok handle audit, production directory spot-check all require Ashley's hands and accounts)
  - SUMMARY.md committed at checkpoint rather than deferred to plan completion — enables orchestrator to surface pending human action to user immediately; will be extended with outcomes when remaining tasks land
  - Did NOT attempt to substitute {GOOGLE_FORM_URL} placeholder speculatively — the form URL only exists after Ashley creates the form (Step 3 of Task 1), and fabricating a URL would break the acceptance-criteria grep in Task 2
  - Did NOT pre-populate members[] with any test row — Plan 02 already smoke-tested an empty array successfully (per 07-02-SUMMARY handoff notes); Task 3 requires real consent responses which don't exist until Tasks 1+2 complete
metrics:
  duration: "checkpoint reached (executor ran <5 minutes; Tasks 2-4 await Ashley's outreach window, typically 2-7 days per Plan 04 action block)"
  completed: "PENDING — Task 1/4 awaiting user approval"
  tasks_completed: 0
  tasks_pending: 4
  checkpoint_type: "checkpoint:human-verify (Task 1)"
---

# Phase 07 Plan 04: Outreach Execution + SEED-05 Gate Summary (Checkpoint — Pending)

**Status:** Paused at Task 1 (`checkpoint:human-verify`, gate=blocking). Zero of four tasks complete. Awaiting Ashley's verification of six external preconditions before the DM loop can begin. This file captures the checkpoint state; the orchestrator will surface the pending actions to the user. When Ashley replies "approved", a continuation executor will resume from Task 2 and this SUMMARY will be replaced with the full execution record.

## Why This Plan Paused Immediately

Plan 07-04 is inherently human-action gated. Unlike 07-01 / 07-02 / 07-03 (which produced code and tests), this plan's work is the outreach-and-seed loop: Ashley sends TikTok DMs personally, waits for Google Form responses, copies consent data into `members[]`, runs the seed script, and SQL-verifies the coverage gate. The executor's role is to (a) stop at each checkpoint, (b) run the auto Task 3 when real data exists, (c) produce the final SUMMARY after the SEED-05 gate passes.

Task 1 is literally titled "Confirm preconditions before outreach" and has six sub-steps, every one of which is an external-system check Ashley must perform herself:

1. **hello@barterkin.com inbox live** — send a test email, confirm arrival. Requires actual mail-flow through the domain registrar's routing configuration.
2. **Resend dashboard verified sender** — log into Resend, confirm barterkin.com domain and hello@ address are verified.
3. **Google Form created** — Ashley opens https://forms.google.com and builds the 8-field form per `docs/outreach-template.md` Section 4.
4. **Substitute {GOOGLE_FORM_URL}** — once the form URL exists, replace both occurrences in `docs/outreach-template.md` (currently `grep -c '{GOOGLE_FORM_URL}' docs/outreach-template.md` returns `2`).
5. **TikTok handle audit** — verify all 11 handles still resolve to active accounts.
6. **Production directory deploy check** — visit https://barterkin.com/directory on a signed-in session; confirm no errors (empty state is OK — we're verifying the deployment, not the data).

An autonomous executor has no TikTok session, no Resend dashboard credentials, no Google account, no way to open the production site as a signed-in user, and no way to confirm that email delivery to hello@barterkin.com actually works. This is the exact scenario the `autonomous: false` frontmatter + `checkpoint:human-verify` task type signal — the orchestrator hands off to the user.

## What's Ready Upstream (Green-Light Infrastructure)

Every downstream artifact Task 3's seed run depends on is already shipped:

| Artifact | Plan | Status |
|----------|------|--------|
| `docs/outreach-template.md` (base template + 11 personalization hooks + Section 6 tracking table) | 07-01 | Committed (aa8b408). `{GOOGLE_FORM_URL}` placeholder still present in 2 locations — intentional until Task 1 completes. |
| `scripts/seed-founding-members.mjs` (idempotent, CUTOFF_DATE=2026-06-01, validateMember, welcome-email non-blocking) | 07-02 | Committed (4dfed86). Smoke-tested with empty `members[]` per 07-02 handoff notes. 275 lines. |
| `components/profile/FoundingMemberBadge.tsx` + DirectoryCard/ProfileCard wiring + founding_member field in DirectoryProfile | 07-03 | Committed (0e24a51, 9533463, ff54588). `pnpm typecheck` + `pnpm build` clean. |
| Env-gated vitest + Playwright test suites (SEED-03 happy-path/idempotency, SEED-04 badge on /directory + /m/[username]) | 07-01/02/03 | Committed. Skipped in worktree without secrets; run clean against live Supabase. |

Ashley does NOT need to touch any code before running Task 1. The only edits required are:
- Task 1 Step 4: replace `{GOOGLE_FORM_URL}` with actual form URL in `docs/outreach-template.md` (1 edit, 2 occurrences)
- Task 2: fill Section 6 tracking table columns "DM sent date" + later "Response received?" / "Consent Y/N" (11 rows)
- Task 3: paste consented respondents into `members[]` at `scripts/seed-founding-members.mjs` lines 46-60

## Checkpoint State (Task 1 — `checkpoint:human-verify`, gate=blocking)

**Type:** human-verify (Ashley verifies 6 external preconditions, replies "approved" or names blocking issue).

**What Ashley needs to do** (reproduced from Plan 04 Task 1 action block for the orchestrator's user-facing message):

### Preconditions to verify before DMing anyone

1. **Test hello@barterkin.com inbox** — Send a test email to hello@barterkin.com from any other address (gmail, etc.). Confirm it arrives in Ashley's monitored inbox within 5 minutes. This verifies Assumption A1 from 07-RESEARCH.md — no black hole for member email replies.

2. **Confirm Resend verified sender** — Log into Resend dashboard → Domains. Confirm `barterkin.com` is verified AND that `hello@barterkin.com` is listed as a valid sender. If only `noreply@` is verified, either add `hello@` now OR adjust the seed script's `from` to `"Barterkin <noreply@barterkin.com>"` (Ashley's choice, flag in continuation message).

3. **Create the Google Form** — Open https://forms.google.com. Build a form titled "Barterkin — Founding Member Consent" with all 8 fields from `docs/outreach-template.md` Section 4:
   - Consent to migrate listing: Y/N (REQUIRED, radio)
   - Display name / updates: short-text
   - Bio / description: long-text (max 500 chars)
   - Skills offered: up to 5 short-text fields
   - Skills wanted: up to 5 short-text fields (optional)
   - County: dropdown of 159 Georgia counties (REQUIRED)
   - Preferred email: email (REQUIRED)
   - TikTok handle: short-text

   Also look up the TikTok field's `entry.XXXXXXX` numeric ID (Form editor → three-dot menu → "Get pre-filled link" → fill TikTok field → copy URL → extract the `entry.XXXXXXX` value). Submit one test response to confirm the linked Google Sheet captures it.

4. **Substitute the placeholder** — Open `docs/outreach-template.md`, find the two `{GOOGLE_FORM_URL}` occurrences, replace with the actual form URL (e.g., `https://forms.gle/ABC123XYZ`). Commit the edit. The automated verify `grep -c '{GOOGLE_FORM_URL}' docs/outreach-template.md` must return `0` after this step.

5. **Audit TikTok handles** — Open TikTok and confirm each of the 11 handles resolves to an active, non-deleted account: @ggs_goodies, @kerryscountrylife, @llaaddyybugg, @tamathacal, @feyoug, @ashley, @lovelylocs, @kellymystic119, @yellow_butterfly_farm, @sir_arts, @donnamarie. If any handle is dead, mark in tracking table as "handle inactive — could not reach" and proceed with the rest.

6. **Spot-check production deploy** — Open https://barterkin.com/directory on a signed-in session. Directory page loads without error. Empty state acceptable at this checkpoint (we're verifying deploy, not data).

Reply **"approved"** to proceed to Task 2. Reply with specific issue to block (e.g., "Resend hasn't finished domain verification — DNS propagation pending" or "TikTok handle @ashley is taken by someone else, need to find correct handle").

## Plan Progression Map (For Continuation Executor)

| Task | Type | Gate | Status | What resumes when Ashley approves |
|------|------|------|--------|------------------------------------|
| 1 | checkpoint:human-verify | blocking | **PENDING — awaiting approval** | Continuation executor checks `grep -c '{GOOGLE_FORM_URL}' docs/outreach-template.md` returns 0, acknowledges approval in commit, then releases Task 2 to Ashley. |
| 2 | checkpoint:human-verify | blocking | Not started (depends on Task 1) | After Ashley DMs all 11 (Kerry first) and updates tracking table Section 6, continuation executor verifies `grep -c 'DM sent' docs/outreach-template.md` reflects ≥10 filled rows, commits with "docs(07-04): outreach DMs sent", releases Task 3. |
| 3 | auto | — | Not started (depends on Task 2) | Continuation executor reads Google Sheet responses with Ashley, reads `lib/data/categories.ts` + `lib/data/georgia-counties.json` for real IDs, edits `scripts/seed-founding-members.mjs` members[] with consent=Y rows, runs `node --env-file=.env.local scripts/seed-founding-members.mjs`, captures stdout to `.planning/phases/07-pre-launch-seeding/07-04-seed-run-{timestamp}.log`. |
| 4 | checkpoint:human-verify | blocking | Not started (depends on Task 3) | Ashley runs SEED-05 SQL against production, replies with result. If GATE PASSED (total≥30 AND counties≥2 AND categories≥3), plan completes. Otherwise Kerry amplification loop (D-11): Kerry DMs her 1,400 followers → new consent responses → append to members[] → re-run → re-SQL → repeat until gate passes. |

## No Deviations Yet

No Rule 1/2/3 auto-fixes applied. No Rule 4 architectural questions. The plan is paused exactly where the `<task type="checkpoint:human-verify" gate="blocking">` spec says to pause, with zero deviations from the plan's opening state.

## Auth Gates Encountered

**Task 1 is effectively an auth-gate bundle** — Ashley must be authenticated as herself on four external services:

| Gate | Service | Credentials held by | Verification |
|------|---------|---------------------|--------------|
| Resend dashboard | Resend.com | Ashley (Barterkin Google SSO) | Check dashboard shows barterkin.com verified |
| hello@barterkin.com inbox | Domain registrar mail routing | Ashley | Send + receive test email |
| Google Forms editor | Google account (barterkin101@gmail.com per memory context) | Ashley | Form exists + captures test response |
| TikTok | Ashley's personal TikTok account | Ashley | All 11 handles still resolve |

Per the executor guide's `<authentication_gates>` protocol, these are gates not failures — documented here so the continuation executor can continue the normal flow once Ashley clears them.

## PII / Privacy Posture (Pre-Mitigation Notes for Future Tasks)

Threat T-07-04-04 (PII in public repo) applies to Task 3 when `members[]` is populated with real emails. Ashley must resolve one of the three options before committing Task 3's edit:

- (a) Confirm the repo is private pre-launch (check `gh repo view --json visibility` or GitHub settings — current repo visibility is not verified by this executor; noted for the continuation executor to check before committing members[]).
- (b) Keep a private records file for emails and commit a sanitized members[] that references the private file.
- (c) Confirm public exposure is acceptable because founders have opted in via consent form (the form's description already declares this — members who submit Y have consented to migration, but have not explicitly consented to email-in-public-repo).

Plan 04 Task 3 action block says "Task 3 action block flags this decision explicitly for Ashley to resolve before committing." The continuation executor must surface this choice, not decide silently.

## Resend Quota Baseline (For Future Task 4 Amplification Loop)

Per Pitfall 5 in 07-RESEARCH.md and threat T-07-04-06: Resend free tier is 100 emails/day, 3,000/month. Each seed-script run sends one welcome email per new member. If Ashley amplifies via Kerry (D-11) and >50 consent responses arrive in one batch, Task 4's action block says to split re-runs into batches of 50/day. This is instrumented in the script itself — failed welcome sends increment `emailFailed` in the summary; profile creation succeeds regardless.

Baseline at plan start: assumed 0 sends on Resend today. The continuation executor should check the Resend dashboard during Task 4 re-verification if emailFailed > 0.

## Self-Check: PASSED

- FOUND: `.planning/phases/07-pre-launch-seeding/07-04-SUMMARY.md` (this file — checkpoint state record)
- FOUND: `docs/outreach-template.md` with `grep -c '{GOOGLE_FORM_URL}'` returning `2` (placeholder intact as expected pre-Task-1)
- FOUND: `scripts/seed-founding-members.mjs` (275 lines, shipped in Plan 02) with empty `members[]` awaiting Task 3
- FOUND: `components/profile/FoundingMemberBadge.tsx` + integration (Plan 03) — downstream UI ready to render the badge once founders are seeded
- No commits made at Task level (no task has completed). This SUMMARY commit (see below) is the single Plan 04 commit to date.
- No tasks skipped or reordered. Task 1 `checkpoint:human-verify, gate=blocking` is pending approval exactly as the plan specifies.
- No SUMMARY claim about seeded members, SQL results, or tracking table status — all marked PENDING because nothing downstream has executed.

## Handoff to Continuation Executor

When Ashley replies "approved" to Task 1:

1. Verify `grep -c '{GOOGLE_FORM_URL}' docs/outreach-template.md` returns `0` (placeholder substituted).
2. Verify the replacement contains a `forms.gle` or `forms.google.com` URL: `grep -cE 'forms\.gle|forms\.google\.com' docs/outreach-template.md` ≥ 1.
3. Check this SUMMARY's "Plan Progression Map" table — the Task column shows what each downstream checkpoint needs.
4. When Task 3 runs, the members[] PII commit must resolve T-07-04-04 per the three-option check above.
5. When the plan completes (Task 4 GATE PASSED), replace this SUMMARY wholesale with the execution record. The frontmatter `completed` field should become a date; `tasks_completed` should become 4.

End of checkpoint-state SUMMARY. Awaiting Ashley's approval on Task 1.
