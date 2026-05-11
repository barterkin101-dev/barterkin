import { test, expect, Page } from '@playwright/test'

async function loginAs(page: Page, email: string, password: string) {
  await page.goto('/login')
  await page.getByLabel(/email/i).fill(email)
  const pwField = page.getByLabel(/password/i)
  if (await pwField.isVisible({ timeout: 3000 }).catch(() => false)) {
    await pwField.fill(password)
    await page.getByRole('button', { name: /sign in|log in|continue/i }).click()
  }
  await page.waitForURL(/\/(directory|profile|admin|m\/)/, { timeout: 15_000 }).catch(() => undefined)
}

test.describe('DASH-01 — dashboard page', () => {
  test('dashboard redirects unauthenticated user to login', async ({ page }) => {
    await page.goto('/dashboard')
    await expect(page).toHaveURL(/\/login/)
  })
})
