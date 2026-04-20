import { test, expect } from '@playwright/test'

test.describe('UAT Gap 3: ResendLinkButton on /verify-pending', () => {
  test('unauthed visitor: button navigates to /login (no empty ?email= param)', async ({ page }) => {
    await page.goto('/verify-pending')

    const button = page.getByRole('link', { name: /resend verification link/i })
    await expect(button).toBeVisible()

    // Critical: href must be '/login' exactly — NEVER '/login?email=' or '/login?email=your%20inbox'
    const href = await button.getAttribute('href')
    expect(href).toBe('/login')

    await button.click()
    await expect(page).toHaveURL(/\/login(\?|$)/)
    // The form's email input should NOT be prefilled with garbage
    const emailInput = page.getByLabel('Email address')
    await expect(emailInput).toBeVisible()
    await expect(emailInput).toHaveValue('')
  })

  test('button is rendered as a real navigable link, not a non-functional button', async ({ page }) => {
    await page.goto('/verify-pending')
    // The asChild pattern means the rendered element should be an <a> (from next/link),
    // not a <button>. This guards against the original UAT Gap 3 symptom (button does nothing).
    const link = page.getByRole('link', { name: /resend verification link/i })
    await expect(link).toBeVisible()
    const tagName = await link.evaluate((el) => el.tagName.toLowerCase())
    expect(tagName).toBe('a')
  })
})
