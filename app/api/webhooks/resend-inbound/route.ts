// Support Inbox — Resend inbound email webhook
// Receives forwarded emails from Resend and creates support tickets.
//
// Resend inbound webhook payload (documented at resend.com/docs/dashboard/webhooks):
// {
//   "type": "email.received",
//   "created_at": "2024-01-01T00:00:00.000Z",
//   "data": {
//     "from": "sender@example.com",
//     "to": ["support@barterkin.com"],
//     "subject": "Help needed",
//     "text": "Plain text body",
//     "html": "<p>HTML body</p>",
//     "headers": { ... }
//   }
// }
//
// Auth: Resend uses svix for webhook signature verification.
// Headers: svix-id, svix-timestamp, svix-signature
// If no secret is configured, we accept in dev mode with a warning log.

export const runtime = 'nodejs'

import { NextResponse, type NextRequest } from 'next/server'
import { getSupabaseAdmin } from '@/lib/supabase/admin'
import { createLogger } from '@/lib/utils/logger'
import { Resend } from 'resend'

const log = createLogger('webhook:resend-inbound')

interface ResendInboundPayload {
  type: string
  created_at: string
  data: {
    from: string
    from_name?: string
    to: string[]
    subject: string
    text?: string
    html?: string
    headers?: Record<string, string>
  }
}

async function verifyWebhookSignature(
  payload: string,
  headers: Record<string, string | null>,
  secret: string | undefined,
): Promise<boolean> {
  if (!secret) {
    log.warn('RESEND_WEBHOOK_SECRET not configured — accepting webhook without verification (dev mode)')
    return true
  }

  const svixId = headers['svix-id']
  const svixTimestamp = headers['svix-timestamp']
  const svixSignature = headers['svix-signature']

  if (!svixId || !svixTimestamp || !svixSignature) {
    log.warn('Missing svix webhook headers', {
      context: { hasId: !!svixId, hasTimestamp: !!svixTimestamp, hasSignature: !!svixSignature },
    })
    return false
  }

  try {
    // svix is a transitive dependency of resend
    const { Webhook } = await import('svix')
    const wh = new Webhook(secret)
    wh.verify(payload, {
      'svix-id': svixId,
      'svix-timestamp': svixTimestamp,
      'svix-signature': svixSignature,
    })
    return true
  } catch (err) {
    log.warn('Webhook signature verification failed', {
      context: { error: String(err) },
    })
    return false
  }
}

export async function POST(request: NextRequest) {
  const payloadText = await request.text()
  const secret = process.env.RESEND_WEBHOOK_SECRET

  const headers: Record<string, string | null> = {
    'svix-id': request.headers.get('svix-id'),
    'svix-timestamp': request.headers.get('svix-timestamp'),
    'svix-signature': request.headers.get('svix-signature'),
  }

  const verified = await verifyWebhookSignature(payloadText, headers, secret)
  if (!verified) {
    log.warn('Invalid webhook signature')
    return NextResponse.json({ error: 'Invalid signature' }, { status: 401 })
  }

  let payload: ResendInboundPayload
  try {
    payload = JSON.parse(payloadText)
  } catch {
    log.warn('Invalid JSON payload')
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  // Only handle email.received events
  if (payload.type !== 'email.received') {
    log.info('Ignoring non-inbound event', { context: { type: payload.type } })
    return NextResponse.json({ ok: true, ignored: true })
  }

  const { data } = payload
  const fromEmail = data.from
  const fromName = data.from_name || null
  const subject = data.subject || '(no subject)'
  const bodyText = data.text || '(no content)'
  const bodyHtml = data.html || null

  if (!fromEmail) {
    log.warn('Missing from email in inbound payload')
    return NextResponse.json({ error: 'Missing from address' }, { status: 400 })
  }

  // Create support ticket using service role client (bypasses RLS)
  let supabase
  try {
    supabase = getSupabaseAdmin()
  } catch (err) {
    log.error('Admin client unavailable', { error: err })
    return NextResponse.json({ error: 'Service unavailable' }, { status: 503 })
  }

  const { data: ticket, error } = await supabase
    .from('support_tickets')
    .insert({
      from_email: fromEmail,
      from_name: fromName,
      subject,
      body_text: bodyText,
      body_html: bodyHtml,
      status: 'open',
      source: 'email',
    })
    .select('id')
    .single()

  if (error) {
    log.error('Failed to create support ticket', {
      context: { code: error.code, message: error.message },
    })
    return NextResponse.json({ error: 'Database error' }, { status: 500 })
  }

  log.info('Support ticket created from inbound email', {
    context: { ticketId: ticket.id, from: fromEmail, subject },
  })

  // Send auto-reply to customer
  const apiKey = process.env.RESEND_API_KEY
  if (apiKey) {
    try {
      const resend = new Resend(apiKey)
      await resend.emails.send({
        from: 'Barterkin Support <support@barterkin.com>',
        to: fromEmail,
        subject: `Re: ${subject}`,
        text: `Hi there,\n\nThanks for reaching out to Barterkin support! We've received your message and will get back to you as soon as possible.\n\nYour support ticket ID is: ${ticket.id}\n\nBest,\nThe Barterkin Team`,
      })
      log.info('Auto-reply sent', { context: { ticketId: ticket.id, to: fromEmail } })
    } catch (err) {
      log.error('Failed to send auto-reply', {
        context: { ticketId: ticket.id, error: String(err) },
      })
      // Non-fatal — ticket is already created
    }
  }

  return NextResponse.json({ ok: true, ticketId: ticket.id })
}
