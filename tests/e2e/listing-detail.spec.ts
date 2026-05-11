import { test, expect } from '@playwright/test'

test.describe('LIST-02 — public listing detail page', () => {
  test('non-existent listing returns 404 page', async ({ page }) => {
    await page.goto('/listings/00000000-0000-0000-0000-000000000000')
    await expect(page.getByText(/doesn't exist or may have been removed/i)).toBeVisible()
  })

  test('listing detail page has correct title structure', async ({ page }) => {
    await page.goto('/listings/00000000-0000-0000-0000-000000000000')
    await expect(page).toHaveTitle(/Barterkin/)
  })
})
