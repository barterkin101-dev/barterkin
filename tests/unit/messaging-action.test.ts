import { describe, it, expect, vi, beforeEach } from 'vitest'

// vi.mock is hoisted to the top of the file by Vitest.
// Factory functions CANNOT reference variables declared in the test file scope.

vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn(),
}))

vi.mock('next/cache', () => ({
  revalidatePath: vi.fn(),
}))

vi.mock('@/lib/analytics', () => ({
  captureEvent: vi.fn(),
}))

vi.mock('@/lib/rate-limit', () => ({
  limitSendMessage: vi.fn().mockResolvedValue({ success: true, limit: 60, remaining: 59, reset: 0 }),
}))

vi.mock('@/lib/actions/quests', () => ({
  awardQuest: vi.fn().mockResolvedValue({ ok: true, awarded: true, credits: 2 }),
}))

// Import mocked modules AFTER vi.mock declarations
import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { limitSendMessage } from '@/lib/rate-limit'
import { awardQuest } from '@/lib/actions/quests'

import {
  sendMessage,
  createConversation,
  markConversationRead,
} from '@/lib/actions/messaging'

const VALID_UUID = '550e8400-e29b-41d4-a716-446655440000'
const OTHER_UUID = '550e8400-e29b-41d4-a716-446655440999'
const CONV_UUID = '660e8400-e29b-41d4-a716-446655440000'
const MSG_UUID = '770e8400-e29b-41d4-a716-446655440000'

// Helper to create a typed Supabase client mock
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
  // Reset rate limit mock to allow requests by default
  vi.mocked(limitSendMessage).mockResolvedValue({
    success: true,
    limit: 60,
    remaining: 59,
    reset: 0,
  })
})

