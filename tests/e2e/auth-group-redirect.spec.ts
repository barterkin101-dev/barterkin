import { test, expect } from '@playwright/test'

test.describe('auth-group redirect (AUTH-09)', () => {
  test('unauthed user visiting /login sees the login page', async ({ page }) => {
    await page.goto('/login')
    await expect(page).toHaveURL(/\/login$/)
    // Card title is a div[data-slot=card-title], not a semantic heading — use getByText
    await expect(page.getByText(/welcome to barterkin/i)).toBeVisible()
  })

  test('unauthed user visiting /signup sees the signup page', async ({ page }) => {
    await page.goto('/signup')
    await expect(page).toHaveURL(/\/signup$/)
  })

  test.fixme('authed user visiting /login is redirected to /directory', async () => {})
  test.fixme('authed user visiting /signup is redirected to /directory', async () => {})
})
