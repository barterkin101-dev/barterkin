import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.stubEnv('DIGEST_UNSUBSCRIBE_SECRET', 'test-secret-for-unsubscribe')

import {
  generateUnsubscribeToken,
  validateUnsubscribeToken,
  buildUnsubscribeUrl,
} from '@/lib/digest-unsubscribe'

describe('generateUnsubscribeToken', () => {
  it('generates a token with the expected format', () => {
    const token = generateUnsubscribeToken('prof-123')
    expect(token).toMatch(/^v1:[A-Za-z0-9_-]+$/)
  })

  it('generates different tokens for different profile IDs', () => {
    const t1 = generateUnsubscribeToken('prof-1')
    const t2 = generateUnsubscribeToken('prof-2')
    expect(t1).not.toBe(t2)
  })

  it('generates the same token for the same profile ID', () => {
    const t1 = generateUnsubscribeToken('prof-abc')
    const t2 = generateUnsubscribeToken('prof-abc')
    expect(t1).toBe(t2)
  })
})

describe('validateUnsubscribeToken', () => {
  it('returns true for a valid token', () => {
    const token = generateUnsubscribeToken('prof-123')
    expect(validateUnsubscribeToken('prof-123', token)).toBe(true)
  })

  it('returns false for a token with wrong profile ID', () => {
    const token = generateUnsubscribeToken('prof-123')
    expect(validateUnsubscribeToken('prof-456', token)).toBe(false)
  })

  it('returns false for a tampered token', () => {
    const token = generateUnsubscribeToken('prof-123')
    const tampered = token.slice(0, -1) + 'X'
    expect(validateUnsubscribeToken('prof-123', tampered)).toBe(false)
  })

  it('returns false for a token with wrong version', () => {
    expect(validateUnsubscribeToken('prof-123', 'v2:abc123')).toBe(false)
  })

  it('returns false for an empty token', () => {
    expect(validateUnsubscribeToken('prof-123', '')).toBe(false)
  })
})

describe('buildUnsubscribeUrl', () => {
  it('builds a URL with profile ID and token query params', () => {
    const url = buildUnsubscribeUrl('prof-123', 'https://barterkin.com')
    expect(url).toMatch(/^https:\/\/barterkin\.com\/unsubscribe\?/)
    expect(url).toContain('id=prof-123')
    expect(url).toContain('token=')
  })
})
