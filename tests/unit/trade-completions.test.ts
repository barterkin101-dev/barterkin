import { describe, it, expect, vi, beforeEach } from 'vitest'

const mockResendSend = vi.fn().mockResolvedValue({ data: { id: 'email-1' }, error: null })

vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn(),
}))

vi.mock('@/lib/supabase/admin', () => ({
  getSupabaseAdmin: vi.fn(),
}))

vi.mock('next/cache', () => ({
  revalidatePath: vi.fn(),
}))

vi.mock('@/lib/analytics', () => ({
  captureEvent: vi.fn(),
}))

vi.mock('@/lib/actions/quests', () => ({
  awardQuest: vi.fn().mockResolvedValue({ ok: true, awarded: true, credits: 15 }),
}))

vi.mock('resend', () => ({
  Resend: class MockResend {
    emails = {
      send: mockResendSend,
    }
  },
}))

vi.mock('@/lib/rate-limit', () => ({
  limitSubmitRating: vi.fn().mockResolvedValue({ success: true, limit: 60, remaining: 59, reset: 0 }),
}))

import { createClient } from '@/lib/supabase/server'
import { getSupabaseAdmin } from '@/lib/supabase/admin'
import { revalidatePath } from 'next/cache'
import { captureEvent } from '@/lib/analytics'
import { awardQuest } from '@/lib/actions/quests'

import {
  markTradeComplete,
  submitTradeReview,
} from '@/lib/actions/trade-completions'

const VALID_UUID = '550e8400-e29b-41d4-a716-446655440000'
const OTHER_UUID = '550e8400-e29b-41d4-a716-446655440999'
const CONV_UUID = '660e8400-e29b-41d4-a716-446655440000'
const LISTING_UUID = '770e8400-e29b-41d4-a716-446655440000'

function makeSupabaseMock(overrides?: {
  getUser?: ReturnType<typeof vi.fn>
  from?: ReturnType<typeof vi.fn>
  rpc?: ReturnType<typeof vi.fn>
}) {
  const getUserMock = overrides?.getUser ?? vi.fn()
  const fromMock = overrides?.from ?? vi.fn()
  const rpcMock = overrides?.rpc ?? vi.fn()
  const client = {
    auth: { getUser: getUserMock },
    from: fromMock,
    rpc: rpcMock,
  }
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  vi.mocked(createClient).mockResolvedValue(client as any)
  return { getUserMock, fromMock, rpcMock, client }
}

beforeEach(() => {
  vi.clearAllMocks()
  mockResendSend.mockClear()
  process.env.RESEND_API_KEY = 're_test'
  process.env.NEXT_PUBLIC_SITE_URL = 'https://barterkin.test'
  vi.mocked(getSupabaseAdmin).mockReturnValue({
    from: vi.fn((table: string) => {
      if (table === 'trade_completions') {
        return {
          select: vi.fn(() => ({
            eq: vi.fn().mockReturnValue({
              maybeSingle: vi.fn().mockResolvedValue({
                data: {
                  conversation_id: CONV_UUID,
                  listing_id: LISTING_UUID,
                  initiator_profile_id: VALID_UUID,
                  recipient_profile_id: OTHER_UUID,
                },
                error: null,
              }),
            }),
          })),
        }
      }

      if (table === 'profiles') {
        return {
          select: vi.fn(() => ({
            in: vi.fn().mockResolvedValue({
              data: [
                { id: VALID_UUID, display_name: 'Alice', username: 'alice' },
                { id: OTHER_UUID, display_name: 'Bob', username: 'bob' },
              ],
              error: null,
            }),
          })),
        }
      }

      throw new Error(`Unexpected admin table: ${table}`)
    }) as never,
    rpc: vi.fn().mockImplementation((_fn: string, args: { p_profile_id: string }) =>
      Promise.resolve({
        data: args.p_profile_id === VALID_UUID ? 'alice@example.com' : 'bob@example.com',
        error: null,
      }),
    ),
  } as never)
})

