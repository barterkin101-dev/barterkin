/**
 * Phase 4 — DIR-06 — Paste a filter URL in a fresh context, same filter state renders
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

test.describe('DIR-06: shareable URL hydrates filter state', () => {
  let viewerId = ''
  let subjectId = ''
  const stamp = Date.now()
  const viewerEmail = `dir-share-view-${stamp}@example.test`
  const viewerPassword = 'TestOnly-pw-12345!'
  const subjectName = `Shareable Member ${stamp}`

  test.beforeAll(async () => {
    test.skip(!hasEnv, 'Supabase env vars not set — skip DB-seeded E2E')
    viewerId = await createVerifiedUser(viewerEmail, viewerPassword)
    subjectId = await createVerifiedUser(
      `dir-share-subj-${stamp}@example.test`,
      viewerPassword,
    )
    await seedPublishedProfile({
      ownerId: subjectId,
      display_name: subjectName,
      category_id: 2, // Food & Kitchen
      county_id: 13001, // Appling County
      skills: ['baking'],
    })
  })

  test.afterAll(async () => {
    if (viewerId) await cleanupUser(viewerId)
    if (subjectId) await cleanupUser(subjectId)
  })

  test('navigating to a filter URL hydrates the filter bar with correct state', async ({
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

    // Navigate directly to the combined filter URL
    const filterUrl = '/directory?category=food-kitchen&county=13001&q=baking'
    await page.goto(filterUrl)
    await expect(page).toHaveURL(/category=food-kitchen/)
    await expect(page).toHaveURL(/county=13001/)
    await expect(page).toHaveURL(/q=baking/)

    // Filter chips should be visible reflecting all 3 active filters
    await expect(page.getByText('Category: Food & Kitchen')).toBeVisible({
      timeout: 10_000,
    })
    await expect(page.getByText('County: Appling County')).toBeVisible()
    await expect(page.getByText('Search: baking')).toBeVisible()

    // The seeded profile should be visible
    await expect(
      page.getByRole('listitem').filter({ hasText: subjectName }).first(),
    ).toBeVisible()
  })

  test('same filter URL in a new browser context restores identical state', async ({
    browser,
  }) => {
    test.skip(!hasEnv, 'Supabase env vars not set — skip DB-seeded E2E')

    // Create a fresh browser context (simulates pasting URL in a new tab/session)
    const ctx2 = await browser.newContext()
    const page2 = await ctx2.newPage()

    // Sign in with fresh context
    await page2.goto('/login')
    await page2.getByLabel(/email/i).fill(viewerEmail)
    const pwField2 = page2.getByLabel(/password/i)
    if (await pwField2.isVisible()) {
      await pwField2.fill(viewerPassword)
      await page2
        .getByRole('button', { name: /sign in|log in|continue/i })
        .click()
    }
    await page2
      .waitForURL(/\/(directory|profile)/, { timeout: 15_000 })
      .catch(() => undefined)

    // Navigate to the shared filter URL
    await page2.goto('/directory?category=food-kitchen&county=13001&q=baking')
    await expect(page2).toHaveURL(/category=food-kitchen/)
    await expect(page2).toHaveURL(/county=13001/)
    await expect(page2).toHaveURL(/q=baking/)

    // Same chips visible
    await expect(page2.getByText('Category: Food & Kitchen')).toBeVisible({
      timeout: 10_000,
    })
    await expect(page2.getByText('County: Appling County')).toBeVisible()
    await expect(page2.getByText('Search: baking')).toBeVisible()

    await ctx2.close()
  })
})
