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
Google OAuth also fires this event client-side when the user launches Google sign-in from the landing-page hero experiment.
**Fires from:** `lib/actions/auth.ts` → `sendMagicLink()`, `components/auth/GoogleButton.tsx`
**Properties:**

| Property | Type | Description |
|----------|------|-------------|
| `method` | string | Signup method: `magic_link` or `google_oauth` |
| `landing_experiment` | string | Present only for landing-page experiment traffic. Currently `landing_hero_copy`. |
| `landing_hero_variant` | string | Present only for landing-page experiment traffic. Variant key assigned on landing. |
| `landing_hero_flag_key` | string | Present only for landing-page experiment traffic. Currently `landing-hero-copy`. |

---

### `signup_completed`

**When fired:**
- Non-OTP path: after successful user creation in `signUpAction()`
- OTP path: after email confirmation succeeds in `app/auth/confirm/route.ts`
**Fires from:** `lib/actions/auth.ts` + `app/auth/confirm/route.ts`
**Side effects:** `aliasUser()` called to link anonymous ID to user ID.
**Properties:**

| Property | Type | Description |
|----
### `onboarding_started`

**When fired:** When an authenticated member loads the onboarding wizard for the first time.
**Fires from:** `app/(onboarding)/onboarding/page.tsx`
**Properties:**

| Property | Type | Description |
|----------|------|-------------|
| `method` | string | `first` for initial start; `return` if they came back after skipping |

---

### `onboarding_completed`

**When fired:** When the onboarding wizard marks completion (Step 3 render triggers `markOnboardingComplete()`).
**Fires from:** `lib/actions/onboarding.ts`
**Properties:** none

---

### `first_listing_viewed`

**When fired:** When a member views any listing detail page for the first time.
**Fires from:** `app/(app)/listings/[id]/page.tsx`
**Properties:**

| Property | Type | Description |
|----------|------|-------------|
| `listing_id` | string | UUID of the listing viewed |

---

### `first_listing_created`

**When fired:** When a member creates their first listing (quest award point).
**Fires from:** `lib/actions/listings.ts`
**Properties:**

| Property | Type | Description |
|----------|------|-------------|
| `listing_id` | string | UUID of the created listing |
| `credits` | number | Credits awarded (from quest_first_listing) |

---

### `first_contact_sent`

**When fired:** When a member sends their first message (quest award point).
**Fires from:** `lib/actions/messaging.ts` (`sendMessage` and `createConversation`)
**Properties:**

| Property | Type | Description |
|----------|------|-------------|
| `conversation_id` | string | UUID of the conversation |
| `credits` | number | Credits awarded (from quest_first_message) |

---

### `first_trade_completed`

**When fired:** When a member completes their first mutual trade (quest award point).
**Fires from:** `lib/actions/trade-completions.ts`
**Properties:**

| Property | Type | Description |
|----------|------|-------------|
| `conversation_id` | string | UUID of the conversation |
| `credits` | number | Credits awarded (from quest_first_trade) |

---
------|------|-------------|
| `method` | string | Signup method: `magic_link` or `google_oauth` |
| `landing_experiment` | string | Present only for landing-page experiment traffic. Currently `landing_hero_copy`. |
| `landing_hero_variant` | string | Present only for landing-page experiment traffic. Variant key assigned on landing. |
| `landing_hero_flag_key` | string | Present only for landing-page experiment traffic. Currently `landing-hero-copy`. |

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

### `referral_invite_copied`

**When fired:** When a member copies either their referral invite link or the prewritten invite message from the dashboard.
**Fires from:** `components/dashboard/ReferralInviteCard.tsx`
**Properties:**

| Property | Type | Description |
|----------|------|-------------|
| `referral_code` | string | The 8-char referral code being shared |
| `referral_count` | number | How many successful referrals the member has at copy time |
| `credits` | number | Current referral credit balance shown in the card |
| `copy_target` | string | What was copied: `link` or `message` |

---

### `referral_invite_shared`

**When fired:** When a member shares their referral link from the dashboard via native share or a channel shortcut, including the zero-listing and first-contact reminder share actions.
**Fires from:** `components/dashboard/ReferralInviteCard.tsx`, `components/dashboard/ZeroListingLaunchReminder.tsx`, `components/dashboard/FirstContactLaunchReminder.tsx`
**Properties:**

| Property | Type | Description |
|----------|------|-------------|
| `method` | string | Share mechanism, currently `native-share`, `x`, `facebook`, `whatsapp`, `telegram`, `linkedin`, `sms`, or `email` |
| `referral_code` | string | The 8-char referral code being shared |
| `referral_count` | number | How many successful referrals the member has at share time |
| `credits` | number | Current referral credit balance shown in the card |
| `share_surface` | string | Which UI initiated the share: `referral_invite_card`, `zero_listing_launch`, or `first_contact_launch` |

---

### `unread_message_reminder_impression`

