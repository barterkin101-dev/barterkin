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

// MSG-06 — unread badge appears on Dashboard nav link when recipient has unread messages.
test.describe('MSG-06 unread message badge', () => {
  let pair: VerifiedPair

  test.beforeAll(async () => {
    test.skip(!hasEnv, 'requires Supabase env')
    pair = await createVerifiedPair('badge')
  })

  test.afterAll(async () => {
    if (pair) await cleanupPair(pair.senderId, pair.recipientId)
  })

  test('badge appears when unread messages exist and clears after reading', async ({ page }) => {
    test.skip(!hasEnv, 'requires Supabase env')
    const admin = adminClient()

    const { data: senderProfile } = await admin
      .from('profiles')
      .select('id')
      .eq('owner_id', pair.senderId)
      .single()
    const { data: recipientProfile } = await admin
      .from('profiles')
      .select('id')
      .eq('owner_id', pair.recipientId)
      .single()

    // Create a conversation where recipient has NOT read the message
    const { data: conv } = await admin
      .from('conversations')
      .insert({})
      .select('id')
      .single()
    if (!conv) throw new Error('Failed to create conversation')

    await admin.from('conversation_participants').insert([
      { conversation_id: conv.id, profile_id: senderProfile!.id, last_read_at: new Date().toISOString() },
      { conversation_id: conv.id, profile_id: recipientProfile!.id, last_read_at: null },
    ])

    await admin.from('messages').insert({
      conversation_id: conv.id,
      sender_profile_id: senderProfile!.id,
      content: 'Unread message for badge test',
    })

    // Login as RECIPIENT (the one who hasn't read)
    await loginAs(page, pair.recipientEmail, pair.recipientPassword)
    await page.goto('/directory')

    // Badge should appear on Dashboard nav link
    const badge = page.locator('nav .bg-destructive').first()
    await expect(badge).toBeVisible({ timeout: 10_000 })

    // Navigate to messages page — this should mark messages as read
    await page.goto('/dashboard/messages')
    await page.waitForLoadState('networkidle')

    // Navigate back to directory — badge should be gone
    await page.goto('/directory')
    await page.waitForLoadState('networkidle')
    await expect(page.locator('nav .bg-destructive')).not.toBeVisible({ timeout: 5_000 })
  })
})
