import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { logger, createLogger, generateTraceId } from '@/lib/utils/logger'

describe('logger', () => {
  let consoleLogSpy: ReturnType<typeof vi.spyOn>
  let consoleErrorSpy: ReturnType<typeof vi.spyOn>

  beforeEach(() => {
    consoleLogSpy = vi.spyOn(console, 'log').mockImplementation(() => {})
    consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('generateTraceId returns a non-empty string', () => {
    const id = generateTraceId()
    expect(typeof id).toBe('string')
    expect(id.length).toBeGreaterThan(0)
  })

  it('logs info to console.log', () => {
    logger.info('test message')
    expect(consoleLogSpy).toHaveBeenCalled()
    const output = consoleLogSpy.mock.calls[0][0] as string
    expect(output).toContain('INFO')
    expect(output).toContain('test message')
  })

  it('logs error to console.error', () => {
    logger.error('something broke')
    expect(consoleErrorSpy).toHaveBeenCalled()
    const output = consoleErrorSpy.mock.calls[0][0] as string
    expect(output).toContain('ERROR')
    expect(output).toContain('something broke')
  })

  it('includes traceId in output when provided', () => {
    logger.info('with trace', { traceId: 'abc123' })
    const output = consoleLogSpy.mock.calls[0][0] as string
    expect(output).toContain('trace=abc123')
  })

  it('includes userId in output when provided', () => {
    logger.info('with user', { userId: 'user-42' })
    const output = consoleLogSpy.mock.calls[0][0] as string
    expect(output).toContain('user=user-42')
  })

  it('includes error details when provided', () => {
    const err = new Error('boom')
    logger.error('failed', { error: err })
    const output = consoleErrorSpy.mock.calls[0][0] as string
    expect(output).toContain('Error: boom')
  })

  it('includes context when provided', () => {
    logger.info('ctx test', { context: { foo: 'bar' } })
    const output = consoleLogSpy.mock.calls[0][0] as string
    expect(output).toContain('"foo":"bar"')
  })

  it('createLogger prepends component name', () => {
    const authLog = createLogger('auth')
    authLog.warn('session expired')
    const output = consoleErrorSpy.mock.calls[0][0] as string
    expect(output).toContain('[auth]')
    expect(output).toContain('session expired')
  })

  it('respects LOG_LEVEL env in production', () => {
    // Save original values
    const originalEnv = process.env.NODE_ENV
    const originalLevel = process.env.LOG_LEVEL

    // Delete and re-set to avoid read-only / descriptor issues
    delete (process.env as Record<string, string | undefined>).NODE_ENV
    delete (process.env as Record<string, string | undefined>).LOG_LEVEL
    process.env.NODE_ENV = 'production'
    process.env.LOG_LEVEL = 'error'

    logger.warn('should not appear')
    expect(consoleErrorSpy).not.toHaveBeenCalled()

    logger.error('should appear')
    expect(consoleErrorSpy).toHaveBeenCalled()

    // Restore
    delete (process.env as Record<string, string | undefined>).NODE_ENV
    delete (process.env as Record<string, string | undefined>).LOG_LEVEL
    if (originalEnv !== undefined) process.env.NODE_ENV = originalEnv
    if (originalLevel !== undefined) process.env.LOG_LEVEL = originalLevel
  })
})
