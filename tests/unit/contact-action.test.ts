import { describe, it, expect, vi, beforeEach } from 'vitest'

// vi.mock is hoisted to the top of the file by Vitest.
// Factory functions CANNOT reference variables declared in the test file scope.
// Use vi.fn() inline inside factories; then grab references via vi.mocked() or module re-import.

vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn(),
}))

vi.mock('next/navigation', () => ({
  redirect: vi.fn((url: string) => {
    throw new Error(`REDIRECT:${url}`)
  }),
}))

vi.mock('next/cache', () => ({
  revalidatePath: vi.fn(),
}))

vi.mock('resend', () => ({
  Resend: vi.fn().mockImplementation(() => ({
    emails: { send: vi.fn().mockResolvedValue({ data: { id: 'resend-xyz' }, error: null }) },
  })),
}))

vi.mock('@/emails/report-admin-notify', () => ({
  ReportAdminNotifyEmail: vi.fn().mockReturnValue(null),
}))

const fetchMock = vi.fn()
vi.stubGlobal('fetch', fetchMock)

// Import mocked modules AFTER vi.mock declarations
import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { revalidatePath } from 'next/cache'
import { Resend } from 'resend'

import {
  blockMember,
  reportMember,
  markContactsSeen,
} from '@/lib/actions/contact'

const VALID_UUID = '550e8400-e29b-41d4-a716-446655440000'
const OTHER_UUID = '550e8400-e29b-41d4-a716-446655440999'

// Helper to create a typed Supabase client mock
function makeSupabaseMock(overrides?: {
  getUser?: ReturnType<typeof vi.fn>
  getSession?: ReturnType<typeof vi.fn>
  from?: ReturnType<typeof vi.fn>
  rpc?: ReturnType<typeof vi.fn>
}) {
  const getUserMock = overrides?.getUser ?? vi.fn()
  const getSessionMock = overrides?.getSession ?? vi.fn()
  const fromMock = overrides?.from ?? vi.fn()
  const rpcMock = overrides?.rpc ?? vi.fn()
  const client = {
    auth: { getUser: getUserMock, getSession: getSessionMock },
    from: fromMock,
    rpc: rpcMock,
  }
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  vi.mocked(createClient).mockResolvedValue(client as any)
  return { getUserMock, getSessionMock, fromMock, rpcMock, client }
}

beforeEach(() => {
  vi.clearAllMocks()
  process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://test.supabase.co'
  process.env.RESEND_API_KEY = 'test-key'
  process.env.ADMIN_NOTIFY_EMAIL = 'admin@test.local'
  process.env.NEXT_PUBLIC_SITE_URL = 'https://test.local'
  // Re-stub redirect to throw on every call
  vi.mocked(redirect).mockImplementation((url: string) => {
    throw new Error(`REDIRECT:${url}`)
  })
})

// ============================================================================
// blockMember
// ============================================================================
describe('blockMember', () => {
  it('redirects to /login when not authenticated', async () => {
    const { getUserMock } = makeSupabaseMock()
    getUserMock.mockResolvedValue({ data: { user: null }, error: null })
    const fd = new FormData()
    fd.set('blockedOwnerId', VALID_UUID)
    fd.set('blockedDisplayName', 'Jane')
    fd.set('blockedUsername', 'jane')
    await expect(blockMember(fd)).rejects.toThrow('REDIRECT:/login')
  })

  it('redirects silently to /directory on self-block attempt', async () => {
    const { getUserMock } = makeSupabaseMock()
    getUserMock.mockResolvedValue({ data: { user: { id: VALID_UUID } }, error: null })
    const fd = new FormData()
    fd.set('blockedOwnerId', VALID_UUID) // same as user.id
    fd.set('blockedDisplayName', 'Me')
    fd.set('blockedUsername', 'me')
    await expect(blockMember(fd)).rejects.toThrow('REDIRECT:/directory')
    // Must NOT have a 'blocked=' param (silent redirect, no toast)
    expect(vi.mocked(redirect)).toHaveBeenCalledWith('/directory')
  })

  it('upserts into blocks and redirects with blocked display name param', async () => {
    const { getUserMock, fromMock } = makeSupabaseMock()
    getUserMock.mockResolvedValue({ data: { user: { id: 'u1' } }, error: null })
    const upsertMock = vi.fn().mockResolvedValue({ error: null })
    fromMock.mockReturnValue({ upsert: upsertMock })

    const fd = new FormData()
    fd.set('blockedOwnerId', OTHER_UUID)
    fd.set('blockedDisplayName', 'Jane Doe')
    fd.set('blockedUsername', 'jane-doe')

    await expect(blockMember(fd)).rejects.toThrow(/REDIRECT:\/directory\?blocked=Jane/)
    expect(fromMock).toHaveBeenCalledWith('blocks')
    expect(upsertMock).toHaveBeenCalledWith(
      { blocker_id: 'u1', blocked_id: OTHER_UUID },
      { onConflict: 'blocker_id,blocked_id', ignoreDuplicates: true },
    )
    expect(vi.mocked(revalidatePath)).toHaveBeenCalledWith('/directory')
    expect(vi.mocked(revalidatePath)).toHaveBeenCalledWith('/m/jane-doe')
  })
})

