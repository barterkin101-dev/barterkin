import { test, expect } from '@playwright/test'

test.describe('profile editor (PROF-01..PROF-12, D-01..D-04)', () => {
  test('unauthenticated visitor to /profile/edit is redirected to /login', async ({ page }) => {
    await page.goto('/profile/edit')
    await expect(page).toHaveURL(/\/login/)
  })

  test.fixme('renders all 5 form sections in order', async ({ page }) => {
    // Requires authenticated + verified storageState fixture
    await page.goto('/profile/edit')
    await expect(page.getByRole('heading', { name: 'Basic info', level: 2 })).toBeVisible()
    await expect(page.getByRole('heading', { name: 'Skills I offer', level: 2 })).toBeVisible()
    await expect(page.getByRole('heading', { name: 'Skills I want', level: 2 })).toBeVisible()
    await expect(page.getByRole('heading', { name: 'Location & category', level: 2 })).toBeVisible()
    await expect(page.getByRole('heading', { name: 'Preferences', level: 2 })).toBeVisible()
  })

  test.fixme('+ Add skill adds a row up to 5, then disables', async () => {
    // Requires auth fixture
  })
  test.fixme('bio character counter flips to destructive at 500/500', async () => {})
  test.fixme('save shows "Profile saved." toast (D-04)', async () => {})
  test.fixme('tiktok handle without @ prefix shows inline error', async () => {})
})
