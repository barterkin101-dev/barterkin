import { NextResponse } from 'next/server'
import { Resend } from 'resend'
import { getSupabaseAdmin } from '@/lib/supabase/admin'
import { NewMessageEmail } from '@/emails/new-message'
import { createLogger } from '@/lib/utils/logger'

// Node runtime — resend SDK uses Node APIs.
export const runtime = 'nodejs'

// ============================================================================
// Cron endpoint: process pending message email notifications
// ============================================================================
// This endpoint is designed to be called by a cron job (Vercel Cron,
// GitHub Actions, or manual invocation). It processes pending notifications
// and sends emails via Resend.
//
// Rate limiting per recipient:
//   - Max 1 email per conversation per hour
//   - Max 10 emails per recipient per hour (global)
//
// Auth: expects a secret token in the Authorization header (CRON_SECRET).
// ============================================================================

const BATCH_SIZE = 50
const CONVERSATION_COOLDOWN_MS = 60 * 60 * 1000 // 1 hour
const RECIPIENT_HOURLY_LIMIT = 10

interface PendingNotification {
  id: string
  message_id: string
  conversation_id: string
  recipient_profile_id: string
  sender_profile_id: string
  created_at: string
}

export async function POST(request: Request) {
  const log = createLogger('message-notifications')

  // ── Auth guard ──
  const authHeader = request.headers.get('authorization')
  const cronSecret = process.env.CRON_SECRET
  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    log.warn('Unauthorized cron request')
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // ── Resend setup ──
  const apiKey = process.env.RESEND_API_KEY
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://barterkin.com'
  if (!apiKey) {
    log.error('RESEND_API_KEY not configured')
    return NextResponse.json({ error: 'RESEND_API_KEY not configured' }, { status: 500 })
  }
  const resend = new Resend(apiKey)

  const admin = getSupabaseAdmin()
  const sent: string[] = []
  const failed: string[] = []
  const skipped: string[] = []

  try {
    // ── Fetch pending notifications ──
    const { data: pending, error: fetchErr } = await admin
      .from('message_email_notifications')
      .select('id, message_id, conversation_id, recipient_profile_id, sender_profile_id, created_at')
      .eq('status', 'pending')
      .order('created_at', { ascending: true })
      .limit(BATCH_SIZE)

    if (fetchErr) {
      log.error('Failed to fetch pending notifications', { error: fetchErr })
      return NextResponse.json({ error: 'Database error' }, { status: 500 })
    }

    if (!pending || pending.length === 0) {
      return NextResponse.json({ ok: true, processed: 0, sent: [], failed: [], skipped: [] })
    }

    // ── Pre-load sender profiles and recipient emails ──
    const senderIds = [...new Set(pending.map((p) => p.sender_profile_id))]
    const recipientIds = [...new Set(pending.map((p) => p.recipient_profile_id))]

    const { data: senders } = await admin
      .from('profiles')
      .select('id, display_name, username')
      .in('id', senderIds)

    const senderMap = new Map(senders?.map((s) => [s.id, s]) ?? [])

    // Get recipient emails via RPC (auth.users.email is not directly readable)
    const recipientEmailMap = new Map<string, string | null>()
    for (const rid of recipientIds) {
      const { data: email } = await admin.rpc('profile_owner_email', { p_profile_id: rid })
      recipientEmailMap.set(rid, email ?? null)
    }

    // ── Check recent sends for rate limiting ──
    const cutoff = new Date(Date.now() - CONVERSATION_COOLDOWN_MS).toISOString()
    const { data: recentSends } = await admin
      .from('message_email_notifications')
      .select('conversation_id, recipient_profile_id')
      .eq('status', 'sent')
      .gte('sent_at', cutoff)

    const recentSendKey = new Set(
      recentSends?.map((r) => `${r.recipient_profile_id}:${r.conversation_id}`) ?? [],
    )

    // Count recent sends per recipient for global hourly limit
    const recipientSendCount = new Map<string, number>()
    for (const r of recentSends ?? []) {
      recipientSendCount.set(r.recipient_profile_id, (recipientSendCount.get(r.recipient_profile_id) ?? 0) + 1)
    }

    // ── Process each notification ──
    for (const notification of pending as PendingNotification[]) {
      const { id, conversation_id, recipient_profile_id, sender_profile_id } = notification

      // Rate limit: 1 per conversation per hour
      if (recentSendKey.has(`${recipient_profile_id}:${conversation_id}`)) {
        skipped.push(id)
        continue
      }

      // Rate limit: max 10 per recipient per hour
      if ((recipientSendCount.get(recipient_profile_id) ?? 0) >= RECIPIENT_HOURLY_LIMIT) {
        skipped.push(id)
        continue
      }

      const recipientEmail = recipientEmailMap.get(recipient_profile_id)
      if (!recipientEmail) {
        log.warn('No email found for recipient', { context: { recipient_profile_id } })
        await admin
          .from('message_email_notifications')
          .update({ status: 'failed', error_message: 'No email found for recipient' })
          .eq('id', id)
        failed.push(id)
        continue
      }

      const sender = senderMap.get(sender_profile_id)
      const senderDisplayName = sender?.display_name ?? sender?.username ?? 'Someone'
      const senderUsername = sender?.username ?? 'unknown'

      // Fetch message content for preview
      const { data: message } = await admin
        .from('messages')
        .select('content')
        .eq('id', notification.message_id)
        .single()

      const messagePreview = message?.content
        ? message.content.length > 200
          ? message.content.slice(0, 200) + '...'
          : message.content
        : 'You have a new message.'

      try {
        await resend.emails.send({
          from: 'Barterkin <hello@barterkin.com>',
          to: [recipientEmail],
          subject: `New message from ${senderDisplayName} on Barterkin`,
          react: NewMessageEmail({
            senderDisplayName,
            senderUsername,
            messagePreview,
            conversationUrl: `${siteUrl}/dashboard/messages/${conversation_id}`,
            siteUrl,
          }),
        })

        await admin
          .from('message_email_notifications')
          .update({ status: 'sent', sent_at: new Date().toISOString() })
          .eq('id', id)

        sent.push(id)
        recipientSendCount.set(recipient_profile_id, (recipientSendCount.get(recipient_profile_id) ?? 0) + 1)
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err)
        log.error('Failed to send email', { context: { notification_id: id }, error: err })
        await admin
          .from('message_email_notifications')
          .update({ status: 'failed', error_message: msg })
          .eq('id', id)
        failed.push(id)
      }
    }

    log.info('Message notification batch complete', {
      context: {
        processed: pending.length,
        sent: sent.length,
        failed: failed.length,
        skipped: skipped.length,
      },
    })

    return NextResponse.json({
      ok: true,
      processed: pending.length,
      sent,
      failed,
      skipped,
    })
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    log.error('Unexpected error processing notifications', { error: msg })
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}
