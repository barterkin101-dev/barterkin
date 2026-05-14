import { beforeEach, describe, expect, it, vi } from 'vitest'

const fromMock = vi.fn()
const errorMock = vi.fn()

vi.mock('@/lib/supabase/admin', () => ({
  getSupabaseAdmin: vi.fn(() => ({
    from: fromMock,
  })),
}))

vi.mock('@/lib/utils/logger', () => ({
  createLogger: vi.fn(() => ({
    error: errorMock,
  })),
}))

import { getContactLimitStatus } from '@/lib/data/contact-limit'

describe('getContactLimitStatus', () => {
  beforeEach(() => {
    fromMock.mockReset()
    errorMock.mockReset()
  })

  it('counts distinct conversations and marks free members near the limit', async () => {
    const gteMock = vi.fn().mockResolvedValue({
      data: [
        { conversation_id: 'conv-1' },
        { conversation_id: 'conv-1' },
        { conversation_id: 'conv-2' },
        { conversation_id: 'conv-3' },
        { conversation_id: 'conv-4' },
        { conversation_id: 'conv-5' },
        { conversation_id: 'conv-6' },
        { conversation_id: 'conv-7' },
      ],
      error: null,
    })
    const eqMock = vi.fn().mockReturnValue({ gte: gteMock })
    const selectMock = vi.fn().mockReturnValue({ eq: eqMock })
    fromMock.mockReturnValue({ select: selectMock })

    const result = await getContactLimitStatus('profile-1', 'free')

    expect(fromMock).toHaveBeenCalledWith('messages')
    expect(selectMock).toHaveBeenCalledWith('conversation_id')
    expect(eqMock).toHaveBeenCalledWith('sender_profile_id', 'profile-1')
    expect(result).toEqual({
      used: 7,
      limit: 10,
      remaining: 3,
      isNearLimit: true,
      isAtLimit: false,
    })
  })

  it('marks free members at the limit when they have used 10 distinct conversations', async () => {
    const gteMock = vi.fn().mockResolvedValue({
      data: Array.from({ length: 10 }, (_, i) => ({ conversation_id: `conv-${i}` })),
      error: null,
    })
    const eqMock = vi.fn().mockReturnValue({ gte: gteMock })
    const selectMock = vi.fn().mockReturnValue({ eq: eqMock })
    fromMock.mockReturnValue({ select: selectMock })

    const result = await getContactLimitStatus('profile-1', 'free')

    expect(result).toEqual({
      used: 10,
      limit: 10,
      remaining: 0,
      isNearLimit: false,
      isAtLimit: true,
    })
  })

  it('uses the higher cap for paid tiers', async () => {
    const gteMock = vi.fn().mockResolvedValue({
      data: Array.from({ length: 12 }, (_, i) => ({ conversation_id: `conv-${i}` })),
      error: null,
    })
    const eqMock = vi.fn().mockReturnValue({ gte: gteMock })
    const selectMock = vi.fn().mockReturnValue({ eq: eqMock })
    fromMock.mockReturnValue({ select: selectMock })

    const result = await getContactLimitStatus('profile-1', 'premium')

    expect(result).toEqual({
      used: 12,
      limit: 100,
      remaining: 88,
      isNearLimit: false,
      isAtLimit: false,
    })
  })

  it('falls back to a safe empty state when the query fails', async () => {
    const gteMock = vi.fn().mockResolvedValue({
      data: null,
      error: { message: 'boom' },
    })
    const eqMock = vi.fn().mockReturnValue({ gte: gteMock })
    const selectMock = vi.fn().mockReturnValue({ eq: eqMock })
    fromMock.mockReturnValue({ select: selectMock })

    const result = await getContactLimitStatus('profile-1', 'free')

    expect(result).toEqual({
      used: 0,
      limit: 10,
      remaining: 10,
      isNearLimit: false,
      isAtLimit: false,
    })
    expect(errorMock).toHaveBeenCalled()
  })
})
