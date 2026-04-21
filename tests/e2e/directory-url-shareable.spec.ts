/**
 * Phase 4 — DIR-06 — Paste a filter URL in a fresh context, same filter state renders
 *
 * Wave 0 stub. Plan 05 wires the real assertions.
 * Auth pattern: see tests/e2e/profile-visibility.spec.ts.
 */
import { test, expect } from '@playwright/test'

test.skip('DIR-06: Paste a filter URL in a fresh context, same filter state renders', async ({ page }) => {
  // TODO Plan 05: set category+county+q, copy URL, open new browser context, paste URL, assert filter UI hydrates with same values and same rows
  await page.goto('/directory')
  await expect(page).toHaveURL(/\/directory/)
})
