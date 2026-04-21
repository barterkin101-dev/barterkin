/**
 * Phase 4 — DIR-05 — Keyword "baking" matches; typo "bakng" also matches via pg_trgm
 *
 * Wave 0 stub. Plan 05 wires the real assertions.
 * Auth pattern: see tests/e2e/profile-visibility.spec.ts.
 */
import { test, expect } from '@playwright/test'

test.skip('DIR-05: Keyword "baking" matches; typo "bakng" also matches via pg_trgm', async ({ page }) => {
  // TODO Plan 05: seed profile with skill "baking"; type "baking" in search, wait 400ms, assert match; clear, type "bakng", assert still matches
  await page.goto('/directory')
  await expect(page).toHaveURL(/\/directory/)
})
