import { test, expect } from '@playwright/test'

test.describe('county typeahead (PROF-05, GEO-02)', () => {
  test.fixme('combobox renders on /profile/edit', async ({ page }) => {
    await page.goto('/profile/edit')
    await expect(page.getByRole('combobox', { name: /county/i })).toBeVisible()
  })
  test.fixme('typing "Appling" filters to Appling County', async () => {})
  test.fixme('selecting a county closes the popover and shows the county name', async () => {})
  test.fixme('popover lists "Fulton County" and "Worth County" (boundary checks)', async () => {})
})
