import { beforeEach, describe, expect, it, vi } from 'vitest'

const fromMock = vi.fn()
const warnMock = vi.fn()

vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn(async () => ({
    from: fromMock,
  })),
}))

vi.mock('@/lib/utils/logger', () => ({
  createLogger: vi.fn(() => ({
    warn: warnMock,
  })),
}))

import { getStartedConversationCount } from '@/lib/data/messaging'

describe('getStartedConversationCount', () => {
  beforeEach(() => {
    fromMock.mockReset()
    warnMock.mockReset()
  })

  it('counts distinct conversations the profile has sent messages in', async () => {
    const eqMock = vi.fn().mockResolvedValue({
      data: [
        { conversation_id: 'conv-1' },
        { conversation_id: 'conv-1' },
        { conversation_id: 'conv-2' },
      ],
      error: null,
    })
    const selectMock = vi.fn().mockReturnValue({ eq: eqMock })
    fromMock.mockReturnValue({ select: selectMock })

    await expect(getStartedConversationCount('profile-1')).resolves.toBe(2)
    expect(fromMock).toHaveBeenCalledWith('messages')
    expect(selectMock).toHaveBeenCalledWith('conversation_id')
    expect(eqMock).toHaveBeenCalledWith('sender_profile_id', 'profile-1')
  })

  it('returns zero and logs a warning when the query fails', async () => {
    const eqMock = vi.fn().mockResolvedValue({
      data: null,
      error: { code: 'boom' },
    })
    const selectMock = vi.fn().mockReturnValue({ eq: eqMock })
    fromMock.mockReturnValue({ select: selectMock })

    await expect(getStartedConversationCount('profile-1')).resolves.toBe(0)
    expect(warnMock).toHaveBeenCalled()
  })
})
