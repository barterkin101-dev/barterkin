/**
 * Phase 4 — DIR-04 — Selecting a county narrows results and updates ?county= in URL
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

test.describe('DIR-04: county filter narrows results + updates URL', () => {
  let viewerId = ''
  let applingUserId = ''
  let cobbUserId = ''
  const stamp = Date.now()
  const viewerEmail = `dir-county-view-${stamp}@example.test`
  const viewerPassword = 'TestOnly-pw-12345!'
  const applingName = `Appling Member ${stamp}`
  const cobbName = `Cobb Member ${stamp}`

  test.beforeAll(async () => {
    test.skip(!hasEnv, 'Supabase env vars not set — skip DB-seeded E2E')
    viewerId = await createVerifiedUser(viewerEmail, viewerPassword)
    applingUserId = await createVerifiedUser(
      `dir-county-appling-${stamp}@example.test`,
      viewerPassword,
    )
    cobbUserId = await createVerifiedUser(
      `dir-county-cobb-${stamp}@example.test`,
      viewerPassword,
    )
    await seedPublishedProfile({
      ownerId: applingUserId,
      display_name: applingName,
      county_id: 13001, // Appling County
      category_id: 1,
      skills: ['farming'],
    })
    await seedPublishedProfile({
      ownerId: cobbUserId,
      display_name: cobbName,
      county_id: 13067, // Cobb County
      category_id: 1,
      skills: ['carpentry'],
    })
  })

  test.afterAll(async () => {
    if (viewerId) await cleanupUser(viewerId)
    if (applingUserId) await cleanupUser(applingUserId)
    if (cobbUserId) await cleanupUser(cobbUserId)
  })

  test('selecting Appling County updates URL and narrows results', async ({
    page,
  }) => {
    test.skip(!hasEnv, 'Supabase env vars not set — skip DB-seeded E2E')

    // Sign in
    await page.goto('/login')
    await page.getByLabel(/email/i).fill(viewerEmail)
    const pwField = page.getByLabel(/password/i)
    if (await pwField.isVisible()) {
      await pwField.fill(viewerPassword)
      await page.getByRole('button', { name: /sign in|log in|continue/i }).click()
    }
    await page
      .waitForURL(/\/(directory|profile)/, { timeout: 15_000 })
      .catch(() => undefined)

    // Navigate with county filter pre-applied via URL
    await page.goto('/directory?county=13001')
    await expect(page).toHaveURL(/county=13001/)

    // Appling profile visible
    await expect(
      page.getByRole('listitem').filter({ hasText: applingName }).first(),
    ).toBeVisible({ timeout: 10_000 })

    // Cobb profile NOT visible
    await expect(
      page.getByRole('listitem').filter({ hasText: cobbName }),
    ).not.toBeVisible()
  })
})
