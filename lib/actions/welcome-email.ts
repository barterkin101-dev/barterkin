/**
 * Welcome email server action
 *
 * Sends a personalized welcome email to new signups.
 * Idempotent — uses welcome_email_sent_at to prevent duplicates.
 */
import 'server-only'
import { Resend } from 'resend'
import { WelcomeEmail } from '@/emails/welcome'
import { captureEvent } from '@/lib/analytics'
import { getWelcomeEmailRecipient, recordWelcomeEmailSent } from '@/lib/data/welcome-email'
import { createLogger } from '@/lib/utils/logger'

const log = createLogger('welcome-email')

export async function sendWelcomeEmail(userId: string): Promise<{ ok: boolean; error?: string }> {
  const apiKey = process.env.RESEND_API_KEY
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://barterkin.com'

  if (!apiKey) {
    log.error('RESEND_API_KEY not configured')
    return { ok: false, error: 'RESEND_API_KEY not configured' }
  }

  try {
    // Get recipient (idempotent — returns null if already sent)
    const { recipient, error: recipientError } = await getWelcomeEmailRecipient(userId)

    if (recipientError === 'already_sent') {
      return { ok: true }
    }

    if (recipientError || !recipient) {
      log.warn('Welcome email recipient not found or error', {
        context: { user_id: userId, error: recipientError },
      })
      return { ok: false, error: recipientError ?? 'recipient_not_found' }
    }

    // Get email via RPC (auth.users.email is not directly readable)
    const { getSupabaseAdmin } = await import('@/lib/supabase/admin')
    const admin = getSupabaseAdmin()
    const { data: email } = await admin.rpc('profile_owner_email', { p_profile_id: recipient.id })

    if (!email) {
      log.warn('No email found for welcome recipient', { context: { profile_id: recipient.id } })
      return { ok: false, error: 'no_email_found' }
    }

    const resend = new Resend(apiKey)

    await resend.emails.send({
      from: 'Barterkin <hello@barterkin.com>',
      to: [email],
      subject: 'Welcome to Barterkin — Georgia\'s community skills exchange',
      react: WelcomeEmail({
        recipientName: recipient.display_name ?? recipient.username,
        siteUrl,
        onboardingUrl: `${siteUrl}/onboarding`,
        listingsNewUrl: `${siteUrl}/listings/new`,
      }),
    })

    // Record send (idempotent)
    const recordResult = await recordWelcomeEmailSent(recipient.id)
    if (!recordResult.ok) {
      log.error('Failed to record welcome email sent after delivery', {
        error: recordResult.error,
        context: { profile_id: recipient.id },
      })
      // Don't fail — email was sent
    }

    void captureEvent(userId, 'welcome_email_sent', {
      method: 'resend',
    })

    log.info('Welcome email sent', { context: { profile_id: recipient.id, email } })
    return { ok: true }
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    log.error('Failed to send welcome email', { error: err, context: { user_id: userId } })
    return { ok: false, error: msg }
  }
}
