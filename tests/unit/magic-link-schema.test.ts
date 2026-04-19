import { describe, it } from 'vitest'

describe('MagicLinkSchema (AUTH-02)', () => {
  it.todo('accepts a valid email + captcha token')
  it.todo('rejects missing email')
  it.todo('rejects malformed email (no @)')
  it.todo('rejects empty captcha token')
  it.todo('lowercases email')
  it.todo('trims whitespace')
})
