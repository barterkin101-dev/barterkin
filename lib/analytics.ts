import 'server-only'
import { PostHog } from 'posthog-node'

function getPostHog(): PostHog | null {
  const key = process.env.NEXT_PUBLIC_POSTHOG_KEY
  if (!key) return null
  return new PostHog(key, {
    host: 'https://app.posthog.com',
    flushAt: 1,
    flushInterval: 0,
  })
}

/**
 * Server-side PostHog capture — non-blocking, never throws.
 * Always await shutdown() to flush the event before the request returns.
 */
export async function captureEvent(
  distinctId: string,
  event: string,
  properties?: Record<string, unknown>,
): Promise<void> {
  try {
    const posthog = getPostHog()
    if (!posthog) return
    posthog.capture({
      distinctId,
      event,
      properties,
    })
    await posthog.shutdown()
  } catch {
    // Never let analytics break the user flow.
  }
}
