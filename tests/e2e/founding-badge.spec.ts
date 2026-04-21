/**
 * SEED-04 — founding-member badge renders on DirectoryCard + ProfileCard.
 *
 * Env-gated: tests run only when NEXT_PUBLIC_SUPABASE_URL and
 * SUPABASE_SERVICE_ROLE_KEY are present (pattern mirrors
 * tests/e2e/landing-founding-strip.spec.ts).
 *
 * Test bodies are stubbed with fixme markers in Wave 0 (Plan 01).
 * Plan 03 implements the badge component + card integrations and fills these in.
 */
import { test, expect } from '@playwright/test'
import {
  createVerifiedUser,
  seedPublishedProfile,
  cleanupUser,
} from './fixtures/directory-seed'

const hasEnv =
  !!process.env.NEXT_PUBLIC_SUPABASE_URL &&
  !!process.env.SUPABASE_SERVICE_ROLE_KEY

test.describe('SEED-04 — founding-member badge', () => {
  test.fixme('directory card renders "Founding member" badge when founding_member=true', async ({ page }) => {
    test.skip(!hasEnv, 'Supabase env vars not set')
    // Plan 03 fills in:
    //   1. seedPublishedProfile({ founding_member: true }) — expect badge visible on /directory card
    //   2. seedPublishedProfile({ founding_member: false }) — expect badge NOT visible on that card
    //   3. cleanup both users in finally
    expect.soft(page.url()).toBeTruthy()
    void createVerifiedUser
    void seedPublishedProfile
    void cleanupUser
  })

  test.fixme('detail page renders "Founding member" badge when founding_member=true', async ({ page }) => {
    test.skip(!hasEnv, 'Supabase env vars not set')
    // Plan 03 fills in:
    //   1. seedPublishedProfile({ founding_member: true }) with known username
    //   2. Visit /m/{username} — expect badge visible inline in header
    //   3. seedPublishedProfile({ founding_member: false }) with known username
    //   4. Visit /m/{otherUsername} — expect badge NOT visible
    //   5. cleanup both users in finally
    expect.soft(page.url()).toBeTruthy()
    void createVerifiedUser
    void seedPublishedProfile
    void cleanupUser
  })
})
