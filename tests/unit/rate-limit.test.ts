import { describe, it } from 'vitest'

describe('checkSignupRateLimit (AUTH-06)', () => {
  it.todo('returns { allowed: true } for first signup from an IP')
  it.todo('returns { allowed: true } for the 5th signup from the same IP on the same day')
  it.todo('returns { allowed: false } for the 6th signup from the same IP on the same day')
  it.todo('resets count at day boundary')
  it.todo('handles x-forwarded-for with multiple entries (takes first)')
  it.todo('handles missing IP gracefully (does not crash)')
})
