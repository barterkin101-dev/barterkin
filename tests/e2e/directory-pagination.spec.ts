/**
 * Phase 4 — DIR-07 — Previous disabled on page 1, Next disabled on last page, 20 per page
 *
 * Wave 0 stub. Plan 05 wires the real assertions.
 * Auth pattern: see tests/e2e/profile-visibility.spec.ts.
 */
import { test, expect } from '@playwright/test'

test.skip('DIR-07: Previous disabled on page 1, Next disabled on last page, 20 per page', async ({ page }) => {
  // TODO Plan 05: seed 25+ profiles, visit /directory, assert 20 cards, assert Previous disabled, click Next, assert URL ?page=2 AND 5 cards visible
  await page.goto('/directory')
  await expect(page).toHaveURL(/\/directory/)
})
