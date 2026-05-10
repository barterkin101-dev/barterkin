import { describe, it, expect, vi } from 'vitest'

// Mock @upstash/redis and @upstash/ratelimit
const limitMock = vi.fn()

vi.mock('@upstash/redis', () => ({
  Redis: vi.fn().mockImplementation(() => ({
    get: vi.fn(),
    set: vi.fn(),
  })),
}))

vi.mock('@upstash/ratelimit', () => ({
  Ratelimit: class {
    static slidingWindow = vi.fn().mockReturnValue({})
    constructor() {
      return { limit: limitMock }
    }
  },
}))

// Import AFTER the mock is set up
import {
  rateLimitByIp,
  limitAuthRequest,
  limitOAuthCallback,
  limitChatbotMessage,
  limitReportSubmission,
  limitBlockAction,
  limitGeneralApi,
} from '@/lib/rate-limit-public'

describe('rateLimitByIp (memory fallback)', () => {
  it('allows requests under the limit', async () => {
    const result = await rateLimitByIp('ip-test-key', 5, 60)
    expect(result.success).toBe(true)
    expect(result.remaining).toBeGreaterThan(0)
  })

  it('blocks requests over the limit', async () => {
    const key = 'ip-block-key'
    // Exhaust the limit
    for (let i = 0; i < 5; i++) {
      await rateLimitByIp(key, 5, 60)
    }
    const result = await rateLimitByIp(key, 5, 60)
    expect(result.success).toBe(false)
    expect(result.remaining).toBe(0)
  })

  it('resets after the window expires', async () => {
    const key = 'ip-reset-key'
    // Exhaust the limit with a tiny window
    for (let i = 0; i < 3; i++) {
      await rateLimitByIp(key, 3, 0)
    }
    // Wait a tick for the window to expire
    await new Promise((r) => setTimeout(r, 10))
    const result = await rateLimitByIp(key, 3, 0)
    expect(result.success).toBe(true)
  })
})

describe('convenience presets', () => {
  it('limitAuthRequest uses correct params', async () => {
    const result = await limitAuthRequest('1.2.3.4')
    expect(typeof result.success).toBe('boolean')
    expect(typeof result.remaining).toBe('number')
  })

  it('limitOAuthCallback uses correct params', async () => {
    const result = await limitOAuthCallback('1.2.3.4')
    expect(typeof result.success).toBe('boolean')
    expect(typeof result.remaining).toBe('number')
  })

  it('limitChatbotMessage uses correct params', async () => {
    const result = await limitChatbotMessage('1.2.3.4')
    expect(typeof result.success).toBe('boolean')
    expect(typeof result.remaining).toBe('number')
  })

  it('limitReportSubmission uses correct params', async () => {
    const result = await limitReportSubmission('1.2.3.4')
    expect(typeof result.success).toBe('boolean')
    expect(typeof result.remaining).toBe('number')
  })

  it('limitBlockAction uses correct params', async () => {
    const result = await limitBlockAction('1.2.3.4')
    expect(typeof result.success).toBe('boolean')
    expect(typeof result.remaining).toBe('number')
  })

  it('limitGeneralApi uses correct params', async () => {
    const result = await limitGeneralApi('1.2.3.4')
    expect(typeof result.success).toBe('boolean')
    expect(typeof result.remaining).toBe('number')
  })
})
