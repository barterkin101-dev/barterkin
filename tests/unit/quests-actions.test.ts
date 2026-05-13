import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn(),
}))

vi.mock('@/lib/analytics', () => ({
  captureEvent: vi.fn(),
}))

import { createClient } from '@/lib/supabase/server'
import { awardQuest, getQuestStatus } from '@/lib/actions/quests'

function makeClient(overrides?: {
  getUser?: ReturnType<typeof vi.fn>
  from?: ReturnType<typeof vi.fn>
  rpc?: ReturnType<typeof vi.fn>
}) {
  vi.mocked(createClient).mockResolvedValue({
    auth: {
      getUser: overrides?.getUser ?? vi.fn().mockResolvedValue({ data: { user: { id: 'user-1' } }, error: null }),
    },
    from: overrides?.from ?? vi.fn(),
    rpc: overrides?.rpc ?? vi.fn(),
  } as never)
}

beforeEach(() => {
  vi.clearAllMocks()
})

describe('getQuestStatus', () => {
  it('marks daily login as completed when last_login_at is today', async () => {
    const profileSingle = vi.fn().mockResolvedValue({
      data: {
        id: 'profile-1',
        credits: 11,
        login_streak: 4,
        last_login_at: new Date().toISOString(),
      },
    })
    const profileEq = vi.fn().mockReturnValue({ single: profileSingle })
    const profileSelect = vi.fn().mockReturnValue({ eq: profileEq })

    const completionEq = vi.fn().mockResolvedValue({
      data: [{ quest_key: 'quest_first_listing' }],
    })
    const completionSelect = vi.fn().mockReturnValue({ eq: completionEq })

    const fromMock = vi
      .fn()
      .mockReturnValueOnce({ select: profileSelect })
      .mockReturnValueOnce({ select: completionSelect })

    makeClient({ from: fromMock })

    const result = await getQuestStatus()

    expect(result.ok).toBe(true)
    expect(result.streak).toBe(4)
    expect(result.credits).toBe(11)
    expect(result.quests?.find((quest) => quest.key === 'quest_daily_login')?.completed).toBe(true)
    expect(result.quests?.find((quest) => quest.key === 'quest_first_listing')?.completed).toBe(true)
  })
})

describe('awardQuest', () => {
  it('rejects manual daily login claims', async () => {
    const profileSingle = vi.fn().mockResolvedValue({
      data: { id: 'profile-1', credits: 0 },
    })
    const profileEq = vi.fn().mockReturnValue({ single: profileSingle })
    const profileSelect = vi.fn().mockReturnValue({ eq: profileEq })

    const fromMock = vi.fn().mockReturnValueOnce({ select: profileSelect })

    makeClient({ from: fromMock })

    const result = await awardQuest('quest_daily_login')

    expect(result).toEqual({
      ok: false,
      error: 'Daily login rewards are awarded automatically.',
    })
  })

  it('rejects first listing when the member has not created one yet', async () => {
    const profileSingle = vi.fn().mockResolvedValue({
      data: { id: 'profile-1', credits: 0 },
    })
    const profileEq = vi.fn().mockReturnValue({ single: profileSingle })
    const profileSelect = vi.fn().mockReturnValue({ eq: profileEq })

    const listingsEq = vi.fn().mockResolvedValue({ count: 0, error: null })
    const listingsSelect = vi.fn().mockReturnValue({ eq: listingsEq })

    const fromMock = vi
      .fn()
      .mockReturnValueOnce({ select: profileSelect })
      .mockReturnValueOnce({ select: listingsSelect })

    makeClient({ from: fromMock })

    const result = await awardQuest('quest_first_listing')

    expect(result).toEqual({
      ok: false,
      error: 'Quest requirements not met yet.',
    })
  })
})
