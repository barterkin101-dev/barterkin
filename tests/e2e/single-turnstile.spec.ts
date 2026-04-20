import { test, expect } from '@playwright/test'

test.describe('UAT Gap 1: single Turnstile per auth page', () => {
  test('/login renders exactly one Turnstile container', async ({ page }) => {
    await page.goto('/login')
    // @marsidev/react-turnstile renders div#cf-turnstile as the widget container.
    // In production with a live sitekey, Cloudflare loads an iframe + hidden input inside it.
    // In headless/offline, the outer #cf-turnstile div is still rendered (hidden input present).
    // We count these containers to verify exactly one widget is mounted per page.
    const widgetCount = await page.evaluate(() => {
      // The rendered Turnstile container
      const cfContainers = document.querySelectorAll('div#cf-turnstile')
      // Fallback for missing sitekey (dev mode without .env.local)
      const fallback = Array.from(document.querySelectorAll('div')).filter((d) =>
        (d.textContent || '').includes('Missing NEXT_PUBLIC_TURNSTILE_SITE_KEY'),
      ).length
      // Real Cloudflare iframes (only in online prod with valid sitekey)
      const iframes = document.querySelectorAll('iframe[src*="challenges.cloudflare.com"]')
      return cfContainers.length + fallback + iframes.length
    })
    expect(widgetCount).toBe(1)
  })

  test('/signup renders exactly one Turnstile container', async ({ page }) => {
    await page.goto('/signup')
    const widgetCount = await page.evaluate(() => {
      const cfContainers = document.querySelectorAll('div#cf-turnstile')
      const fallback = Array.from(document.querySelectorAll('div')).filter((d) =>
        (d.textContent || '').includes('Missing NEXT_PUBLIC_TURNSTILE_SITE_KEY'),
      ).length
      const iframes = document.querySelectorAll('iframe[src*="challenges.cloudflare.com"]')
      return cfContainers.length + fallback + iframes.length
    })
    expect(widgetCount).toBe(1)
  })
})
