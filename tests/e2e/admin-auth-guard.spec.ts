import { test, expect } from '@playwright/test'
import type { Page } from '@playwright/test'
import { createVerifiedPair, cleanupPair } from './fixtures/contact-helpers'
import type { VerifiedPair } from './fixtures/contact-helpers'

const hasEnv =
  !!process.env.NEXT_PUBLIC_SUPABASE_URL && !!process.env.SUPABASE_SERVICE_ROLE_KEY

async function loginAs(page: Page, email: string, password: string) {
  await page.goto('/login')
  await page.getByLabel(/email/i).fill(email)
  const pwField = page.getByLabel(/password/i)
  if (await pwField.isVisible({ timeout: 3000 }).catch(() => false)) {
    await pwField.fill(password)
    await page.getByRole('button', { name: /sign in|log in|continue/i }).click()
  }
  await page.waitForURL(/\/(directory|profile|admin|m\/)/, { timeout: 15_000 }).catch(() => undefined)
}

test.describe('ADMIN-06 — admin auth guard (unauthenticated)', () => {
  test('unauthenticated user visiting /admin is redirected to /login', async ({ page }) => {
    await page.goto('/admin')
    await expect(page).toHaveURL(/\/login/)
  })

  test('unauthenticated user visiting /admin/members is redirected to /login', async ({ page }) => {
    await page.goto('/admin/members')
    await expect(page).toHaveURL(/\/login/)
  })

  test('unauthenticated user visiting /admin/contacts is redirected to /login', async ({ page }) => {
    await page.goto('/admin/contacts')
    await expect(page).toHaveURL(/\/login/)
  })
})

test.describe('ADMIN-06 — admin auth guard (authenticated non-admin)', () => {
  let pair: VerifiedPair | null = null

  test.beforeAll(async () => {
    test.skip(!hasEnv, 'requires Supabase env')
    pair = await createVerifiedPair('non-admin-guard')
  })

  test.afterAll(async () => {
    if (pair) await cleanupPair(pair.senderId, pair.recipientId)
  })

  test('authenticated non-admin user visiting /admin is redirected to /', async ({ page }) => {
    test.skip(!hasEnv, 'requires Supabase env')
    await loginAs(page, pair!.senderEmail, pair!.senderPassword)
    await page.goto('/admin')
    await expect(page).toHaveURL(/^https?:\/\/[^/]+\/?$/)
  })

  test('authenticated non-admin user visiting /admin/members is redirected to /', async ({ page }) => {
    test.skip(!hasEnv, 'requires Supabase env')
    await loginAs(page, pair!.senderEmail, pair!.senderPassword)
    await page.goto('/admin/members')
    await expect(page).toHaveURL(/^https?:\/\/[^/]+\/?$/)
  })

  test('authenticated non-admin user visiting /admin/members/[id] is redirected to /', async ({ page }) => {
    test.skip(!hasEnv, 'requires Supabase env')
    await loginAs(page, pair!.senderEmail, pair!.senderPassword)
    await page.goto(`/admin/members/${pair!.recipientId}`)
    await expect(page).toHaveURL(/^https?:\/\/[^/]+\/?$/)
  })

  test('authenticated non-admin user visiting /admin/contacts is redirected to /', async ({ page }) => {
    test.skip(!hasEnv, 'requires Supabase env')
    await loginAs(page, pair!.senderEmail, pair!.senderPassword)
    await page.goto('/admin/contacts')
    await expect(page).toHaveURL(/^https?:\/\/[^/]+\/?$/)
  })
})
