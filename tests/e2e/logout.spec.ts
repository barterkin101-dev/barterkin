import { test, expect } from '@playwright/test'

test.describe('logout (AUTH-05)', () => {
  test('/auth/signout GET returns 405 (POST-only)', async ({ request }) => {
    const response = await request.get('/auth/signout', { maxRedirects: 0 })
    expect(response.status()).toBe(405)
  })

  test('/auth/signout POST returns 303 redirect', async ({ request }) => {
    const response = await request.post('/auth/signout', { maxRedirects: 0 })
    expect([303, 302]).toContain(response.status())
  })

  test.fixme('clicking Log out in footer clears session cookie + redirects', async () => {
    // Needs authed state
  })
})