// ============================================================================
// sendMessage
// ============================================================================
describe('sendMessage', () => {
  it('returns unauthorized when user not signed in', async () => {
    const { getUserMock } = makeSupabaseMock()
    getUserMock.mockResolvedValue({ data: { user: null }, error: null })

    const fd = new FormData()
    fd.set('conversationId', CONV_UUID)
    fd.set('content', 'Hello world')
    const result = await sendMessage(null, fd)
    expect(result).toEqual({ ok: false, error: 'Not authenticated.' })
  })

  it('returns rate limit error when limit exceeded', async () => {
    const { getUserMock, fromMock } = makeSupabaseMock()
    getUserMock.mockResolvedValue({ data: { user: { id: 'u1' } }, error: null })

    const maybeSingle = vi.fn().mockResolvedValue({ data: { id: VALID_UUID }, error: null })
    const eq = vi.fn().mockReturnValue({ maybeSingle })
    const select = vi.fn().mockReturnValue({ eq })
    fromMock.mockReturnValue({ select })

    vi.mocked(limitSendMessage).mockResolvedValue({ success: false, limit: 60, remaining: 0, reset: 0 })

    const fd = new FormData()
    fd.set('conversationId', CONV_UUID)
    fd.set('content', 'Hello world')
    const result = await sendMessage(null, fd)
    expect(result).toEqual({ ok: false, error: 'Rate limit exceeded. Please slow down.' })
  })

  it('returns validation error for empty message', async () => {
    const { getUserMock, fromMock } = makeSupabaseMock()
    getUserMock.mockResolvedValue({ data: { user: { id: 'u1' } }, error: null })

    const maybeSingle = vi.fn().mockResolvedValue({ data: { id: VALID_UUID }, error: null })
    const eq = vi.fn().mockReturnValue({ maybeSingle })
    const select = vi.fn().mockReturnValue({ eq })
    fromMock.mockReturnValue({ select })

    const fd = new FormData()
    fd.set('conversationId', CONV_UUID)
    fd.set('content', '   ')
    const result = await sendMessage(null, fd)
    expect(result.ok).toBe(false)
    expect(result.error).toContain('empty')
  })

  it('returns validation error for message too long', async () => {
    const { getUserMock, fromMock } = makeSupabaseMock()
    getUserMock.mockResolvedValue({ data: { user: { id: 'u1' } }, error: null })

    const maybeSingle = vi.fn().mockResolvedValue({ data: { id: VALID_UUID }, error: null })
    const eq = vi.fn().mockReturnValue({ maybeSingle })
    const select = vi.fn().mockReturnValue({ eq })
    fromMock.mockReturnValue({ select })

    const fd = new FormData()
    fd.set('conversationId', CONV_UUID)
    fd.set('content', 'a'.repeat(2001))
    const result = await sendMessage(null, fd)
    expect(result.ok).toBe(false)
    expect(result.error).toContain('2000')
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
    fd.set('content', 'Hello world')
    const result = await sendMessage(null, fd)
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
    fd.set('content', 'Hello world')
    const result = await sendMessage(null, fd)
    expect(result).toEqual({ ok: false, error: 'You are not a participant in this conversation.' })
  })

  it('happy path: inserts message, updates conversation, revalidates, returns messageId', async () => {
    const { getUserMock, fromMock } = makeSupabaseMock()
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

    // 3rd from('messages'): insert message
    const msgSingle = vi.fn().mockResolvedValue({ data: { id: MSG_UUID }, error: null })
    const msgSelect = vi.fn().mockReturnValue({ single: msgSingle })
    const msgInsert = vi.fn().mockReturnValue({ select: msgSelect })

    // 4th from('conversations'): update updated_at
    const convEq2 = vi.fn().mockResolvedValue({ error: null })
    const convEq1 = vi.fn().mockReturnValue({ eq: convEq2 })
    const convUpdate = vi.fn().mockReturnValue({ eq: convEq1 })

    fromMock
      .mockReturnValueOnce({ select: profileSelect })
      .mockReturnValueOnce({ select: partSelect })
      .mockReturnValueOnce({ insert: msgInsert })
      .mockReturnValueOnce({ update: convUpdate })

    const fd = new FormData()
    fd.set('conversationId', CONV_UUID)
    fd.set('content', 'Hello world')
    const result = await sendMessage(null, fd)

    expect(result).toEqual({ ok: true, messageId: MSG_UUID })
    expect(msgInsert).toHaveBeenCalledWith(
      expect.objectContaining({
        conversation_id: CONV_UUID,
        sender_profile_id: VALID_UUID,
        content: 'Hello world',
      }),
    )
    expect(vi.mocked(revalidatePath)).toHaveBeenCalledWith('/dashboard/messages')
    expect(vi.mocked(revalidatePath)).toHaveBeenCalledWith(`/dashboard/messages/${CONV_UUID}`)
    expect(vi.mocked(awardQuest)).toHaveBeenCalledWith('quest_first_message')
  })

  it('returns unknown error on insert failure', async () => {
    const { getUserMock, fromMock } = makeSupabaseMock()
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

    // 3rd from('messages'): insert fails
    const msgSingle = vi.fn().mockResolvedValue({ data: null, error: { code: '23505' } })
    const msgSelect = vi.fn().mockReturnValue({ single: msgSingle })
    const msgInsert = vi.fn().mockReturnValue({ select: msgSelect })

    fromMock
      .mockReturnValueOnce({ select: profileSelect })
      .mockReturnValueOnce({ select: partSelect })
      .mockReturnValueOnce({ insert: msgInsert })

    const fd = new FormData()
    fd.set('conversationId', CONV_UUID)
    fd.set('content', 'Hello world')
    const result = await sendMessage(null, fd)
    expect(result.ok).toBe(false)
    expect(result.error).toContain('Something went wrong')
  })
})

