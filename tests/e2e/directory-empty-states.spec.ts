/**
 * Phase 4 — DIR-08 — Empty state on 0 profiles; zero-results on 0 matches with active filters
 *
 * Wave 0 stub. Plan 05 wires the real assertions.
 * Auth pattern: see tests/e2e/profile-visibility.spec.ts.
 */
import { test, expect } from '@playwright/test'

test.skip('DIR-08: Empty state on 0 profiles; zero-results on 0 matches with active filters', async ({ page }) => {
  // TODO Plan 05: (a) no profiles, visit /directory, assert "Nobody's here yet." heading + "Build your profile" CTA; (b) add ?category=<slug-with-no-profiles>, assert "No profiles match those filters." + "Clear filters" CTA
  await page.goto('/directory')
  await expect(page).toHaveURL(/\/directory/)
})
