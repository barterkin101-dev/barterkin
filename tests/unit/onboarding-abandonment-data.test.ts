import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const mockLimit = vi.fn()
const mockOrder = vi.fn(() => ({ limit: mockLimit }))
const mockLte = vi.fn(() => ({ order: mockOrder }))
const mockIs2 = vi.fn(() => ({ lte: mockLte }))
const mockIs = vi.fn(() => ({ is: mockIs2 }))
const mockEq = vi.fn(() => ({ is: mockIs }))
const mockSelect = vi.fn(() => ({ eq: mockEq }))
const mockUpdateEq = vi.fn()
const mockUpdate = vi.fn(() => ({ eq: mockUpdateEq }))
const mockFrom = vi.fn(() => ({ select: mockSelect, update: mockUpdate }))

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
  getOnboardingAbandonmentRecipients,
  recordOnboardingReminderSent,
} from '@/lib/data/onboarding-abandonment'

describe('getOnboardingAbandonmentRecipients', () => {
  beforeEach(() => {
    vi.resetAllMocks()
  })

  it('returns recipients who signed up 24h+ ago and never completed onboarding', async () => {
    mockLimit.mockResolvedValue({
      data: [
        {
          id: 'profile-1',
          display_name: 'Alice',
          username: 'alice',
          owner_id: 'owner-1',
          created_at: '2026-05-15T12:00:00.000Z',
        },
      ],
      error: null,
    })

    const result = await getOnboardingAbandonmentRecipients()

    expect(result.recipients).toHaveLength(1)
    expect(result.recipients[0].id).toBe('profile-1')
    expect(result.error).toBeNull()
  })

  it('returns empty array when no eligible recipients', async () => {
    mockLimit.mockResolvedValue({ data: [], error: null })

    const result = await getOnboardingAbandonmentRecipients()

    expect(result.recipients).toHaveLength(0)
    expect(result.error).toBeNull()
  })

  it('returns fetch_failed on database error', async () => {
    mockLimit.mockResolvedValue({ data: null, error: { message: 'db down' } })

    const result = await getOnboardingAbandonmentRecipients()

    expect(result.recipients).toHaveLength(0)
    expect(result.error).toBe('fetch_failed')
  })
})

describe('recordOnboardingReminderSent', () => {
  beforeEach(() => {
    vi.resetAllMocks()
  })

  it('returns ok after successful update', async () => {
    mockUpdateEq.mockResolvedValueOnce({ error: null })

    const result = await recordOnboardingReminderSent('profile-1')

    expect(result.ok).toBe(true)
  })

  it('returns error when update fails', async () => {
    mockUpdateEq.mockResolvedValueOnce({ error: { message: 'update failed' } })

    const result = await recordOnboardingReminderSent('profile-1')

    expect(result.ok).toBe(false)
    expect(result.error).toBe('update failed')
  })
})
