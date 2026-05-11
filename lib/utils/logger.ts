import 'server-only'

/**
 * Severity levels for structured logging.
 */
type LogLevel = 'debug' | 'info' | 'warn' | 'error' | 'fatal'

interface LogEntry {
  level: LogLevel
  message: string
  timestamp: string
  service: string
  traceId?: string
  userId?: string
  error?: {
    name: string
    message: string
    stack?: string
    cause?: unknown
  }
  context?: Record<string, unknown>
}

const LOG_LEVELS: Record<LogLevel, number> = {
  debug: 0,
  info: 1,
  warn: 2,
  error: 3,
  fatal: 4,
}

/**
 * Minimum log level from env. Defaults to 'info' in production, 'debug' in dev.
 */
function getMinLevel(): LogLevel {
  const env = process.env.LOG_LEVEL?.toLowerCase() as LogLevel | undefined
  if (env && env in LOG_LEVELS) return env
  return process.env.NODE_ENV === 'production' ? 'info' : 'debug'
}

/**
 * Generate a short trace ID for request correlation.
 * Falls back to timestamp if crypto is unavailable.
 */
export function generateTraceId(): string {
  try {
    if (typeof crypto !== 'undefined' && crypto.randomUUID) {
      return crypto.randomUUID().slice(0, 8)
    }
  } catch {
    // ignore
  }
  return Date.now().toString(36)
}

/**
 * Build a structured log entry.
 */
function buildEntry(
  level: LogLevel,
  message: string,
  options?: {
    traceId?: string
    userId?: string
    error?: Error | unknown
    context?: Record<string, unknown>
  },
): LogEntry {
  const entry: LogEntry = {
    level,
    message,
    timestamp: new Date().toISOString(),
    service: 'barterkin',
    traceId: options?.traceId,
    userId: options?.userId,
    context: options?.context,
  }

  if (options?.error) {
    const err =
      options.error instanceof Error
        ? options.error
        : new Error(String(options.error))
    entry.error = {
      name: err.name,
      message: err.message,
      stack: err.stack,
      cause: err.cause,
    }
  }

  return entry
}

/**
 * Serialize a log entry for output. Pretty-prints in dev, JSON in prod.
 */
function serialize(entry: LogEntry): string {
  if (process.env.NODE_ENV !== 'production') {
    const parts = [
      `[${entry.timestamp}]`,
      entry.level.toUpperCase().padStart(5),
      entry.message,
    ]
    if (entry.traceId) parts.push(`trace=${entry.traceId}`)
    if (entry.userId) parts.push(`user=${entry.userId}`)
    if (entry.error) {
      parts.push(`\n  ${entry.error.name}: ${entry.error.message}`)
      if (entry.error.stack) {
        parts.push(
          entry.error.stack
            .split('\n')
            .slice(1, 4)
            .map((l) => `    ${l.trim()}`)
            .join('\n'),
        )
      }
    }
    if (entry.context && Object.keys(entry.context).length > 0) {
      parts.push(`\n  context: ${JSON.stringify(entry.context)}`)
    }
    return parts.join(' ')
  }

  // Production: compact JSON, one line
  return JSON.stringify(entry)
}

/**
 * Core logger. Never throws. Writes to stderr for warn/error/fatal,
 * stdout for info/debug, matching Vercel / standard conventions.
 */
function log(level: LogLevel, message: string, options?: Parameters<typeof buildEntry>[2]) {
  const min = getMinLevel()
  if (LOG_LEVELS[level] < LOG_LEVELS[min]) return

  const entry = buildEntry(level, message, options)
  const output = serialize(entry)

  if (level === 'error' || level === 'fatal' || level === 'warn') {
    // eslint-disable-next-line no-console
    console.error(output)
  } else {
    // eslint-disable-next-line no-console
    console.log(output)
  }
}

export const logger = {
  debug: (msg: string, opts?: Parameters<typeof buildEntry>[2]) => log('debug', msg, opts),
  info: (msg: string, opts?: Parameters<typeof buildEntry>[2]) => log('info', msg, opts),
  warn: (msg: string, opts?: Parameters<typeof buildEntry>[2]) => log('warn', msg, opts),
  error: (msg: string, opts?: Parameters<typeof buildEntry>[2]) => log('error', msg, opts),
  fatal: (msg: string, opts?: Parameters<typeof buildEntry>[2]) => log('fatal', msg, opts),
}

/**
 * Create a child logger scoped to a specific component / module.
 * Prepends the component name to every message.
 */
export function createLogger(component: string) {
  return {
    debug: (msg: string, opts?: Parameters<typeof buildEntry>[2]) =>
      logger.debug(`[${component}] ${msg}`, opts),
    info: (msg: string, opts?: Parameters<typeof buildEntry>[2]) =>
      logger.info(`[${component}] ${msg}`, opts),
    warn: (msg: string, opts?: Parameters<typeof buildEntry>[2]) =>
      logger.warn(`[${component}] ${msg}`, opts),
    error: (msg: string, opts?: Parameters<typeof buildEntry>[2]) =>
      logger.error(`[${component}] ${msg}`, opts),
    fatal: (msg: string, opts?: Parameters<typeof buildEntry>[2]) =>
      logger.fatal(`[${component}] ${msg}`, opts),
  }
}

/**
 * Async context helper: attach a traceId to the current request.
 * In Next.js App Router, pass traceId from middleware or route handler
 * and thread it through all server calls.
 */
export type LoggerContext = {
  traceId: string
  userId?: string
}
