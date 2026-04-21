// STUB — FILLED IN: Plan 03 (Edge Function ban check) + Plan 05 (UI)
import { test } from '@playwright/test'

const hasEnv =
  !!process.env.NEXT_PUBLIC_SUPABASE_URL && !!process.env.SUPABASE_SERVICE_ROLE_KEY

// TRUST-03 — profiles.banned=true hides member from directory and rejects relay
test.describe('TRUST-03 ban enforcement', () => {
  test.skip('banned profile hidden from directory', async ({ page: _page }) => {
    test.skip(!hasEnv, 'requires Supabase env')
    // FILLED IN: Plan 05 — create user, seed published profile, set banned=true via setBanned(),
    // browse /directory, assert profile not in results
  })

  test.skip('banned sender relay attempt returns sender_banned', async ({ page: _page }) => {
    test.skip(!hasEnv, 'requires Supabase env')
    // FILLED IN: Plan 03 + Plan 05 — banned user tries to contact recipient via relay,
    // assert Edge Function rejects with code "sender_banned"
  })

  test.skip('unbanning profile makes it reappear in directory', async ({ page: _page }) => {
    test.skip(!hasEnv, 'requires Supabase env')
    // FILLED IN: Plan 05 — set banned=false after ban, browse directory, assert reappears
  })

  test.skip('banned user profile page returns 404 or redirect', async ({ page: _page }) => {
    test.skip(!hasEnv, 'requires Supabase env')
    // FILLED IN: Plan 05 — navigate to /m/[banned-username], assert 404 or redirect to /directory
  })
})
