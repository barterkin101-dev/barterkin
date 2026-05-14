import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { maskPhoneNumber, normalizePhoneNumber } from '@/lib/utils/phone'
import { decryptPhoneNumber, encryptPhoneNumber } from '@/lib/utils/phone-encryption'

describe('phone utils', () => {
  beforeEach(() => {
    process.env.PHONE_DATA_ENCRYPTION_KEY = 'test-phone-key'
  })

  afterEach(() => {
    delete process.env.PHONE_DATA_ENCRYPTION_KEY
  })

  it('normalizes common US formats to E.164', () => {
    expect(normalizePhoneNumber('(404) 555-0123')).toBe('+14045550123')
    expect(normalizePhoneNumber('+1 404 555 0123')).toBe('+14045550123')
  })

  it('masks a phone number to its last four digits', () => {
    expect(maskPhoneNumber('+14045550123')).toBe('••• ••• 0123')
  })

  it('round-trips phone encryption', () => {
    const encrypted = encryptPhoneNumber('+14045550123')
    expect(encrypted).not.toContain('+14045550123')
    expect(decryptPhoneNumber(encrypted)).toBe('+14045550123')
  })
})
