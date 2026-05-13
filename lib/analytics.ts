import 'server-only'
import { PostHog } from 'posthog-node'

function getPostHog(): PostHog | null {
  const key = process.env.NEXT_PUBLIC_POSTHOG_KEY
  if (!key) return null
  return new PostHog(key, {
    host: process.env.NEXT_PUBLIC_POSTHOG_HOST ?? 'https://us.i.posthog.com',
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

/**
 * Fire a PostHog event without awaiting shutdown (fire-and-forget).
 * Use for non-critical events where we don't need guaranteed delivery.
 */
export function captureEventFireAndForget(
  distinctId: string,
  event: string,
  properties?: Record<string, unknown>,
): void {
  try {
    const posthog = getPostHog()
    if (!posthog) return
    posthog.capture({
      distinctId,
      event,
      properties,
    })
    // Intentionally don't await shutdown — let the process exit flush it
    void posthog.shutdown().catch(() => {})
  } catch {
    // Never let analytics break the user flow.
  }
}

/**
 * Server-side PostHog alias — links an anonymous distinct_id to a known user id.
 * Non-blocking, never throws.
 */
export async function aliasUser(
  distinctId: string,
  alias: string,
): Promise<void> {
  try {
    const posthog = getPostHog()
    if (!posthog) return
    posthog.alias({
      distinctId,
      alias,
    })
    await posthog.shutdown()
  } catch {
    // Never let analytics break the user flow.
  }
}

/**
 * Server-side PostHog person properties update.
 * Non-blocking, never throws.
 */
export async function setPersonProperties(
  distinctId: string,
  properties: Record<string, unknown>,
): Promise<void> {
  try {
    const posthog = getPostHog()
    if (!posthog) return
    posthog.identify({
      distinctId,
      properties,
    })
    await posthog.shutdown()
  } catch {
    // Never let analytics break the user flow.
  }
}