// ============================================================================
// reportMember
// ============================================================================
describe('reportMember', () => {
  function setupTargetLookup(
    overrides: {
      getUserMock: ReturnType<typeof vi.fn>
      fromMock: ReturnType<typeof vi.fn>
    },
    target: { id: string; owner_id: string; display_name: string; username: string } | null,
  ) {
    const { getUserMock: _get, fromMock } = overrides
    // Call order from reportMember:
    //   1st from('profiles'): target SELECT
    //   2nd from('reports'): INSERT
    //   3rd from('profiles'): reporter SELECT for email
    const targetMaybeSingle = vi.fn().mockResolvedValue({ data: target, error: null })
    const targetEq = vi.fn().mockReturnValue({ maybeSingle: targetMaybeSingle })
    const targetSelect = vi.fn().mockReturnValue({ eq: targetEq })

    const insertSingle = vi.fn().mockResolvedValue({
      data: { id: 'report-1', created_at: '2026-04-21T00:00:00Z' },
      error: null,
    })
    const insertSelect = vi.fn().mockReturnValue({ single: insertSingle })
    const insertFn = vi.fn().mockReturnValue({ select: insertSelect })

    const reporterMaybeSingle = vi.fn().mockResolvedValue({
      data: { display_name: 'Ari', username: 'ari' },
      error: null,
    })
    const reporterEq = vi.fn().mockReturnValue({ maybeSingle: reporterMaybeSingle })
    const reporterSelect = vi.fn().mockReturnValue({ eq: reporterEq })

    fromMock
      .mockReturnValueOnce({ select: targetSelect })
      .mockReturnValueOnce({ insert: insertFn })
      .mockReturnValueOnce({ select: reporterSelect })

    return { insertFn }
  }

  it('returns unauthorized when not signed in', async () => {
    const { getUserMock } = makeSupabaseMock()
    getUserMock.mockResolvedValue({ data: { user: null }, error: null })
    const fd = new FormData()
    fd.set('targetProfileId', VALID_UUID)
    fd.set('reason', 'spam')
    const result = await reportMember(null, fd)
    expect(result.ok).toBe(false)
    expect(result.code).toBe('unauthorized')
  })

  it('returns unauthorized when email not verified', async () => {
    const { getUserMock } = makeSupabaseMock()
    getUserMock.mockResolvedValue({
      data: { user: { id: 'u1', email_confirmed_at: null } },
      error: null,
    })
    const fd = new FormData()
    fd.set('targetProfileId', VALID_UUID)
    fd.set('reason', 'spam')
    const result = await reportMember(null, fd)
    expect(result.ok).toBe(false)
    expect(result.code).toBe('unauthorized')
    expect(result.error).toContain('Verify')
  })

  it('blocks self-report (target.owner_id === user.id)', async () => {
    const mocks = makeSupabaseMock()
    mocks.getUserMock.mockResolvedValue({
      data: { user: { id: 'u1', email: 'me@test.local', email_confirmed_at: '2026-01-01' } },
      error: null,
    })
    setupTargetLookup(mocks, { id: VALID_UUID, owner_id: 'u1', display_name: 'Me', username: 'me' })

    const fd = new FormData()
    fd.set('targetProfileId', VALID_UUID)
    fd.set('reason', 'other')
    const result = await reportMember(null, fd)
    expect(result.ok).toBe(false)
    expect(result.code).toBe('self_report')
  })

  it('happy path: inserts report with correct payload and sends admin notify', async () => {
    const mocks = makeSupabaseMock()
    mocks.getUserMock.mockResolvedValue({
      data: {
        user: { id: 'u1', email: 'reporter@test.local', email_confirmed_at: '2026-01-01' },
      },
      error: null,
    })
    const { insertFn } = setupTargetLookup(mocks, {
      id: VALID_UUID,
      owner_id: 'u2',
      display_name: 'Target',
      username: 'target',
    })

    // Get the send mock from the Resend instance
    const resendInstance = vi.mocked(Resend).mock.results[0]?.value as {
      emails: { send: ReturnType<typeof vi.fn> }
    }

    const fd = new FormData()
    fd.set('targetProfileId', VALID_UUID)
    fd.set('reason', 'harassment')
    fd.set('note', 'They were very rude to me.')
    const result = await reportMember(null, fd)

    expect(result.ok).toBe(true)
    expect(insertFn).toHaveBeenCalledWith(
      expect.objectContaining({
        reporter_id: 'u1',
        target_profile_id: VALID_UUID,
        reason: 'harassment',
        note: 'They were very rude to me.',
      }),
    )
    if (resendInstance) {
      expect(resendInstance.emails.send).toHaveBeenCalledWith(
        expect.objectContaining({
          to: ['admin@test.local'],
          subject: expect.stringContaining('harassment'),
        }),
      )
    }
  })
})

// ============================================================================
// markContactsSeen
// ============================================================================
describe('markContactsSeen', () => {
  it('returns not-authenticated when no user', async () => {
    const { getUserMock } = makeSupabaseMock()
    getUserMock.mockResolvedValue({ data: { user: null }, error: null })
    const result = await markContactsSeen()
    expect(result.ok).toBe(false)
  })

  it('returns ok after RPC call', async () => {
    const { getUserMock, fromMock, rpcMock } = makeSupabaseMock()
    getUserMock.mockResolvedValue({ data: { user: { id: 'u1' } }, error: null })

    // from('profiles'): SELECT id for profile lookup
    const profileMaybeSingle = vi.fn().mockResolvedValue({ data: { id: 'profile-1' }, error: null })
    const profileEq = vi.fn().mockReturnValue({ maybeSingle: profileMaybeSingle })
    const profileSelect = vi.fn().mockReturnValue({ eq: profileEq })
    fromMock.mockReturnValueOnce({ select: profileSelect })

    // RPC: mark_contacts_seen (H-02 security fix — uses SECURITY DEFINER fn instead of direct UPDATE)
    rpcMock.mockResolvedValue({ error: null })

    const result = await markContactsSeen()
    expect(result.ok).toBe(true)
    expect(result.count).toBe(0)
  })
})
