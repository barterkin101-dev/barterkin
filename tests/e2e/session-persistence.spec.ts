import { test, expect } from '@playwright/test'

test.describe('session persistence (AUTH-03)', () => {
  test('session cookie survives a page reload (cookie adapter round-trip)', async ({ browser, baseURL }) => {
    // Create a fresh context — no shared cookie state with other tests.
    const context = await browser.newContext()
    const page = await context.newPage()

    // Seed a synthetic Supabase auth cookie BEFORE any navigation.
    // The exact name Supabase uses is 'sb-<project-ref>-auth-token'. We use a
    // placeholder JWT-shaped value: the middleware only needs to PROPAGATE the
    // cookie on a read-only request — it does NOT need to be a valid JWT for
    // this test. Valid-JWT cases are covered by manual QA.
    const origin = new URL(baseURL || 'http://localhost:3000')
    const projectRef = 'hfdcsickergdcdvejbcw'
    const cookieName = `sb-${projectRef}-auth-token`
    const cookieValue = 'session-persistence-probe-' + Date.now()
    await context.addCookies([
      {
        name: cookieName,
        value: cookieValue,
        domain: origin.hostname,
        path: '/',
        httpOnly: false, // @supabase/ssr reads/writes this via the cookies adapter; not HttpOnly
        secure: origin.protocol === 'https:',
        sameSite: 'Lax',
      },
    ])

    // Load a public page (home) — middleware runs, calls the cookie adapter, should NOT strip the cookie.
    await page.goto('/')
    await page.reload() // the reload is the actual persistence test

    // Assert the cookie is still present after the round-trip through middleware.
    const cookies = await context.cookies(origin.origin)
    const authCookie = cookies.find((cookie) => cookie.name === cookieName)
    expect(authCookie).toBeDefined()
    expect(authCookie?.value).toBe(cookieValue)

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