// ============================================================================
// markTradeComplete
// ============================================================================
describe('markTradeComplete', () => {
  it('returns unauthorized when not signed in', async () => {
    const { getUserMock } = makeSupabaseMock()
    getUserMock.mockResolvedValue({ data: { user: null }, error: null })

    const fd = new FormData()
    fd.set('conversationId', CONV_UUID)
    const result = await markTradeComplete(null, fd)
    expect(result).toEqual({ ok: false, error: 'Not authenticated.' })
  })

  it('returns error when conversationId missing', async () => {
    const { getUserMock } = makeSupabaseMock()
    getUserMock.mockResolvedValue({ data: { user: { id: 'u1' } }, error: null })

    const fd = new FormData()
    const result = await markTradeComplete(null, fd)
    expect(result).toEqual({ ok: false, error: 'Conversation ID is required.' })
  })

  it('returns profile not found when sender profile missing', async () => {
    const { getUserMock, fromMock } = makeSupabaseMock()
    getUserMock.mockResolvedValue({ data: { user: { id: 'u1' } }, error: null })

    const maybeSingle = vi.fn().mockResolvedValue({ data: null, error: null })
    const eq = vi.fn().mockReturnValue({ maybeSingle })
    const select = vi.fn().mockReturnValue({ eq })
    fromMock.mockReturnValue({ select })

    const fd = new FormData()
    fd.set('conversationId', CONV_UUID)
    const result = await markTradeComplete(null, fd)
    expect(result).toEqual({ ok: false, error: 'Profile not found.' })
  })

  it('returns not participant when not in conversation', async () => {
    const { getUserMock, fromMock } = makeSupabaseMock()
    getUserMock.mockResolvedValue({ data: { user: { id: 'u1' } }, error: null })

    // 1st from('profiles'): sender profile lookup
    const profileMaybeSingle = vi.fn().mockResolvedValue({ data: { id: VALID_UUID }, error: null })
    const profileEq = vi.fn().mockReturnValue({ maybeSingle: profileMaybeSingle })
    const profileSelect = vi.fn().mockReturnValue({ eq: profileEq })

    // 2nd from('conversation_participants'): participant check
    const partMaybeSingle = vi.fn().mockResolvedValue({ data: null, error: null })
    const partEq2 = vi.fn().mockReturnValue({ maybeSingle: partMaybeSingle })
    const partEq1 = vi.fn().mockReturnValue({ eq: partEq2 })
    const partSelect = vi.fn().mockReturnValue({ eq: partEq1 })

    fromMock
      .mockReturnValueOnce({ select: profileSelect })
      .mockReturnValueOnce({ select: partSelect })

    const fd = new FormData()
    fd.set('conversationId', CONV_UUID)
    const result = await markTradeComplete(null, fd)
    expect(result).toEqual({ ok: false, error: 'You are not a participant in this conversation.' })
  })

  it('happy path: calls RPC and returns status on first mark', async () => {
    const { getUserMock, fromMock, rpcMock } = makeSupabaseMock()
    getUserMock.mockResolvedValue({ data: { user: { id: 'u1' } }, error: null })

    // 1st from('profiles'): sender profile lookup
    const profileMaybeSingle = vi.fn().mockResolvedValue({ data: { id: VALID_UUID }, error: null })
    const profileEq = vi.fn().mockReturnValue({ maybeSingle: profileMaybeSingle })
    const profileSelect = vi.fn().mockReturnValue({ eq: profileEq })

    // 2nd from('conversation_participants'): participant check
    const partMaybeSingle = vi.fn().mockResolvedValue({ data: { id: 'part-1' }, error: null })
    const partEq2 = vi.fn().mockReturnValue({ maybeSingle: partMaybeSingle })
    const partEq1 = vi.fn().mockReturnValue({ eq: partEq2 })
    const partSelect = vi.fn().mockReturnValue({ eq: partEq1 })

    fromMock
      .mockReturnValueOnce({ select: profileSelect })
      .mockReturnValueOnce({ select: partSelect })

    rpcMock.mockResolvedValue({
      data: [{ status: 'initiator_marked', completed_at: null }],
      error: null,
    })

    const fd = new FormData()
    fd.set('conversationId', CONV_UUID)
    const result = await markTradeComplete(null, fd)

    expect(result).toEqual({ ok: true, status: 'initiator_marked', completedAt: null })
    expect(rpcMock).toHaveBeenCalledWith('mark_trade_complete', {
      p_conversation_id: CONV_UUID,
      p_profile_id: VALID_UUID,
    })
    expect(vi.mocked(captureEvent)).toHaveBeenCalledWith('u1', 'trade_marked_complete', {
      conversation_id: CONV_UUID,
      status: 'initiator_marked',
    })
    expect(vi.mocked(awardQuest)).not.toHaveBeenCalled()
    expect(vi.mocked(revalidatePath)).toHaveBeenCalledWith(`/dashboard/messages/${CONV_UUID}`)
  })

  it('fires trade_mutually_completed when RPC returns completed status', async () => {
    const { getUserMock, fromMock, rpcMock } = makeSupabaseMock()
    getUserMock.mockResolvedValue({ data: { user: { id: 'u1' } }, error: null })

    const profileMaybeSingle = vi.fn().mockResolvedValue({ data: { id: VALID_UUID }, error: null })
    const profileEq = vi.fn().mockReturnValue({ maybeSingle: profileMaybeSingle })
    const profileSelect = vi.fn().mockReturnValue({ eq: profileEq })

    const partMaybeSingle = vi.fn().mockResolvedValue({ data: { id: 'part-1' }, error: null })
    const partEq2 = vi.fn().mockReturnValue({ maybeSingle: partMaybeSingle })
    const partEq1 = vi.fn().mockReturnValue({ eq: partEq2 })
    const partSelect = vi.fn().mockReturnValue({ eq: partEq1 })

    fromMock
      .mockReturnValueOnce({ select: profileSelect })
      .mockReturnValueOnce({ select: partSelect })

    rpcMock.mockResolvedValue({
      data: [{ status: 'completed', completed_at: '2026-05-13T20:00:00Z' }],
      error: null,
    })

    const fd = new FormData()
    fd.set('conversationId', CONV_UUID)
    const result = await markTradeComplete(null, fd)

    expect(result.ok).toBe(true)
    expect(result.status).toBe('completed')
    expect(vi.mocked(captureEvent)).toHaveBeenCalledWith('u1', 'trade_mutually_completed', {
      conversation_id: CONV_UUID,
    })
    expect(vi.mocked(captureEvent)).toHaveBeenCalledWith('u1', 'trade_completion_rate', {
      conversation_id: CONV_UUID,
      listing_id: null,
      completed: true,
    })
    expect(vi.mocked(awardQuest)).toHaveBeenCalledWith('quest_first_trade')
    expect(mockResendSend).toHaveBeenCalledTimes(2)
  })

  it('returns error on RPC failure', async () => {
    const { getUserMock, fromMock, rpcMock } = makeSupabaseMock()
    getUserMock.mockResolvedValue({ data: { user: { id: 'u1' } }, error: null })

    const profileMaybeSingle = vi.fn().mockResolvedValue({ data: { id: VALID_UUID }, error: null })
    const profileEq = vi.fn().mockReturnValue({ maybeSingle: profileMaybeSingle })
    const profileSelect = vi.fn().mockReturnValue({ eq: profileEq })

    const partMaybeSingle = vi.fn().mockResolvedValue({ data: { id: 'part-1' }, error: null })
    const partEq2 = vi.fn().mockReturnValue({ maybeSingle: partMaybeSingle })
    const partEq1 = vi.fn().mockReturnValue({ eq: partEq2 })
    const partSelect = vi.fn().mockReturnValue({ eq: partEq1 })

    fromMock
      .mockReturnValueOnce({ select: profileSelect })
      .mockReturnValueOnce({ select: partSelect })

    rpcMock.mockResolvedValue({ data: null, error: { code: 'P0001', message: 'boom' } })

    const fd = new FormData()
    fd.set('conversationId', CONV_UUID)
    const result = await markTradeComplete(null, fd)
    expect(result.ok).toBe(false)
    expect(result.error).toContain('Something went wrong')
  })
})

