import 'server-only'

/**
 * Health check results for a single dependency.
 */
export interface HealthCheckResult {
  name: string
  status: 'healthy' | 'degraded' | 'unhealthy'
  latencyMs: number
  message?: string
  error?: string
}

/**
 * Overall health report.
 */
export interface HealthReport {
  status: 'healthy' | 'degraded' | 'unhealthy'
  timestamp: string
  version: string
  environment: string
  checks: HealthCheckResult[]
}

/**
 * Run a single health check with a timeout.
 */
async function runCheck(
  name: string,
  checkFn: () => Promise<void>,
  timeoutMs = 5000,
): Promise<HealthCheckResult> {
  const start = performance.now()
  try {
    await Promise.race([
      checkFn(),
      new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error(`Timeout after ${timeoutMs}ms`)), timeoutMs),
      ),
    ])
    const latencyMs = Math.round(performance.now() - start)
    return { name, status: 'healthy', latencyMs }
  } catch (err) {
    const latencyMs = Math.round(performance.now() - start)
    const error = err instanceof Error ? err.message : String(err)
    return { name, status: 'unhealthy', latencyMs, error }
  }
}

/**
 * Check Supabase connectivity by hitting the REST health endpoint.
 * Uses the public URL so it works from anywhere.
 */
async function checkSupabase(): Promise<void> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  if (!url) throw new Error('NEXT_PUBLIC_SUPABASE_URL not configured')

  const res = await fetch(`${url}/rest/v1/`, {
    method: 'HEAD',
    headers: {
      apikey: process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || '',
    },
  })
  if (!res.ok) throw new Error(`Supabase returned ${res.status}`)
}

/**
 * Check Upstash Redis connectivity by running a PING.
 */
async function checkRedis(): Promise<void> {
  const { Redis } = await import('@upstash/redis')
  const token = process.env.UPSTASH_REDIS_REST_TOKEN
  const redisUrl = process.env.UPSTASH_REDIS_REST_URL

  if (!token || !redisUrl) {
    throw new Error('UPSTASH_REDIS_REST_TOKEN or UPSTASH_REDIS_REST_URL not configured')
  }

  const redis = new Redis({ url: redisUrl, token })
  const pong = await redis.ping()
  if (pong !== 'PONG') throw new Error(`Redis ping returned: ${pong}`)
}

/**
 * Check Resend connectivity by listing domains (lightweight, no email sent).
 */
async function checkResend(): Promise<void> {
  const apiKey = process.env.RESEND_API_KEY
  if (!apiKey) throw new Error('RESEND_API_KEY not configured')

  const res = await fetch('https://api.resend.com/domains', {
    method: 'GET',
    headers: { Authorization: `Bearer ${apiKey}` },
  })
  if (!res.ok) throw new Error(`Resend returned ${res.status}`)
}

/**
 * Run all health checks and compile a report.
 */
export async function runHealthChecks(): Promise<HealthReport> {
  const checks = await Promise.all([
    runCheck('supabase', checkSupabase, 8000),
    runCheck('redis', checkRedis, 5000),
    runCheck('resend', checkResend, 5000),
  ])

  // Overall status: unhealthy if any critical check fails, degraded if any non-critical fails
  const critical = ['supabase', 'redis']
  const hasCriticalFailure = checks.some(
    (c) => critical.includes(c.name) && c.status === 'unhealthy',
  )
  const hasAnyFailure = checks.some((c) => c.status === 'unhealthy')

  let status: HealthReport['status']
  if (hasCriticalFailure) status = 'unhealthy'
  else if (hasAnyFailure) status = 'degraded'
  else status = 'healthy'

  return {
    status,
    timestamp: new Date().toISOString(),
    version: process.env.NEXT_PUBLIC_APP_VERSION || '0.1.0.0',
    environment: process.env.NODE_ENV || 'unknown',
    checks,
  }
}
