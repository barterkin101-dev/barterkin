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

// MSG-01..MSG-05 — In-app messaging E2E flow
// Covers: start conversation from profile, send message, view conversation list,
// view message thread, unread badge behavior.
test.describe('MSG in-app messaging flow', () => {
  let pair: VerifiedPair

  test.beforeAll(async () => {
    test.skip(!hasEnv, 'requires Supabase env')
    pair = await createVerifiedPair('msg')
  })

  test.afterAll(async () => {
    if (pair) await cleanupPair(pair.senderId, pair.recipientId)
  })

  test('MSG-01 — start a conversation from a profile page', async ({ page }) => {
    test.skip(!hasEnv, 'requires Supabase env')

    // Login as sender and visit recipient profile
    await loginAs(page, pair.senderEmail, pair.senderPassword)
    await page.goto(`/m/${pair.recipientUsername}`)

    // MessageButton should be visible
    const msgButton = page.getByRole('button', { name: /Message/i })
    await expect(msgButton).toBeVisible({ timeout: 5_000 })
    await msgButton.click()

    // Sheet should open with recipient name in title
    await expect(page.getByRole('dialog')).toBeVisible({ timeout: 5_000 })
    await expect(page.getByText(/Message Recipient/)).toBeVisible()

    // Fill and send initial message
    const textarea = page.getByLabel(/your message/i)
    await textarea.fill('Hello! I would love to trade skills with you.')
    await page.getByRole('button', { name: /send message/i }).click()

    // Should redirect to the new conversation thread
    await page.waitForURL(/\/dashboard\/messages\//, { timeout: 10_000 })
    await expect(page.getByText(/Hello! I would love to trade skills with you./)).toBeVisible()
  })

  test('MSG-02 — send a message in an existing conversation', async ({ page }) => {
    test.skip(!hasEnv, 'requires Supabase env')
    const admin = adminClient()

    // Get profile IDs
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

    // Create a conversation with an initial message via admin
    const { data: conv } = await admin
      .from('conversations')
      .insert({})
      .select('id')
      .single()
    if (!conv) throw new Error('Failed to create conversation')

    await admin.from('conversation_participants').insert([
      { conversation_id: conv.id, profile_id: senderProfile!.id },
      { conversation_id: conv.id, profile_id: recipientProfile!.id },
    ])

    await admin.from('messages').insert({
      conversation_id: conv.id,
      sender_profile_id: senderProfile!.id,
      content: 'Initial seed message',
    })

    // Login as sender and navigate to the conversation
    await loginAs(page, pair.senderEmail, pair.senderPassword)
    await page.goto(`/dashboard/messages/${conv.id}`)

    // Existing message should be visible
    await expect(page.getByText(/Initial seed message/)).toBeVisible({ timeout: 5_000 })

    // Send a follow-up message
    const textarea = page.getByPlaceholder(/type a message/i)
    await textarea.fill('Follow-up message from sender')
    await page.getByRole('button', { name: /send/i }).click()

    // New message should appear in the thread
    await expect(page.getByText(/Follow-up message from sender/)).toBeVisible({ timeout: 5_000 })
  })

  test('MSG-03 — view conversation list', async ({ page }) => {
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

    // Create a conversation with a message
    const { data: conv } = await admin
      .from('conversations')
      .insert({})
      .select('id')
      .single()
    if (!conv) throw new Error('Failed to create conversation')

    await admin.from('conversation_participants').insert([
      { conversation_id: conv.id, profile_id: senderProfile!.id },
      { conversation_id: conv.id, profile_id: recipientProfile!.id },
    ])

    await admin.from('messages').insert({
      conversation_id: conv.id,
      sender_profile_id: recipientProfile!.id,
      content: 'Message from recipient to test conversation list',
    })

    // Login as sender and go to messages page
    await loginAs(page, pair.senderEmail, pair.senderPassword)
    await page.goto('/dashboard/messages')

    // Conversation list should show the other participant's name
    await expect(page.getByText(/Recipient/)).toBeVisible({ timeout: 5_000 })
    // Should show the last message preview
    await expect(page.getByText(/Message from recipient to test conversation list/)).toBeVisible()
  })

  test('MSG-04 — view message thread and see messages from both sides', async ({ page }) => {
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

    // Create conversation with messages from both participants
    const { data: conv } = await admin
      .from('conversations')
      .insert({})
      .select('id')
      .single()
    if (!conv) throw new Error('Failed to create conversation')

    await admin.from('conversation_participants').insert([
      { conversation_id: conv.id, profile_id: senderProfile!.id },
      { conversation_id: conv.id, profile_id: recipientProfile!.id },
    ])

    await admin.from('messages').insert([
      {
        conversation_id: conv.id,
        sender_profile_id: senderProfile!.id,
        content: 'Message from sender',
      },
      {
        conversation_id: conv.id,
        sender_profile_id: recipientProfile!.id,
        content: 'Reply from recipient',
      },
    ])

    // Login as sender and view thread
    await loginAs(page, pair.senderEmail, pair.senderPassword)
    await page.goto(`/dashboard/messages/${conv.id}`)

    // Both messages should be visible
    await expect(page.getByText(/Message from sender/)).toBeVisible({ timeout: 5_000 })
    await expect(page.getByText(/Reply from recipient/)).toBeVisible()
  })

  test('MSG-05 — unread badge appears on Dashboard nav link', async ({ page }) => {
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
