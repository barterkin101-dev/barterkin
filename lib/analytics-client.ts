'use client'

import posthog from 'posthog-js'

export function captureClientEvent(
  event: string,
  properties?: Record<string, unknown>,
): void {
  try {
    posthog.capture(event, properties)
  } catch {
    // Never let client analytics break the UI.
  }
}
