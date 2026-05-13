import { test, expect } from '@playwright/test'

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
    const cta = page.getByRole('button', { name: /join the waitlist/i })
    const box = await cta.boundingBox()
    expect(box?.height).toBeGreaterThanOrEqual(44)
  })

  test('hero secondary CTA ≥ 44px tap target', async ({ page }) => {
    await page.goto('/')
    const cta = page.getByRole('link', { name: /skip the line and sign up now/i }).first()
    const box = await cta.boundingBox()
    expect(box?.height).toBeGreaterThanOrEqual(44)
  })
})
