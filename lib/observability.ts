import 'server-only'

import { createLogger, generateTraceId, type LoggerContext } from '@/lib/utils/logger'

/**
 * Request metadata captured for every server request.
 */
export interface RequestMeta {
  method: string
  pathname: string
  search?: string
  ip?: string
  userAgent?: string
  referer?: string
  userId?: string
  traceId: string
}

/**
 * Log an incoming request. Call at the start of route handlers / server actions.
 */
export function logRequest(meta: RequestMeta): void {
  const log = createLogger('request')
  log.info(`${meta.method} ${meta.pathname}`, {
    traceId: meta.traceId,
    userId: meta.userId,
    context: {
      search: meta.search,
      ip: meta.ip,
      ua: meta.userAgent?.slice(0, 120),
    },
  })
}

/**
 * Log a completed request with duration and status.
 */
export function logResponse(
  meta: RequestMeta,
  statusCode: number,
  durationMs: number,
  error?: Error | unknown,
): void {
  const level = statusCode >= 500 ? 'error' : statusCode >= 400 ? 'warn' : 'info'
  const log = createLogger('request')
  log[level](`${meta.method} ${meta.pathname} → ${statusCode} (${durationMs}ms)`, {
    traceId: meta.traceId,
    userId: meta.userId,
    error: error ?? undefined,
    context: { statusCode, durationMs },
  })
}

/**
 * Log an unhandled server error with full context.
 * Use in catch blocks at route / action boundaries.
 */
export function logServerError(
  component: string,
  err: unknown,
  ctx?: LoggerContext & { action?: string; extra?: Record<string, unknown> },
): void {
  const log = createLogger(component)
  const error = err instanceof Error ? err : new Error(String(err))
  log.error(ctx?.action ?? 'unhandled error', {
    traceId: ctx?.traceId,
    userId: ctx?.userId,
    error,
    context: ctx?.extra,
  })
}

/**
 * Wrap an async function with automatic error logging.
 * Returns the function result or a fallback on error.
 */
export async function withErrorLogging<T>(
  component: string,
  fn: () => Promise<T>,
  opts: {
    fallback?: T
    context?: LoggerContext & { action?: string; extra?: Record<string, unknown> }
    rethrow?: boolean
  } = {},
): Promise<T> {
  try {
    return await fn()
  } catch (err) {
    logServerError(component, err, opts.context)
    if (opts.rethrow) throw err
    if (opts.fallback !== undefined) return opts.fallback
    throw err
  }
}

/**
 * Measure and log the duration of an async operation.
 */
export async function withTiming<T>(
  component: string,
  label: string,
  fn: () => Promise<T>,
  ctx?: LoggerContext,
): Promise<T> {
  const start = performance.now()
  try {
    const result = await fn()
    const ms = Math.round(performance.now() - start)
    const log = createLogger(component)
    log.debug(`${label} completed in ${ms}ms`, {
      traceId: ctx?.traceId,
      userId: ctx?.userId,
      context: { durationMs: ms },
    })
    return result
  } catch (err) {
    const ms = Math.round(performance.now() - start)
    logServerError(component, err, {
      traceId: ctx?.traceId ?? generateTraceId(),
      userId: ctx?.userId,
      action: `${label} failed after ${ms}ms`,
    })
    throw err
  }
}
