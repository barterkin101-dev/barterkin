/**
 * Phase 4 — DIR-01 — unauthed visit to /directory redirects to /login
 */
import { test, expect } from '@playwright/test'

test('DIR-01: unauthed user visiting /directory is redirected to /login', async ({
  page,
}) => {
  // Clear all cookies to ensure no session
  await page.context().clearCookies()
  const response = await page.goto('/directory')
  // Middleware redirects unauthenticated visitors to /login
  await expect(page).toHaveURL(/\/login(\?.*)?$/)
  expect(response?.ok()).toBeTruthy()
})
