import { test, expect } from '@playwright/test'

test.describe('smoke', () => {
  test('home page renders Barterkin foundation card', async ({ page }) => {
    await page.goto('/')
    await expect(page.getByText('Barterkin foundation')).toBeVisible()
  })

  test('fire test event button is present', async ({ page }) => {
    await page.goto('/')
    await expect(page.getByRole('button', { name: /fire posthog test_event/i })).toBeVisible()
  })
})
