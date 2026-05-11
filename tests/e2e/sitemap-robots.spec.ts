import { test, expect } from '@playwright/test'

test.describe('META-01 — sitemap and robots', () => {
  test('/sitemap.xml returns valid XML with URLs', async ({ request }) => {
    const res = await request.get('/sitemap.xml')
    expect(res.status()).toBe(200)
    const body = await res.text()
    expect(body).toContain('<urlset')
    expect(body).toContain('<url>')
    expect(body).toContain('</urlset>')
  })

  test('/robots.txt returns crawl rules', async ({ request }) => {
    const res = await request.get('/robots.txt')
    expect(res.status()).toBe(200)
    const body = await res.text()
    expect(body).toContain('User-Agent:')
    expect(body).toContain('Allow: /')
    expect(body).toContain('Sitemap:')
  })
})
