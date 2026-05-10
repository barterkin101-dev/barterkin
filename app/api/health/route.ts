import { NextResponse } from 'next/server'
import { runHealthChecks } from '@/lib/health-check'

export const runtime = 'nodejs'

/**
 * GET /api/health
 *
 * Full health check — tests all critical dependencies (Supabase, Redis, Resend).
 * Returns 200 if healthy, 503 if degraded/unhealthy.
 *
 * Suitable for:
 * - Uptime monitoring (UptimeRobot, Pingdom, etc.)
 * - Deployment verification
 * - Load balancer health probes
 *
 * Caches nothing; always fresh.
 */
export async function GET() {
  const report = await runHealthChecks()

  const statusCode = report.status === 'healthy' ? 200 : 503

  return NextResponse.json(report, {
    status: statusCode,
    headers: {
      'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
      Pragma: 'no-cache',
      Expires: '0',
    },
  })
}
