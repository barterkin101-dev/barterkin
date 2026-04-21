// FILLED IN: Plan 03 — Resend webhook handler + svix signature verification (CONT-09)
import { describe, it, expect, vi, beforeEach } from 'vitest'

// Mock supabaseAdmin before importing route
const eqMock = vi.fn().mockResolvedValue({ error: null })
const updateMock = vi.fn().mockReturnValue({ eq: eqMock })
const fromMock = vi.fn().mockReturnValue({ update: updateMock })

vi.mock('@/lib/supabase/admin', () => ({
  supabaseAdmin: { from: fromMock },
}))

// Use vi.hoisted so verifyMock is available inside the hoisted vi.mock factory
const { verifyMock } = vi.hoisted(() => {
  return { verifyMock: vi.fn() }
})

vi.mock('resend', () => {
  return {
    Resend: class MockResend {
      webhooks = { verify: verifyMock }
    },
  }
})

// Environment setup before importing route
process.env.RESEND_API_KEY = 'test-api-key'
process.env.RESEND_WEBHOOK_SECRET = 'whsec_test'

// Lazy-import route after mocks are installed
async function getPost() {
  const mod = await import('@/app/api/webhooks/resend/route')
  return mod.POST
}

function makeRequest(
  payload: string,
  headers: Record<string, string> = {},
): Request {
  return new Request('https://example.com/api/webhooks/resend', {
    method: 'POST',
    body: payload,
    headers: {
      'svix-id': 'msg_test',
      'svix-timestamp': '1700000000',
      'svix-signature': 'v1,test-signature',
      ...headers,
    },
  })
}

describe('CONT-09 — Resend webhook handler', () => {
  beforeEach(() => {
    verifyMock.mockReset()
    updateMock.mockClear()
    fromMock.mockClear()
    eqMock.mockClear()
    eqMock.mockResolvedValue({ error: null })
    updateMock.mockReturnValue({ eq: eqMock })
    fromMock.mockReturnValue({ update: updateMock })
  })

  it('rejects bad signature with 401', async () => {
    verifyMock.mockImplementation(() => {
      throw new Error('bad sig')
    })
    const POST = await getPost()
    const res = await POST(makeRequest('{}'))
    expect(res.status).toBe(401)
    expect(fromMock).not.toHaveBeenCalled()
  })

  it('updates contact_requests.status to bounced on email.bounced event', async () => {
    verifyMock.mockReturnValue({
      type: 'email.bounced',
      data: { email_id: 'resend-abc-123' },
    })
    const POST = await getPost()
    const res = await POST(makeRequest('{"type":"email.bounced"}'))
    expect(res.status).toBe(200)
    expect(fromMock).toHaveBeenCalledWith('contact_requests')
    expect(updateMock).toHaveBeenCalledWith({ status: 'bounced' })
  })

  it('updates status to complained on email.complained', async () => {
    verifyMock.mockReturnValue({
      type: 'email.complained',
      data: { email_id: 'resend-xyz' },
    })
    const POST = await getPost()
    await POST(makeRequest('{}'))
    expect(updateMock).toHaveBeenCalledWith({ status: 'complained' })
  })

  it('updates status to delivered on email.delivered', async () => {
    verifyMock.mockReturnValue({
      type: 'email.delivered',
      data: { email_id: 'resend-def' },
    })
    const POST = await getPost()
    await POST(makeRequest('{}'))
    expect(updateMock).toHaveBeenCalledWith({ status: 'delivered' })
  })

  it('updates status to failed on email.failed', async () => {
    verifyMock.mockReturnValue({
      type: 'email.failed',
      data: { email_id: 'resend-ghi' },
    })
    const POST = await getPost()
    await POST(makeRequest('{}'))
    expect(updateMock).toHaveBeenCalledWith({ status: 'failed' })
  })

  it('ignores unsupported event types (e.g. email.opened)', async () => {
    verifyMock.mockReturnValue({
      type: 'email.opened',
      data: { email_id: 'resend-opn' },
    })
    const POST = await getPost()
    const res = await POST(makeRequest('{}'))
    expect(res.status).toBe(200)
    expect(updateMock).not.toHaveBeenCalled()
  })

  it('returns 200 no-op when emailId is missing from event data', async () => {
    verifyMock.mockReturnValue({ type: 'email.bounced', data: {} })
    const POST = await getPost()
    const res = await POST(makeRequest('{}'))
    expect(res.status).toBe(200)
    expect(updateMock).not.toHaveBeenCalled()
  })
})