// ============================================================================
// submitTradeReview
// ============================================================================
describe('submitTradeReview', () => {
  it('returns unauthorized when not signed in', async () => {
    const { getUserMock } = makeSupabaseMock()
    getUserMock.mockResolvedValue({ data: { user: null }, error: null })

    const fd = new FormData()
    fd.set('conversationId', CONV_UUID)
    fd.set('rateeProfileId', OTHER_UUID)
    fd.set('score', '5')
    const result = await submitTradeReview(null, fd)
    expect(result).toEqual({ ok: false, error: 'Not authenticated.' })
  })

  it('returns validation error for invalid score', async () => {
    const { getUserMock, fromMock } = makeSupabaseMock()
    getUserMock.mockResolvedValue({ data: { user: { id: 'u1' } }, error: null })

    const maybeSingle = vi.fn().mockResolvedValue({ data: { id: VALID_UUID }, error: null })
    const eq = vi.fn().mockReturnValue({ maybeSingle })
    const select = vi.fn().mockReturnValue({ eq })
    fromMock.mockReturnValue({ select })

    const fd = new FormData()
    fd.set('conversationId', CONV_UUID)
    fd.set('rateeProfileId', OTHER_UUID)
    fd.set('score', '0')
    const result = await submitTradeReview(null, fd)
    expect(result.ok).toBe(false)
    expect(result.error).toContain('Minimum rating')
  })

  it('blocks self-rating', async () => {
    const { getUserMock, fromMock } = makeSupabaseMock()
    getUserMock.mockResolvedValue({ data: { user: { id: 'u1' } }, error: null })

    const maybeSingle = vi.fn().mockResolvedValue({ data: { id: VALID_UUID }, error: null })
    const eq = vi.fn().mockReturnValue({ maybeSingle })
    const select = vi.fn().mockReturnValue({ eq })
    fromMock.mockReturnValue({ select })

    const fd = new FormData()
    fd.set('conversationId', CONV_UUID)
    fd.set('rateeProfileId', VALID_UUID)
    fd.set('score', '5')
    const result = await submitTradeReview(null, fd)
    expect(result).toEqual({ ok: false, error: "You can't rate yourself." })
  })

  it('returns error when trade not mutually completed', async () => {
    const { getUserMock, fromMock } = makeSupabaseMock()
    getUserMock.mockResolvedValue({ data: { user: { id: 'u1' } }, error: null })

    // 1st from('profiles'): rater profile lookup
    const profileMaybeSingle = vi.fn().mockResolvedValue({ data: { id: VALID_UUID }, error: null })
    const profileEq = vi.fn().mockReturnValue({ maybeSingle: profileMaybeSingle })
    const profileSelect = vi.fn().mockReturnValue({ eq: profileEq })

    // 2nd from('trade_completions'): status check
    const tcMaybeSingle = vi.fn().mockResolvedValue({ data: { status: 'initiator_marked' }, error: null })
    const tcEq = vi.fn().mockReturnValue({ maybeSingle: tcMaybeSingle })
    const tcSelect = vi.fn().mockReturnValue({ eq: tcEq })

    fromMock
      .mockReturnValueOnce({ select: profileSelect })
      .mockReturnValueOnce({ select: tcSelect })

    const fd = new FormData()
    fd.set('conversationId', CONV_UUID)
    fd.set('rateeProfileId', OTHER_UUID)
    fd.set('score', '5')
    const result = await submitTradeReview(null, fd)
    expect(result).toEqual({ ok: false, error: 'Trade must be mutually completed before leaving a review.' })
  })

  it('returns error when not a participant', async () => {
    const { getUserMock, fromMock } = makeSupabaseMock()
    getUserMock.mockResolvedValue({ data: { user: { id: 'u1' } }, error: null })

    // 1st from('profiles'): rater profile lookup
    const profileMaybeSingle = vi.fn().mockResolvedValue({ data: { id: VALID_UUID }, error: null })
    const profileEq = vi.fn().mockReturnValue({ maybeSingle: profileMaybeSingle })
    const profileSelect = vi.fn().mockReturnValue({ eq: profileEq })

    // 2nd from('trade_completions'): status check — completed
    const tcMaybeSingle = vi.fn().mockResolvedValue({ data: { status: 'completed' }, error: null })
    const tcEq = vi.fn().mockReturnValue({ maybeSingle: tcMaybeSingle })
    const tcSelect = vi.fn().mockReturnValue({ eq: tcEq })

    // 3rd from('conversation_participants'): participant check — not found
    const partMaybeSingle = vi.fn().mockResolvedValue({ data: null, error: null })
    const partEq2 = vi.fn().mockReturnValue({ maybeSingle: partMaybeSingle })
    const partEq1 = vi.fn().mockReturnValue({ eq: partEq2 })
    const partSelect = vi.fn().mockReturnValue({ eq: partEq1 })

    fromMock
      .mockReturnValueOnce({ select: profileSelect })
      .mockReturnValueOnce({ select: tcSelect })
      .mockReturnValueOnce({ select: partSelect })

    const fd = new FormData()
    fd.set('conversationId', CONV_UUID)
    fd.set('rateeProfileId', OTHER_UUID)
    fd.set('score', '5')
    const result = await submitTradeReview(null, fd)
    expect(result).toEqual({ ok: false, error: 'You are not a participant in this conversation.' })
  })

  it('returns error when already reviewed', async () => {
    const { getUserMock, fromMock } = makeSupabaseMock()
    getUserMock.mockResolvedValue({ data: { user: { id: 'u1' } }, error: null })

    // 1st from('profiles'): rater profile lookup
    const profileMaybeSingle = vi.fn().mockResolvedValue({ data: { id: VALID_UUID }, error: null })
    const profileEq = vi.fn().mockReturnValue({ maybeSingle: profileMaybeSingle })
    const profileSelect = vi.fn().mockReturnValue({ eq: profileEq })

    // 2nd from('trade_completions'): status check — completed
    const tcMaybeSingle = vi.fn().mockResolvedValue({ data: { status: 'completed' }, error: null })
    const tcEq = vi.fn().mockReturnValue({ maybeSingle: tcMaybeSingle })
    const tcSelect = vi.fn().mockReturnValue({ eq: tcEq })

    // 3rd from('conversation_participants'): participant check — found
    const partMaybeSingle = vi.fn().mockResolvedValue({ data: { id: 'part-1' }, error: null })
    const partEq2 = vi.fn().mockReturnValue({ maybeSingle: partMaybeSingle })
    const partEq1 = vi.fn().mockReturnValue({ eq: partEq2 })
    const partSelect = vi.fn().mockReturnValue({ eq: partEq1 })

    // 4th from('ratings'): existing check — found
    const existingMaybeSingle = vi.fn().mockResolvedValue({ data: { id: 'rating-1' }, error: null })
    const existingEq3 = vi.fn().mockReturnValue({ maybeSingle: existingMaybeSingle })
    const existingEq2 = vi.fn().mockReturnValue({ eq: existingEq3 })
    const existingEq1 = vi.fn().mockReturnValue({ eq: existingEq2 })
    const existingSelect = vi.fn().mockReturnValue({ eq: existingEq1 })

    fromMock
      .mockReturnValueOnce({ select: profileSelect })
      .mockReturnValueOnce({ select: tcSelect })
      .mockReturnValueOnce({ select: partSelect })
      .mockReturnValueOnce({ select: existingSelect })

    const fd = new FormData()
    fd.set('conversationId', CONV_UUID)
    fd.set('rateeProfileId', OTHER_UUID)
    fd.set('score', '5')
    const result = await submitTradeReview(null, fd)
    expect(result).toEqual({ ok: false, error: 'You have already reviewed this trade.' })
  })

  it('happy path: inserts review with conversation_id and fires analytics', async () => {
    const { getUserMock, fromMock } = makeSupabaseMock()
    getUserMock.mockResolvedValue({ data: { user: { id: 'u1' } }, error: null })

    // 1st from('profiles'): rater profile lookup
    const profileMaybeSingle = vi.fn().mockResolvedValue({ data: { id: VALID_UUID }, error: null })
    const profileEq = vi.fn().mockReturnValue({ maybeSingle: profileMaybeSingle })
    const profileSelect = vi.fn().mockReturnValue({ eq: profileEq })

    // 2nd from('trade_completions'): status check — completed
    const tcMaybeSingle = vi.fn().mockResolvedValue({ data: { status: 'completed' }, error: null })
    const tcEq = vi.fn().mockReturnValue({ maybeSingle: tcMaybeSingle })
    const tcSelect = vi.fn().mockReturnValue({ eq: tcEq })

    // 3rd from('conversation_participants'): participant check — found
    const partMaybeSingle = vi.fn().mockResolvedValue({ data: { id: 'part-1' }, error: null })
    const partEq2 = vi.fn().mockReturnValue({ maybeSingle: partMaybeSingle })
    const partEq1 = vi.fn().mockReturnValue({ eq: partEq2 })
    const partSelect = vi.fn().mockReturnValue({ eq: partEq1 })

    // 4th from('ratings'): existing check — not found
    const existingMaybeSingle = vi.fn().mockResolvedValue({ data: null, error: null })
    const existingEq3 = vi.fn().mockReturnValue({ maybeSingle: existingMaybeSingle })
    const existingEq2 = vi.fn().mockReturnValue({ eq: existingEq3 })
    const existingEq1 = vi.fn().mockReturnValue({ eq: existingEq2 })
    const existingSelect = vi.fn().mockReturnValue({ eq: existingEq1 })

    // 5th from('ratings'): insert
    const insertFn = vi.fn().mockResolvedValue({ error: null })

    fromMock
      .mockReturnValueOnce({ select: profileSelect })
      .mockReturnValueOnce({ select: tcSelect })
      .mockReturnValueOnce({ select: partSelect })
      .mockReturnValueOnce({ select: existingSelect })
      .mockReturnValueOnce({ insert: insertFn })

    const fd = new FormData()
    fd.set('conversationId', CONV_UUID)
    fd.set('rateeProfileId', OTHER_UUID)
    fd.set('listingId', LISTING_UUID)
    fd.set('score', '5')
    fd.set('reviewText', 'Great trade!')
    const result = await submitTradeReview(null, fd)

    expect(result).toEqual({ ok: true })
    expect(insertFn).toHaveBeenCalledWith(
      expect.objectContaining({
        rater_profile_id: VALID_UUID,
        ratee_profile_id: OTHER_UUID,
        conversation_id: CONV_UUID,
        listing_id: LISTING_UUID,
        score: 5,
        review_text: 'Great trade!',
      }),
    )
    expect(vi.mocked(captureEvent)).toHaveBeenCalledWith('u1', 'trade_review_submitted', {
      conversation_id: CONV_UUID,
      ratee_profile_id: OTHER_UUID,
      listing_id: LISTING_UUID,
      score: 5,
    })
    expect(vi.mocked(revalidatePath)).toHaveBeenCalledWith(`/m/${OTHER_UUID}`)
    expect(vi.mocked(revalidatePath)).toHaveBeenCalledWith('/dashboard/reviews')
    expect(vi.mocked(revalidatePath)).toHaveBeenCalledWith(`/dashboard/messages/${CONV_UUID}`)
  })
})
