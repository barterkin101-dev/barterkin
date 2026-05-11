import { test, expect } from '@playwright/test'

test.describe('CAPTCHA required (AUTH-08)', () => {
  test('Turnstile widget area is present on /login', async ({ page }) => {
    await page.goto('/login')
    // The widget iframe loads from challenges.cloudflare.com; verify the container renders
    // even if Cloudflare doesn't actually serve the iframe in test env.
    // In dev/test without a sitekey, the fallback message is shown instead.
    await expect(
      page.getByText(/protected by cloudflare turnstile/i)
        .or(page.getByText(/Missing NEXT_PUBLIC_TURNSTILE_SITE_KEY/i))
        .first(),
    ).toBeVisible()
  })

  test('Turnstile widget area is present on /signup', async ({ page }) => {
    await page.goto('/signup')
    await expect(
      page.getByText(/protected by cloudflare turnstile/i)
        .or(page.getByText(/Missing NEXT_PUBLIC_TURNSTILE_SITE_KEY/i))
        .first(),
    ).toBeVisible()
  })

  test('magic-link submit is disabled without CAPTCHA', async ({ page }) => {
    await page.goto('/login')
    await page.getByLabel('Email address').fill('user@example.com')
    await expect(page.getByRole('button', { name: /send magic link/i })).toBeDisabled()
  })
})
