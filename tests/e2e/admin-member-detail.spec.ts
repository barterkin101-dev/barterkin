import { test, expect } from '@playwright/test'
import { createVerifiedPair, cleanupPair, setBanned } from './fixtures/contact-helpers'
import type { VerifiedPair } from './fixtures/contact-helpers'

const hasEnv =
  !!process.env.NEXT_PUBLIC_SUPABASE_URL && !!process.env.SUPABASE_SERVICE_ROLE_KEY

test.describe('ADMIN-03 — admin member detail view', () => {
  let pair: VerifiedPair | null = null

  test.beforeAll(async () => {
    test.skip(!hasEnv, 'requires Supabase env')
    pair = await createVerifiedPair('admin-detail')
  })

  test.afterAll(async () => {
    if (pair) {
      await setBanned(pair.recipientId, false).catch(() => undefined)
      await cleanupPair(pair.senderId, pair.recipientId)
    }
  })

  test.fixme('admin sees display_name, avatar, county, category, skills, joined date', async () => {
    // Plan 03: loginAs admin → goto /admin/members/{pair.recipientId} → assert fields visible
    void expect
  })

  test.fixme('admin sees Ban button when profile is not banned', async () => {
    // Plan 04: assert getByRole('button', { name: /Ban this member/i }).isVisible()
  })

  test.fixme('admin sees Unban button when profile is banned', async () => {
    // Plan 04: setBanned(recipientId, true) → reload → assert /Unban this member/i button
  })
})
