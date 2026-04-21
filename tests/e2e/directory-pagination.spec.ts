/**
 * Phase 4 — DIR-07 — Previous disabled on page 1, Next disabled on last page, 20 per page
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

test.describe('DIR-07: pagination — 20/page, Previous disabled on p1, Next on last', () => {
  let viewerId = ''
  const userIds: string[] = []
  const stamp = Date.now()
  const viewerEmail = `dir-page-view-${stamp}@example.test`
  const viewerPassword = 'TestOnly-pw-12345!'
  // We need 25 profiles to get 2 pages (20 + 5)
  const PROFILE_COUNT = 25

  test.beforeAll(async () => {
    test.skip(!hasEnv, 'Supabase env vars not set — skip DB-seeded E2E')
    viewerId = await createVerifiedUser(viewerEmail, viewerPassword)
    // Seed 25 profiles sequentially to avoid rate limits
    for (let i = 0; i < PROFILE_COUNT; i++) {
      const uid = await createVerifiedUser(
        `dir-page-p${i}-${stamp}@example.test`,
        viewerPassword,
      )
      userIds.push(uid)
      await seedPublishedProfile({
        ownerId: uid,
        display_name: `Page Member ${i} ${stamp}`,
        category_id: 1,
        county_id: 13001,
        skills: [`skill-${i}`],
      })
    }
  })

  test.afterAll(async () => {
    if (viewerId) await cleanupUser(viewerId)
    for (const uid of userIds) await cleanupUser(uid)
  })

  test('page 1: 20 cards visible, Previous aria-disabled, Next enabled', async ({
    page,
  }) => {
    test.skip(!hasEnv, 'Supabase env vars not set — skip DB-seeded E2E')

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

    await page.goto('/directory')

    // Wait for cards to load
    const cards = page.getByRole('listitem')
    await expect(cards.first()).toBeVisible({ timeout: 10_000 })

    // Should show exactly 20 cards on page 1
    await expect(cards).toHaveCount(20, { timeout: 10_000 })

    // Previous button should be disabled on page 1
    const prevBtn = page.getByRole('button', { name: /Previous page of results/i })
    await expect(prevBtn).toHaveAttribute('aria-disabled', 'true')
    await expect(prevBtn).toBeDisabled()

    // Next button should be enabled (link, not disabled button)
    const nextLink = page.getByRole('link', { name: /Next page of results/i })
    await expect(nextLink).toBeVisible()

    // Click Next
    await nextLink.click()
    await expect(page).toHaveURL(/page=2/, { timeout: 10_000 })
  })

  test('page 2: remaining cards visible, Next aria-disabled', async ({
    page,
  }) => {
    test.skip(!hasEnv, 'Supabase env vars not set — skip DB-seeded E2E')

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

    await page.goto('/directory?page=2')
    await expect(page).toHaveURL(/page=2/)

    // Wait for cards
    const cards = page.getByRole('listitem')
    await expect(cards.first()).toBeVisible({ timeout: 10_000 })

    // Remaining profiles (25 total - 20 on p1 = 5 on p2), but other profiles may exist in DB
    // So assert ≥1 and ≤20 cards
    const count = await cards.count()
    expect(count).toBeGreaterThanOrEqual(1)
    expect(count).toBeLessThanOrEqual(20)

    // Next button should be disabled on last page
    const nextBtn = page.getByRole('button', { name: /Next page of results/i })
    await expect(nextBtn).toHaveAttribute('aria-disabled', 'true')
    await expect(nextBtn).toBeDisabled()

    // Previous link should be enabled
    const prevLink = page.getByRole('link', { name: /Previous page of results/i })
    await expect(prevLink).toBeVisible()
  })
})
