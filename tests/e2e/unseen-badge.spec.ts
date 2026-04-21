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

// CONT-10 — unseen-contact badge appears after send; visiting /profile clears badge
test.describe('CONT-10 unseen contact badge', () => {
  let pair: VerifiedPair

  test.beforeAll(async () => {
    test.skip(!hasEnv, 'requires Supabase env')
    pair = await createVerifiedPair('badge')
  })

  test.afterAll(async () => {
    if (pair) await cleanupPair(pair.senderId, pair.recipientId)
  })

  test('shows', async ({ page }) => {
    test.skip(!hasEnv, 'requires Supabase env')
    const admin = adminClient()

    // Get recipient profile id
    const { data: recipientProfile } = await admin
      .from('profiles')
      .select('id')
      .eq('owner_id', pair.recipientId)
      .single()
    const { data: senderProfile } = await admin
      .from('profiles')
      .select('id')
      .eq('owner_id', pair.senderId)
      .single()

    // Seed an unseen contact_request (seen_at IS NULL)
    await admin.from('contact_requests').insert({
      sender_id: senderProfile!.id,
      recipient_id: recipientProfile!.id,
      message: 'Badge test message — seeded via admin to trigger unseen badge in nav for recipient.',
    })

    // Login as recipient and navigate to directory (any auth'd page with nav)
    await loginAs(page, pair.recipientEmail, pair.recipientPassword)
    await page.goto('/directory')

    // Badge dot (h-2 w-2) or pill should be visible in nav
    const badge = page.locator('nav .bg-destructive').first()
    await expect(badge).toBeVisible({ timeout: 10_000 })

    // sr-only text should contain "new contact"
    const srOnly = page.locator('nav .sr-only').filter({ hasText: /new contact/i })
    await expect(srOnly).toBeAttached({ timeout: 5_000 })
  })

  test('clears', async ({ page }) => {
    test.skip(!hasEnv, 'requires Supabase env')
    const admin = adminClient()

    // Get profile ids
    const { data: recipientProfile } = await admin
      .from('profiles')
      .select('id')
      .eq('owner_id', pair.recipientId)
      .single()
    const { data: senderProfile } = await admin
      .from('profiles')
      .select('id')
      .eq('owner_id', pair.senderId)
      .single()

    // Seed another unseen request in case prior test already cleared
    await admin.from('contact_requests').insert({
      sender_id: senderProfile!.id,
      recipient_id: recipientProfile!.id,
      message: 'Badge clear test — seeded to verify markContactsSeen clears badge on profile visit.',
    })

    // Login and verify badge is visible
    await loginAs(page, pair.recipientEmail, pair.recipientPassword)
    await page.goto('/directory')
    const badge = page.locator('nav .bg-destructive').first()
    await expect(badge).toBeVisible({ timeout: 10_000 })

    // Navigate to /profile — markContactsSeen fires on render
    await page.goto('/profile')
    await page.waitForLoadState('networkidle')

    // Navigate back to /directory — badge should be gone
    await page.goto('/directory')
    await page.waitForLoadState('networkidle')
    await expect(page.locator('nav .bg-destructive')).not.toBeVisible({ timeout: 5_000 })
  })

  test('shows correct count with multiple unseen contacts', async ({ page }) => {
    test.skip(!hasEnv, 'requires Supabase env')
    const admin = adminClient()

    const { data: recipientProfile } = await admin
      .from('profiles')
      .select('id')
      .eq('owner_id', pair.recipientId)
      .single()
    const { data: senderProfile } = await admin
      .from('profiles')
      .select('id')
      .eq('owner_id', pair.senderId)
      .single()

    // Seed 3 unseen contact_requests
    await admin.from('contact_requests').insert([
      {
        sender_id: senderProfile!.id,
        recipient_id: recipientProfile!.id,
        message: 'Multi-badge test seed 1 — three unseen messages to trigger pill count badge.',
      },
      {
        sender_id: senderProfile!.id,
        recipient_id: recipientProfile!.id,
        message: 'Multi-badge test seed 2 — three unseen messages to trigger pill count badge.',
      },
      {
        sender_id: senderProfile!.id,
        recipient_id: recipientProfile!.id,
        message: 'Multi-badge test seed 3 — three unseen messages to trigger pill count badge.',
      },
    ])

    // Login as recipient
    await loginAs(page, pair.recipientEmail, pair.recipientPassword)
    await page.goto('/directory')

    // Badge pill should show a count (n >= 2 triggers pill with number)
    const badge = page.locator('nav .bg-destructive').first()
    await expect(badge).toBeVisible({ timeout: 10_000 })
    // The pill element should contain a visible number >= 2
    const pillText = await badge.textContent()
    const count = parseInt(pillText ?? '0', 10)
    expect(count).toBeGreaterThanOrEqual(2)
  })

  test('does not show when all contacts have been seen', async ({ page }) => {
    test.skip(!hasEnv, 'requires Supabase env')
    const admin = adminClient()

    const { data: recipientProfile } = await admin
      .from('profiles')
      .select('id')
      .eq('owner_id', pair.recipientId)
      .single()
    const { data: senderProfile } = await admin
      .from('profiles')
      .select('id')
      .eq('owner_id', pair.senderId)
      .single()

    // Seed a contact_request that is already seen (seen_at set)
    await admin.from('contact_requests').insert({
      sender_id: senderProfile!.id,
      recipient_id: recipientProfile!.id,
      message: 'Already-seen contact test — seen_at is set so badge should not appear.',
      seen_at: new Date().toISOString(),
    })

    // Mark all remaining unseen as seen via admin
    await admin
      .from('contact_requests')
      .update({ seen_at: new Date().toISOString() })
      .eq('recipient_id', recipientProfile!.id)
      .is('seen_at', null)

    await loginAs(page, pair.recipientEmail, pair.recipientPassword)
    await page.goto('/directory')
    await page.waitForLoadState('networkidle')

    // No badge should be present
    await expect(page.locator('nav .bg-destructive')).not.toBeVisible({ timeout: 5_000 })
  })
})
