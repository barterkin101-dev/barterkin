import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

const mockVerify = vi.fn()
const MockWebhook = vi.fn().mockImplementation(() => ({
  verify: mockVerify,
}))

// Mock svix before any imports that might pull it in
vi.mock('svix', () => ({
  Webhook: MockWebhook,
}))

// Mock supabase admin
vi.mock('@/lib/supabase/admin', () => ({
  getSupabaseAdmin: vi.fn(),
}))

// Mock resend
vi.mock('resend', () => ({
  Resend: vi.fn().mockImplementation(() => ({
    emails: {
      send: vi.fn().mockResolvedValue({ id: 'email-123' }),
    },
  })),
}))

// Mock logger
vi.mock('@/lib/utils/logger', () => ({
  createLogger: vi.fn(() => ({
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
  })),
}))

import { getSupabaseAdmin } from '@/lib/supabase/admin'

async function getInboundPost() {
  const mod = await import('@/app/api/webhooks/resend-inbound/route')
  return mod.POST
}

function makeRequest(body: unknown, headers?: Record<string, string>) {
  const h = new Headers()
  if (headers) {
    Object.entries(headers).forEach(([k, v]) => h.set(k, v))
  }
  return new Request('http://localhost/api/webhooks/resend-inbound', {
    method: 'POST',
    headers: h,
    body: JSON.stringify(body),
  })
}

