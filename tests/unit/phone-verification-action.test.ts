import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn(),
}))

vi.mock('next/cache', () => ({
  revalidatePath: vi.fn(),
}))

vi.mock('@/lib/analytics', () => ({
  captureEvent: vi.fn(),
}))

vi.mock('@/lib/twilio/verify', () => ({
  sendTwilioVerificationCode: vi.fn(),
  checkTwilioVerificationCode: vi.fn(),
}))

import { createClient } from '@/lib/supabase/server'
import { captureEvent } from '@/lib/analytics'
import {
  checkTwilioVerificationCode,
  sendTwilioVerificationCode,
} from '@/lib/twilio/verify'
import {
  sendPhoneVerificationCode,
  verifyPhoneVerificationCode,
} from '@/lib/actions/phone-verification'

function makeSupabaseMock(overrides?: {
  user?: { id: string } | null
  profile?: { id?: string; phone_number?: string | null; phone_verified?: boolean } | null
  profileError?: { code?: string; message?: string } | null
  upsertError?: { code?: string; message?: string } | null
}) {
  const getUserMock = vi.fn().mockResolvedValue({
    data: { user: overrides?.user ?? { id: 'user-1' } },
    error: null,
  })
  const maybeSingleMock = vi.fn().mockResolvedValue({
    data: overrides?.profile ?? { id: 'profile-1', phone_number: null, phone_verified: false },
    error: overrides?.profileError ?? null,
  })
  const eqMock = vi.fn().mockReturnValue({ maybeSingle: maybeSingleMock })
  const selectMock = vi.fn().mockReturnValue({ eq: eqMock })
  const upsertMock = vi.fn().mockResolvedValue({ error: overrides?.upsertError ?? null })
  const fromMock = vi.fn().mockImplementation(() => ({
    select: selectMock,
    upsert: upsertMock,
  }))

  vi.mocked(createClient).mockResolvedValue({
    auth: { getUser: getUserMock },
    from: fromMock,
  } as never)

  return { fromMock, upsertMock, maybeSingleMock, getUserMock }
}

describe('phone verification actions', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    process.env.PHONE_DATA_ENCRYPTION_KEY = 'test-phone-key'
  })

  it('rejects sending a code when the phone number is invalid', async () => {
    makeSupabaseMock()

    const fd = new FormData()
    fd.set('phoneNumber', '123')

    const result = await sendPhoneVerificationCode(null, fd)

    expect(result).toMatchObject({
      ok: false,
      code: 'invalid_phone',
    })
    expect(sendTwilioVerificationCode).not.toHaveBeenCalled()
  })

  it('sends a code, stores the encrypted phone, and leaves the badge unverified', async () => {
    const { upsertMock } = makeSupabaseMock()
    vi.mocked(sendTwilioVerificationCode).mockResolvedValue(undefined)

    const fd = new FormData()
    fd.set('phoneNumber', '(404) 555-0123')

    const result = await sendPhoneVerificationCode(null, fd)

    expect(result.ok).toBe(true)
    expect(result.verified).toBe(false)
    expect(result.maskedPhoneNumber).toBe('••• ••• 0123')
    expect(sendTwilioVerificationCode).toHaveBeenCalledWith('+14045550123')
    expect(upsertMock).toHaveBeenCalledWith(
      expect.objectContaining({
        owner_id: 'user-1',
        phone_verified: false,
      }),
      { onConflict: 'owner_id' },
    )
    expect(vi.mocked(captureEvent)).toHaveBeenCalledWith(
      'user-1',
      'phone_verification_code_sent',
      expect.objectContaining({ phone_last4: '0123' }),
    )
  })

  it('rejects verification when the submitted code is malformed', async () => {
    makeSupabaseMock()

    const fd = new FormData()
    fd.set('phoneNumber', '(404) 555-0123')
    fd.set('code', '12ab')

    const result = await verifyPhoneVerificationCode(null, fd)

    expect(result).toMatchObject({
      ok: false,
      code: 'invalid_code',
    })
    expect(checkTwilioVerificationCode).not.toHaveBeenCalled()
  })

  it('marks the profile verified when Twilio approves the code', async () => {
    const { upsertMock } = makeSupabaseMock()
    vi.mocked(checkTwilioVerificationCode).mockResolvedValue('approved')

    const fd = new FormData()
    fd.set('phoneNumber', '(404) 555-0123')
    fd.set('code', '123456')

    const result = await verifyPhoneVerificationCode(null, fd)

    expect(result).toMatchObject({
      ok: true,
      verified: true,
      maskedPhoneNumber: '••• ••• 0123',
    })
    expect(checkTwilioVerificationCode).toHaveBeenCalledWith('+14045550123', '123456')
    expect(upsertMock).toHaveBeenCalledWith(
      expect.objectContaining({
        owner_id: 'user-1',
        phone_verified: true,
      }),
      { onConflict: 'owner_id' },
    )
    expect(vi.mocked(captureEvent)).toHaveBeenCalledWith(
      'user-1',
      'phone_verified',
      expect.objectContaining({ phone_last4: '0123' }),
    )
  })

  it('returns an actionable error when Twilio rejects the code', async () => {
    makeSupabaseMock()
    vi.mocked(checkTwilioVerificationCode).mockResolvedValue('max_attempts_reached')

    const fd = new FormData()
    fd.set('phoneNumber', '(404) 555-0123')
    fd.set('code', '123456')

    const result = await verifyPhoneVerificationCode(null, fd)

    expect(result.ok).toBe(false)
    expect(result.code).toBe('invalid_code')
    expect(result.error).toContain('Request a new one')
  })
})
