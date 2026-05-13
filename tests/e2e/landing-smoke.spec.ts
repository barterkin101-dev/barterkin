import { test, expect } from '@playwright/test'

test.describe('landing smoke (LAND-01, LAND-02, GEO-03)', () => {
  test('landing page renders one of the hero experiment headlines', async ({ page }) => {
    await page.goto('/')
    await expect(page.getByRole('heading', {
      level: 1,
      name: /georgia's community skills exchange|trade skills with your neighbors\. no cash needed\./i,
    })).toBeVisible()
  })

  test('landing page shows honor-system copy (GEO-03)', async ({ page }) => {
    await page.goto('/')
    await expect(page.getByText(/georgia residents only/i).first()).toBeVisible()
  })

  test('hero primary CTA renders the waitlist submit button', async ({ page }) => {
    await page.goto('/')
    await expect(page.getByRole('button', { name: /join the waitlist/i })).toBeVisible()
  })

  test('hero signup link carries the assigned experiment variant', async ({ page }) => {
    await page.goto('/')
    await expect(
      page.getByRole('link', { name: /skip the line and sign up now/i }).first(),
    ).toHaveAttribute('href', /\/signup\?abv=(georgia_community_skills_exchange|trade_skills_neighbors_no_cash)/)
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
