import { describe, it } from 'vitest'

describe('isDisposableEmail (AUTH-07)', () => {
  it.todo('rejects @mailinator.com')
  it.todo('rejects @tempmail.com')
  it.todo('rejects @10minutemail.com')
  it.todo('rejects @throwaway.email')
  it.todo('rejects @guerrillamail.com')
  it.todo('accepts @gmail.com')
  it.todo('accepts @outlook.com')
  it.todo('accepts @icloud.com')
  it.todo('accepts @fastmail.com')
  it.todo('accepts @proton.me')
  it.todo('returns false for malformed email (no @)')
  it.todo('lowercases domain before check')
})
