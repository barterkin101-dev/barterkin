// STUB — FILLED IN: Plan 04 (block server action) + Plan 05 (UI wiring)
import { test } from '@playwright/test'

const hasEnv =
  !!process.env.NEXT_PUBLIC_SUPABASE_URL && !!process.env.SUPABASE_SERVICE_ROLE_KEY

// TRUST-02 — block hides member from directory and blocks contact relay
test.describe('TRUST-02 block member flow', () => {
  test.skip('blocked member disappears from directory for blocker', async ({ page: _page }) => {
    test.skip(!hasEnv, 'requires Supabase env')
    // FILLED IN: Plan 04 + Plan 05 — create pair, blocker visits /m/blocked, clicks Block,
    // navigate to /directory, assert blocked user not in results for blocker
  })

  test.skip('blocked member can still be seen by other non-blocking users', async ({ page: _page }) => {
    test.skip(!hasEnv, 'requires Supabase env')
    // FILLED IN: Plan 04 + Plan 05 — third user visits /directory, assert blocked profile still visible
  })

  test.skip('blocks relay: contact attempt after block returns sender_blocked', async ({ page: _page }) => {
    test.skip(!hasEnv, 'requires Supabase env')
    // FILLED IN: Plan 04 + Plan 05 — blocked user attempts to contact blocker via relay,
    // assert error with code "sender_blocked"
  })

  test.skip('block is directional: blocked user can still see blocker in directory', async ({ page: _page }) => {
    test.skip(!hasEnv, 'requires Supabase env')
    // FILLED IN: Plan 04 + Plan 05 — blocked user visits /directory, blocker profile visible
    // (only blocker's view suppresses blocked; blocked user's view is unaffected)
  })
})
