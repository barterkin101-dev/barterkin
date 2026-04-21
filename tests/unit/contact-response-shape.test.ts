// STUB — FILLED IN: Plan 03 (Edge Function response contract + send-contact handler)
import { describe, it } from 'vitest'

const URL = process.env.NEXT_PUBLIC_SUPABASE_URL
const ANON = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY
const SERVICE = process.env.SUPABASE_SERVICE_ROLE_KEY
const hasAll = Boolean(URL && ANON && SERVICE)
const d = hasAll ? describe : describe.skip

// CONT-06 — privacy invariant: recipient email NEVER appears in Edge Function response shape.
// The send-contact Edge Function returns { id, status } from Resend — never { to, email, recipient_email }.
// This test mocks the Edge Function response and asserts no email field is present.
d('CONT-06 Edge Function response privacy invariant', () => {
  it.skip('response does not contain recipient email address', () => {
    // FILLED IN: Plan 03 — import sendContactHandler, mock Resend + Supabase,
    // call handler with valid payload, assert response body has no 'email', 'to', or 'recipient_email' key
  })

  it.skip('response shape is { ok: true, contactId: string } on success', () => {
    // FILLED IN: Plan 03 — verify the exact success response shape from send-contact
  })

  it.skip('error response includes code but not email details', () => {
    // FILLED IN: Plan 03 — verify error responses include code (e.g. daily_cap) but no PII
  })
})
