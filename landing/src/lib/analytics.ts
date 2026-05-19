'use client'

import posthog from 'posthog-js'

const POSTHOG_KEY = import.meta.env.VITE_POSTHOG_KEY
const POSTHOG_HOST = import.meta.env.VITE_POSTHOG_HOST ?? 'https://us.i.posthog.com'

let initialized = false

export function initPostHog(): void {
  if (initialized) return
  if (!POSTHOG_KEY) {
    // No-op when missing — avoids errors in local dev or preview deploys
    return
  }
  posthog.init(POSTHOG_KEY, {
    api_host: POSTHOG_HOST,
    person_profiles: 'identified_only',
    capture_pageview: true,
    capture_pageleave: true,
    defaults: '2026-01-30',
  })
  initialized = true
}

export function captureLandingEvent(
  event: string,
  properties?: Record<string, unknown>,
): void {
  try {
    if (!initialized) initPostHog()
    posthog.capture(event, properties)
  } catch {
    // Never let analytics break the UI.
  }
}

/**
 * Determine the current hero A/B variant.
 * Priority: URL search param ?v= → localStorage → default 'control'
 */
export function getHeroVariant(): string {
  if (typeof window === 'undefined') return 'control'
  const params = new URLSearchParams(window.location.search)
  const paramVariant = params.get('v')
  if (paramVariant) return paramVariant
  try {
    const stored = localStorage.getItem('barterkin_hero_variant')
    if (stored) return stored
  } catch {
    // localStorage may be unavailable (private mode, etc.)
  }
  return 'control'
}

/**
 * Persist a variant assignment to localStorage.
 */
export function setHeroVariant(variant: string): void {
  if (typeof window === 'undefined') return
  try {
    localStorage.setItem('barterkin_hero_variant', variant)
  } catch {
    // Ignore localStorage errors.
  }
}
