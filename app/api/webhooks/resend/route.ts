// Phase 5 — Resend bounce/complaint/delivered webhook
// LEGACY: The email-based contact relay and contact_requests table have been retired
// in favor of in-app messaging. This route now returns 410 Gone to signal to Resend
// that the webhook subscription should be removed. It will be fully deleted once
// Resend dashboard confirms the subscription is inactive.
// Proxy already excludes /api/webhooks (see proxy.ts matcher) — no auth gating on this route.

export const runtime = 'nodejs'

export async function POST() {
  return new Response('Gone — legacy webhook retired', { status: 410 })
}
