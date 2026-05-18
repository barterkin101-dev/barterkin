import { describe, expect, it, vi } from 'vitest'
import { POST } from '@/app/api/cron/listing-save-notifications/route'

const mockSendListingSaveNotifications = vi.fn()

vi.mock('@/lib/actions/listing-save-notifications', () => ({
  sendListingSaveNotifications: (...args: unknown[]) => mockSendListingSaveNotifications(...args),
}))

describe('POST /api/cron/listing-save-notifications', () => {
  it('returns 401 without valid auth', async () => {
    process.env.CRON_SECRET = 'secret123'
    const request = new Request('http://localhost/api/cron/listing-save-notifications', {
      method: 'POST',
      headers: { authorization: 'Bearer wrong' },
    })

    const response = await POST(request)
    expect(response.status).toBe(401)
  })

  it('returns 200 with valid auth and successful batch', async () => {
    process.env.CRON_SECRET = 'secret123'
    mockSendListingSaveNotifications.mockResolvedValue({
      ok: true,
      sent: 5,
      failed: 0,
      skipped: 0,
    })

    const request = new Request('http://localhost/api/cron/listing-save-notifications', {
      method: 'POST',
      headers: { authorization: 'Bearer secret123' },
    })

    const response = await POST(request)
    expect(response.status).toBe(200)
    const json = await response.json()
    expect(json.sent).toBe(5)
    expect(json.failed).toBe(0)
  })

  it('returns 500 when batch fails', async () => {
    process.env.CRON_SECRET = 'secret123'
    mockSendListingSaveNotifications.mockResolvedValue({
      ok: false,
      error: 'fetch_failed',
      sent: 0,
      failed: 0,
      skipped: 0,
    })

    const request = new Request('http://localhost/api/cron/listing-save-notifications', {
      method: 'POST',
      headers: { authorization: 'Bearer secret123' },
    })

    const response = await POST(request)
    expect(response.status).toBe(500)
    const json = await response.json()
    expect(json.error).toBe('fetch_failed')
  })
})
