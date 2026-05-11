import { test, expect } from '@playwright/test'

test.describe('OFFLINE-01 — offline fallback page', () => {
  test('/~offline renders with helpful message', async ({ page }) => {
    await page.goto('/~offline')
    await expect(page.getByRole('heading', { name: /you.re offline/i })).toBeVisible()
    await expect(page.getByText(/Barterkin will be back when your connection returns/i)).toBeVisible()
  })
})
