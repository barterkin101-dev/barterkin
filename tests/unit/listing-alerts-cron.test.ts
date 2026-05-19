import { beforeEach, describe, expect, it, vi } from 'vitest'

const { mockSendListingAlerts } = vi.hoisted(() => ({
  mockSendListingAlerts: vi.fn(),
}))

vi.mock('@/lib/actions/listing-alerts', () => ({
  sendListingAlerts: mockSendListingAlerts,
}))

vi.mock('@/lib/utils/logger', () => ({
  createLogger: vi.fn(() => ({
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  })),
}))

import { POST } from '@/app/api/cron/listing-alerts/route'

describe('/api/cron/listing-alerts', () => {
  beforeEach(() => {
    vi.resetAllMocks()
    vi.stubEnv('CRON_SECRET', 'super-secret')
  })

  afterEach(() => {
    vi.unstubAllEnvs()
  })

  it('returns 401 when authorization header is missing', async () => {
    const req = new Request('http://localhost/api/cron/listing-alerts', { method: 'POST' })
    const res = await POST(req)
    expect(res.status).toBe(401)
    const body = await res.json()
    expect(body.error).toBe('Unauthorized')
  })

  it('returns 401 when authorization header is invalid', async () => {
    const req = new Request('http://localhost/api/cron/listing-alerts', {
      method: 'POST',
      headers: { authorization: 'Bearer wrong-secret' },
    })
    const res = await POST(req)
    expect(res.status).toBe(401)
  })

  it('returns 200 with batch stats on success', async () => {
    mockSendListingAlerts.mockResolvedValue({ ok: true, sent: 5, failed: 1, skipped: 2 })

    const req = new Request('http://localhost/api/cron/listing-alerts', {
      method: 'POST',
      headers: { authorization: 'Bearer super-secret' },
    })
    const res = await POST(req)
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body).toEqual({ ok: true, sent: 5, failed: 1, skipped: 2 })
  })

  it('returns 500 when sendListingAlerts fails', async () => {
    mockSendListingAlerts.mockResolvedValue({ ok: false, error: 'db_down', sent: 0, failed: 0, skipped: 0 })

    const req = new Request('http://localhost/api/cron/listing-alerts', {
      method: 'POST',
      headers: { authorization: 'Bearer super-secret' },
    })
    const res = await POST(req)
    expect(res.status).toBe(500)
    const body = await res.json()
    expect(body.error).toBe('db_down')
  })

  it('allows requests when CRON_SECRET is not configured', async () => {
    vi.unstubAllEnvs()
    mockSendListingAlerts.mockResolvedValue({ ok: true, sent: 0, failed: 0, skipped: 0 })

    const req = new Request('http://localhost/api/cron/listing-alerts', { method: 'POST' })
    const res = await POST(req)
    expect(res.status).toBe(200)
  })
})
