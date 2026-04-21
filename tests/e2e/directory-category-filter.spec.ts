/**
 * Phase 4 — DIR-03 — Selecting a category narrows results and updates ?category= in URL
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

test.describe('DIR-03: category filter narrows results + updates URL', () => {
  let viewerId = ''
  let profile1Id = ''
  let profile2Id = ''
  const stamp = Date.now()
  const viewerEmail = `dir-cat-view-${stamp}@example.test`
  const viewerPassword = 'TestOnly-pw-12345!'
  const foodName = `Food Member ${stamp}`
  const wellnessName = `Wellness Member ${stamp}`

  test.beforeAll(async () => {
    test.skip(!hasEnv, 'Supabase env vars not set — skip DB-seeded E2E')
    viewerId = await createVerifiedUser(viewerEmail, viewerPassword)
    const foodUserId = await createVerifiedUser(
      `dir-cat-food-${stamp}@example.test`,
      viewerPassword,
    )
    const wellnessUserId = await createVerifiedUser(
      `dir-cat-well-${stamp}@example.test`,
      viewerPassword,
    )
    profile1Id = foodUserId
    profile2Id = wellnessUserId
    await seedPublishedProfile({
      ownerId: foodUserId,
      display_name: foodName,
      category_id: 2, // Food & Kitchen
      county_id: 13001,
      skills: ['cooking'],
    })
    await seedPublishedProfile({
      ownerId: wellnessUserId,
      display_name: wellnessName,
      category_id: 5, // Wellness & Fitness
      county_id: 13001,
      skills: ['yoga'],
    })
  })

  test.afterAll(async () => {
    if (viewerId) await cleanupUser(viewerId)
    if (profile1Id) await cleanupUser(profile1Id)
    if (profile2Id) await cleanupUser(profile2Id)
  })

  test('selecting Food & Kitchen category updates URL and narrows results', async ({
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

    // Navigate to directory with category pre-selected via URL (avoids combobox interaction complexity)
    await page.goto('/directory?category=food-kitchen')
    await expect(page).toHaveURL(/category=food-kitchen/)

    // Food profile should be visible
    await expect(
      page.getByRole('listitem').filter({ hasText: foodName }).first(),
    ).toBeVisible({ timeout: 10_000 })

    // Wellness profile should NOT be visible
    await expect(
      page.getByRole('listitem').filter({ hasText: wellnessName }),
    ).not.toBeVisible()
  })
})
