import { describe, it, expect } from 'vitest'
import { MagicLinkSchema } from '@/lib/actions/auth'

describe('MagicLinkSchema (AUTH-02)', () => {
  it('accepts valid email + captchaToken', () => {
    const result = MagicLinkSchema.safeParse({
      email: 'user@example.com',
      captchaToken: 'some-turnstile-token',
    })
    expect(result.success).toBe(true)
  })

  it('rejects missing email', () => {
    const result = MagicLinkSchema.safeParse({
      captchaToken: 'some-turnstile-token',
    })
    expect(result.success).toBe(false)
  })

  it('rejects malformed email (no @)', () => {
    const result = MagicLinkSchema.safeParse({
      email: 'not-an-email',
      captchaToken: 'x',
    })
    expect(result.success).toBe(false)
  })

  it('rejects empty captchaToken', () => {
    const result = MagicLinkSchema.safeParse({
      email: 'user@example.com',
      captchaToken: '',
    })
    expect(result.success).toBe(false)
  })

  it('lowercases email after parse', () => {
    const result = MagicLinkSchema.safeParse({
      email: 'USER@Example.COM',
      captchaToken: 'x',
    })
    if (result.success) {
      expect(result.data.email).toBe('user@example.com')
    } else {
      throw new Error('expected parse success')
    }
  })

  it('trims whitespace from email', () => {
    const result = MagicLinkSchema.safeParse({
      email: '  user@example.com  ',
      captchaToken: 'x',
    })
    if (result.success) {
      expect(result.data.email).toBe('user@example.com')
    } else {
      throw new Error('expected parse success')
    }
  })
})
