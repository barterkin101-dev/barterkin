/**
 * Phase 4 — DIR-01 — /directory is publicly browseable (v1.5 fix)
 */
import { test, expect } from '@playwright/test'

test('DIR-01: unauthed user can visit /directory', async ({ page }) => {
  await page.context().clearCookies()
  const response = await page.goto('/directory')
  await expect(page).toHaveURL('/directory')
  expect(response?.ok()).toBeTruthy()
})
