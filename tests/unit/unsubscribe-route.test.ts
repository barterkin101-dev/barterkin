import { beforeEach, describe, expect, it, vi } from 'vitest'

const mockUpdate = vi.fn()
const mockEq = vi.fn()
const mockFrom = vi.fn()

vi.mock('@/lib/supabase/admin', () => ({
  getSupabaseAdmin: vi.fn(() => ({
    from: mockFrom,
  })),
}))

vi.mock('@/lib/utils/logger', () => ({
  createLogger: vi.fn(() => ({
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  })),
}))

vi.stubEnv('DIGEST_UNSUBSCRIBE_SECRET', 'test-secret')

import { POST } from '@/app/api/unsubscribe/route'

describe('POST /api/unsubscribe', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockFrom.mockReturnValue({ update: mockUpdate })
    mockUpdate.mockReturnValue({ eq: mockEq })
    mockEq.mockResolvedValue({ error: null })
  })

  it('unsubscribes with valid token', async () => {
    const { generateUnsubscribeToken } = await import('@/lib/digest-unsubscribe')
    const token = generateUnsubscribeToken('prof-123')

    const req = new Request('https://barterkin.com/api/unsubscribe', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ profileId: 'prof-123', token }),
    })

    const res = await POST(req)
    expect(res.status).toBe(200)
    const json = await res.json()
    expect(json.ok).toBe(true)
    expect(mockFrom).toHaveBeenCalledWith('profiles')
    expect(mockUpdate).toHaveBeenCalledWith(expect.objectContaining({ email_digest_enabled: false }))
    expect(mockEq).toHaveBeenCalledWith('id', 'prof-123')
  })

  it('returns 400 for missing profileId', async () => {
    const req = new Request('https://barterkin.com/api/unsubscribe', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token: 'some-token' }),
    })

    const res = await POST(req)
    expect(res.status).toBe(400)
    const json = await res.json()
    expect(json.ok).toBe(false)
    expect(json.error).toContain('profileId')
  })

  it('returns 400 for missing token', async () => {
    const req = new Request('https://barterkin.com/api/unsubscribe', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ profileId: 'prof-123' }),
    })

    const res = await POST(req)
    expect(res.status).toBe(400)
    const json = await res.json()
    expect(json.ok).toBe(false)
    expect(json.error).toContain('token')
  })

  it('returns 403 for invalid token', async () => {
    const req = new Request('https://barterkin.com/api/unsubscribe', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ profileId: 'prof-123', token: 'invalid-token' }),
    })

    const res = await POST(req)
    expect(res.status).toBe(403)
    const json = await res.json()
    expect(json.ok).toBe(false)
    expect(json.error).toContain('Invalid')
  })

  it('returns 500 when database update fails', async () => {
    const { generateUnsubscribeToken } = await import('@/lib/digest-unsubscribe')
    const token = generateUnsubscribeToken('prof-123')

    mockEq.mockResolvedValue({ error: { message: 'db error' } })

    const req = new Request('https://barterkin.com/api/unsubscribe', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ profileId: 'prof-123', token }),
    })

    const res = await POST(req)
    expect(res.status).toBe(500)
    const json = await res.json()
    expect(json.ok).toBe(false)
    expect(json.error).toContain('Database')
  })
})
