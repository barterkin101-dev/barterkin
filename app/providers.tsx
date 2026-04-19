'use client'

import posthog from 'posthog-js'
import { PostHogProvider as PHProvider } from 'posthog-js/react'
import { useEffect } from 'react'

export function PostHogProvider({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    const key = process.env.NEXT_PUBLIC_POSTHOG_KEY
    if (!key) {
      // No-op when missing — Phase 1 preview deploys may not have POSTHOG_KEY wired yet
      // (Plan 10 sets Vercel env vars). Avoid noisy init errors in local dev.
      return
    }
    posthog.init(key, {
      api_host: process.env.NEXT_PUBLIC_POSTHOG_HOST ?? 'https://us.i.posthog.com',
      person_profiles: 'identified_only',
      capture_pageview: true,
      capture_pageleave: true,
      defaults: '2026-01-30',
    })
  }, [])

  return <PHProvider client={posthog}>{children}</PHProvider>
}
