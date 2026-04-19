import { test, expect } from '@playwright/test'

test.describe('login — Google OAuth (AUTH-01)', () => {
  test('Continue with Google button renders on /login', async ({ page }) => {
    await page.goto('/login')
    await expect(page.getByRole('button', { name: /continue with google/i })).toBeVisible()
  })

  test('Continue with Google button renders on /signup', async ({ page }) => {
    await page.goto('/signup')
    await expect(page.getByRole('button', { name: /continue with google/i })).toBeVisible()
  })

  test('Continue with Google button is disabled until Turnstile passes', async ({ page }) => {
    await page.goto('/login')
    const button = page.getByRole('button', { name: /continue with google/i })
    await expect(button).toBeDisabled()
  })

  // Full redirect to accounts.google.com requires a live Turnstile + live Supabase;
  // not worth mocking in E2E. Manual QA covers this.
  test.fixme('clicking the button initiates a redirect to accounts.google.com', async () => {})
})
