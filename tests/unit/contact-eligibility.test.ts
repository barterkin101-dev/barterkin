// STUB — FILLED IN: Plan 02 (RPC check_contact_eligibility in migration 005)
import { describe, it } from 'vitest'

const URL = process.env.NEXT_PUBLIC_SUPABASE_URL
const ANON = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY
const SERVICE = process.env.SUPABASE_SERVICE_ROLE_KEY
const hasAll = Boolean(URL && ANON && SERVICE)
const d = hasAll ? describe : describe.skip

// TRUST-07 — Edge Function rejects all 5 ineligibility conditions via RPC test harness.
// Tests the check_contact_eligibility Postgres RPC function added in migration 005.
d('TRUST-07 contact eligibility RPC', () => {
  it.skip('rejects sender who has hit daily cap (5/day)', () => {
    // FILLED IN: Plan 02 — insert 5 contact_requests from sender today, call RPC, assert { eligible: false, code: "daily_cap" }
  })

  it.skip('rejects sender who has hit weekly per-recipient cap (2/week)', () => {
    // FILLED IN: Plan 02 — insert 2 contact_requests sender→recipient this week, call RPC, assert "pair_cap"
  })

  it.skip('rejects duplicate (sender already messaged recipient today)', () => {
    // FILLED IN: Plan 02 — insert 1 contact_request sender→recipient today, call RPC, assert "pair_dup"
  })

  it.skip('rejects sender who is banned', () => {
    // FILLED IN: Plan 02 — set sender profiles.banned=true, call RPC, assert "sender_banned"
  })

  it.skip('rejects when recipient has accepting_contact=false', () => {
    // FILLED IN: Plan 02 — set recipient profiles.accepting_contact=false, call RPC, assert "not_accepting"
  })

  it.skip('returns { eligible: true } for a fresh eligible pair', () => {
    // FILLED IN: Plan 02 — no prior contacts, both active, call RPC, assert eligible: true
  })
})
