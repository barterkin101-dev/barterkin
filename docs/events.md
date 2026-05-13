# Analytics Events

> **Last updated:** 2026-05-11  
> **Project:** PostHog project id `387571` (US host: `https://us.i.posthog.com`)

PostHog is the source of truth for product metrics on Barterkin. Events fired in this file MUST match the schema documented here — any drift between code and this doc is a bug.

**Firing pattern:** Server-side via `posthog-node` from server actions, client-side via `posthog-js` from client components. All events are non-blocking (wrapped in try/catch) and never throw.

**Related docs:** `docs/API.md` (API routes + server actions), `docs/infrastructure.md` (logging, rate limiting, health checks)

---

## Implemented Events

### `signup_started`

**When fired:** After a magic link OTP email is successfully queued (Supabase returns success).
**Fires from:** `lib/actions/auth.ts` → `sendMagicLink()`
**Properties:** None (PostHog auto-includes `$host`, `$lib`, `distinct_id`).

---

### `signup_completed`

**When fired:**
- Non-OTP path: after successful user creation in `signUpAction()`
- OTP path: after email confirmation succeeds in `app/auth/confirm/route.ts`
**Fires from:** `lib/actions/auth.ts` + `app/auth/confirm/route.ts`
**Side effects:** `aliasUser()` called to link anonymous ID to user ID.

---

### `profile_published`

**When fired:** After a user successfully publishes their profile (`is_published = true`).
**Fires from:** `lib/actions/profile.ts` → `publishProfileAction()`
**Side effects:** `setPersonProperties()` called to enrich user profile with `username`, `county`, `category`.

---

### `directory_filter_applied`

**When fired:** When a user changes directory filters (debounced 500ms).
**Fires from:** `components/directory/DirectoryFilters.tsx`
**Properties:**

| Property | Type | Description |
|----------|------|-------------|
| `category` | string \| null | Selected category slug |
| `county` | string \| null | Selected county FIPS code |

---

### `contact_reported`

**When fired:** After a member report is successfully submitted.
**Fires from:** `lib/actions/contact.ts` → `reportMemberAction()`
**Properties:**

| Property | Type | Description |
|----------|------|-------------|
| `reason` | string | Report reason (`spam`, `harassment`, `scam`, `inappropriate`, `other`) |

---

### `contact_blocked`

**When fired:** After a member is successfully blocked.
**Fires from:** `lib/actions/contact.ts` → `blockMemberAction()`
**Properties:** None.

---

### `referral_link_used`

**When fired:** After a new user successfully signs up via a referral link (referral record created in `referrals` table).
**Fires from:** `app/auth/callback/route.ts` (OAuth path), `app/auth/confirm/route.ts` (magic link path)
**Properties:**

| Property | Type | Description |
|----------|------|-------------|
| `referral_code` | string | The 8-char referral code used |
| `method` | string | Signup method: `google_oauth` or `magic_link` |

---

### `founding_slot_claimed`

**When fired:** After a user successfully initiates a Stripe Checkout session for the Founding Member tier.
**Fires from:** `lib/actions/billing.ts` → `createCheckoutSession()`
**Properties:**

| Property | Type | Description |
|----------|------|-------------|
| `profile_id` | string | UUID of the claiming profile |
| `slots_remaining_before` | number | How many founding slots were taken before this claim |

---

### `test_event` *(Phase 1 wiring validation)*

**When fired:** Home-page button click in dev/test environments.
**Fires from:** `components/fire-test-event.tsx`
**Purpose:** Validates end-to-end PostHog wiring. Ignored for KPI funnels.

---

## Event Inventory

| Event | Status | Fires From | Phase |
|-------|--------|------------|-------|
| `signup_started` | ✅ Implemented | `lib/actions/auth.ts` | 2 |
| `signup_completed` | ✅ Implemented | `lib/actions/auth.ts`, `app/auth/confirm/route.ts` | 2 |
| `profile_published` | ✅ Implemented | `lib/actions/profile.ts` | 3 |
| `directory_filter_applied` | ✅ Implemented | `components/directory/DirectoryFilters.tsx` | 4 |
| `contact_reported` | ✅ Implemented | `lib/actions/contact.ts` | 5 |
| `contact_blocked` | ✅ Implemented | `lib/actions/contact.ts` | 5 |
| `referral_link_used` | ✅ Implemented | `app/auth/callback/route.ts`, `app/auth/confirm/route.ts` | 6 |
| `founding_slot_claimed` | ✅ Implemented | `lib/actions/billing.ts` | 7 |
| `test_event` | ✅ Implemented | `components/fire-test-event.tsx` | 1 |
| `contact_initiated` | 📋 Schema only | Supabase Edge Function (future) | 5 |

---

## Implementation Notes

- All server-side events use `posthog-node` via `lib/analytics.ts`
- Client-side events use `posthog-js` via `lib/analytics-client.ts`
- Events are **fire-and-forget** — failures are logged but never block user flows
- The `distinct_id` is the Supabase user UUID for authenticated events
- Anonymous events use PostHog's built-in anonymous ID until `identify()` is called
