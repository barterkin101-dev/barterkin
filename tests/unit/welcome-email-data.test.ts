import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const mockMaybeSingle = vi.fn()
const mockEq = vi.fn(() => ({ maybeSingle: mockMaybeSingle }))
const mockSelect = vi.fn(() => ({ eq: mockEq }))
const mockFrom = vi.fn(() => ({ select: mockSelect, update: vi.fn(() => ({ eq: mockEq })) }))

const mockAdminClient = {
  from: mockFrom,
}

vi.mock('@/lib/supabase/admin', () => ({
  getSupabaseAdmin: vi.fn(() => mockAdminClient),
}))

vi.mock('@/lib/utils/logger', () => ({
  createLogger: vi.fn(() => ({
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  })),
}))

import {
  getWelcomeEmailRecipient,
  recordWelcomeEmailSent,
} from '@/lib/data/welcome-email'

describe('getWelcomeEmailRecipient', () => {
  beforeEach(() => {
    vi.resetAllMocks()
  })

  it('returns recipient when welcome email has not been sent', async () => {
    mockMaybeSingle.mockResolvedValue({
      data: {
        id: 'profile-1',
        display_name: 'Alice',
        username: 'alice',
        owner_id: 'owner-1',
        welcome_email_sent_at: null,
      },
      error: null,
    })

    const result = await getWelcomeEmailRecipient('profile-1')

    expect(result.recipient).toEqual({
      id: 'profile-1',
      display_name: 'Alice',
      username: 'alice',
      owner_id: 'owner-1',
    })
    expect(result.error).toBeNull()
  })

  it('returns already_sent error when welcome email was already sent', async () => {
    mockMaybeSingle.mockResolvedValue({
      data: {
        id: 'profile-1',
        display_name: 'Alice',
        username: 'alice',
        owner_id: 'owner-1',
        welcome_email_sent_at: '2026-05-16T12:00:00.000Z',
      },
      error: null,
    })

    const result = await getWelcomeEmailRecipient('profile-1')

    expect(result.recipient).toBeNull()
    expect(result.error).toBe('already_sent')
  })

  it('returns profile_not_found when profile does not exist', async () => {
    mockMaybeSingle.mockResolvedValue({
      data: null,
      error: null,
    })

    const result = await getWelcomeEmailRecipient('profile-1')

    expect(result.recipient).toBeNull()
    expect(result.error).toBe('profile_not_found')
  })

  it('returns fetch_failed on database error', async () => {
    mockMaybeSingle.mockResolvedValue({
      data: null,
      error: { message: 'db down' },
    })

    const result = await getWelcomeEmailRecipient('profile-1')

    expect(result.recipient).toBeNull()
    expect(result.error).toBe('fetch_failed')
  })
})

describe('recordWelcomeEmailSent', () => {
  beforeEach(() => {
    vi.resetAllMocks()
  })

  it('returns ok after successful update', async () => {
    mockEq.mockResolvedValueOnce({ error: null })

    const result = await recordWelcomeEmailSent('profile-1')

    expect(result.ok).toBe(true)
  })

  it('returns error when update fails', async () => {
    mockEq.mockResolvedValueOnce({ error: { message: 'update failed' } })

    const result = await recordWelcomeEmailSent('profile-1')

    expect(result.ok).toBe(false)
    expect(result.error).toBe('update failed')
  })
})
