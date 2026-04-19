'use client'

import { Button } from '@/components/ui/button'
import posthog from 'posthog-js'
import { useState } from 'react'

export function FireTestEvent() {
  const [status, setStatus] = useState<'idle' | 'fired'>('idle')
  return (
    <Button
      variant="secondary"
      onClick={() => {
        posthog.capture('test_event', { source: 'phase-1-home-button', ts: new Date().toISOString() })
        setStatus('fired')
        setTimeout(() => setStatus('idle'), 3000)
      }}
      aria-label="Fire PostHog test_event"
    >
      {status === 'fired' ? 'Fired — check PostHog' : 'Fire test event'}
    </Button>
  )
}
