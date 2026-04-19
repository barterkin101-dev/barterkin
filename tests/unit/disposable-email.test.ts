import { describe, it, expect } from 'vitest'
import { isDisposableEmail } from '@/lib/utils/disposable-email'

describe('isDisposableEmail (AUTH-07)', () => {
  describe('rejects disposable domains', () => {
    const disposableCases = [
      'user@mailinator.com',
      'test@10minutemail.com',
      'x@guerrillamail.com',
      'throwaway@yopmail.com',
      'spam@sharklasers.com',
    ]
    it.each(disposableCases)('rejects %s', (email) => {
      expect(isDisposableEmail(email)).toBe(true)
    })
  })

  describe('accepts legitimate domains', () => {
    const legitCases = [
      'user@gmail.com',
      'user@outlook.com',
      'user@icloud.com',
      'user@fastmail.com',
      'user@proton.me',
    ]
    it.each(legitCases)('accepts %s', (email) => {
      expect(isDisposableEmail(email)).toBe(false)
    })
  })

  it('returns false for malformed email (no @)', () => {
    expect(isDisposableEmail('not-an-email')).toBe(false)
  })

  it('returns false for empty string', () => {
    expect(isDisposableEmail('')).toBe(false)
  })

  it('lowercases domain before check (case-insensitive)', () => {
    expect(isDisposableEmail('USER@MAILINATOR.COM')).toBe(true)
  })

  it('handles leading/trailing whitespace', () => {
    expect(isDisposableEmail('  user@mailinator.com  ')).toBe(true)
  })
})
