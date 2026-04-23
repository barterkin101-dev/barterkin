import { describe, it, expect, vi, beforeEach } from 'vitest'

// Mock the server-only module BEFORE importing the action.
vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn(),
}))

import { createClient } from '@/lib/supabase/server'
import { markOnboardingComplete } from '@/lib/actions/onboarding'

type MockClient = {
  auth: { getUser: ReturnType<typeof vi.fn> }
  from: ReturnType<typeof vi.fn>
}

function buildClient(opts: {
  user: { id: string } | null
  authError?: { message: string } | null
  updateResult: { error: null | { code: string; message: string } }
}): MockClient {
  const updateFn = vi.fn().mockReturnThis()
  const eqFn = vi.fn().mockReturnThis()
  const isFn = vi.fn().mockResolvedValue(opts.updateResult)
  const fromFn = vi.fn(() => ({ update: updateFn, eq: eqFn, is: isFn }))
  // Rebuild chain: update(...).eq(...).is(...) resolves to updateResult.
  updateFn.mockImplementation(() => ({ eq: eqFn }))
  eqFn.mockImplementation(() => ({ is: isFn }))

  return {
    auth: {
      getUser: vi.fn().mockResolvedValue({
        data: { user: opts.user },
        error: opts.authError ?? null,
      }),
    },
    from: fromFn,
  }
}

describe('markOnboardingComplete() (D-11)', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('writes onboarding_completed_at when profile has NULL timestamp (happy path)', async () => {
    const client = buildClient({
      user: { id: 'user-uuid-1' },
      updateResult: { error: null },
    })
    vi.mocked(createClient).mockResolvedValue(client as never)

    const result = await markOnboardingComplete()
    expect(result).toEqual({ ok: true })
    expect(client.from).toHaveBeenCalledWith('profiles')
  })

  it('is idempotent — returns ok:true when .is(null) predicate matches zero rows', async () => {
    // Supabase PostgREST returns { error: null } for UPDATE matching 0 rows.
    const client = buildClient({
      user: { id: 'user-uuid-1' },
      updateResult: { error: null },
    })
    vi.mocked(createClient).mockResolvedValue(client as never)

    const first = await markOnboardingComplete()
    const second = await markOnboardingComplete()
    expect(first).toEqual({ ok: true })
    expect(second).toEqual({ ok: true })
  })

  it('returns ok:false when auth.getUser returns no user', async () => {
    const client = buildClient({
      user: null,
      authError: { message: 'not authenticated' },
      updateResult: { error: null },
    })
    vi.mocked(createClient).mockResolvedValue(client as never)

    const result = await markOnboardingComplete()
    expect(result).toEqual({ ok: false })
    expect(client.from).not.toHaveBeenCalled()
  })

  it('returns ok:false and logs error code (no PII) on DB failure', async () => {
    const errSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
    const client = buildClient({
      user: { id: 'user-uuid-1' },
      updateResult: { error: { code: '23503', message: 'foreign key violation on email xyz@example.com' } },
    })
    vi.mocked(createClient).mockResolvedValue(client as never)

    const result = await markOnboardingComplete()
    expect(result).toEqual({ ok: false })
    expect(errSpy).toHaveBeenCalledWith(
      '[markOnboardingComplete] update failed',
      { code: '23503' },
    )
    // Confirm no PII (email, message body) leaked into the log call
    const calls = errSpy.mock.calls.flat()
    const serialized = JSON.stringify(calls)
    expect(serialized).not.toContain('foreign key violation')
    expect(serialized).not.toContain('xyz@example.com')
    errSpy.mockRestore()
  })
})
