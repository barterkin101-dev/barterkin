import { test, expect } from '@playwright/test'

test.describe('Onboarding redirect + wizard route (D-02, D-03, D-10, D-16)', () => {
  // Live test — /onboarding route must respond once Plan 02 builds the page.
  // Until Plan 02 lands, this test will fail with 404; accepted as Wave 0 red.
  test('/onboarding responds with 200 (not 404)', async ({ page }) => {
    const response = await page.goto('/onboarding')
    // The middleware will redirect unauth users to /login — either 200 or a redirect chain is fine;
    // what we are asserting is NOT a 404 server error.
    expect(response?.status()).toBeLessThan(400)
  })

  test.fixme('D-02: authed + verified user with NULL onboarding_completed_at is redirected to /onboarding', async () => {})
  test.fixme('D-10: user with onboarding_completed_at set is NOT redirected to /onboarding', async () => {})
  test.fixme('D-02 loop: /onboarding itself does not redirect back to /onboarding', async () => {})
  test.fixme('D-03: Skip-for-now CTA navigates to /directory', async () => {})
  test.fixme('D-16: Skip-for-now does NOT set onboarding_completed_at (timestamp stays NULL)', async () => {})
  test.fixme('D-11: viewing Step 3 sets onboarding_completed_at to a timestamp', async () => {})
})
