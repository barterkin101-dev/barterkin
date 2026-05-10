import { NextResponse } from 'next/server'

export const runtime = 'edge'

/**
 * GET /api/health/simple
 *
 * Lightweight ping — returns immediately without hitting external services.
 * Always 200 if the app is running.
 *
 * Suitable for:
 * - Vercel deployment health checks
 * - CDN / edge health probes
 * - Quick "is the app up" checks
 */
export async function GET() {
  return NextResponse.json(
    {
      status: 'ok',
      timestamp: new Date().toISOString(),
      version: process.env.NEXT_PUBLIC_APP_VERSION || '0.1.0.0',
      environment: process.env.NODE_ENV || 'unknown',
    },
    {
      headers: {
        'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
        Pragma: 'no-cache',
        Expires: '0',
      },
    },
  )
}
