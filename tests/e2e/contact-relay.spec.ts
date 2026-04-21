import { test, expect } from '@playwright/test'
import {
  createVerifiedPair,
  cleanupPair,
  setAcceptingContact,
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

// CONT-01, CONT-04 — contact sheet opens on profile page + inserts row
test.describe('CONT-01 contact sheet', () => {
  let pair: VerifiedPair

  test.beforeAll(async () => {
    test.skip(!hasEnv, 'requires Supabase env')
    pair = await createVerifiedPair('relay')
  })

  test.afterAll(async () => {
    if (pair) await cleanupPair(pair.senderId, pair.recipientId)
  })

  test('opens sheet on profile page', async ({ page }) => {
    test.skip(!hasEnv, 'requires Supabase env')
    await loginAs(page, pair.senderEmail, pair.senderPassword)
    await page.goto(`/m/${pair.recipientUsername}`)
    await page.getByRole('button', { name: /^Contact /i }).click()
    await expect(page.getByRole('dialog')).toBeVisible({ timeout: 10_000 })
    await expect(page.getByLabel(/your message/i)).toBeVisible()
    const sendBtn = page.getByRole('button', { name: /^Send message$/i })
    await expect(sendBtn).toBeDisabled()
  })

  test('hidden when not accepting', async ({ page }) => {
    test.skip(!hasEnv, 'requires Supabase env')
    await setAcceptingContact(pair.recipientId, false)
    await loginAs(page, pair.senderEmail, pair.senderPassword)
    await page.goto(`/m/${pair.recipientUsername}`)
    await expect(page.getByText(/not accepting messages right now/i)).toBeVisible()
    await expect(page.getByRole('button', { name: /^Contact /i })).not.toBeVisible()
    await setAcceptingContact(pair.recipientId, true) // reset
  })

  test('inserts row on successful send', async ({ page }) => {
    test.skip(!hasEnv, 'requires Supabase env')
    const admin = adminClient()
    await loginAs(page, pair.senderEmail, pair.senderPassword)
    await page.goto(`/m/${pair.recipientUsername}`)
    await page.getByRole('button', { name: /^Contact /i }).click()
    const textarea = page.getByLabel(/your message/i)
    await textarea.fill('Hello — I noticed your baking skill and I make pottery. Would love to trade a lesson.')
    await page.getByRole('button', { name: /^Send message$/i }).click()
    await expect(page.getByRole('heading', { name: /^sent!$/i })).toBeVisible({ timeout: 15_000 })

    // Verify DB row via admin client
    const { data: rows } = await admin
      .from('contact_requests')
      .select('id, message, status')
      .eq('sender_id', pair.senderId)
      .eq('recipient_id', pair.recipientId)
    expect(rows?.length ?? 0).toBeGreaterThan(0)
    expect(rows?.[0]?.message).toContain('pottery')
  })

  test('shows validation error for message under 20 chars', async ({ page }) => {
    test.skip(!hasEnv, 'requires Supabase env')
    await loginAs(page, pair.senderEmail, pair.senderPassword)
    await page.goto(`/m/${pair.recipientUsername}`)
    await page.getByRole('button', { name: /^Contact /i }).click()
    const textarea = page.getByLabel(/your message/i)
    await textarea.fill('Too short')
    await page.getByRole('button', { name: /^Send message$/i }).click()
    await expect(page.getByText(/at least 20/i)).toBeVisible({ timeout: 5_000 })
  })

  test('shows validation error for message over 500 chars', async ({ page }) => {
    test.skip(!hasEnv, 'requires Supabase env')
    await loginAs(page, pair.senderEmail, pair.senderPassword)
    await page.goto(`/m/${pair.recipientUsername}`)
    await page.getByRole('button', { name: /^Contact /i }).click()
    const textarea = page.getByLabel(/your message/i)
    await textarea.fill('A'.repeat(501))
    await page.getByRole('button', { name: /^Send message$/i }).click()
    await expect(page.getByText(/500/i)).toBeVisible({ timeout: 5_000 })
  })
})
