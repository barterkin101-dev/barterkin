import { test, expect } from '@playwright/test'

test.describe('CAPTCHA required (AUTH-08)', () => {
  test('Turnstile widget area is present on /login', async ({ page }) => {
    await page.goto('/login')
    // The widget iframe loads from challenges.cloudflare.com; verify the container renders
    // even if Cloudflare doesn't actually serve the iframe in test env.
    await expect(page.getByText(/protected by cloudflare turnstile/i)).toBeVisible()
  })

  test('Turnstile widget area is present on /signup', async ({ page }) => {
    await page.goto('/signup')
    await expect(page.getByText(/protected by cloudflare turnstile/i)).toBeVisible()
  })

  test('magic-link submit is disabled without CAPTCHA', async ({ page }) => {
    await page.goto('/login')
    await page.getByLabel('Email address').fill('user@example.com')
    await expect(page.getByRole('button', { name: /send magic link/i })).toBeDisabled()
  })
})
