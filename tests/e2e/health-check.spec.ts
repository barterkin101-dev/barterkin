import { test, expect } from '@playwright/test'

test.describe('HEALTH-01 — health check endpoints', () => {
  test('/api/health/simple returns 200 with JSON status', async ({ request }) => {
    const res = await request.get('/api/health/simple')
    expect(res.status()).toBe(200)
    const body = await res.json()
    expect(body).toHaveProperty('status')
    expect(body.status).toMatch(/ok|healthy/i)
    expect(body).toHaveProperty('timestamp')
  })

  test('/api/health returns JSON with status and checks', async ({ request }) => {
    const res = await request.get('/api/health')
    const status = res.status()
    expect(status === 200 || status === 503).toBe(true)
    const body = await res.json()
    expect(body).toHaveProperty('status')
    expect(body).toHaveProperty('timestamp')
    expect(body).toHaveProperty('checks')
    expect(Array.isArray(body.checks)).toBe(true)
    expect(body.checks.length).toBeGreaterThan(0)
    expect(body.checks[0]).toHaveProperty('name')
    expect(body.checks[0]).toHaveProperty('status')
  })

  test('/api/health response has no-cache headers', async ({ request }) => {
    const res = await request.get('/api/health')
    const cacheControl = res.headers()['cache-control'] || ''
    expect(cacheControl).toMatch(/no-cache|no-store|must-revalidate|private/)
  })
})
