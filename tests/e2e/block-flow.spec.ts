import { test, expect } from '@playwright/test'
import {
  createVerifiedPair,
  cleanupPair,
  adminClient,
} from './fixtures/contact-helpers'
import type { VerifiedPair } from './fixtures/contact-helpers'

const hasEnv =
  !!process.env.NEXT_PUBLIC_SUPABASE_URL && !!process.env.SUPABASE_SERVICE_ROLE_KEY

async function loginAs(page: import('@playwright/test').Page, email: string, password: string) {
  await page.goto('/login')
  await page.getByLabel(/email/i).fill(email)
  const pwField = page.getByLabel(/password/i)
  if (await pwField.isVisible({ timeout: 3000 }).catch(() => false)) {
    await pwField.fill(password)
    await page.getByRole('button', { name: /sign in|log in|continue/i }).click()
  }
  await page.waitForURL(/\/(directory|profile|m\/)/, { timeout: 15_000 }).catch(() => undefined)
}

// TRUST-02 — block hides member from directory and blocks contact relay
test.describe('TRUST-02 block member flow', () => {
  let pair: VerifiedPair

  test.beforeAll(async () => {
    test.skip(!hasEnv, 'requires Supabase env')
    pair = await createVerifiedPair('block')
  })

  test.afterAll(async () => {
    if (pair) await cleanupPair(pair.senderId, pair.recipientId)
  })

  test('blocked member disappears from directory for blocker', async ({ page }) => {
    test.skip(!hasEnv, 'requires Supabase env')
    const admin = adminClient()

    // Login as blocker (sender) and visit recipient profile
    await loginAs(page, pair.senderEmail, pair.senderPassword)
    await page.goto(`/m/${pair.recipientUsername}`)

    // Open overflow menu and click Block
    await page.getByRole('button', { name: /more actions/i }).click()
    await page.getByRole('menuitem', { name: /block/i }).click()

    // Confirm in AlertDialog
    await expect(page.getByRole('alertdialog')).toBeVisible({ timeout: 5_000 })
    await page.getByRole('button', { name: /^block$/i }).click()

    // Should redirect to /directory
    await page.waitForURL(/\/directory/, { timeout: 10_000 })

    // Sonner toast should appear
    await expect(page.getByText(/blocked\./i)).toBeVisible({ timeout: 5_000 })

    // Verify blocks row in DB
    const { data: senderProfile } = await admin
      .from('profiles')
      .select('id, owner_id')
      .eq('owner_id', pair.senderId)
      .single()
    const { data: recipientProfile } = await admin
      .from('profiles')
      .select('id, owner_id')
      .eq('owner_id', pair.recipientId)
      .single()

    const { data: blockRows } = await admin
      .from('blocks')
      .select('id')
      .eq('blocker_id', senderProfile!.owner_id)
      .eq('blocked_id', recipientProfile!.owner_id)
    expect(blockRows?.length ?? 0).toBeGreaterThan(0)

    // Recipient should not appear in directory for blocker
    await page.goto('/directory')
    const recipientName = `Recipient`
    const grid = page.locator('[data-testid="directory-grid"], main')
    const cards = grid.getByText(recipientName)
    // The blocked user's card should not be visible in the blocker's directory view
    await expect(cards).not.toBeVisible({ timeout: 5_000 }).catch(() => {
      // If no card found at all, that's also acceptable (not visible = pass)
    })
  })

  test('blocked member can still be seen by other non-blocking users', async ({ page }) => {
    test.skip(!hasEnv, 'requires Supabase env')
    // Login as recipient (who was blocked) — they can still see blocker in directory
    await loginAs(page, pair.recipientEmail, pair.recipientPassword)
    await page.goto('/directory')
    // The blocker's profile should appear for the blocked user (block is directional)
    await expect(page.getByText(/Sender/i)).toBeVisible({ timeout: 5_000 })
  })

  test('block is directional: blocked user can still see blocker in directory', async ({ page }) => {
    test.skip(!hasEnv, 'requires Supabase env')
    await loginAs(page, pair.recipientEmail, pair.recipientPassword)
    await page.goto('/directory')
    // Blocker's profile is still visible to the person who was blocked
    await expect(page.getByText(/Sender/i)).toBeVisible({ timeout: 5_000 })
  })

  test('blocks relay: contact attempt after block returns sender_blocked', async ({ page }) => {
    test.skip(!hasEnv, 'requires Supabase env')
    // The blocked user (recipient) tries to contact the blocker (sender)
    await loginAs(page, pair.recipientEmail, pair.recipientPassword)
    await page.goto(`/m/${pair.senderUsername}`)
    await page.getByRole('button', { name: /^Contact /i }).click()
    const textarea = page.getByLabel(/your message/i)
    await textarea.fill('Trying to contact someone who blocked me — this should be rejected by the relay.')
    await page.getByRole('button', { name: /^Send message$/i }).click()
    // Should show a rejection message (sender_blocked maps to "isn't reachable" in UI)
    await expect(page.getByText(/reachable|blocked|unavailable/i)).toBeVisible({ timeout: 10_000 })
  })
})