// ============================================================================
// createConversation
// ============================================================================
describe('createConversation', () => {
  it('returns unauthorized when user not signed in', async () => {
    const { getUserMock } = makeSupabaseMock()
    getUserMock.mockResolvedValue({ data: { user: null }, error: null })

    const fd = new FormData()
    fd.set('recipientProfileId', OTHER_UUID)
    fd.set('initialMessage', 'Hello there')
    const result = await createConversation(null, fd)
    expect(result).toEqual({ ok: false, error: 'Not authenticated.' })
  })

  it('returns rate limit error when limit exceeded', async () => {
    const { getUserMock } = makeSupabaseMock()
    getUserMock.mockResolvedValue({ data: { user: { id: 'u1' } }, error: null })
    vi.mocked(limitSendMessage).mockResolvedValue({ success: false, limit: 60, remaining: 0, reset: 0 })

    const fd = new FormData()
    fd.set('recipientProfileId', OTHER_UUID)
    fd.set('initialMessage', 'Hello there')
    const result = await createConversation(null, fd)
    expect(result).toEqual({ ok: false, error: 'Rate limit exceeded. Please slow down.' })
  })

  it('returns validation error for empty initial message', async () => {
    const { getUserMock } = makeSupabaseMock()
    getUserMock.mockResolvedValue({ data: { user: { id: 'u1' } }, error: null })

    const fd = new FormData()
    fd.set('recipientProfileId', OTHER_UUID)
    fd.set('initialMessage', '   ')
    const result = await createConversation(null, fd)
    expect(result.ok).toBe(false)
    expect(result.error).toContain('empty')
  })

  it('returns profile not found when sender profile missing', async () => {
    const { getUserMock, fromMock } = makeSupabaseMock()
    getUserMock.mockResolvedValue({ data: { user: { id: 'u1' } }, error: null })

    const maybeSingle = vi.fn().mockResolvedValue({ data: null, error: null })
    const eq = vi.fn().mockReturnValue({ maybeSingle })
    const select = vi.fn().mockReturnValue({ eq })
    fromMock.mockReturnValue({ select })

    const fd = new FormData()
    fd.set('recipientProfileId', OTHER_UUID)
    fd.set('initialMessage', 'Hello there')
    const result = await createConversation(null, fd)
    expect(result).toEqual({ ok: false, error: 'Profile not found.' })
  })

  it('blocks self-messaging', async () => {
    const { getUserMock, fromMock } = makeSupabaseMock()
    getUserMock.mockResolvedValue({ data: { user: { id: 'u1' } }, error: null })

    const maybeSingle = vi.fn().mockResolvedValue({ data: { id: VALID_UUID }, error: null })
    const eq = vi.fn().mockReturnValue({ maybeSingle })
    const select = vi.fn().mockReturnValue({ eq })
    fromMock.mockReturnValue({ select })

    const fd = new FormData()
    fd.set('recipientProfileId', VALID_UUID)
    fd.set('initialMessage', 'Hello there')
    const result = await createConversation(null, fd)
    expect(result).toEqual({ ok: false, error: "You can't message yourself." })
  })

  it('uses existing conversation if found via RPC', async () => {
    const { getUserMock, fromMock, rpcMock } = makeSupabaseMock()
    getUserMock.mockResolvedValue({ data: { user: { id: 'u1' } }, error: null })

    // 1st from('profiles'): sender profile lookup
    const profileMaybeSingle = vi.fn().mockResolvedValue({ data: { id: VALID_UUID }, error: null })
    const profileEq = vi.fn().mockReturnValue({ maybeSingle: profileMaybeSingle })
    const profileSelect = vi.fn().mockReturnValue({ eq: profileEq })

    // RPC returns existing conversation
    rpcMock.mockResolvedValue({ data: [{ id: CONV_UUID }], error: null })

    // 2nd from('messages'): insert initial message
    const msgSingle = vi.fn().mockResolvedValue({ data: { id: MSG_UUID }, error: null })
    const msgSelect = vi.fn().mockReturnValue({ single: msgSingle })
    const msgInsert = vi.fn().mockReturnValue({ select: msgSelect })

    fromMock
      .mockReturnValueOnce({ select: profileSelect })
      .mockReturnValueOnce({ insert: msgInsert })

    const fd = new FormData()
    fd.set('recipientProfileId', OTHER_UUID)
    fd.set('initialMessage', 'Hello there')
    const result = await createConversation(null, fd)

    expect(result).toEqual({ ok: true, conversationId: CONV_UUID })
    expect(rpcMock).toHaveBeenCalledWith('find_conversation_between', {
      p_profile_a: VALID_UUID,
      p_profile_b: OTHER_UUID,
    })
    expect(msgInsert).toHaveBeenCalledWith(
      expect.objectContaining({
        conversation_id: CONV_UUID,
        sender_profile_id: VALID_UUID,
        content: 'Hello there',
      }),
    )
  })

  it('creates new conversation with participants when none exists', async () => {
    const { getUserMock, fromMock, rpcMock } = makeSupabaseMock()
    getUserMock.mockResolvedValue({ data: { user: { id: 'u1' } }, error: null })

    // 1st from('profiles'): sender profile lookup
    const profileMaybeSingle = vi.fn().mockResolvedValue({ data: { id: VALID_UUID }, error: null })
    const profileEq = vi.fn().mockReturnValue({ maybeSingle: profileMaybeSingle })
    const profileSelect = vi.fn().mockReturnValue({ eq: profileEq })

    // RPC returns no existing conversation
    rpcMock.mockResolvedValue({ data: null, error: null })

    // 2nd from('conversations'): insert conversation
    const convSingle = vi.fn().mockResolvedValue({ data: { id: CONV_UUID }, error: null })
    const convSelect = vi.fn().mockReturnValue({ single: convSingle })
    const convInsert = vi.fn().mockReturnValue({ select: convSelect })

    // 3rd from('conversation_participants'): insert participants
    const partInsert = vi.fn().mockResolvedValue({ error: null })

    // 4th from('messages'): insert initial message
    const msgSingle = vi.fn().mockResolvedValue({ data: { id: MSG_UUID }, error: null })
    const msgSelect = vi.fn().mockReturnValue({ single: msgSingle })
    const msgInsert = vi.fn().mockReturnValue({ select: msgSelect })

    fromMock
      .mockReturnValueOnce({ select: profileSelect })
      .mockReturnValueOnce({ insert: convInsert })
      .mockReturnValueOnce({ insert: partInsert })
      .mockReturnValueOnce({ insert: msgInsert })

    const fd = new FormData()
    fd.set('recipientProfileId', OTHER_UUID)
    fd.set('initialMessage', 'Hello there')
    const result = await createConversation(null, fd)

    expect(result).toEqual({ ok: true, conversationId: CONV_UUID })
    expect(convInsert).toHaveBeenCalledWith(
      expect.objectContaining({ listing_id: null }),
    )
    expect(partInsert).toHaveBeenCalledWith([
      { conversation_id: CONV_UUID, profile_id: VALID_UUID },
      { conversation_id: CONV_UUID, profile_id: OTHER_UUID },
    ])
    expect(vi.mocked(awardQuest)).toHaveBeenCalledWith('quest_first_message')
  })

  it('returns error when conversation insert fails', async () => {
    const { getUserMock, fromMock, rpcMock } = makeSupabaseMock()
    getUserMock.mockResolvedValue({ data: { user: { id: 'u1' } }, error: null })

    // 1st from('profiles'): sender profile lookup
    const profileMaybeSingle = vi.fn().mockResolvedValue({ data: { id: VALID_UUID }, error: null })
    const profileEq = vi.fn().mockReturnValue({ maybeSingle: profileMaybeSingle })
    const profileSelect = vi.fn().mockReturnValue({ eq: profileEq })

    // RPC returns no existing conversation
    rpcMock.mockResolvedValue({ data: null, error: null })

    // 2nd from('conversations'): insert fails
    const convSingle = vi.fn().mockResolvedValue({ data: null, error: { code: '23505' } })
    const convSelect = vi.fn().mockReturnValue({ single: convSingle })
    const convInsert = vi.fn().mockReturnValue({ select: convSelect })

    fromMock
      .mockReturnValueOnce({ select: profileSelect })
      .mockReturnValueOnce({ insert: convInsert })

    const fd = new FormData()
    fd.set('recipientProfileId', OTHER_UUID)
    fd.set('initialMessage', 'Hello there')
    const result = await createConversation(null, fd)
    expect(result.ok).toBe(false)
    expect(result.error).toContain('Something went wrong')
  })

  it('returns error when participant insert fails', async () => {
    const { getUserMock, fromMock, rpcMock } = makeSupabaseMock()
    getUserMock.mockResolvedValue({ data: { user: { id: 'u1' } }, error: null })

    // 1st from('profiles'): sender profile lookup
    const profileMaybeSingle = vi.fn().mockResolvedValue({ data: { id: VALID_UUID }, error: null })
    const profileEq = vi.fn().mockReturnValue({ maybeSingle: profileMaybeSingle })
    const profileSelect = vi.fn().mockReturnValue({ eq: profileEq })

    // RPC returns no existing conversation
    rpcMock.mockResolvedValue({ data: null, error: null })

    // 2nd from('conversations'): insert conversation
    const convSingle = vi.fn().mockResolvedValue({ data: { id: CONV_UUID }, error: null })
    const convSelect = vi.fn().mockReturnValue({ single: convSingle })
    const convInsert = vi.fn().mockReturnValue({ select: convSelect })

    // 3rd from('conversation_participants'): insert fails
    const partInsert = vi.fn().mockResolvedValue({ error: { code: '23505' } })

    fromMock
      .mockReturnValueOnce({ select: profileSelect })
      .mockReturnValueOnce({ insert: convInsert })
      .mockReturnValueOnce({ insert: partInsert })

    const fd = new FormData()
    fd.set('recipientProfileId', OTHER_UUID)
    fd.set('initialMessage', 'Hello there')
    const result = await createConversation(null, fd)
    expect(result.ok).toBe(false)
    expect(result.error).toContain('Something went wrong')
  })

  it('returns error when initial message insert fails', async () => {
    const { getUserMock, fromMock, rpcMock } = makeSupabaseMock()
    getUserMock.mockResolvedValue({ data: { user: { id: 'u1' } }, error: null })

    // 1st from('profiles'): sender profile lookup
    const profileMaybeSingle = vi.fn().mockResolvedValue({ data: { id: VALID_UUID }, error: null })
    const profileEq = vi.fn().mockReturnValue({ maybeSingle: profileMaybeSingle })
    const profileSelect = vi.fn().mockReturnValue({ eq: profileEq })

    // RPC returns existing conversation
    rpcMock.mockResolvedValue({ data: [{ id: CONV_UUID }], error: null })

    // 2nd from('messages'): insert fails
    const msgSingle = vi.fn().mockResolvedValue({ data: null, error: { code: '23505' } })
    const msgSelect = vi.fn().mockReturnValue({ single: msgSingle })
    const msgInsert = vi.fn().mockReturnValue({ select: msgSelect })

    fromMock
      .mockReturnValueOnce({ select: profileSelect })
      .mockReturnValueOnce({ insert: msgInsert })

    const fd = new FormData()
    fd.set('recipientProfileId', OTHER_UUID)
    fd.set('initialMessage', 'Hello there')
    const result = await createConversation(null, fd)
    expect(result.ok).toBe(false)
    expect(result.error).toContain('Something went wrong')
  })
})

