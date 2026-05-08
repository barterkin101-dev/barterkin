import { test, expect } from '@playwright/test'

test.describe('LIST-SMOKE — Listings public browse', () => {
  test('listings page loads with correct title', async ({ page }) => {
    await page.goto('/listings')
    await expect(page).toHaveTitle(/Barterkin/)
  })

  test('listings page shows search and filters', async ({ page }) => {
    await page.goto('/listings')
    await expect(page.getByPlaceholder(/search/i)).toBeVisible()
    await expect(page.getByRole('combobox').first()).toBeVisible()
  })

  test('listing detail page loads for a valid id', async ({ page }) => {
    // Use a random UUID — the page should show "not found" gracefully
    await page.goto('/listings/00000000-0000-0000-0000-000000000000')
    await expect(page.getByText(/could not be found/i)).toBeVisible()
  })
})
