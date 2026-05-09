import { test, expect } from '@playwright/test'
import {
  createVerifiedPair,
  cleanupPair,
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

// CONT-10 — unseen-contact badge tests removed.
// The legacy email-based contact relay has been retired in favor of in-app messaging.
// The message unread badge is tested separately in messaging E2E specs.
test.describe('CONT-10 unseen contact badge', () => {
  let pair: VerifiedPair

  test.beforeAll(async () => {
    test.skip(!hasEnv, 'requires Supabase env')
    pair = await createVerifiedPair('badge')
  })

  test.afterAll(async () => {
    if (pair) await cleanupPair(pair.senderId, pair.recipientId)
  })

  test('legacy badge removed — no contact_request badge in nav', async ({ page }) => {
    test.skip(!hasEnv, 'requires Supabase env')

    await loginAs(page, pair.recipientEmail, pair.recipientPassword)
    await page.goto('/directory')
    await page.waitForLoadState('networkidle')

    // Legacy contact badge used nav .bg-destructive; messaging badge uses different selectors.
    // Confirm the old selector no longer matches anything in nav.
    const legacyBadge = page.locator('nav .bg-destructive').first()
    await expect(legacyBadge).not.toBeVisible({ timeout: 5_000 })
  })
})
