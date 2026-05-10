import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { runHealthChecks, type HealthReport } from '@/lib/health-check'

describe('runHealthChecks', () => {
  const originalEnv = { ...process.env }

  beforeEach(() => {
    vi.resetAllMocks()
    // Mock fetch for Supabase and Resend checks
    global.fetch = vi.fn()
  })

  afterEach(() => {
    process.env = { ...originalEnv }
    vi.restoreAllMocks()
  })

  it('returns healthy when all dependencies are up', async () => {
    process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://test.supabase.co'
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY = 'test-key'
    process.env.UPSTASH_REDIS_REST_URL = 'https://test-redis.upstash.io'
    process.env.UPSTASH_REDIS_REST_TOKEN = 'test-token'
    process.env.RESEND_API_KEY = 'test-resend-key'

    // Mock Supabase HEAD request
    vi.mocked(fetch).mockImplementation(async (url: string | Request | URL) => {
      const urlStr = typeof url === 'string' ? url : url.toString()
      if (urlStr.includes('supabase')) {
        return { ok: true, status: 200 } as Response
      }
      if (urlStr.includes('resend')) {
        return { ok: true, status: 200 } as Response
      }
      return { ok: false, status: 404 } as Response
    })

    // Mock Redis module
    vi.doMock('@upstash/redis', () => ({
      Redis: class {
        async ping() { return 'PONG' }
      }
    }))

    const report = await runHealthChecks()

    expect(report.status).toBe('healthy')
    expect(report.checks).toHaveLength(3)
    expect(report.timestamp).toBeDefined()
    expect(report.version).toBeDefined()
    expect(report.environment).toBeDefined()

    const supabaseCheck = report.checks.find(c => c.name === 'supabase')
    expect(supabaseCheck?.status).toBe('healthy')

    const redisCheck = report.checks.find(c => c.name === 'redis')
    expect(redisCheck?.status).toBe('healthy')

    const resendCheck = report.checks.find(c => c.name === 'resend')
    expect(resendCheck?.status).toBe('healthy')
  })

  it('returns degraded when a non-critical dependency fails', async () => {
    process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://test.supabase.co'
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY = 'test-key'
    process.env.UPSTASH_REDIS_REST_URL = 'https://test-redis.upstash.io'
    process.env.UPSTASH_REDIS_REST_TOKEN = 'test-token'
    process.env.RESEND_API_KEY = 'test-resend-key'

    vi.mocked(fetch).mockImplementation(async (url: string | Request | URL) => {
      const urlStr = typeof url === 'string' ? url : url.toString()
      if (urlStr.includes('supabase')) {
        return { ok: true, status: 200 } as Response
      }
      if (urlStr.includes('resend')) {
        return { ok: false, status: 503 } as Response
      }
      return { ok: false, status: 404 } as Response
    })

    vi.doMock('@upstash/redis', () => ({
      Redis: class {
        async ping() { return 'PONG' }
      }
    }))

    const report = await runHealthChecks()

    expect(report.status).toBe('degraded')
    expect(report.checks.find(c => c.name === 'resend')?.status).toBe('unhealthy')
    expect(report.checks.find(c => c.name === 'supabase')?.status).toBe('healthy')
  })

  it('returns unhealthy when a critical dependency fails', async () => {
    process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://test.supabase.co'
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY = 'test-key'
    process.env.UPSTASH_REDIS_REST_URL = 'https://test-redis.upstash.io'
    process.env.UPSTASH_REDIS_REST_TOKEN = 'test-token'
    process.env.RESEND_API_KEY = 'test-resend-key'

    vi.mocked(fetch).mockImplementation(async (url: string | Request | URL) => {
      const urlStr = typeof url === 'string' ? url : url.toString()
      if (urlStr.includes('supabase')) {
        return { ok: false, status: 503 } as Response
      }
      if (urlStr.includes('resend')) {
        return { ok: true, status: 200 } as Response
      }
      return { ok: false, status: 404 } as Response
    })

    vi.doMock('@upstash/redis', () => ({
      Redis: class {
        async ping() { return 'PONG' }
      }
    }))

    const report = await runHealthChecks()

    expect(report.status).toBe('unhealthy')
    expect(report.checks.find(c => c.name === 'supabase')?.status).toBe('unhealthy')
  })

  it('includes latency measurements for all checks', async () => {
    process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://test.supabase.co'
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY = 'test-key'
    process.env.UPSTASH_REDIS_REST_URL = 'https://test-redis.upstash.io'
    process.env.UPSTASH_REDIS_REST_TOKEN = 'test-token'
    process.env.RESEND_API_KEY = 'test-resend-key'

    vi.mocked(fetch).mockResolvedValue({ ok: true, status: 200 } as Response)

    vi.doMock('@upstash/redis', () => ({
      Redis: class {
        async ping() { return 'PONG' }
      }
    }))

    const report = await runHealthChecks()

    for (const check of report.checks) {
      expect(check.latencyMs).toBeGreaterThanOrEqual(0)
      expect(check.latencyMs).toBeLessThan(10000)
    }
  })

  it('handles missing environment variables gracefully', async () => {
    delete process.env.NEXT_PUBLIC_SUPABASE_URL
    delete process.env.UPSTASH_REDIS_REST_URL
    delete process.env.RESEND_API_KEY

    const report = await runHealthChecks()

    expect(report.status).toBe('unhealthy')
    expect(report.checks.every(c => c.status === 'unhealthy')).toBe(true)
    expect(report.checks.some(c => c.error?.includes('not configured'))).toBe(true)
  })
})

describe('Health check structure', () => {
  it('has correct TypeScript interfaces exported', () => {
    // This test verifies the module exports are loadable
    expect(typeof runHealthChecks).toBe('function')
  })
})
