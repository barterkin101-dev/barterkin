// STUB — FILLED IN: Plan 03 (Edge Function COUNT queries) + Plan 05 (UI error display)
import { test } from '@playwright/test'

const hasEnv =
  !!process.env.NEXT_PUBLIC_SUPABASE_URL && !!process.env.SUPABASE_SERVICE_ROLE_KEY

// CONT-07, CONT-08 — rate limiting enforced at 5/day sender cap + 2/week per-recipient cap
test.describe('CONT-07/08 contact rate limits', () => {
  test.skip('daily cap', async ({ page: _page }) => {
    test.skip(!hasEnv, 'requires Supabase env')
    // FILLED IN: Plan 03 + Plan 05 — create sender, seed 5 contact_requests from sender today via admin,
    // attempt to send 6th, assert UI shows "daily cap" error message
  })

  test.skip('per-recipient cap', async ({ page: _page }) => {
    test.skip(!hasEnv, 'requires Supabase env')
    // FILLED IN: Plan 03 + Plan 05 — seed 2 contact_requests sender→recipient this week via admin,
    // attempt 3rd, assert UI shows "per-recipient cap" error message
  })

  test.skip('weekly cap resets after 7 days', async ({ page: _page }) => {
    test.skip(!hasEnv, 'requires Supabase env')
    // FILLED IN: Plan 03 — seed 2 requests with created_at 8 days ago,
    // attempt new contact, assert allowed (weekly cap window expired)
  })
})
