// STUB — FILLED IN: Plan 03 (webhook route handler + svix signature verification)
import { describe, it } from 'vitest'

const URL = process.env.NEXT_PUBLIC_SUPABASE_URL
const ANON = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY
const SERVICE = process.env.SUPABASE_SERVICE_ROLE_KEY
const hasAll = Boolean(URL && ANON && SERVICE)
const d = hasAll ? describe : describe.skip

// CONT-09 — Resend webhook updates contact_requests.status when signed correctly.
// Uses mocked svix signature verification to test the webhook handler logic.
d('CONT-09 Resend webhook handler', () => {
  it.skip('updates contact_requests status to "delivered" on email.delivered event', () => {
    // FILLED IN: Plan 03 — mock svix Webhook.verify(), mock Supabase UPDATE,
    // POST to /api/webhooks/resend with signed payload, assert DB update called with correct status
  })

  it.skip('returns 400 when svix signature is missing', () => {
    // FILLED IN: Plan 03 — POST without svix-id header, assert 400 response
  })

  it.skip('returns 400 when svix signature is invalid', () => {
    // FILLED IN: Plan 03 — POST with tampered signature, assert 400 and no DB update
  })

  it.skip('returns 200 and ignores unknown event types gracefully', () => {
    // FILLED IN: Plan 03 — POST signed payload with unknown event type, assert 200 + no DB write
  })

  it.skip('updates status to "bounced" on email.bounced event', () => {
    // FILLED IN: Plan 03 — test bounce path: assert contact_requests status set to "bounced"
  })
})
