# Analytics Events

PostHog is the source of truth for product metrics on Barterkin. Events fired in this file MUST match the schema documented here — any drift between code and this doc is a bug.

**Project:** PostHog project id `387571` (US host: `https://us.i.posthog.com`).
**Firing pattern:** server-side via `posthog-node` from the Phase 5 Supabase Edge Function `send-contact`, or client-side via `posthog-js` from client components when user-context is needed.

## KPI event: `contact_initiated`

The KPI of Barterkin v1. Fired from the `send-contact` Supabase Edge Function (Phase 5) after a successful platform-relayed contact send. One event = one successful first-touch relay.

**When fired:** Edge Function validates sender eligibility → inserts `contact_requests` row → calls Resend → on Resend success → fires the event.

**Properties (all anonymised / low-cardinality):**

| Property | Type | Required | Description |
|----------|------|----------|-------------|
| `recipient_county` | string (FIPS) | yes | 5-digit Georgia FIPS county code. No county names. |
| `recipient_category` | string (slug) | yes | One of the 10 seeded Georgia category slugs (Phase 3). |
| `sender_tenure_days` | integer | yes | `floor((now - profiles.created_at) / 1 day)`. |
| `$host`, `$lib` | string | auto | PostHog defaults. |

**Source of truth:** the `public.contact_requests` row inserted by the Edge Function. Event-stream rebuildable from DB if PostHog data is ever lost.

**Phase 1 scope:** declare schema only. No firing from the Next.js app (the Edge Function lands in Phase 5).

## Phase-1-only events

| Event | Purpose | Fires from |
|-------|---------|------------|
| `test_event` | Validates end-to-end wiring for ROADMAP success criterion #5 ("`posthog.capture('test_event', ...)` appears in the PostHog dashboard within 60 seconds"). | `components/fire-test-event.tsx` on home-page button click. Safe to fire anytime; ignored for KPI funnels. |

## Future events (out of scope for Phase 1)

| Event | Phase | Notes |
|-------|-------|-------|
| `signup_started` / `signup_completed` | Phase 2 | Covers AUTH-01, AUTH-02 funnels. |
| `profile_published` | Phase 3 | Covers PROF-12 publish gate. |
| `directory_filter_applied` | Phase 4 | DIR-03..DIR-06. Include filter dimensions but not free-text keyword. |
| `contact_reported` / `contact_blocked` | Phase 5 | TRUST-01, TRUST-02 signals. |
