import { describe, it, expect, vi, beforeEach } from 'vitest'

const rpcMock = vi.fn()

vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn(async () => ({
    rpc: rpcMock,
  })),
}))

// Import AFTER the mock is set up
import { checkSignupRateLimit } from '@/lib/utils/rate-limit'

describe('checkSignupRateLimit (AUTH-06)', () => {
  beforeEach(() => {
    rpcMock.mockReset()
  })

  it('returns { allowed: true } when RPC returns true', async () => {
    rpcMock.mockResolvedValueOnce({ data: true, error: null })
    const result = await checkSignupRateLimit('1.2.3.4')
    expect(result).toEqual({ allowed: true })
    expect(rpcMock).toHaveBeenCalledWith('check_signup_ip', { p_ip: '1.2.3.4' })
  })

  it('returns { allowed: false } when RPC returns false', async () => {
    rpcMock.mockResolvedValueOnce({ data: false, error: null })
    const result = await checkSignupRateLimit('1.2.3.4')
    expect(result).toEqual({ allowed: false })
  })

  it('fails OPEN (returns allowed: true) when RPC errors', async () => {
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
    rpcMock.mockResolvedValueOnce({
      data: null,
      error: { code: 'PGRST000', message: 'connection failed' },
    })
    const result = await checkSignupRateLimit('1.2.3.4')
    expect(result).toEqual({ allowed: true })
    expect(consoleSpy).toHaveBeenCalled()
    consoleSpy.mockRestore()
  })

  it('replaces empty IP with "unknown" sentinel', async () => {
    rpcMock.mockResolvedValueOnce({ data: true, error: null })
    await checkSignupRateLimit('')
    expect(rpcMock).toHaveBeenCalledWith('check_signup_ip', { p_ip: 'unknown' })
  })

  it('trims whitespace from IP', async () => {
    rpcMock.mockResolvedValueOnce({ data: true, error: null })
    await checkSignupRateLimit('  1.2.3.4  ')
    expect(rpcMock).toHaveBeenCalledWith('check_signup_ip', { p_ip: '1.2.3.4' })
  })
})
