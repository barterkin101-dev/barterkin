/**
 * Phase 4 — DIR-04 — Selecting a county narrows results and updates ?county= in URL
 *
 * Wave 0 stub. Plan 05 wires the real assertions.
 * Auth pattern: see tests/e2e/profile-visibility.spec.ts.
 */
import { test, expect } from '@playwright/test'

test.skip('DIR-04: Selecting a county narrows results and updates ?county= in URL', async ({ page }) => {
  // TODO Plan 05: visit /directory, open County Combobox, pick "Fulton County", assert URL ?county=<fips> AND cards all match
  await page.goto('/directory')
  await expect(page).toHaveURL(/\/directory/)
})