// ============================================================================
// markConversationRead
// ============================================================================
describe('markConversationRead', () => {
  it('returns unauthorized when user not signed in', async () => {
    const { getUserMock } = makeSupabaseMock()
    getUserMock.mockResolvedValue({ data: { user: null }, error: null })

    const fd = new FormData()
    fd.set('conversationId', CONV_UUID)
    const result = await markConversationRead(null, fd)
    expect(result).toEqual({ ok: false, error: 'Not authenticated.' })
  })

  it('returns error when conversationId missing', async () => {
    const { getUserMock } = makeSupabaseMock()
    getUserMock.mockResolvedValue({ data: { user: { id: 'u1' } }, error: null })

    const fd = new FormData()
    const result = await markConversationRead(null, fd)
    expect(result).toEqual({ ok: false, error: 'Conversation ID is required.' })
  })

  it('returns profile not found when profile missing', async () => {
    const { getUserMock, fromMock } = makeSupabaseMock()
    getUserMock.mockResolvedValue({ data: { user: { id: 'u1' } }, error: null })

    const maybeSingle = vi.fn().mockResolvedValue({ data: null, error: null })
    const eq = vi.fn().mockReturnValue({ maybeSingle })
    const select = vi.fn().mockReturnValue({ eq })
    fromMock.mockReturnValue({ select })

    const fd = new FormData()
    fd.set('conversationId', CONV_UUID)
    const result = await markConversationRead(null, fd)
    expect(result).toEqual({ ok: false, error: 'Profile not found.' })
  })

  it('happy path: updates last_read_at and revalidates', async () => {
    const { getUserMock, fromMock } = makeSupabaseMock()
    getUserMock.mockResolvedValue({ data: { user: { id: 'u1' } }, error: null })

    // 1st from('profiles'): profile lookup
    const profileMaybeSingle = vi.fn().mockResolvedValue({ data: { id: VALID_UUID }, error: null })
    const profileEq = vi.fn().mockReturnValue({ maybeSingle: profileMaybeSingle })
    const profileSelect = vi.fn().mockReturnValue({ eq: profileEq })

    // 2nd from('conversation_participants'): update last_read_at
    const updateEq2 = vi.fn().mockResolvedValue({ error: null })
    const updateEq1 = vi.fn().mockReturnValue({ eq: updateEq2 })
    const updateFn = vi.fn().mockReturnValue({ eq: updateEq1 })

    fromMock
      .mockReturnValueOnce({ select: profileSelect })
      .mockReturnValueOnce({ update: updateFn })

    const fd = new FormData()
    fd.set('conversationId', CONV_UUID)
    const result = await markConversationRead(null, fd)

    expect(result).toEqual({ ok: true })
    expect(updateFn).toHaveBeenCalledWith(
      expect.objectContaining({ last_read_at: expect.any(String) }),
    )
    expect(vi.mocked(revalidatePath)).toHaveBeenCalledWith('/dashboard/messages')
  })

  it('returns error on update failure', async () => {
    const { getUserMock, fromMock } = makeSupabaseMock()
    getUserMock.mockResolvedValue({ data: { user: { id: 'u1' } }, error: null })

    // 1st from('profiles'): profile lookup
    const profileMaybeSingle = vi.fn().mockResolvedValue({ data: { id: VALID_UUID }, error: null })
    const profileEq = vi.fn().mockReturnValue({ maybeSingle: profileMaybeSingle })
    const profileSelect = vi.fn().mockReturnValue({ eq: profileEq })

    // 2nd from('conversation_participants'): update fails
    const updateEq2 = vi.fn().mockResolvedValue({ error: { code: '23505' } })
    const updateEq1 = vi.fn().mockReturnValue({ eq: updateEq2 })
    const updateFn = vi.fn().mockReturnValue({ eq: updateEq1 })

    fromMock
      .mockReturnValueOnce({ select: profileSelect })
      .mockReturnValueOnce({ update: updateFn })

    const fd = new FormData()
    fd.set('conversationId', CONV_UUID)
    const result = await markConversationRead(null, fd)
    expect(result.ok).toBe(false)
    expect(result.error).toContain('Something went wrong')
  })
})
