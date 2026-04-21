import { test, expect } from '@playwright/test'
import {
  createVerifiedUser,
  seedPublishedProfile,
  cleanupUser,
} from './fixtures/directory-seed'

const hasEnv =
  !!process.env.NEXT_PUBLIC_SUPABASE_URL &&
  !!process.env.SUPABASE_SERVICE_ROLE_KEY

test.describe('landing founding-member strip (LAND-02)', () => {
  test('empty-state shows when zero founding members seeded', async ({ page }) => {
    test.skip(!hasEnv, 'Supabase env vars not set — skip DB-seeded E2E')
    await page.goto('/')
    // This branch runs when the DB has no founding_member=true profiles.
    // If the strip is populated in this env, this test is skipped inline.
    const hasCards = await page.getByRole('heading', { name: /meet the first georgians on barterkin/i })
      .isVisible()
      .catch(() => false)
    if (!hasCards) {
      await expect(page.getByRole('heading', { name: /be a founding member/i })).toBeVisible()
      await expect(page.getByRole('link', { name: /claim your spot/i }).first())
        .toHaveAttribute('href', '/signup')
    } else {
      test.skip(true, 'Founding members seeded in this env — populated branch covered separately')
    }
  })

  test('populated strip renders seeded founding member card', async ({ page }) => {
    test.skip(!hasEnv, 'Supabase env vars not set — skip DB-seeded E2E')
    const stamp = Date.now()
    const subjectId = await createVerifiedUser(`land-founder-${stamp}@example.test`, 'TestPass123!')
    await seedPublishedProfile({
      ownerId: subjectId,
      display_name: `Landing Founder ${stamp}`,
      category_id: 2,
      county_id: 13001,
      skills: ['sourdough', 'cakes', 'bread'],
      founding_member: true,
    })
    try {
      await page.goto('/')
      await expect(page.getByText(`Landing Founder ${stamp}`)).toBeVisible({ timeout: 10_000 })
      await expect(page.getByText(/founding member/i).first()).toBeVisible()
    } finally {
      await cleanupUser(subjectId)
    }
  })
})
