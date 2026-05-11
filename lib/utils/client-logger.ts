/**
 * Client-side error reporter.
 * In development: logs to console with structured format.
 * In production: sends to an error tracking endpoint (placeholder for now).
 */

type LogLevel = 'debug' | 'info' | 'warn' | 'error' | 'fatal'

interface LogEntry {
  level: LogLevel
  message: string
  timestamp: string
  service: string
  component: string
  error?: {
    name: string
    message: string
    stack?: string
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

function getMinLevel(): LogLevel {
  if (typeof window === 'undefined') return 'error'
  const env = (window as { __LOG_LEVEL__?: string }).__LOG_LEVEL__?.toLowerCase() as LogLevel | undefined
  if (env && env in LOG_LEVELS) return env
  return process.env.NODE_ENV === 'production' ? 'warn' : 'debug'
}

function buildEntry(
  level: LogLevel,
  component: string,
  message: string,
  options?: {
    error?: Error | unknown
    context?: Record<string, unknown>
  },
): LogEntry {
  const entry: LogEntry = {
    level,
    message,
    timestamp: new Date().toISOString(),
    service: 'barterkin',
    component,
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
    }
  }

  return entry
}

function serialize(entry: LogEntry): string {
  if (process.env.NODE_ENV !== 'production') {
    const parts = [
      `[${entry.timestamp}]`,
      entry.level.toUpperCase().padStart(5),
      `[${entry.component}]`,
      entry.message,
    ]
    if (entry.error) {
      parts.push(`\n  ${entry.error.name}: ${entry.error.message}`)
    }
    if (entry.context && Object.keys(entry.context).length > 0) {
      parts.push(`\n  context: ${JSON.stringify(entry.context)}`)
    }
    return parts.join(' ')
  }
  return JSON.stringify(entry)
}

function log(
  level: LogLevel,
  component: string,
  message: string,
  options?: Parameters<typeof buildEntry>[3],
) {
  const min = getMinLevel()
  if (LOG_LEVELS[level] < LOG_LEVELS[min]) return

  const entry = buildEntry(level, component, message, options)
  const output = serialize(entry)

  if (level === 'error' || level === 'fatal') {
     
    console.error(output)
  } else if (level === 'warn') {
     
    console.warn(output)
  } else {
     
    console.log(output)
  }

  // TODO: In production, send to error tracking service (e.g. Sentry, LogRocket)
  // if (process.env.NODE_ENV === 'production' && level === 'error' || level === 'fatal') {
  //   fetch('/api/log', { method: 'POST', body: JSON.stringify(entry) }).catch(() => {})
  // }
}

export const clientLogger = {
  debug: (component: string, msg: string, opts?: Parameters<typeof buildEntry>[3]) =>
    log('debug', component, msg, opts),
  info: (component: string, msg: string, opts?: Parameters<typeof buildEntry>[3]) =>
    log('info', component, msg, opts),
  warn: (component: string, msg: string, opts?: Parameters<typeof buildEntry>[3]) =>
    log('warn', component, msg, opts),
  error: (component: string, msg: string, opts?: Parameters<typeof buildEntry>[3]) =>
    log('error', component, msg, opts),
  fatal: (component: string, msg: string, opts?: Parameters<typeof buildEntry>[3]) =>
    log('fatal', component, msg, opts),
}
