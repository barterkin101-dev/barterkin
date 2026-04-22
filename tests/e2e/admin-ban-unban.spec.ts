import { test, expect } from '@playwright/test'
import { createVerifiedPair, cleanupPair, setBanned, adminClient } from './fixtures/contact-helpers'
import type { VerifiedPair } from './fixtures/contact-helpers'

const hasEnv =
  !!process.env.NEXT_PUBLIC_SUPABASE_URL && !!process.env.SUPABASE_SERVICE_ROLE_KEY

test.describe('ADMIN-04 — admin ban/unban UI flow', () => {
  let pair: VerifiedPair | null = null

  test.beforeAll(async () => {
    test.skip(!hasEnv, 'requires Supabase env')
    pair = await createVerifiedPair('admin-ban-ui')
  })

  test.afterAll(async () => {
    if (pair) {
      await setBanned(pair.recipientId, false).catch(() => undefined)
      await cleanupPair(pair.senderId, pair.recipientId)
    }
  })

  test.fixme('admin bans a member via AlertDialog → status flips to Banned + toast shown', async () => {
    // Plan 04: login admin → goto /admin/members/{recipientId} → click Ban → confirm in AlertDialog
    //          → assert sonner toast "{name} has been banned." → assert "Banned" badge visible
    void expect
  })

  test.fixme('admin unbans a member via AlertDialog → status flips to Published/Unpublished', async () => {
    // Plan 04: same setup but pre-banned → click Unban → confirm → assert toast + status change
  })

  test.fixme('banned profile no longer appears in /directory', async () => {
    // Plan 04: after ban, logout admin → login as some other verified user → goto /directory
    //          → assert banned display_name is NOT visible (cross-check with ban-enforcement.spec.ts)
  })

  test.fixme('banned member SQL row reflects banned=true', async () => {
    // Plan 04: use adminClient().from('profiles').select('banned').eq('id', recipientId).single()
    //          → expect data.banned === true
    void adminClient
  })
})
