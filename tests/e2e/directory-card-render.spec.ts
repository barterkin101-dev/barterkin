/**
 * Phase 4 — DIR-02 — Directory card shows avatar, display_name, county, category, and up-to-3 skill chips
 *
 * Wave 0 stub. Plan 05 wires the real assertions.
 * Auth pattern: see tests/e2e/profile-visibility.spec.ts.
 */
import { test, expect } from '@playwright/test'

test.skip('DIR-02: Directory card shows avatar, display_name, county, category, and up-to-3 skill chips', async ({ page }) => {
  // TODO Plan 05: seed profile with 5 skills, visit /directory, assert first card renders display_name, county name, category name, and exactly 3 skill chips
  await page.goto('/directory')
  await expect(page).toHaveURL(/\/directory/)
})
