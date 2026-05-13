# Analytics Events

> **Last updated:** 2026-05-11  
> **Project:** PostHog project id `387571` (US host: `https://us.i.posthog.com`)

PostHog is the source of truth for product metrics on Barterkin. Events fired in this file MUST match the schema documented here — any drift between code and this doc is a bug.

**Firing pattern:** Server-side via `posthog-node` from server actions, client-side via `posthog-js` from client components. All events are non-blocking (wrapped in try/catch) and never throw.

**Related docs:** `docs/API.md` (API routes + server actions), `docs/infrastructure.md` (logging, rate limiting, health checks)

**Last updated:** 2026-05-13

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

### `subscription_activated`

**When fired:** After Stripe webhook confirms a successful subscription payment (checkout.session.completed).
**Fires from:** `app/api/stripe/webhook/route.ts` → `handleCheckoutSessionCompleted()`
**Properties:**

| Property | Type | Description |
|----------|------|-------------|
| `tier` | string | Subscription tier: `premium` or `founding` |
| `source` | string | Always `stripe_webhook` |
| `event_type` | string | Stripe event type: `checkout.session.completed` |

---

### `founding_slot_claimed`

**When fired:** After a user successfully initiates a Stripe Checkout session for the Founding Member tier.
**Fires from:** `app/api/stripe/checkout-session/route.ts` → `POST()`
**Properties:**

| Property | Type | Description |
|----------|------|-------------|
| `profile_id` | string | UUID of the claiming profile |
| `slots_remaining_before` | number | How many founding slots were taken before this claim |

---

### `waitlist_founding_notified`

**When fired:** After the cron job successfully emails waitlisters about founding slot availability.
**Fires from:** `app/api/cron/notify-waitlist/route.ts`
**Properties:**

| Property | Type | Description |
|----------|------|-------------|
| `count` | number | How many waitlisters were emailed |
| `slots_remaining` | number | How many founding slots were available at send time |

---

### `listing_boosted`

**When fired:** After a user successfully spends credits to boost a listing.
**Fires from:** `lib/actions/listings.ts` → `boostListing()`
**Properties:**

| Property | Type | Description |
|----------|------|-------------|
| `listing_id` | string | UUID of the boosted listing |
| `cost` | number | Credits spent (default: 1) |
| `duration_days` | number | Boost duration in days (default: 7) |

---

### `discover_tab_switched`

**When fired:** When a user switches between "For You" and "Latest" tabs on the dashboard discover feed. Fires at most once per tab per session (deduplicated client-side).
**Fires from:** `components/dashboard/DiscoverFeedTabs.tsx`
**Properties:**

| Property | Type | Description |
|----------|------|-------------|
| `tab` | string | Tab name: `for-you` or `latest` |
| `for_you_count` | number | Number of listings in the "For You" tab at switch time |
| `latest_count` | number | Number of listings in the "Latest" tab at switch time |

---

### `weekly_digest_sent`

**When fired:** After the weekly digest cron successfully sends one or more digest emails.
**Fires from:** `app/api/cron/weekly-digest/route.ts`
**Properties:**

| Property | Type | Description |
|----------|------|-------------|
| `count` | number | Number of members emailed in the batch |
| `listings_total` | number | Total listings included across sent digests |

---

### `re_engagement_sent`

**When fired:** After the dormant-member re-engagement cron successfully sends one or more emails.
**Fires from:** `app/api/cron/re-engage/route.ts`
**Properties:**

| Property | Type | Description |
|----------|------|-------------|
| `count` | number | Number of dormant members emailed in the batch |
| `listings_total` | number | Total listings included across sent emails |

---

### `landing_social_proof_viewed`

**When fired:** When the RecentActivity section mounts on the landing page.
**Fires from:** `components/landing/RecentActivity.tsx`
**Properties:**

| Property | Type | Description |
|----------|------|-------------|
| `item_count` | number | How many activity items are displayed |
| `has_activity` | boolean | Whether there is any activity in the last 24h |

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
| `subscription_activated` | ✅ Implemented | `app/api/stripe/webhook/route.ts` | 7 |
| `founding_slot_claimed` | ✅ Implemented | `lib/actions/billing.ts` | 7 |
| `waitlist_founding_notified` | ✅ Implemented | `app/api/cron/notify-waitlist/route.ts` | 7 |
| `listing_boosted` | ✅ Implemented | `lib/actions/listings.ts` | 7 |
| `discover_tab_switched` | ✅ Implemented | `components/dashboard/DiscoverFeedTabs.tsx` | 7 |
| `weekly_digest_sent` | ✅ Implemented | `app/api/cron/weekly-digest/route.ts` | 7 |
| `re_engagement_sent` | ✅ Implemented | `app/api/cron/re-engage/route.ts` | 7 |
| `landing_social_proof_viewed` | ✅ Implemented | `components/landing/RecentActivity.tsx` | 7 |
| `test_event` | ✅ Implemented | `components/fire-test-event.tsx` | 1 |
| `contact_initiated` | 📋 Schema only | Supabase Edge Function (future) | 5 |

---

## Implementation Notes

- All server-side events use `posthog-node` via `lib/analytics.ts`
- Client-side events use `posthog-js` via `lib/analytics-client.ts`
- Events are **fire-and-forget** — failures are logged but never block user flows
- The `distinct_id` is the Supabase user UUID for authenticated events
- Anonymous events use PostHog's built-in anonymous ID until `identify()` is called
