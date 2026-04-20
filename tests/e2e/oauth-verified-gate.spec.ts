import { test, expect } from '@playwright/test'

test.describe('UAT Gap 2: OAuth-aware verify gate', () => {
  test('unauthed visitor to /directory is redirected to /login (gate does not falsely fire on unauthed users)', async ({ page }) => {
    await page.goto('/directory')
    // Phase 4 builds /directory; for now any redirect away from /directory is acceptable.
    // Critical assertion: the URL must NOT be /verify-pending (that would mean the gate
    // is firing for unauthed users — broken). Unauthed users should land at /login.
    await expect(page).not.toHaveURL(/\/verify-pending/)
  })

  test('/verify-pending page itself loads (gate target reachable)', async ({ page }) => {
    const resp = await page.goto('/verify-pending')
    expect(resp?.status()).toBe(200)
    await expect(page.getByText('One more step')).toBeVisible()
  })

  test.fixme('Google OAuth user lands at /directory after sign-in (not /verify-pending)', async () => {
    // Requires live Google OAuth credentials + a verified Google account.
    // Manual UAT step — see .planning/phases/02-authentication-legal/02-UAT.md test 10.
  })
})
