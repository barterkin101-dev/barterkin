import { test, expect } from '@playwright/test'

test.describe('footer links (AUTH-10 + UI-SPEC)', () => {
  const routes = ['/', '/login', '/signup', '/legal/tos', '/legal/privacy', '/legal/guidelines', '/verify-pending']

  for (const route of routes) {
    test(`footer shows legal links on ${route}`, async ({ page }) => {
      await page.goto(route)
      // Footer lives in root layout; renders on every route
      const footer = page.locator('footer')
      await expect(footer).toBeVisible()
      await expect(footer.getByRole('link', { name: /terms/i })).toBeVisible()
      await expect(footer.getByRole('link', { name: /privacy/i })).toBeVisible()
      await expect(footer.getByRole('link', { name: /community guidelines/i })).toBeVisible()
    })
  }

  test('footer shows Sign in link when unauthed on /', async ({ page }) => {
    await page.goto('/')
    const footer = page.locator('footer')
    await expect(footer.getByRole('link', { name: /sign in/i })).toBeVisible()
  })

  test.fixme('footer shows Log out button when authed', async () => {})
})
