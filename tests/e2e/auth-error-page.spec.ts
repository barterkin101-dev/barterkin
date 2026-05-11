import { test, expect } from '@playwright/test'

test.describe('AUTH-11 — auth error page', () => {
  test('/auth/error renders with error heading', async ({ page }) => {
    await page.goto('/auth/error')
    await expect(page.getByRole('heading', { name: /something went wrong/i })).toBeVisible()
  })

  test('/auth/error has link back to login', async ({ page }) => {
    await page.goto('/auth/error')
    await expect(page.getByRole('link', { name: /back to sign.in/i })).toBeVisible()
  })
})
