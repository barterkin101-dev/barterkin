// LEGACY: Resend webhook handler retired. The email-based contact relay and
// contact_requests table have been replaced by in-app messaging.
// This file is preserved as a tombstone test to document the retirement.
// The route now returns 410 Gone to signal Resend to remove the subscription.

import { describe, it, expect } from 'vitest'

async function getPost() {
  const mod = await import('@/app/api/webhooks/resend/route')
  return mod.POST
}

describe('Resend webhook handler — LEGACY (retired)', () => {
  it('returns 410 Gone for all requests', async () => {
    const POST = await getPost()
    const res = await POST()
    expect(res.status).toBe(410)
    expect(await res.text()).toBe('Gone — legacy webhook retired')
  })
})