**When fired:** When the dashboard unread-message reminder renders for a member.
**Fires from:** `components/dashboard/UnreadMessageReminder.tsx`
**Properties:**

| Property | Type | Description |
|----------|------|-------------|
| `stale_tier` | string | Reminder urgency tier, currently `day` or `two-day` |
| `unread_conversation_count` | number | Count of stale unread conversations shown in the reminder |
| `unread_message_count` | number | Total unread messages summed across those stale conversations |

---

### `unread_message_reminder_clicked`

**When fired:** When a member clicks the unread-message reminder reply CTA.
**Fires from:** `components/dashboard/UnreadMessageReminder.tsx`
**Properties:**

| Property | Type | Description |
|----------|------|-------------|
| `stale_tier` | string | Reminder urgency tier, currently `day` or `two-day` |
| `unread_conversation_count` | number | Count of stale unread conversations shown in the reminder |
| `unread_message_count` | number | Total unread messages summed across those stale conversations |

---

### `warm_conversation_reengagement_reminder_impression`

**When fired:** When the warm conversation re-engagement reminder card is rendered on the dashboard.
**Fires from:** `components/dashboard/WarmConversationReengagementReminder.tsx`
**Properties:**

| Property | Type | Description |
|----------|------|-------------|
| `stale_conversation_count` | number | How many conversations have a self-sent last message older than 3 days |

---

### `warm_conversation_reengagement_reminder_clicked`

**When fired:** When a member clicks the "Send a follow-up" CTA on the warm conversation re-engagement reminder card.
**Fires from:** `components/dashboard/WarmConversationReengagementReminder.tsx`
**Properties:**

| Property | Type | Description |
|----------|------|-------------|
| `stale_conversation_count` | number | How many conversations have a self-sent last message older than 3 days |

---

### `referral_converted`

**When fired:** After an invited member publishes their profile and the inviter earns the conversion reward.
**Fires from:** `lib/actions/profile.ts` → `setPublished()`
**Properties:**

| Property | Type | Description |
|----------|------|-------------|
| `referral_id` | string | Referral row that converted |
| `invitee_profile_id` | string | Profile that published and triggered the reward |
| `credits` | number | Credits awarded to the inviter, currently `10` |

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

### `billing_success_viewed`

**When fired:** When the member lands on `/dashboard/billing/success` after Stripe Checkout, including temporary webhook-processing states.
**Fires from:** `app/(app)/dashboard/billing/success/page.tsx`
**Properties:**

| Property | Type | Description |
|----------|------|-------------|
| `expected_tier` | string | Tier requested in the Stripe success redirect: `premium` or `founding` |
| `actual_tier` | string | Tier currently reflected on the profile row when the page renders |
| `status` | string | `active` when the tier is synced, `processing` while waiting on webhook sync |

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

### `landing_hero_variant_viewed`

**When fired:** When the landing hero mounts with a server-assigned experiment variant.
**Fires from:** `components/landing/LandingHeroExposure.tsx`
**Properties:**

| Property | Type | Description |
|----------|------|-------------|
| `landing_experiment` | string | Currently `landing_hero_copy` |
| `landing_hero_variant` | string | Variant key assigned to the session |
| `landing_hero_flag_key` | string | Currently `landing-hero-copy` |

---

### `waitlist_joined`

**When fired:** After a visitor successfully joins the landing-page waitlist.
**Fires from:** `lib/actions/waitlist.ts`
**Properties:**

| Property | Type | Description |
|----------|------|-------------|
| `source` | string | Currently `hero_cta` |
| `county_id` | number \| null | Optional county selected on the waitlist form |
| `landing_experiment` | string | Currently `landing_hero_copy` |
| `landing_hero_variant` | string | Variant key assigned on the landing page |
| `landing_hero_flag_key` | string | Currently `landing-hero-copy` |

---

### `trade_marked_complete`

**When fired:** After a member marks a trade as complete (one-sided).
**Fires from:** `lib/actions/trade-completions.ts` → `markTradeComplete()`
**Properties:**

| Property | Type | Description |
|----------|------|-------------|
| `conversation_id` | string | UUID of the conversation |
| `status` | string | New status: `initiator_marked`, `recipient_marked`, or `completed` |

---

### `trade_mutually_completed`

**When fired:** When the second party marks complete, triggering mutual completion.
**Fires from:** `lib/actions/trade-completions.ts` → `markTradeComplete()`
**Properties:**

| Property | Type | Description |
|----------|------|-------------|
| `conversation_id` | string | UUID of the conversation |

---

### `trade_review_submitted`

**When fired:** After a member submits a review for a mutually completed trade.
**Fires from:** `lib/actions/trade-completions.ts` → `submitTradeReview()`
**Properties:**

| Property | Type | Description |
|----------|------|-------------|
| `conversation_id` | string | UUID of the conversation |
| `ratee_profile_id` | string | UUID of the reviewed member |
| `listing_id` | string \| null | UUID of the related listing, if any |
| `score` | number | Rating score (1–5) |

