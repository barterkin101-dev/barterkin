// STUB — FILLED IN: Plan 06 (badge fetch in layout + markContactsSeen server action)
import { test } from '@playwright/test'

const hasEnv =
  !!process.env.NEXT_PUBLIC_SUPABASE_URL && !!process.env.SUPABASE_SERVICE_ROLE_KEY

// CONT-10 — unseen-contact badge appears after send; visiting /profile clears badge
test.describe('CONT-10 unseen contact badge', () => {
  test.skip('shows', async ({ page: _page }) => {
    test.skip(!hasEnv, 'requires Supabase env')
    // FILLED IN: Plan 06 — create pair, sender sends contact request,
    // recipient signs in, navigate to any page with nav,
    // assert badge with count "1" visible in nav
  })

  test.skip('clears', async ({ page: _page }) => {
    test.skip(!hasEnv, 'requires Supabase env')
    // FILLED IN: Plan 06 — after badge shows, navigate to /profile page,
    // assert badge disappears (markContactsSeen called, seen_at set)
  })

  test.skip('shows correct count with multiple unseen contacts', async ({ page: _page }) => {
    test.skip(!hasEnv, 'requires Supabase env')
    // FILLED IN: Plan 06 — seed 3 unseen contact_requests, assert badge shows "3"
  })

  test.skip('does not show when all contacts have been seen', async ({ page: _page }) => {
    test.skip(!hasEnv, 'requires Supabase env')
    // FILLED IN: Plan 06 — seed seen contact_requests (seen_at set), assert no badge
  })
})
