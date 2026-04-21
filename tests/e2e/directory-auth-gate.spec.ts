/**
 * Phase 4 — DIR-01 — unauthed visit to /directory redirects to /login; authed+verified user reaches the page
 *
 * Wave 0 stub. Plan 05 wires the real assertions.
 * Auth pattern: see tests/e2e/profile-visibility.spec.ts.
 */
import { test, expect } from '@playwright/test'

test.skip('DIR-01: unauthed visit to /directory redirects to /login; authed+verified user reaches the page', async ({ page }) => {
  // TODO Plan 05: sign out, visit /directory, assert redirect to /login; then sign in as verified user, assert /directory renders
  await page.goto('/directory')
  await expect(page).toHaveURL(/\/directory/)
})
