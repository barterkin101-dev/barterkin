import { test, expect } from '@playwright/test'

test.describe('verify-pending (AUTH-04)', () => {
  test('/verify-pending renders "One more step" heading', async ({ page }) => {
    await page.goto('/verify-pending')
    await expect(page.getByRole('heading', { name: 'One more step' })).toBeVisible()
  })

  test('/verify-pending renders Resend verification link button', async ({ page }) => {
    await page.goto('/verify-pending')
    await expect(
      page.getByRole('link', { name: /resend verification link/i }).or(
        page.getByRole('button', { name: /resend verification link/i }),
      ),
    ).toBeVisible()
  })

  test('/verify-pending contains contact@barterkin.com link', async ({ page }) => {
    await page.goto('/verify-pending')
    const link = page.getByRole('link', { name: /email contact@barterkin.com/i })
    await expect(link).toHaveAttribute('href', 'mailto:contact@barterkin.com')
  })

  // Full middleware redirect test requires an authed-unverified session.
  test.fixme('authed-but-unverified user is redirected from /directory to /verify-pending', async () => {})
})
