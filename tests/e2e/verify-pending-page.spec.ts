import { test, expect } from '@playwright/test'

test.describe('VERIFY-01 — verify pending page', () => {
  test('/verify-pending renders for unauthenticated user', async ({ page }) => {
    await page.goto('/verify-pending')
    await expect(page.getByRole('heading', { name: /one more step/i })).toBeVisible()
    await expect(page.getByText(/we sent a verification link/i)).toBeVisible()
  })

  test('/verify-pending has resend link button', async ({ page }) => {
    await page.goto('/verify-pending')
    await expect(page.getByRole('link', { name: /resend verification link/i })).toBeVisible()
  })
})