---

### `trade_completion_rate`

**When fired:** When a trade reaches mutual completion.
**Fires from:** `lib/actions/trade-completions.ts` → `markTradeComplete()`
**Properties:**

| Property | Type | Description |
|----------|------|-------------|
| `conversation_id` | string | UUID of the conversation |
| `listing_id` | string \| null | Listing attached to the conversation, if available |
| `completed` | boolean | Always `true`; used as the completion numerator event |

---

### `trade_completion_celebrated`

**When fired:** When the celebration modal opens after a trade is mutually completed.
**Fires from:** `components/messaging/TradeCompletionCelebration.tsx`
**Properties:**

| Property | Type | Description |
|----------|------|-------------|
| `conversation_id` | string | UUID of the conversation |
| `has_reviewed` | boolean | Whether the user has already submitted a review |

---

### `review_prompt_dismissed`

**When fired:** When the user dismisses the trade completion celebration modal without submitting a review.
**Fires from:** `components/messaging/TradeCompletionCelebration.tsx`
**Properties:**

| Property | Type | Description |
|----------|------|-------------|
| `conversation_id` | string | UUID of the conversation |
| `dismissed_after` | string | Context of dismissal, e.g. `celebration_modal` |

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
| `referral_invite_copied` | ✅ Implemented | `components/dashboard/ReferralInviteCard.tsx` | 7 |
| `referral_invite_shared` | ✅ Implemented | `components/dashboard/ReferralInviteCard.tsx`, `components/dashboard/ZeroListingLaunchReminder.tsx` | 8 |
| `subscription_activated` | ✅ Implemented | `app/api/stripe/webhook/route.ts` | 7 |
| `founding_slot_claimed` | ✅ Implemented | `lib/actions/billing.ts` | 7 |
| `waitlist_founding_notified` | ✅ Implemented | `app/api/cron/notify-waitlist/route.ts` | 7 |
| `listing_boosted` | ✅ Implemented | `lib/actions/listings.ts` | 7 |
| `discover_tab_switched` | ✅ Implemented | `components/dashboard/DiscoverFeedTabs.tsx` | 7 |
| `weekly_digest_sent` | ✅ Implemented | `app/api/cron/weekly-digest/route.ts` | 7 |
| `re_engagement_sent` | ✅ Implemented | `app/api/cron/re-engage/route.ts` | 7 |
| `landing_social_proof_viewed` | ✅ Implemented | `components/landing/RecentActivity.tsx` | 7 |
| `unread_message_reminder_impression` | ✅ Implemented | `components/dashboard/UnreadMessageReminder.tsx` | 7 |
| `unread_message_reminder_clicked` | ✅ Implemented | `components/dashboard/UnreadMessageReminder.tsx` | 7 |
| `trade_marked_complete` | ✅ Implemented | `lib/actions/trade-completions.ts` | 8 |
| `trade_mutually_completed` | ✅ Implemented | `lib/actions/trade-completions.ts` | 8 |
| `trade_review_submitted` | ✅ Implemented | `lib/actions/trade-completions.ts` | 8 |
| `onboarding_started` | ✅ Implemented | `app/(onboarding)/onboarding/page.tsx` | 7 |
| `onboarding_completed` | ✅ Implemented | `lib/actions/onboarding.ts` | 7 |
| `first_listing_viewed` | ✅ Implemented | `app/(app)/listings/[id]/page.tsx` | 7 |
| `first_listing_created` | ✅ Implemented | `lib/actions/listings.ts` | 7 |
| `first_contact_sent` | ✅ Implemented | `lib/actions/messaging.ts` | 7 |
| `first_trade_completed` | ✅ Implemented | `lib/actions/trade-completions.ts` | 7 |
| `trade_completion_rate` | ✅ Implemented | `lib/actions/trade-completions.ts` | 3 |
| `trade_completion_celebrated` | ✅ Implemented | `components/messaging/TradeCompletionCelebration.tsx` | 8 |
| `review_prompt_dismissed` | ✅ Implemented | `components/messaging/TradeCompletionCelebration.tsx` | 8 |
| `listing_revisited_from_dashboard` | ✅ Implemented | `components/dashboard/RecentlyViewedCard.tsx` | 8 |
| `test_event` | ✅ Implemented | `components/fire-test-event.tsx` | 1 |
| `contact_initiated` | 📋 Schema only | Supabase Edge Function (future) | 5 |

---

## Implementation Notes

- All server-side events use `posthog-node` via `lib/analytics.ts`
- Client-side events use `posthog-js` via `lib/analytics-client.ts`
- Events are **fire-and-forget** — failures are logged but never block user flows
- The `distinct_id` is the Supabase user UUID for authenticated events
- Anonymous events use PostHog's built-in anonymous ID until `identify()` is called
