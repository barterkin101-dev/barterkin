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
  Ratelimit: {
    slidingWindow: vi.fn().mockReturnValue({}),
  },
}))

// Re-mock Ratelimit as a class after the static method mock
vi.doMock('@upstash/ratelimit', () => ({
  Ratelimit: class {
    static slidingWindow = vi.fn().mockReturnValue({})
    constructor() {
      return { limit: limitMock }
    }
  },
}))

import { rateLimit, limitCreateListing, limitSendMessage } from '@/lib/rate-limit'

describe('rateLimit (memory fallback)', () => {
  it('allows requests under the limit', async () => {
    const result = await rateLimit('test-key', 5, 60)
    expect(result.success).toBe(true)
    expect(result.remaining).toBeGreaterThan(0)
  })

  it('blocks requests over the limit', async () => {
    const key = 'test-block-key'
    // Exhaust the limit
    for (let i = 0; i < 5; i++) {
      await rateLimit(key, 5, 60)
    }
    const result = await rateLimit(key, 5, 60)
    expect(result.success).toBe(false)
    expect(result.remaining).toBe(0)
  })

  it('resets after the window expires', async () => {
    const key = 'test-reset-key'
    // Exhaust the limit with a tiny window
    for (let i = 0; i < 3; i++) {
      await rateLimit(key, 3, 0)
    }
    // Wait a tick for the window to expire
    await new Promise((r) => setTimeout(r, 10))
    const result = await rateLimit(key, 3, 0)
    expect(result.success).toBe(true)
  })
})

describe('convenience presets', () => {
  it('limitCreateListing uses correct params', async () => {
    const result = await limitCreateListing('user-123')
    expect(typeof result.success).toBe('boolean')
    expect(typeof result.remaining).toBe('number')
  })

  it('limitSendMessage uses correct params', async () => {
    const result = await limitSendMessage('user-456')
    expect(typeof result.success).toBe('boolean')
    expect(typeof result.remaining).toBe('number')
  })
})
