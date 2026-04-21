// Phase 5 — Resend bounce/complaint/delivered webhook
// Source: 05-RESEARCH.md §Pattern 4 + https://resend.com/docs/dashboard/webhooks/verify-webhooks-requests
// Middleware already excludes /api/webhooks (see middleware.ts matcher) — no auth gating on this route.
// Security: svix HMAC signature verification via resend.webhooks.verify() (T-5-03-01)

import 'server-only'
import { NextResponse } from 'next/server'
import { Resend } from 'resend'
import { createClient as createSupabaseAdmin } from '@supabase/supabase-js'
import type { Database } from '@/lib/database.types'

export const runtime = 'nodejs'

export async function POST(req: Request) {
  const webhookSecret = process.env.RESEND_WEBHOOK_SECRET
  const apiKey = process.env.RESEND_API_KEY
  if (!webhookSecret || !apiKey) {
    console.error('[resend-webhook] missing env vars')
    return NextResponse.json({ error: 'Webhook not configured' }, { status: 500 })
  }

  // Read raw body as text — byte-sensitive for svix HMAC signature verification
  const raw = await req.text()
  const svixId = req.headers.get('svix-id') ?? ''
  const svixTimestamp = req.headers.get('svix-timestamp') ?? ''
  const svixSignature = req.headers.get('svix-signature') ?? ''

  const resend = new Resend(apiKey)
  let event: { type?: string; data?: { email_id?: string; id?: string } }
  try {
    event = resend.webhooks.verify({
      payload: raw,
      headers: {
        id: svixId,
        timestamp: svixTimestamp,
        signature: svixSignature,
      },
      webhookSecret,
    }) as typeof event
  } catch (err) {
    console.error('[resend-webhook] signature verify failed', {
      code: (err as { name?: string })?.name,
    })
    return new NextResponse('Bad signature', { status: 401 })
  }

  // Extract email_id for correlating with contact_requests.resend_id
  const emailId = event?.data?.email_id ?? event?.data?.id
  if (!emailId) {
    return new NextResponse('ok', { status: 200 })
  }

  // Map event type to contact_requests status
  let status: 'delivered' | 'bounced' | 'complained' | 'failed' | null = null
  switch (event.type) {
    case 'email.delivered':
      status = 'delivered'
      break
    case 'email.bounced':
      status = 'bounced'
      break
    case 'email.complained':
      status = 'complained'
      break
    case 'email.failed':
      status = 'failed'
      break
    default:
      // Ignore opens, clicks, and any other event types for MVP
      return new NextResponse('ok', { status: 200 })
  }

  // Lazy-initialize service-role client inside the handler (not at module level)
  // to avoid Next.js build-time env var evaluation failure (supabaseUrl is required).
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!supabaseUrl || !serviceRoleKey) {
    console.error('[resend-webhook] missing Supabase env vars')
    return NextResponse.json({ error: 'Server misconfiguration' }, { status: 500 })
  }

  const supabaseAdmin = createSupabaseAdmin<Database>(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  })

  const { error } = await supabaseAdmin
    .from('contact_requests')
    .update({ status })
    .eq('resend_id', emailId)

  if (error) {
    console.error('[resend-webhook] update failed', { code: error.code })
    // Still return 200 — Resend retries are wasteful if the error is transient and the row is already updated.
    // Webhook idempotency comes from .eq('resend_id', ...).
  }

  return new NextResponse('ok', { status: 200 })
}
