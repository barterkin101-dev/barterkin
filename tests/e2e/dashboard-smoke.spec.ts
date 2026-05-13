import { test, expect } from '@playwright/test'

// loginAs helper — uncomment when dashboard-auth tests are added
// async function loginAs(page: Page, email: string, password: string) { ... }

test.describe('DASH-01 — dashboard page', () => {
  test('dashboard redirects unauthenticated user to login', async ({ page }) => {
    await page.goto('/dashboard')
    await expect(page).toHaveURL(/\/login/)
  })
})
