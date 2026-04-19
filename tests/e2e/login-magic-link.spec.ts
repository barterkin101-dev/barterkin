import { test, expect } from '@playwright/test'

test.describe('login — magic link (AUTH-02)', () => {
  test('email input renders on /login', async ({ page }) => {
    await page.goto('/login')
    await expect(page.getByLabel('Email address')).toBeVisible()
  })

  test('submit button labeled "Send magic link"', async ({ page }) => {
    await page.goto('/login')
    await expect(page.getByRole('button', { name: /send magic link/i })).toBeVisible()
  })

  test('submit button is disabled without CAPTCHA completion', async ({ page }) => {
    await page.goto('/login')
    const button = page.getByRole('button', { name: /send magic link/i })
    await expect(button).toBeDisabled()
  })

  // Full end-to-end "Check your email" state requires Turnstile to actually pass;
  // marking as fixme — needs a Turnstile test mode or widget bypass in test env.
  test.fixme('after valid submit, shows "Check your email" confirmation', async () => {
    // Needs: Turnstile test mode + mocked sendMagicLink response
  })

  test.fixme('submitting @mailinator.com shows disposable-email error copy', async () => {
    // Needs: Turnstile bypass in test env to actually trigger server action
  })
})
