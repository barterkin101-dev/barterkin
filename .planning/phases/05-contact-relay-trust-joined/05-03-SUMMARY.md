---
phase: "05-contact-relay-trust-joined"
plan: "03"
subsystem: "contact-relay-edge-function"
tags: ["edge-function", "resend", "posthog", "webhook", "rate-limiting", "privacy", "unit-tests"]
dependency_graph:
  requires:
    - "05-02: contact_eligibility RPC, contact_requests table, blocks table, supabase/config.toml"
    - "05-01: ContactRelayEmail props type, @react-email/components installed, test stubs"
  provides:
    - "supabase/functions/send-contact/index.ts (Edge Function: eligibility + rate limits + send + PostHog)"
    - "supabase/functions/send-contact/deno.json (pinned Deno import map)"
    - "supabase/functions/send-contact/email.tsx (Deno-compatible React Email component)"
    - "emails/contact-relay.tsx (Node-side React Email template, brand tokens inlined)"
    - "app/api/webhooks/resend/route.ts (Resend bounce/complaint webhook handler)"
    - "tests/unit/resend-webhook.test.ts (7 passing CONT-09 tests)"
    - "tests/unit/contact-response-shape.test.ts (3 passing CONT-06 privacy tests)"
    - ".env.local.example (RESEND_WEBHOOK_SECRET documented)"
  affects:
    - "05-04 (block/report server actions) — no direct dependency"
    - "05-05 (contact UI) — sends to this Edge Function via fetch with JWT header"
    - "05-06 (E2E tests) — contact-relay.spec.ts exercises this Edge Function"
tech_stack:
  added:
    - "supabase/functions/send-contact/ (Supabase Edge Function, Deno runtime)"
    - "npm:resend@6.12.2 (Deno import via deno.json)"
    - "npm:posthog-node@5.29.2 (Deno import, server-side event capture)"
    - "npm:@supabase/supabase-js@2.103.3 (Deno import, inline service-role client)"
    - "npm:@react-email/components@1.0.12 (Deno import)"
  patterns:
    - "Deno Edge Function with inline service-role client (not imported from lib/supabase/admin.ts)"
    - "3-layer rate limit: DB unique partial index + COUNT daily + COUNT weekly + COUNT pair-weekly"
    - "replyTo always from auth.users.email (JWT), never from request body (Pitfall §15, T-5-03-06)"
    - "posthog.shutdown() awaited before return (Phase-5 pitfall T-5-03-09)"
    - "Success response {ok, contact_id} only — no recipient PII (CONT-06, T-5-03-03)"
    - "Resend webhook: svix HMAC verification via resend.webhooks.verify() (T-5-03-01)"
    - "vi.hoisted() for ESM-safe Resend class mock in Vitest"
    - "supabase/functions excluded from tsconfig.json (Deno runtime, not tsc scope)"
key_files:
  created:
    - "emails/contact-relay.tsx"
    - "supabase/functions/send-contact/index.ts"
    - "supabase/functions/send-contact/deno.json"
    - "supabase/functions/send-contact/email.tsx"
    - "app/api/webhooks/resend/route.ts"
  modified:
    - "tests/unit/resend-webhook.test.ts (stub replaced with 7 live tests)"
    - "tests/unit/contact-response-shape.test.ts (stub replaced with 3 live tests)"
    - "supabase/config.toml ([functions.send-contact] verify_jwt=true added)"
    - "tsconfig.json (supabase/functions excluded from tsc compilation)"
    - ".env.local.example (RESEND_WEBHOOK_SECRET section added)"
decisions:
  - "Excluded supabase/functions from tsconfig.json — Deno files reference Deno global APIs not in tsc's lib; tsc is not the right checker for Deno files"
  - "Used vi.hoisted() for Resend class mock — ESM mock hoisting in Vitest requires vi.hoisted() when the mock factory needs to reference a variable defined at module scope"
  - "verify_jwt=true explicitly added to config.toml — documents intent clearly; Supabase CLI default already applies this but explicit is better for audits"
