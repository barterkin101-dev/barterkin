import { test, expect } from '@playwright/test'

test.describe('session persistence (AUTH-03)', () => {
  test('non-auth cookie survives a page reload through middleware (cookie adapter passthrough)', async ({ browser, baseURL }) => {
    // Create a fresh context — no shared cookie state with other tests.
    const context = await browser.newContext()
    const page = await context.newPage()

    // Use a non-Supabase cookie to verify the middleware does not strip arbitrary
    // cookies. The Supabase auth cookie (`sb-<ref>-auth-token`) is actively
    // rewritten/cleared by @supabase/ssr when the value is not a valid JWT —
    // that behaviour is correct and by design. Verifying that a real Supabase
    // session cookie persists 30 days requires a live signInWithOtp round-trip
    // (blocked by Turnstile in automated tests); that is covered by manual QA.
    const origin = new URL(baseURL || 'http://localhost:3000')
    const cookieName = 'barterkin-e2e-probe'
    const cookieValue = 'persistence-probe-' + Date.now()
    await context.addCookies([
      {
        name: cookieName,
        value: cookieValue,
        domain: origin.hostname,
        path: '/',
        httpOnly: false,
        secure: origin.protocol === 'https:',
        sameSite: 'Lax',
      },
    ])

    // Load a public page — middleware runs the cookie adapter; non-auth cookies
    // must be left untouched.
    await page.goto('/')
    await page.reload()

    // Assert the cookie is still present after the round-trip through middleware.
    const cookies = await context.cookies(origin.origin)
    const probeCookie = cookies.find((cookie) => cookie.name === cookieName)
    expect(probeCookie).toBeDefined()
    expect(probeCookie?.value).toBe(cookieValue)

    await context.close()
  })

  // The 30-day cookie-max-age is set server-side by @supabase/ssr when a real
  // session is created. Unit-level: Phase 1 SUMMARY records the cookie options
  // (maxAge = 30d). E2E-level: requires a live signInWithOtp round-trip, which
  // this Phase 2 test suite does NOT automate (see captcha-required.spec.ts
  // for why Turnstile bypass is out of scope). Manual QA verifies 30-day
  // persistence by inspecting the cookie's Expires attribute in DevTools.
  test.fixme('authed session age ≥ 30 days supported by cookie config', async () => {})
})
