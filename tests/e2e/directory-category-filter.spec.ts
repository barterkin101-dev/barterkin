/**
 * Phase 4 — DIR-03 — Selecting a category narrows results and updates ?category= in URL
 *
 * Wave 0 stub. Plan 05 wires the real assertions.
 * Auth pattern: see tests/e2e/profile-visibility.spec.ts.
 */
import { test, expect } from '@playwright/test'

test.skip('DIR-03: Selecting a category narrows results and updates ?category= in URL', async ({ page }) => {
  // TODO Plan 05: visit /directory, open Category Combobox, pick "Arts & Crafts", assert URL contains ?category=arts-crafts AND cards visible all match
  await page.goto('/directory')
  await expect(page).toHaveURL(/\/directory/)
})
