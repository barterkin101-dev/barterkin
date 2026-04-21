// STUB — FILLED IN: Plan 05 (UI wiring) + Plan 03 (Edge Function)
import { test } from '@playwright/test'

const hasEnv =
  !!process.env.NEXT_PUBLIC_SUPABASE_URL && !!process.env.SUPABASE_SERVICE_ROLE_KEY

// CONT-01, CONT-04 — contact sheet opens on profile page + inserts row
test.describe('CONT-01 contact sheet', () => {
  test.skip('opens sheet on profile page', async ({ page: _page }) => {
    test.skip(!hasEnv, 'requires Supabase env')
    // FILLED IN: Plan 05 — create verified pair via createVerifiedPair(),
    // navigate to /m/[recipient], click Contact button, assert Sheet visible
  })

  test.skip('hidden when not accepting', async ({ page: _page }) => {
    test.skip(!hasEnv, 'requires Supabase env')
    // FILLED IN: Plan 05 — set accepting_contact=false via setAcceptingContact(),
    // navigate to profile, verify no Contact button
  })

  test.skip('inserts row', async ({ page: _page }) => {
    test.skip(!hasEnv, 'requires Supabase env')
    // FILLED IN: Plan 05 — submit Sheet form with valid message,
    // assert contact_requests row via countContactRequests({ recipientId })
  })

  test.skip('shows validation error for message under 20 chars', async ({ page: _page }) => {
    test.skip(!hasEnv, 'requires Supabase env')
    // FILLED IN: Plan 05 — type 10-char message, submit, assert inline error with "at least 20"
  })

  test.skip('shows validation error for message over 500 chars', async ({ page: _page }) => {
    test.skip(!hasEnv, 'requires Supabase env')
    // FILLED IN: Plan 05 — type 501-char message, submit, assert inline error with "500"
  })
})
