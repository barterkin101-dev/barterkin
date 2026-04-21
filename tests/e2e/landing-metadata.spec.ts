import { test, expect } from '@playwright/test'

test.describe('landing metadata (LAND-04)', () => {
  test('renders og:title meta tag', async ({ page }) => {
    await page.goto('/')
    await expect(page.locator('meta[property="og:title"]'))
      .toHaveAttribute('content', /barterkin.*georgia/i)
  })

  test('renders og:description meta tag', async ({ page }) => {
    await page.goto('/')
    await expect(page.locator('meta[property="og:description"]'))
      .toHaveAttribute('content', /find georgians with skills to trade/i)
  })

  test('renders og:image with absolute URL (metadataBase applied)', async ({ page }) => {
    await page.goto('/')
    const content = await page.locator('meta[property="og:image"]').first().getAttribute('content')
    expect(content).toBeTruthy()
    expect(content).toMatch(/^https?:\/\//)
  })

  test('twitter card = summary_large_image', async ({ page }) => {
    await page.goto('/')
    await expect(page.locator('meta[name="twitter:card"]'))
      .toHaveAttribute('content', 'summary_large_image')
  })

  test('manifest.webmanifest returns 200 with forest theme_color', async ({ request }) => {
    const resp = await request.get('/manifest.webmanifest')
    expect(resp.status()).toBe(200)
    const json = await resp.json()
    expect(json.theme_color).toBe('#2d5a27')
    expect(json.background_color).toBe('#eef3e8')
  })

  test('opengraph image asset returns 200', async ({ request }) => {
    const resp = await request.get('/opengraph-image')
    expect(resp.status()).toBe(200)
    expect(resp.headers()['content-type']).toMatch(/image\/(png|jpeg)/)
  })
})
