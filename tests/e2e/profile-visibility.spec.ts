import { test, expect } from '@playwright/test'

test.describe('profile visibility RLS (PROF-13, PROF-14, D-09)', () => {
  test('/m/[username] redirects unauthenticated visitor to /login (D-09)', async ({ page }) => {
    await page.goto('/m/nonexistent-user')
    await expect(page).toHaveURL(/\/login/)
  })

  test('/profile redirects unauthenticated visitor to /login', async ({ page }) => {
    await page.goto('/profile')
    await expect(page).toHaveURL(/\/login/)
  })

  test.fixme(
    "/m/[username] shows \"This profile isn't available.\" for nonexistent username (PROF-13/PROF-14)",
    async ({ page }) => {
      // Needs authenticated + verified storageState fixture
      await page.goto('/m/nonexistent-user-9999')
      await expect(page.getByRole('heading', { name: /isn.?t available/i })).toBeVisible()
      await expect(page.getByRole('link', { name: 'Go to directory' })).toBeVisible()
    },
  )

  test.fixme(
    '/m/[username] shows ProfileCard for published verified non-banned profile (PROF-14)',
    async () => {},
  )
  test.fixme(
    '/m/[username] returns not-available for unpublished profile (PROF-13)',
    async () => {},
  )
  test.fixme(
    '/m/[username] returns not-available for banned profile (PROF-13 + TRUST-03)',
    async () => {},
  )
  test.fixme(
    '/profile own view shows PublishToggle disabled when profile is incomplete (PROF-12)',
    async () => {},
  )
  test.fixme(
    '/profile own view: toggling Publish when complete fires "Profile published." toast (PROF-10, PROF-11)',
    async () => {},
  )
})