describe('Resend inbound webhook — support ticket creation', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockVerify.mockReset()
    delete process.env.RESEND_WEBHOOK_SECRET
  })

  afterEach(() => {
    vi.resetModules()
  })

  it('accepts webhook without verification when RESEND_WEBHOOK_SECRET is missing (dev mode)', async () => {
    const mockInsert = vi.fn().mockReturnValue({
      select: vi.fn().mockReturnValue({
        single: vi.fn().mockResolvedValue({
          data: { id: 'ticket-123' },
          error: null,
        }),
      }),
    })
    ;(getSupabaseAdmin as ReturnType<typeof vi.fn>).mockReturnValue({
      from: vi.fn().mockReturnValue({ insert: mockInsert }),
    })

    const POST = await getInboundPost()
    const payload = {
      type: 'email.received',
      created_at: '2024-01-01T00:00:00.000Z',
      data: {
        from: 'customer@example.com',
        to: ['support@barterkin.com'],
        subject: 'Help needed',
        text: 'I need help with my account',
      },
    }

    const res = await POST(makeRequest(payload))
    expect(res.status).toBe(200)
    const json = await res.json()
    expect(json.ok).toBe(true)
    expect(json.ticketId).toBe('ticket-123')

    expect(mockInsert).toHaveBeenCalledWith(
      expect.objectContaining({
        from_email: 'customer@example.com',
        subject: 'Help needed',
        body_text: 'I need help with my account',
        status: 'open',
        source: 'email',
      }),
    )
  })

  it('rejects webhook with invalid svix signature when secret is configured', async () => {
    process.env.RESEND_WEBHOOK_SECRET = 'whsec_test_secret'
    mockVerify.mockImplementation(() => {
      throw new Error('Invalid signature')
    })

    const POST = await getInboundPost()
    const payload = {
      type: 'email.received',
      created_at: '2024-01-01T00:00:00.000Z',
      data: {
        from: 'customer@example.com',
        to: ['support@barterkin.com'],
        subject: 'Help needed',
        text: 'Body',
      },
    }

    const res = await POST(
      makeRequest(payload, {
        'svix-id': 'msg_123',
        'svix-timestamp': '1704067200',
        'svix-signature': 'v1,badsig',
      }),
    )
    expect(res.status).toBe(401)
    const json = await res.json()
    expect(json.error).toBe('Invalid signature')
    expect(MockWebhook).toHaveBeenCalledWith('whsec_test_secret')
  })

  it('ignores non-email.received events', async () => {
    delete process.env.RESEND_WEBHOOK_SECRET

    const POST = await getInboundPost()
    const payload = {
      type: 'email.sent',
      created_at: '2024-01-01T00:00:00.000Z',
      data: {
        from: 'customer@example.com',
        to: ['support@barterkin.com'],
        subject: 'Test',
        text: 'Body',
      },
    }

    const res = await POST(makeRequest(payload))
    expect(res.status).toBe(200)
    const json = await res.json()
    expect(json.ignored).toBe(true)
  })

  it('rejects missing from address', async () => {
    delete process.env.RESEND_WEBHOOK_SECRET

    const POST = await getInboundPost()
    const payload = {
      type: 'email.received',
      created_at: '2024-01-01T00:00:00.000Z',
      data: {
        from: '',
        to: ['support@barterkin.com'],
        subject: 'Help needed',
        text: 'Body',
      },
    }

    const res = await POST(makeRequest(payload))
    expect(res.status).toBe(400)
    const json = await res.json()
    expect(json.error).toBe('Missing from address')
  })

  it('returns 503 when admin client is unavailable', async () => {
    delete process.env.RESEND_WEBHOOK_SECRET
    ;(getSupabaseAdmin as ReturnType<typeof vi.fn>).mockImplementation(() => {
      throw new Error('Missing env vars')
    })

    const POST = await getInboundPost()
    const payload = {
      type: 'email.received',
      created_at: '2024-01-01T00:00:00.000Z',
      data: {
        from: 'customer@example.com',
        to: ['support@barterkin.com'],
        subject: 'Help needed',
        text: 'Body',
      },
    }

    const res = await POST(makeRequest(payload))
    expect(res.status).toBe(503)
    const json = await res.json()
    expect(json.error).toBe('Service unavailable')
  })

  it('returns 500 on database error', async () => {
    delete process.env.RESEND_WEBHOOK_SECRET
    const mockInsert = vi.fn().mockReturnValue({
      select: vi.fn().mockReturnValue({
        single: vi.fn().mockResolvedValue({
          data: null,
          error: { code: '23505', message: 'duplicate key' },
        }),
      }),
    })
    ;(getSupabaseAdmin as ReturnType<typeof vi.fn>).mockReturnValue({
      from: vi.fn().mockReturnValue({ insert: mockInsert }),
    })

    const POST = await getInboundPost()
    const payload = {
      type: 'email.received',
      created_at: '2024-01-01T00:00:00.000Z',
      data: {
        from: 'customer@example.com',
        to: ['support@barterkin.com'],
        subject: 'Help needed',
        text: 'Body',
      },
    }

    const res = await POST(makeRequest(payload))
    expect(res.status).toBe(500)
    const json = await res.json()
    expect(json.error).toBe('Database error')
  })

  it('uses default values for missing optional fields', async () => {
    delete process.env.RESEND_WEBHOOK_SECRET
    const mockInsert = vi.fn().mockReturnValue({
      select: vi.fn().mockReturnValue({
        single: vi.fn().mockResolvedValue({
          data: { id: 'ticket-456' },
          error: null,
        }),
      }),
    })
    ;(getSupabaseAdmin as ReturnType<typeof vi.fn>).mockReturnValue({
      from: vi.fn().mockReturnValue({ insert: mockInsert }),
    })

    const POST = await getInboundPost()
    const payload = {
      type: 'email.received',
      created_at: '2024-01-01T00:00:00.000Z',
      data: {
        from: 'anon@example.com',
        to: ['support@barterkin.com'],
        // missing subject, text, html, from_name
      },
    }

    const res = await POST(makeRequest(payload))
    expect(res.status).toBe(200)

    expect(mockInsert).toHaveBeenCalledWith(
      expect.objectContaining({
        from_email: 'anon@example.com',
        subject: '(no subject)',
        body_text: '(no content)',
        body_html: null,
        from_name: null,
      }),
    )
  })
})