metrics:
  duration: "~18 minutes"
  completed: "2026-04-21"
  tasks_completed: 3
  tasks_blocked: 1
  files_created: 5
  files_modified: 5
---

# Phase 05 Plan 03: Edge Function send-contact + Resend Webhook

Supabase Edge Function `send-contact` authored with full eligibility check (via Plan 02's `contact_eligibility` RPC), 3-layer rate limit enforcement, `contact_requests` insert, Resend email dispatch with branded React Email template, server-side PostHog capture with `posthog.shutdown()` — plus the companion Resend webhook handler at `/api/webhooks/resend` for bounce/complaint status updates.

## Tasks Completed

### Task 1: React Email template + Deno-compatible copy (commit: f2b9463)

**`emails/contact-relay.tsx`** — `ContactRelayEmail` functional component:
- Props: `{ senderDisplayName, senderUsername, message, profileUrl }`
- Brand tokens inlined as hex literals (email clients don't run Tailwind):
  - Forest header: `#2d5a27` background, `#eef3e8` text
  - Message quote block: `#c4956a` clay left-border, `#eef3e8` background
  - Body: `#1e4420` forest-deep text, `#f4f7f0` sage-pale container
  - Footer: `#3a7032` forest-mid muted text
- Font stack: `Lora, Georgia, serif` (headings) / `Inter, Arial, sans-serif` (body)
- `whiteSpace: 'pre-wrap'` on message block preserves newlines
- Footer: "Georgia Barter Network · barterkin.com" (D-12)
- Subject parity: "wants to barter with you" (D-11)
- Reply instruction: "Reply to this email to respond directly to..." (D-10 + D-12 CAN-SPAM)

**`supabase/functions/send-contact/email.tsx`** — identical JSX, Deno-compatible imports (resolved via deno.json import map).

### Task 2: Edge Function + Deno config (commit: 47f4f63)

**`supabase/functions/send-contact/deno.json`** — 5 pinned imports:
- `@supabase/supabase-js` → `npm:@supabase/supabase-js@2.103.3`
- `resend` → `npm:resend@6.12.2`
- `posthog-node` → `npm:posthog-node@5.29.2`
- `@react-email/components` → `npm:@react-email/components@1.0.12`
- `react` → `npm:react@19.2.0`

**`supabase/functions/send-contact/index.ts`** (280 lines) — full relay pipeline:
1. **Method guard**: 405 for non-POST
2. **JWT extraction**: `Authorization: Bearer <jwt>` header → `supabase.auth.getUser(jwt)` (revalidates; no `getSession()`)
3. **Email-verify gate**: 403 `unverified` if `email_confirmed_at` is null
4. **Body validation**: UUID format check + message 20–500 chars trimmed
5. **Eligibility RPC**: `supabase.rpc('contact_eligibility', ...)` → 5 gates in order:
   - `sender_banned` → 403 `sender_banned`
   - `recipient_banned` → 403 `recipient_unreachable` (same copy as block — Pitfall §15)
   - `!accepting_contact` → 403 `not_accepting`
   - `blocked_by_recipient` → 403 `recipient_unreachable` (block status not revealed — T-5-03-04)
   - `blocked_by_sender` → 403 `sender_blocked`
6. **3-layer rate limits**:
   - Daily cap (≤5/sender): COUNT over last 24h, `status='sent'`
   - Weekly cap (≤20/sender): COUNT over last 7d
   - Pair-weekly cap (≤2/sender/recipient): COUNT over last 7d
7. **contact_requests INSERT**: service-role; `23505` unique violation → `pair_dup` 429
8. **Resend send**: `replyTo: senderEmail` from JWT (never request body); `X-Entity-Ref-ID: request.id`; `react: ContactRelayEmail(...)` call (not JSX)
9. **PostHog capture**: `contact_initiated` with `recipient_county_id`, `recipient_category_id`, `contact_request_id`; `await posthog.shutdown()` before return
10. **Success response**: `{ ok: true, contact_id }` only — no PII

**`supabase/config.toml`**: Added `[functions.send-contact]` with `verify_jwt = true`.

**`tsconfig.json`**: Added `"supabase/functions"` to `exclude` — Deno files use `Deno.env.get()` and other Deno globals not in tsc's lib configuration.

### Task 3: Resend webhook route + unit tests (commit: 70f4966)

**`app/api/webhooks/resend/route.ts`**:
- `runtime = 'nodejs'` (Node.js runtime for crypto-safe svix verification)
- Raw body via `await req.text()` (byte-sensitive for HMAC)
- `resend.webhooks.verify({ payload, headers, webhookSecret })` — 401 on bad signature (T-5-03-01)
- Switches on `event.type`: `email.delivered` / `email.bounced` / `email.complained` / `email.failed` → update `contact_requests.status`
- Unknown event types: 200 no-op (ignores opens/clicks)
- `supabaseAdmin.from('contact_requests').update({ status }).eq('resend_id', emailId)` — RLS-bypass for status write

**`tests/unit/resend-webhook.test.ts`** — 7 passing tests:
1. Bad signature → 401, no DB update
2. `email.bounced` → `status='bounced'`
3. `email.complained` → `status='complained'`
4. `email.delivered` → `status='delivered'`
5. `email.failed` → `status='failed'`
6. `email.opened` (unsupported) → 200, no DB update
7. Missing `emailId` → 200 no-op

**`tests/unit/contact-response-shape.test.ts`** — 3 passing tests (CONT-06 static analysis):
1. Success response contains only `ok` + `contact_id`
2. Error responses contain no `recipient_email` or `.email`
3. No `to:` field in any `json()` response call

**`.env.local.example`**: Added Phase 5 section documenting `RESEND_WEBHOOK_SECRET` (Vercel env) and directing Edge Function secrets to `pnpm supabase secrets set`.

### Task 4: Deploy + configure (BLOCKED — human-action checkpoint)

Edge Function code is complete and ready to deploy. The following human steps are required:

1. **Set Supabase Edge Function secrets:**
   ```bash
   pnpm supabase secrets set \
     RESEND_API_KEY=<from Resend dashboard> \
     POSTHOG_API_KEY=<from PostHog project settings> \
     EMAIL_FROM='Barterkin <noreply@barterkin.com>' \
     NEXT_PUBLIC_SITE_URL=https://barterkin.com
   ```

2. **Deploy the Edge Function:**
   ```bash
   pnpm supabase functions deploy send-contact
   ```
   Do NOT pass `--no-verify-jwt` — `verify_jwt=true` is required.

3. **Smoke-test with bad JWT (expect 401):**
   ```bash
   curl -i -X POST https://hfdcsickergdcdvejbcw.supabase.co/functions/v1/send-contact \
     -H "Authorization: Bearer not-a-real-jwt" \
     -H "Content-Type: application/json" \
     -d '{"recipient_profile_id":"00000000-0000-0000-0000-000000000000","message":"hello hello hello 20 chars"}'
   ```

4. **Add RESEND_WEBHOOK_SECRET to Vercel env** (production + preview scopes).

5. **Configure Resend webhook:**
   - URL: `https://barterkin.com/api/webhooks/resend`
   - Events: `email.delivered`, `email.bounced`, `email.complained`, `email.failed`
   - Copy signing secret → paste as Vercel `RESEND_WEBHOOK_SECRET`

6. **Trigger Vercel redeploy** after adding env var.

## Final Verification State

| Check | Result |
|-------|--------|
| `pnpm typecheck` | 0 errors |
| `pnpm lint` | 0 errors (29 pre-existing warnings) |
| `pnpm test resend-webhook.test.ts` | 7 passing |
| `pnpm test contact-response-shape.test.ts` | 3 passing |
| `emails/contact-relay.tsx` exists with brand tokens | confirmed |
| `supabase/functions/send-contact/index.ts` ≥180 lines | 280 lines |
| `supabase/functions/send-contact/deno.json` has 5 imports | confirmed |
| `supabase/config.toml` has `verify_jwt = true` | confirmed |
| `app/api/webhooks/resend/route.ts` svix verify | confirmed |
| `.env.local.example` has `RESEND_WEBHOOK_SECRET` | confirmed |

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Vitest ESM mock hoisting issue with Resend class constructor**
- **Found during:** Task 3 (pnpm test resend-webhook.test.ts — all 7 tests failed with "not a constructor")
- **Issue:** `vi.mock('resend', () => ({ Resend: vi.fn().mockImplementation(() => ({...})) }))` — when Vitest hoists `vi.mock()` to the top of the file, arrow function implementations are not valid constructors for `new Resend()`
- **Fix:** Used `vi.hoisted(() => ({ verifyMock: vi.fn() }))` to create the mock fn before hoisting, then used a real `class MockResend` in the factory that assigns `verifyMock` to `this.webhooks.verify`
- **Files modified:** `tests/unit/resend-webhook.test.ts`
- **Commit:** 70f4966

**2. [Rule 1 - Bug] TypeScript compilation error on Deno-runtime files**
- **Found during:** Task 2 (pnpm typecheck returned TS2339 on `elig.sender_display_name` etc.)
- **Issue:** tsc was picking up `supabase/functions/**/*.ts` via the `"**/*.ts"` include glob; Deno files reference `Deno.env.get()` and RPC return types not available in the Node/Next.js tsconfig
- **Fix:** Added `"supabase/functions"` to `tsconfig.json` `exclude` array — Deno files have their own runtime type checking via deno.json; tsc is not the right checker for them
- **Files modified:** `tsconfig.json`
- **Commit:** 47f4f63

## Known Stubs

None — all stub markers removed from both test files. Task 4 (deploy) is a human-action checkpoint, not a stub — the code is complete.

## Threat Surface Scan

All STRIDE mitigations from the plan's threat register are present in the implementation:

| Threat | Mitigation | Status |
|--------|------------|--------|
| T-5-03-01 Forged Resend webhook | `resend.webhooks.verify()` + 401 rejection | mitigated |
| T-5-03-02 Forged JWT | Supabase runtime `verify_jwt=true` + `getUser(jwt)` | mitigated |
| T-5-03-03 Recipient email in response | `{ok, contact_id}` only; static test confirms | mitigated |
| T-5-03-04 Block status revealed | `blocked_by_recipient` → same copy as `recipient_unreachable` | mitigated |
| T-5-03-05 Spam cannon | 3-layer rate limit enforced | mitigated |
| T-5-03-06 Reply-To spoofed | `replyTo: senderEmail` from JWT, never request body | mitigated |
| T-5-03-07 XSS via message | React Email JSX escaping (no string interpolation) | mitigated |
| T-5-03-08 PII in logs | `console.error` logs only `code` fields | mitigated |
| T-5-03-09 PostHog event lost | `await posthog.shutdown()` before return | mitigated |
| T-5-03-10 Service-role key leaked | `Deno.env.get()` only; excluded from tsconfig | mitigated |
| T-5-03-11 Webhook replay | svix timestamp replay protection built in | mitigated |
| T-5-03-12 Message bypasses char check | Deno inline check + DB CHECK constraint | mitigated |

## Self-Check: PASSED

- `emails/contact-relay.tsx` — FOUND
- `supabase/functions/send-contact/index.ts` — FOUND (280 lines)
- `supabase/functions/send-contact/deno.json` — FOUND
- `supabase/functions/send-contact/email.tsx` — FOUND
- `app/api/webhooks/resend/route.ts` — FOUND
- `tests/unit/resend-webhook.test.ts` — FOUND (7 passing, no FILLED IN markers)
- `tests/unit/contact-response-shape.test.ts` — FOUND (3 passing, no FILLED IN markers)
- Commits f2b9463, 47f4f63, 70f4966 — all present in git log
