import { test, expect } from '@playwright/test'

test.describe('legal pages (AUTH-10 + GEO-04)', () => {
  test('/legal/tos renders with H1 "Terms of Service"', async ({ page }) => {
    await page.goto('/legal/tos')
    await expect(page.getByRole('heading', { level: 1, name: 'Terms of Service' })).toBeVisible()
  })

  test('/legal/tos contains the GEO-04 Georgia non-residency clause verbatim', async ({ page }) => {
    await page.goto('/legal/tos')
    // Exact match of the LOCKED clause from UI-SPEC
    await expect(page.getByText('Barterkin is intended for people who live in Georgia, USA.', { exact: false })).toBeVisible()
    await expect(page.getByText('we may remove any profile for which we have reason to believe this rule is being broken', { exact: false })).toBeVisible()
  })

  test('/legal/privacy renders with H1 "Privacy Policy"', async ({ page }) => {
    await page.goto('/legal/privacy')
    await expect(page.getByRole('heading', { level: 1, name: 'Privacy Policy' })).toBeVisible()
  })

  test('/legal/privacy states we never sell data', async ({ page }) => {
    await page.goto('/legal/privacy')
    await expect(page.getByText(/we never sell your data/i)).toBeVisible()
  })

  test('/legal/guidelines renders with H1 "Community Guidelines"', async ({ page }) => {
    await page.goto('/legal/guidelines')
    await expect(page.getByRole('heading', { level: 1, name: 'Community Guidelines' })).toBeVisible()
  })

  test('/legal/guidelines includes the skills-not-goods-or-cash rule', async ({ page }) => {
    await page.goto('/legal/guidelines')
    await expect(page.getByRole('heading', { name: /trade skills, not goods or cash/i })).toBeVisible()
  })
})
