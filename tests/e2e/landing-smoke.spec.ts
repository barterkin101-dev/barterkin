import { test, expect } from '@playwright/test'

test.describe('landing smoke (LAND-01, LAND-02, GEO-03)', () => {
  test('landing page renders hero h1 with locked copy', async ({ page }) => {
    await page.goto('/')
    await expect(
      page.getByRole('heading', { level: 1, name: /trade skills with your georgia neighbors/i }),
    ).toBeVisible()
  })

  test('landing page shows honor-system copy (GEO-03)', async ({ page }) => {
    await page.goto('/')
    await expect(page.getByText(/georgia residents only/i).first()).toBeVisible()
  })

  test('hero primary CTA links to /signup', async ({ page }) => {
    await page.goto('/')
    await expect(
      page.getByRole('link', { name: /join the network/i }).first(),
    ).toHaveAttribute('href', '/signup')
  })

  test('hero secondary CTA links to /directory', async ({ page }) => {
    await page.goto('/')
    await expect(
      page.getByRole('link', { name: /browse the directory/i }).first(),
    ).toHaveAttribute('href', '/directory')
  })

  test('how-it-works section renders 3 steps', async ({ page }) => {
    await page.goto('/')
    await expect(page.getByRole('heading', { name: /three steps to your first trade/i })).toBeVisible()
    await expect(page.getByRole('heading', { name: /list what you offer/i })).toBeVisible()
    await expect(page.getByRole('heading', { name: /browse your neighbors/i })).toBeVisible()
    await expect(page.getByRole('heading', { name: /reach out and trade/i })).toBeVisible()
  })

  test('footer legal links still present on /', async ({ page }) => {
    await page.goto('/')
    const footer = page.locator('footer')
    await expect(footer).toBeVisible()
    await expect(footer.getByRole('link', { name: /terms/i })).toBeVisible()
    await expect(footer.getByRole('link', { name: /privacy/i })).toBeVisible()
    await expect(footer.getByRole('link', { name: /guidelines/i })).toBeVisible()
  })
})
