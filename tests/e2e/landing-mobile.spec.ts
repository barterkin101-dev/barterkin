import { test, expect, devices } from '@playwright/test'

test.use({ ...devices['iPhone SE'] })

test.describe('landing mobile (LAND-03)', () => {
  test('no horizontal scroll at iPhone SE viewport', async ({ page }) => {
    await page.goto('/')
    const hasHScroll = await page.evaluate(
      () => document.documentElement.scrollWidth > document.documentElement.clientWidth,
    )
    expect(hasHScroll).toBe(false)
  })

  test('hero primary CTA ≥ 44px tap target', async ({ page }) => {
    await page.goto('/')
    const cta = page.getByRole('link', { name: /join the network/i }).first()
    const box = await cta.boundingBox()
    expect(box?.height).toBeGreaterThanOrEqual(44)
  })

  test('hero secondary CTA ≥ 44px tap target', async ({ page }) => {
    await page.goto('/')
    const cta = page.getByRole('link', { name: /browse the directory/i }).first()
    const box = await cta.boundingBox()
    expect(box?.height).toBeGreaterThanOrEqual(44)
  })
})
