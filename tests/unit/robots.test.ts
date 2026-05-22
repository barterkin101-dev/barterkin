import { describe, expect, it } from 'vitest'

describe('robots', () => {
  it('returns allow all with sitemap reference', async () => {
    const { default: robots } = await import('@/app/robots')
    const result = robots()

    expect(result.rules).toEqual({
      userAgent: '*',
      allow: '/',
      disallow: [
        '/dashboard',
        '/admin',
        '/api',
        '/auth',
        '/verify-pending',
        '/profile/edit',
        '/~offline',
      ],
    })
    expect(result.sitemap).toBe('https://www.barterkin.com/sitemap.xml')
  })

  it('uses NEXT_PUBLIC_SITE_URL when set', async () => {
    process.env.NEXT_PUBLIC_SITE_URL = 'https://barterkin.com'
    const { default: robots } = await import('@/app/robots')
    const result = robots()

    expect(result.sitemap).toBe('https://barterkin.com/sitemap.xml')
    delete process.env.NEXT_PUBLIC_SITE_URL
  })
})
