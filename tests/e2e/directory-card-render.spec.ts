/**
 * Phase 4 — DIR-02 — Directory card shows avatar, display_name, county, category, and up-to-3 skill chips
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

test.describe('DIR-02: directory card renders all required fields', () => {
  let viewerId = ''
  let subjectId = ''
  const stamp = Date.now()
  const viewerEmail = `dir-view-${stamp}@example.test`
  const viewerPassword = 'TestOnly-pw-12345!'
  const subjectName = `Card Subject ${stamp}`

  test.beforeAll(async () => {
    test.skip(!hasEnv, 'Supabase env vars not set — skip DB-seeded E2E')
    viewerId = await createVerifiedUser(viewerEmail, viewerPassword)
    subjectId = await createVerifiedUser(
      `dir-subj-${stamp}@example.test`,
      viewerPassword,
    )
    await seedPublishedProfile({
      ownerId: subjectId,
      display_name: subjectName,
      category_id: 2, // Food & Kitchen
      county_id: 13001, // Appling County
      skills: ['baking', 'sourdough', 'cakes', 'pastries', 'bread'],
    })
  })

  test.afterAll(async () => {
    if (viewerId) await cleanupUser(viewerId)
    if (subjectId) await cleanupUser(subjectId)
  })

  test('card shows display_name, county, category, and top-3 skills only', async ({
    page,
  }) => {
    test.skip(!hasEnv, 'Supabase env vars not set — skip DB-seeded E2E')

    // Sign in via password (Supabase allows password auth for email+password users)
    await page.goto('/login')
    await page.getByLabel(/email/i).fill(viewerEmail)
    // If magic-link only, the password field may not exist — catch gracefully
    const pwField = page.getByLabel(/password/i)
    if (await pwField.isVisible()) {
      await pwField.fill(viewerPassword)
      await page
        .getByRole('button', { name: /sign in|log in|continue/i })
        .click()
    }
    await page
      .waitForURL(/\/(directory|profile)/, { timeout: 15_000 })
      .catch(() => undefined)

    await page.goto('/directory')
    const card = page
      .getByRole('listitem')
      .filter({ hasText: subjectName })
      .first()
    await expect(card).toBeVisible({ timeout: 10_000 })
    await expect(card).toContainText(subjectName)
    await expect(card).toContainText('Appling County')
    await expect(card).toContainText('Food & Kitchen')
    // Top 3 skills only
    await expect(card).toContainText('baking')
    await expect(card).toContainText('sourdough')
    await expect(card).toContainText('cakes')
    // 4th + 5th skills NOT shown on card
    await expect(card).not.toContainText('pastries')
    await expect(card).not.toContainText('bread')
  })
})
